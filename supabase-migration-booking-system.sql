-- Migratie: Booking & Agenda systeem
-- Datum: 2026-03-13
-- Vervangt: supabase-migration-afspraken.sql

-- ============================================
-- 1. Opruimen oude tabellen (als ze bestaan)
-- ============================================
DROP TABLE IF EXISTS afspraken CASCADE;
DROP TABLE IF EXISTS beschikbaarheid CASCADE;

-- ============================================
-- 2. Tabel: availability_slots
-- ============================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, start_time)
);

-- ============================================
-- 3. Tabel: bookings
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES personeel_aanvragen(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  company_name TEXT,
  notes TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  google_calendar_event_id TEXT,
  confirmation_email_sent BOOLEAN DEFAULT false,
  reminder_email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Tabel: admin_settings
-- ============================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);

-- Default instellingen
INSERT INTO admin_settings (key, value) VALUES
  ('sender_email', 'info@toptalentjobs.nl'),
  ('sender_name', 'TopTalent Jobs'),
  ('slot_duration_minutes', '30'),
  ('booking_horizon_days', '14'),
  ('booking_page_intro_text', 'Plan een vrijblijvend kennismakingsgesprek met TopTalent Jobs. We bespreken graag de mogelijkheden voor jouw horecapersoneel.'),
  ('auto_reply_enabled', 'true'),
  ('default_start_time', '09:00'),
  ('default_end_time', '17:00'),
  ('working_days', '1,2,3,4,5')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 5. Extra kolommen op personeel_aanvragen
-- ============================================
ALTER TABLE personeel_aanvragen
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reply_email_id TEXT,
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Verwijder oude kolommen als ze bestaan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personeel_aanvragen' AND column_name = 'reactie_verstuurd_op') THEN
    ALTER TABLE personeel_aanvragen DROP COLUMN reactie_verstuurd_op;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personeel_aanvragen' AND column_name = 'reactie_email_id') THEN
    ALTER TABLE personeel_aanvragen DROP COLUMN reactie_email_id;
  END IF;
END $$;

-- ============================================
-- 6. Indexen
-- ============================================
CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_available ON availability_slots(date, is_available, is_booked);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_inquiry_id ON bookings(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- ============================================
-- 7. RLS Policies
-- ============================================
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Availability slots: publiek leesbaar (voor booking pagina)
CREATE POLICY "availability_slots_public_read" ON availability_slots
  FOR SELECT USING (true);

-- Availability slots: service role kan alles
CREATE POLICY "availability_slots_service_all" ON availability_slots
  FOR ALL USING (auth.role() = 'service_role');

-- Bookings: publiek insert (voor booking via formulier)
CREATE POLICY "bookings_public_insert" ON bookings
  FOR INSERT WITH CHECK (true);

-- Bookings: publiek leesbaar (voor slot-check)
CREATE POLICY "bookings_public_read" ON bookings
  FOR SELECT USING (true);

-- Bookings: service role kan alles
CREATE POLICY "bookings_service_all" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

-- Admin settings: service role kan alles
CREATE POLICY "admin_settings_service_all" ON admin_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Admin settings: publiek leesbaar (voor booking pagina intro tekst etc.)
CREATE POLICY "admin_settings_public_read" ON admin_settings
  FOR SELECT USING (true);

-- ============================================
-- 8. Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS availability_slots_updated_at ON availability_slots;
CREATE TRIGGER availability_slots_updated_at
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
