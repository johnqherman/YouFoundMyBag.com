import { pool, withTransaction } from '../../infrastructure/database/index.js';
import { OwnerSession } from '../../client/types/index.js';
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

export async function deleteAccountData(
  email: string,
  emailHash: string
): Promise<void> {
  return withTransaction(async (client) => {
    const bagsResult = await client.query(
      'SELECT short_id FROM bags WHERE owner_email_hash = $1',
      [emailHash]
    );
    const shortIds: string[] = bagsResult.rows.map(
      (r: { short_id: string }) => r.short_id
    );

    await client.query('DELETE FROM bags WHERE owner_email_hash = $1', [
      emailHash,
    ]);
    await client.query(
      'DELETE FROM subscriptions WHERE owner_email_hash = $1',
      [emailHash]
    );
    await client.query('DELETE FROM email_preferences WHERE email = $1', [
      email,
    ]);
    await client.query('DELETE FROM owner_sessions WHERE email = $1', [email]);

    for (const shortId of shortIds) {
      await cacheDel(`bag:short:${shortId}`, 'bag');
      await cacheDel(`bag:finder:${shortId}`, 'bag_finder');
    }
    await cacheDel(`plan:${emailHash}`, 'plan');
    await cacheDel(`email_prefs:${email}`, 'email_prefs');

    logger.info('Account deleted', { emailHash });
  });
}

export async function getOwnerSettings(emailHash: string): Promise<{
  conversation_retention_months: number | null;
  owner_name: string | null;
}> {
  const result = await pool.query(
    'SELECT conversation_retention_months, owner_name FROM owner_settings WHERE owner_email_hash = $1',
    [emailHash]
  );
  if (result.rows[0]) return result.rows[0];
  return { conversation_retention_months: 6, owner_name: null }; // defaults
}

export async function upsertOwnerName(
  emailHash: string,
  ownerName: string | null
): Promise<void> {
  await pool.query(
    `INSERT INTO owner_settings (owner_email_hash, owner_name)
     VALUES ($1, $2)
     ON CONFLICT (owner_email_hash) DO UPDATE
       SET owner_name = EXCLUDED.owner_name`,
    [emailHash, ownerName || null]
  );
}

export async function upsertOwnerSettings(
  emailHash: string,
  retentionMonths: number | null
): Promise<void> {
  await pool.query(
    `INSERT INTO owner_settings (owner_email_hash, conversation_retention_months)
     VALUES ($1, $2)
     ON CONFLICT (owner_email_hash) DO UPDATE
       SET conversation_retention_months = EXCLUDED.conversation_retention_months`,
    [emailHash, retentionMonths]
  );
  await pool.query(
    `UPDATE conversations c
     SET permanently_deleted_at = CASE
       WHEN $2::INTEGER IS NOT NULL
         THEN c.archived_at + ($2 || ' months')::INTERVAL
       ELSE NULL
     END
     FROM bags b
     WHERE c.bag_id = b.id
       AND b.owner_email_hash = $1
       AND c.status = 'archived'`,
    [emailHash, retentionMonths]
  );
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
