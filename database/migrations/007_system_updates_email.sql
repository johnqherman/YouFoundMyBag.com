ALTER TABLE email_preferences
ADD COLUMN IF NOT EXISTS system_updates_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS terms_version_notified VARCHAR(20) DEFAULT NULL;

DROP FUNCTION IF EXISTS update_email_preferences (
  VARCHAR,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN
);

CREATE OR REPLACE FUNCTION update_email_preferences (
  p_token VARCHAR(128),
  p_all_emails_enabled BOOLEAN,
  p_bag_created_enabled BOOLEAN,
  p_conversation_notifications_enabled BOOLEAN,
  p_reply_notifications_enabled BOOLEAN,
  p_update_all_emails BOOLEAN,
  p_update_bag_created BOOLEAN,
  p_update_conversation BOOLEAN,
  p_update_reply BOOLEAN,
  p_system_updates_enabled BOOLEAN,
  p_update_system_updates BOOLEAN
) RETURNS TABLE (
  id UUID,
  email VARCHAR(254),
  unsubscribe_token VARCHAR(64),
  all_emails_enabled BOOLEAN,
  bag_created_enabled BOOLEAN,
  conversation_notifications_enabled BOOLEAN,
  reply_notifications_enabled BOOLEAN,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  system_updates_enabled BOOLEAN,
  terms_version_notified VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  UPDATE email_preferences ep
  SET
    all_emails_enabled = CASE
      WHEN p_update_all_emails THEN p_all_emails_enabled
      ELSE ep.all_emails_enabled
    END,
    bag_created_enabled = CASE
      WHEN p_update_bag_created THEN p_bag_created_enabled
      ELSE ep.bag_created_enabled
    END,
    conversation_notifications_enabled = CASE
      WHEN p_update_conversation THEN p_conversation_notifications_enabled
      ELSE ep.conversation_notifications_enabled
    END,
    reply_notifications_enabled = CASE
      WHEN p_update_reply THEN p_reply_notifications_enabled
      ELSE ep.reply_notifications_enabled
    END,
    system_updates_enabled = CASE
      WHEN p_update_system_updates THEN p_system_updates_enabled
      ELSE ep.system_updates_enabled
    END,
    unsubscribed_at = CASE
      WHEN p_update_all_emails AND NOT p_all_emails_enabled THEN NOW()
      WHEN p_update_all_emails AND p_all_emails_enabled THEN NULL
      ELSE ep.unsubscribed_at
    END,
    updated_at = NOW()
  WHERE ep.unsubscribe_token = p_token
  RETURNING
    ep.id,
    ep.email,
    ep.unsubscribe_token,
    ep.all_emails_enabled,
    ep.bag_created_enabled,
    ep.conversation_notifications_enabled,
    ep.reply_notifications_enabled,
    ep.unsubscribed_at,
    ep.created_at,
    ep.updated_at,
    ep.system_updates_enabled,
    ep.terms_version_notified;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_or_create_email_preferences (VARCHAR);

CREATE OR REPLACE FUNCTION get_or_create_email_preferences (p_email VARCHAR(254)) RETURNS TABLE (
  id UUID,
  email VARCHAR(254),
  unsubscribe_token VARCHAR(64),
  all_emails_enabled BOOLEAN,
  bag_created_enabled BOOLEAN,
  conversation_notifications_enabled BOOLEAN,
  reply_notifications_enabled BOOLEAN,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  system_updates_enabled BOOLEAN,
  terms_version_notified VARCHAR(20)
) AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  INSERT INTO email_preferences (email, unsubscribe_token)
  VALUES (p_email, generate_unsubscribe_token())
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

GRANT
EXECUTE ON FUNCTION update_email_preferences (
  VARCHAR,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN
) TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_or_create_email_preferences (VARCHAR) TO PUBLIC;
