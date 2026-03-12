-- AI Matching & Agents: Database migraties
-- Voer deze SQL uit in de Supabase SQL Editor

-- 1. AI Screening kolommen op inschrijvingen tabel
ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS ai_screening_score integer,
ADD COLUMN IF NOT EXISTS ai_screening_notes text,
ADD COLUMN IF NOT EXISTS ai_screening_date timestamptz;

-- 2. AI Response kolommen op personeel_aanvragen tabel
ALTER TABLE personeel_aanvragen
ADD COLUMN IF NOT EXISTS ai_response_draft text,
ADD COLUMN IF NOT EXISTS ai_response_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_response_sent_at timestamptz;
