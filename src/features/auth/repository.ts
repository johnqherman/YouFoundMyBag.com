import { pool } from '../../infrastructure/database/index.js';
import type { OwnerSession } from '../../client/types/index.js';
import { hashForLookup } from '../../infrastructure/security/encryption.js';
import {
  cacheGet,
  cacheSet,
  cacheDel,
} from '../../infrastructure/cache/index.js';
import { logger } from '../../infrastructure/logger/index.js';

export async function createOwnerSession(
  email: string,
  bagIds: string[],
  token: string,
  expiresAt: Date,
  conversationId?: string,
  sessionType: 'owner' | 'finder' | 'magic_owner' | 'magic_finder' = 'owner'
): Promise<OwnerSession> {
  await pool.query('SELECT create_owner_session($1, $2, $3, $4, $5, $6)', [
    token,
    email,
    bagIds,
    expiresAt,
    conversationId,
    sessionType,
  ]);

  const result = await pool.query(
    'SELECT * FROM owner_sessions WHERE token = $1',
    [token]
  );

  const session = result.rows[0];

  const ttl = Math.floor(
    (new Date(session.expires_at).getTime() - Date.now()) / 1000
  );
  if (ttl > 0) {
    await cacheSet(`session:${token}`, session, ttl, 'session');
    logger.debug('Session cached on creation', {
      token: token.substring(0, 8),
    });
  }

  return session;
}

export async function getOwnerSession(
  token: string
): Promise<OwnerSession | null> {
  const cached = await cacheGet<OwnerSession>(`session:${token}`, 'session');
  if (cached) {
    logger.debug('Session cache HIT', { token: token.substring(0, 8) });
    return cached;
  }

  const result = await pool.query(
    'SELECT * FROM owner_sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  const session = result.rows[0] || null;

  if (session) {
    const ttl = Math.floor(
      (new Date(session.expires_at).getTime() - Date.now()) / 1000
    );
    if (ttl > 0) {
      await cacheSet(`session:${token}`, session, ttl, 'session');
      logger.debug('Session cache warmed from DB', {
        token: token.substring(0, 8),
      });
    }
  }

  return session;
}

export async function deleteOwnerSession(token: string): Promise<void> {
  await pool.query('DELETE FROM owner_sessions WHERE token = $1', [token]);

  await cacheDel(`session:${token}`, 'session');
  logger.debug('Session cache invalidated', {
    token: token.substring(0, 8),
  });
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
    'SELECT verify_conversation_access_finder($1, $2) as has_access',
    [conversationId, finderEmailHash]
  );

  return result.rows[0].has_access;
}
