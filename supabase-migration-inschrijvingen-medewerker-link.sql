-- ============================================================================
-- Inschrijvingen -> Medewerker Link Migration
-- ============================================================================
-- Koppelt een onboardde kandidaat aan een echt medewerkerprofiel zodra die
-- kandidaat operationeel actief wordt.
-- ============================================================================

ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS medewerker_id UUID REFERENCES medewerkers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_medewerker_id
ON inschrijvingen(medewerker_id)
WHERE medewerker_id IS NOT NULL;
