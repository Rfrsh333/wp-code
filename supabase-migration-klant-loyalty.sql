-- ============================================
-- KLANT LOYALTY & FORECAST MIGRATIE
-- TopTalent Jobs - Klant analytics, churn detectie, loyalty tiers
-- ============================================

-- Loyalty & analytics velden op klanten
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'standaard';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS totaal_diensten INTEGER DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS totaal_omzet DECIMAL(10,2) DEFAULT 0;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS laatste_dienst_datum DATE;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS churn_risico VARCHAR(20) DEFAULT 'laag';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS notities TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS gemiddelde_beoordeling DECIMAL(3,1) DEFAULT 0;

-- Indexen
CREATE INDEX IF NOT EXISTS idx_klanten_loyalty_tier ON klanten(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_klanten_churn_risico ON klanten(churn_risico);
CREATE INDEX IF NOT EXISTS idx_klanten_laatste_dienst ON klanten(laatste_dienst_datum);
CREATE INDEX IF NOT EXISTS idx_diensten_klant_id ON diensten(klant_id);
CREATE INDEX IF NOT EXISTS idx_diensten_datum ON diensten(datum);
