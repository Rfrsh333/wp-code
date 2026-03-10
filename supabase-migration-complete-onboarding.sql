-- ============================================================================
-- Complete Kandidaat Onboarding Verbeteringen
-- ============================================================================
-- Dit script bevat alle database wijzigingen voor de onboarding verbeteringen:
-- 1. Token validatie performance optimalisatie
-- 2. Email tracking (delivered, bounced, opened, clicked)
-- 3. Document review workflow
-- 4. Upload link regeneratie
-- ============================================================================

-- ============================================================================
-- 1. Email Log Tabel (voor tracking en idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kandidaat_id UUID REFERENCES inschrijvingen(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ, -- Resend webhook: email delivered
  bounced_at TIMESTAMPTZ,   -- Resend webhook: email bounced
  opened_at TIMESTAMPTZ,     -- Resend webhook: email opened
  clicked_at TIMESTAMPTZ,    -- Resend webhook: link clicked
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'failed'
  resend_email_id TEXT,      -- Resend email ID voor webhook matching
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_email_log_kandidaat ON email_log(kandidaat_id);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_resend_id ON email_log(resend_email_id) WHERE resend_email_id IS NOT NULL;

-- Check constraint voor email_type
ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_type_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_type_check
CHECK (email_type IN ('bevestiging', 'documenten_opvragen', 'inzetbaar', 'custom'));

-- Check constraint voor status
ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_status_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_status_check
CHECK (status IN ('sent', 'delivered', 'bounced', 'failed'));

COMMENT ON TABLE email_log IS 'Logs alle emails verzonden naar kandidaten inclusief delivery tracking';
COMMENT ON COLUMN email_log.email_type IS 'Type email: bevestiging, documenten_opvragen, inzetbaar, custom';
COMMENT ON COLUMN email_log.status IS 'Email status: sent, delivered, bounced, failed';
COMMENT ON COLUMN email_log.resend_email_id IS 'Resend email ID voor webhook event matching';

-- ============================================================================
-- 2. Inschrijvingen Tabel Uitbreidingen (Token Optimalisatie)
-- ============================================================================

-- Voeg token velden toe voor O(1) lookup performance
ALTER TABLE inschrijvingen
  ADD COLUMN IF NOT EXISTS onboarding_portal_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_portal_token_expires_at TIMESTAMPTZ;

-- Voeg email tracking timestamps toe
ALTER TABLE inschrijvingen
  ADD COLUMN IF NOT EXISTS intake_bevestiging_verstuurd_op TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS documenten_verzoek_verstuurd_op TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welkom_mail_verstuurd_op TIMESTAMPTZ;

-- Index voor token lookup (super snel)
CREATE INDEX IF NOT EXISTS idx_inschrijvingen_portal_token
  ON inschrijvingen(onboarding_portal_token)
  WHERE onboarding_portal_token IS NOT NULL;

COMMENT ON COLUMN inschrijvingen.onboarding_portal_token IS 'Secure token voor document upload pagina (SHA256 hash)';
COMMENT ON COLUMN inschrijvingen.onboarding_portal_token_expires_at IS 'Vervaldatum van upload token (standaard 7 dagen)';

-- ============================================================================
-- 3. Kandidaat Documenten Tabel (Document Review Workflow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kandidaat_documenten (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inschrijving_id UUID NOT NULL REFERENCES inschrijvingen(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'id', 'cv', 'kvk', 'overig'
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_url TEXT, -- Public/signed URL
  file_size INTEGER, -- Bytes
  mime_type TEXT,

  -- Review workflow
  review_status TEXT DEFAULT 'in_review', -- 'in_review', 'approved', 'rejected'
  reviewed_by TEXT, -- Admin email who reviewed the document
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT, -- Reden voor afwijzing of opmerkingen

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kandidaat_documenten_inschrijving ON kandidaat_documenten(inschrijving_id);
CREATE INDEX IF NOT EXISTS idx_kandidaat_documenten_type ON kandidaat_documenten(document_type);
CREATE INDEX IF NOT EXISTS idx_kandidaat_documenten_status ON kandidaat_documenten(review_status);
CREATE INDEX IF NOT EXISTS idx_kandidaat_documenten_uploaded ON kandidaat_documenten(uploaded_at DESC);

-- Check constraints
ALTER TABLE kandidaat_documenten DROP CONSTRAINT IF EXISTS kandidaat_documenten_type_check;
ALTER TABLE kandidaat_documenten ADD CONSTRAINT kandidaat_documenten_type_check
CHECK (document_type IN ('id', 'cv', 'kvk', 'overig'));

ALTER TABLE kandidaat_documenten DROP CONSTRAINT IF EXISTS kandidaat_documenten_review_status_check;
ALTER TABLE kandidaat_documenten ADD CONSTRAINT kandidaat_documenten_review_status_check
CHECK (review_status IN ('in_review', 'approved', 'rejected'));

COMMENT ON TABLE kandidaat_documenten IS 'Geüploade documenten van kandidaten met review workflow';
COMMENT ON COLUMN kandidaat_documenten.document_type IS 'Type document: id (identiteitsbewijs), cv, kvk (uittreksel), overig';
COMMENT ON COLUMN kandidaat_documenten.review_status IS 'Review status: in_review (nog te beoordelen), approved (goedgekeurd), rejected (afgekeurd)';

-- ============================================================================
-- 4. Supabase Storage Bucket voor Kandidaat Documenten
-- ============================================================================

-- Maak private bucket voor kandidaat documenten
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kandidaat-documenten',
  'kandidaat-documenten',
  false, -- Private bucket
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- RLS Policies voor storage bucket
DROP POLICY IF EXISTS "Admin can upload kandidaat documenten" ON storage.objects;
CREATE POLICY "Admin can upload kandidaat documenten"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kandidaat-documenten');

DROP POLICY IF EXISTS "Admin can read kandidaat documenten" ON storage.objects;
CREATE POLICY "Admin can read kandidaat documenten"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kandidaat-documenten');

DROP POLICY IF EXISTS "Admin can update kandidaat documenten" ON storage.objects;
CREATE POLICY "Admin can update kandidaat documenten"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kandidaat-documenten');

DROP POLICY IF EXISTS "Admin can delete kandidaat documenten" ON storage.objects;
CREATE POLICY "Admin can delete kandidaat documenten"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kandidaat-documenten');

-- Service role bypasses RLS automatically (voor API uploads)
COMMENT ON TABLE storage.buckets IS 'Storage buckets inclusief kandidaat-documenten bucket';

-- ============================================================================
-- 5. Helper Functions (optioneel, voor convenience)
-- ============================================================================

-- Functie om verlopen tokens op te schonen (kan via cron job gedraaid worden)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE inschrijvingen
  SET
    onboarding_portal_token = NULL,
    onboarding_portal_token_expires_at = NULL
  WHERE
    onboarding_portal_token IS NOT NULL
    AND onboarding_portal_token_expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens IS 'Verwijdert verlopen upload tokens (run via cron)';

-- ============================================================================
-- Klaar! 🚀
-- ============================================================================
-- Run dit script in Supabase SQL Editor:
-- 1. Ga naar je Supabase project
-- 2. Klik op "SQL Editor" in sidebar
-- 3. Maak nieuwe query aan
-- 4. Plak deze hele file
-- 5. Klik "Run"
-- ============================================================================
