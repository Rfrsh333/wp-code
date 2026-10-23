-- Stap 3 "Ontdekken zoals YoungOnes" (23-10-2026): afstand, werkgevers bewaren/verbergen en de
-- gerichte push bij een nieuwe dienst.
--
-- 1. Globale locatie op medewerkers en diensten: postcode → middelpunt van het postcodegebied via
--    de PDOK Locatieserver (overheid), afgerond op 3 decimalen (± 100 m). ALLEEN op postcode, nooit
--    op het volledige adres. Afstand = hemelsbreed (haversine).
--      geo_lat / geo_lng     null = onbekend
--      geo_postcode          de postcode waar de coördinaten bij horen
--      geo_bijgewerkt_op     null = nog niet verwerkt (de backfill pakt die rijen op)
-- 2. medewerkers.max_afstand_km: maximale afstand voor meldingen over nieuwe diensten (null = geen grens).
-- 3. Tabel medewerker_werkgever_voorkeuren: per medewerker en werkgever (klant) één keuze,
--    favoriet óf verborgen. Alleen service_role (alle toegang loopt via de API met supabaseAdmin).
--
-- De code werkt ook zolang deze migratie niet gedraaid is (42703/PGRST204 voor de kolommen,
-- 42P01/PGRST205 voor de tabel): dan geen afstand, geen voorkeuren en gaat de push zoals voorheen
-- naar alle medewerkers.
--
-- Na het draaien: backfill voor bestaande rijen via POST /api/admin/locaties/backfill (zie de PR).
-- Veilig om opnieuw te draaien (if not exists / drop … if exists). CHECK-constraints NOT VALID.

begin;

-- 1. Globale locatie -------------------------------------------------------------------------
alter table public.medewerkers add column if not exists geo_lat numeric(6,3);
alter table public.medewerkers add column if not exists geo_lng numeric(6,3);
alter table public.medewerkers add column if not exists geo_postcode text;
alter table public.medewerkers add column if not exists geo_bijgewerkt_op timestamptz;

alter table public.diensten add column if not exists geo_lat numeric(6,3);
alter table public.diensten add column if not exists geo_lng numeric(6,3);
alter table public.diensten add column if not exists geo_postcode text;
alter table public.diensten add column if not exists geo_bijgewerkt_op timestamptz;

comment on column public.medewerkers.geo_lat is
  'Breedtegraad van het middelpunt van de eigen postcode (PDOK), 3 decimalen. Alleen voor afstand (hemelsbreed).';
comment on column public.medewerkers.geo_lng is
  'Lengtegraad van het middelpunt van de eigen postcode (PDOK), 3 decimalen.';
comment on column public.medewerkers.geo_postcode is
  'Postcode waar geo_lat/geo_lng bij horen (zonder spatie).';
comment on column public.medewerkers.geo_bijgewerkt_op is
  'Wanneer de locatie is bepaald; null = nog doen (backfill).';
comment on column public.diensten.geo_lat is
  'Breedtegraad van het middelpunt van de postcode van de dienst (uit de locatie, anders die van de klant), 3 decimalen.';
comment on column public.diensten.geo_lng is
  'Lengtegraad van het middelpunt van de postcode van de dienst, 3 decimalen.';
comment on column public.diensten.geo_postcode is
  'Postcode waar geo_lat/geo_lng bij horen (zonder spatie).';
comment on column public.diensten.geo_bijgewerkt_op is
  'Wanneer de locatie is bepaald; null = nog doen (backfill).';

alter table public.medewerkers drop constraint if exists medewerkers_geo_check;
alter table public.medewerkers
  add constraint medewerkers_geo_check
  check ((geo_lat is null) = (geo_lng is null) and (geo_lat is null or (geo_lat between 50 and 54 and geo_lng between 3 and 8))) not valid;

alter table public.diensten drop constraint if exists diensten_geo_check;
alter table public.diensten
  add constraint diensten_geo_check
  check ((geo_lat is null) = (geo_lng is null) and (geo_lat is null or (geo_lat between 50 and 54 and geo_lng between 3 and 8))) not valid;

-- Backfill: alleen rijen die nog niet verwerkt zijn.
create index if not exists idx_medewerkers_geo_todo on public.medewerkers (id) where geo_bijgewerkt_op is null;
create index if not exists idx_diensten_geo_todo on public.diensten (datum) where geo_bijgewerkt_op is null;

-- 2. Maximale afstand voor meldingen ---------------------------------------------------------
alter table public.medewerkers add column if not exists max_afstand_km smallint;
comment on column public.medewerkers.max_afstand_km is
  'Maximale afstand (km, hemelsbreed) voor pushmeldingen over nieuwe diensten. Null = geen grens.';
alter table public.medewerkers drop constraint if exists medewerkers_max_afstand_km_check;
alter table public.medewerkers
  add constraint medewerkers_max_afstand_km_check
  check (max_afstand_km is null or (max_afstand_km >= 1 and max_afstand_km <= 200)) not valid;

-- 3. Werkgevers bewaren of verbergen ---------------------------------------------------------
create table if not exists public.medewerker_werkgever_voorkeuren (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid not null references public.medewerkers(id) on delete cascade,
  klant_id uuid not null references public.klanten(id) on delete cascade,
  soort text not null check (soort in ('favoriet', 'verborgen')),
  created_at timestamptz not null default now(),
  unique (medewerker_id, klant_id)
);

comment on table public.medewerker_werkgever_voorkeuren is
  'Werkgevers die een medewerker heeft bewaard (favoriet) of verborgen. Verborgen: niet in Ontdekken en geen push.';

-- De unieke index dekt zoeken op medewerker_id; de push zoekt op klant_id.
create index if not exists idx_medewerker_werkgever_voorkeuren_klant
  on public.medewerker_werkgever_voorkeuren (klant_id, soort);

alter table public.medewerker_werkgever_voorkeuren enable row level security;
revoke all on public.medewerker_werkgever_voorkeuren from anon, authenticated;
drop policy if exists "service_role_only" on public.medewerker_werkgever_voorkeuren;
create policy "service_role_only" on public.medewerker_werkgever_voorkeuren
  for all to service_role using (true) with check (true);

commit;

-- Controle achteraf (alleen lezen):
--   select count(*) filter (where geo_lat is not null)            as met_locatie,
--          count(*) filter (where geo_bijgewerkt_op is null)      as nog_te_doen,
--          count(*) filter (where max_afstand_km is not null)     as met_max_afstand
--   from public.medewerkers where status = 'actief';
--   select soort, count(*) from public.medewerker_werkgever_voorkeuren group by soort;
