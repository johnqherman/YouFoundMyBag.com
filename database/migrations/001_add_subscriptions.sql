CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email_hash VARCHAR(64) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'past_due', 'canceled', 'incomplete')
  ),
  billing_period VARCHAR(20) CHECK (billing_period IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email_hash ON public.subscriptions (owner_email_hash);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions (stripe_subscription_id)
WHERE
  stripe_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at BEFORE
UPDATE ON public.subscriptions FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at ();

CREATE OR REPLACE FUNCTION get_plan_for_email_hash (p_email_hash VARCHAR(64)) RETURNS VARCHAR(20) AS $$
DECLARE
  v_plan VARCHAR(20);
BEGIN
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE owner_email_hash = p_email_hash
    AND status IN ('active', 'past_due');

  RETURN COALESCE(v_plan, 'free');
END;
$$ LANGUAGE plpgsql;

GRANT ALL ON public.subscriptions TO PUBLIC;

GRANT
EXECUTE ON FUNCTION get_plan_for_email_hash (VARCHAR) TO PUBLIC;
