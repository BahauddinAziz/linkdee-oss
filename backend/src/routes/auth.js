/**
 * @module routes/auth
 * @description Authentication routes: signup, login, token refresh, logout.
 */

import { Router } from 'express';
import { signup, login, refresh, logout } from '../controllers/authController.js';

const router = Router();

/** POST /api/v1/auth/signup — Register a new user */
router.post('/signup', signup);

/** POST /api/v1/auth/login — Authenticate and receive tokens */
router.post('/login', login);

/** POST /api/v1/auth/refresh — Exchange refresh cookie for a new access token */
router.post('/refresh', refresh);

/** POST /api/v1/auth/logout — Clear the refresh token cookie */
router.post('/logout', logout);

export default router;
