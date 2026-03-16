-- Migration: Fix diensten visibility issue
-- Date: 2026-03-16
-- Description: Fix existing diensten that were created by klanten with incorrect functie values

-- Step 1: Set plekken_totaal and plekken_beschikbaar for diensten where they are missing
-- This ensures all diensten have these fields set correctly
UPDATE diensten
SET
  plekken_totaal = COALESCE(plekken_totaal, aantal_nodig, 1),
  plekken_beschikbaar = COALESCE(plekken_beschikbaar, aantal_nodig - (
    SELECT COUNT(*)
    FROM dienst_aanmeldingen
    WHERE dienst_aanmeldingen.dienst_id = diensten.id
    AND dienst_aanmeldingen.status = 'geaccepteerd'
  ), aantal_nodig, 1)
WHERE plekken_totaal IS NULL OR plekken_beschikbaar IS NULL;

-- Step 2: Review diensten with hardcoded "horeca" functie that were created by klanten
-- These need manual review because the actual function name is in the notities field
--
-- Run this query to see which diensten need to be fixed:
--
-- SELECT id, functie, notities, klant_naam, datum, created_at
-- FROM diensten
-- WHERE functie = 'horeca'
-- AND klant_id IS NOT NULL
-- ORDER BY created_at DESC;
--
-- After reviewing the data, you can update individual records or in batch:
-- Examples:
-- UPDATE diensten SET functie = 'bediening' WHERE id = 'uuid-here' AND functie = 'horeca';
-- UPDATE diensten SET functie = 'bar' WHERE id = 'uuid-here' AND functie = 'horeca';
--
-- Or extract from notities (if pattern is consistent):
-- UPDATE diensten
-- SET functie = LOWER(TRIM(SPLIT_PART(notities, ' - ', 1)))
-- WHERE functie = 'horeca'
-- AND klant_id IS NOT NULL
-- AND notities IS NOT NULL
-- AND notities LIKE '% - %';

-- Step 3: Add comment for tracking
COMMENT ON COLUMN diensten.plekken_totaal IS 'Total number of spots available for this shift';
COMMENT ON COLUMN diensten.plekken_beschikbaar IS 'Number of spots still available (not filled by accepted aanmeldingen)';
