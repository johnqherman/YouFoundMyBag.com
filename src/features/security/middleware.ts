import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from '../../infrastructure/logger/index.js';
import { cacheIncr, cacheExpire } from '../../infrastructure/cache/index.js';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  TIME_MS as tm,
  TIME_SECONDS as ts,
} from 'client/constants/timeConstants.js';

export const basicRateLimit = rateLimit({
  windowMs: tm.FIFTEEN_MINUTES,
  max: 100,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later',
    retry_after: ts.FIFTEEN_MINUTES,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
});

export const createBagRateLimit = rateLimit({
  windowMs: tm.ONE_HOUR,
  max: 5,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many bags created, please try again later',
    retry_after: ts.ONE_HOUR,
  },
  skip: () => process.env.NODE_ENV === 'development',
});

export const sendMessageRateLimit = rateLimit({
  windowMs: tm.FIVE_MINUTES,
  max: 3,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many messages sent, please try again later',
    retry_after: ts.FIVE_MINUTES,
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

    const clientIp =
      req.ip ||
      (req as Request & { connection?: { remoteAddress?: string } }).connection
        ?.remoteAddress ||
      'unknown';
    const ipHash = crypto
      .createHash('sha256')
      .update(clientIp)
      .digest('hex')
      .substring(0, 16);
    const key = `${req.route?.path || req.path}:${ipHash}`;

    const windowSeconds = windowMinutes * 60;
    const rateLimitKey = `ratelimit:${key}`;

    const count = await cacheIncr(rateLimitKey, 'ratelimit');

    if (count === 1) {
      await cacheExpire(rateLimitKey, windowSeconds);
    }

    if (count > maxRequests) {
      logger.debug('Rate limit exceeded', {
        key,
        count,
        max: maxRequests,
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retry_after: windowMinutes * 60,
      });
    }

    return next();
  };
}
