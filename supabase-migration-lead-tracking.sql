-- ============================================================================
-- Lead Source Tracking Migration
-- ============================================================================
-- Dit script voegt lead tracking kolommen toe aan de lead tables
-- Voer dit uit in je Supabase SQL Editor
-- ============================================================================

-- 1. Voeg tracking kolommen toe aan personeel_aanvragen tabel
ALTER TABLE personeel_aanvragen
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- 2. Voeg tracking kolommen toe aan contact_berichten tabel
ALTER TABLE contact_berichten
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- 3. Voeg tracking kolommen toe aan inschrijvingen tabel
ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- 4. Update bestaande records naar 'website' als lead_source
UPDATE personeel_aanvragen
SET lead_source = 'website'
WHERE lead_source IS NULL;

UPDATE contact_berichten
SET lead_source = 'website'
WHERE lead_source IS NULL;

UPDATE inschrijvingen
SET lead_source = 'website'
WHERE lead_source IS NULL;

-- 5. Maak index voor snelle filtering op lead_source
CREATE INDEX IF NOT EXISTS idx_personeel_aanvragen_lead_source
ON personeel_aanvragen(lead_source);

CREATE INDEX IF NOT EXISTS idx_contact_berichten_lead_source
ON contact_berichten(lead_source);

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_lead_source
ON inschrijvingen(lead_source);

-- 6. Maak index voor filtering op campaign_name
CREATE INDEX IF NOT EXISTS idx_personeel_aanvragen_campaign_name
ON personeel_aanvragen(campaign_name)
WHERE campaign_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_berichten_campaign_name
ON contact_berichten(campaign_name)
WHERE campaign_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_campaign_name
ON inschrijvingen(campaign_name)
WHERE campaign_name IS NOT NULL;

-- ============================================================================
-- Verificatie Query
-- ============================================================================
-- Run deze queries om te controleren of de kolommen succesvol zijn toegevoegd:

-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'personeel_aanvragen'
-- AND column_name IN ('lead_source', 'campaign_name', 'utm_source', 'utm_medium', 'utm_campaign');

-- ============================================================================
-- Test Query - Bekijk leads per bron
-- ============================================================================
-- SELECT
--   lead_source,
--   campaign_name,
--   COUNT(*) as aantal_leads,
--   MIN(created_at) as eerste_lead,
--   MAX(created_at) as laatste_lead
-- FROM personeel_aanvragen
-- GROUP BY lead_source, campaign_name
-- ORDER BY aantal_leads DESC;
