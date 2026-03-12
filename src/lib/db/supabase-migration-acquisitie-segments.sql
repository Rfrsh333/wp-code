-- Tags & Segmentatie: Saved segments + tag management
-- Voer deze SQL uit in de Supabase SQL Editor

-- Opgeslagen segmenten
CREATE TABLE IF NOT EXISTS acquisitie_segmenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(255) NOT NULL,
  beschrijving TEXT,
  kleur VARCHAR(7) DEFAULT '#6B7280',
  filters JSONB NOT NULL DEFAULT '{}',
  -- filters format: { stages: [], branches: [], steden: [], tags: [], min_ai_score, max_ai_score,
  --   min_engagement, churn_risk: [], has_email: bool, has_phone: bool, assigned_to: [],
  --   days_since_contact_min, days_since_contact_max, created_after, created_before }
  is_dynamic BOOLEAN DEFAULT true, -- true = filter-based, false = handmatig
  lead_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER trigger_segmenten_updated_at
  BEFORE UPDATE ON acquisitie_segmenten
  FOR EACH ROW
  EXECUTE FUNCTION update_acquisitie_updated_at();

-- Tag kleuren/beschrijvingen (optioneel, voor consistentie)
CREATE TABLE IF NOT EXISTS acquisitie_tag_definities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(100) NOT NULL UNIQUE,
  kleur VARCHAR(7) DEFAULT '#6B7280',
  categorie VARCHAR(50), -- status, branche, prioriteit, bron, custom
  beschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-populate met standaard tags
INSERT INTO acquisitie_tag_definities (naam, kleur, categorie) VALUES
  ('hot-lead', '#EF4444', 'prioriteit'),
  ('warm-lead', '#F59E0B', 'prioriteit'),
  ('cold-lead', '#3B82F6', 'prioriteit'),
  ('email-bounced', '#DC2626', 'status'),
  ('niet-bereikbaar', '#9CA3AF', 'status'),
  ('terugbellen', '#8B5CF6', 'status'),
  ('beslisser-bereikt', '#10B981', 'status'),
  ('concurrent-klant', '#F97316', 'status'),
  ('heeft-vacatures', '#22D3EE', 'bron'),
  ('website-bezocht', '#A855F7', 'bron'),
  ('via-referral', '#EC4899', 'bron'),
  ('seizoensklant', '#F59E0B', 'branche'),
  ('keten', '#6366F1', 'branche'),
  ('starter', '#34D399', 'branche')
ON CONFLICT (naam) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tag_definities_categorie ON acquisitie_tag_definities(categorie);

-- RLS
ALTER TABLE acquisitie_segmenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitie_tag_definities ENABLE ROW LEVEL SECURITY;
