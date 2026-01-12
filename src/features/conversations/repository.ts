import { pool } from '../../infrastructure/database/index.js';
import {
  encrypt,
  decrypt,
  encryptField,
  decryptField,
  hashForLookup,
} from '../../infrastructure/security/encryption.js';
import type {
  Conversation,
  ConversationMessage,
  ConversationThread,
  CachedConversationThread,
  CachedConversationMessage,
} from '../../client/types/index.js';
import {
  cacheHGetAll,
  cacheHSet,
  cacheHIncrBy,
  cacheGet,
  cacheSet,
  cacheIncr,
  cacheDecr,
  cacheDel,
} from '../../infrastructure/cache/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { TIME_SECONDS as t } from '../../client/constants/timeConstants.js';

interface DatabaseMessage {
  id: string | null;
  conversation_id: string;
  sender_type: 'finder' | 'owner';
  message_content: string;
  read_at: string | null;
  sent_at: string;
}

function decryptMessageContent(encryptedContent: string): string {
  return decrypt(encryptedContent);
}

async function invalidateConversationCaches(
  conversationId: string
): Promise<void> {
  const convResult = await pool.query(
    `SELECT c.bag_id, b.owner_email_hash
     FROM conversations c
     JOIN bags b ON c.bag_id = b.id
     WHERE c.id = $1`,
    [conversationId]
  );

  if (convResult.rows.length === 0) {
    logger.warn('Conversation not found for cache invalidation', {
      conversationId,
    });
    return;
  }

  const { owner_email_hash: ownerEmailHash } = convResult.rows[0];

  await cacheDel(
    `conversation:thread:${conversationId}`,
    'conversation_thread'
  );
  logger.debug('Invalidated conversation thread cache', { conversationId });

  await cacheDel(`conversations:owner:${ownerEmailHash}`, 'dashboard');
  logger.debug('Invalidated dashboard cache', { ownerEmailHash });
}

export async function createConversation(
  bagId: string,
  finderMessage: string,
  finderEmail?: string,
  finderDisplayName?: string
): Promise<Conversation> {
  const finderEmailEncrypted = finderEmail ? encryptField(finderEmail) : null;
  const finderEmailHash = finderEmail ? hashForLookup(finderEmail) : null;

  const result = await pool.query(
    'SELECT create_conversation_with_message($1, $2, $3, $4, $5, $6) as conversation_id',
    [
      bagId,
      finderEmailEncrypted,
      finderEmailHash,
      finderDisplayName || null,
      encrypt(finderMessage),
      'finder',
    ]
  );

  const conversationId = result.rows[0].conversation_id;

  const conversationResult = await pool.query(
    'SELECT * FROM conversations WHERE id = $1',
    [conversationId]
  );

  const conversation = conversationResult.rows[0];

  return {
    ...conversation,
    finder_email: decryptField(conversation.finder_email) ?? undefined,
  };
}

export async function addMessage(
  conversationId: string,
  senderType: 'finder' | 'owner',
  messageContent: string
): Promise<ConversationMessage> {
  const result = await pool.query(
    'SELECT add_message_to_conversation($1, $2, $3) as message_id',
    [conversationId, senderType, encrypt(messageContent)]
  );

  const messageId = result.rows[0].message_id;

  const messageResult = await pool.query(
    'SELECT * FROM conversation_messages WHERE id = $1',
    [messageId]
  );

  if (senderType === 'finder') {
    const convResult = await pool.query(
      'SELECT bag_id FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (convResult.rows.length > 0) {
      const bagId = convResult.rows[0].bag_id;

      await cacheIncr(`unread:bag:${bagId}`, 'unread_count');
      await cacheIncr(`unread:conversation:${conversationId}`, 'unread_count');

      logger.debug('Unread counters incremented', { conversationId, bagId });
    }
  }

  await invalidateConversationCaches(conversationId);

  return messageResult.rows[0];
}

export async function getConversationsByBagId(
  bagId: string
): Promise<Conversation[]> {
  const result = await pool.query(
    'SELECT * FROM conversations WHERE bag_id = $1 ORDER BY last_message_at DESC',
    [bagId]
  );
  return result.rows.map((row) => ({
    ...row,
    finder_email: decryptField(row.finder_email) ?? undefined,
  }));
}

export async function getConversationsByOwnerEmail(
  ownerEmail: string
): Promise<ConversationThread[]> {
  const ownerEmailHash = hashForLookup(ownerEmail);

  const cached = await cacheGet<CachedConversationThread[]>(
    `conversations:owner:${ownerEmailHash}`,
    'dashboard'
  );
  if (cached) {
    logger.debug('Dashboard conversations cache HIT', { ownerEmailHash });
    return cached.map((thread) => ({
      ...thread,
      conversation: {
        ...thread.conversation,
        finder_email: thread.conversation.finder_email
          ? (decryptField(thread.conversation.finder_email) ?? undefined)
          : undefined,
      },
      messages: thread.messages.map((msg: CachedConversationMessage) => ({
        ...msg,
        message_content: decryptMessageContent(msg.message_content),
      })),
      unread_count: thread.unread_count,
    }));
  }

  const result = await pool.query(
    `
    SELECT
      c.*,
      b.short_id, b.owner_name, b.bag_name, b.status as bag_status,
      (
        SELECT json_build_object(
          'id', cm.id,
          'conversation_id', cm.conversation_id,
          'sender_type', cm.sender_type,
          'message_content', cm.message_content,
          'read_at', cm.read_at,
          'sent_at', cm.sent_at
        )
        FROM conversation_messages cm
        WHERE cm.conversation_id = c.id
        ORDER BY cm.sent_at DESC
        LIMIT 1
      ) as latest_message,
      (
        SELECT COUNT(*)::integer
        FROM conversation_messages cm
        WHERE cm.conversation_id = c.id
        AND cm.sender_type = 'finder'
        AND cm.read_at IS NULL
      ) as unread_count
    FROM conversations c
    JOIN bags b ON c.bag_id = b.id
    WHERE b.owner_email_hash = $1
    AND c.status != 'archived'
    ORDER BY c.last_message_at DESC
  `,
    [ownerEmailHash]
  );

  const threads = result.rows.map((row) => ({
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: decryptField(row.finder_email) ?? undefined,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: 0,
      owner_notifications_sent: 0,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
    },
    messages: row.latest_message
      ? [
          {
            ...row.latest_message,
            message_content: decryptMessageContent(
              row.latest_message.message_content
            ),
          },
        ]
      : [],
    unread_count: row.unread_count,
    bag: {
      short_id: row.short_id,
      owner_name: row.owner_name,
      bag_name: row.bag_name,
      status: row.bag_status,
    },
  }));

  const cacheData = result.rows.map((row) => ({
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: row.finder_email,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: 0,
      owner_notifications_sent: 0,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
    },
    messages: row.latest_message ? [row.latest_message] : [],
    unread_count: row.unread_count,
    bag: {
      short_id: row.short_id,
      owner_name: row.owner_name,
      bag_name: row.bag_name,
      status: row.bag_status,
    },
  }));

  await cacheSet(
    `conversations:owner:${ownerEmailHash}`,
    cacheData,
    t.FIVE_MINUTES,
    'dashboard'
  );
  logger.debug('Dashboard conversations cache warmed from DB', {
    ownerEmailHash,
    count: threads.length,
  });

  return threads;
}

export async function conversationExists(
  conversationId: string
): Promise<boolean> {
  const cacheKey = `conversation:exists:${conversationId}`;
  const cached = await cacheGet<boolean>(cacheKey, 'conversation_exists');

  if (cached !== null) {
    logger.debug('Conversation exists cache HIT', { conversationId });
    return cached;
  }

  const result = await pool.query(
    'SELECT EXISTS(SELECT 1 FROM conversations WHERE id = $1) as exists',
    [conversationId]
  );

  const exists = result.rows[0]?.exists || false;

  await cacheSet(cacheKey, exists, t.TEN_MINUTES, 'conversation_exists');

  logger.debug('Conversation exists check from DB', { conversationId, exists });
  return exists;
}

export async function getConversationById(
  conversationId: string
): Promise<ConversationThread | null> {
  const cached = await cacheGet<CachedConversationThread>(
    `conversation:thread:${conversationId}`,
    'conversation_thread'
  );
  if (cached) {
    logger.debug('Conversation thread cache HIT', { conversationId });
    return {
      ...cached,
      conversation: {
        ...cached.conversation,
        finder_email: cached.conversation.finder_email
          ? (decryptField(cached.conversation.finder_email) ?? undefined)
          : undefined,
      },
      messages: cached.messages.map((msg: CachedConversationMessage) => ({
        ...msg,
        message_content: decryptMessageContent(msg.message_content),
      })),
    };
  }

  const result = await pool.query(
    `
    SELECT
      c.*,
      b.short_id, b.owner_name, b.bag_name, b.status as bag_status, b.owner_email,
      array_agg(
        json_build_object(
          'id', cm.id,
          'conversation_id', cm.conversation_id,
          'sender_type', cm.sender_type,
          'message_content', cm.message_content,
          'read_at', cm.read_at,
          'sent_at', cm.sent_at
        ) ORDER BY cm.sent_at ASC
      ) as messages
    FROM conversations c
    JOIN bags b ON c.bag_id = b.id
    LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
    WHERE c.id = $1
    GROUP BY c.id, b.short_id, b.owner_name, b.bag_name, b.status, b.owner_email
  `,
    [conversationId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const thread = {
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: decryptField(row.finder_email) ?? undefined,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: 0,
      owner_notifications_sent: 0,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
    },
    messages: row.messages
      .filter((msg: DatabaseMessage) => msg.id !== null)
      .map((msg: DatabaseMessage) => ({
        ...msg,
        message_content: decryptMessageContent(msg.message_content),
      })),
    bag: {
      short_id: row.short_id,
      owner_name: row.owner_name,
      bag_name: row.bag_name,
      status: row.bag_status,
    },
  };

  const cacheData = {
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: row.finder_email,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: 0,
      owner_notifications_sent: 0,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
    },
    messages: row.messages.filter((msg: DatabaseMessage) => msg.id !== null),
    bag: {
      short_id: row.short_id,
      owner_name: row.owner_name,
      bag_name: row.bag_name,
      status: row.bag_status,
    },
  };

  await cacheSet(
    `conversation:thread:${conversationId}`,
    cacheData,
    t.TEN_MINUTES,
    'conversation_thread'
  );
  logger.debug('Conversation thread cache warmed from DB', {
    conversationId,
  });

  return thread;
}

export async function markMessagesAsRead(
  conversationId: string,
  senderType: 'finder' | 'owner'
): Promise<void> {
  const oppositeSender = senderType === 'finder' ? 'owner' : 'finder';

  const result = await pool.query(
    'SELECT mark_messages_as_read($1, $2) as count',
    [conversationId, oppositeSender]
  );

  const unreadCount = result.rows[0].count;

  if (oppositeSender === 'finder' && unreadCount > 0) {
    const convResult = await pool.query(
      'SELECT bag_id FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (convResult.rows.length > 0) {
      const bagId = convResult.rows[0].bag_id;

      await cacheDecr(`unread:bag:${bagId}`, unreadCount, 'unread_count');

      await cacheSet(
        `unread:conversation:${conversationId}`,
        0,
        undefined,
        'unread_count'
      );

      logger.debug('Unread counters decremented', {
        conversationId,
        bagId,
        count: unreadCount,
      });
    }
  }

  await invalidateConversationCaches(conversationId);
}

export async function updateConversationStatus(
  conversationId: string,
  status: 'active' | 'resolved' | 'archived'
): Promise<void> {
  await pool.query('UPDATE conversations SET status = $1 WHERE id = $2', [
    status,
    conversationId,
  ]);

  await invalidateConversationCaches(conversationId);
}

export async function getUnreadMessageCount(bagId: string): Promise<number> {
  const cached = await cacheGet<number>(`unread:bag:${bagId}`, 'unread_count');
  if (cached !== null && cached !== undefined) {
    logger.debug('Unread count cache HIT', { bagId, count: cached });
    return cached;
  }

  const result = await pool.query(
    'SELECT get_unread_count_for_bag($1) as unread_count',
    [bagId]
  );

  const count = result.rows[0].unread_count;

  await cacheSet(`unread:bag:${bagId}`, count, t.ONE_HOUR, 'unread_count');
  logger.debug('Unread count cache warmed from DB', { bagId, count });

  return count;
}

export async function getNotificationCounters(conversationId: string): Promise<{
  finder_notifications_sent: number;
  owner_notifications_sent: number;
}> {
  const cached = await cacheHGetAll<Record<string, string>>(
    `notifications:conversation:${conversationId}`,
    'notification_counters'
  );

  if (
    cached &&
    cached.finder_sent !== undefined &&
    cached.owner_sent !== undefined
  ) {
    logger.debug('Notification counters cache HIT', { conversationId });
    return {
      finder_notifications_sent: parseInt(cached.finder_sent),
      owner_notifications_sent: parseInt(cached.owner_sent),
    };
  }

  await cacheHSet(
    `notifications:conversation:${conversationId}`,
    'finder_sent',
    '0',
    'notification_counters'
  );
  await cacheHSet(
    `notifications:conversation:${conversationId}`,
    'owner_sent',
    '0',
    'notification_counters'
  );
  logger.debug('Notification counters initialized in Redis', {
    conversationId,
  });

  return {
    finder_notifications_sent: 0,
    owner_notifications_sent: 0,
  };
}

export async function incrementNotificationCounter(
  conversationId: string,
  recipientType: 'finder' | 'owner'
): Promise<void> {
  const field = recipientType === 'finder' ? 'finder_sent' : 'owner_sent';
  await cacheHIncrBy(
    `notifications:conversation:${conversationId}`,
    field,
    1,
    'notification_counters'
  );
  logger.debug('Notification counter incremented in Redis', {
    conversationId,
    recipientType,
  });
}

export async function resetNotificationCounter(
  conversationId: string,
  senderType: 'finder' | 'owner'
): Promise<void> {
  const field = senderType === 'finder' ? 'finder_sent' : 'owner_sent';
  await cacheHSet(
    `notifications:conversation:${conversationId}`,
    field,
    '0',
    'notification_counters'
  );
  logger.debug('Notification counter reset in Redis', {
    conversationId,
    senderType,
  });
}

export async function archiveConversation(
  conversationId: string
): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET status = 'archived', archived_at = NOW(), permanently_deleted_at = NOW() + INTERVAL '6 months'
     WHERE id = $1`,
    [conversationId]
  );

  await invalidateConversationCaches(conversationId);
  logger.info('Conversation archived', { conversationId });
}

export async function restoreConversation(
  conversationId: string
): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET status = 'resolved', archived_at = NULL, permanently_deleted_at = NULL
     WHERE id = $1`,
    [conversationId]
  );

  await invalidateConversationCaches(conversationId);
  logger.info('Conversation restored from archive', { conversationId });
}

export async function autoArchiveResolvedConversations(): Promise<number> {
  const result = await pool.query(
    'SELECT archive_old_resolved_conversations(30) as count'
  );

  const count = result.rows[0].count;

  logger.info('Auto-archived resolved conversations', { count });

  return count;
}

export async function permanentlyDeleteConversations(): Promise<number> {
  const result = await pool.query(
    'SELECT permanently_delete_old_archived_conversations(6) as count'
  );

  const count = result.rows[0].count;

  logger.info('Permanently deleted archived conversations', { count });

  return count;
}

export async function getArchivedConversationsByOwnerEmail(
  ownerEmail: string
): Promise<ConversationThread[]> {
  const ownerEmailHash = hashForLookup(ownerEmail);

  const result = await pool.query(
    `
    SELECT
      c.*,
      b.short_id, b.owner_name, b.bag_name, b.status as bag_status,
      (
        SELECT json_build_object(
          'id', cm.id,
          'conversation_id', cm.conversation_id,
          'sender_type', cm.sender_type,
          'message_content', cm.message_content,
          'read_at', cm.read_at,
          'sent_at', cm.sent_at
        )
        FROM conversation_messages cm
        WHERE cm.conversation_id = c.id
        ORDER BY cm.sent_at DESC
        LIMIT 1
      ) as latest_message,
      (
        SELECT COUNT(*)::integer
        FROM conversation_messages cm
        WHERE cm.conversation_id = c.id
        AND cm.sender_type = 'finder'
        AND cm.read_at IS NULL
      ) as unread_count
    FROM conversations c
    JOIN bags b ON c.bag_id = b.id
    WHERE b.owner_email_hash = $1
    AND c.status = 'archived'
    ORDER BY c.archived_at DESC
  `,
    [ownerEmailHash]
  );

  return result.rows.map((row) => ({
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: decryptField(row.finder_email) ?? undefined,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: 0,
      owner_notifications_sent: 0,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
      archived_at: row.archived_at,
      permanently_deleted_at: row.permanently_deleted_at,
    },
    messages: row.latest_message
      ? [
          {
            ...row.latest_message,
            message_content: decryptMessageContent(
              row.latest_message.message_content
            ),
          },
        ]
      : [],
    unread_count: row.unread_count,
    bag: {
      short_id: row.short_id,
      owner_name: row.owner_name,
      bag_name: row.bag_name,
      status: row.bag_status,
    },
  }));
}

export async function resolveAndArchiveAllByBagId(
  bagId: string
): Promise<{ count: number }> {
  const result = await pool.query(
    `UPDATE conversations
     SET status = 'archived', archived_at = NOW(), permanently_deleted_at = NOW() + INTERVAL '6 months'
     WHERE bag_id = $1
     AND status IN ('active', 'resolved')
     AND archived_at IS NULL
     RETURNING id`,
    [bagId]
  );

  for (const row of result.rows) {
    await invalidateConversationCaches(row.id);
  }

  logger.info(
    `Resolved and archived ${result.rowCount || 0} conversations for bag ${bagId}`
  );

  return { count: result.rowCount || 0 };
}

export async function verifyFinderEmailForConversation(
  email: string,
  conversationId: string
): Promise<boolean> {
  const emailHash = hashForLookup(email);
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM conversations
     WHERE id = $1
     AND finder_email_hash = $2
     AND status IN ('active', 'resolved')
     AND permanently_deleted_at IS NULL`,
    [conversationId, emailHash]
  );

  return parseInt(result.rows[0].count) > 0;
}
