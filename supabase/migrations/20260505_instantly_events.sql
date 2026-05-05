-- Instantly.ai CRM Integratie: Events, idempotency & uitgebreide statussen
-- ==========================================================================

-- 1. Extend instantly_email_status CHECK constraint met 'clicked' en 'auto_reply'
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_instantly_email_status_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_instantly_email_status_check
  CHECK (instantly_email_status IN ('not_sent', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed', 'clicked', 'auto_reply'));

-- 2. Nieuwe kolommen op crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS instantly_lead_id text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS instantly_last_reply_at timestamptz;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS instantly_last_reply_text text;

-- 3. Nieuwe tabel voor event logging + idempotency
CREATE TABLE IF NOT EXISTS crm_instantly_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  campaign_id text,
  payload jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_instantly_events_event_id ON crm_instantly_events(event_id);
CREATE INDEX IF NOT EXISTS idx_crm_instantly_events_lead_id ON crm_instantly_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_instantly_events_created_at ON crm_instantly_events(created_at);

-- 4. Extend contact_log type CHECK met nieuwe Instantly types
ALTER TABLE crm_contact_logs DROP CONSTRAINT IF EXISTS crm_contact_logs_type_check;
ALTER TABLE crm_contact_logs ADD CONSTRAINT crm_contact_logs_type_check
  CHECK (type IN (
    'gebeld', 'geen_gehoor', 'voicemail', 'gesproken',
    'email', 'dm_instagram', 'dm_facebook', 'whatsapp', 'bezoek',
    'offerte', 'notitie',
    'instantly_sent', 'instantly_opened', 'instantly_replied', 'instantly_bounced',
    'instantly_clicked', 'instantly_auto_reply', 'instantly_unsubscribed', 'instantly_link_clicked'
  ));

-- 5. RLS: service_role only voor crm_instantly_events
ALTER TABLE crm_instantly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on crm_instantly_events"
  ON crm_instantly_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
