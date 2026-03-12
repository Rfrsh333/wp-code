-- ============================================
-- AI OFFERTE GENERATOR MIGRATIE
-- TopTalent Jobs - Offertes tabel + digitale ondertekening
-- ============================================

-- Maak offertes tabel aan (als die nog niet bestaat)
CREATE TABLE IF NOT EXISTS offertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offerte_nummer VARCHAR(50) NOT NULL,
  aanvraag_id UUID REFERENCES personeel_aanvragen(id),
  bedrijfsnaam VARCHAR(255) NOT NULL,
  contactpersoon VARCHAR(255),
  email VARCHAR(255),
  telefoon VARCHAR(50),
  locatie VARCHAR(255),
  geldig_tot TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'concept',
  token VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI & digitale ondertekening velden
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS ai_introductie TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS tarieven JSONB;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS korting_percentage DECIMAL(4,2) DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS totaal_bedrag DECIMAL(10,2);
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS accepted_naam VARCHAR(255);
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(45);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_offertes_token ON offertes(token);
CREATE INDEX IF NOT EXISTS idx_offertes_aanvraag ON offertes(aanvraag_id);
CREATE INDEX IF NOT EXISTS idx_offertes_status ON offertes(status);

-- RLS
ALTER TABLE offertes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access offertes" ON offertes;
CREATE POLICY "Service role full access offertes" ON offertes
  FOR ALL USING (true) WITH CHECK (true);
