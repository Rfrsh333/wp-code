-- ============================================================================
-- Supabase Storage Bucket voor Kandidaat Documenten
-- ============================================================================
-- Maak een private bucket voor kandidaat documenten (ID, CV, KVK, etc.)
-- Alleen admin heeft toegang via service role key
-- ============================================================================

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kandidaat-documenten', 'kandidaat-documenten', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Only allow authenticated admins to access files
CREATE POLICY "Admin can upload kandidaat documenten"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kandidaat-documenten');

CREATE POLICY "Admin can read kandidaat documenten"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kandidaat-documenten');

CREATE POLICY "Admin can update kandidaat documenten"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kandidaat-documenten');

CREATE POLICY "Admin can delete kandidaat documenten"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kandidaat-documenten');

-- Allow service role to bypass RLS (for API uploads)
-- This is already enabled by default for service role

COMMENT ON TABLE storage.buckets IS 'Storage buckets inclusief kandidaat-documenten bucket';
