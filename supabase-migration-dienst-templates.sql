-- ============================================================================
-- Dienst Templates Migration
-- ============================================================================
-- Klanten kunnen veelgebruikte shift configuraties opslaan als templates

CREATE TABLE IF NOT EXISTS dienst_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,

  -- Template info
  naam TEXT NOT NULL,
  beschrijving TEXT,

  -- Dienst configuratie
  functie TEXT NOT NULL,
  aantal_nodig INTEGER NOT NULL DEFAULT 1,
  locatie TEXT NOT NULL,
  duur_uren DECIMAL(4,2), -- Optioneel: standaard duur (bijv 6.5 uur)
  uurtarief DECIMAL(10,2),

  -- Voorkeursmedewerkers (optioneel)
  favoriet_medewerker_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Notities
  notities TEXT,

  -- Stats
  aantal_keer_gebruikt INTEGER DEFAULT 0,
  laatst_gebruikt_op TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_dienst_templates_klant ON dienst_templates(klant_id);
CREATE INDEX idx_dienst_templates_functie ON dienst_templates(functie);
CREATE INDEX idx_dienst_templates_gebruikt ON dienst_templates(laatst_gebruikt_op DESC);

-- RLS
ALTER TABLE dienst_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "klant_eigen_templates_read" ON dienst_templates
  FOR SELECT
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_templates_insert" ON dienst_templates
  FOR INSERT
  WITH CHECK (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_templates_update" ON dienst_templates
  FOR UPDATE
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)))
  WITH CHECK (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_templates_delete" ON dienst_templates
  FOR DELETE
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_dienst_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dienst_templates_updated_at
  BEFORE UPDATE ON dienst_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_dienst_templates_updated_at();
