-- ============================================
-- GOOGLE REVIEWS & REPUTATIE MONITOR MIGRATIE
-- TopTalent Jobs
-- ============================================

-- Review request tracking op diensten
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS review_request_sent BOOLEAN DEFAULT false;
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;

-- Google reviews tabel
CREATE TABLE IF NOT EXISTS google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_naam VARCHAR(255),
  score INTEGER CHECK (score >= 1 AND score <= 5),
  tekst TEXT,
  review_datum DATE,
  antwoord TEXT,
  antwoord_datum DATE,
  ai_antwoord TEXT,
  bron VARCHAR(50) DEFAULT 'handmatig', -- handmatig, api
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_google_reviews_score ON google_reviews(score);
CREATE INDEX IF NOT EXISTS idx_google_reviews_datum ON google_reviews(review_datum);
CREATE INDEX IF NOT EXISTS idx_diensten_review_sent ON diensten(review_request_sent) WHERE review_request_sent = false;

-- RLS
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access google_reviews" ON google_reviews;
CREATE POLICY "Service role full access google_reviews" ON google_reviews
  FOR ALL USING (true) WITH CHECK (true);
