-- ============================================================
-- LinkedIn Integratie: tabellen + seed data + indexes
-- ============================================================

-- 1. LinkedIn connecties (OAuth tokens)
CREATE TABLE IF NOT EXISTS linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  linkedin_person_id VARCHAR(100) NOT NULL,
  organization_id VARCHAR(100),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  profile_name VARCHAR(255),
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email)
);

-- 2. LinkedIn posts queue
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_post_id UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  template_id UUID,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed')),
  post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'link', 'image', 'article')),
  content TEXT NOT NULL,
  link_url TEXT,
  image_url TEXT,
  hashtags TEXT[],
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  linkedin_post_urn VARCHAR(255),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  -- Analytics (bijgewerkt door cron)
  impressions INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  analytics_updated_at TIMESTAMPTZ,
  -- Meta
  created_by VARCHAR(255),
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. LinkedIn post templates
CREATE TABLE IF NOT EXISTS linkedin_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(100) NOT NULL,
  categorie VARCHAR(30) NOT NULL CHECK (categorie IN ('mijlpaal', 'tip', 'case_study', 'seizoen', 'vacature', 'nieuws', 'engagement', 'behind_the_scenes')),
  template TEXT NOT NULL,
  variabelen TEXT[] DEFAULT '{}',
  voorbeeld TEXT,
  is_active BOOLEAN DEFAULT true,
  gebruik_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_status ON linkedin_posts(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_scheduled ON linkedin_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_published ON linkedin_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_content_post ON linkedin_posts(content_post_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_templates_categorie ON linkedin_templates(categorie);
CREATE INDEX IF NOT EXISTS idx_linkedin_templates_active ON linkedin_templates(is_active) WHERE is_active = true;

-- ============================================================
-- Seed: 20 LinkedIn post templates
-- ============================================================

INSERT INTO linkedin_templates (naam, categorie, template, variabelen, voorbeeld) VALUES

-- Mijlpaal (3)
('Nieuwe mijlpaal', 'mijlpaal',
 E'{{emoji}} Wat een maand! {{mijlpaal}}\n\nDit hadden we niet kunnen doen zonder ons geweldige team van horecaprofessionals.\n\n{{detail}}\n\nOp naar de volgende! 🚀\n\n#TopTalentJobs #Horeca #Mijlpaal',
 ARRAY['emoji', 'mijlpaal', 'detail'],
 E'🎉 Wat een maand! 500 shifts succesvol ingevuld in Utrecht.\n\nDit hadden we niet kunnen doen zonder ons geweldige team van horecaprofessionals.\n\nVan drukke terrasweekenden tot exclusieve events — onze mensen stonden er.\n\nOp naar de volgende! 🚀'),

('Jaarcijfers delen', 'mijlpaal',
 E'{{jaar}} in cijfers voor TopTalent Jobs:\n\n📊 {{cijfer_1}}\n📊 {{cijfer_2}}\n📊 {{cijfer_3}}\n\n{{reflectie}}\n\nBedankt aan iedereen die dit mogelijk maakt.\n\n#Horeca #Uitzendbureau #Terugblik',
 ARRAY['jaar', 'cijfer_1', 'cijfer_2', 'cijfer_3', 'reflectie'],
 NULL),

('Klant mijlpaal', 'mijlpaal',
 E'Trots moment 🙌\n\n{{klant_verhaal}}\n\nDit is waarom we doen wat we doen. Goede mensen op de juiste plek.\n\n#TopTalentJobs #Horeca #Samenwerking',
 ARRAY['klant_verhaal'],
 NULL),

-- Tip (4)
('Horeca tip', 'tip',
 E'💡 Horeca tip van de week\n\n{{tip_titel}}\n\n{{tip_uitleg}}\n\nHeb jij hier ervaring mee? Laat het weten in de comments 👇\n\n#HorecaTips #Personeel #TopTalentJobs',
 ARRAY['tip_titel', 'tip_uitleg'],
 E'💡 Horeca tip van de week\n\nZo voorkom je no-shows bij uitzendkrachten\n\n3 dingen die écht werken:\n1. Persoonlijk contact de dag ervoor\n2. Duidelijke briefing met adres + dresscode\n3. Een warm welkom bij aankomst\n\nHeb jij hier ervaring mee?'),

('Werkgever tip', 'tip',
 E'{{emoji}} Tip voor horecaondernemers\n\n{{tip}}\n\n{{onderbouwing}}\n\nMeer weten? Link in comments of DM ons.\n\n#Horeca #Ondernemen #Personeel',
 ARRAY['emoji', 'tip', 'onderbouwing'],
 NULL),

('Werknemer tip', 'tip',
 E'Werk je in de horeca? Dit wil je weten 👇\n\n{{tip}}\n\n{{extra}}\n\nDeel dit met een collega die dit kan gebruiken!\n\n#HorecaWerk #CarrièreTip #TopTalentJobs',
 ARRAY['tip', 'extra'],
 NULL),

('Cijfer van de week', 'tip',
 E'📊 Wist je dat...\n\n{{feit}}\n\n{{duiding}}\n\nWat herken jij hiervan?\n\n#Horeca #Feiten #Arbeidsmarkt',
 ARRAY['feit', 'duiding'],
 NULL),

-- Case study (3)
('Succesverhaal kort', 'case_study',
 E'Van aanvraag tot ingevulde shift in {{uren}} uur ⚡\n\n{{situatie}}\n\n{{oplossing}}\n\n{{resultaat}}\n\nDit is hoe wij werken. Snel, persoonlijk, betrouwbaar.\n\n#TopTalentJobs #Horeca #CaseStudy',
 ARRAY['uren', 'situatie', 'oplossing', 'resultaat'],
 NULL),

('Klant spotlight', 'case_study',
 E'Klant spotlight 🔦\n\n{{intro}}\n\nDe uitdaging: {{uitdaging}}\nOnze aanpak: {{aanpak}}\nHet resultaat: {{resultaat}}\n\n"{{quote}}" — {{naam}}\n\n#Horeca #Samenwerking #TopTalentJobs',
 ARRAY['intro', 'uitdaging', 'aanpak', 'resultaat', 'quote', 'naam'],
 NULL),

('Medewerker verhaal', 'case_study',
 E'{{naam}} begon als uitzendkracht, en nu...\n\n{{verhaal}}\n\nDit is wat ons drijft. Mensen verder helpen in de horeca.\n\n#TopTalentJobs #Horeca #Groei',
 ARRAY['naam', 'verhaal'],
 NULL),

-- Seizoen (3)
('Seizoenspost', 'seizoen',
 E'{{emoji}} {{seizoen}} is aangebroken!\n\n{{wat_betekent_dit}}\n\nVoor horecaondernemers betekent dit:\n{{punt_1}}\n{{punt_2}}\n{{punt_3}}\n\nPersoneel nodig? Wij staan klaar.\n\n#Horeca #{{seizoen_tag}} #TopTalentJobs',
 ARRAY['emoji', 'seizoen', 'wat_betekent_dit', 'punt_1', 'punt_2', 'punt_3', 'seizoen_tag'],
 NULL),

('Event aankondiging', 'seizoen',
 E'{{event}} komt eraan! 🎉\n\n{{detail}}\n\nExtra personeel nodig voor {{event}}? Regel het nu, voordat het te laat is.\n\n📩 DM of bel ons: toptalentjobs.nl\n\n#Horeca #{{event_tag}} #Personeel',
 ARRAY['event', 'detail', 'event_tag'],
 NULL),

('Maand vooruitblik', 'seizoen',
 E'{{maand}} in de horeca — dit staat er op de planning:\n\n{{overzicht}}\n\nWij zijn er klaar voor. Jij ook?\n\n#Horeca #{{maand}} #Planning',
 ARRAY['maand', 'overzicht'],
 NULL),

-- Vacature (3)
('Vacature post', 'vacature',
 E'📢 Wij zoeken: {{functie}} in {{stad}}\n\n{{details}}\n\nWat we bieden:\n✅ {{voordeel_1}}\n✅ {{voordeel_2}}\n✅ {{voordeel_3}}\n\nInteresse? Reageer via de link in comments of stuur een DM.\n\n#Vacature #Horeca #{{stad}} #TopTalentJobs',
 ARRAY['functie', 'stad', 'details', 'voordeel_1', 'voordeel_2', 'voordeel_3'],
 NULL),

('Bulk werving', 'vacature',
 E'🔥 Wij zoeken {{aantal}}+ horecamedewerkers in {{regio}}!\n\n{{context}}\n\nFuncties: {{functies}}\n\nMeld je aan via toptalentjobs.nl/inschrijven\n\n#HorecaBanen #{{regio}} #TopTalentJobs',
 ARRAY['aantal', 'regio', 'context', 'functies'],
 NULL),

('Medewerker gezocht informeel', 'vacature',
 E'Ken jij iemand die... {{beschrijving}}?\n\nWij zoeken precies zo iemand voor een gave plek in {{stad}}.\n\n{{extra}}\n\nTag diegene hieronder 👇\n\n#Horeca #Vacature #TopTalentJobs',
 ARRAY['beschrijving', 'stad', 'extra'],
 NULL),

-- Engagement (2)
('Poll / Vraag', 'engagement',
 E'{{vraag}}\n\n{{optie_a}}\n{{optie_b}}\n{{optie_c}}\n\nLaat het weten in de comments! 👇\n\n#Horeca #Poll #TopTalentJobs',
 ARRAY['vraag', 'optie_a', 'optie_b', 'optie_c'],
 NULL),

('Herkenbaar moment', 'engagement',
 E'Herkenbaar? 😅\n\n{{situatie}}\n\nIedereen die in de horeca werkt kent dit. Tag een collega die dit herkent.\n\n#HorecaLeven #Herkenbaar #TopTalentJobs',
 ARRAY['situatie'],
 NULL),

-- Behind the scenes (2)
('Team moment', 'behind_the_scenes',
 E'Even een kijkje achter de schermen bij TopTalent 👀\n\n{{moment}}\n\n{{reflectie}}\n\n#TeamTopTalent #BehindTheScenes #Horeca',
 ARRAY['moment', 'reflectie'],
 NULL),

('Kantoor update', 'behind_the_scenes',
 E'{{update}}\n\n{{detail}}\n\nWe houden jullie op de hoogte! 🧡\n\n#TopTalentJobs #Update #Team',
 ARRAY['update', 'detail'],
 NULL);
