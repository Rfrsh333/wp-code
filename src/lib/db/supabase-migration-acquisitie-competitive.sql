-- Competitive Intelligence: Concurrenten tracking + Win/Loss analyse
-- Voer deze SQL uit in de Supabase SQL Editor

-- Concurrenten tabel
CREATE TABLE IF NOT EXISTS acquisitie_concurrenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  type VARCHAR(50) DEFAULT 'uitzendbureau', -- uitzendbureau, detacheerder, payroller, zzp_platform
  regios TEXT[] DEFAULT '{}',
  branches TEXT[] DEFAULT '{}',
  sterke_punten TEXT[] DEFAULT '{}',
  zwakke_punten TEXT[] DEFAULT '{}',
  prijsindicatie VARCHAR(100), -- goedkoop, marktconform, premium
  usps TEXT, -- hun unique selling points
  onze_voordelen TEXT, -- waarom wij beter zijn
  battle_card JSONB, -- AI-gegenereerde battle card
  notities TEXT,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concurrenten_actief ON acquisitie_concurrenten(actief);

CREATE OR REPLACE TRIGGER trigger_concurrenten_updated_at
  BEFORE UPDATE ON acquisitie_concurrenten
  FOR EACH ROW
  EXECUTE FUNCTION update_acquisitie_updated_at();

-- Win/Loss registratie
CREATE TABLE IF NOT EXISTS acquisitie_win_loss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES acquisitie_leads(id) ON DELETE SET NULL,
  concurrent_id UUID REFERENCES acquisitie_concurrenten(id) ON DELETE SET NULL,
  resultaat VARCHAR(20) NOT NULL, -- gewonnen, verloren, lopend
  reden VARCHAR(100), -- prijs, service, snelheid, relatie, kwaliteit, anders
  reden_detail TEXT,
  deal_waarde NUMERIC(10,2), -- geschatte waarde
  branche VARCHAR(100),
  stad VARCHAR(100),
  contactpersoon_feedback TEXT, -- directe feedback van prospect
  learnings TEXT, -- wat leren we hiervan
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_win_loss_resultaat ON acquisitie_win_loss(resultaat);
CREATE INDEX IF NOT EXISTS idx_win_loss_concurrent ON acquisitie_win_loss(concurrent_id);
CREATE INDEX IF NOT EXISTS idx_win_loss_created ON acquisitie_win_loss(created_at DESC);

-- Concurrent info op lead niveau
ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS concurrent_info JSONB DEFAULT NULL;
-- Format: { concurrenten: ["naam1"], notities: "...", prijs_vergelijking: "..." }

-- RLS
ALTER TABLE acquisitie_concurrenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitie_win_loss ENABLE ROW LEVEL SECURITY;
