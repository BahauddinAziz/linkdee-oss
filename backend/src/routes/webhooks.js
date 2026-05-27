/**
 * @module routes/webhooks
 * @description Unipile webhook receiver. No auth middleware — requests are
 * validated by HMAC signature inside the controller.
 */

import { Router } from 'express';
import { handleUnipileWebhook } from '../controllers/webhookController.js';

const router = Router();

/** POST /api/v1/webhooks/unipile — Receive events from the Unipile platform */
router.post('/', handleUnipileWebhook);

export default router;
