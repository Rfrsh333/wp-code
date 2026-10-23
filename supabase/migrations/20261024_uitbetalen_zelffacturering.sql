-- Stap 6 "Geld": uitbetalen aan zzp'ers met zelffacturering (besluiten Rachid, 23-10-2026).
--
-- Flow: admin keurt uren goed (uren_registraties.goedgekeurd_at) → TopTalent factureert de werkgever
-- (facturen + factuur_regels) → admin markeert de klantfactuur als betaald (facturen.status =
-- 'betaald', nu ook facturen.betaald_op) → de uren zijn "uitbetaalbaar" → admin maakt een
-- uitbetaalronde: per medewerker één zelffactuur (uitbetalingen + uitbetaling_regels, PDF in de
-- private bucket "uitbetalingen") en één SEPA-bestand (pain.001.001.03) voor de hele ronde →
-- Rachid uploadt het bestand zelf in de bank (er gaat NOOIT automatisch geld weg) → admin
-- markeert de ronde "verwerkt in bank" → zelffacturen op 'uitbetaald' + push naar de medewerker.
--
-- De code werkt ook zolang deze migratie NIET gedraaid is (42703 / 42P01 / PGRST204 / PGRST205
-- worden afgevangen): dan is er geen checklistpunt, geen akkoord en geen ronde; de admin-tab en het
-- portaal melden dat de migratie ontbreekt. Alles staat bovendien achter ZELFFACTURERING_ACTIEF=1.
--
-- Veilig om opnieuw te draaien (if not exists / drop … if exists / on conflict).

begin;

-- 1. Akkoord zelffacturering op de medewerker (zelfde patroon als het akkoord op de overeenkomst).
alter table public.medewerkers add column if not exists zelffacturering_akkoord_op timestamptz;
alter table public.medewerkers add column if not exists zelffacturering_akkoord_versie text;
alter table public.medewerkers add column if not exists zelffacturering_ingetrokken_op timestamptz;
comment on column public.medewerkers.zelffacturering_akkoord_op is
  'Moment van akkoord op zelffacturering (TopTalent factureert namens de zzp''er). Null = geen (geldig) akkoord.';
comment on column public.medewerkers.zelffacturering_akkoord_versie is
  'Versie van de akkoordtekst (src/content/zelffacturering-akkoord.ts) waarop akkoord is gegeven.';
comment on column public.medewerkers.zelffacturering_ingetrokken_op is
  'Moment waarop de medewerker het akkoord zelffacturering heeft ingetrokken (laatste keer).';

-- 2. Goedkeuring door de admin. De admin-route schrijft deze kolom al; voor de zekerheid idempotent.
alter table public.uren_registraties add column if not exists goedgekeurd_at timestamptz;

-- 3. Wanneer de klantfactuur als betaald is gemarkeerd (api/facturen/[id]/betaald).
alter table public.facturen add column if not exists betaald_op timestamptz;
comment on column public.facturen.betaald_op is
  'Moment waarop een admin de factuur als betaald markeerde. Start van de uitbetaaltermijn.';

-- 4. Uitbetaalrondes: één SEPA-bestand per ronde.
create table if not exists public.uitbetaalrondes (
  id uuid primary key default gen_random_uuid(),
  bericht_id text not null unique,                       -- SEPA MsgId
  status text not null default 'concept',
  uitvoer_datum date not null,                           -- SEPA ReqdExctnDt
  aantal_betalingen integer not null default 0,          -- NbOfTxs
  totaal_bedrag numeric(12,2) not null default 0,        -- CtrlSum
  sepa_pad text,
  aangemaakt_door text,
  aangemaakt_op timestamptz not null default now(),
  sepa_gedownload_door text,
  sepa_gedownload_op timestamptz,
  verwerkt_door text,
  verwerkt_op timestamptz
);
alter table public.uitbetaalrondes drop constraint if exists uitbetaalrondes_status_check;
alter table public.uitbetaalrondes
  add constraint uitbetaalrondes_status_check check (status in ('concept', 'aangemaakt', 'verwerkt'));
-- Maximaal één ronde tegelijk in opbouw: twee admins kunnen nooit tegelijk dezelfde uren uitbetalen.
create unique index if not exists uitbetaalrondes_een_concept on public.uitbetaalrondes (status) where status = 'concept';
comment on table public.uitbetaalrondes is
  'Uitbetaalrondes aan zzp''ers. concept = in opbouw (onzichtbaar), aangemaakt = SEPA-bestand klaar, verwerkt = door admin gemarkeerd als verwerkt in de bank.';

-- 5. Zelffacturen: één per medewerker per ronde (= één uitbetaling).
create table if not exists public.uitbetalingen (
  id uuid primary key default gen_random_uuid(),
  ronde_id uuid not null references public.uitbetaalrondes(id) on delete restrict,
  medewerker_id uuid references public.medewerkers(id) on delete set null,
  volgnummer integer not null,
  factuur_nummer text not null unique,
  factuur_datum date not null,
  status text not null default 'in_uitbetaalronde',
  bedrag_excl numeric(12,2) not null,
  btw_percentage numeric(5,2) not null,
  btw_bedrag numeric(12,2) not null,
  bedrag_incl numeric(12,2) not null,
  kor boolean not null default false,
  -- Gegevens van de zzp'er (leverancier) zoals op de factuur; btw-id versleuteld zoals medewerkers.btw_nummer.
  leverancier_naam text not null,
  leverancier_adres text,
  leverancier_postcode text,
  leverancier_stad text,
  leverancier_kvk text,
  leverancier_btw text,
  -- TopTalent (afnemer) zoals op de factuur.
  afnemer jsonb not null,
  akkoord_versie text,
  akkoord_op timestamptz,
  -- Naar welk IBAN is betaald: versleuteld (lib/encryption) + laatste 4 tekens voor weergave.
  iban_versleuteld text not null,
  iban_laatste4 text,
  pdf_pad text,
  uitbetaald_op timestamptz,
  created_at timestamptz not null default now()
);
alter table public.uitbetalingen drop constraint if exists uitbetalingen_status_check;
alter table public.uitbetalingen
  add constraint uitbetalingen_status_check check (status in ('in_uitbetaalronde', 'uitbetaald'));
alter table public.uitbetalingen drop constraint if exists uitbetalingen_volgnummer_check;
alter table public.uitbetalingen add constraint uitbetalingen_volgnummer_check check (volgnummer > 0);
alter table public.uitbetalingen drop constraint if exists uitbetalingen_bedrag_check;
alter table public.uitbetalingen
  add constraint uitbetalingen_bedrag_check check (bedrag_incl > 0 and bedrag_incl = bedrag_excl + btw_bedrag);
-- Opeenvolgend nummer per zzp'er: elk volgnummer maar één keer.
create unique index if not exists uitbetalingen_medewerker_volgnummer on public.uitbetalingen (medewerker_id, volgnummer);
create index if not exists uitbetalingen_medewerker_datum on public.uitbetalingen (medewerker_id, factuur_datum);
create index if not exists uitbetalingen_ronde on public.uitbetalingen (ronde_id);
comment on table public.uitbetalingen is
  'Zelffacturen (factuur uitgereikt door afnemer) per medewerker per uitbetaalronde. Fiscale bewaarplicht 7 jaar: niet verwijderen, corrigeren met een creditfactuur.';

-- Een zelffactuur van een aangemaakte of verwerkte ronde mag nooit verdwijnen (fiscale bewaarplicht).
-- Alleen het opruimen van een mislukte ronde in opbouw (status concept) mag.
create or replace function public.uitbetalingen_niet_verwijderen() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.uitbetaalrondes r where r.id = old.ronde_id and r.status <> 'concept') then
    raise exception 'Zelffactuur % hoort bij een aangemaakte ronde en mag niet worden verwijderd; maak een creditfactuur.', old.factuur_nummer;
  end if;
  return old;
end $$;
drop trigger if exists uitbetalingen_niet_verwijderen on public.uitbetalingen;
create trigger uitbetalingen_niet_verwijderen
  before delete on public.uitbetalingen
  for each row execute function public.uitbetalingen_niet_verwijderen();

-- 6. Regels van een zelffactuur: één per dienst (uren-registratie).
create table if not exists public.uitbetaling_regels (
  id uuid primary key default gen_random_uuid(),
  uitbetaling_id uuid not null references public.uitbetalingen(id) on delete cascade,
  uren_registratie_id uuid references public.uren_registraties(id) on delete set null,
  klant_factuur_id uuid references public.facturen(id) on delete set null,
  datum date,
  werkgever text not null,
  omschrijving text not null,
  uren numeric(6,2) not null,
  uurtarief numeric(8,2) not null,
  uren_bedrag numeric(10,2) not null,
  toeslag_omschrijving text,
  toeslag_bedrag numeric(10,2) not null default 0,
  reiskosten_km numeric(8,2) not null default 0,
  reiskosten_bedrag numeric(10,2) not null default 0,
  bedrag numeric(10,2) not null,
  created_at timestamptz not null default now()
);
-- Dezelfde uren kunnen nooit twee keer worden uitbetaald.
create unique index if not exists uitbetaling_regels_uren_uniek
  on public.uitbetaling_regels (uren_registratie_id) where uren_registratie_id is not null;
create index if not exists uitbetaling_regels_uitbetaling on public.uitbetaling_regels (uitbetaling_id);

-- Ook de regels van een aangemaakte ronde mogen niet verdwijnen: dan zouden de uren weer
-- "uitbetaalbaar" lijken en kon er dubbel worden uitbetaald.
create or replace function public.uitbetaling_regels_niet_verwijderen() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1
    from public.uitbetalingen u
    join public.uitbetaalrondes r on r.id = u.ronde_id
    where u.id = old.uitbetaling_id and r.status <> 'concept'
  ) then
    raise exception 'Regels van een zelffactuur uit een aangemaakte ronde mogen niet worden verwijderd.';
  end if;
  return old;
end $$;
drop trigger if exists uitbetaling_regels_niet_verwijderen on public.uitbetaling_regels;
create trigger uitbetaling_regels_niet_verwijderen
  before delete on public.uitbetaling_regels
  for each row execute function public.uitbetaling_regels_niet_verwijderen();

-- 7. RLS: alleen de service role (de API-routes) mag erbij, zoals bij de andere tabellen.
alter table public.uitbetaalrondes enable row level security;
alter table public.uitbetalingen enable row level security;
alter table public.uitbetaling_regels enable row level security;
drop policy if exists "service_role_only_uitbetaalrondes" on public.uitbetaalrondes;
create policy "service_role_only_uitbetaalrondes" on public.uitbetaalrondes for all to service_role using (true) with check (true);
drop policy if exists "service_role_only_uitbetalingen" on public.uitbetalingen;
create policy "service_role_only_uitbetalingen" on public.uitbetalingen for all to service_role using (true) with check (true);
drop policy if exists "service_role_only_uitbetaling_regels" on public.uitbetaling_regels;
create policy "service_role_only_uitbetaling_regels" on public.uitbetaling_regels for all to service_role using (true) with check (true);

-- 8. Private bucket voor zelffacturen (PDF) en SEPA-bestanden (bevatten IBAN's). Alleen via de
--    service role; de app geeft kortlevende signed URL's uit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uitbetalingen', 'uitbetalingen', false, 10485760, array['application/pdf', 'application/xml'])
on conflict (id) do update set public = false;
drop policy if exists "service_role_uitbetalingen_all" on storage.objects;
create policy "service_role_uitbetalingen_all"
  on storage.objects for all
  to service_role
  using (bucket_id = 'uitbetalingen')
  with check (bucket_id = 'uitbetalingen');

commit;

-- PostgREST het nieuwe schema laten inlezen.
notify pgrst, 'reload schema';

-- Controle achteraf (alleen lezen):
--   select count(*) from public.medewerkers where zelffacturering_akkoord_op is not null;
--   select status, count(*) from public.uitbetaalrondes group by status;
--   select id, public from storage.buckets where id = 'uitbetalingen';
