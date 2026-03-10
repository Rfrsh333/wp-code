ALTER TABLE inschrijvingen
ADD COLUMN IF NOT EXISTS is_test_candidate BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_inschrijvingen_is_test_candidate
ON inschrijvingen(is_test_candidate);

CREATE TABLE IF NOT EXISTS kandidaat_contactmomenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inschrijving_id UUID NOT NULL REFERENCES inschrijvingen(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kandidaat_contactmomenten
DROP CONSTRAINT IF EXISTS kandidaat_contactmomenten_contact_type_check;

ALTER TABLE kandidaat_contactmomenten
ADD CONSTRAINT kandidaat_contactmomenten_contact_type_check
CHECK (contact_type IN ('telefoon', 'whatsapp', 'email', 'gesprek', 'notitie'));

CREATE INDEX IF NOT EXISTS idx_kandidaat_contactmomenten_inschrijving_id
ON kandidaat_contactmomenten(inschrijving_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kandidaat_taken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inschrijving_id UUID NOT NULL REFERENCES inschrijvingen(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kandidaat_taken_inschrijving_id
ON kandidaat_taken(inschrijving_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kandidaat_taken_due_at
ON kandidaat_taken(due_at)
WHERE completed_at IS NULL;
