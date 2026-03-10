-- ============================================================================
-- Inschrijvingen Onboarding Checklist Migration
-- ============================================================================
-- Voeg een eenvoudige JSONB-checklist toe aan inschrijvingen voor de interne
-- onboarding-MVP.
-- ============================================================================

ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{}'::jsonb;

UPDATE inschrijvingen
SET onboarding_checklist = '{}'::jsonb
WHERE onboarding_checklist IS NULL;
