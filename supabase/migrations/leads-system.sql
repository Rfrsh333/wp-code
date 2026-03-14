-- Social Lead Capture System
-- Run this SQL in your Supabase SQL Editor

-- Leads tabel
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  naam TEXT NOT NULL,
  bedrijf TEXT,
  functie TEXT,
  telefoon TEXT,
  email TEXT,

  stad TEXT,
  regio TEXT,

  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'instagram', 'google', 'website', 'handmatig')),
  bron_url TEXT,
  bron_naam TEXT,

  status TEXT NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'benaderd', 'in_gesprek', 'geplaatst', 'archief', 'niet_interested')),
  prioriteit TEXT DEFAULT 'normaal' CHECK (prioriteit IN ('laag', 'normaal', 'hoog')),

  notities TEXT,
  tags TEXT[],

  laatste_contact TIMESTAMPTZ,
  volgende_actie TIMESTAMPTZ,
  aantal_contactpogingen INT DEFAULT 0,

  aangemaakt_door UUID REFERENCES auth.users(id),
  toegewezen_aan UUID REFERENCES auth.users(id)
);

-- Outreach log
CREATE TABLE IF NOT EXISTS lead_outreach (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  kanaal TEXT NOT NULL CHECK (kanaal IN ('whatsapp', 'email', 'telefoon', 'linkedin', 'facebook')),
  richting TEXT NOT NULL CHECK (richting IN ('uitgaand', 'inkomend')),
  bericht TEXT,
  template_naam TEXT,

  verstuurd_door UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'verstuurd' CHECK (status IN ('verstuurd', 'afgeleverd', 'gelezen', 'beantwoord', 'mislukt'))
);

-- Message templates
CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  naam TEXT NOT NULL,
  kanaal TEXT NOT NULL CHECK (kanaal IN ('whatsapp', 'email')),
  onderwerp TEXT,
  bericht TEXT NOT NULL,

  aantal_gebruikt INT DEFAULT 0,
  is_actief BOOLEAN DEFAULT TRUE,

  aangemaakt_door UUID REFERENCES auth.users(id),

  UNIQUE(naam, kanaal)
);

-- RLS policies (fix #7 - echte beveiliging ipv USING(true))
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins kunnen leads zien" ON leads;
DROP POLICY IF EXISTS "Admins kunnen outreach zien" ON lead_outreach;
DROP POLICY IF EXISTS "Admins kunnen templates beheren" ON outreach_templates;
DROP POLICY IF EXISTS "Service role full access leads" ON leads;
DROP POLICY IF EXISTS "Service role full access outreach" ON lead_outreach;
DROP POLICY IF EXISTS "Service role full access templates" ON outreach_templates;

-- Alleen service_role (backend) heeft toegang
-- De API routes gebruiken supabaseAdmin (service role) die RLS bypast
-- Voor extra veiligheid: blokkeer directe client-side access
CREATE POLICY "Service role full access leads" ON leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access outreach" ON lead_outreach
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access templates" ON outreach_templates
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS leads_platform_idx ON leads(platform);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_telefoon_idx ON leads(telefoon) WHERE telefoon IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_outreach_lead_id_idx ON lead_outreach(lead_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper function: atomic increment template usage (fix #16 race condition)
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE outreach_templates
  SET aantal_gebruikt = aantal_gebruikt + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default templates
INSERT INTO outreach_templates (naam, kanaal, bericht, is_actief) VALUES
  ('Kandidaat - Eerste Contact', 'whatsapp', 'Hoi {{naam}}!

Ik zag je bericht op {{bron_naam}}. TopTalent kan je helpen met horeca vacatures in {{stad}}.

Heb je 5 minuten voor een gesprek deze week?

Met vriendelijke groet,
TopTalent Jobs', true),

  ('Werkgever - Intro', 'whatsapp', 'Dag {{naam}},

TopTalent is gespecialiseerd in horeca personeel voor {{stad}} en omgeving.

We kunnen je helpen met {{functie}} vacatures. Zullen we even kennismaken?

Groet,
TopTalent Jobs', true),

  ('Follow-up na 3 dagen', 'whatsapp', 'Hoi {{naam}},

Ik stuurde je eerder een bericht over horeca werk in {{stad}}.

Heb je al een moment om te bellen?

TopTalent Jobs', true),

  ('Email - Kandidaat Intro', 'email', 'Hallo {{naam}},

Bedankt voor je interesse in horeca werk!

TopTalent heeft regelmatig vacatures als {{functie}} in {{stad}}.

Kunnen we een korte kennismaking inplannen?

Met vriendelijke groet,
TopTalent Jobs
www.toptalentjobs.nl', true)
ON CONFLICT (naam, kanaal) DO NOTHING;
