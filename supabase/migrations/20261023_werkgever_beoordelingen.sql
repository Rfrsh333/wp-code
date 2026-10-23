-- Stap 4 "Vertrouwen zoals YoungOnes" (23-10-2026): medewerkers beoordelen de werkgever na een
-- afgeronde dienst; daarmee en met bestaande gegevens krijgt elke werkgever een profiel.
--
-- 1. Tabel werkgever_beoordelingen: per medewerker en dienst hooguit één beoordeling (1-5 sterren),
--    optioneel drie deelscores (duidelijke instructies, sfeer en behandeling, werk zoals beschreven)
--    en een korte opmerking die ALLEEN TopTalent ziet. Werkgevers zien alleen gemiddelden (vanaf 3
--    beoordelingen), nooit namen, datums per beoordeling of opmerkingen.
--      verborgen_op / verborgen_door   moderatie door TopTalent; verborgen telt nergens mee
--    Alleen service_role (alle toegang loopt via de API met supabaseAdmin).
-- 2. dienst_aanmeldingen.werkgever_beoordeling_herinnerd_op: wanneer de push "Hoe was het bij X?" is
--    verstuurd (cron /api/cron/werkgever-beoordeling-herinnering). Zo gaat hij per dienst één keer.
-- 3. Index voor "kiest meestal binnen X" (beslissingen op beoordeeld_at, laatste 90 dagen).
--
-- De code werkt ook zolang deze migratie niet gedraaid is (42P01/PGRST205 voor de tabel,
-- 42703/PGRST204 voor de kolom): beoordelen geeft dan 503 (code werkgever_beoordelingen_niet_beschikbaar),
-- het profiel heeft geen sterren (wel de kengetallen uit bestaande gegevens) en de cron slaat over.
--
-- Geen backfill nodig. Veilig om opnieuw te draaien (if not exists / drop … if exists).

begin;

-- 1. Beoordelingen ---------------------------------------------------------------------------
create table if not exists public.werkgever_beoordelingen (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid not null references public.medewerkers(id) on delete cascade,
  klant_id uuid not null references public.klanten(id) on delete cascade,
  dienst_id uuid not null references public.diensten(id) on delete cascade,
  aanmelding_id uuid references public.dienst_aanmeldingen(id) on delete set null,
  score smallint not null,
  score_instructies smallint,
  score_sfeer smallint,
  score_zoals_beschreven smallint,
  opmerking text,
  verborgen_op timestamptz,
  verborgen_door text,
  created_at timestamptz not null default now(),
  constraint werkgever_beoordelingen_uniek unique (medewerker_id, dienst_id),
  constraint werkgever_beoordelingen_score_check check (score between 1 and 5),
  constraint werkgever_beoordelingen_deelscores_check check (
    (score_instructies is null or score_instructies between 1 and 5)
    and (score_sfeer is null or score_sfeer between 1 and 5)
    and (score_zoals_beschreven is null or score_zoals_beschreven between 1 and 5)
  ),
  constraint werkgever_beoordelingen_opmerking_check check (opmerking is null or char_length(opmerking) <= 500)
);

comment on table public.werkgever_beoordelingen is
  'Beoordeling van een werkgever (klant) door een medewerker na een afgeronde dienst. Eén per medewerker per dienst. Werkgevers zien alleen gemiddelden vanaf 3 beoordelingen.';
comment on column public.werkgever_beoordelingen.score is 'Sterren 1-5.';
comment on column public.werkgever_beoordelingen.score_instructies is 'Deelscore "duidelijke instructies" 1-5, optioneel.';
comment on column public.werkgever_beoordelingen.score_sfeer is 'Deelscore "sfeer en behandeling" 1-5, optioneel.';
comment on column public.werkgever_beoordelingen.score_zoals_beschreven is 'Deelscore "werk zoals beschreven" 1-5, optioneel.';
comment on column public.werkgever_beoordelingen.opmerking is 'Korte opmerking (max. 500 tekens), ALLEEN zichtbaar voor TopTalent (admin). Nooit naar de werkgever.';
comment on column public.werkgever_beoordelingen.verborgen_op is 'Gezet door TopTalent (moderatie): de beoordeling telt dan nergens mee. Null = zichtbaar.';
comment on column public.werkgever_beoordelingen.verborgen_door is 'E-mailadres van de admin die de beoordeling verborg.';

-- Profiel per werkgever (alleen zichtbare beoordelingen); de unieke constraint dekt medewerker_id.
create index if not exists idx_werkgever_beoordelingen_klant
  on public.werkgever_beoordelingen (klant_id) where verborgen_op is null;
create index if not exists idx_werkgever_beoordelingen_dienst
  on public.werkgever_beoordelingen (dienst_id);

alter table public.werkgever_beoordelingen enable row level security;
revoke all on public.werkgever_beoordelingen from anon, authenticated;
drop policy if exists "service_role_only" on public.werkgever_beoordelingen;
create policy "service_role_only" on public.werkgever_beoordelingen
  for all to service_role using (true) with check (true);

-- 2. Herinnering één keer per dienst ----------------------------------------------------------
alter table public.dienst_aanmeldingen add column if not exists werkgever_beoordeling_herinnerd_op timestamptz;
comment on column public.dienst_aanmeldingen.werkgever_beoordeling_herinnerd_op is
  'Wanneer de push "Hoe was het bij …?" (werkgever beoordelen) is verstuurd. Null = nog niet.';

-- 3. Beslissingen per periode -----------------------------------------------------------------
-- (beoordeeld_at staat niet in de migraties; alleen een index als de kolom er is.)
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'dienst_aanmeldingen' and column_name = 'beoordeeld_at'
  ) then
    create index if not exists idx_dienst_aanmeldingen_beoordeeld_at
      on public.dienst_aanmeldingen (beoordeeld_at) where beoordeeld_at is not null;
  end if;
end $$;

commit;

-- Controle achteraf (alleen lezen):
--   select count(*) as beoordelingen, count(*) filter (where verborgen_op is not null) as verborgen,
--          round(avg(score), 2) as gemiddelde
--   from public.werkgever_beoordelingen;
--   select count(*) filter (where werkgever_beoordeling_herinnerd_op is not null) as herinnerd
--   from public.dienst_aanmeldingen;
