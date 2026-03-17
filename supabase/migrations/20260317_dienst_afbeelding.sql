-- Voeg afbeelding_url kolom toe aan diensten tabel
-- Klanten kunnen een foto uploaden bij het aanmaken van een dienst
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS afbeelding_url text;

-- Maak storage bucket voor dienst afbeeldingen (als het nog niet bestaat)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dienst-afbeeldingen',
  'dienst-afbeeldingen',
  true,
  524288, -- 500KB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: iedereen mag lezen (public bucket)
CREATE POLICY IF NOT EXISTS "Dienst afbeeldingen zijn publiek leesbaar"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dienst-afbeeldingen');

-- Storage policy: alleen service role mag uploaden (via API route)
CREATE POLICY IF NOT EXISTS "Service role kan dienst afbeeldingen uploaden"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dienst-afbeeldingen');
