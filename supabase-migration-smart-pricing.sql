-- ============================================
-- SMART PRICING ENGINE MIGRATIE
-- TopTalent Jobs - Dynamic pricing rules
-- ============================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- multiplier, discount, surcharge
  conditie JSONB NOT NULL, -- { "dag": ["za", "zo"], "functie": ["bediening"] }
  waarde DECIMAL(4,2) NOT NULL, -- 1.10 = +10%, 0.95 = -5%
  actief BOOLEAN DEFAULT true,
  prioriteit INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Standaard pricing rules
INSERT INTO pricing_rules (naam, type, conditie, waarde, prioriteit) VALUES
  ('Weekend toeslag', 'multiplier', '{"dag": ["za", "zo"]}', 1.10, 10),
  ('Feestdag toeslag', 'multiplier', '{"feestdag": true}', 1.25, 20),
  ('Last-minute toeslag (<48u)', 'multiplier', '{"last_minute": true}', 1.15, 15),
  ('Piekmaand (jun-aug, dec)', 'multiplier', '{"maand": [6, 7, 8, 12]}', 1.10, 5),
  ('Volume korting (>20u/week)', 'discount', '{"min_uren_week": 20}', 0.95, 30),
  ('Loyalty Gold', 'discount', '{"loyalty_tier": "gold"}', 0.97, 40),
  ('Loyalty Platinum', 'discount', '{"loyalty_tier": "platinum"}', 0.95, 41);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_pricing_rules_actief ON pricing_rules(actief);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON pricing_rules(type);

-- RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access pricing_rules" ON pricing_rules;
CREATE POLICY "Service role full access pricing_rules" ON pricing_rules
  FOR ALL USING (true) WITH CHECK (true);
