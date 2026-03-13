-- Verloopdatum toevoegen aan documenten
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Index voor cron job lookups
CREATE INDEX IF NOT EXISTS idx_medewerker_documenten_expiry
  ON medewerker_documenten(expiry_date)
  WHERE expiry_date IS NOT NULL;
