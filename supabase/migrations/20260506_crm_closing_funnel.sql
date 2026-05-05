-- CRM Closing Funnel Migration
-- Adds closing funnel statuses, decision maker info, test shifts, and objections

-- 1. Drop and recreate the status CHECK constraint to add new values
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_status_check CHECK (status IN (
  'nieuw', 'te_bellen', 'gebeld_geen_gehoor', 'terugbellen', 'voicemail',
  'email_gestuurd', 'dm_gestuurd', 'in_gesprek', 'offerte_gestuurd',
  'gewonnen', 'verloren', 'niet_bereikbaar', 'geen_interesse', 'al_klant', 'geparkeerd',
  -- New closing funnel statuses
  'afspraak_gepland', 'testdienst_ingepland', 'testdienst_afgerond', 'in_onderhandeling', 'klant_geworden'
));

-- 2. Add closing funnel columns to crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS beslisser text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS beslisser_functie text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS beslisser_mobiel text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS personeelsbehoefte text[];
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS urgentie text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS gewenste_startdatum date;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS aantal_mensen integer;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS type_behoefte text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS bezwaren text[];
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS afspraak_datum timestamptz;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS afspraak_notities text;

-- 3. Create test shifts table
CREATE TABLE IF NOT EXISTS crm_test_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_time text,
  shift_role text NOT NULL DEFAULT 'bediening',
  people_count integer NOT NULL DEFAULT 1,
  location text,
  status text NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'bevestigd', 'uitgevoerd', 'geslaagd', 'mislukt', 'geannuleerd')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create objections table
CREATE TABLE IF NOT EXISTS crm_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objection text NOT NULL,
  suggested_response text NOT NULL,
  category text NOT NULL DEFAULT 'algemeen',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Seed objections data
INSERT INTO crm_objections (objection, suggested_response, category) VALUES
  ('We hebben al genoeg personeel', 'Dat is mooi! Maar wat als er iemand ziek wordt of er een drukke periode aankomt? Wij zijn er als back-up, zonder verplichting.', 'personeel'),
  ('Te duur', 'Ik snap het. Maar als je het vergelijkt met omzetverlies door een lege dienst of gasten die je niet kunt bedienen, is het juist een investering. Plus: je betaalt alleen als je ons nodig hebt.', 'prijs'),
  ('We lossen het zelf op', 'Dat hoor ik vaker. Maar hoeveel tijd kost dat? En lukt het altijd? Wij zijn er voor die momenten dat het niet lukt.', 'bezwaar'),
  ('Geen budget', 'We werken zonder vast contract. Je kunt ons proberen met één dienst en kijken of het bevalt. Geen risico.', 'prijs'),
  ('Ik moet het overleggen', 'Helemaal goed. Zal ik je alvast onze info sturen, zodat je het kunt delen? En wanneer kan ik even terugbellen?', 'besluitvorming')
ON CONFLICT DO NOTHING;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_crm_test_shifts_lead_id ON crm_test_shifts(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_test_shifts_status ON crm_test_shifts(status);
CREATE INDEX IF NOT EXISTS idx_crm_test_shifts_date ON crm_test_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_crm_leads_closing_status ON crm_leads(status) WHERE status IN ('afspraak_gepland', 'testdienst_ingepland', 'testdienst_afgerond', 'in_onderhandeling', 'klant_geworden');

-- 7. RLS for test shifts
ALTER TABLE crm_test_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to test shifts" ON crm_test_shifts
  FOR ALL USING (true) WITH CHECK (true);

-- 8. RLS for objections
ALTER TABLE crm_objections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to objections" ON crm_objections
  FOR ALL USING (true) WITH CHECK (true);

-- 9. Updated_at trigger for test shifts
CREATE OR REPLACE FUNCTION update_crm_test_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_test_shifts_updated_at ON crm_test_shifts;
CREATE TRIGGER trg_crm_test_shifts_updated_at
  BEFORE UPDATE ON crm_test_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_test_shifts_updated_at();
