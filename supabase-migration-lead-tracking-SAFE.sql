-- ============================================================================
-- Lead Source Tracking Migration - SAFE VERSION
-- ============================================================================
-- Deze versie voegt alleen kolommen toe aan bestaande tabellen
-- ============================================================================

-- STAP 1: Voeg tracking kolommen toe aan personeel_aanvragen
-- --------------------------------------------------------
ALTER TABLE personeel_aanvragen
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- STAP 2: Voeg tracking kolommen toe aan contact_berichten
-- --------------------------------------------------------
ALTER TABLE contact_berichten
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- STAP 3: Update bestaande records naar 'website' als lead_source
-- --------------------------------------------------------
UPDATE personeel_aanvragen
SET lead_source = 'website'
WHERE lead_source IS NULL;

UPDATE contact_berichten
SET lead_source = 'website'
WHERE lead_source IS NULL;

-- STAP 4: Maak indexes voor snelle filtering
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_personeel_aanvragen_lead_source
ON personeel_aanvragen(lead_source);

CREATE INDEX IF NOT EXISTS idx_contact_berichten_lead_source
ON contact_berichten(lead_source);

CREATE INDEX IF NOT EXISTS idx_personeel_aanvragen_campaign_name
ON personeel_aanvragen(campaign_name)
WHERE campaign_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_berichten_campaign_name
ON contact_berichten(campaign_name)
WHERE campaign_name IS NOT NULL;

-- ============================================================================
-- KLAAR! De migratie is voltooid voor de actieve formulieren:
-- ✅ personeel_aanvragen
-- ✅ contact_berichten
-- ============================================================================
