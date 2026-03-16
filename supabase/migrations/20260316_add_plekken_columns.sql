-- Migration: Add plekken_totaal and plekken_beschikbaar columns to diensten table
-- Date: 2026-03-16
-- Description: These columns track total spots and available spots for diensten

-- Add columns
ALTER TABLE diensten
ADD COLUMN IF NOT EXISTS plekken_totaal INTEGER,
ADD COLUMN IF NOT EXISTS plekken_beschikbaar INTEGER;

-- Set default values based on existing data
UPDATE diensten
SET
  plekken_totaal = COALESCE(aantal_nodig, 1),
  plekken_beschikbaar = COALESCE(aantal_nodig, 1) - COALESCE((
    SELECT COUNT(*)
    FROM dienst_aanmeldingen
    WHERE dienst_aanmeldingen.dienst_id = diensten.id
    AND dienst_aanmeldingen.status = 'geaccepteerd'
  ), 0)
WHERE plekken_totaal IS NULL;

-- Add comments
COMMENT ON COLUMN diensten.plekken_totaal IS 'Total number of spots available for this shift';
COMMENT ON COLUMN diensten.plekken_beschikbaar IS 'Number of spots still available (updated when aanmeldingen are accepted)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_diensten_plekken_beschikbaar ON diensten(plekken_beschikbaar) WHERE status = 'open';
