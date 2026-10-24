-- Nawerk documenten (vervolg op 20261024_id_wav_kopieen.sql). Twee kleine tabellen, los van elkaar:
--
-- 1. document_verval_meldingen: welke vervalmail al is verstuurd (api/cron/document-expiry).
--    De cron draait elke dag en mailde een werknemer tot 30 dagen achter elkaar over hetzelfde
--    document, ook over oude, al vervangen versies. Nu gaat per document hooguit één mail per
--    mijlpaal (30 dagen vooraf, 7 dagen vooraf, net verlopen); hier staat welke al is verstuurd.
--    email_log is daarvoor niet bruikbaar (alleen kandidaatmails, geen verwijzing naar het document).
--    Zonder deze tabel mailt de cron alleen op de dag van de mijlpaal zelf.
--
-- 2. bewaarde_documenten: bestanden die het verwijderen van een werknemersaccount overleven omdat de
--    privacyverklaring er een bewaartermijn voor noemt (paragraaf 6): loonbelastingverklaring
--    (5 jaar na einde dienstverband) en contract (arbeidsovereenkomst/personeelsdossier: 2 jaar na
--    einde dienstverband). medewerker_documenten heeft on delete cascade, dus zonder deze tabel
--    bleef zo'n bestand zonder verwijzing in de opslag staan. Net als id_wav_kopieen:
--    - vlak vóór het verwijderen (lib/medewerker/account-bestanden) komt hier per bestand een rij
--      met het opslagpad en bewaar_tot; het bestand blijft staan. Andere documenten (VOG, KvK,
--      werkvergunning, enz.) en de profielfoto verwijdert de code na het verwijderen van het account;
--    - medewerker_id wordt null als het account weg is (on delete set null);
--    - na bewaar_tot verwijdert de retentie-cron bestand en rij (api/cron/retentie).
--    Zonder deze tabel wordt het verwijderen van een account mét zo'n bestand geweigerd (met een
--    melding), zodat het bestand niet ongemerkt zonder verwijzing achterblijft.
--
-- Veilig om opnieuw te draaien (if not exists / drop … if exists).

begin;

-- 1. Verstuurde vervalmails ------------------------------------------------------------------------

create table if not exists public.document_verval_meldingen (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid not null references public.medewerkers(id) on delete cascade,
  bron text not null,
  bron_id uuid not null,
  vervaldatum date not null,
  mijlpaal text not null,
  verstuurd_op timestamptz not null default now()
);

alter table public.document_verval_meldingen drop constraint if exists document_verval_meldingen_bron_check;
alter table public.document_verval_meldingen
  add constraint document_verval_meldingen_bron_check
  check (bron in ('medewerker_document', 'certificering', 'werkvergunning'));
alter table public.document_verval_meldingen drop constraint if exists document_verval_meldingen_mijlpaal_check;
alter table public.document_verval_meldingen
  add constraint document_verval_meldingen_mijlpaal_check
  check (mijlpaal in ('30_dagen', '7_dagen', 'verlopen'));
-- Eén mail per document, vervaldatum en mijlpaal (de cron legt de mijlpaal vast vóór het versturen).
alter table public.document_verval_meldingen drop constraint if exists document_verval_meldingen_uniek;
alter table public.document_verval_meldingen
  add constraint document_verval_meldingen_uniek unique (bron, bron_id, vervaldatum, mijlpaal);

create index if not exists document_verval_meldingen_medewerker on public.document_verval_meldingen (medewerker_id);

comment on table public.document_verval_meldingen is
  'Welke vervalmail (mijlpaal 30_dagen, 7_dagen of verlopen) per document al is verstuurd door api/cron/document-expiry. Gaat mee weg met het account.';
comment on column public.document_verval_meldingen.bron_id is
  'id uit medewerker_documenten of certificeringen; bij werkvergunning het id van de medewerker (medewerkers.werkvergunning_geldig_tot).';

alter table public.document_verval_meldingen enable row level security;
revoke all on public.document_verval_meldingen from anon, authenticated;
drop policy if exists "service_role_only_document_verval_meldingen" on public.document_verval_meldingen;
create policy "service_role_only_document_verval_meldingen" on public.document_verval_meldingen
  for all to service_role using (true) with check (true);

-- 2. Bewaarde documenten van verwijderde accounts -------------------------------------------------

create table if not exists public.bewaarde_documenten (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid references public.medewerkers(id) on delete set null,
  document_type text not null,
  naam text,
  bucket text not null default 'medewerker-documenten',
  bestand_pad text not null,
  geupload_op timestamptz,
  einde_dienstverband date,
  bewaar_tot date not null,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

-- Eén rij per bestand (de code schrijft met upsert on_conflict=bucket,bestand_pad).
alter table public.bewaarde_documenten drop constraint if exists bewaarde_documenten_bestand_key;
alter table public.bewaarde_documenten
  add constraint bewaarde_documenten_bestand_key unique (bucket, bestand_pad);
alter table public.bewaarde_documenten drop constraint if exists bewaarde_documenten_naam_check;
alter table public.bewaarde_documenten
  add constraint bewaarde_documenten_naam_check check (naam is null or char_length(naam) <= 200);

create index if not exists bewaarde_documenten_bewaar_tot on public.bewaarde_documenten (bewaar_tot);
create index if not exists bewaarde_documenten_medewerker on public.bewaarde_documenten (medewerker_id);

comment on table public.bewaarde_documenten is
  'Bestanden van verwijderde werknemersaccounts met een bewaartermijn uit de privacyverklaring (loonheffingsverklaring 5 jaar, contract 2 jaar na einde dienstverband). Het bestand blijft tot bewaar_tot; daarna verwijdert de retentie-cron bestand en rij. ID-kopieën staan in id_wav_kopieen, niet hier.';
comment on column public.bewaarde_documenten.medewerker_id is
  'De werknemer; null nadat het account is verwijderd. Zolang hij gevuld is, hoort het bestand nog bij de documentrij in medewerker_documenten.';
comment on column public.bewaarde_documenten.naam is
  'Naam uit het profiel op het moment van verwijderen, om het document terug te vinden.';
comment on column public.bewaarde_documenten.einde_dienstverband is
  'Laatste dienst of datum uit dienst (zonder beide: de dag van verwijderen); de termijn loopt vanaf hier.';

alter table public.bewaarde_documenten enable row level security;
revoke all on public.bewaarde_documenten from anon, authenticated;
drop policy if exists "service_role_only_bewaarde_documenten" on public.bewaarde_documenten;
create policy "service_role_only_bewaarde_documenten" on public.bewaarde_documenten
  for all to service_role using (true) with check (true);

commit;

-- PostgREST het nieuwe schema laten inlezen.
notify pgrst, 'reload schema';

-- Controle achteraf (alleen lezen):
--   select mijlpaal, count(*) from public.document_verval_meldingen group by 1;
--   select document_type, count(*), count(medewerker_id) as met_account, min(bewaar_tot), max(bewaar_tot)
--     from public.bewaarde_documenten group by 1;
