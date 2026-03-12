-- Acquisitie & CRM Systeem: Database migraties
-- Voer deze SQL uit in de Supabase SQL Editor

-- ============================================
-- 1. ACQUISITIE LEADS
-- ============================================
CREATE TABLE IF NOT EXISTS acquisitie_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bedrijfsnaam VARCHAR(255) NOT NULL,
  contactpersoon VARCHAR(255),
  email VARCHAR(255),
  telefoon VARCHAR(50),
  website VARCHAR(500),
  adres TEXT,
  stad VARCHAR(100),
  branche VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  pipeline_stage VARCHAR(50) DEFAULT 'nieuw',
  ai_score INTEGER,
  ai_score_reasoning TEXT,
  bron VARCHAR(50) DEFAULT 'handmatig',
  emails_verzonden_count INTEGER DEFAULT 0,
  laatste_email_verzonden_op TIMESTAMPTZ,
  laatste_email_geopend_op TIMESTAMPTZ,
  laatste_contact_datum TIMESTAMPTZ,
  laatste_contact_type VARCHAR(50),
  volgende_actie_datum DATE,
  volgende_actie_notitie TEXT,
  pain_points JSONB DEFAULT '{}',
  personalisatie_notities TEXT,
  interne_notities TEXT,
  klant_id UUID,
  geconverteerd_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT acquisitie_leads_email_unique UNIQUE (email),
  CONSTRAINT acquisitie_leads_pipeline_stage_check CHECK (
    pipeline_stage IN ('nieuw', 'benaderd', 'interesse', 'offerte', 'klant', 'afgewezen')
  ),
  CONSTRAINT acquisitie_leads_bron_check CHECK (
    bron IN ('google_maps', 'csv_import', 'handmatig', 'website')
  ),
  CONSTRAINT acquisitie_leads_ai_score_check CHECK (
    ai_score IS NULL OR (ai_score >= 1 AND ai_score <= 100)
  )
);

-- Indexes voor acquisitie_leads
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_pipeline ON acquisitie_leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_stad ON acquisitie_leads(stad);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_branche ON acquisitie_leads(branche);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_ai_score ON acquisitie_leads(ai_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_volgende_actie ON acquisitie_leads(volgende_actie_datum);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_bron ON acquisitie_leads(bron);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_created ON acquisitie_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_bedrijfsnaam ON acquisitie_leads(bedrijfsnaam);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_acquisitie_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_acquisitie_leads_updated_at
  BEFORE UPDATE ON acquisitie_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_acquisitie_updated_at();

-- ============================================
-- 2. ACQUISITIE CONTACTMOMENTEN
-- ============================================
CREATE TABLE IF NOT EXISTS acquisitie_contactmomenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES acquisitie_leads(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  richting VARCHAR(20) NOT NULL,
  onderwerp VARCHAR(255),
  inhoud TEXT,
  resultaat VARCHAR(50),
  email_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT contactmomenten_type_check CHECK (
    type IN ('email', 'telefoon', 'whatsapp', 'bezoek')
  ),
  CONSTRAINT contactmomenten_richting_check CHECK (
    richting IN ('uitgaand', 'inkomend')
  ),
  CONSTRAINT contactmomenten_resultaat_check CHECK (
    resultaat IS NULL OR resultaat IN ('positief', 'neutraal', 'negatief', 'geen_antwoord', 'voicemail')
  )
);

CREATE INDEX IF NOT EXISTS idx_contactmomenten_lead ON acquisitie_contactmomenten(lead_id);
CREATE INDEX IF NOT EXISTS idx_contactmomenten_created ON acquisitie_contactmomenten(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contactmomenten_type ON acquisitie_contactmomenten(type);

-- ============================================
-- 3. ACQUISITIE CAMPAGNES
-- ============================================
CREATE TABLE IF NOT EXISTS acquisitie_campagnes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'concept',
  onderwerp_template TEXT,
  inhoud_template TEXT,
  target_filters JSONB DEFAULT '{}',
  is_drip_campaign BOOLEAN DEFAULT false,
  drip_sequence JSONB DEFAULT '[]',
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT campagnes_status_check CHECK (
    status IN ('concept', 'actief', 'gepauzeerd', 'afgerond')
  )
);

CREATE INDEX IF NOT EXISTS idx_campagnes_status ON acquisitie_campagnes(status);
CREATE INDEX IF NOT EXISTS idx_campagnes_created ON acquisitie_campagnes(created_at DESC);

CREATE OR REPLACE TRIGGER trigger_acquisitie_campagnes_updated_at
  BEFORE UPDATE ON acquisitie_campagnes
  FOR EACH ROW
  EXECUTE FUNCTION update_acquisitie_updated_at();

-- ============================================
-- 4. ACQUISITIE CAMPAGNE LEADS
-- ============================================
CREATE TABLE IF NOT EXISTS acquisitie_campagne_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id UUID NOT NULL REFERENCES acquisitie_campagnes(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES acquisitie_leads(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'queued',
  current_drip_step INTEGER DEFAULT 0,
  next_send_date DATE,
  emails_sent_count INTEGER DEFAULT 0,

  CONSTRAINT campagne_leads_status_check CHECK (
    status IN ('queued', 'sent', 'opened', 'clicked', 'replied')
  ),
  CONSTRAINT campagne_leads_unique UNIQUE (campagne_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_campagne_leads_campagne ON acquisitie_campagne_leads(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagne_leads_lead ON acquisitie_campagne_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_campagne_leads_next_send ON acquisitie_campagne_leads(next_send_date);
CREATE INDEX IF NOT EXISTS idx_campagne_leads_status ON acquisitie_campagne_leads(status);

-- ============================================
-- RLS Policies (admin only via service role)
-- ============================================
ALTER TABLE acquisitie_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitie_contactmomenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitie_campagnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitie_campagne_leads ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no policies needed for admin access
