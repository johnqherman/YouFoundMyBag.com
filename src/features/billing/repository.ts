import { pool, withTransaction } from '../../infrastructure/database/index.js';
import { decryptField } from '../../infrastructure/security/encryption.js';
import {
  cacheGet,
  cacheSet,
  cacheDel,
} from '../../infrastructure/cache/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { TIME_SECONDS as t } from '../../client/constants/timeConstants.js';

export interface Subscription {
  id: string;
  owner_email_hash: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: 'free' | 'pro';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  billing_period: 'monthly' | 'annual' | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  canceled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getSubscriptionByEmailHash(
  emailHash: string
): Promise<Subscription | null> {
  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE owner_email_hash = $1',
    [emailHash]
  );
  return result.rows[0] || null;
}

export async function upsertSubscription(data: {
  owner_email_hash: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  plan?: 'free' | 'pro';
  status?: 'active' | 'past_due' | 'canceled' | 'incomplete';
  billing_period?: 'monthly' | 'annual';
  current_period_start?: Date;
  current_period_end?: Date;
}): Promise<Subscription> {
  const result = await pool.query(
    `INSERT INTO subscriptions (
      owner_email_hash, stripe_customer_id, stripe_subscription_id,
      plan, status, billing_period, current_period_start, current_period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (owner_email_hash) DO UPDATE SET
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
      plan = COALESCE(EXCLUDED.plan, subscriptions.plan),
      status = COALESCE(EXCLUDED.status, subscriptions.status),
      billing_period = COALESCE(EXCLUDED.billing_period, subscriptions.billing_period),
      current_period_start = COALESCE(EXCLUDED.current_period_start, subscriptions.current_period_start),
      current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end)
    RETURNING *`,
    [
      data.owner_email_hash,
      data.stripe_customer_id,
      data.stripe_subscription_id || null,
      data.plan || 'free',
      data.status || 'active',
      data.billing_period || null,
      data.current_period_start || null,
      data.current_period_end || null,
    ]
  );

  await cacheDel(`plan:${data.owner_email_hash}`, 'plan');
  return result.rows[0];
}

export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  updates: Partial<
    Pick<
      Subscription,
      | 'plan'
      | 'status'
      | 'billing_period'
      | 'current_period_start'
      | 'current_period_end'
      | 'canceled_at'
    >
  >
): Promise<Subscription | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.plan !== undefined) {
    setClauses.push(`plan = $${paramIndex++}`);
    values.push(updates.plan);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.billing_period !== undefined) {
    setClauses.push(`billing_period = $${paramIndex++}`);
    values.push(updates.billing_period);
  }
  if (updates.current_period_start !== undefined) {
    setClauses.push(`current_period_start = $${paramIndex++}`);
    values.push(updates.current_period_start);
  }
  if (updates.current_period_end !== undefined) {
    setClauses.push(`current_period_end = $${paramIndex++}`);
    values.push(updates.current_period_end);
  }
  if (updates.canceled_at !== undefined) {
    setClauses.push(`canceled_at = $${paramIndex++}`);
    values.push(updates.canceled_at);
  }

  if (setClauses.length === 0) return null;

  values.push(stripeSubscriptionId);

  const result = await pool.query(
    `UPDATE subscriptions SET ${setClauses.join(', ')}
     WHERE stripe_subscription_id = $${paramIndex}
     RETURNING *`,
    values
  );

  const sub = result.rows[0];
  if (sub) {
    await cacheDel(`plan:${sub.owner_email_hash}`, 'plan');
  }
  return sub || null;
}

export async function getPlanForEmailHash(
  emailHash: string
): Promise<'free' | 'pro'> {
  const cached = await cacheGet<'free' | 'pro'>(`plan:${emailHash}`, 'plan');
  if (cached) {
    return cached;
  }

  const result = await pool.query(
    `SELECT plan FROM subscriptions
     WHERE owner_email_hash = $1 AND status IN ('active', 'past_due')`,
    [emailHash]
  );

  const plan: 'free' | 'pro' = result.rows[0]?.plan || 'free';
  await cacheSet(`plan:${emailHash}`, plan, t.FIVE_MINUTES, 'plan');
  return plan;
}

export async function getBagCountForEmailHash(
  emailHash: string
): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*)::INTEGER as count FROM bags WHERE owner_email_hash = $1',
    [emailHash]
  );
  return result.rows[0]?.count || 0;
}

export async function getEmailByEmailHash(
  emailHash: string
): Promise<string | null> {
  const result = await pool.query(
    'SELECT owner_email FROM bags WHERE owner_email_hash = $1 AND owner_email IS NOT NULL LIMIT 1',
    [emailHash]
  );
  return decryptField(result.rows[0]?.owner_email) || null;
}

export async function getBagShortIdsForEmailHash(
  emailHash: string
): Promise<string[]> {
  const result = await pool.query(
    'SELECT short_id FROM bags WHERE owner_email_hash = $1',
    [emailHash]
  );
  return result.rows.map((row: { short_id: string }) => row.short_id);
}

export async function lockExcessBagsForEmailHash(
  emailHash: string,
  keepCount: number
): Promise<void> {
  await pool.query(
    `UPDATE bags SET status = 'over_limit'
     WHERE owner_email_hash = $1
       AND status = 'active'
       AND id NOT IN (
         SELECT id FROM bags
         WHERE owner_email_hash = $1
         ORDER BY created_at ASC
         LIMIT $2
       )`,
    [emailHash, keepCount]
  );
  logger.info('Locked excess bags for email hash', { emailHash, keepCount });
}

export async function unlockOverLimitBagsForEmailHash(
  emailHash: string
): Promise<void> {
  await pool.query(
    `UPDATE bags SET status = 'active'
     WHERE owner_email_hash = $1
       AND status = 'over_limit'`,
    [emailHash]
  );
  logger.info('Unlocked over_limit bags for email hash', { emailHash });
}

export async function stripProFeaturesForEmailHash(
  emailHash: string
): Promise<void> {
  await pool.query(
    `UPDATE bags
     SET owner_name_override = NULL,
         tag_color_start      = NULL,
         tag_color_end        = NULL,
         show_branding        = NULL
     WHERE owner_email_hash = $1
       AND status != 'over_limit'`,
    [emailHash]
  );
  logger.info('Stripped Pro features from bags', { emailHash });
}

export async function lockAndDowngradeBagsToFree(
  emailHash: string,
  keepCount: number
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE bags SET status = 'over_limit'
       WHERE owner_email_hash = $1
         AND status = 'active'
         AND id NOT IN (
           SELECT id FROM bags
           WHERE owner_email_hash = $1
           ORDER BY created_at ASC
           LIMIT $2
         )`,
      [emailHash, keepCount]
    );
    await client.query(
      `UPDATE bags
       SET owner_name_override = NULL,
           tag_color_start      = NULL,
           tag_color_end        = NULL,
           show_branding        = NULL
       WHERE owner_email_hash = $1
         AND status != 'over_limit'`,
      [emailHash]
    );
  });
  logger.info('Locked excess bags and stripped Pro features atomically', {
    emailHash,
    keepCount,
  });
}
