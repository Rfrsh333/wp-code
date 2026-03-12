-- ============================================
-- CONTENT & LINKEDIN AUTOPILOT MIGRATIE
-- TopTalent Jobs
-- ============================================

CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- blog, linkedin
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, published
  titel VARCHAR(255),
  inhoud TEXT NOT NULL,
  meta_description VARCHAR(300),
  keywords TEXT[],
  slug VARCHAR(255),
  gepubliceerd_op TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_content_posts_type ON content_posts(type);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_slug ON content_posts(slug);

-- RLS
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access content_posts" ON content_posts;
CREATE POLICY "Service role full access content_posts" ON content_posts
  FOR ALL USING (true) WITH CHECK (true);
