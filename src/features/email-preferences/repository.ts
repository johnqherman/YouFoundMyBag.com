import { pool } from '../../infrastructure/database/index.js';
import {
  cacheGet,
  cacheSet,
  cacheDel,
} from '../../infrastructure/cache/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { TIME_SECONDS as t } from '../../client/constants/timeConstants.js';
import { EmailPreferences } from '../types/index.js';

export async function getOrCreatePreferences(
  email: string
): Promise<EmailPreferences> {
  const result = await pool.query(
    'SELECT * FROM get_or_create_email_preferences($1)',
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
  const hasUpdates =
    updates.all_emails_enabled !== undefined ||
    updates.bag_created_enabled !== undefined ||
    updates.conversation_notifications_enabled !== undefined ||
    updates.reply_notifications_enabled !== undefined;

  if (!hasUpdates) {
    return getPreferencesByToken(token);
  }

  const result = await pool.query(
    'SELECT * FROM update_email_preferences($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      token,
      updates.all_emails_enabled ?? false,
      updates.bag_created_enabled ?? false,
      updates.conversation_notifications_enabled ?? false,
      updates.reply_notifications_enabled ?? false,
      updates.all_emails_enabled !== undefined,
      updates.bag_created_enabled !== undefined,
      updates.conversation_notifications_enabled !== undefined,
      updates.reply_notifications_enabled !== undefined,
    ]
  );

  const preferences = result.rows[0] || null;

  if (preferences) {
    await cacheDel(`email_prefs:${preferences.email}`, 'email_prefs');
    logger.debug('Email preferences cache invalidated', {
      email: preferences.email,
    });
  }

  return preferences;
}

export async function shouldSendEmail(
  email: string,
  emailType: 'bag_created' | 'conversation_notification' | 'reply_notification'
): Promise<boolean> {
  let preferences: EmailPreferences | null = null;

  const cached = await cacheGet<EmailPreferences>(
    `email_prefs:${email}`,
    'email_prefs'
  );
  if (cached) {
    logger.debug('Email preferences cache HIT', { email });
    preferences = cached;
  }

  if (!preferences) {
    preferences = await getPreferencesByEmail(email);

    if (preferences) {
      await cacheSet(
        `email_prefs:${email}`,
        preferences,
        t.ONE_HOUR,
        'email_prefs'
      );
      logger.debug('Email preferences cache warmed from DB', { email });
    }
  }

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
