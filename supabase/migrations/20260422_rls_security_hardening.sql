-- ============================================================
-- RLS Security Hardening Migration
-- Datum: 2026-04-22
-- Doel: Fix alle kritieke RLS-bevindingen uit de security audit
--
-- BEVINDINGEN GEADRESSEERD:
-- C-6: admin_2fa GRANT TO anon (TOTP secrets blootgesteld)
-- C-7: 16+ tabellen met USING(true) policies (schijnbeveiliging)
-- C-1: Tabellen zonder RLS (direct via PostgREST bereikbaar)
-- C-8: Storage policies te breed
--
-- UITVOERING: Draai dit in Supabase Dashboard → SQL Editor
-- LET OP: Test eerst op staging vóór productie!
-- ============================================================

BEGIN;

-- ============================================================
-- FASE 1: KRITIEK — admin_2fa beveiligen (C-6)
-- IMPACT: Zonder deze fix kan iedereen met de anon key
--         TOTP secrets lezen en 2FA uitschakelen
-- ============================================================

REVOKE SELECT, INSERT, UPDATE ON admin_2fa FROM anon;
REVOKE SELECT, INSERT, UPDATE ON admin_2fa FROM authenticated;

ALTER TABLE admin_2fa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_admin_2fa"
  ON admin_2fa FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- FASE 2: Fix USING(true) policies zonder role-check (C-7)
-- IMPACT: Deze policies staan nu open voor iedereen met anon key
-- ============================================================

-- --- referrals ---
DROP POLICY IF EXISTS "Service role full access referrals" ON referrals;
CREATE POLICY "service_role_only_referrals"
  ON referrals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- content_posts ---
DROP POLICY IF EXISTS "Service role full access content_posts" ON content_posts;
CREATE POLICY "service_role_only_content_posts"
  ON content_posts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- medewerker_werkervaring ---
DROP POLICY IF EXISTS "medewerker_werkervaring_select" ON medewerker_werkervaring;
DROP POLICY IF EXISTS "medewerker_werkervaring_insert" ON medewerker_werkervaring;
DROP POLICY IF EXISTS "medewerker_werkervaring_delete" ON medewerker_werkervaring;
CREATE POLICY "service_role_only_medewerker_werkervaring"
  ON medewerker_werkervaring FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- medewerker_vaardigheden ---
DROP POLICY IF EXISTS "medewerker_vaardigheden_select" ON medewerker_vaardigheden;
DROP POLICY IF EXISTS "medewerker_vaardigheden_insert" ON medewerker_vaardigheden;
DROP POLICY IF EXISTS "medewerker_vaardigheden_delete" ON medewerker_vaardigheden;
CREATE POLICY "service_role_only_medewerker_vaardigheden"
  ON medewerker_vaardigheden FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- medewerker_documenten ---
DROP POLICY IF EXISTS "medewerker_documenten_select" ON medewerker_documenten;
DROP POLICY IF EXISTS "medewerker_documenten_insert" ON medewerker_documenten;
DROP POLICY IF EXISTS "medewerker_documenten_delete" ON medewerker_documenten;
CREATE POLICY "service_role_only_medewerker_documenten"
  ON medewerker_documenten FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- google_reviews ---
DROP POLICY IF EXISTS "Service role full access google_reviews" ON google_reviews;
CREATE POLICY "service_role_only_google_reviews"
  ON google_reviews FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- spoeddienst_responses ---
DROP POLICY IF EXISTS "Spoeddienst responses insert" ON spoeddienst_responses;
DROP POLICY IF EXISTS "Spoeddienst admin select" ON spoeddienst_responses;
DROP POLICY IF EXISTS "Spoeddienst admin update" ON spoeddienst_responses;
CREATE POLICY "service_role_only_spoeddienst_responses"
  ON spoeddienst_responses FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- bericht_templates ---
DROP POLICY IF EXISTS "Service role heeft volledige toegang tot bericht_templates" ON bericht_templates;
CREATE POLICY "service_role_only_bericht_templates"
  ON bericht_templates FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- berichten ---
DROP POLICY IF EXISTS "berichten_select" ON berichten;
DROP POLICY IF EXISTS "berichten_insert" ON berichten;
DROP POLICY IF EXISTS "berichten_update" ON berichten;
CREATE POLICY "service_role_only_berichten"
  ON berichten FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- dienst_aanbiedingen ---
DROP POLICY IF EXISTS "dienst_aanbiedingen_select" ON dienst_aanbiedingen;
DROP POLICY IF EXISTS "dienst_aanbiedingen_insert" ON dienst_aanbiedingen;
DROP POLICY IF EXISTS "dienst_aanbiedingen_update" ON dienst_aanbiedingen;
CREATE POLICY "service_role_only_dienst_aanbiedingen"
  ON dienst_aanbiedingen FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- certificeringen ---
DROP POLICY IF EXISTS "certificeringen_select" ON certificeringen;
DROP POLICY IF EXISTS "certificeringen_insert" ON certificeringen;
DROP POLICY IF EXISTS "certificeringen_update" ON certificeringen;
DROP POLICY IF EXISTS "certificeringen_delete" ON certificeringen;
CREATE POLICY "service_role_only_certificeringen"
  ON certificeringen FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- medewerker_beschikbaarheid_overrides (tweede policy is te breed) ---
DROP POLICY IF EXISTS "Service role heeft volledige toegang tot overrides" ON medewerker_beschikbaarheid_overrides;
CREATE POLICY "service_role_only_beschikbaarheid_overrides"
  ON medewerker_beschikbaarheid_overrides FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
-- NB: De eerste policy "Medewerkers kunnen eigen overrides beheren" wordt behouden
-- als die correct filtert op medewerker_id. Controleer dit handmatig.

-- --- factuur_regels ---
DROP POLICY IF EXISTS "Service role heeft volledige toegang tot factuur_regels" ON factuur_regels;
CREATE POLICY "service_role_only_factuur_regels"
  ON factuur_regels FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- offertes ---
DROP POLICY IF EXISTS "Service role full access offertes" ON offertes;
CREATE POLICY "service_role_only_offertes"
  ON offertes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- pricing_rules ---
DROP POLICY IF EXISTS "Service role full access pricing_rules" ON pricing_rules;
CREATE POLICY "service_role_only_pricing_rules"
  ON pricing_rules FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- push_subscriptions ---
DROP POLICY IF EXISTS "Service role full access" ON push_subscriptions;
CREATE POLICY "service_role_only_push_subscriptions"
  ON push_subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- bookings: vervang public read/insert door service-role ---
DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_public_read" ON bookings;
DROP POLICY IF EXISTS "bookings_service_role" ON bookings;
CREATE POLICY "service_role_only_bookings"
  ON bookings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- availability_slots: vervang public read ---
DROP POLICY IF EXISTS "availability_slots_public_read" ON availability_slots;
DROP POLICY IF EXISTS "availability_slots_service_role" ON availability_slots;
CREATE POLICY "service_role_only_availability_slots"
  ON availability_slots FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- admin_settings: vervang public read ---
DROP POLICY IF EXISTS "admin_settings_public_read" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_service_role" ON admin_settings;
CREATE POLICY "service_role_only_admin_settings"
  ON admin_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- event_types, availability_schedules, availability_overrides ---
-- Check of deze ook USING(true) hebben:
DROP POLICY IF EXISTS "event_types_service_role" ON event_types;
DROP POLICY IF EXISTS "availability_schedules_service_role" ON availability_schedules;
DROP POLICY IF EXISTS "availability_overrides_service_role" ON availability_overrides;
CREATE POLICY "service_role_only_event_types"
  ON event_types FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only_availability_schedules"
  ON availability_schedules FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only_availability_overrides"
  ON availability_overrides FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================
-- FASE 3: ENABLE RLS op tabellen zonder RLS (C-1)
-- IMPACT: Zonder RLS zijn deze tabellen direct toegankelijk
--         via PostgREST + anon key
-- ============================================================

-- --- Hoog-risico PII tabellen ---
ALTER TABLE IF EXISTS kandidaat_documenten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_kandidaat_documenten"
  ON kandidaat_documenten FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_email_log"
  ON email_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_audit_log"
  ON audit_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS chatbot_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_chatbot_conversations"
  ON chatbot_conversations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS chatbot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_chatbot_messages"
  ON chatbot_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS linkedin_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_linkedin_connections"
  ON linkedin_connections FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS linkedin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_linkedin_posts"
  ON linkedin_posts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS linkedin_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_linkedin_templates"
  ON linkedin_templates FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS calculator_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_calculator_leads"
  ON calculator_leads FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- Kandidaat workflow tabellen ---
ALTER TABLE IF EXISTS kandidaat_contactmomenten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_kandidaat_contactmomenten"
  ON kandidaat_contactmomenten FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS kandidaat_taken ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_kandidaat_taken"
  ON kandidaat_taken FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- --- Configuratie/lookup tabellen ---
ALTER TABLE IF EXISTS platform_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_platform_options"
  ON platform_options FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS dienst_categorieen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_dienst_categorieen"
  ON dienst_categorieen FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS dienst_functies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_dienst_functies"
  ON dienst_functies FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS dienst_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_dienst_tags"
  ON dienst_tags FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS diensten_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_diensten_tags"
  ON diensten_tags FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS geo_generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_geo_generation_log"
  ON geo_generation_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- FASE 4: Base tables die niet in migraties staan
-- maar WEL in de database bestaan
-- NB: IF EXISTS voorkomt errors als de tabel niet bestaat
-- ============================================================

-- Meest kritiek: bevat BSN, wachtwoord-hashes, PII
ALTER TABLE IF EXISTS medewerkers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'medewerkers') THEN
    CREATE POLICY "service_role_only_medewerkers"
      ON medewerkers FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS klanten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'klanten') THEN
    CREATE POLICY "service_role_only_klanten"
      ON klanten FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS inschrijvingen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inschrijvingen') THEN
    CREATE POLICY "service_role_only_inschrijvingen"
      ON inschrijvingen FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS personeel_aanvragen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'personeel_aanvragen') THEN
    CREATE POLICY "service_role_only_personeel_aanvragen"
      ON personeel_aanvragen FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS diensten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'diensten') THEN
    CREATE POLICY "service_role_only_diensten"
      ON diensten FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS facturen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'facturen') THEN
    CREATE POLICY "service_role_only_facturen"
      ON facturen FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS uren_registraties ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'uren_registraties') THEN
    CREATE POLICY "service_role_only_uren_registraties"
      ON uren_registraties FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS dienst_aanmeldingen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'dienst_aanmeldingen') THEN
    CREATE POLICY "service_role_only_dienst_aanmeldingen"
      ON dienst_aanmeldingen FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS beoordelingen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'beoordelingen') THEN
    CREATE POLICY "service_role_only_beoordelingen"
      ON beoordelingen FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS contact_berichten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contact_berichten') THEN
    CREATE POLICY "service_role_only_contact_berichten"
      ON contact_berichten FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS boetes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'boetes') THEN
    CREATE POLICY "service_role_only_boetes"
      ON boetes FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS medewerker_beschikbaarheid ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'medewerker_beschikbaarheid') THEN
    CREATE POLICY "service_role_only_medewerker_beschikbaarheid"
      ON medewerker_beschikbaarheid FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ============================================================
-- FASE 5: Fix storage policies (C-8)
-- ============================================================

-- kandidaat-documenten: vervang 'TO authenticated' door 'TO service_role'
DROP POLICY IF EXISTS "Admin can upload kandidaat documenten" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read kandidaat documenten" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update kandidaat documenten" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete kandidaat documenten" ON storage.objects;

CREATE POLICY "service_role_kandidaat_documenten_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'kandidaat-documenten')
  WITH CHECK (bucket_id = 'kandidaat-documenten');

-- medewerker-documenten: voeg policy toe (had er geen)
CREATE POLICY "service_role_medewerker_documenten_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'medewerker-documenten')
  WITH CHECK (bucket_id = 'medewerker-documenten');

-- dienst-afbeeldingen: fix INSERT policy die TO clause mist
DROP POLICY IF EXISTS "Service role kan dienst afbeeldingen uploaden" ON storage.objects;
CREATE POLICY "service_role_dienst_afbeeldingen_insert"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'dienst-afbeeldingen');

-- medewerker-photos: fix policy zonder role restriction
DROP POLICY IF EXISTS "Service role can manage medewerker photos" ON storage.objects;
CREATE POLICY "service_role_medewerker_photos_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'medewerker-photos')
  WITH CHECK (bucket_id = 'medewerker-photos');
-- Behoud public read voor profielfoto's (ze zijn bedoeld als publiek)
CREATE POLICY "public_read_medewerker_photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'medewerker-photos');


COMMIT;

-- ============================================================
-- VERIFICATIE QUERIES — Draai deze NA de migratie
-- ============================================================

-- Check 1: Zijn er nog USING(true) policies zonder role restriction?
-- SELECT policyname, tablename, permissive, roles, qual
-- FROM pg_policies
-- WHERE qual = 'true' AND NOT ('service_role' = ANY(roles));

-- Check 2: Welke tabellen hebben GEEN RLS?
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT IN (
--     SELECT tablename FROM pg_tables t
--     JOIN pg_class c ON c.relname = t.tablename
--     WHERE c.relrowsecurity = true
--   );

-- Check 3: Zijn admin_2fa grants verwijderd?
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'admin_2fa';
