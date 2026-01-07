import * as repository from './repository.js';

export async function getUnsubscribeToken(email: string): Promise<string> {
  const preferences = await repository.getOrCreatePreferences(email);
  return preferences.unsubscribe_token;
}

export async function getPreferences(token: string) {
  const preferences = await repository.getPreferencesByToken(token);
  if (!preferences) {
    throw new Error('Invalid or expired unsubscribe link');
  }
  return {
    email: preferences.email,
    all_emails_enabled: preferences.all_emails_enabled,
    bag_created_enabled: preferences.bag_created_enabled,
    conversation_notifications_enabled:
      preferences.conversation_notifications_enabled,
    reply_notifications_enabled: preferences.reply_notifications_enabled,
  };
}

export async function updatePreferences(
  token: string,
  updates: {
    all_emails_enabled?: boolean;
    bag_created_enabled?: boolean;
    conversation_notifications_enabled?: boolean;
    reply_notifications_enabled?: boolean;
  }
) {
  const preferences = await repository.updatePreferences(token, updates);
  if (!preferences) {
    throw new Error('Invalid or expired unsubscribe link');
  }
  return {
    email: preferences.email,
    all_emails_enabled: preferences.all_emails_enabled,
    bag_created_enabled: preferences.bag_created_enabled,
    conversation_notifications_enabled:
      preferences.conversation_notifications_enabled,
    reply_notifications_enabled: preferences.reply_notifications_enabled,
  };
}

export async function unsubscribeAll(token: string) {
  return updatePreferences(token, { all_emails_enabled: false });
}

export async function shouldSendEmail(
  email: string,
  emailType: 'bag_created' | 'conversation_notification' | 'reply_notification'
): Promise<boolean> {
  return repository.shouldSendEmail(email, emailType);
}
