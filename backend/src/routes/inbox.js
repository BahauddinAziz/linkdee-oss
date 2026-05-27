/**
 * @module routes/inbox
 * @description Unified Inbox endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  listConversations,
  listMessages,
  replyToConversation,
} from '../controllers/inboxController.js';

const router = Router();

router.use(requireAuth);

router.get('/conversations', listConversations);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/reply', replyToConversation);

export default router;
