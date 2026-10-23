-- Uitgebreid reageren op een dienst (23-10-2026, besluiten Rachid).
--
-- 1. Dienst: kledingvoorschrift en pauze als eigen velden (notities blijven "opmerkingen").
-- 2. Reactie (dienst_aanmeldingen): tegenbod op het uurtarief, eigen tijden binnen de dienst,
--    motivatie, akkoord op het kledingvoorschrift en "automatisch intrekken X uur voor de start".
--
-- Rekenregel tegenbod: `voorgesteld_uurtarief` is wat de MEDEWERKER per uur krijgt. De werkgever
-- betaalt voor die medewerker voorgesteld_uurtarief + € 4 (marge, lib/medewerker/uren-regels).
-- Zonder voorstel (null) geldt het uurtarief van de dienst, zoals voorheen.
--
-- Automatisch intrekken: status blijft een bestaande status. De cron /api/cron/reacties-intrekken
-- zet een verlopen reactie op `geannuleerd` met annuleer_reden = 'automatisch_ingetrokken';
-- `geannuleerd` staat in HERACTIVEERBAAR (lib/medewerker/dienst-regels.ts), dus opnieuw reageren
-- kan daarna. Tot de cron draait sluit de code een verlopen reactie al uit (lazy check).
--
-- De code werkt ook zolang deze migratie nog niet gedraaid is (42703/PGRST204 wordt afgevangen):
-- dan is reageren zoals voorheen (alleen dienst_id) en wordt een reactie mét voorstel geweigerd
-- met code `uitgebreid_reageren_niet_beschikbaar` in plaats van het voorstel stil te negeren.
--
-- Veilig om opnieuw te draaien (if not exists / drop constraint if exists). CHECK-constraints
-- NOT VALID: bestaande rijen worden niet opnieuw gecontroleerd.

begin;

-- 1. Diensten -----------------------------------------------------------------------------
alter table public.diensten add column if not exists kledingvoorschrift text;
alter table public.diensten add column if not exists pauze_minuten integer;

comment on column public.diensten.kledingvoorschrift is
  'Kledingvoorschrift van de werkgever. Bij een waarde moet de medewerker bij reageren akkoord geven.';
comment on column public.diensten.pauze_minuten is
  'Pauze in minuten (onbetaald). Telt mee in de verdiensten-schatting en wordt vooringevuld bij uren.';

alter table public.diensten drop constraint if exists diensten_pauze_minuten_check;
alter table public.diensten
  add constraint diensten_pauze_minuten_check
  check (pauze_minuten is null or (pauze_minuten >= 0 and pauze_minuten <= 240)) not valid;

alter table public.diensten drop constraint if exists diensten_kledingvoorschrift_lengte_check;
alter table public.diensten
  add constraint diensten_kledingvoorschrift_lengte_check
  check (kledingvoorschrift is null or char_length(kledingvoorschrift) <= 500) not valid;

-- 2. Reacties (dienst_aanmeldingen) -----------------------------------------------------------
alter table public.dienst_aanmeldingen add column if not exists voorgesteld_uurtarief numeric(10,2);
alter table public.dienst_aanmeldingen add column if not exists voorgestelde_start_tijd time;
alter table public.dienst_aanmeldingen add column if not exists voorgestelde_eind_tijd time;
alter table public.dienst_aanmeldingen add column if not exists motivatie text;
alter table public.dienst_aanmeldingen add column if not exists kleding_akkoord_op timestamptz;
alter table public.dienst_aanmeldingen add column if not exists auto_intrekken_uren smallint;
alter table public.dienst_aanmeldingen add column if not exists annuleer_reden text;

comment on column public.dienst_aanmeldingen.voorgesteld_uurtarief is
  'Tegenbod: wat de medewerker per uur krijgt. Werkgever betaalt dit + € 4. Null = tarief van de dienst.';
comment on column public.dienst_aanmeldingen.voorgestelde_start_tijd is
  'Eigen begintijd binnen de dienst (samen met voorgestelde_eind_tijd). Null = hele dienst.';
comment on column public.dienst_aanmeldingen.voorgestelde_eind_tijd is
  'Eigen eindtijd binnen de dienst (samen met voorgestelde_start_tijd). Null = hele dienst.';
comment on column public.dienst_aanmeldingen.motivatie is
  'Waarom de werkgever deze medewerker moet kiezen (optioneel, max. 500 tekens).';
comment on column public.dienst_aanmeldingen.kleding_akkoord_op is
  'Moment waarop de medewerker akkoord gaf op het kledingvoorschrift van de dienst.';
comment on column public.dienst_aanmeldingen.auto_intrekken_uren is
  'Reactie vervalt als de medewerker zoveel uur (12, 24 of 48) voor de dienststart nog niet gekozen is.';
comment on column public.dienst_aanmeldingen.annuleer_reden is
  'Waarom de aanmelding geannuleerd is, bv. automatisch_ingetrokken (cron reacties-intrekken).';

alter table public.dienst_aanmeldingen drop constraint if exists dienst_aanmeldingen_voorgesteld_uurtarief_check;
alter table public.dienst_aanmeldingen
  add constraint dienst_aanmeldingen_voorgesteld_uurtarief_check
  check (voorgesteld_uurtarief is null or (voorgesteld_uurtarief > 0 and voorgesteld_uurtarief <= 1000)) not valid;

alter table public.dienst_aanmeldingen drop constraint if exists dienst_aanmeldingen_voorgestelde_tijden_check;
alter table public.dienst_aanmeldingen
  add constraint dienst_aanmeldingen_voorgestelde_tijden_check
  check ((voorgestelde_start_tijd is null) = (voorgestelde_eind_tijd is null)) not valid;

alter table public.dienst_aanmeldingen drop constraint if exists dienst_aanmeldingen_motivatie_lengte_check;
alter table public.dienst_aanmeldingen
  add constraint dienst_aanmeldingen_motivatie_lengte_check
  check (motivatie is null or char_length(motivatie) <= 500) not valid;

alter table public.dienst_aanmeldingen drop constraint if exists dienst_aanmeldingen_auto_intrekken_uren_check;
alter table public.dienst_aanmeldingen
  add constraint dienst_aanmeldingen_auto_intrekken_uren_check
  check (auto_intrekken_uren is null or auto_intrekken_uren in (12, 24, 48)) not valid;

-- Voor de cron: alleen open reacties met automatisch intrekken.
create index if not exists idx_dienst_aanmeldingen_auto_intrekken
  on public.dienst_aanmeldingen (dienst_id)
  where status = 'aangemeld' and auto_intrekken_uren is not null;

commit;

-- Controle achteraf (alleen lezen):
--   select count(*) filter (where voorgesteld_uurtarief is not null)  as met_tegenbod,
--          count(*) filter (where voorgestelde_start_tijd is not null) as met_eigen_tijden,
--          count(*) filter (where auto_intrekken_uren is not null)     as met_auto_intrekken
--   from public.dienst_aanmeldingen;
