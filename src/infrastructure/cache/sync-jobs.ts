import { pool } from '../database/index.js';
import { getRedisClient, cacheHSet, cacheSet } from './index.js';
import { logger } from '../logger/index.js';
import { TIME_MS as t } from '../../client/constants/timeConstants.js';

export async function syncNotificationCountersToDb(): Promise<{
  synced: number;
  errors: number;
}> {
  const redis = getRedisClient();
  if (!redis) {
    logger.warn(
      'Redis client not available, skipping notification counter sync'
    );
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  try {
    logger.info('Starting notification counter sync from Redis to DB');

    const keys = await redis.keys('notifications:conversation:*');

    logger.info(`Found ${keys.length} notification counter keys to sync`);

    for (const key of keys) {
      try {
        const conversationId = key.replace('notifications:conversation:', '');

        const finderSent = await redis.hget(key, 'finder_sent');
        const ownerSent = await redis.hget(key, 'owner_sent');

        if (finderSent !== null && ownerSent !== null) {
          await pool.query(
            `UPDATE conversations
             SET finder_notifications_sent = $1,
                 owner_notifications_sent = $2
             WHERE id = $3`,
            [parseInt(finderSent), parseInt(ownerSent), conversationId]
          );

          synced++;
          logger.debug('Synced notification counters', {
            conversationId,
            finder_sent: finderSent,
            owner_sent: ownerSent,
          });
        }
      } catch (error) {
        errors++;
        logger.error('Failed to sync notification counter', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Notification counter sync completed', { synced, errors });
  } catch (error) {
    logger.error('Notification counter sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return { synced, errors };
}

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
    logger.info('Starting counter reconciliation');

    const conversationsResult = await pool.query(
      "SELECT id, bag_id, finder_notifications_sent, owner_notifications_sent FROM conversations WHERE status = 'active'"
    );

    logger.info(
      `Checking ${conversationsResult.rows.length} active conversations`
    );

    for (const conv of conversationsResult.rows) {
      try {
        checked++;

        const redisFinderSent = await redis.hget(
          `notifications:conversation:${conv.id}`,
          'finder_sent'
        );
        const redisOwnerSent = await redis.hget(
          `notifications:conversation:${conv.id}`,
          'owner_sent'
        );

        let notificationDrift = false;

        if (
          redisFinderSent !== null &&
          parseInt(redisFinderSent) !== conv.finder_notifications_sent
        ) {
          notificationDrift = true;
          logger.warn('Notification counter drift detected', {
            conversationId: conv.id,
            type: 'finder',
            redis: redisFinderSent,
            db: conv.finder_notifications_sent,
          });
        }

        if (
          redisOwnerSent !== null &&
          parseInt(redisOwnerSent) !== conv.owner_notifications_sent
        ) {
          notificationDrift = true;
          logger.warn('Notification counter drift detected', {
            conversationId: conv.id,
            type: 'owner',
            redis: redisOwnerSent,
            db: conv.owner_notifications_sent,
          });
        }

        if (notificationDrift) {
          drifts++;

          await cacheHSet(
            `notifications:conversation:${conv.id}`,
            'finder_sent',
            String(conv.finder_notifications_sent),
            'notification_counters'
          );
          await cacheHSet(
            `notifications:conversation:${conv.id}`,
            'owner_sent',
            String(conv.owner_notifications_sent),
            'notification_counters'
          );

          fixed++;
          logger.info('Fixed notification counter drift', {
            conversationId: conv.id,
          });
        }

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
              3600,
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
            3600,
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

  setInterval(async () => {
    try {
      await syncNotificationCountersToDb();
    } catch (error) {
      logger.error('Background sync job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, t.FIVE_MINUTES);

  setInterval(async () => {
    try {
      await reconcileCounters();
    } catch (error) {
      logger.error('Background reconciliation job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, t.ONE_HOUR);

  setTimeout(async () => {
    try {
      await reconcileCounters();
    } catch (error) {
      logger.error('Initial reconciliation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, t.ONE_MINUTE);

  logger.info('Cache background jobs started');
}
