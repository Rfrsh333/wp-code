-- Territory & Routing: Sales reps tabel + lead assignment
-- Voer deze SQL uit in de Supabase SQL Editor

-- Sales reps tabel
CREATE TABLE IF NOT EXISTS acquisitie_sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefoon VARCHAR(50),
  regios TEXT[] DEFAULT '{}',
  branches TEXT[] DEFAULT '{}',
  max_leads INTEGER DEFAULT 50,
  actieve_leads_count INTEGER DEFAULT 0,
  gewonnen_leads_count INTEGER DEFAULT 0,
  conversie_rate NUMERIC(5,2) DEFAULT 0,
  actief BOOLEAN DEFAULT true,
  kleur VARCHAR(7) DEFAULT '#F27501',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_reps_actief ON acquisitie_sales_reps(actief);

CREATE OR REPLACE TRIGGER trigger_sales_reps_updated_at
  BEFORE UPDATE ON acquisitie_sales_reps
  FOR EACH ROW
  EXECUTE FUNCTION update_acquisitie_updated_at();

-- Lead assignment veld
ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES acquisitie_sales_reps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_assigned ON acquisitie_leads(assigned_to);

-- RLS
ALTER TABLE acquisitie_sales_reps ENABLE ROW LEVEL SECURITY;
