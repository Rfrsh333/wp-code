-- ===========================================
-- RESTAURANT CRM + SALES COCKPIT
-- Dedicated CRM voor restaurant-leads met multi-channel outreach
-- Kanalen: Cold calling, Cold email (Instantly), Instagram/Facebook DM
-- ===========================================

-- ===========================================
-- HOOFDTABEL: crm_leads
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  google_maps_url TEXT,
  category TEXT DEFAULT 'restaurant',
  rating NUMERIC(2,1),
  review_count INTEGER,
  status TEXT NOT NULL DEFAULT 'nieuw' CHECK (status IN (
    'nieuw', 'te_bellen', 'gebeld_geen_gehoor', 'terugbellen',
    'voicemail', 'email_gestuurd', 'dm_gestuurd', 'in_gesprek',
    'offerte_gestuurd', 'gewonnen', 'verloren', 'niet_bereikbaar',
    'geen_interesse', 'al_klant', 'geparkeerd'
  )),
  priority TEXT NOT NULL DEFAULT 'normaal' CHECK (priority IN (
    'laag', 'normaal', 'hoog', 'urgent'
  )),
  source TEXT DEFAULT 'google_maps',
  contact_person TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Channel availability (auto-set based on data)
  phone_available BOOLEAN DEFAULT false,
  email_available BOOLEAN DEFAULT false,
  instagram_available BOOLEAN DEFAULT false,
  facebook_available BOOLEAN DEFAULT false,

  -- Outreach tracking
  outreach_status TEXT NOT NULL DEFAULT 'not_started' CHECK (outreach_status IN (
    'not_started', 'in_progress', 'contacted', 'replied', 'interested', 'not_interested', 'converted'
  )),
  next_best_channel TEXT CHECK (next_best_channel IN (
    'phone', 'email', 'instagram', 'facebook', 'none', NULL
  )),

  -- Per-channel last contact timestamps
  last_call_at TIMESTAMPTZ,
  last_email_at TIMESTAMPTZ,
  last_instagram_dm_at TIMESTAMPTZ,
  last_facebook_dm_at TIMESTAMPTZ,

  -- Instantly integration
  instantly_campaign_id TEXT,
  instantly_campaign_name TEXT,
  instantly_email_status TEXT DEFAULT 'not_sent' CHECK (instantly_email_status IN (
    'not_sent', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed', NULL
  )),
  instantly_last_event_at TIMESTAMPTZ,

  -- Contact counters
  call_count INTEGER NOT NULL DEFAULT 0,
  email_count INTEGER NOT NULL DEFAULT 0,
  instagram_dm_count INTEGER NOT NULL DEFAULT 0,
  facebook_dm_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- CONTACTGESCHIEDENIS
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'gebeld', 'geen_gehoor', 'voicemail', 'gesproken', 'email', 'dm_instagram',
    'dm_facebook', 'whatsapp', 'bezoek', 'offerte', 'notitie',
    'instantly_sent', 'instantly_opened', 'instantly_replied', 'instantly_bounced'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- FOLLOW-UPS
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'bellen' CHECK (type IN (
    'bellen', 'email', 'dm', 'bezoek', 'offerte', 'anders'
  )),
  status TEXT NOT NULL DEFAULT 'gepland' CHECK (status IN (
    'gepland', 'voltooid', 'overgeslagen', 'verzet'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- NOTITIES
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- TAGS
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- LEAD-TAGS KOPPELTABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_lead_tags (
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_city ON crm_leads(city);
CREATE INDEX IF NOT EXISTS idx_crm_leads_priority ON crm_leads(priority);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_followup ON crm_leads(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_google_maps ON crm_leads(google_maps_url);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_city ON crm_leads(company_name, city);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_archived ON crm_leads(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_outreach ON crm_leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_channel ON crm_leads(next_best_channel);
CREATE INDEX IF NOT EXISTS idx_crm_leads_instantly ON crm_leads(instantly_email_status);

CREATE INDEX IF NOT EXISTS idx_crm_contact_logs_lead ON crm_contact_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_logs_created ON crm_contact_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contact_logs_type ON crm_contact_logs(type);

CREATE INDEX IF NOT EXISTS idx_crm_followups_lead ON crm_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_followups_scheduled ON crm_followups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_crm_followups_status ON crm_followups(status) WHERE status = 'gepland';

CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_lead ON crm_lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_tag ON crm_lead_tags(tag_id);

-- ===========================================
-- AUTO-UPDATE TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_crm_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_leads_updated_at ON crm_leads;
CREATE TRIGGER trg_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_leads_updated_at();

-- ===========================================
-- AUTO-SET CHANNEL AVAILABILITY TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_crm_leads_availability()
RETURNS TRIGGER AS $$
BEGIN
  NEW.phone_available = (NEW.phone IS NOT NULL AND NEW.phone != '');
  NEW.email_available = (NEW.email IS NOT NULL AND NEW.email != '');
  NEW.instagram_available = (NEW.instagram_url IS NOT NULL AND NEW.instagram_url != '');
  NEW.facebook_available = (NEW.facebook_url IS NOT NULL AND NEW.facebook_url != '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_leads_availability ON crm_leads;
CREATE TRIGGER trg_crm_leads_availability
  BEFORE INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_leads_availability();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_crm_leads" ON crm_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_crm_contact_logs" ON crm_contact_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_crm_followups" ON crm_followups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_crm_notes" ON crm_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_crm_tags" ON crm_tags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_crm_lead_tags" ON crm_lead_tags FOR ALL TO service_role USING (true) WITH CHECK (true);
