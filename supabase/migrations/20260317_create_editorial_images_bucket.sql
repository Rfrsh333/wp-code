-- Migration: Create editorial-images storage bucket
-- Date: 2026-03-17
-- Description: Storage bucket voor generated hero images van editorial content

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('editorial-images', 'editorial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set bucket policies for public read access
CREATE POLICY IF NOT EXISTS "Public read access for editorial images"
ON storage.objects FOR SELECT
USING (bucket_id = 'editorial-images');

-- Allow service role to upload/update/delete
CREATE POLICY IF NOT EXISTS "Service role full access to editorial images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'editorial-images');

-- Allow authenticated users (admins) to upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload editorial images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editorial-images');

-- Allow authenticated users (admins) to update
CREATE POLICY IF NOT EXISTS "Authenticated users can update editorial images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'editorial-images');

-- Allow authenticated users (admins) to delete
CREATE POLICY IF NOT EXISTS "Authenticated users can delete editorial images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'editorial-images');
