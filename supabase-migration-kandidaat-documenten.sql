-- ============================================================================
-- Kandidaat Documenten Migration
-- ============================================================================
-- Documentmodule voor onboarding na eerste intake.
-- Bestanden zelf worden opgeslagen in Supabase Storage; deze tabel bewaart
-- metadata, reviewstatus en notities.
-- ============================================================================

CREATE TABLE IF NOT EXISTS kandidaat_documenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inschrijving_id UUID NOT NULL REFERENCES inschrijvingen(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  bestandsnaam TEXT NOT NULL,
  bestand_pad TEXT NOT NULL,
  mime_type TEXT,
  bestand_grootte BIGINT,
  status TEXT NOT NULL DEFAULT 'ontvangen',
  notitie TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kandidaat_documenten
DROP CONSTRAINT IF EXISTS kandidaat_documenten_status_check;

ALTER TABLE kandidaat_documenten
ADD CONSTRAINT kandidaat_documenten_status_check
CHECK (status IN ('ontvangen', 'goedgekeurd', 'afgekeurd'));

CREATE INDEX IF NOT EXISTS idx_kandidaat_documenten_inschrijving_id
ON kandidaat_documenten(inschrijving_id);

CREATE INDEX IF NOT EXISTS idx_kandidaat_documenten_status
ON kandidaat_documenten(status);
