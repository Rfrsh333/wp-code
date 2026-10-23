-- Onboarding van klanten (werkgevers), 23-10-2026.
--
-- Idempotent. De code werkt ook zonder deze migratie (ontbrekende kolom = 42703/PGRST204):
-- - uitnodigen werkt dan gewoon, alleen het moment van de laatste uitnodiging wordt niet bewaard.
--
-- Vereist migratie 20261001_klant_portaal.sql (klanten.reset_token + reset_token_expires_at):
-- de uitnodiging hergebruikt die tokenkolommen, met een eigen geldigheid van 7 dagen.

-- 1. Uitnodiging "wachtwoord instellen" --------------------------------------------------------
-- Moment waarop TopTalent de laatste uitnodigingsmail stuurde (lead omzetten, dienst inplannen
-- voor een nieuwe klant, of de knop "Uitnodiging (opnieuw) sturen" in de admin).
alter table public.klanten add column if not exists uitgenodigd_op timestamptz;

comment on column public.klanten.uitgenodigd_op is
  'Laatste uitnodigingsmail (wachtwoord instellen, 7 dagen geldig). Zie src/lib/klant-uitnodiging.ts.';

notify pgrst, 'reload schema';
