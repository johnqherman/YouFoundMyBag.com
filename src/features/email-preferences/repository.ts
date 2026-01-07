import { pool } from '../../infrastructure/database/index.js';

export interface EmailPreferences {
  id: string;
  email: string;
  unsubscribe_token: string;
  all_emails_enabled: boolean;
  bag_created_enabled: boolean;
  conversation_notifications_enabled: boolean;
  reply_notifications_enabled: boolean;
  unsubscribed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getOrCreatePreferences(
  email: string
): Promise<EmailPreferences> {
  const result = await pool.query(
    `INSERT INTO email_preferences (email, unsubscribe_token)
     VALUES ($1, generate_unsubscribe_token())
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [email]
  );
  return result.rows[0];
}

export async function getPreferencesByToken(
  token: string
): Promise<EmailPreferences | null> {
  const result = await pool.query(
    'SELECT * FROM email_preferences WHERE unsubscribe_token = $1',
    [token]
  );
  return result.rows[0] || null;
}

export async function getPreferencesByEmail(
  email: string
): Promise<EmailPreferences | null> {
  const result = await pool.query(
    'SELECT * FROM email_preferences WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function updatePreferences(
  token: string,
  updates: {
    all_emails_enabled?: boolean;
    bag_created_enabled?: boolean;
    conversation_notifications_enabled?: boolean;
    reply_notifications_enabled?: boolean;
  }
): Promise<EmailPreferences | null> {
  const fields: string[] = [];
  const values: (boolean | string)[] = [];
  let paramIndex = 1;

  if (updates.all_emails_enabled !== undefined) {
    fields.push(`all_emails_enabled = $${paramIndex++}`);
    values.push(updates.all_emails_enabled);
  }
  if (updates.bag_created_enabled !== undefined) {
    fields.push(`bag_created_enabled = $${paramIndex++}`);
    values.push(updates.bag_created_enabled);
  }
  if (updates.conversation_notifications_enabled !== undefined) {
    fields.push(`conversation_notifications_enabled = $${paramIndex++}`);
    values.push(updates.conversation_notifications_enabled);
  }
  if (updates.reply_notifications_enabled !== undefined) {
    fields.push(`reply_notifications_enabled = $${paramIndex++}`);
    values.push(updates.reply_notifications_enabled);
  }

  if (fields.length === 0) {
    return getPreferencesByToken(token);
  }

  if (updates.all_emails_enabled === false) {
    fields.push(`unsubscribed_at = NOW()`);
  } else if (updates.all_emails_enabled === true) {
    fields.push(`unsubscribed_at = NULL`);
  }

  values.push(token);

  const result = await pool.query(
    `UPDATE email_preferences
     SET ${fields.join(', ')}
     WHERE unsubscribe_token = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function shouldSendEmail(
  email: string,
  emailType: 'bag_created' | 'conversation_notification' | 'reply_notification'
): Promise<boolean> {
  const preferences = await getPreferencesByEmail(email);

  if (!preferences) {
    return true;
  }

  if (!preferences.all_emails_enabled) {
    return false;
  }

  switch (emailType) {
    case 'bag_created':
      return preferences.bag_created_enabled;
    case 'conversation_notification':
      return preferences.conversation_notifications_enabled;
    case 'reply_notification':
      return preferences.reply_notifications_enabled;
    default:
      return true;
  }
}
