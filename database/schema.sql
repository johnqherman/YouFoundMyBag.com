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

CREATE TABLE public.rate_limits (
  key VARCHAR(100) PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  bag_id UUID REFERENCES public.bags (id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  finder_email VARCHAR(254),
  finder_email_hash VARCHAR(64),
  finder_display_name VARCHAR(30),
  finder_notifications_sent INTEGER DEFAULT 0 NOT NULL,
  owner_notifications_sent INTEGER DEFAULT 0 NOT NULL,
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

CREATE INDEX idx_rate_limits_window ON public.rate_limits (window_start);

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

GRANT ALL ON public.email_preferences TO PUBLIC;

GRANT USAGE,
SELECT
  ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

CREATE OR REPLACE FUNCTION check_rate_limit (
  limit_key TEXT,
  max_requests INTEGER,
  window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_window_start TIMESTAMP WITH TIME ZONE;
    request_count INTEGER;
BEGIN
    current_window_start := date_trunc('minute', NOW() - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM NOW())::INTEGER % window_minutes));

    DELETE FROM public.rate_limits
    WHERE window_start < current_window_start - INTERVAL '1 minute' * window_minutes;

    SELECT count INTO request_count
    FROM public.rate_limits
    WHERE key = limit_key AND window_start = current_window_start;

    IF request_count IS NULL THEN
        INSERT INTO public.rate_limits (key, count, window_start, last_attempt)
        VALUES (limit_key, 1, current_window_start, NOW())
        ON CONFLICT (key) DO UPDATE SET
            count = 1,
            window_start = current_window_start,
            last_attempt = NOW();
        RETURN TRUE;
    ELSIF request_count < max_requests THEN
        UPDATE public.rate_limits
        SET count = count + 1, last_attempt = NOW()
        WHERE key = limit_key AND window_start = current_window_start;
        RETURN TRUE;
    ELSE
        UPDATE public.rate_limits
        SET last_attempt = NOW()
        WHERE key = limit_key AND window_start = current_window_start;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;
