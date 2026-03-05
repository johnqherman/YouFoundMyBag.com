CREATE TABLE owner_settings (
  owner_email_hash VARCHAR(64) PRIMARY KEY,
  conversation_retention_months INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_owner_settings_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_owner_settings_updated_at BEFORE
UPDATE ON owner_settings FOR EACH ROW
EXECUTE FUNCTION update_owner_settings_updated_at ();

CREATE OR REPLACE FUNCTION archive_old_resolved_conversations (p_days_threshold INTEGER DEFAULT 30) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE conversations c
  SET
    status = 'archived',
    archived_at = NOW(),
    permanently_deleted_at = (
      SELECT CASE
        WHEN os.conversation_retention_months IS NOT NULL
          THEN NOW() + (os.conversation_retention_months || ' months')::INTERVAL
        ELSE NULL
      END
      FROM bags b
      LEFT JOIN owner_settings os ON os.owner_email_hash = b.owner_email_hash
      WHERE b.id = c.bag_id
    )
  WHERE c.status = 'resolved'
    AND c.archived_at IS NULL
    AND c.last_message_at < NOW() - (p_days_threshold || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
