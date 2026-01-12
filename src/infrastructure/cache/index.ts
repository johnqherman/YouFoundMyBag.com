import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';
import { TIME_MS as t } from '../../client/constants/timeConstants.js';

interface RedisError extends Error {
  code?: string;
  errno?: number;
}

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function initializeCache(): Promise<void> {
  logger.info('Initializing Redis cache connection...');

  return new Promise<void>((resolve, reject) => {
    logger.info('Redis config', {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      hasPassword: !!config.REDIS_PASSWORD,
      tlsEnabled: config.REDIS_TLS_ENABLED,
      connectTimeout: config.REDIS_CONNECT_TIMEOUT,
    });

    const timeout = setTimeout(() => {
      logger.error('Redis timeout reached, no events fired');
      reject(new Error('Redis connection timeout'));
    }, config.REDIS_CONNECT_TIMEOUT);

    redisClient = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD || undefined,

      maxRetriesPerRequest: config.REDIS_MAX_RETRIES,
      enableReadyCheck: true,
      enableOfflineQueue: false,

      connectTimeout: config.REDIS_CONNECT_TIMEOUT,
      commandTimeout: config.REDIS_COMMAND_TIMEOUT,

      retryStrategy: (times: number) => {
        logger.warn(`Redis retry strategy called, attempt ${times}`);
        if (times > config.REDIS_MAX_RETRIES) {
          logger.error('Redis connection failed after max retries');
          return null;
        }
        const delay = Math.min(times * 50, t.TWO_SECONDS);
        logger.warn(`Redis reconnect attempt ${times}, delay: ${delay}ms`);
        return delay;
      },

      tls: config.REDIS_TLS_ENABLED ? {} : undefined,

      lazyConnect: false,
    });

    logger.info('Redis client created, waiting for connection...');

    redisClient.on('connect', () => {
      logger.info('Redis connection established');
    });

    redisClient.once('ready', () => {
      clearTimeout(timeout);
      logger.info('Redis cache initialized successfully');
      resolve();
    });

    redisClient.once('error', (err: RedisError) => {
      clearTimeout(timeout);
      logger.error('Redis connection error during init', {
        error: err.message,
        code: err.code,
        errno: err.errno,
      });
      reject(err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  });
}

export async function closeCache(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function cacheGet<T>(
  key: string,
  cacheType: string
): Promise<T | null> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const value = await redisClient.get(key);

  if (value) {
    logger.debug('Cache HIT', { key, cacheType });
    return JSON.parse(value) as T;
  }

  logger.debug('Cache MISS', { key, cacheType });
  return null;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds?: number,
  cacheType?: string
): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redisClient.setex(key, ttlSeconds, serialized);
  } else {
    await redisClient.set(key, serialized);
  }

  logger.debug('Cache SET', { key, ttl: ttlSeconds, cacheType });
}

export async function cacheDel(
  key: string | string[],
  cacheType?: string
): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const keys = Array.isArray(key) ? key : [key];
  await redisClient.del(...keys);
  logger.debug('Cache DEL', { keys, cacheType });
}

export async function cacheIncr(
  key: string,
  cacheType?: string
): Promise<number> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const count = await redisClient.incr(key);
  logger.debug('Cache INCR', { key, count, cacheType });
  return count;
}

export async function cacheDecr(
  key: string,
  by: number = 1,
  cacheType?: string
): Promise<number> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const count = await redisClient.decrby(key, by);
  logger.debug('Cache DECR', { key, by, count, cacheType });
  return count;
}

export async function cacheExpire(
  key: string,
  ttlSeconds: number
): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  await redisClient.expire(key, ttlSeconds);
}

export async function cacheHGet(
  key: string,
  field: string,
  cacheType?: string
): Promise<string | null> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const value = await redisClient.hget(key, field);

  if (value) {
    logger.debug('Cache HGET', { key, field, cacheType });
  }

  return value;
}

export async function cacheHGetAll<T extends Record<string, string>>(
  key: string,
  cacheType: string
): Promise<T | null> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const value = await redisClient.hgetall(key);

  if (value && Object.keys(value).length > 0) {
    logger.debug('Cache HGETALL HIT', { key, cacheType });
    return value as T;
  }

  logger.debug('Cache HGETALL MISS', { key, cacheType });
  return null;
}

export async function cacheHSet(
  key: string,
  field: string,
  value: string,
  cacheType?: string
): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  await redisClient.hset(key, field, value);
  logger.debug('Cache HSET', { key, field, cacheType });
}

export async function cacheHIncrBy(
  key: string,
  field: string,
  increment: number,
  cacheType?: string
): Promise<number> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const count = await redisClient.hincrby(key, field, increment);
  logger.debug('Cache HINCRBY', {
    key,
    field,
    increment,
    count,
    cacheType,
  });
  return count;
}
