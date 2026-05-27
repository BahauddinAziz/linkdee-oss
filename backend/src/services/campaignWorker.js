/**
 * @module services/campaignWorker
 * @description Persistent async background loop that processes outreach leads
 * for all ACTIVE campaigns. Respects daily caps, applies jitter delays, and
 * records success/failure in CampaignLog.
 *
 * Outreach modes:
 * - CONNECTION         → send a LinkedIn connection request (with optional note)
 * - MESSAGE            → send a direct message via an existing chat
 * - CONNECTION_THEN_MESSAGE → send connection request; message sent after accepted
 *   (the message step is triggered when the `connection.accepted` webhook arrives)
 */

import prisma from '../lib/prisma.js';
import { decrypt } from '../lib/crypto.js';
import {
  getProfile,
  sendConnectionRequest,
  getOrCreateChat,
  sendDirectMessage,
} from './unipileClient.js';

/** Polling interval when there is nothing to process (ms) */
const IDLE_POLL_INTERVAL_MS = 5_000;

/** Minimum jitter percentage added to delay (20%) */
const JITTER_MIN = 0.2;

/** Maximum jitter percentage added to delay (40%) */
const JITTER_MAX = 0.4;

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Computes the delay in milliseconds before processing the next lead.
 * If jitter is enabled, a random factor between 20% and 40% is added.
 *
 * @param {number} delaySeconds - Base delay in seconds from the campaign config.
 * @param {boolean} jitterEnabled - Whether to add random jitter.
 * @returns {number} Total delay in milliseconds.
 */
function computeDelay(delaySeconds, jitterEnabled) {
  const baseMs = delaySeconds * 1_000;
  if (!jitterEnabled) return baseMs;
  const jitterFactor = JITTER_MIN + Math.random() * (JITTER_MAX - JITTER_MIN);
  return Math.round(baseMs * (1 + jitterFactor));
}

/**
 * Replaces template variables in a message string with lead field values.
 * Supported placeholders: `{first_name}`, `{last_name}`, `{company}`.
 * Falls back to an empty string if the field is not available on the lead.
 *
 * @param {string} template - Message template string.
 * @param {{ firstName?: string, lastName?: string, company?: string }} lead - Lead data.
 * @returns {string} Formatted message string.
 */
function formatTemplate(template, lead) {
  return template
    .replace(/\{first_name\}/gi, lead.firstName || '')
    .replace(/\{last_name\}/gi, lead.lastName || '')
    .replace(/\{company\}/gi, lead.company || '')
    .trim();
}

/**
 * Attempts to enrich a lead's name/company by calling the Unipile profile API.
 * Returns the enriched lead data or the original if enrichment fails.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Decrypted Unipile access token.
 * @param {string} accountId - Unipile account ID.
 * @param {{ id: string, profileUrl: string, firstName?: string, lastName?: string, company?: string }} lead
 * @returns {Promise<{ firstName?: string, lastName?: string, company?: string }>}
 */
async function enrichLead(dsn, accessToken, accountId, lead) {
  try {
    const profile = await getProfile(dsn, accessToken, accountId, lead.profileUrl);

    if (!profile) return lead;

    return {
      firstName: lead.firstName || profile.first_name || profile.firstName || lead.firstName,
      lastName: lead.lastName || profile.last_name || profile.lastName || lead.lastName,
      company: lead.company || profile.company || profile.current_company || lead.company,
    };
  } catch (err) {
    console.warn(`[Worker] Could not enrich lead ${lead.id}: ${err.message}`);
    return lead;
  }
}

/**
 * Dispatches a single outreach action for a given lead based on the campaign mode.
 *
 * @param {Object} campaign - The campaign object with linkedAccount relation.
 * @param {Object} lead - The lead object to process.
 * @param {string} decryptedToken - Decrypted Unipile access token.
 * @returns {Promise<void>}
 * @throws {Error} If the Unipile API call fails.
 */
async function dispatchOutreach(campaign, lead, decryptedToken) {
  const { linkedAccount, mode } = campaign;
  const { unipileDsn, accountId } = linkedAccount;

  // Extract LinkedIn public identifier from profile URL
  const profileIdentifier = lead.profileUrl.replace(/\/$/, '').split('/in/').pop();

  const message = formatTemplate(campaign.template, lead);

  if (mode === 'CONNECTION' || mode === 'CONNECTION_THEN_MESSAGE') {
    // For CONNECTION_THEN_MESSAGE: send connection request; message will be sent
    // once the `connection.accepted` webhook triggers (handled in webhookController).
    await sendConnectionRequest(
      unipileDsn,
      decryptedToken,
      accountId,
      profileIdentifier,
      mode === 'CONNECTION' ? message : '' // Only attach note for pure CONNECTION mode
    );
  } else if (mode === 'MESSAGE') {
    // Get or create a chat thread, then send the DM
    const chat = await getOrCreateChat(unipileDsn, decryptedToken, accountId, profileIdentifier);
    if (!chat?.id) {
      throw new Error('Failed to obtain chat ID from Unipile getOrCreateChat.');
    }
    await sendDirectMessage(unipileDsn, decryptedToken, accountId, chat.id, message);
  } else {
    throw new Error(`Unknown campaign mode: "${mode}"`);
  }
}

/**
 * Finds all ACTIVE campaigns, selects one pending lead per campaign (respecting
 * daily caps), dispatches the outreach, and records the result.
 *
 * This function is designed to be called in a tight loop with a sleep interval.
 *
 * @returns {Promise<boolean>} Returns true if at least one lead was processed, false if idle.
 */
async function processNextLead() {
  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    include: {
      linkedAccount: {
        select: { id: true, unipileDsn: true, accountId: true, accessToken: true, status: true },
      },
    },
  });

  if (activeCampaigns.length === 0) return false;

  let didWork = false;

  for (const campaign of activeCampaigns) {
    // Skip if daily cap reached
    if (campaign.dailyActionCount >= campaign.dailyCap) {
      continue;
    }

    // Skip if the linked account is not connected
    if (campaign.linkedAccount.status !== 'ACTIVE' || !campaign.linkedAccount.accountId) {
      console.warn(
        `[Worker] Campaign ${campaign.id} skipped — linked account not ACTIVE or missing accountId.`
      );
      continue;
    }

    // Find and lock the next PENDING lead using an atomic update
    const lead = await prisma.lead.findFirst({
      where: { campaignId: campaign.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!lead) continue;

    // Mark as SENDING to prevent duplicate processing
    const lockedLead = await prisma.lead.updateMany({
      where: { id: lead.id, status: 'PENDING' }, // optimistic lock
      data: { status: 'SENDING' },
    });

    if (lockedLead.count === 0) {
      // Another process already grabbed this lead
      continue;
    }

    didWork = true;

    try {
      const decryptedToken = decrypt(campaign.linkedAccount.accessToken);

      // Enrich lead data if firstName/lastName/company are missing
      const enrichedData = await enrichLead(
        campaign.linkedAccount.unipileDsn,
        decryptedToken,
        campaign.linkedAccount.accountId,
        lead
      );

      // Persist enriched data back to the lead (non-blocking — ignore errors)
      if (enrichedData.firstName || enrichedData.lastName || enrichedData.company) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            firstName: enrichedData.firstName || lead.firstName,
            lastName: enrichedData.lastName || lead.lastName,
            company: enrichedData.company || lead.company,
          },
        }).catch(() => {});
      }

      // Build enriched lead for template formatting
      const enrichedLead = { ...lead, ...enrichedData };

      // Send the outreach
      await dispatchOutreach(campaign, enrichedLead, decryptedToken);

      // Mark lead as SENT and increment daily counter
      await prisma.$transaction([
        prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'SENT', executedAt: new Date(), errorMessage: null },
        }),
        prisma.campaign.update({
          where: { id: campaign.id },
          data: { dailyActionCount: { increment: 1 } },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            level: 'INFO',
            message: `Outreach sent to ${lead.profileUrl} via mode "${campaign.mode}".`,
          },
        }),
      ]);

      console.info(`[Worker] ✓ Lead ${lead.id} processed for campaign "${campaign.name}".`);

      // Apply configured delay + optional jitter before continuing
      const delayMs = computeDelay(campaign.delaySeconds, campaign.jitterEnabled);
      await sleep(delayMs);
    } catch (err) {
      console.error(`[Worker] ✗ Failed to process lead ${lead.id}:`, err.message);

      await prisma.$transaction([
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
            executedAt: new Date(),
          },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            level: 'ERROR',
            message: `Outreach failed: ${err.message}`,
          },
        }),
      ]);
    }
  }

  return didWork;
}

/**
 * Persistent background loop. Continuously polls for active campaigns and leads.
 * Sleeps for a short interval when idle to avoid burning CPU.
 *
 * @returns {Promise<never>} Never resolves — runs until the process exits.
 */
async function workerLoop() {
  console.info('[Worker] Campaign worker loop started.');

  while (true) {
    try {
      const didWork = await processNextLead();
      if (!didWork) {
        // No active campaigns or all leads exhausted — enter idle sleep
        await sleep(IDLE_POLL_INTERVAL_MS);
      }
    } catch (err) {
      console.error('[Worker] Unhandled error in worker loop:', err);
      await sleep(IDLE_POLL_INTERVAL_MS);
    }
  }
}

/**
 * Starts the campaign worker loop in the background.
 * Should be called once at application startup.
 *
 * @returns {void}
 */
export function startWorker() {
  workerLoop();
}
