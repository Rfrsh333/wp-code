-- Instantly Campaigns & Lead-Campaign junction + Unmatched leads + Merge fields
-- 2026-05-06

-- 1. Local copy of Instantly campaigns with stats
CREATE TABLE IF NOT EXISTS crm_instantly_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instantly_campaign_id text UNIQUE NOT NULL,
  name text NOT NULL,
  status integer DEFAULT 0,
  total_leads integer DEFAULT 0,
  leads_sent integer DEFAULT 0,
  leads_opened integer DEFAULT 0,
  leads_replied integer DEFAULT 0,
  leads_bounced integer DEFAULT 0,
  leads_unsubscribed integer DEFAULT 0,
  leads_clicked integer DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Junction: lead <-> campaign with per-campaign stats
CREATE TABLE IF NOT EXISTS crm_lead_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES crm_instantly_campaigns(id) ON DELETE CASCADE,
  instantly_lead_email text NOT NULL,
  email_status text DEFAULT 'not_sent' CHECK (email_status IN ('not_sent','sent','opened','replied','bounced','unsubscribed','clicked','auto_reply')),
  open_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  last_event_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, campaign_id)
);

-- 3. Unmatched Instantly leads (no CRM match)
CREATE TABLE IF NOT EXISTS crm_unmatched_instantly_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES crm_instantly_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  phone text,
  website text,
  email_status text DEFAULT 'not_sent' CHECK (email_status IN ('not_sent','sent','opened','replied','bounced','unsubscribed','clicked','auto_reply')),
  open_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  resolution text DEFAULT 'pending' CHECK (resolution IN ('pending','matched','created','ignored')),
  matched_lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, email)
);

-- 4. Merge fields on crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES crm_leads(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS merged_at timestamptz;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS is_possible_duplicate boolean DEFAULT false;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS duplicate_reason text;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_crm_instantly_campaigns_status ON crm_instantly_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_lead_campaigns_lead_id ON crm_lead_campaigns(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_campaigns_campaign_id ON crm_lead_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_campaigns_email_status ON crm_lead_campaigns(email_status);
CREATE INDEX IF NOT EXISTS idx_crm_unmatched_leads_campaign_id ON crm_unmatched_instantly_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_unmatched_leads_resolution ON crm_unmatched_instantly_leads(resolution);
CREATE INDEX IF NOT EXISTS idx_crm_unmatched_leads_email ON crm_unmatched_instantly_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_merged_into ON crm_leads(merged_into);
CREATE INDEX IF NOT EXISTS idx_crm_leads_is_possible_duplicate ON crm_leads(is_possible_duplicate) WHERE is_possible_duplicate = true;

-- 6. RLS: service_role only
ALTER TABLE crm_instantly_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_unmatched_instantly_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON crm_instantly_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_lead_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_unmatched_instantly_leads FOR ALL USING (true) WITH CHECK (true);
