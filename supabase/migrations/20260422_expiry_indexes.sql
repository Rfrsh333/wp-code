-- Indexes voor expiry-gerelateerde queries (document-expiry cron, matching blokkering)
CREATE INDEX IF NOT EXISTS idx_certificeringen_verloopt_op ON certificeringen(verloopt_op) WHERE verloopt_op IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracten_einddatum ON contracten(einddatum) WHERE einddatum IS NOT NULL;
