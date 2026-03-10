CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_table
ON audit_log(target_table);

ALTER TABLE audit_log
DROP CONSTRAINT IF EXISTS audit_log_actor_role_check;

ALTER TABLE audit_log
ADD CONSTRAINT audit_log_actor_role_check
CHECK (actor_role IS NULL OR actor_role IN ('owner', 'operations', 'recruiter', 'finance'));
