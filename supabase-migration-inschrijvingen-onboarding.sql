-- ============================================================================
-- Inschrijvingen Onboarding Migration
-- ============================================================================
-- Voeg onboarding-velden toe aan inschrijvingen zodat kandidaten intern door
-- een duidelijke pipeline kunnen worden beheerd voordat TopTalent Hub
-- geactiveerd wordt.
-- ============================================================================

ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'nieuw',
ADD COLUMN IF NOT EXISTS documenten_compleet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interne_notitie TEXT,
ADD COLUMN IF NOT EXISTS laatste_contact_op TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS goedgekeurd_op TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS inzetbaar_op TIMESTAMPTZ;

ALTER TABLE inschrijvingen
DROP CONSTRAINT IF EXISTS inschrijvingen_onboarding_status_check;

ALTER TABLE inschrijvingen
ADD CONSTRAINT inschrijvingen_onboarding_status_check
CHECK (
  onboarding_status IN (
    'nieuw',
    'in_beoordeling',
    'documenten_opvragen',
    'wacht_op_kandidaat',
    'goedgekeurd',
    'inzetbaar',
    'afgewezen'
  )
);

UPDATE inschrijvingen
SET onboarding_status = CASE
  WHEN status = 'in_behandeling' THEN 'in_beoordeling'
  WHEN status = 'afgehandeld' THEN 'goedgekeurd'
  ELSE 'nieuw'
END
WHERE onboarding_status IS NULL;

UPDATE inschrijvingen
SET documenten_compleet = FALSE
WHERE documenten_compleet IS NULL;

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_onboarding_status
ON inschrijvingen(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_documenten_compleet
ON inschrijvingen(documenten_compleet);

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_inzetbaar_op
ON inschrijvingen(inzetbaar_op)
WHERE inzetbaar_op IS NOT NULL;
