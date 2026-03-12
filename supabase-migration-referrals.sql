-- ============================================
-- REFERRAL SYSTEEM MIGRATIE
-- TopTalent Jobs - Medewerker & klant referrals
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_type VARCHAR(20) NOT NULL, -- medewerker, klant
  referrer_id UUID NOT NULL,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_id UUID, -- inschrijving_id of klant_id
  referred_naam VARCHAR(255),
  referred_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, qualified, rewarded
  reward_amount DECIMAL(10,2),
  reward_type VARCHAR(20), -- bonus, korting, gratis_dienst
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referral code op inschrijvingen voor tracking
ALTER TABLE inschrijvingen ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);

-- Referral code op personeel_aanvragen voor tracking
ALTER TABLE personeel_aanvragen ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_type, referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_inschrijvingen_referral ON inschrijvingen(referral_code);
CREATE INDEX IF NOT EXISTS idx_aanvragen_referral ON personeel_aanvragen(referral_code);

-- RLS policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access referrals" ON referrals;
CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (true) WITH CHECK (true);
