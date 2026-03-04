CREATE OR REPLACE FUNCTION enforce_bag_name_cooldown () RETURNS TRIGGER AS $$
DECLARE
  v_can_update BOOLEAN;
  v_cooldown_end TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.bag_name IS DISTINCT FROM OLD.bag_name THEN
    IF current_setting('app.bypass_name_cooldown', TRUE) = 'true' THEN
      NEW.last_name_update := NOW();
      NEW.name_update_count := COALESCE(OLD.name_update_count, 0) + 1;
      RETURN NEW;
    END IF;

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
