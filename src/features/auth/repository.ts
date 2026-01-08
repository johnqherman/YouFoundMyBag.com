import { pool } from '../../infrastructure/database/index.js';
import type { OwnerSession } from '../../client/types/index.js';
import { hashForLookup } from '../../infrastructure/security/encryption.js';

export async function createOwnerSession(
  email: string,
  bagIds: string[],
  token: string,
  expiresAt: Date,
  conversationId?: string,
  sessionType: 'owner' | 'finder' | 'magic_owner' | 'magic_finder' = 'owner'
): Promise<OwnerSession> {
  const result = await pool.query(
    'INSERT INTO owner_sessions (token, email, bag_ids, expires_at, conversation_id, session_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [token, email, bagIds, expiresAt, conversationId, sessionType]
  );

  return result.rows[0];
}

export async function getOwnerSession(
  token: string
): Promise<OwnerSession | null> {
  const result = await pool.query(
    'SELECT * FROM owner_sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  return result.rows[0] || null;
}

export async function deleteOwnerSession(token: string): Promise<void> {
  await pool.query('DELETE FROM owner_sessions WHERE token = $1', [token]);
}

export async function deleteExpiredSessions(): Promise<void> {
  await pool.query('DELETE FROM owner_sessions WHERE expires_at <= NOW()');
}

export async function getBagIdsByOwnerEmail(email: string): Promise<string[]> {
  const emailHash = hashForLookup(email);

  const result = await pool.query(
    'SELECT id FROM bags WHERE owner_email_hash = $1',
    [emailHash]
  );

  return result.rows.map((row) => row.id);
}

export async function verifyOwnerEmailForBags(
  email: string,
  bagIds: string[]
): Promise<boolean> {
  if (bagIds.length === 0) return true;

  const emailHash = hashForLookup(email);

  const result = await pool.query(
    'SELECT COUNT(*) as count FROM bags WHERE owner_email_hash = $1 AND id = ANY($2)',
    [emailHash, bagIds]
  );

  return parseInt(result.rows[0].count) === bagIds.length;
}

export async function getSessionByConversation(
  conversationId: string,
  sessionType: string
): Promise<OwnerSession | null> {
  const result = await pool.query(
    'SELECT * FROM owner_sessions WHERE conversation_id = $1 AND session_type = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [conversationId, sessionType]
  );

  return result.rows[0] || null;
}

export async function verifyFinderAccessToConversation(
  finderEmail: string,
  conversationId: string
): Promise<boolean> {
  const finderEmailHash = hashForLookup(finderEmail);

  const result = await pool.query(
    'SELECT COUNT(*) as count FROM conversations WHERE id = $1 AND finder_email_hash = $2',
    [conversationId, finderEmailHash]
  );

  return parseInt(result.rows[0].count) > 0;
}
