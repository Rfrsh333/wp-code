-- Lead Lists tabel
CREATE TABLE IF NOT EXISTS crm_lead_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  source text NOT NULL CHECK (source IN (
    'restaurant_import','google_maps','personeel_aanvragen',
    'calculator','manual','instantly','other'
  )),
  city text,
  imported_file_name text,
  lead_count integer DEFAULT 0,
  contacted_count integer DEFAULT 0,
  replied_count integer DEFAULT 0,
  interested_count integer DEFAULT 0,
  customer_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz
);

-- Nieuwe kolommen op crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS lead_list_id uuid REFERENCES crm_lead_lists(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source_reference_id text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_list_id ON crm_leads(lead_list_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source_type ON crm_leads(source_type);
CREATE INDEX IF NOT EXISTS idx_crm_lead_lists_source_created ON crm_lead_lists(source, created_at);

-- Default lijst voor bestaande leads
INSERT INTO crm_lead_lists (name, source, description)
VALUES ('Bestaande restaurant leads', 'restaurant_import', 'Automatisch aangemaakt bij migratie');

-- Koppel bestaande leads aan default lijst
UPDATE crm_leads SET lead_list_id = (
  SELECT id FROM crm_lead_lists WHERE name = 'Bestaande restaurant leads' LIMIT 1
) WHERE lead_list_id IS NULL;

-- RLS
ALTER TABLE crm_lead_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on crm_lead_lists"
  ON crm_lead_lists FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Extend crm_contact_logs voor undo
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS action_key text;
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS previous_state jsonb;
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS new_state jsonb;
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS is_reverted boolean DEFAULT false;
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS reverted_at timestamptz;
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS reverted_by uuid;
ALTER TABLE crm_contact_logs ADD COLUMN IF NOT EXISTS revert_reason text;
