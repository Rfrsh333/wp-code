-- Add qr_verplicht column to klanten table
-- When false, medewerkers can submit hours without QR check-in
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS qr_verplicht BOOLEAN DEFAULT true;
