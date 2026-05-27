/**
 * @module middleware/errorHandler
 * @description Global Express error-handling middleware. Must be mounted last
 * (after all routes) to catch errors forwarded via `next(err)`.
 *
 * - Handles Prisma "record not found" errors as 404.
 * - Handles validation errors as 400.
 * - Defaults all other errors to 500.
 */

import { Prisma } from '@prisma/client';
import { config } from '../config/index.js';

/**
 * Global error handler middleware.
 *
 * @param {Error} err - The error object forwarded via next(err).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next - Required by Express for 4-arg signature.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Always log the full error for server-side debugging
  console.error(`[ErrorHandler] ${req.method} ${req.path}`, err);

  // Prisma record not found
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return res.status(404).json({
      error: 'The requested resource was not found.',
      code: 404,
    });
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const fields = err.meta?.target ?? ['field'];
    return res.status(409).json({
      error: `A record with this ${fields.join(', ')} already exists.`,
      code: 409,
    });
  }

  // Validation errors thrown explicitly with a statusCode property
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.statusCode,
    });
  }

  // Generic fallback — hide internal details in production
  const statusCode = err.status || 500;
  const message =
    config.isProduction && statusCode === 500
      ? 'An unexpected internal error occurred.'
      : err.message || 'An unexpected error occurred.';

  return res.status(statusCode).json({
    error: message,
    code: statusCode,
  });
}
