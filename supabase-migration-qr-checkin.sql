-- QR Check-in Systeem: voeg check_in_at toe aan dienst_aanmeldingen
-- Klanten kunnen medewerkers inchecken door hun QR-code te scannen bij aankomst

-- Kolom toevoegen (NULL = niet ingecheckt)
ALTER TABLE dienst_aanmeldingen
ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ DEFAULT NULL;

-- Index voor snelle lookups op check-in status
CREATE INDEX IF NOT EXISTS idx_dienst_aanmeldingen_check_in_at
ON dienst_aanmeldingen (check_in_at)
WHERE check_in_at IS NOT NULL;

-- Commentaar
COMMENT ON COLUMN dienst_aanmeldingen.check_in_at IS 'Tijdstip waarop medewerker is ingecheckt via QR-scan door klant';
