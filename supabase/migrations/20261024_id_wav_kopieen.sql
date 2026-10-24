-- Wav-kopie van het ID bewaren na het verwijderen van een account (privacyverklaring 2.6, 10f).
-- Vervolg op 20261024_id_verificaties_didit.sql en 20261024_id_controlerecord_wav.sql; die moeten
-- eerst gedraaid zijn.
--
-- Komt een werknemer van buiten de EER/Zwitserland, dan vraagt de Wet arbeid vreemdelingen (art. 15)
-- om een kopie van zijn ID. Die staat als `medewerker_documenten`-rij (id_bewijs, kopie_wav) met een
-- bestand in de bucket medewerker-documenten. Privacy 2.6 belooft: "Wij bewaren de kopie beveiligd,
-- tot 31 december van het vijfde jaar na het jaar waarin uw werk via TopTalent eindigde." Maar
-- medewerker_documenten heeft on delete cascade: bij het verwijderen van het account verdween de rij
-- en bleef het bestand zonder verwijzing in de opslag achter (nooit meer opgeruimd).
--
-- Deze tabel houdt de verwijzing naar zo'n kopie vast als het account verdwijnt:
-- - vlak vóór het verwijderen (lib/id-check/bewaartermijn, bereidIdGegevensVoorAccountVerwijderen)
--   komt hier per Wav-kopie een rij met het opslagpad en bewaar_tot (31-12 van jaar laatste dienst + 5);
--   het bestand blijft staan. Kopieën van EER/Zwitserse werknemers komen hier nooit: die verwijdert de
--   code bij het verwijderen van het account;
-- - medewerker_id wordt null als het account weg is (on delete set null); id_verificatie_id wijst naar
--   het controlerecord (id_verificaties) van dezelfde werknemer, zolang dat bestaat;
-- - na bewaar_tot verwijdert de retentie-cron het bestand en de rij (api/cron/retentie).
--
-- De code werkt ook zolang deze migratie niet gedraaid is: alleen het verwijderen van een account
-- mét een Wav-kopie wordt dan geweigerd (met een melding), zodat de kopie niet ongemerkt verdwijnt.
-- Veilig om opnieuw te draaien (if not exists / drop … if exists).

begin;

create table if not exists public.id_wav_kopieen (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid references public.medewerkers(id) on delete set null,
  id_verificatie_id uuid references public.id_verificaties(id) on delete set null,
  naam text,
  bestand_pad text not null,
  vervaldatum date,
  geupload_op timestamptz,
  bewaar_tot date not null,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

-- Eén rij per bestand (de code schrijft met upsert on_conflict=bestand_pad).
alter table public.id_wav_kopieen drop constraint if exists id_wav_kopieen_bestand_pad_key;
alter table public.id_wav_kopieen
  add constraint id_wav_kopieen_bestand_pad_key unique (bestand_pad);
alter table public.id_wav_kopieen drop constraint if exists id_wav_kopieen_naam_check;
alter table public.id_wav_kopieen
  add constraint id_wav_kopieen_naam_check check (naam is null or char_length(naam) <= 200);

create index if not exists id_wav_kopieen_bewaar_tot on public.id_wav_kopieen (bewaar_tot);

comment on table public.id_wav_kopieen is
  'Wav-kopieën (art. 15) van het ID van werknemers van buiten de EER/Zwitserland waarvan het account is verwijderd. Het bestand staat in de bucket medewerker-documenten (bestand_pad) en blijft tot bewaar_tot; daarna verwijdert de retentie-cron bestand en rij. Nooit kopieën van EER/Zwitserse werknemers. Niet voor horecazaken.';
comment on column public.id_wav_kopieen.medewerker_id is
  'De werknemer; null nadat het account is verwijderd. Zolang hij gevuld is, hoort het bestand nog bij de documentrij in medewerker_documenten.';
comment on column public.id_wav_kopieen.id_verificatie_id is
  'Het controlerecord (id_verificaties) van dezelfde werknemer met een nationaliteit buiten de EER, als dat er is.';
comment on column public.id_wav_kopieen.naam is
  'Naam uit het profiel op het moment van verwijderen, om de kopie terug te vinden als de Arbeidsinspectie erom vraagt.';
comment on column public.id_wav_kopieen.bestand_pad is
  'Pad in de bucket medewerker-documenten.';
comment on column public.id_wav_kopieen.bewaar_tot is
  'Bewaren tot en met deze datum: 31-12 van (jaar laatste dienst + 5), vastgelegd bij het verwijderen van het account. Daarna verwijdert de retentie-cron bestand en rij.';

-- RLS: alleen de service role (de API-routes en crons), zoals id_verificaties.
alter table public.id_wav_kopieen enable row level security;
revoke all on public.id_wav_kopieen from anon, authenticated;
drop policy if exists "service_role_only_id_wav_kopieen" on public.id_wav_kopieen;
create policy "service_role_only_id_wav_kopieen" on public.id_wav_kopieen
  for all to service_role using (true) with check (true);

commit;

-- PostgREST het nieuwe schema laten inlezen.
notify pgrst, 'reload schema';

-- Controle achteraf (alleen lezen):
--   select count(*), count(medewerker_id) as met_account, min(bewaar_tot), max(bewaar_tot)
--     from public.id_wav_kopieen;
--   select confdeltype from pg_constraint
--     where conrelid = 'public.id_wav_kopieen'::regclass and contype = 'f'; -- 'n' = set null
