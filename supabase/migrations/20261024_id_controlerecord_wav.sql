-- Controlerecord van de ID-controle volgens het juridisch advies (24-10-2026). Vervolg op
-- 20261024_id_verificaties_didit.sql; die moet eerst gedraaid zijn.
--
-- 1. id_verificaties wordt het minimale controlerecord dat de Wav vraagt (art. 15a: de
--    Arbeidsinspectie kan binnen 48 uur identificatie vragen, ook over eerdere werkers): naam en
--    geboortedatum zoals op het document, nationaliteit (ISO 3166-1 alpha-3), documentsoort,
--    vervaldatum en de uitslag (+ wie en wanneer). Plus het documentnummer: niet in de minimale lijst
--    van de jurist, door Rachid bewust toegevoegd als extra bewijs welk document is gecontroleerd
--    (AP: gegevens van het document overnemen mag). Nooit het BSN/persoonsnummer, beelden of payload.
-- 2. Bewaren tot 31-12 van (jaar laatste dienst + 5); zonder diensten vanaf het jaar van de beslissing
--    (kolom bewaar_tot, bijgehouden door de retentie-cron). Het record moet een accountverwijdering
--    overleven: medewerker_id wordt nullable met on delete set null (was: not null + cascade).
-- 3. Nieuwe methode 'kopie' (record vastgelegd bij het opschonen van een oude ID-kopie) en nieuwe
--    verificatie_methode-waarden voor medewerker_documenten: 'kopie_verwijderd' (oude kopie
--    opgeschoond, goedkeuring + vervaldatum blijven) en 'kopie_wav' (kopie bewust bewaard: buiten de
--    EER/Zwitserland, Wav art. 15).
--
-- De code werkt ook zolang deze migratie niet gedraaid is: het schrijft dan zonder de nieuwe kolommen
-- (zoals vóór het advies) en de opschoontool meldt dat de migratie ontbreekt.
-- Veilig om opnieuw te draaien (if not exists / drop … if exists / where … is null).

begin;

-- 1. id_verificaties: controlerecord --------------------------------------------------------------
alter table public.id_verificaties add column if not exists naam text;
alter table public.id_verificaties add column if not exists geboortedatum date;
alter table public.id_verificaties add column if not exists nationaliteit text;
alter table public.id_verificaties add column if not exists documentnummer text;
alter table public.id_verificaties add column if not exists bewaar_tot date;

alter table public.id_verificaties drop constraint if exists id_verificaties_naam_check;
alter table public.id_verificaties
  add constraint id_verificaties_naam_check check (naam is null or char_length(naam) <= 200);
alter table public.id_verificaties drop constraint if exists id_verificaties_nationaliteit_check;
alter table public.id_verificaties
  add constraint id_verificaties_nationaliteit_check check (nationaliteit is null or nationaliteit ~ '^[A-Z]{3}$');
-- Documentnummer zoals op het document: hoofdletters en cijfers, geen spaties.
alter table public.id_verificaties drop constraint if exists id_verificaties_documentnummer_check;
alter table public.id_verificaties
  add constraint id_verificaties_documentnummer_check check (documentnummer is null or documentnummer ~ '^[A-Z0-9]{5,20}$');

-- Methode: + 'kopie' (record vastgelegd bij het opschonen van een oude kopie).
alter table public.id_verificaties drop constraint if exists id_verificaties_methode_check;
alter table public.id_verificaties
  add constraint id_verificaties_methode_check check (methode in ('didit', 'videocall', 'kopie'));

-- 2. medewerker_id: nullable + on delete set null --------------------------------------------------
alter table public.id_verificaties alter column medewerker_id drop not null;
do $$
declare
  fk record;
begin
  -- De oorspronkelijke foreign key (on delete cascade) weghalen, hoe hij ook heet.
  for fk in
    select con.conname
      from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
     where con.conrelid = 'public.id_verificaties'::regclass
       and con.contype = 'f'
       and con.confrelid = 'public.medewerkers'::regclass
       and att.attname = 'medewerker_id'
  loop
    execute format('alter table public.id_verificaties drop constraint %I', fk.conname);
  end loop;
end $$;
alter table public.id_verificaties
  add constraint id_verificaties_medewerker_id_fkey
  foreign key (medewerker_id) references public.medewerkers(id) on delete set null;

-- Bestaande rijen: bewaar_tot = 31-12 van (jaar laatste dienst + 5), zonder diensten vanaf het jaar
-- van de beslissing (of het aanmaken). Laatste dienst = ingepland of voltooid, tot en met vandaag.
-- De retentie-cron rekent dit daarna elke nacht opnieuw uit (lib/id-check/bewaartermijn).
update public.id_verificaties v
   set bewaar_tot = make_date(
         coalesce(
           (select extract(year from max(d.datum))::int
              from public.dienst_aanmeldingen a
              join public.diensten d on d.id = a.dienst_id
             where a.medewerker_id = v.medewerker_id
               and a.status in ('geaccepteerd', 'bevestigd', 'voltooid')
               and d.datum <= (now() at time zone 'Europe/Amsterdam')::date),
           extract(year from (coalesce(v.beslist_op, v.aangemaakt_op) at time zone 'Europe/Amsterdam'))::int
         ) + 5, 12, 31)
 where v.bewaar_tot is null;

create index if not exists id_verificaties_bewaar_tot
  on public.id_verificaties (bewaar_tot) where bewaar_tot is not null;

comment on table public.id_verificaties is
  'ID-controles via Didit, videocall of een opgeschoonde kopie: het controlerecord (juridisch advies 24-10-2026, Wav art. 15a). Naam en geboortedatum zoals op het document, nationaliteit, documentsoort, documentnummer, vervaldatum, uitslag, wie en wanneer. GEEN BSN/persoonsnummer, adres, beelden of ruwe payload. Bewaren tot bewaar_tot (31-12 van jaar laatste dienst + 5); blijft bestaan als het account wordt verwijderd (medewerker_id wordt null). Nooit automatisch afgewezen (art. 22 AVG).';
comment on column public.id_verificaties.medewerker_id is
  'De werknemer; null nadat het account is verwijderd (het record blijft tot bewaar_tot).';
comment on column public.id_verificaties.methode is
  'didit, videocall, of kopie (vastgelegd bij het opschonen van een oude ID-kopie).';
comment on column public.id_verificaties.naam is
  'Naam zoals op het document (Didit: voornamen + achternaam; videocall/kopie: ingevuld door de admin).';
comment on column public.id_verificaties.geboortedatum is
  'Geboortedatum zoals op het document.';
comment on column public.id_verificaties.nationaliteit is
  'Nationaliteit, ISO 3166-1 alpha-3 (NLD, DEU, ...).';
comment on column public.id_verificaties.documentnummer is
  'Documentnummer van het gecontroleerde document (extra bewijs, besluit Rachid). Nooit het BSN/persoonsnummer: de code weigert een nummer van alleen cijfers bij een Nederlands document.';
comment on column public.id_verificaties.bewaar_tot is
  'Bewaren tot en met deze datum: 31-12 van (jaar laatste dienst + 5), zonder diensten vanaf het jaar van de beslissing (Wav). Daarna verwijdert de retentie-cron het record.';
comment on column public.id_verificaties.eer is
  'Nationaliteit binnen EER of Zwitserland. Null = onbekend.';
comment on column public.id_verificaties.naam_komt_overeen is
  'Naam op het document komt overeen met medewerkers.naam (automatische vergelijking bij Didit).';
comment on column public.id_verificaties.handmatig_redenen is
  'Waarom niet automatisch goedgekeurd: didit_in_review, didit_declined, verlopen, naam_anders, niet_eer, kopie_nodig, ... (lib/id-check/regels).';

-- 3. medewerker_documenten: verificatie_methode + kopie_verwijderd, kopie_wav ----------------------
alter table public.medewerker_documenten drop constraint if exists medewerker_documenten_verificatie_methode_check;
alter table public.medewerker_documenten
  add constraint medewerker_documenten_verificatie_methode_check
  check (verificatie_methode is null or verificatie_methode in ('didit', 'videocall', 'kopie_verwijderd', 'kopie_wav'));
comment on column public.medewerker_documenten.verificatie_methode is
  'null = geüpload bestand; didit/videocall = gecontroleerd zonder kopie; kopie_verwijderd = oude kopie opgeschoond (goedkeuring en vervaldatum blijven, bestand weg); kopie_wav = kopie bewust bewaard (nationaliteit buiten EER/Zwitserland, Wav art. 15, tot bewaar_tot).';

commit;

-- PostgREST het nieuwe schema laten inlezen.
notify pgrst, 'reload schema';

-- Controle achteraf (alleen lezen):
--   select methode, status, count(*), count(naam) as met_naam, min(bewaar_tot), max(bewaar_tot)
--     from public.id_verificaties group by 1, 2;
--   select confdeltype from pg_constraint where conname = 'id_verificaties_medewerker_id_fkey'; -- 'n' = set null
--   select verificatie_methode, count(*) from public.medewerker_documenten
--     where document_type = 'id_bewijs' group by 1;
