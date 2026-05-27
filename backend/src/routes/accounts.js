/**
 * @module routes/accounts
 * @description LinkedIn account management routes. All routes require authentication.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAccounts,
  createAccount,
  deleteAccount,
} from '../controllers/accountController.js';

const router = Router();

router.use(requireAuth);

/** GET /api/v1/accounts — List all LinkedIn accounts for the authenticated user */
router.get('/', listAccounts);

/** POST /api/v1/accounts — Create a new LinkedIn account and generate hosted auth URL */
router.post('/', createAccount);

/** DELETE /api/v1/accounts/:id — Remove a LinkedIn account (must be owner) */
router.delete('/:id', deleteAccount);

export default router;
