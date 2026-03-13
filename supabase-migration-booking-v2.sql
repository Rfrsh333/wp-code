-- ============================================
-- Migratie: Booking Systeem V2 (Calendly-level)
-- Datum: 2026-03-13
-- ============================================

-- ============================================
-- 1. Event Types
-- ============================================
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
  color TEXT NOT NULL DEFAULT '#F27501',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_bookings_per_day INTEGER,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  confirmation_message TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default event types
INSERT INTO event_types (name, slug, description, duration_minutes, color, sort_order) VALUES
  ('Kennismakingsgesprek', 'kennismaking', 'Vrijblijvend kennismakingsgesprek over de mogelijkheden voor horecapersoneel.', 60, '#F27501', 0),
  ('Intakegesprek', 'intake', 'Uitgebreid gesprek om de personeelsbehoefte in kaart te brengen.', 90, '#2563EB', 1),
  ('Kort overleg', 'overleg', 'Kort telefonisch overleg of videocall.', 30, '#16A34A', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. Availability Schedules (weekly pattern)
-- ============================================
CREATE TABLE IF NOT EXISTS availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_of_week, start_time)
);

-- Default schedule: ma-vr 09:00-17:00
INSERT INTO availability_schedules (day_of_week, start_time, end_time) VALUES
  (1, '09:00', '17:00'),
  (2, '09:00', '17:00'),
  (3, '09:00', '17:00'),
  (4, '09:00', '17:00'),
  (5, '09:00', '17:00')
ON CONFLICT (day_of_week, start_time) DO NOTHING;

-- ============================================
-- 3. Availability Overrides (specific dates)
-- ============================================
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_blocked BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, start_time)
);

-- ============================================
-- 4. Extend bookings table
-- ============================================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_token TEXT,
ADD COLUMN IF NOT EXISTS reschedule_token TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website' CHECK (source IN ('website', 'admin', 'phone', 'email'));

-- Generate tokens for existing bookings
UPDATE bookings SET
  cancellation_token = encode(gen_random_bytes(32), 'hex'),
  reschedule_token = encode(gen_random_bytes(32), 'hex')
WHERE cancellation_token IS NULL;

-- ============================================
-- 5. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_event_types_slug ON event_types(slug);
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(is_active);
CREATE INDEX IF NOT EXISTS idx_availability_schedules_day ON availability_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_date ON availability_overrides(date);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON bookings(cancellation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_token ON bookings(reschedule_token);
CREATE INDEX IF NOT EXISTS idx_bookings_event_type ON bookings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

-- Event types: publiek leesbaar
CREATE POLICY "event_types_public_read" ON event_types
  FOR SELECT USING (true);
CREATE POLICY "event_types_service_all" ON event_types
  FOR ALL USING (auth.role() = 'service_role');

-- Availability schedules: publiek leesbaar
CREATE POLICY "availability_schedules_public_read" ON availability_schedules
  FOR SELECT USING (true);
CREATE POLICY "availability_schedules_service_all" ON availability_schedules
  FOR ALL USING (auth.role() = 'service_role');

-- Availability overrides: publiek leesbaar
CREATE POLICY "availability_overrides_public_read" ON availability_overrides
  FOR SELECT USING (true);
CREATE POLICY "availability_overrides_service_all" ON availability_overrides
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 7. Updated_at triggers
-- ============================================
DROP TRIGGER IF EXISTS event_types_updated_at ON event_types;
CREATE TRIGGER event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
