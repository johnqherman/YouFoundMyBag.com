import winston from 'winston';
import { config } from '../config/index.js';

const logLevel = config.NODE_ENV === 'production' ? 'info' : 'debug';

function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email;
  }
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return email;
  }
  return `${local.substring(0, 2)}***@${domain}`;
}

function sanitizeToken(token: string): string {
  if (!token || typeof token !== 'string') {
    return token;
  }
  if (token.length < 8) return '***';
  return `${token.substring(0, 4)}***`;
}

function sanitizeHash(hash: string): string {
  if (!hash || typeof hash !== 'string') {
    return hash;
  }

  if (hash.length < 12) return '***';
  return `${hash.substring(0, 6)}***`;
}

function sanitizeUuid(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') {
    return uuid;
  }

  if (uuid.length < 8) return '***';
  return `${uuid.substring(0, 8)}***`;
}

function sanitizeCacheKey(key: string): string {
  if (!key || typeof key !== 'string') {
    return key;
  }

  const parts = key.split(':');

  if (parts.length === 1) {
    return key;
  }

  const sanitizedParts = parts.map((part, index) => {
    if (index === 0) {
      return part;
    }

    if (/^[a-f0-9]{32,}$/i.test(part)) {
      return sanitizeHash(part);
    }

    if (
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        part
      )
    ) {
      return sanitizeUuid(part);
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(part)) {
      const ipParts = part.split('.');
      return `${ipParts[0]}.${ipParts[1]}.*.*`;
    }

    if (part.length <= 15 && /^[a-z_]+$/i.test(part)) {
      return part;
    }

    if (part.length > 15) {
      return `${part.substring(0, 8)}***`;
    }

    return part;
  });

  return sanitizedParts.join(':');
}

function sanitizeMetadata(
  info: Record<string, unknown>
): Record<string, unknown> {
  if ('email' in info && typeof info.email === 'string') {
    info.email = sanitizeEmail(info.email);
  }
  if ('token' in info && typeof info.token === 'string') {
    info.token = sanitizeToken(info.token);
  }
  if ('magic_token' in info && typeof info.magic_token === 'string') {
    info.magic_token = sanitizeToken(info.magic_token);
  }
  if ('session_token' in info && typeof info.session_token === 'string') {
    info.session_token = sanitizeToken(info.session_token);
  }
  if ('owner_email' in info && typeof info.owner_email === 'string') {
    info.owner_email = sanitizeEmail(info.owner_email);
  }
  if ('finder_email' in info && typeof info.finder_email === 'string') {
    info.finder_email = sanitizeEmail(info.finder_email);
  }

  if ('ownerEmailHash' in info && typeof info.ownerEmailHash === 'string') {
    info.ownerEmailHash = sanitizeHash(info.ownerEmailHash);
  }
  if ('finderEmailHash' in info && typeof info.finderEmailHash === 'string') {
    info.finderEmailHash = sanitizeHash(info.finderEmailHash);
  }
  if ('emailHash' in info && typeof info.emailHash === 'string') {
    info.emailHash = sanitizeHash(info.emailHash);
  }

  if ('conversationId' in info && typeof info.conversationId === 'string') {
    info.conversationId = sanitizeUuid(info.conversationId);
  }
  if ('bagId' in info && typeof info.bagId === 'string') {
    info.bagId = sanitizeUuid(info.bagId);
  }
  if ('messageId' in info && typeof info.messageId === 'string') {
    info.messageId = sanitizeUuid(info.messageId);
  }

  if ('key' in info && typeof info.key === 'string') {
    info.key = sanitizeCacheKey(info.key);
  }
  if ('keys' in info && Array.isArray(info.keys)) {
    info.keys = info.keys.map((k) =>
      typeof k === 'string' ? sanitizeCacheKey(k) : k
    );
  }

  if (
    'field' in info &&
    typeof info.field === 'string' &&
    info.field.length > 15
  ) {
    info.field = `${info.field.substring(0, 8)}***`;
  }

  return info;
}

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'MM-DD-YYYY HH:mm:ss' }),
  winston.format((info) => {
    sanitizeMetadata(info as Record<string, unknown>);
    return info;
  })(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});
