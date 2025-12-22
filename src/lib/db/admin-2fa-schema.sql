-- Two-Factor Authentication voor Admin Accounts
-- Gebruikt TOTP (Time-based One-Time Password) zoals Google Authenticator

-- Voeg 2FA kolommen toe aan auth.users table (Supabase auth schema)
-- Dit werkt alleen als je directe database toegang hebt
-- Anders moet je een aparte tabel maken

-- Optie 1: Aparte admin_2fa tabel (aanbevolen)
CREATE TABLE IF NOT EXISTS admin_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,

  -- TOTP secret (base32 encoded)
  totp_secret VARCHAR(255),

  -- Is 2FA enabled voor deze admin?
  enabled BOOLEAN DEFAULT FALSE,

  -- Backup codes (hashed)
  backup_codes TEXT[], -- Array van bcrypt hashed codes

  -- Setup timestamp
  enabled_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snelle email lookup
CREATE INDEX IF NOT EXISTS idx_admin_2fa_email ON admin_2fa(email);

-- Functie om backup codes te valideren (helper voor later)
CREATE OR REPLACE FUNCTION validate_backup_code(
  p_email VARCHAR(255),
  p_code VARCHAR(10)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_codes TEXT[];
  v_code TEXT;
BEGIN
  -- Haal backup codes op
  SELECT backup_codes INTO v_codes
  FROM admin_2fa
  WHERE email = p_email AND enabled = true;

  IF v_codes IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check elke code
  FOR v_code IN SELECT unnest(v_codes) LOOP
    -- Hier zou je bcrypt.compare moeten gebruiken
    -- Voor nu simpele check (in API zullen we bcrypt gebruiken)
    IF v_code = p_code THEN
      -- Verwijder gebruikte code
      UPDATE admin_2fa
      SET backup_codes = array_remove(backup_codes, v_code)
      WHERE email = p_email;

      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON admin_2fa TO anon;
GRANT SELECT, INSERT, UPDATE ON admin_2fa TO authenticated;
