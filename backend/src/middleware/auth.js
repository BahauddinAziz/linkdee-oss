/**
 * @module middleware/auth
 * @description Express middleware that authenticates requests using a JWT
 * access token in the `Authorization: Bearer <token>` header.
 * Attaches `req.user = { id }` on success; returns 401 on failure.
 */

import { verifyAccessToken } from '../lib/jwt.js';

/**
 * Authenticates the incoming request by verifying the Bearer access token.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Provide a valid Bearer token.',
        code: 401,
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    const payload = verifyAccessToken(token);

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired access token.',
      code: 401,
    });
  }
}
