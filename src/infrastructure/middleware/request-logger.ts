import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';
import { extractClientIp } from '../utils/ip-extraction.js';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: extractClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}
