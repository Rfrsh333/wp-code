-- ============================================================================
-- Kandidaat Email Flow Migration
-- ============================================================================
-- Ondersteunt automatische onboarding-mails en een veilige kandidaat-uploadlink.
-- ============================================================================

ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS onboarding_portal_token TEXT,
ADD COLUMN IF NOT EXISTS onboarding_portal_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intake_bevestiging_verstuurd_op TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS documenten_verzoek_verstuurd_op TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS welkom_mail_verstuurd_op TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inschrijvingen_onboarding_portal_token
ON inschrijvingen(onboarding_portal_token)
WHERE onboarding_portal_token IS NOT NULL;
