-- Calculator Leads Table
-- Stores all calculator submissions with lead info and calculation data

CREATE TABLE IF NOT EXISTS calculator_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Lead information
  naam VARCHAR(255) NOT NULL,
  bedrijfsnaam VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- Calculator inputs
  functie VARCHAR(50) NOT NULL, -- bediening | bar | keuken | afwas
  aantal_medewerkers INTEGER NOT NULL,
  ervaring VARCHAR(50) NOT NULL, -- starter | ervaren | senior
  uren_per_dienst DECIMAL(4,1) NOT NULL,
  dagen_per_week INTEGER[] NOT NULL, -- Array of day indices [0-6]
  inzet_type VARCHAR(50) NOT NULL, -- regulier | spoed
  vergelijkingen VARCHAR(50)[] NOT NULL, -- Array: vast, uitzend, zzp

  -- Calculated results (stored as JSON)
  resultaten JSONB NOT NULL,

  -- PDF tracking
  pdf_token VARCHAR(64) UNIQUE,
  pdf_token_expires_at TIMESTAMP WITH TIME ZONE,
  pdf_downloaded BOOLEAN DEFAULT FALSE,
  pdf_downloaded_at TIMESTAMP WITH TIME ZONE,

  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE
);

-- Index for token lookups (PDF downloads)
CREATE INDEX IF NOT EXISTS idx_calculator_leads_pdf_token
ON calculator_leads(pdf_token)
WHERE pdf_token IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_calculator_leads_email
ON calculator_leads(email);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_calculator_leads_created_at
ON calculator_leads(created_at DESC);
