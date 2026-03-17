-- Push Subscriptions tabel voor PWA notificaties
-- Run dit in de Supabase SQL editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('medewerker', 'klant')),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one subscription per endpoint per user
  UNIQUE(user_id, endpoint)
);

-- Index voor snel ophalen per user
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id, user_type);

-- Index voor snel ophalen per type (bijv. alle medewerkers)
CREATE INDEX IF NOT EXISTS idx_push_sub_type ON push_subscriptions(user_type);

-- RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Alleen service role mag push subscriptions beheren
CREATE POLICY "Service role full access" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_push_sub_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_sub_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_sub_updated_at();
