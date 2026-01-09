import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './infrastructure/config/index.js';
import { logger } from './infrastructure/logger/index.js';
import { initializeDatabase } from './infrastructure/database/index.js';
import { initializeCache, closeCache } from './infrastructure/cache/index.js';
import { startBackgroundJobs } from './infrastructure/cache/sync-jobs.js';
import { scheduleConversationCleanup } from './infrastructure/scheduler/conversationCleanup.js';
import {
  basicRateLimit,
  securityHeaders,
  createBagRateLimit,
  sendMessageRateLimit,
  dbRateLimit,
} from './features/security/index.js';

import { routes as bagRoutes } from './features/bags/index.js';
import { routes as messagingRoutes } from './features/messaging/index.js';
import { conversationRoutes } from './features/conversations/index.js';
import { finderRoutes } from './features/conversations/finderRoutes.js';
import { authRoutes } from './features/auth/index.js';
import { routes as emailPreferencesRoutes } from './features/email-preferences/index.js';

const app = express();

if (config.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

app.use(securityHeaders);
app.use(
  cors({
    origin:
      config.NODE_ENV === 'production'
        ? ['https://youfoundmybag.com', 'https://www.youfoundmybag.com']
        : ['http://localhost:3000'],
    credentials: true,
  })
);
app.use(basicRateLimit);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/bags', createBagRateLimit, dbRateLimit(5, 60), bagRoutes);
app.use('/api/bags', sendMessageRateLimit, dbRateLimit(3, 5), messagingRoutes);
app.use('/api', sendMessageRateLimit, dbRateLimit(5, 60), conversationRoutes);
app.use('/api', basicRateLimit, dbRateLimit(3, 60), finderRoutes);
app.use('/api', basicRateLimit, dbRateLimit(3, 60), authRoutes);
app.use(
  '/api/email-preferences',
  basicRateLimit,
  dbRateLimit(10, 60),
  emailPreferencesRoutes
);

if (config.NODE_ENV === 'production') {
  app.use(express.static('dist/frontend'));
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'dist/frontend' });
  });
}

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message:
        config.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    });
  }
);

async function startServer() {
  try {
    await initializeDatabase();
    await initializeCache();
    startBackgroundJobs();
    scheduleConversationCleanup();

    app.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(
        `Database: ${config.DATABASE_URL ? 'configured' : 'using default'}`
      );
      logger.info(`Redis cache: ${config.REDIS_HOST}:${config.REDIS_PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeCache();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeCache();
  process.exit(0);
});

startServer();
