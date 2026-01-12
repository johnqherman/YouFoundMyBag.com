import cron from 'node-cron';
import { pool } from '../database/index.js';
import { getRedisClient, cacheSet } from './index.js';
import { logger } from '../logger/index.js';
import {
  TIME_MS as tm,
  TIME_SECONDS as ts,
} from '../../client/constants/timeConstants.js';

export async function reconcileCounters(): Promise<{
  checked: number;
  drifts: number;
  fixed: number;
}> {
  const redis = getRedisClient();
  if (!redis) {
    logger.warn('Redis client not available, skipping counter reconciliation');
    return { checked: 0, drifts: 0, fixed: 0 };
  }

  let checked = 0;
  let drifts = 0;
  let fixed = 0;

  try {
    logger.info('Starting unread counter reconciliation');

    const conversationsResult = await pool.query(
      "SELECT id, bag_id FROM conversations WHERE status = 'active'"
    );

    logger.info(
      `Checking ${conversationsResult.rows.length} active conversations`
    );

    for (const conv of conversationsResult.rows) {
      try {
        checked++;

        const unreadResult = await pool.query(
          `SELECT COUNT(*) as count FROM conversation_messages
           WHERE conversation_id = $1 AND sender_type = 'finder' AND read_at IS NULL`,
          [conv.id]
        );

        const dbUnreadCount = parseInt(unreadResult.rows[0].count);
        const redisUnreadCount = await redis.get(
          `unread:conversation:${conv.id}`
        );

        if (
          redisUnreadCount !== null &&
          parseInt(redisUnreadCount) !== dbUnreadCount
        ) {
          drifts++;
          logger.warn('Unread counter drift detected', {
            conversationId: conv.id,
            redis: redisUnreadCount,
            db: dbUnreadCount,
          });

          if (dbUnreadCount > 0) {
            await cacheSet(
              `unread:conversation:${conv.id}`,
              dbUnreadCount,
              ts.ONE_HOUR,
              'unread_count'
            );
          } else {
            await redis.del(`unread:conversation:${conv.id}`);
          }

          fixed++;
          logger.info('Fixed unread counter drift', {
            conversationId: conv.id,
          });
        }
      } catch (error) {
        logger.error('Failed to reconcile counter', {
          conversationId: conv.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const bagsResult = await pool.query(
      "SELECT DISTINCT bag_id FROM conversations WHERE status = 'active'"
    );

    for (const bag of bagsResult.rows) {
      try {
        const dbBagUnread = await pool.query(
          `SELECT COUNT(*) as count FROM conversation_messages cm
           JOIN conversations c ON cm.conversation_id = c.id
           WHERE c.bag_id = $1 AND cm.sender_type = 'finder' AND cm.read_at IS NULL`,
          [bag.bag_id]
        );

        const dbCount = parseInt(dbBagUnread.rows[0].count);
        const redisCount = await redis.get(`unread:bag:${bag.bag_id}`);

        if (redisCount !== null && parseInt(redisCount) !== dbCount) {
          drifts++;
          logger.warn('Bag unread counter drift detected', {
            bagId: bag.bag_id,
            redis: redisCount,
            db: dbCount,
          });

          await cacheSet(
            `unread:bag:${bag.bag_id}`,
            dbCount,
            ts.ONE_HOUR,
            'unread_count'
          );

          fixed++;
          logger.info('Fixed bag unread counter drift', { bagId: bag.bag_id });
        }
      } catch (error) {
        logger.error('Failed to reconcile bag unread counter', {
          bagId: bag.bag_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Counter reconciliation completed', { checked, drifts, fixed });
  } catch (error) {
    logger.error('Counter reconciliation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return { checked, drifts, fixed };
}

export function startBackgroundJobs(): void {
  logger.info('Starting cache background jobs');

  cron.schedule('0 * * * *', async () => {
    try {
      await reconcileCounters();
    } catch (error) {
      logger.error('Background reconciliation job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  setTimeout(async () => {
    try {
      await reconcileCounters();
    } catch (error) {
      logger.error('Initial reconciliation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, tm.ONE_MINUTE);

  logger.info('Cache background jobs started (unread reconcile: hourly)');
}
