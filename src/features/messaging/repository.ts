import { pool } from '../../infrastructure/database/index.js';

export interface Message {
  id: string;
  bag_id: string;
  from_message: string;
  sender_info?: string;
  ip_hash?: string;
  sent_at: Date;
}

export async function saveMessage(
  bagId: string,
  fromMessage: string,
  senderInfo?: string,
  ipHash?: string
): Promise<Message> {
  const result = await pool.query(
    'INSERT INTO messages (bag_id, from_message, sender_info, ip_hash) VALUES ($1, $2, $3, $4) RETURNING *',
    [bagId, fromMessage, senderInfo || null, ipHash || null]
  );

  return result.rows[0];
}

export async function getMessagesByBagId(bagId: string): Promise<Message[]> {
  const result = await pool.query(
    'SELECT * FROM messages WHERE bag_id = $1 ORDER BY sent_at DESC',
    [bagId]
  );

  return result.rows;
}
