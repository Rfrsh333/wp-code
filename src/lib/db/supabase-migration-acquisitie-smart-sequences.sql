-- Smart Sequences: Nieuwe velden op acquisitie_leads
-- Voer deze SQL uit in de Supabase SQL Editor

-- Auto-sequence velden
ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS auto_sequence_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sequence_next_action TEXT,
  ADD COLUMN IF NOT EXISTS auto_sequence_next_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_sequence_paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_sequence_history JSONB DEFAULT '[]';

-- Engagement score
ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;

-- Index voor sequence cron queries
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_sequence_active
  ON acquisitie_leads(auto_sequence_active, auto_sequence_next_date)
  WHERE auto_sequence_active = true;

CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_engagement
  ON acquisitie_leads(engagement_score DESC);
