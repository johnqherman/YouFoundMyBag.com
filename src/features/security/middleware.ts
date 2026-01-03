import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pool } from '../../infrastructure/database/index.js';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { TIME_CONSTANTS as t } from 'client/constants/timeConstants.js';

export const basicRateLimit = rateLimit({
  windowMs: t.FIFTEEN_MINUTES,
  max: 100,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later',
    retry_after: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
});

export const createBagRateLimit = rateLimit({
  windowMs: t.ONE_HOUR,
  max: 5,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many bags created, please try again later',
    retry_after: 60 * 60,
  },
  skip: () => process.env.NODE_ENV === 'development',
});

export const sendMessageRateLimit = rateLimit({
  windowMs: t.FIVE_MINUTES,
  max: 3,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many messages sent, please try again later',
    retry_after: 5 * 60,
  },
  skip: () => process.env.NODE_ENV === 'development',
});

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
      frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
      connectSrc: ["'self'", 'https://challenges.cloudflare.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(process.env.NODE_ENV === 'production' && {
        upgradeInsecureRequests: [],
      }),
    },
  },
  crossOriginEmbedderPolicy: false,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

export function dbRateLimit(maxRequests: number, windowMinutes: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    try {
      const clientIp =
        req.ip ||
        (req as Request & { connection?: { remoteAddress?: string } })
          .connection?.remoteAddress ||
        'unknown';
      const ipHash = crypto
        .createHash('sha256')
        .update(clientIp)
        .digest('hex')
        .substring(0, 16);
      const key = `${req.route?.path || req.path}:${ipHash}`;

      const allowed = await checkRateLimit(key, maxRequests, windowMinutes);

      if (!allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retry_after: windowMinutes * 60,
        });
      }

      return next();
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return next();
    }
  };
}

async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  const result = await pool.query(
    'SELECT check_rate_limit($1, $2, $3) as allowed',
    [key, maxRequests, windowMinutes]
  );

  return result.rows[0]?.allowed || false;
}
