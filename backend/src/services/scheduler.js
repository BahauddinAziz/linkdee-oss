/**
 * @module services/scheduler
 * @description Cron-based background scheduler for campaign lifecycle management.
 *
 * Jobs:
 * 1. `checkScheduledCampaigns` — runs every minute; activates campaigns whose
 *    scheduledStartAt has passed.
 * 2. `resetDailyCounts` — runs at midnight UTC; resets dailyActionCount for
 *    all campaigns, enabling the next day's outreach cap.
 */

import cron from 'node-cron';
import prisma from '../lib/prisma.js';

/**
 * Finds all campaigns with status `SCHEDULED` whose start time has passed
 * and transitions them to `ACTIVE`. Campaigns whose linked account is not
 * yet active are skipped (they will be retried on the next tick).
 *
 * @returns {Promise<void>}
 */
async function checkScheduledCampaigns() {
  try {
    const now = new Date();

    const scheduled = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledStartAt: { lte: now },
      },
      include: {
        linkedAccount: { select: { status: true, accountId: true } },
      },
    });

    if (scheduled.length === 0) return;

    const toActivate = scheduled.filter(
      (c) => c.linkedAccount.status === 'ACTIVE' && c.linkedAccount.accountId
    );
    const skipped = scheduled.length - toActivate.length;

    if (toActivate.length > 0) {
      const ids = toActivate.map((c) => c.id);
      await prisma.campaign.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ACTIVE' },
      });

      console.info(
        `[Scheduler] checkScheduledCampaigns: Activated ${toActivate.length} campaign(s). Skipped ${skipped} (inactive account).`
      );
    }
  } catch (err) {
    console.error('[Scheduler] checkScheduledCampaigns error:', err);
  }
}

/**
 * Resets the `dailyActionCount` to 0 for all campaigns that have a non-zero
 * count. This unblocks outreach for the new day within each campaign's cap.
 *
 * @returns {Promise<void>}
 */
async function resetDailyCounts() {
  try {
    const result = await prisma.campaign.updateMany({
      where: { dailyActionCount: { gt: 0 } },
      data: {
        dailyActionCount: 0,
        dailyResetAt: new Date(),
      },
    });

    console.info(
      `[Scheduler] resetDailyCounts: Reset dailyActionCount for ${result.count} campaign(s) at ${new Date().toISOString()}`
    );
  } catch (err) {
    console.error('[Scheduler] resetDailyCounts error:', err);
  }
}

/**
 * Starts all background cron jobs.
 * Must be called once at application startup (before or after app.listen).
 *
 * @returns {void}
 */
export function startScheduler() {
  // Check for scheduled campaigns every minute
  cron.schedule('* * * * *', checkScheduledCampaigns, {
    name: 'check-scheduled-campaigns',
    runOnInit: true, // Run immediately on startup to catch any missed activations
  });

  // Reset daily action counts at midnight UTC
  cron.schedule('0 0 * * *', resetDailyCounts, {
    name: 'reset-daily-counts',
    timezone: 'UTC',
  });

  console.info('[Scheduler] Background cron jobs started.');
}
