CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id VARCHAR(6) UNIQUE NOT NULL,
  owner_name VARCHAR(30),
  bag_name VARCHAR(30),
  owner_message VARCHAR(150),
  owner_email VARCHAR(254),
  owner_email_hash VARCHAR(64),
  secure_messaging_enabled BOOLEAN DEFAULT TRUE,
  opt_out_timestamp TIMESTAMP WITH TIME ZONE,
  opt_out_ip_address INET,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_name_update TIMESTAMP WITH TIME ZONE,
  name_update_count INTEGER DEFAULT 0,
  last_rotation TIMESTAMP WITH TIME ZONE,
  rotation_count INTEGER DEFAULT 0,
  CONSTRAINT bags_email_required_for_secure_messaging CHECK (
    (
      secure_messaging_enabled = TRUE
      AND owner_email IS NOT NULL
    )
    OR (
      secure_messaging_enabled = FALSE
      AND owner_email IS NULL
    )
  )
);

CREATE TABLE public.short_id_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID NOT NULL REFERENCES public.bags (id) ON DELETE CASCADE,
  short_id VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replaced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_short_id_history UNIQUE (short_id)
);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID REFERENCES public.bags (id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (
    type IN (
      'sms',
      'whatsapp',
      'email',
      'instagram',
      'telegram',
      'signal',
      'other'
    )
  ),
  value VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  label VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID REFERENCES public.bags (id) ON DELETE CASCADE,
  from_message VARCHAR(300) NOT NULL,
  sender_info VARCHAR(30),
  ip_hash VARCHAR(64),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID REFERENCES public.bags (id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  finder_email VARCHAR(254),
  finder_email_hash VARCHAR(64),
  finder_display_name VARCHAR(30),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  permanently_deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('finder', 'owner')),
  message_content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.owner_sessions (
  token VARCHAR(128) PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  bag_ids UUID[] NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversation_id UUID REFERENCES public.conversations (id) ON DELETE CASCADE,
  session_type VARCHAR(20) DEFAULT 'owner' CHECK (
    session_type IN ('owner', 'finder', 'magic_owner', 'magic_finder')
  )
);

CREATE INDEX idx_bags_short_id ON public.bags (short_id);

CREATE INDEX idx_bags_owner_email_hash ON public.bags (owner_email_hash)
WHERE
  owner_email_hash IS NOT NULL;

CREATE INDEX idx_bags_status ON public.bags (status);

CREATE INDEX idx_bags_secure_messaging ON public.bags (secure_messaging_enabled);

CREATE INDEX idx_bags_opt_out_timestamp ON public.bags (opt_out_timestamp);

CREATE INDEX idx_short_id_history_bag_id ON public.short_id_history (bag_id);

CREATE INDEX idx_short_id_history_short_id ON public.short_id_history (short_id);

CREATE INDEX idx_contacts_bag_id ON public.contacts (bag_id);

CREATE INDEX idx_messages_bag_id ON public.messages (bag_id);

CREATE INDEX idx_conversations_bag_id ON public.conversations (bag_id);

CREATE INDEX idx_conversations_finder_email_hash ON public.conversations (finder_email_hash)
WHERE
  finder_email_hash IS NOT NULL;

CREATE INDEX idx_conversations_status ON public.conversations (status);

CREATE INDEX idx_conversations_last_message ON public.conversations (last_message_at DESC);

CREATE INDEX idx_conversations_archived_at ON public.conversations (archived_at)
WHERE
  archived_at IS NOT NULL;

CREATE INDEX idx_conversations_permanently_deleted_at ON public.conversations (permanently_deleted_at)
WHERE
  permanently_deleted_at IS NOT NULL;

CREATE INDEX idx_conversations_status_last_message ON public.conversations (status, last_message_at)
WHERE
  status = 'resolved'
  AND archived_at IS NULL;

CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages (conversation_id);

CREATE INDEX idx_conversation_messages_sent_at ON public.conversation_messages (sent_at DESC);

CREATE INDEX idx_owner_sessions_email ON public.owner_sessions (email);

CREATE INDEX idx_owner_sessions_expires ON public.owner_sessions (expires_at);

CREATE INDEX idx_owner_sessions_conversation ON public.owner_sessions (conversation_id);

CREATE INDEX idx_owner_sessions_type ON public.owner_sessions (session_type);

CREATE TABLE public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) UNIQUE NOT NULL,
  unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
  all_emails_enabled BOOLEAN DEFAULT TRUE,
  bag_created_enabled BOOLEAN DEFAULT TRUE,
  conversation_notifications_enabled BOOLEAN DEFAULT TRUE,
  reply_notifications_enabled BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_preferences_email ON public.email_preferences (email);

CREATE INDEX idx_email_preferences_token ON public.email_preferences (unsubscribe_token);

CREATE INDEX idx_email_preferences_unsubscribed ON public.email_preferences (unsubscribed_at);

CREATE OR REPLACE FUNCTION generate_unsubscribe_token () RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_email_preferences_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_preferences_updated_at BEFORE
UPDATE ON public.email_preferences FOR EACH ROW
EXECUTE FUNCTION update_email_preferences_updated_at ();

CREATE OR REPLACE FUNCTION update_email_preferences (
  p_token VARCHAR(128),
  p_all_emails_enabled BOOLEAN,
  p_bag_created_enabled BOOLEAN,
  p_conversation_notifications_enabled BOOLEAN,
  p_reply_notifications_enabled BOOLEAN,
  p_update_all_emails BOOLEAN,
  p_update_bag_created BOOLEAN,
  p_update_conversation BOOLEAN,
  p_update_reply BOOLEAN
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
  updated_at TIMESTAMP WITH TIME ZONE
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
    ep.updated_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_bag_by_any_short_id (p_short_id VARCHAR(6)) RETURNS TABLE (
  id UUID,
  short_id VARCHAR(6),
  owner_name VARCHAR(30),
  bag_name VARCHAR(30),
  owner_message VARCHAR(150),
  owner_email VARCHAR(254),
  owner_email_hash VARCHAR(64),
  secure_messaging_enabled BOOLEAN,
  opt_out_timestamp TIMESTAMP WITH TIME ZONE,
  opt_out_ip_address INET,
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  
  RETURN QUERY
  SELECT b.id, b.short_id, b.owner_name, b.bag_name, b.owner_message,
         b.owner_email, b.owner_email_hash, b.secure_messaging_enabled,
         b.opt_out_timestamp, b.opt_out_ip_address, b.status,
         b.created_at, b.updated_at
  FROM bags b
  WHERE b.short_id = p_short_id;

  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT b.id, b.short_id, b.owner_name, b.bag_name, b.owner_message,
           b.owner_email, b.owner_email_hash, b.secure_messaging_enabled,
           b.opt_out_timestamp, b.opt_out_ip_address, b.status,
           b.created_at, b.updated_at
    FROM bags b
    INNER JOIN short_id_history sh ON sh.bag_id = b.id
    WHERE sh.short_id = p_short_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_update_bag_name (p_bag_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_last_update TIMESTAMP WITH TIME ZONE;
  v_cooldown_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_name_update INTO v_last_update
  FROM bags WHERE id = p_bag_id;

  
  IF v_last_update IS NULL THEN
    RETURN TRUE;
  END IF;

  
  v_cooldown_end := v_last_update + INTERVAL '7 days';

  
  RETURN NOW() >= v_cooldown_end;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_rotate_short_id (p_bag_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_last_rotation TIMESTAMP WITH TIME ZONE;
  v_cooldown_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_rotation INTO v_last_rotation
  FROM bags WHERE id = p_bag_id;

  
  IF v_last_rotation IS NULL THEN
    RETURN TRUE;
  END IF;

  
  v_cooldown_end := v_last_rotation + INTERVAL '7 days';

  
  RETURN NOW() >= v_cooldown_end;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_bag_name_cooldown () RETURNS TRIGGER AS $$
DECLARE
  v_can_update BOOLEAN;
  v_cooldown_end TIMESTAMP WITH TIME ZONE;
BEGIN
  
  IF NEW.bag_name IS DISTINCT FROM OLD.bag_name THEN
    v_can_update := can_update_bag_name(NEW.id);

    IF NOT v_can_update THEN
      v_cooldown_end := OLD.last_name_update + INTERVAL '7 days';
      RAISE EXCEPTION 'Bag name can only be updated once per week. Next update allowed after %', v_cooldown_end;
    END IF;

    
    NEW.last_name_update := NOW();
    NEW.name_update_count := COALESCE(OLD.name_update_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bag_name_cooldown_check BEFORE
UPDATE ON public.bags FOR EACH ROW
EXECUTE FUNCTION enforce_bag_name_cooldown ();

CREATE OR REPLACE FUNCTION update_bags_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bags_updated_at BEFORE
UPDATE ON public.bags FOR EACH ROW
EXECUTE FUNCTION update_bags_updated_at ();

GRANT ALL ON public.email_preferences TO PUBLIC;

GRANT
SELECT
,
  INSERT ON public.short_id_history TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_bag_by_any_short_id (VARCHAR) TO PUBLIC;

GRANT
EXECUTE ON FUNCTION can_update_bag_name (UUID) TO PUBLIC;

GRANT
EXECUTE ON FUNCTION can_rotate_short_id (UUID) TO PUBLIC;

GRANT USAGE,
SELECT
  ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

CREATE OR REPLACE FUNCTION create_bag_with_contacts (
  p_short_id VARCHAR(6),
  p_owner_name VARCHAR(30),
  p_bag_name VARCHAR(30),
  p_owner_message VARCHAR(150),
  p_owner_email VARCHAR(254),
  p_owner_email_hash VARCHAR(64),
  p_secure_messaging_enabled BOOLEAN,
  p_opt_out_timestamp TIMESTAMP WITH TIME ZONE,
  p_opt_out_ip_address INET,
  p_contacts JSONB
) RETURNS UUID AS $$
DECLARE
  v_bag_id UUID;
  v_contact JSONB;
BEGIN
  
  INSERT INTO bags (
    short_id, owner_name, bag_name, owner_message, owner_email, owner_email_hash,
    secure_messaging_enabled, opt_out_timestamp, opt_out_ip_address
  ) VALUES (
    p_short_id, p_owner_name, p_bag_name, p_owner_message, p_owner_email, p_owner_email_hash,
    p_secure_messaging_enabled, p_opt_out_timestamp, p_opt_out_ip_address
  ) RETURNING id INTO v_bag_id;

  
  IF p_contacts IS NOT NULL AND jsonb_array_length(p_contacts) > 0 THEN
    FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
    LOOP
      INSERT INTO contacts (bag_id, type, value, is_primary, display_order, label)
      VALUES (
        v_bag_id,
        (v_contact->>'type')::VARCHAR(20),
        v_contact->>'value',
        COALESCE((v_contact->>'is_primary')::BOOLEAN, FALSE),
        COALESCE((v_contact->>'display_order')::INTEGER, 0),
        v_contact->>'label'
      );
    END LOOP;
  END IF;

  RETURN v_bag_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rotate_short_id (p_bag_id UUID, p_new_short_id VARCHAR(6)) RETURNS VARCHAR(6) AS $$
DECLARE
  v_current_short_id VARCHAR(6);
  v_can_rotate BOOLEAN;
  v_cooldown_end TIMESTAMP WITH TIME ZONE;
  v_last_rotation TIMESTAMP WITH TIME ZONE;
BEGIN
  
  v_can_rotate := can_rotate_short_id(p_bag_id);

  IF NOT v_can_rotate THEN
    SELECT last_rotation INTO v_last_rotation FROM bags WHERE id = p_bag_id;
    v_cooldown_end := v_last_rotation + INTERVAL '7 days';
    RAISE EXCEPTION 'Short ID can only be rotated once per week. Next rotation allowed after %', v_cooldown_end;
  END IF;

  
  SELECT short_id INTO v_current_short_id FROM bags WHERE id = p_bag_id;

  IF v_current_short_id IS NULL THEN
    RAISE EXCEPTION 'Bag not found';
  END IF;

  
  INSERT INTO short_id_history (bag_id, short_id, replaced_at)
  VALUES (p_bag_id, v_current_short_id, NOW());

  
  UPDATE bags
  SET short_id = p_new_short_id,
      last_rotation = NOW(),
      rotation_count = COALESCE(rotation_count, 0) + 1
  WHERE id = p_bag_id;

  RETURN p_new_short_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_conversation_with_message (
  p_bag_id UUID,
  p_finder_email VARCHAR(254),
  p_finder_email_hash VARCHAR(64),
  p_finder_display_name VARCHAR(30),
  p_message_content TEXT,
  p_sender_type VARCHAR(10)
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  
  INSERT INTO conversations (
    bag_id, finder_email, finder_email_hash, finder_display_name, last_message_at
  ) VALUES (
    p_bag_id, p_finder_email, p_finder_email_hash, p_finder_display_name, NOW()
  ) RETURNING id INTO v_conversation_id;

  
  INSERT INTO conversation_messages (conversation_id, sender_type, message_content, sent_at)
  VALUES (v_conversation_id, p_sender_type, p_message_content, NOW());

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_message_to_conversation (
  p_conversation_id UUID,
  p_sender_type VARCHAR(10),
  p_message_content TEXT
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  
  INSERT INTO conversation_messages (conversation_id, sender_type, message_content, sent_at)
  VALUES (p_conversation_id, p_sender_type, p_message_content, NOW())
  RETURNING id INTO v_message_id;

  
  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_messages_as_read (p_conversation_id UUID, p_sender_type VARCHAR(10)) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  
  UPDATE conversation_messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_type = p_sender_type
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_unread_count_for_bag (p_bag_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM conversation_messages cm
  INNER JOIN conversations c ON c.id = cm.conversation_id
  WHERE c.bag_id = p_bag_id
    AND cm.sender_type = 'finder'
    AND cm.read_at IS NULL
    AND c.status = 'active'
    AND c.permanently_deleted_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_unread_count_for_conversation (p_conversation_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM conversation_messages
  WHERE conversation_id = p_conversation_id
    AND sender_type = 'finder'
    AND read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_dashboard_conversations (p_owner_email_hash VARCHAR(64)) RETURNS TABLE (
  conversation_id UUID,
  bag_id UUID,
  bag_short_id VARCHAR(6),
  bag_name VARCHAR(30),
  finder_display_name VARCHAR(30),
  status VARCHAR(20),
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER,
  latest_message_content TEXT,
  latest_message_sender_type VARCHAR(10),
  latest_message_sent_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS conversation_id,
    c.bag_id,
    b.short_id AS bag_short_id,
    b.bag_name,
    c.finder_display_name,
    c.status,
    c.last_message_at,
    c.created_at,
    COALESCE(unread.count, 0)::INTEGER AS unread_count,
    latest.message_content AS latest_message_content,
    latest.sender_type AS latest_message_sender_type,
    latest.sent_at AS latest_message_sent_at
  FROM conversations c
  INNER JOIN bags b ON b.id = c.bag_id
  
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER as count
    FROM conversation_messages
    WHERE conversation_id = c.id
      AND sender_type = 'finder'
      AND read_at IS NULL
  ) unread ON true
  
  LEFT JOIN LATERAL (
    SELECT message_content, sender_type, sent_at
    FROM conversation_messages
    WHERE conversation_id = c.id
    ORDER BY sent_at DESC
    LIMIT 1
  ) latest ON true
  WHERE b.owner_email_hash = p_owner_email_hash
    AND c.status = 'active'
    AND c.permanently_deleted_at IS NULL
  ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_archived_conversations (p_owner_email_hash VARCHAR(64)) RETURNS TABLE (
  conversation_id UUID,
  bag_id UUID,
  bag_short_id VARCHAR(6),
  bag_name VARCHAR(30),
  finder_display_name VARCHAR(30),
  status VARCHAR(20),
  last_message_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  latest_message_content TEXT,
  latest_message_sender_type VARCHAR(10),
  latest_message_sent_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS conversation_id,
    c.bag_id,
    b.short_id AS bag_short_id,
    b.bag_name,
    c.finder_display_name,
    c.status,
    c.last_message_at,
    c.archived_at,
    latest.message_content AS latest_message_content,
    latest.sender_type AS latest_message_sender_type,
    latest.sent_at AS latest_message_sent_at
  FROM conversations c
  INNER JOIN bags b ON b.id = c.bag_id
  
  LEFT JOIN LATERAL (
    SELECT message_content, sender_type, sent_at
    FROM conversation_messages
    WHERE conversation_id = c.id
    ORDER BY sent_at DESC
    LIMIT 1
  ) latest ON true
  WHERE b.owner_email_hash = p_owner_email_hash
    AND c.status = 'archived'
    AND c.permanently_deleted_at IS NULL
  ORDER BY c.archived_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_conversation_thread (p_conversation_id UUID) RETURNS TABLE (
  message_id UUID,
  sender_type VARCHAR(10),
  message_content TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id AS message_id,
    cm.sender_type,
    cm.message_content,
    cm.read_at,
    cm.sent_at
  FROM conversation_messages cm
  WHERE cm.conversation_id = p_conversation_id
  ORDER BY cm.sent_at ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION archive_old_resolved_conversations (p_days_threshold INTEGER DEFAULT 30) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE conversations
  SET status = 'archived',
      archived_at = NOW()
  WHERE status = 'resolved'
    AND archived_at IS NULL
    AND last_message_at < (NOW() - (p_days_threshold || ' days')::INTERVAL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION permanently_delete_old_archived_conversations (p_months_threshold INTEGER DEFAULT 6) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_conversation_ids UUID[];
BEGIN
  
  SELECT array_agg(id) INTO v_conversation_ids
  FROM conversations
  WHERE status = 'archived'
    AND permanently_deleted_at IS NULL
    AND archived_at < (NOW() - (p_months_threshold || ' months')::INTERVAL);

  
  UPDATE conversations
  SET permanently_deleted_at = NOW()
  WHERE id = ANY(v_conversation_ids);

  
  DELETE FROM conversations
  WHERE id = ANY(v_conversation_ids);

  v_count := COALESCE(array_length(v_conversation_ids, 1), 0);
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_owner_session (
  p_token VARCHAR(128),
  p_email VARCHAR(254),
  p_bag_ids UUID[],
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_conversation_id UUID,
  p_session_type VARCHAR(20)
) RETURNS VARCHAR(128) AS $$
BEGIN
  INSERT INTO owner_sessions (token, email, bag_ids, expires_at, conversation_id, session_type)
  VALUES (p_token, p_email, p_bag_ids, p_expires_at, p_conversation_id, p_session_type)
  ON CONFLICT (token) DO UPDATE
  SET email = EXCLUDED.email,
      bag_ids = EXCLUDED.bag_ids,
      expires_at = EXCLUDED.expires_at,
      conversation_id = EXCLUDED.conversation_id,
      session_type = EXCLUDED.session_type;

  RETURN p_token;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_bag_ownership (p_bag_id UUID, p_email_hash VARCHAR(64)) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM bags
  WHERE id = p_bag_id
    AND owner_email_hash = p_email_hash;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_conversation_access_finder (
  p_conversation_id UUID,
  p_finder_email_hash VARCHAR(64)
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM conversations
  WHERE id = p_conversation_id
    AND finder_email_hash = p_finder_email_hash
    AND permanently_deleted_at IS NULL;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_conversation_access_owner (
  p_conversation_id UUID,
  p_owner_email_hash VARCHAR(64)
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM conversations c
  INNER JOIN bags b ON b.id = c.bag_id
  WHERE c.id = p_conversation_id
    AND b.owner_email_hash = p_owner_email_hash
    AND c.permanently_deleted_at IS NULL;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

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
  updated_at TIMESTAMP WITH TIME ZONE
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
EXECUTE ON FUNCTION create_bag_with_contacts TO PUBLIC;

GRANT
EXECUTE ON FUNCTION rotate_short_id TO PUBLIC;

GRANT
EXECUTE ON FUNCTION create_conversation_with_message TO PUBLIC;

GRANT
EXECUTE ON FUNCTION add_message_to_conversation TO PUBLIC;

GRANT
EXECUTE ON FUNCTION mark_messages_as_read TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_unread_count_for_bag TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_unread_count_for_conversation TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_dashboard_conversations TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_archived_conversations TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_conversation_thread TO PUBLIC;

GRANT
EXECUTE ON FUNCTION archive_old_resolved_conversations TO PUBLIC;

GRANT
EXECUTE ON FUNCTION permanently_delete_old_archived_conversations TO PUBLIC;

GRANT
EXECUTE ON FUNCTION create_owner_session TO PUBLIC;

GRANT
EXECUTE ON FUNCTION verify_bag_ownership TO PUBLIC;

GRANT
EXECUTE ON FUNCTION verify_conversation_access_finder TO PUBLIC;

GRANT
EXECUTE ON FUNCTION verify_conversation_access_owner TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_or_create_email_preferences TO PUBLIC;
