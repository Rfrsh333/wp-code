-- Beschikbaarheid overrides per week
-- Medewerkers kunnen per specifieke week hun standaard beschikbaarheid overschrijven

CREATE TABLE IF NOT EXISTS medewerker_beschikbaarheid_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- maandag van de week
  beschikbaarheid JSONB NOT NULL DEFAULT '{}', -- zelfde formaat als standaard: {"ma": ["ochtend","middag"], ...}
  notitie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medewerker_id, week_start)
);

-- RLS
ALTER TABLE medewerker_beschikbaarheid_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medewerkers kunnen eigen overrides beheren"
  ON medewerker_beschikbaarheid_overrides
  FOR ALL
  USING (medewerker_id = auth.uid())
  WITH CHECK (medewerker_id = auth.uid());

CREATE POLICY "Service role heeft volledige toegang tot overrides"
  ON medewerker_beschikbaarheid_overrides
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index voor snelle lookups
CREATE INDEX idx_beschikbaarheid_overrides_medewerker_week
  ON medewerker_beschikbaarheid_overrides(medewerker_id, week_start);
