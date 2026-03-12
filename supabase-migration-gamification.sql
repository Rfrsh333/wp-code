-- ============================================
-- MEDEWERKER GAMIFICATION MIGRATIE
-- TopTalent Jobs - Badge systeem & uitgebreide beoordelingen
-- ============================================

-- Gamification velden op medewerkers
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS badge VARCHAR(20) DEFAULT 'starter';
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS totaal_diensten INTEGER DEFAULT 0;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS bonus_eligible BOOLEAN DEFAULT false;

-- Uitbreiding beoordelingen met categorie-scores
ALTER TABLE beoordelingen ADD COLUMN IF NOT EXISTS score_punctualiteit INTEGER;
ALTER TABLE beoordelingen ADD COLUMN IF NOT EXISTS score_professionaliteit INTEGER;
ALTER TABLE beoordelingen ADD COLUMN IF NOT EXISTS score_vaardigheden INTEGER;
ALTER TABLE beoordelingen ADD COLUMN IF NOT EXISTS score_communicatie INTEGER;
ALTER TABLE beoordelingen ADD COLUMN IF NOT EXISTS zou_opnieuw_boeken BOOLEAN;

-- Indexen
CREATE INDEX IF NOT EXISTS idx_medewerkers_badge ON medewerkers(badge);
CREATE INDEX IF NOT EXISTS idx_medewerkers_totaal_diensten ON medewerkers(totaal_diensten);
CREATE INDEX IF NOT EXISTS idx_beoordelingen_medewerker ON beoordelingen(medewerker_id);
