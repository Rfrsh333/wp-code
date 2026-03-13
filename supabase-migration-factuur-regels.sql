-- Factuurregels tabel voor gedetailleerde factuurregels

CREATE TABLE IF NOT EXISTS factuur_regels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factuur_id UUID NOT NULL REFERENCES facturen(id) ON DELETE CASCADE,
  omschrijving TEXT NOT NULL,
  uren NUMERIC(6,2) NOT NULL DEFAULT 0,
  uurtarief NUMERIC(8,2) NOT NULL DEFAULT 0,
  totaal NUMERIC(10,2) NOT NULL DEFAULT 0,
  uren_registratie_id UUID REFERENCES uren_registraties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE factuur_regels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role heeft volledige toegang tot factuur_regels"
  ON factuur_regels
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX idx_factuur_regels_factuur ON factuur_regels(factuur_id);
