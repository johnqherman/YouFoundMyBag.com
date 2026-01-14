import { Request } from 'express';
import { logger } from '../logger/index.js';
import { ConnectionInfo } from '../../features/types/index.js';

export function extractClientIp(req: Request): string | null {
  if (req.ip) {
    return req.ip;
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    if (ips) {
      return ips.trim();
    }
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  const socketIp = (req.socket as ConnectionInfo)?.remoteAddress;
  if (socketIp) {
    return socketIp;
  }

  logger.warn('Failed to extract client IP', {
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
    },
    hasSocket: !!req.socket,
  });

  return null;
}

export function getClientIdentifier(req: Request): string {
  const ip = extractClientIp(req);

  if (!ip) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `unknown_${timestamp}_${random}`;
  }

  return ip;
}
