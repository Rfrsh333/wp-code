-- Schemadrift: kolommen die de code gebruikt maar die op productie ontbraken.
--
-- beoordelingen: de klant-route (/api/klant/beoordelingen), /api/medewerker/ratings en de admin-
-- medewerkerdetail gebruiken deelscores en "zou opnieuw boeken", maar die kolommen bestonden niet op
-- productie (tabel had alleen id, dienst_id, medewerker_id, klant_id, score, opmerking, created_at).
-- Gevolg: elke beoordeling faalde met PGRST204 en de ratings-route gaf een fout.
-- Gevonden 2-10-2026 via het PostgREST-schema. Idempotent.

alter table public.beoordelingen add column if not exists score_punctualiteit smallint;
alter table public.beoordelingen add column if not exists score_professionaliteit smallint;
alter table public.beoordelingen add column if not exists score_vaardigheden smallint;
alter table public.beoordelingen add column if not exists score_communicatie smallint;
alter table public.beoordelingen add column if not exists zou_opnieuw_boeken boolean;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'beoordelingen_deelscores_bereik') then
    alter table public.beoordelingen add constraint beoordelingen_deelscores_bereik check (
      (score_punctualiteit is null or score_punctualiteit between 1 and 5) and
      (score_professionaliteit is null or score_professionaliteit between 1 and 5) and
      (score_vaardigheden is null or score_vaardigheden between 1 and 5) and
      (score_communicatie is null or score_communicatie between 1 and 5)
    ) not valid;
  end if;
end $$;

-- Overige kolommen die de code schrijft maar die op productie ontbraken (2-10-2026, PostgREST-schema):
-- uren_registraties: admin "uren toevoegen" schrijft toeslag; insert faalde stil.
alter table public.uren_registraties add column if not exists toeslag_type text;
alter table public.uren_registraties add column if not exists toeslag_percentage numeric;
-- medewerkers: na een beoordeling (badge/totaal) en bij boetes (no-show-teller).
alter table public.medewerkers add column if not exists badge text;
alter table public.medewerkers add column if not exists totaal_diensten integer not null default 0;
alter table public.medewerkers add column if not exists no_show_count integer not null default 0;
-- klanten: bedrijfsgegevens (lead-omzetting, instellingen, factuur-snapshot).
alter table public.klanten add column if not exists adres text;
alter table public.klanten add column if not exists postcode text;
alter table public.klanten add column if not exists stad text;
alter table public.klanten add column if not exists kvk_nummer text;
alter table public.klanten add column if not exists btw_nummer text;
-- email_log: foutmelding bij mislukte verzending.
alter table public.email_log add column if not exists error_message text;

-- PostgREST het nieuwe schema laten zien.
notify pgrst, 'reload schema';
