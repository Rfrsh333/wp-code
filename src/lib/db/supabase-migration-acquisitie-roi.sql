-- ROI Tracking: Kosten, opbrengsten en rendement
-- Voer deze SQL uit in de Supabase SQL Editor

-- Kosten registratie
CREATE TABLE IF NOT EXISTS acquisitie_kosten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie VARCHAR(50) NOT NULL, -- personeel, tooling, advertenties, events, telefoon, overig
  omschrijving VARCHAR(255) NOT NULL,
  bedrag NUMERIC(10,2) NOT NULL,
  periode_start DATE NOT NULL,
  periode_eind DATE,
  is_maandelijks BOOLEAN DEFAULT false,
  kanaal VARCHAR(50), -- email, whatsapp, telefoon, bezoek, linkedin, google_maps, advertenties
  campagne_id UUID REFERENCES acquisitie_campagnes(id) ON DELETE SET NULL,
  sales_rep_id UUID REFERENCES acquisitie_sales_reps(id) ON DELETE SET NULL,
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kosten_periode ON acquisitie_kosten(periode_start DESC);
CREATE INDEX IF NOT EXISTS idx_kosten_categorie ON acquisitie_kosten(categorie);
CREATE INDEX IF NOT EXISTS idx_kosten_kanaal ON acquisitie_kosten(kanaal);

-- Opbrengsten / deal registratie
CREATE TABLE IF NOT EXISTS acquisitie_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES acquisitie_leads(id) ON DELETE SET NULL,
  bedrijfsnaam VARCHAR(255) NOT NULL,
  deal_waarde NUMERIC(10,2) NOT NULL, -- maandelijkse waarde
  deal_type VARCHAR(50) DEFAULT 'nieuw', -- nieuw, upsell, verlenging
  contract_duur_maanden INTEGER DEFAULT 12,
  totale_waarde NUMERIC(12,2), -- deal_waarde * contract_duur_maanden
  kanaal VARCHAR(50), -- via welk kanaal binnengehaald
  campagne_id UUID REFERENCES acquisitie_campagnes(id) ON DELETE SET NULL,
  sales_rep_id UUID REFERENCES acquisitie_sales_reps(id) ON DELETE SET NULL,
  gesloten_op DATE NOT NULL DEFAULT CURRENT_DATE,
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_gesloten ON acquisitie_deals(gesloten_op DESC);
CREATE INDEX IF NOT EXISTS idx_deals_kanaal ON acquisitie_deals(kanaal);
CREATE INDEX IF NOT EXISTS idx_deals_rep ON acquisitie_deals(sales_rep_id);

-- RLS
ALTER TABLE acquisitie_kosten ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitie_deals ENABLE ROW LEVEL SECURITY;
