-- ============================================================================
-- Klant Favoriete Medewerkers Migration
-- ============================================================================
-- Klanten kunnen medewerkers markeren als favoriet voor snelle herboekingen

CREATE TABLE IF NOT EXISTS klant_favoriete_medewerkers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  notitie TEXT,
  UNIQUE(klant_id, medewerker_id)
);

-- Index voor snelle queries
CREATE INDEX idx_klant_favorieten_klant ON klant_favoriete_medewerkers(klant_id);
CREATE INDEX idx_klant_favorieten_medewerker ON klant_favoriete_medewerkers(medewerker_id);

-- RLS policies
ALTER TABLE klant_favoriete_medewerkers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "klant_eigen_favorieten_read" ON klant_favoriete_medewerkers
  FOR SELECT
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_favorieten_insert" ON klant_favoriete_medewerkers
  FOR INSERT
  WITH CHECK (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_favorieten_delete" ON klant_favoriete_medewerkers
  FOR DELETE
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_favorieten_update" ON klant_favoriete_medewerkers
  FOR UPDATE
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)))
  WITH CHECK (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));
