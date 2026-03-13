-- TopTalent Portaal Upgrade V2 - Database Migratie
-- Voer dit uit in de Supabase SQL Editor
-- Features: Berichten systeem, Shift aanbiedingen, Certificeringen, Document review

-- ============================================
-- 1. BERICHTEN (intern berichtensysteem)
-- ============================================
CREATE TABLE IF NOT EXISTS berichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  van_type TEXT NOT NULL CHECK (van_type IN ('admin', 'medewerker')),
  van_id TEXT NOT NULL,
  aan_type TEXT NOT NULL CHECK (aan_type IN ('admin', 'medewerker')),
  aan_id TEXT NOT NULL,
  onderwerp TEXT,
  inhoud TEXT NOT NULL,
  gelezen BOOLEAN DEFAULT FALSE,
  gelezen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_berichten_aan ON berichten(aan_type, aan_id, gelezen);
CREATE INDEX IF NOT EXISTS idx_berichten_van ON berichten(van_type, van_id);
CREATE INDEX IF NOT EXISTS idx_berichten_created ON berichten(created_at DESC);

ALTER TABLE berichten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "berichten_select" ON berichten
  FOR SELECT USING (true);

CREATE POLICY "berichten_insert" ON berichten
  FOR INSERT WITH CHECK (true);

CREATE POLICY "berichten_update" ON berichten
  FOR UPDATE USING (true);

-- ============================================
-- 2. DIENST AANBIEDINGEN (shift offer workflow)
-- ============================================
CREATE TABLE IF NOT EXISTS dienst_aanbiedingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dienst_id UUID NOT NULL REFERENCES diensten(id) ON DELETE CASCADE,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'aangeboden' CHECK (status IN ('aangeboden', 'geaccepteerd', 'afgewezen', 'verlopen')),
  aangeboden_at TIMESTAMPTZ DEFAULT NOW(),
  reactie_at TIMESTAMPTZ,
  verlopen_at TIMESTAMPTZ,
  notitie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aanbiedingen_medewerker ON dienst_aanbiedingen(medewerker_id, status);
CREATE INDEX IF NOT EXISTS idx_aanbiedingen_dienst ON dienst_aanbiedingen(dienst_id, status);

ALTER TABLE dienst_aanbiedingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dienst_aanbiedingen_select" ON dienst_aanbiedingen
  FOR SELECT USING (true);

CREATE POLICY "dienst_aanbiedingen_insert" ON dienst_aanbiedingen
  FOR INSERT WITH CHECK (true);

CREATE POLICY "dienst_aanbiedingen_update" ON dienst_aanbiedingen
  FOR UPDATE USING (true);

-- ============================================
-- 3. CERTIFICERINGEN (medewerker certificaten)
-- ============================================
CREATE TABLE IF NOT EXISTS certificeringen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  uitgever TEXT,
  behaald_op DATE,
  verloopt_op DATE,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificeringen_medewerker ON certificeringen(medewerker_id);

ALTER TABLE certificeringen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificeringen_select" ON certificeringen
  FOR SELECT USING (true);

CREATE POLICY "certificeringen_insert" ON certificeringen
  FOR INSERT WITH CHECK (true);

CREATE POLICY "certificeringen_update" ON certificeringen
  FOR UPDATE USING (true);

CREATE POLICY "certificeringen_delete" ON certificeringen
  FOR DELETE USING (true);

-- ============================================
-- 4. AANPASSINGEN BESTAANDE TABELLEN
-- ============================================

-- Medewerkers: notificatie voorkeuren
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS notificatie_voorkeuren JSONB DEFAULT '{"email": true, "shift_aanbiedingen": true, "berichten": true}'::jsonb;

-- Medewerker documenten: review workflow
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'goedgekeurd', 'afgekeurd'));
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS review_opmerking TEXT;
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
