-- ============================================================================
-- Inschrijvingen Intake Fields Migration
-- ============================================================================
-- Houd het eerste inschrijfformulier licht, maar sla wel de belangrijkste
-- selectie-informatie op voor intake en onboarding.
-- ============================================================================

ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS horeca_ervaring TEXT,
ADD COLUMN IF NOT EXISTS gewenste_functies TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS talen TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS eigen_vervoer BOOLEAN DEFAULT FALSE;

UPDATE inschrijvingen
SET gewenste_functies = ARRAY[]::TEXT[]
WHERE gewenste_functies IS NULL;

UPDATE inschrijvingen
SET talen = ARRAY[]::TEXT[]
WHERE talen IS NULL;

UPDATE inschrijvingen
SET eigen_vervoer = FALSE
WHERE eigen_vervoer IS NULL;
