-- FAQ Items tabel voor TopTalent Jobs
-- Gebruikt voor de publieke FAQ-hub en admin beheer

CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  source VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'visitor')),
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'pending')),
  slug TEXT NOT NULL UNIQUE,
  priority INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  visitor_email TEXT,
  visitor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes voor snelle queries
CREATE INDEX idx_faq_status ON faq_items(status);
CREATE INDEX idx_faq_category ON faq_items(category);
CREATE INDEX idx_faq_slug ON faq_items(slug);
CREATE INDEX idx_faq_source ON faq_items(source);
CREATE INDEX idx_faq_priority ON faq_items(category, priority);

-- Row Level Security
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Publieke leestoegang voor gepubliceerde items
CREATE POLICY "Public read published faq" ON faq_items
  FOR SELECT USING (status = 'published');

-- Service role volledige toegang (voor admin API)
CREATE POLICY "Service role full access faq" ON faq_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert policy voor bezoeker-ingediende vragen (via anon key)
CREATE POLICY "Visitors can submit questions" ON faq_items
  FOR INSERT WITH CHECK (source = 'visitor' AND status = 'pending');

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faq_items_updated_at
  BEFORE UPDATE ON faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();
