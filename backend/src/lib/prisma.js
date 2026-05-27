/**
 * @module lib/prisma
 * @description Prisma Client singleton. Re-uses a single instance across the
 * application to avoid exhausting the database connection pool.
 */

import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

const globalForPrisma = globalThis;

/**
 * Singleton Prisma client instance.
 * In development, attaches to `globalThis` so hot-reload doesn't create
 * multiple clients. In production, creates a fresh instance once.
 */
const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log:
      config.nodeEnv === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (config.nodeEnv !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
