-- Performance indexes for frequently queried columns
-- Run this in Supabase SQL editor

-- Inschrijvingen email lookup (used in login, beschikbaarheid, token validation)
CREATE INDEX IF NOT EXISTS idx_inschrijvingen_email ON inschrijvingen(email);

-- Medewerkers email lookup (used in login, session verification)
CREATE INDEX IF NOT EXISTS idx_medewerkers_email ON medewerkers(email);

-- Medewerkers status filter (used in stats, admin views)
CREATE INDEX IF NOT EXISTS idx_medewerkers_status ON medewerkers(status);

-- Facturen status filter (used in cron herinneringen, stats)
CREATE INDEX IF NOT EXISTS idx_facturen_status ON facturen(status);
