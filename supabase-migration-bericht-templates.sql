-- Bericht templates voor hergebruikbare berichten

CREATE TABLE IF NOT EXISTS bericht_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  onderwerp TEXT,
  inhoud TEXT NOT NULL,
  categorie TEXT DEFAULT 'algemeen',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bericht_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role heeft volledige toegang tot bericht_templates"
  ON bericht_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);
