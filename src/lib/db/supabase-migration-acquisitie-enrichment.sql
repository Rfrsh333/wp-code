-- Lead Enrichment: Nieuw veld op acquisitie_leads
-- Voer deze SQL uit in de Supabase SQL Editor

ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT NULL;

-- Index voor leads die nog niet verrijkt zijn (voor batch processing)
CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_enrichment_null
  ON acquisitie_leads(created_at DESC)
  WHERE enrichment_data IS NULL AND website IS NOT NULL;
