/**
 * @module routes/campaigns
 * @description Campaign resource routes. All routes require authentication.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  changeCampaignStatus,
  deleteCampaign,
  getCampaignLogs,
} from '../controllers/campaignController.js';

const router = Router();

router.use(requireAuth);

/** GET /api/v1/campaigns — List all campaigns for the authenticated user */
router.get('/', listCampaigns);

/** POST /api/v1/campaigns — Create a new campaign */
router.post('/', createCampaign);

/** GET /api/v1/campaigns/:id — Get campaign detail with lead stats */
router.get('/:id', getCampaign);

/** PATCH /api/v1/campaigns/:id — Update campaign configuration */
router.patch('/:id', updateCampaign);

/** PATCH /api/v1/campaigns/:id/status — Change campaign status */
router.patch('/:id/status', changeCampaignStatus);

/** DELETE /api/v1/campaigns/:id — Delete a campaign */
router.delete('/:id', deleteCampaign);

/** GET /api/v1/campaigns/:id/logs — Retrieve paginated campaign logs */
router.get('/:id/logs', getCampaignLogs);

export default router;
