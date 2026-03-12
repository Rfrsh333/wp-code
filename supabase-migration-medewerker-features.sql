-- Migratie: Medewerker profielfoto & admin beoordelingen
-- Voer dit uit in de Supabase SQL editor

-- Profielfoto kolommen
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;

-- Admin beoordeling kolommen
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS admin_score_aanwezigheid NUMERIC(2,1) DEFAULT NULL;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS admin_score_vaardigheden NUMERIC(2,1) DEFAULT NULL;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS admin_score_updated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS admin_score_updated_by TEXT DEFAULT NULL;

-- Storage bucket voor profielfoto's
INSERT INTO storage.buckets (id, name, public)
VALUES ('medewerker-photos', 'medewerker-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: alleen service role kan uploaden/verwijderen
CREATE POLICY "Service role can manage medewerker photos"
ON storage.objects
FOR ALL
USING (bucket_id = 'medewerker-photos')
WITH CHECK (bucket_id = 'medewerker-photos');
