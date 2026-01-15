import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from '../../infrastructure/logger/index.js';
import { cacheIncr, cacheExpire } from '../../infrastructure/cache/index.js';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import {
  TIME_MS as tm,
  TIME_SECONDS as ts,
} from '../../client/constants/timeConstants.js';
import { config } from '../../infrastructure/config/index.js';
import { getClientIdentifier } from '../../infrastructure/utils/ip-extraction.js';

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
  skip: () => config.NODE_ENV === 'development',
});

export const createBagRateLimit = rateLimit({
  windowMs: tm.ONE_HOUR,
  max: 5,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many bags created, please try again later',
    retry_after: ts.ONE_HOUR,
  },
  skip: () => config.NODE_ENV === 'development',
});

export const sendMessageRateLimit = rateLimit({
  windowMs: tm.ONE_MINUTE,
  max: 5,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many messages sent, please try again later',
    retry_after: ts.ONE_MINUTE,
  },
  skip: () => config.NODE_ENV === 'development',
});

export const authMagicLinkRateLimit = rateLimit({
  windowMs: tm.ONE_HOUR,
  max: 5,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many authentication requests. Please try again later.',
    retry_after: ts.ONE_HOUR,
  },
  skip: () => config.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authVerifyRateLimit = rateLimit({
  windowMs: tm.FIFTEEN_MINUTES,
  max: 10,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many verification attempts. Please check your email.',
    retry_after: ts.FIFTEEN_MINUTES,
  },
  skip: () => config.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false,
});

export function qrScanRateLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (config.NODE_ENV === 'development') {
      return next();
    }

    const shortId = req.params.shortId;
    if (!shortId) {
      return next();
    }

    const rateLimitKey = `ratelimit:qr-scan:${shortId}`;

    const count = await cacheIncr(rateLimitKey, 'qr-scan-ratelimit');

    if (count === 1) {
      await cacheExpire(rateLimitKey, ts.ONE_HOUR);
    }

    if (count > 20) {
      logger.warn('QR scan rate limit exceeded', {
        shortId,
        count,
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message:
          'This QR code has been scanned too many times. Please try again later.',
        retry_after: ts.ONE_HOUR,
      });
    }

    return next();
  };
}

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", 'https://challenges.cloudflare.com'],
      frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'"],
      childSrc: ["'self'"],
      manifestSrc: ["'self'"],
      ...(config.NODE_ENV === 'production' && {
        upgradeInsecureRequests: [],
      }),
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  crossOriginEmbedderPolicy: false,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

export function dbRateLimit(maxRequests: number, windowMinutes: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (config.NODE_ENV === 'development') {
      return next();
    }

    const clientId = getClientIdentifier(req);
    const ipHash = crypto
      .createHash('sha256')
      .update(clientId)
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
