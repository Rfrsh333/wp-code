-- AVG compliance: consent tracking voor inschrijvingen
ALTER TABLE inschrijvingen
  ADD COLUMN IF NOT EXISTS toestemming_verwerking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS toestemming_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS toestemming_ip text;
