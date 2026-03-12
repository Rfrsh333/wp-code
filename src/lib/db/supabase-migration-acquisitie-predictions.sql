-- Predictive AI: Voorspellingen opslaan per lead
-- Voer deze SQL uit in de Supabase SQL Editor

ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS predicted_conversion_pct INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS predicted_deal_value NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS predicted_close_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS churn_risk VARCHAR(20) DEFAULT NULL, -- laag, midden, hoog, kritiek
  ADD COLUMN IF NOT EXISTS prediction_updated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS predicted_best_channel VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS predicted_best_time VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_predicted_conversion ON acquisitie_leads(predicted_conversion_pct DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_churn_risk ON acquisitie_leads(churn_risk) WHERE churn_risk IS NOT NULL;

-- Prediction history voor trending
CREATE TABLE IF NOT EXISTS acquisitie_prediction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES acquisitie_leads(id) ON DELETE CASCADE,
  predicted_conversion_pct INTEGER,
  predicted_deal_value NUMERIC(10,2),
  churn_risk VARCHAR(20),
  model_version VARCHAR(20) DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_log_lead ON acquisitie_prediction_log(lead_id, created_at DESC);

ALTER TABLE acquisitie_prediction_log ENABLE ROW LEVEL SECURITY;
