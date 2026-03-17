-- GEO Monitoring & Analyse
-- Tracked of AI zoekmachines TopTalent content citeren

-- Citation monitoring: resultaten van AI zoekmachine checks
CREATE TABLE IF NOT EXISTS geo_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Welke content werd gecheckt
  geo_content_id uuid REFERENCES geo_content(id),

  -- Zoekmachine details
  engine text NOT NULL CHECK (engine IN ('perplexity', 'chatgpt', 'google_ai', 'bing_copilot', 'claude')),
  zoekopdracht text NOT NULL, -- De query die gebruikt werd

  -- Resultaat
  geciteerd boolean NOT NULL DEFAULT false,
  citatie_positie integer, -- Positie in de bronnenlijst (1 = eerste bron)
  citatie_tekst text, -- Het exacte stuk tekst dat geciteerd werd
  bron_url text, -- De URL die de engine toonde

  -- Context
  totaal_bronnen integer, -- Hoeveel bronnen de engine toonde
  concurrenten_urls text[] DEFAULT '{}', -- Welke concurrenten ook geciteerd werden

  -- AI response analyse
  response_snippet text, -- Fragment van het AI antwoord
  relevantie_score numeric(3,2), -- 0.00-1.00 hoe relevant het antwoord was

  -- Metadata
  check_type text DEFAULT 'automatisch' CHECK (check_type IN ('automatisch', 'manueel'))
);

CREATE INDEX IF NOT EXISTS idx_geo_citations_content ON geo_citations(geo_content_id);
CREATE INDEX IF NOT EXISTS idx_geo_citations_engine ON geo_citations(engine);
CREATE INDEX IF NOT EXISTS idx_geo_citations_created ON geo_citations(created_at);
CREATE INDEX IF NOT EXISTS idx_geo_citations_geciteerd ON geo_citations(geciteerd) WHERE geciteerd = true;

-- Performance metrics per content item (dagelijks geaggregeerd)
CREATE TABLE IF NOT EXISTS geo_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  datum date NOT NULL DEFAULT CURRENT_DATE,
  geo_content_id uuid REFERENCES geo_content(id),

  -- Citation scores per engine
  perplexity_citaties integer DEFAULT 0,
  chatgpt_citaties integer DEFAULT 0,
  google_ai_citaties integer DEFAULT 0,

  -- Totalen
  totaal_checks integer DEFAULT 0,
  totaal_citaties integer DEFAULT 0,
  citatie_percentage numeric(5,2) DEFAULT 0, -- percentage van checks waar content geciteerd werd

  -- Gemiddelde positie (lager = beter)
  gem_citatie_positie numeric(4,2),

  -- Traffic (als beschikbaar via analytics)
  organisch_verkeer integer DEFAULT 0,
  ai_verwezen_verkeer integer DEFAULT 0,

  UNIQUE (datum, geo_content_id)
);

CREATE INDEX IF NOT EXISTS idx_geo_perf_datum ON geo_performance(datum);
CREATE INDEX IF NOT EXISTS idx_geo_perf_content ON geo_performance(geo_content_id);

-- Concurrentie monitoring
CREATE TABLE IF NOT EXISTS geo_concurrenten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Concurrent info
  naam text NOT NULL,
  website text NOT NULL UNIQUE,
  stad text, -- Specifieke stad of null voor landelijk

  -- Tracking
  actief boolean DEFAULT true,
  laatste_check timestamptz,

  -- Scores
  totaal_citaties integer DEFAULT 0,
  citatie_percentage numeric(5,2) DEFAULT 0,
  sterke_punten text[] DEFAULT '{}', -- bijv. ['meer FAQ content', 'betere statistieken']
  zwakke_punten text[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_geo_conc_actief ON geo_concurrenten(actief) WHERE actief = true;

-- Content gap detectie
CREATE TABLE IF NOT EXISTS geo_content_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- De ontbrekende content
  zoekopdracht text NOT NULL, -- De query waarvoor we geen content hebben
  stad text,
  geschat_volume text, -- 'hoog', 'middel', 'laag'

  -- Wie heeft wel content
  concurrent_urls text[] DEFAULT '{}',
  concurrent_titels text[] DEFAULT '{}',

  -- Actie
  status text DEFAULT 'open' CHECK (status IN ('open', 'gepland', 'gegenereerd', 'genegeerd')),
  geo_content_id uuid REFERENCES geo_content(id), -- Link naar gegenereerde content
  prioriteit integer DEFAULT 5 CHECK (prioriteit BETWEEN 1 AND 10), -- 1=hoogst

  -- Suggestie van de agent
  voorgesteld_type text CHECK (voorgesteld_type IN ('city_page', 'faq_cluster', 'service_guide', 'authority_article')),
  voorgestelde_keywords text[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_geo_gaps_status ON geo_content_gaps(status);
CREATE INDEX IF NOT EXISTS idx_geo_gaps_prioriteit ON geo_content_gaps(prioriteit);

-- Optimalisatie log: wat de auto-optimizer heeft gedaan
CREATE TABLE IF NOT EXISTS geo_optimalisatie_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  geo_content_id uuid REFERENCES geo_content(id),

  actie text NOT NULL, -- 'faq_toegevoegd', 'stats_bijgewerkt', 'structuur_verbeterd', etc.
  beschrijving text,

  -- Voor/na vergelijking
  veld text, -- welk veld is aangepast
  oude_waarde text,
  nieuwe_waarde text,

  -- Reden
  reden text, -- bijv. 'Laag citatie_percentage', 'Content gap gedetecteerd'
  tokens_gebruikt integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_geo_optim_content ON geo_optimalisatie_log(geo_content_id);

-- RLS policies
ALTER TABLE geo_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_concurrenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_content_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_optimalisatie_log ENABLE ROW LEVEL SECURITY;
