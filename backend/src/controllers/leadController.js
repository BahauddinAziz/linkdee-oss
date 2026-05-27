/**
 * @module controllers/leadController
 * @description Manages Lead records within a campaign — list, add, CSV import,
 * delete, and retry. All operations verify that the parent campaign belongs to
 * the authenticated user before proceeding.
 */

import prisma from '../lib/prisma.js';
import { parseLeadsCSV } from '../services/csvParser.js';

const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%-]+\/?/;

/**
 * Verifies that a campaign exists and is owned by the authenticated user.
 * Returns the campaign or throws an appropriate HTTP error via the returned value.
 *
 * @param {string} campaignId
 * @param {string} userId
 * @returns {Promise<{ id: string, userId: string } | null>}
 */
async function assertCampaignOwnership(campaignId, userId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, userId: true },
  });
  return campaign;
}

/**
 * Lists leads for a campaign with pagination and optional status filtering.
 * Supports `?status=PENDING&page=1&limit=50` query parameters.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listLeads(req, res, next) {
  try {
    const { campaignId } = req.params;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const statusFilter = req.query.status || undefined;
    const skip = (page - 1) * limit;

    const campaign = await assertCampaignOwnership(campaignId, req.user.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    const where = {
      campaignId,
      ...(statusFilter && { status: statusFilter }),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return res.status(200).json({
      data: {
        items: leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Adds a single lead to a campaign.
 * Validates that the profileUrl is a LinkedIn URL.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function addLead(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { profileUrl, firstName, lastName, company } = req.body;

    if (!profileUrl) {
      return res.status(400).json({ error: '`profileUrl` is required.', code: 400 });
    }

    if (!LINKEDIN_URL_REGEX.test(profileUrl)) {
      return res.status(400).json({
        error: '`profileUrl` must be a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).',
        code: 400,
      });
    }

    const campaign = await assertCampaignOwnership(campaignId, req.user.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    // Prevent duplicate leads in the same campaign
    const existing = await prisma.lead.findFirst({
      where: { campaignId, profileUrl },
    });

    if (existing) {
      return res.status(409).json({
        error: 'This LinkedIn profile is already in the campaign.',
        code: 409,
      });
    }

    const lead = await prisma.lead.create({
      data: {
        campaignId,
        profileUrl,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
      },
    });

    return res.status(201).json({ data: lead });
  } catch (err) {
    next(err);
  }
}

/**
 * Imports leads from an uploaded CSV file using multer's in-memory storage.
 * Parses the buffer, deduplicates against existing campaign leads, and bulk inserts.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function importCSV(req, res, next) {
  try {
    const { campaignId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'A CSV file is required. Use field name `file`.', code: 400 });
    }

    const campaign = await assertCampaignOwnership(campaignId, req.user.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    const { leads: parsedLeads, skipped } = parseLeadsCSV(req.file.buffer);

    if (parsedLeads.length === 0) {
      return res.status(422).json({
        error: 'No valid leads found in the CSV. Ensure a `profile_url` column with LinkedIn URLs exists.',
        code: 422,
        details: { skipped },
      });
    }

    // Fetch existing profile URLs to avoid duplicates
    const existingLeads = await prisma.lead.findMany({
      where: { campaignId },
      select: { profileUrl: true },
    });
    const existingUrls = new Set(existingLeads.map((l) => l.profileUrl));

    const newLeads = parsedLeads
      .filter((l) => !existingUrls.has(l.profileUrl))
      .map((l) => ({ ...l, campaignId }));

    const duplicates = parsedLeads.length - newLeads.length;

    if (newLeads.length === 0) {
      return res.status(200).json({
        data: {
          imported: 0,
          skipped,
          duplicates,
          message: 'All leads in the CSV already exist in this campaign.',
        },
      });
    }

    await prisma.lead.createMany({ data: newLeads });

    return res.status(201).json({
      data: {
        imported: newLeads.length,
        skipped,
        duplicates,
        message: `Successfully imported ${newLeads.length} lead(s).`,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Removes a lead from a campaign. Verifies campaign ownership before deletion.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteLead(req, res, next) {
  try {
    const { campaignId, leadId } = req.params;

    const campaign = await assertCampaignOwnership(campaignId, req.user.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || lead.campaignId !== campaignId) {
      return res.status(404).json({ error: 'Lead not found.', code: 404 });
    }

    await prisma.lead.delete({ where: { id: leadId } });

    return res.status(200).json({ data: { message: 'Lead removed successfully.' } });
  } catch (err) {
    next(err);
  }
}

/**
 * Resets a failed or completed lead back to PENDING so it will be retried.
 * Clears the error message and executedAt timestamp.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function retryLead(req, res, next) {
  try {
    const { campaignId, leadId } = req.params;

    const campaign = await assertCampaignOwnership(campaignId, req.user.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.', code: 404 });
    }

    if (campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || lead.campaignId !== campaignId) {
      return res.status(404).json({ error: 'Lead not found.', code: 404 });
    }

    if (lead.status === 'PENDING' || lead.status === 'SENDING') {
      return res.status(409).json({
        error: `Lead is already in "${lead.status}" state.`,
        code: 409,
      });
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'PENDING',
        errorMessage: null,
        executedAt: null,
      },
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}
