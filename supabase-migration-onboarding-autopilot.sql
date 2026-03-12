-- ============================================
-- ONBOARDING AUTOPILOT MIGRATIE
-- TopTalent Jobs - Automatische onboarding flow
-- ============================================

-- Nieuwe velden op inschrijvingen tabel
ALTER TABLE inschrijvingen ADD COLUMN IF NOT EXISTS onboarding_auto BOOLEAN DEFAULT true;
ALTER TABLE inschrijvingen ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE inschrijvingen ADD COLUMN IF NOT EXISTS laatste_onboarding_actie TIMESTAMPTZ;

-- Index voor autopilot cron queries
CREATE INDEX IF NOT EXISTS idx_inschrijvingen_onboarding_auto
  ON inschrijvingen(onboarding_auto, onboarding_status)
  WHERE onboarding_auto = true;

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_onboarding_step
  ON inschrijvingen(onboarding_step)
  WHERE onboarding_auto = true;
