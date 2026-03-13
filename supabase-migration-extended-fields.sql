-- Uitbreiding medewerkers tabel
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS has_drivers_license BOOLEAN DEFAULT FALSE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS has_own_transport BOOLEAN DEFAULT FALSE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS shirt_size TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS emergency_contact_naam TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS emergency_contact_telefoon TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS emergency_contact_relatie TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS notes_admin TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Uitbreiding klanten tabel
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'restaurant' CHECK (type IN ('restaurant', 'hotel', 'catering', 'evenement', 'overig'));
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC(8,2);
