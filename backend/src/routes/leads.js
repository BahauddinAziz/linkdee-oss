/**
 * @module routes/leads
 * @description Lead management routes, mounted under /api/v1/campaigns/:campaignId/leads.
 * All routes require authentication. CSV uploads use multer with memory storage.
 */

import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  listLeads,
  addLead,
  importCSV,
  deleteLead,
  retryLead,
} from '../controllers/leadController.js';

const router = Router({ mergeParams: true }); // mergeParams to access :campaignId

/** Multer instance using in-memory storage for CSV parsing */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  },
});

router.use(requireAuth);

/** GET /api/v1/campaigns/:campaignId/leads — List leads (paginated, filterable) */
router.get('/', listLeads);

/** POST /api/v1/campaigns/:campaignId/leads — Add a single lead */
router.post('/', addLead);

/** POST /api/v1/campaigns/:campaignId/leads/import — Bulk import from CSV */
router.post('/import', upload.single('file'), importCSV);

/** DELETE /api/v1/campaigns/:campaignId/leads/:leadId — Remove a lead */
router.delete('/:leadId', deleteLead);

/** POST /api/v1/campaigns/:campaignId/leads/:leadId/retry — Reset a lead to PENDING */
router.post('/:leadId/retry', retryLead);

export default router;
