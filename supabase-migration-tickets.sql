-- Tickets tabel voor AI-triage FAQ systeem
-- Slaat bezoekersvragen op met automatische AI-analyse

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'answered', 'rejected', 'spam')),
  ai_priority VARCHAR(10) CHECK (ai_priority IN ('high', 'medium', 'low')),
  ai_category VARCHAR(100),
  ai_reasoning TEXT,
  ai_similar_faq_id UUID REFERENCES faq_items(id) ON DELETE SET NULL,
  linked_faq_id UUID REFERENCES faq_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(ai_priority);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);

-- Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Service role volledige toegang (admin API)
CREATE POLICY "Service role full access tickets" ON tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bezoekers mogen tickets aanmaken (via anon key)
CREATE POLICY "Visitors can create tickets" ON tickets
  FOR INSERT WITH CHECK (status = 'new');

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();
