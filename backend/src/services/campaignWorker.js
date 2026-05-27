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
async function generateIcebreaker(profile) {
  return `Hi ${profile.firstName || 'there'}, noticed your work at ${profile.company || 'your company'}. Amazing stuff!`;
}

async function formatTemplate(template, lead) {
  let text = template
    .replace(/\{first_name\}/gi, lead.firstName || '')
    .replace(/\{last_name\}/gi, lead.lastName || '')
    .replace(/\{company\}/gi, lead.company || '');

  if (text.includes('{ai_icebreaker}')) {
    const icebreaker = await generateIcebreaker(lead);
    text = text.replace(/\{ai_icebreaker\}/gi, icebreaker);
  }

  return text.trim();
}/gi, lead.firstName || '')
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
 * Dispatches a single outreach action for a given lead based on the campaign step.
 *
 * @param {Object} campaign - The campaign object with linkedAccount relation.
 * @param {Object} step - The campaign step to execute.
 * @param {Object} lead - The lead object to process.
 * @param {string} decryptedToken - Decrypted Unipile access token.
 * @returns {Promise<void>}
 * @throws {Error} If the Unipile API call fails.
 */
async function dispatchOutreach(campaignSender, step, lead, decryptedToken) {
  const { linkedAccount } = campaignSender;
  const { unipileDsn, accountId } = linkedAccount;

  // Extract LinkedIn public identifier from profile URL
  const profileIdentifier = lead.profileUrl.endsWith('/') ? lead.profileUrl.slice(0, -1).split('/in/').pop() : lead.profileUrl.split('/in/').pop();

  const message = await formatTemplate(step.template || '', lead);

  if (step.type === 'CONNECTION_REQUEST') {
    await sendConnectionRequest(
      unipileDsn,
      decryptedToken,
      accountId,
      profileIdentifier,
      message
    );
  } else if (step.type === 'DIRECT_MESSAGE') {
    // Get or create a chat thread, then send the DM
    const chat = await getOrCreateChat(unipileDsn, decryptedToken, accountId, profileIdentifier);
    if (!chat?.id) {
      throw new Error('Failed to obtain chat ID from Unipile getOrCreateChat.');
    }
    await sendDirectMessage(unipileDsn, decryptedToken, accountId, chat.id, message);
  } else {
    throw new Error(`Unknown step type: "${step.type}"`);
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
      steps: { orderBy: { order: 'asc' } },
      senders: {
        include: {
          linkedAccount: {
            select: { id: true, unipileDsn: true, accountId: true, accessToken: true, status: true, dailyActionCount: true, dailyCap: true },
          },
        },
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

    // Find and lock the next eligible lead
    const lead = await prisma.lead.findFirst({
      where: {
        campaignId: campaign.id,
        status: { in: ['PENDING', 'ACTIVE'] },
        replied: false,
        isConnectionPending: false,
        OR: [
          { nextActionAt: null },
          { nextActionAt: { lte: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!lead) continue;

    // Mark as SENDING to prevent duplicate processing
    const lockedLead = await prisma.lead.updateMany({
      where: { id: lead.id, status: lead.status }, // optimistic lock
      data: { status: 'SENDING' },
    });

    if (lockedLead.count === 0) {
      // Another process already grabbed this lead
      continue;
    }

    const step = campaign.steps.find((s) => s.order === lead.currentStepOrder);

    if (!step) {
      // Lead completed all steps
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'COMPLETED' },
      });
      continue;
    }

    didWork = true;

    try {
      // SENDER ROTATION LOGIC
      let selectedSender = null;
      if (lead.currentStepOrder > 1 && lead.senderAccountId) {
        selectedSender = campaign.senders.find((s) => s.linkedAccount.id === lead.senderAccountId);
      }
      
      if (!selectedSender) {
        const eligibleSenders = campaign.senders.filter(
          (s) =>
            s.linkedAccount.status === 'ACTIVE' &&
            s.linkedAccount.accountId &&
            s.linkedAccount.dailyActionCount < s.linkedAccount.dailyCap
        );

        if (eligibleSenders.length > 0) {
          eligibleSenders.sort((a, b) => a.linkedAccount.dailyActionCount - b.linkedAccount.dailyActionCount);
          selectedSender = eligibleSenders[0];
        }
      }

      if (!selectedSender || selectedSender.linkedAccount.status !== 'ACTIVE' || !selectedSender.linkedAccount.accountId || selectedSender.linkedAccount.dailyActionCount >= selectedSender.linkedAccount.dailyCap) {
         await prisma.lead.update({
           where: { id: lead.id },
           data: { status: lead.status },
         });
         continue;
      }

      const decryptedToken = decrypt(selectedSender.linkedAccount.accessToken);

      let enrichedData = {};
      if (!lead.firstName || !lead.lastName || !lead.company || step.template?.includes('{ai_icebreaker}')) {
        enrichedData = await enrichLead(
          selectedSender.linkedAccount.unipileDsn,
          decryptedToken,
          selectedSender.linkedAccount.accountId,
          lead
        );
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
      }

      const enrichedLead = { ...lead, ...enrichedData };

      await dispatchOutreach(selectedSender, step, enrichedLead, decryptedToken);

      let nextStatus = 'ACTIVE';
      let nextActionAt = null;
      let isConnectionPending = false;
      let currentStepOrder = lead.currentStepOrder;

      if (step.type === 'CONNECTION_REQUEST') {
        isConnectionPending = true;
      } else if (step.type === 'DIRECT_MESSAGE') {
        currentStepOrder += 1;
        const nextStep = campaign.steps.find((s) => s.order === currentStepOrder);
        if (nextStep) {
          nextActionAt = new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000);
        } else {
          nextStatus = 'COMPLETED';
        }
      }

      // Mark lead state and increment daily counter
      await prisma.$transaction([
        prisma.lead.update({
          where: { id: lead.id },
          data: { 
            status: nextStatus,
            currentStepOrder,
            nextActionAt,
            isConnectionPending,
            executedAt: new Date(),
            errorMessage: null,
            senderAccountId: selectedSender.linkedAccount.id
          },
        }),
        prisma.campaign.update({
          where: { id: campaign.id },
          data: { dailyActionCount: { increment: 1 } },
        }),
        prisma.linkedInAccount.update({
          where: { id: selectedSender.linkedAccount.id },
          data: { dailyActionCount: { increment: 1 } },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            level: 'INFO',
            message: `Executed step ${step.order} (${step.type}) for ${lead.profileUrl}.`,
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
