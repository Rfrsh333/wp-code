ALTER TABLE acquisitie_leads
  ADD COLUMN IF NOT EXISTS normalized_bedrijfsnaam VARCHAR(255),
  ADD COLUMN IF NOT EXISTS normalized_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS normalized_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS duplicate_of_lead_id UUID REFERENCES acquisitie_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS duplicate_reason TEXT,
  ADD COLUMN IF NOT EXISTS laatste_uitgaande_contact_datum TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS laatste_inkomende_contact_datum TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_follow_up_reminder_at TIMESTAMPTZ;

ALTER TABLE acquisitie_contactmomenten
  ADD COLUMN IF NOT EXISTS externe_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_reason TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_completed BOOLEAN DEFAULT FALSE;

UPDATE acquisitie_leads
SET normalized_email = lower(trim(email))
WHERE email IS NOT NULL AND normalized_email IS NULL;

CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_normalized_phone
  ON acquisitie_leads(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_domain
  ON acquisitie_leads(website_domain)
  WHERE website_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_instagram
  ON acquisitie_leads(instagram_handle)
  WHERE instagram_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acquisitie_leads_linkedin
  ON acquisitie_leads(linkedin_url)
  WHERE linkedin_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contactmomenten_follow_up_due
  ON acquisitie_contactmomenten(follow_up_due_at)
  WHERE follow_up_due_at IS NOT NULL;
