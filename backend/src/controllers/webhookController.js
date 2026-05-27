/**
 * @module controllers/webhookController
 * @description Handles inbound webhook events from the Unipile platform.
 * Events are processed to keep LinkedInAccount and Lead statuses in sync.
 *
 * Supported events:
 * - `account.connected`      → mark LinkedInAccount as ACTIVE, store accountId
 * - `account.disconnected`   → mark LinkedInAccount as EXPIRED
 * - `message.created`        → log to CampaignLog if a matching lead is found
 * - `connection.accepted`    → update lead status to SENT if pending connection
 */

import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';
import crypto from 'crypto';

/**
 * Validates the `x-unipile-signature` header (HMAC-SHA256) if a webhook secret
 * is configured. Skips validation if no secret is set.
 *
 * @param {import('express').Request} req
 * @returns {boolean} True if the signature is valid (or validation is disabled).
 */
function isSignatureValid(req) {
  if (!config.unipileWebhookSecret) return true;

  const signature = req.headers['x-unipile-signature'];
  if (!signature) return false;

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.unipileWebhookSecret)
    .update(body)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Processes `account.connected` events.
 * Locates the matching LinkedInAccount by the Unipile DSN (if available in payload)
 * or provider account ID, then sets status to ACTIVE and stores the accountId.
 *
 * @param {Object} payload - Unipile webhook event payload.
 * @returns {Promise<void>}
 */
async function handleAccountConnected(payload) {
  const { account_id: accountId, provider_id: providerId } = payload?.data || {};

  if (!accountId) {
    console.warn('[Webhook] account.connected received without account_id. Payload:', payload);
    return;
  }

  // Try to find the account by the Unipile accountId (if previously set) or
  // find the first PENDING account for this provider. Best effort matching.
  const account = await prisma.linkedInAccount.findFirst({
    where: {
      OR: [
        { accountId },
        { accountId: null, status: 'PENDING' },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!account) {
    console.warn(`[Webhook] account.connected: No matching LinkedInAccount found for accountId=${accountId}`);
    return;
  }

  await prisma.linkedInAccount.update({
    where: { id: account.id },
    data: {
      accountId,
      status: 'ACTIVE',
    },
  });

  console.info(`[Webhook] LinkedInAccount ${account.id} is now ACTIVE (Unipile accountId: ${accountId})`);
}

/**
 * Processes `account.disconnected` events.
 * Sets the matching LinkedInAccount status to EXPIRED.
 *
 * @param {Object} payload - Unipile webhook event payload.
 * @returns {Promise<void>}
 */
async function handleAccountDisconnected(payload) {
  const { account_id: accountId } = payload?.data || {};

  if (!accountId) {
    console.warn('[Webhook] account.disconnected received without account_id.');
    return;
  }

  const result = await prisma.linkedInAccount.updateMany({
    where: { accountId },
    data: { status: 'EXPIRED' },
  });

  console.info(
    `[Webhook] account.disconnected: Marked ${result.count} account(s) with accountId=${accountId} as EXPIRED`
  );
}

/**
 * Processes `message.created` events.
 * If a matching lead is found (by LinkedIn profile URL or provider ID),
 * sets `replied = true`, set status `COMPLETED`. Log a `SUCCESS` message: "Target replied! Stopping sequence."
 *
 * @param {Object} payload - Unipile webhook event payload.
 * @returns {Promise<void>}
 */
async function handleMessageCreated(payload) {
  const { sender_provider_id: senderProviderId, chat_id: chatId, account_id: accountId } = payload?.data || {};

  // Skip if it's an outbound message from our own account
  // In many webhook payloads for Unipile, sender_id is the sender's provider_id.
  if (!senderProviderId) return;

  // Find leads for this account that are ACTIVE or PENDING
  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING', 'SENT', 'SENDING'] },
      campaign: { linkedAccount: { accountId } },
    },
    include: { campaign: { select: { id: true } } },
  });

  // Match the lead by checking if the profileUrl includes the senderProviderId
  const lead = leads.find(l => l.profileUrl.includes(senderProviderId));

  if (!lead) return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      replied: true,
      status: 'COMPLETED'
    }
  });

  await prisma.campaignLog.create({
    data: {
      campaignId: lead.campaign.id,
      leadId: lead.id,
      level: 'SUCCESS',
      message: 'Target replied! Stopping sequence.',
    },
  });
}

/**
 * Processes `connection.accepted` events.
 * Updates matching lead status: If isConnectionPending == true, set isConnectionPending = false, increment currentStepOrder, and calculate nextActionAt for the new step.
 *
 * @param {Object} payload - Unipile webhook event payload.
 * @returns {Promise<void>}
 */
async function handleConnectionAccepted(payload) {
  const { provider_id: providerId, account_id: accountId } = payload?.data || {};

  if (!providerId) {
    console.warn('[Webhook] connection.accepted received without provider_id.');
    return;
  }

  const leads = await prisma.lead.findMany({
    where: {
      isConnectionPending: true,
      campaign: { linkedAccount: { accountId } },
    },
    include: { campaign: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });

  const lead = leads.find(l => l.profileUrl.includes(providerId));

  if (!lead) return;

  const nextStepOrder = lead.currentStepOrder + 1;
  const nextStep = lead.campaign.steps.find(s => s.order === nextStepOrder);
  
  let nextStatus = lead.status;
  let nextActionAt = null;

  if (nextStep) {
    nextActionAt = new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000);
  } else {
    nextStatus = 'COMPLETED';
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      isConnectionPending: false,
      currentStepOrder: nextStepOrder,
      nextActionAt,
      status: nextStatus
    },
  });

  await prisma.campaignLog.create({
    data: {
      campaignId: lead.campaign.id,
      leadId: lead.id,
      level: 'INFO',
      message: `Connection accepted by provider_id=${providerId}. Moved to step ${nextStepOrder}.`,
    },
  });

  console.info(`[Webhook] connection.accepted: Lead ${lead.id} connection pending resolved.`);
}

/**
 * Main webhook handler. Validates the signature, then dispatches to the
 * appropriate event handler based on the `event` field in the payload.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function handleUnipileWebhook(req, res, next) {
  try {
    if (!isSignatureValid(req)) {
      console.warn('[Webhook] Invalid signature on incoming Unipile webhook.');
      return res.status(401).json({ error: 'Invalid webhook signature.', code: 401 });
    }

    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Missing `event` field in webhook payload.', code: 400 });
    }

    console.info(`[Webhook] Received event: ${event}`);

    // Acknowledge immediately so Unipile doesn't retry on slow processing
    res.status(200).json({ data: { received: true } });

    // Async processing after responding
    switch (event) {
      case 'account.connected':
        await handleAccountConnected(req.body);
        break;
      case 'account.disconnected':
        await handleAccountDisconnected(req.body);
        break;
      case 'message.created':
        await handleMessageCreated(req.body);
        break;
      case 'connection.accepted':
        await handleConnectionAccepted(req.body);
        break;
      default:
        console.info(`[Webhook] Unhandled event type: "${event}". Ignoring.`);
    }
  } catch (err) {
    console.error('[Webhook] Error processing webhook:', err);
    // Don't call next(err) here — we've already sent 200 to Unipile
  }
}
