-- Fix: RLS policies die USING (true) WITHOUT TO service_role gebruikten,
-- waardoor anon/authenticated ook toegang had tot PII-tabellen.
-- Audit bevinding: crm_instantly_campaigns, crm_lead_campaigns,
-- crm_unmatched_instantly_leads, crm_test_shifts, crm_objections.

-- crm_instantly_campaigns
DROP POLICY IF EXISTS "Service role full access" ON crm_instantly_campaigns;
CREATE POLICY "service_role_only" ON crm_instantly_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_lead_campaigns
DROP POLICY IF EXISTS "Service role full access" ON crm_lead_campaigns;
CREATE POLICY "service_role_only" ON crm_lead_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_unmatched_instantly_leads (bevat e-mail + naam van prospects)
DROP POLICY IF EXISTS "Service role full access" ON crm_unmatched_instantly_leads;
CREATE POLICY "service_role_only" ON crm_unmatched_instantly_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_test_shifts
DROP POLICY IF EXISTS "Admin full access to test shifts" ON crm_test_shifts;
CREATE POLICY "service_role_only" ON crm_test_shifts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_objections
DROP POLICY IF EXISTS "Admin full access to objections" ON crm_objections;
CREATE POLICY "service_role_only" ON crm_objections
  FOR ALL TO service_role USING (true) WITH CHECK (true);
