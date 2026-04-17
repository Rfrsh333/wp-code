-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'medewerker' CHECK (user_type IN ('medewerker', 'klant')),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Index for fast lookup by user_type (for targeted notifications)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_type ON push_subscriptions(user_type);

-- RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role can manage all (API routes use supabaseAdmin)
CREATE POLICY "Service role full access"
  ON push_subscriptions FOR ALL
  USING (true);
