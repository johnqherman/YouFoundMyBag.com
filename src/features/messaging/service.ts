import crypto from 'crypto';
import type { Request } from 'express';
import { logger } from '../../infrastructure/logger/index.js';

export function getClientIpHash(
  req: Pick<Request, 'ip'> & { connection?: { remoteAddress?: string } }
): string {
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  return crypto
    .createHash('sha256')
    .update(clientIp)
    .digest('hex')
    .substring(0, 16);
}

export async function verifyTurnstile(
  token: string,
  remoteip?: string
): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
    logger.info('Development mode: skipping Turnstile verification');
    return true;
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    logger.warn('Turnstile secret key not configured');
    return true;
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          ...(remoteip && { remoteip }),
        }),
      }
    );

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    logger.error('Turnstile verification failed:', error);
    return false;
  }
}
