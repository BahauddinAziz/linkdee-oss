/**
 * @module controllers/campaignController
 * @description Full CRUD for Campaign resources, including status management
 * and paginated log retrieval. All operations verify resource ownership.
 */

import prisma from '../lib/prisma.js';

const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'SCHEDULED'];

/**
 * Lists all campaigns belonging to the authenticated user.
 * Includes lead counts per status using Prisma's nested `_count`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listCampaigns(req, res, next) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user.id },
      include: {
        _count: { select: { leads: true, logs: true } },
        senders: {
          include: {
            linkedAccount: {
              select: { id: true, label: true, status: true, accountId: true },
            },
          },
        },
        steps: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ data: campaigns });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new campaign for the authenticated user.
 *
 * Required body fields: `linkedAccountId`, `name`, `steps`
 * Optional: `delaySeconds`, `jitterEnabled`, `dailyCap`, `scheduledStartAt`
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function createCampaign(req, res, next) {
  try {
    const {
      linkedAccountIds,
      name,
      steps,
      delaySeconds,
      jitterEnabled,
      dailyCap,
      scheduledStartAt,
    } = req.body;

    if (!linkedAccountIds || !Array.isArray(linkedAccountIds) || linkedAccountIds.length === 0 || !name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        error: '`linkedAccountIds` (non-empty array), `name`, and `steps` (non-empty array) are required.',
        code: 400,
      });
    }

    // Verify the linked accounts belong to this user
    const accounts = await prisma.linkedInAccount.findMany({
      where: { id: { in: linkedAccountIds } },
    });

    if (accounts.length !== linkedAccountIds.length || accounts.some((a) => a.userId !== req.user.id)) {
      return res.status(403).json({
        error: 'One or more of the specified LinkedIn accounts do not belong to you or do not exist.',
        code: 403,
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId: req.user.id,
        name,
        delaySeconds: delaySeconds ?? 60,
        jitterEnabled: jitterEnabled ?? true,
        dailyCap: dailyCap ?? 25,
        status: scheduledStartAt ? 'SCHEDULED' : 'DRAFT',
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
        steps: {
          create: steps.map((s, idx) => ({
            order: idx + 1,
            type: s.type,
            template: s.template || '',
            delayDays: s.delayDays || 0,
          })),
        },
        senders: {
          create: linkedAccountIds.map((id) => ({ linkedAccountId: id })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } }, senders: true },
    });

    return res.status(201).json({ data: campaign });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves a single campaign by ID, including lead status counts and recent logs.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getCampaign(req, res, next) {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        senders: {
          include: {
            linkedAccount: {
              select: { id: true, label: true, status: true, accountId: true, unipileDsn: true },
            },
          },
        },
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { leads: true, logs: true } },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    // Aggregate lead status counts
    const leadStats = await prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: { status: true },
    });

    const stats = leadStats.reduce((acc, row) => {
      acc[row.status] = row._count.status;
      return acc;
    }, {});

    return res.status(200).json({ data: { ...campaign, leadStats: stats } });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates campaign fields. Status changes must use the dedicated PATCH /:id/status endpoint.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const { name, delaySeconds, jitterEnabled, dailyCap, scheduledStartAt } = req.body;

    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(delaySeconds !== undefined && { delaySeconds }),
        ...(jitterEnabled !== undefined && { jitterEnabled }),
        ...(dailyCap !== undefined && { dailyCap }),
        ...(scheduledStartAt !== undefined && {
          scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
        }),
      },
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Changes the status of a campaign. When activating, verifies the linked account
 * has a valid `accountId` (i.e., the user has completed LinkedIn OAuth via Unipile).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function changeCampaignStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`,
        code: 400,
      });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { senders: { include: { linkedAccount: true } } },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    // Guard: can only activate if the linked accounts have completed OAuth
    if (status === 'ACTIVE') {
      for (const sender of campaign.senders) {
        if (!sender.linkedAccount.accountId) {
          return res.status(422).json({
            error:
              'Cannot activate campaign: a linked LinkedIn account has not completed OAuth. ' +
              'Please connect the account via the auth URL first.',
            code: 422,
          });
        }

        if (sender.linkedAccount.status !== 'ACTIVE') {
          return res.status(422).json({
            error: `Cannot activate campaign: a linked LinkedIn account status is "${sender.linkedAccount.status}". It must be ACTIVE.`,
            code: 422,
          });
        }
      }
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status },
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes a campaign and all its leads and logs (cascade defined in schema).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteCampaign(req, res, next) {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    await prisma.campaign.delete({ where: { id } });

    return res.status(200).json({ data: { message: 'Campaign deleted successfully.' } });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves campaign logs with cursor-based pagination.
 * Supports `?limit=50&cursor=<logId>` query parameters.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getCampaignLogs(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const cursor = req.query.cursor || undefined;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    const logs = await prisma.campaignLog.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNextPage = logs.length > limit;
    const items = hasNextPage ? logs.slice(0, limit) : logs;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return res.status(200).json({
      data: {
        items,
        nextCursor,
        hasNextPage,
      },
    });
  } catch (err) {
    next(err);
  }
}
