-- ============================================================================
-- Dienst Annulering & Boete Systeem Migration
-- ============================================================================

-- Annuleringsbeleid configuratie per klant
CREATE TABLE IF NOT EXISTS klant_annuleringsbeleid (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID NOT NULL UNIQUE REFERENCES klanten(id) ON DELETE CASCADE,

  -- Beleid configuratie
  uren_van_tevoren_min INTEGER DEFAULT 24, -- Minimaal aantal uren van tevoren om gratis te annuleren
  boete_percentage DECIMAL(5,2) DEFAULT 50.00, -- Percentage van totaalkosten als boete (50% default)
  boete_vast_bedrag DECIMAL(10,2), -- Of een vast bedrag
  gebruik_percentage BOOLEAN DEFAULT true, -- true = percentage, false = vast bedrag

  -- Uitzonderingen
  geen_boete_eerste_x_keer INTEGER DEFAULT 0, -- Geen boete voor eerste X annuleringen
  max_gratis_annuleringen_per_maand INTEGER DEFAULT 0, -- 0 = ongelimiteerd gratis annuleringen

  is_actief BOOLEAN DEFAULT true
);

-- Annulering log
CREATE TABLE IF NOT EXISTS dienst_annuleringen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Referenties
  dienst_id UUID NOT NULL REFERENCES diensten(id) ON DELETE CASCADE,
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,

  -- Annulering details
  geannuleerd_door TEXT NOT NULL, -- 'klant' of 'admin'
  reden TEXT,
  uren_van_tevoren DECIMAL(10,2), -- Hoeveel uur van tevoren was dit

  -- Boete berekening
  boete_toegepast BOOLEAN DEFAULT false,
  boete_bedrag DECIMAL(10,2) DEFAULT 0,
  boete_reden TEXT, -- Waarom wel/niet boete

  -- Dienst info (snapshot)
  dienst_datum DATE,
  dienst_start_tijd TIME,
  aantal_medewerkers INTEGER,
  geschat_totaalbedrag DECIMAL(10,2),

  -- Factuur koppeling
  factuur_id UUID REFERENCES facturen(id)
);

-- Indexes
CREATE INDEX idx_annuleringen_dienst ON dienst_annuleringen(dienst_id);
CREATE INDEX idx_annuleringen_klant ON dienst_annuleringen(klant_id);
CREATE INDEX idx_annuleringen_datum ON dienst_annuleringen(created_at DESC);

-- RLS
ALTER TABLE klant_annuleringsbeleid ENABLE ROW LEVEL SECURITY;
ALTER TABLE dienst_annuleringen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "klant_eigen_beleid_read" ON klant_annuleringsbeleid
  FOR SELECT
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

CREATE POLICY "klant_eigen_annuleringen_read" ON dienst_annuleringen
  FOR SELECT
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

-- Default beleid voor bestaande klanten
INSERT INTO klant_annuleringsbeleid (klant_id, uren_van_tevoren_min, boete_percentage)
SELECT id, 24, 50.00
FROM klanten
WHERE NOT EXISTS (
  SELECT 1 FROM klant_annuleringsbeleid WHERE klant_annuleringsbeleid.klant_id = klanten.id
);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_annuleringsbeleid_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER annuleringsbeleid_updated_at
  BEFORE UPDATE ON klant_annuleringsbeleid
  FOR EACH ROW
  EXECUTE FUNCTION update_annuleringsbeleid_updated_at();
