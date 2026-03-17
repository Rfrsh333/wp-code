-- GEO (Generative Engine Optimization) Agent
-- Content geoptimaliseerd voor AI zoekmachines (Perplexity, ChatGPT Search, Google AI Overviews)

-- Tabel voor GEO-geoptimaliseerde content
CREATE TABLE IF NOT EXISTS geo_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Content type: city_page, faq_cluster, service_guide, authority_article
  content_type text NOT NULL CHECK (content_type IN ('city_page', 'faq_cluster', 'service_guide', 'authority_article')),

  -- Targeting
  stad text NOT NULL, -- Amsterdam, Rotterdam, Den Haag, Utrecht
  slug text NOT NULL UNIQUE,
  taal text NOT NULL DEFAULT 'nl',

  -- SEO & GEO metadata
  title text NOT NULL,
  meta_description text,
  seo_title text,
  canonical_url text,

  -- Content (markdown)
  body_markdown text NOT NULL,
  excerpt text,

  -- Structured data (opgeslagen als JSONB voor flexibiliteit)
  structured_data jsonb DEFAULT '[]'::jsonb,

  -- FAQ items (voor FAQ-rijke content die AI engines prefereren)
  faq_items jsonb DEFAULT '[]'::jsonb, -- [{question, answer}]

  -- Statistieken & citaties
  bronnen jsonb DEFAULT '[]'::jsonb, -- [{title, url, type}]
  statistieken jsonb DEFAULT '[]'::jsonb, -- [{stat, bron, jaar}]

  -- Review workflow
  status text NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'review', 'gepubliceerd', 'gearchiveerd')),
  review_notities text,
  gepubliceerd_op timestamptz,
  gegenereerd_door text DEFAULT 'geo-agent', -- geo-agent of manueel

  -- Targeting keywords voor AI zoekmachines
  primary_keywords text[] DEFAULT '{}',
  secondary_keywords text[] DEFAULT '{}',

  -- Versioning
  versie integer NOT NULL DEFAULT 1,
  vorige_versie_id uuid REFERENCES geo_content(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geo_content_stad ON geo_content(stad);
CREATE INDEX IF NOT EXISTS idx_geo_content_status ON geo_content(status);
CREATE INDEX IF NOT EXISTS idx_geo_content_type ON geo_content(content_type);
CREATE INDEX IF NOT EXISTS idx_geo_content_slug ON geo_content(slug);
CREATE INDEX IF NOT EXISTS idx_geo_content_gepubliceerd ON geo_content(gepubliceerd_op) WHERE status = 'gepubliceerd';

-- RLS
ALTER TABLE geo_content ENABLE ROW LEVEL SECURITY;

-- Publieke leestoegang voor gepubliceerde content
CREATE POLICY IF NOT EXISTS "geo_content_public_read"
  ON geo_content FOR SELECT
  USING (status = 'gepubliceerd');

-- GEO generatie log (tracked wat de agent doet)
CREATE TABLE IF NOT EXISTS geo_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  content_id uuid REFERENCES geo_content(id),
  actie text NOT NULL, -- 'gegenereerd', 'bijgewerkt', 'gepubliceerd', 'gearchiveerd'
  details jsonb DEFAULT '{}'::jsonb,
  tokens_gebruikt integer DEFAULT 0,
  model text,
  duur_ms integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_geo_log_content ON geo_generation_log(content_id);
CREATE INDEX IF NOT EXISTS idx_geo_log_created ON geo_generation_log(created_at);
