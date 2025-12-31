CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE bags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  short_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  owner_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  bag_id UUID REFERENCES bags (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN ('email', 'sms', 'signal', 'whatsapp', 'telegram')
  ),
  value TEXT NOT NULL,
  allow_direct_display BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  bag_id UUID REFERENCES bags (id) ON DELETE CASCADE,
  from_message TEXT NOT NULL,
  sender_info TEXT,
  ip_hash TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bags_short_id ON bags (short_id);

CREATE INDEX idx_contacts_bag_id ON contacts (bag_id);

CREATE INDEX idx_messages_bag_id ON messages (bag_id);

CREATE INDEX idx_rate_limits_window ON rate_limits (window_start);

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

    DELETE FROM rate_limits
    WHERE window_start < current_window_start - INTERVAL '1 minute' * window_minutes;

    SELECT count INTO request_count
    FROM rate_limits
    WHERE key = limit_key AND window_start = current_window_start;

    IF request_count IS NULL THEN
        INSERT INTO rate_limits (key, count, window_start, last_attempt)
        VALUES (limit_key, 1, current_window_start, NOW());
        RETURN TRUE;
    ELSIF request_count < max_requests THEN
        UPDATE rate_limits
        SET count = count + 1, last_attempt = NOW()
        WHERE key = limit_key AND window_start = current_window_start;
        RETURN TRUE;
    ELSE
        UPDATE rate_limits
        SET last_attempt = NOW()
        WHERE key = limit_key AND window_start = current_window_start;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;
