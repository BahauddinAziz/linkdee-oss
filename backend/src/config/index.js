/**
 * @module config
 * @description Loads, validates, and exports all required environment variables.
 * Throws descriptive errors at startup if any required variable is missing.
 */

import 'dotenv/config';

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `[Config] Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure all required variables are set.`
  );
}

if (process.env.ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    '[Config] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

/** @type {Object} Application configuration derived from environment variables */
export const config = {
  /** PostgreSQL connection URL */
  databaseUrl: process.env.DATABASE_URL,

  /** JWT access token secret (short-lived, 15m) */
  jwtSecret: process.env.JWT_SECRET,

  /** JWT refresh token secret (long-lived, 7d) */
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

  /** AES-256-CBC encryption key as a 64-char hex string (32 bytes) */
  encryptionKey: process.env.ENCRYPTION_KEY,

  /** Port the Express server will listen on */
  port: parseInt(process.env.PORT || '3000', 10),

  /** Node environment (development | production | test) */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Allowed CORS origin for the frontend */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  /** Optional Unipile shared secret for webhook signature verification */
  unipileWebhookSecret: process.env.UNIPILE_WEBHOOK_SECRET || null,

  /** Whether we're running in production */
  isProduction: process.env.NODE_ENV === 'production',
};
