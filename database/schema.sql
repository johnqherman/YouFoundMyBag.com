CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.bags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  bag_id UUID NOT NULL REFERENCES public.bags (id) ON DELETE CASCADE,
  short_id VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replaced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_short_id_history UNIQUE (short_id)
);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  bag_id UUID REFERENCES public.bags (id) ON DELETE CASCADE,
  from_message VARCHAR(300) NOT NULL,
  sender_info VARCHAR(30),
  ip_hash VARCHAR(64),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
