-- ============================================================================
-- Email Log Migration
-- ============================================================================
-- Track alle emails die naar kandidaten worden verzonden voor analytics
-- en idempotency (prevent duplicate emails)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kandidaat_id UUID REFERENCES inschrijvingen(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'bevestiging', 'documenten_opvragen', 'inzetbaar'
  recipient TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ, -- Voor toekomstige email tracking
  clicked_at TIMESTAMPTZ, -- Voor toekomstige link tracking
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_email_log_kandidaat ON email_log(kandidaat_id);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at DESC);

-- Check constraint voor email_type
ALTER TABLE email_log
DROP CONSTRAINT IF EXISTS email_log_type_check;

ALTER TABLE email_log
ADD CONSTRAINT email_log_type_check
CHECK (email_type IN ('bevestiging', 'documenten_opvragen', 'inzetbaar', 'custom'));

-- Comment voor documentatie
COMMENT ON TABLE email_log IS 'Logs alle emails verzonden naar kandidaten voor tracking en idempotency';
COMMENT ON COLUMN email_log.email_type IS 'Type email: bevestiging (na inschrijving), documenten_opvragen (upload request), inzetbaar (welkomst)';
COMMENT ON COLUMN email_log.status IS 'Email status: sent (verzonden), delivered (afgeleverd), bounced (geweigerd), failed (mislukt)';
