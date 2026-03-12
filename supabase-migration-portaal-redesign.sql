-- Medewerker Portaal Herontwerp - Database Migratie
-- Voer dit uit in de Supabase SQL Editor

-- Persoonlijke info
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS geboortedatum DATE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS stad TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS bsn_geverifieerd BOOLEAN DEFAULT FALSE;

-- Facturatie
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS factuur_adres TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS factuur_postcode TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS factuur_stad TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS btw_nummer TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS iban TEXT;

-- Werkervaring tabel
CREATE TABLE IF NOT EXISTS medewerker_werkervaring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  werkgever TEXT NOT NULL,
  functie TEXT NOT NULL,
  categorie TEXT NOT NULL,
  locatie TEXT,
  start_datum DATE NOT NULL,
  eind_datum DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaardigheden tabel
CREATE TABLE IF NOT EXISTS medewerker_vaardigheden (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL,
  vaardigheid TEXT NOT NULL,
  UNIQUE(medewerker_id, categorie, vaardigheid)
);

-- Documenten tabel
CREATE TABLE IF NOT EXISTS medewerker_documenten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket voor documenten
INSERT INTO storage.buckets (id, name, public)
VALUES ('medewerker-documenten', 'medewerker-documenten', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies voor werkervaring
ALTER TABLE medewerker_werkervaring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medewerker_werkervaring_select" ON medewerker_werkervaring
  FOR SELECT USING (true);

CREATE POLICY "medewerker_werkervaring_insert" ON medewerker_werkervaring
  FOR INSERT WITH CHECK (true);

CREATE POLICY "medewerker_werkervaring_delete" ON medewerker_werkervaring
  FOR DELETE USING (true);

-- RLS policies voor vaardigheden
ALTER TABLE medewerker_vaardigheden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medewerker_vaardigheden_select" ON medewerker_vaardigheden
  FOR SELECT USING (true);

CREATE POLICY "medewerker_vaardigheden_insert" ON medewerker_vaardigheden
  FOR INSERT WITH CHECK (true);

CREATE POLICY "medewerker_vaardigheden_delete" ON medewerker_vaardigheden
  FOR DELETE USING (true);

-- RLS policies voor documenten
ALTER TABLE medewerker_documenten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medewerker_documenten_select" ON medewerker_documenten
  FOR SELECT USING (true);

CREATE POLICY "medewerker_documenten_insert" ON medewerker_documenten
  FOR INSERT WITH CHECK (true);

CREATE POLICY "medewerker_documenten_delete" ON medewerker_documenten
  FOR DELETE USING (true);
