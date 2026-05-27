/**
 * @module server
 * @description Main Express application entry point for the LinkedReach backend.
 * Sets up middleware, mounts all routes, starts background services, and begins
 * listening for incoming HTTP connections.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startScheduler } from './services/scheduler.js';
import { startWorker } from './services/campaignWorker.js';

// Routes
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import campaignRoutes from './routes/campaigns.js';
import leadRoutes from './routes/leads.js';
import webhookRoutes from './routes/webhooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------------------------------------------------------------------------
// Trust proxy (important for correct IP detection behind nginx/load balancers)
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Core middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true, // Allow cookies (for the refresh token)
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/campaigns', leadRoutes); // Leads are nested under campaigns
app.use('/api/v1/webhooks/unipile', webhookRoutes);

// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Static file serving (frontend in production)
// ---------------------------------------------------------------------------
if (config.isProduction) {
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));

  // SPA fallback — serve index.html for unknown paths so React Router works
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Global error handler (must be last middleware)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start background services and HTTP server
// ---------------------------------------------------------------------------
startScheduler();
startWorker();

app.listen(config.port, () => {
  console.info('');
  console.info('  ╔══════════════════════════════════════════╗');
  console.info('  ║        LinkedReach Backend Server        ║');
  console.info('  ╠══════════════════════════════════════════╣');
  console.info(`  ║  Port        : ${String(config.port).padEnd(25)} ║`);
  console.info(`  ║  Environment : ${config.nodeEnv.padEnd(25)} ║`);
  console.info(`  ║  Frontend    : ${config.frontendUrl.padEnd(25)} ║`);
  console.info('  ╚══════════════════════════════════════════╝');
  console.info('');
});

export default app;
