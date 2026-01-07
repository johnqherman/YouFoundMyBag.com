import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './infrastructure/config/index.js';
import { initializeDatabase } from './infrastructure/database/index.js';
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
    console.error('Unhandled error:', err);
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

    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(
        `Database: ${config.DATABASE_URL ? 'configured' : 'using default'}`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
