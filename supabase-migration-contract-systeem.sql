-- ============================================================================
-- Digitaal Contractsysteem - TopTalent Jobs
-- ============================================================================
-- Complete database migratie voor het digitale contractsysteem:
-- 1. Contract templates tabel
-- 2. Contracten tabel (hoofd-entiteit)
-- 3. Contract ondertekeningen tabel
-- 4. Contract versies tabel
-- 5. Indexes en RLS policies
-- 6. Updated_at triggers
-- 7. Realtime publicatie
-- ============================================================================

-- ============================================================================
-- 1. Contract Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  beschrijving TEXT,
  type TEXT NOT NULL CHECK (type IN ('arbeidsovereenkomst', 'uitzendovereenkomst', 'oproepovereenkomst', 'freelance', 'stage', 'custom')),
  inhoud JSONB NOT NULL DEFAULT '{}',
  -- inhoud bevat: { secties: [{ titel, tekst, volgorde }], variabelen: [{ naam, label, type, verplicht }] }
  versie INTEGER NOT NULL DEFAULT 1,
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(type);
CREATE INDEX IF NOT EXISTS idx_contract_templates_actief ON contract_templates(actief) WHERE actief = true;

COMMENT ON TABLE contract_templates IS 'Templates voor contracten met variabelen en secties';
COMMENT ON COLUMN contract_templates.inhoud IS 'JSON met secties en variabelen: { secties: [...], variabelen: [...] }';

-- ============================================================================
-- 2. Contracten (hoofd-entiteit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referenties
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE CASCADE,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  aangemaakt_door TEXT NOT NULL, -- admin email

  -- Contract info
  contract_nummer TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('arbeidsovereenkomst', 'uitzendovereenkomst', 'oproepovereenkomst', 'freelance', 'stage', 'custom')),
  titel TEXT NOT NULL,

  -- Ingevulde data (template variabelen + waarden)
  contract_data JSONB NOT NULL DEFAULT '{}',
  -- contract_data bevat: { functie, uurtarief, startdatum, einddatum, uren_per_week, ... }

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN (
    'concept',           -- Nog in bewerking door admin
    'verzonden',         -- Verzonden naar medewerker ter ondertekening
    'bekeken',           -- Medewerker heeft contract geopend
    'ondertekend_medewerker', -- Medewerker heeft getekend
    'ondertekend_admin',      -- Admin heeft getekend (= volledig getekend)
    'actief',            -- Contract is actief (na beide handtekeningen)
    'verlopen',          -- Contract is verlopen (einddatum gepasseerd)
    'opgezegd',          -- Contract is opgezegd
    'geannuleerd'        -- Contract is geannuleerd voor ondertekening
  )),

  -- Ondertekening
  onderteken_token TEXT UNIQUE, -- Uniek token voor onderteken-link
  onderteken_token_verloopt_at TIMESTAMPTZ,

  -- PDF
  pdf_pad TEXT, -- Supabase Storage pad naar gegenereerde PDF
  getekend_pdf_pad TEXT, -- PDF met handtekeningen

  -- Datums
  startdatum DATE,
  einddatum DATE,
  verzonden_at TIMESTAMPTZ,
  ondertekend_medewerker_at TIMESTAMPTZ,
  ondertekend_admin_at TIMESTAMPTZ,
  opgezegd_at TIMESTAMPTZ,

  -- Metadata
  notities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracten_medewerker ON contracten(medewerker_id);
CREATE INDEX IF NOT EXISTS idx_contracten_klant ON contracten(klant_id);
CREATE INDEX IF NOT EXISTS idx_contracten_status ON contracten(status);
CREATE INDEX IF NOT EXISTS idx_contracten_template ON contracten(template_id);
CREATE INDEX IF NOT EXISTS idx_contracten_token ON contracten(onderteken_token) WHERE onderteken_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracten_nummer ON contracten(contract_nummer);
CREATE INDEX IF NOT EXISTS idx_contracten_created ON contracten(created_at DESC);

COMMENT ON TABLE contracten IS 'Digitale contracten met ondertekening workflow';
COMMENT ON COLUMN contracten.onderteken_token IS 'Uniek token voor publieke ondertekenpagina';
COMMENT ON COLUMN contracten.contract_data IS 'Ingevulde template variabelen als JSON';

-- ============================================================================
-- 3. Contract Ondertekeningen
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_ondertekeningen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracten(id) ON DELETE CASCADE,

  -- Wie tekent
  ondertekenaar_type TEXT NOT NULL CHECK (ondertekenaar_type IN ('medewerker', 'admin')),
  ondertekenaar_naam TEXT NOT NULL,
  ondertekenaar_email TEXT,

  -- Handtekening data
  handtekening_data TEXT NOT NULL, -- Base64 PNG van SignaturePad
  handtekening_hash TEXT NOT NULL, -- SHA-256 hash voor integriteit

  -- Verificatie
  ip_adres TEXT,
  user_agent TEXT,

  -- Timestamps
  getekend_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ondertekeningen_contract ON contract_ondertekeningen(contract_id);
CREATE INDEX IF NOT EXISTS idx_ondertekeningen_type ON contract_ondertekeningen(ondertekenaar_type);

COMMENT ON TABLE contract_ondertekeningen IS 'Handtekeningen bij contracten met audit trail';
COMMENT ON COLUMN contract_ondertekeningen.handtekening_data IS 'Base64 encoded PNG van de digitale handtekening';
COMMENT ON COLUMN contract_ondertekeningen.handtekening_hash IS 'SHA-256 hash van handtekening_data voor integriteitscontrole';

-- ============================================================================
-- 4. Contract Versies (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_versies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracten(id) ON DELETE CASCADE,

  versie_nummer INTEGER NOT NULL,
  contract_data JSONB NOT NULL, -- Snapshot van contract_data op dit moment
  gewijzigd_door TEXT NOT NULL, -- admin email
  wijziging_reden TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versies_contract ON contract_versies(contract_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_versies_uniek ON contract_versies(contract_id, versie_nummer);

COMMENT ON TABLE contract_versies IS 'Versiegeschiedenis van contractwijzigingen';

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracten ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_ondertekeningen ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versies ENABLE ROW LEVEL SECURITY;

-- Service role heeft volledige toegang (admin API routes)
DROP POLICY IF EXISTS "service_role_templates" ON contract_templates;
CREATE POLICY "service_role_templates" ON contract_templates
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_contracten" ON contracten;
CREATE POLICY "service_role_contracten" ON contracten
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_ondertekeningen" ON contract_ondertekeningen;
CREATE POLICY "service_role_ondertekeningen" ON contract_ondertekeningen
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_versies" ON contract_versies;
CREATE POLICY "service_role_versies" ON contract_versies
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. Updated_at Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contract_templates_updated ON contract_templates;
CREATE TRIGGER trigger_contract_templates_updated
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_contract_updated_at();

DROP TRIGGER IF EXISTS trigger_contracten_updated ON contracten;
CREATE TRIGGER trigger_contracten_updated
  BEFORE UPDATE ON contracten
  FOR EACH ROW EXECUTE FUNCTION update_contract_updated_at();

-- ============================================================================
-- 7. Realtime Publicatie
-- ============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE contracten;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================================
-- 8. Supabase Storage Bucket voor contracten
-- ============================================================================
-- Handmatig aanmaken in Supabase Dashboard:
-- Bucket naam: contracten
-- Public: false (private bucket, alleen via signed URLs)
-- Allowed MIME types: application/pdf, image/png
-- Max file size: 10MB

-- ============================================================================
-- 9. Seed Data: Standaard Contract Templates
-- ============================================================================

INSERT INTO contract_templates (naam, slug, type, beschrijving, inhoud) VALUES
(
  'Uitzendovereenkomst Fase A',
  'uitzend-fase-a',
  'uitzendovereenkomst',
  'Standaard uitzendovereenkomst voor Fase A (78 weken)',
  '{
    "secties": [
      {
        "titel": "Partijen",
        "tekst": "De ondergetekenden:\n\n1. TopTalent Jobs B.V., gevestigd te Utrecht, hierna te noemen \"de uitzendonderneming\";\n2. {{medewerker_naam}}, geboren op {{geboortedatum}}, wonende te {{adres}}, hierna te noemen \"de uitzendkracht\";\n\nKomen het volgende overeen:",
        "volgorde": 1
      },
      {
        "titel": "Artikel 1 - Indiensttreding en functie",
        "tekst": "1.1 De uitzendkracht treedt met ingang van {{startdatum}} in dienst bij de uitzendonderneming.\n1.2 De uitzendkracht zal worden ingezet in de functie van {{functie}} bij {{klant_naam}}, gevestigd te {{werklocatie}}.",
        "volgorde": 2
      },
      {
        "titel": "Artikel 2 - Duur van de overeenkomst",
        "tekst": "2.1 Deze overeenkomst is aangegaan voor de duur van de terbeschikkingstelling, met een uitzendbeding conform artikel 7:691 BW.\n2.2 De overeenkomst vangt aan op {{startdatum}} en eindigt van rechtswege wanneer de terbeschikkingstelling eindigt.",
        "volgorde": 3
      },
      {
        "titel": "Artikel 3 - Arbeidstijden",
        "tekst": "3.1 De uitzendkracht werkt gemiddeld {{uren_per_week}} uur per week.\n3.2 De werktijden worden in overleg met de inlener vastgesteld.",
        "volgorde": 4
      },
      {
        "titel": "Artikel 4 - Beloning",
        "tekst": "4.1 Het bruto uurloon bedraagt €{{uurtarief}}.\n4.2 Vakantietoeslag van 8% wordt maandelijks gereserveerd.\n4.3 Uitbetaling vindt wekelijks/maandelijks plaats.",
        "volgorde": 5
      },
      {
        "titel": "Artikel 5 - Overige bepalingen",
        "tekst": "5.1 Op deze overeenkomst is de ABU CAO voor Uitzendkrachten van toepassing.\n5.2 De uitzendkracht verklaart kennis te hebben genomen van het huishoudelijk reglement van de uitzendonderneming.",
        "volgorde": 6
      }
    ],
    "variabelen": [
      { "naam": "medewerker_naam", "label": "Naam medewerker", "type": "text", "verplicht": true },
      { "naam": "geboortedatum", "label": "Geboortedatum", "type": "date", "verplicht": true },
      { "naam": "adres", "label": "Adres", "type": "text", "verplicht": true },
      { "naam": "functie", "label": "Functie", "type": "text", "verplicht": true },
      { "naam": "klant_naam", "label": "Opdrachtgever", "type": "text", "verplicht": true },
      { "naam": "werklocatie", "label": "Werklocatie", "type": "text", "verplicht": true },
      { "naam": "startdatum", "label": "Startdatum", "type": "date", "verplicht": true },
      { "naam": "uren_per_week", "label": "Uren per week", "type": "number", "verplicht": true },
      { "naam": "uurtarief", "label": "Bruto uurloon", "type": "number", "verplicht": true }
    ]
  }'::jsonb
),
(
  'Oproepovereenkomst',
  'oproep-nul-uren',
  'oproepovereenkomst',
  'Nul-urencontract / oproepovereenkomst',
  '{
    "secties": [
      {
        "titel": "Partijen",
        "tekst": "De ondergetekenden:\n\n1. TopTalent Jobs B.V., gevestigd te Utrecht, hierna te noemen \"de werkgever\";\n2. {{medewerker_naam}}, geboren op {{geboortedatum}}, wonende te {{adres}}, hierna te noemen \"de werknemer\";\n\nKomen het volgende overeen:",
        "volgorde": 1
      },
      {
        "titel": "Artikel 1 - Dienstverband",
        "tekst": "1.1 De werknemer treedt met ingang van {{startdatum}} in dienst bij de werkgever op basis van een oproepovereenkomst.\n1.2 De werknemer zal werkzaam zijn in de functie van {{functie}}.",
        "volgorde": 2
      },
      {
        "titel": "Artikel 2 - Oproep en werktijden",
        "tekst": "2.1 De werkgever is niet verplicht de werknemer op te roepen.\n2.2 De werknemer is niet verplicht aan een oproep gehoor te geven.\n2.3 Per oproep heeft de werknemer recht op minimaal 3 uur loon.",
        "volgorde": 3
      },
      {
        "titel": "Artikel 3 - Beloning",
        "tekst": "3.1 Het bruto uurloon bedraagt €{{uurtarief}}.\n3.2 Vakantietoeslag van 8% wordt maandelijks gereserveerd.",
        "volgorde": 4
      }
    ],
    "variabelen": [
      { "naam": "medewerker_naam", "label": "Naam medewerker", "type": "text", "verplicht": true },
      { "naam": "geboortedatum", "label": "Geboortedatum", "type": "date", "verplicht": true },
      { "naam": "adres", "label": "Adres", "type": "text", "verplicht": true },
      { "naam": "functie", "label": "Functie", "type": "text", "verplicht": true },
      { "naam": "startdatum", "label": "Startdatum", "type": "date", "verplicht": true },
      { "naam": "uurtarief", "label": "Bruto uurloon", "type": "number", "verplicht": true }
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
