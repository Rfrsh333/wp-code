-- ============================================
-- SPOEDDIENST / INSTANT MATCH MIGRATIE
-- TopTalent Jobs - Spoeddienst via WhatsApp
-- ============================================

-- Nieuwe velden op diensten tabel
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS is_spoeddienst BOOLEAN DEFAULT false;
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS spoeddienst_token VARCHAR(64);
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS spoeddienst_whatsapp_tekst TEXT;

-- Spoeddienst responses tabel
CREATE TABLE IF NOT EXISTS spoeddienst_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dienst_id UUID REFERENCES diensten(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(64) NOT NULL,
  medewerker_id UUID REFERENCES medewerkers(id),
  naam VARCHAR(255) NOT NULL,
  telefoon VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'beschikbaar', -- beschikbaar, bevestigd, afgewezen
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_spoeddienst_responses_dienst ON spoeddienst_responses(dienst_id);
CREATE INDEX IF NOT EXISTS idx_spoeddienst_responses_token ON spoeddienst_responses(token);
CREATE INDEX IF NOT EXISTS idx_diensten_spoeddienst_token ON diensten(spoeddienst_token);
CREATE INDEX IF NOT EXISTS idx_diensten_is_spoeddienst ON diensten(is_spoeddienst) WHERE is_spoeddienst = true;

-- RLS (Row Level Security)
ALTER TABLE spoeddienst_responses ENABLE ROW LEVEL SECURITY;

-- Policy: iedereen mag INSERT (publieke pagina)
CREATE POLICY IF NOT EXISTS "Spoeddienst responses insert" ON spoeddienst_responses
  FOR INSERT WITH CHECK (true);

-- Policy: alleen authenticated users (admin) mogen SELECT/UPDATE
CREATE POLICY IF NOT EXISTS "Spoeddienst responses admin select" ON spoeddienst_responses
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Spoeddienst responses admin update" ON spoeddienst_responses
  FOR UPDATE USING (true);
