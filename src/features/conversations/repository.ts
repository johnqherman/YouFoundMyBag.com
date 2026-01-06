import { pool } from '../../infrastructure/database/index.js';
import type {
  Conversation,
  ConversationMessage,
  ConversationThread,
} from '../../client/types/index.js';

interface DatabaseMessage {
  id: string | null;
  conversation_id: string;
  sender_type: 'finder' | 'owner';
  message_content: string;
  read_at: string | null;
  sent_at: string;
}

export async function createConversation(
  bagId: string,
  finderMessage: string,
  finderEmail?: string,
  finderDisplayName?: string
): Promise<Conversation> {
  const conversationResult = await pool.query(
    'INSERT INTO conversations (bag_id, finder_email, finder_display_name) VALUES ($1, $2, $3) RETURNING *',
    [bagId, finderEmail || null, finderDisplayName || null]
  );

  const conversation = conversationResult.rows[0];

  await pool.query(
    'INSERT INTO conversation_messages (conversation_id, sender_type, message_content) VALUES ($1, $2, $3)',
    [conversation.id, 'finder', finderMessage]
  );

  await pool.query(
    'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
    [conversation.id]
  );

  return conversation;
}

export async function addMessage(
  conversationId: string,
  senderType: 'finder' | 'owner',
  messageContent: string
): Promise<ConversationMessage> {
  const messageResult = await pool.query(
    'INSERT INTO conversation_messages (conversation_id, sender_type, message_content) VALUES ($1, $2, $3) RETURNING *',
    [conversationId, senderType, messageContent]
  );

  await pool.query(
    'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
    [conversationId]
  );

  return messageResult.rows[0];
}

export async function getConversationsByBagId(
  bagId: string
): Promise<Conversation[]> {
  const result = await pool.query(
    'SELECT * FROM conversations WHERE bag_id = $1 ORDER BY last_message_at DESC',
    [bagId]
  );
  return result.rows;
}

export async function getConversationsByOwnerEmail(
  ownerEmail: string
): Promise<ConversationThread[]> {
  const result = await pool.query(
    `
    SELECT
      c.*,
      b.short_id, b.owner_name, b.bag_name, b.status as bag_status,
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
    WHERE b.owner_email = $1
    GROUP BY c.id, b.short_id, b.owner_name, b.bag_name, b.status
    ORDER BY c.last_message_at DESC
  `,
    [ownerEmail]
  );

  return result.rows.map((row) => ({
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: row.finder_email,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: row.finder_notifications_sent,
      owner_notifications_sent: row.owner_notifications_sent,
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
  }));
}

export async function getConversationById(
  conversationId: string
): Promise<ConversationThread | null> {
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
  return {
    conversation: {
      id: row.id,
      bag_id: row.bag_id,
      status: row.status,
      finder_email: row.finder_email,
      finder_display_name: row.finder_display_name,
      finder_notifications_sent: row.finder_notifications_sent,
      owner_notifications_sent: row.owner_notifications_sent,
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
}

export async function markMessagesAsRead(
  conversationId: string,
  senderType: 'finder' | 'owner'
): Promise<void> {
  const oppositeSender = senderType === 'finder' ? 'owner' : 'finder';

  await pool.query(
    'UPDATE conversation_messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_type = $2 AND read_at IS NULL',
    [conversationId, oppositeSender]
  );
}

export async function updateConversationStatus(
  conversationId: string,
  status: 'active' | 'resolved' | 'archived'
): Promise<void> {
  await pool.query('UPDATE conversations SET status = $1 WHERE id = $2', [
    status,
    conversationId,
  ]);
}

export async function getUnreadMessageCount(bagId: string): Promise<number> {
  const result = await pool.query(
    `
    SELECT COUNT(*) as unread_count
    FROM conversation_messages cm
    JOIN conversations c ON cm.conversation_id = c.id
    WHERE c.bag_id = $1
    AND cm.sender_type = 'finder'
    AND cm.read_at IS NULL
  `,
    [bagId]
  );

  return parseInt(result.rows[0].unread_count);
}

export async function getNotificationCounters(conversationId: string): Promise<{
  finder_notifications_sent: number;
  owner_notifications_sent: number;
}> {
  const result = await pool.query(
    'SELECT finder_notifications_sent, owner_notifications_sent FROM conversations WHERE id = $1',
    [conversationId]
  );

  if (result.rows.length === 0) {
    throw new Error('Conversation not found');
  }

  return result.rows[0];
}

export async function incrementNotificationCounter(
  conversationId: string,
  recipientType: 'finder' | 'owner'
): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET finder_notifications_sent = CASE WHEN $2 = 'finder' THEN finder_notifications_sent + 1 ELSE finder_notifications_sent END,
         owner_notifications_sent = CASE WHEN $2 = 'owner' THEN owner_notifications_sent + 1 ELSE owner_notifications_sent END
     WHERE id = $1`,
    [conversationId, recipientType]
  );
}

export async function resetNotificationCounter(
  conversationId: string,
  senderType: 'finder' | 'owner'
): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET finder_notifications_sent = CASE WHEN $2 = 'finder' THEN 0 ELSE finder_notifications_sent END,
         owner_notifications_sent = CASE WHEN $2 = 'owner' THEN 0 ELSE owner_notifications_sent END
     WHERE id = $1`,
    [conversationId, senderType]
  );
}
