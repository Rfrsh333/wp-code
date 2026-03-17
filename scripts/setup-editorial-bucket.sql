-- Setup script voor editorial-images storage bucket
-- Run dit in Supabase SQL Editor

-- 1. Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'editorial-images',
  'editorial-images',
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public read access for editorial images" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to editorial images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload editorial images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update editorial images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete editorial images" ON storage.objects;

-- 3. Create new policies
CREATE POLICY "Public read access for editorial images"
ON storage.objects FOR SELECT
USING (bucket_id = 'editorial-images');

CREATE POLICY "Service role full access to editorial images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'editorial-images');

CREATE POLICY "Authenticated users can upload editorial images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editorial-images');

CREATE POLICY "Authenticated users can update editorial images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'editorial-images');

CREATE POLICY "Authenticated users can delete editorial images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'editorial-images');

-- Verify setup
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'editorial-images';
