-- ID-controle via Didit (besluit Rachid, 24-10-2026). Volgens de Autoriteit Persoonsgegevens mag
-- TopTalent van zzp'ers geen kopie van het ID maken. Didit controleert het ID; wij bewaren alleen de
-- uitslag en een paar velden. Bij een goedkeuring (automatisch of door een admin, of na een
-- videocall) komt er een medewerker_documenten-rij id_bewijs ZONDER bestand, zodat de checklist vóór
-- reageren (lib/medewerker/reageer-checklist) ongewijzigd blijft werken.
--
-- Bewust NIET opgeslagen: naam, geboortedatum, documentnummer, persoonsnummer/BSN, adres, beelden en
-- de ruwe webhook-payload.
--
-- De code werkt ook zolang deze migratie niet gedraaid is: de nieuwe routes geven dan 503 en de
-- checklist valt terug op de oude teksten. Alles staat bovendien achter ID_CHECK_DIDIT_ACTIEF=1.
-- Veilig om opnieuw te draaien (if not exists / drop … if exists).

begin;

-- 1. medewerker_documenten: rijen zonder bestand toestaan --------------------------------------------
-- In de oorspronkelijke tabel (supabase-migration-portaal-redesign.sql) waren file_path, file_url en
-- file_size NOT NULL; file_url is al nullable sinds 20261001_medewerker_portaal.sql.
alter table public.medewerker_documenten alter column file_path drop not null;
alter table public.medewerker_documenten alter column file_url drop not null;
alter table public.medewerker_documenten alter column file_size drop not null;

-- Hoe het document is gecontroleerd: null = geüpload bestand (zoals voorheen), 'didit' of 'videocall'.
alter table public.medewerker_documenten add column if not exists verificatie_methode text;
alter table public.medewerker_documenten drop constraint if exists medewerker_documenten_verificatie_methode_check;
alter table public.medewerker_documenten
  add constraint medewerker_documenten_verificatie_methode_check
  check (verificatie_methode is null or verificatie_methode in ('didit', 'videocall'));
comment on column public.medewerker_documenten.verificatie_methode is
  'null = geüpload bestand; didit = gecontroleerd door Didit (geen kopie); videocall = door een admin in een videocall gezien (geen kopie).';

-- Wie het document goedkeurde: "systeem (Didit)" of het e-mailadres van de admin.
alter table public.medewerker_documenten add column if not exists beoordeeld_door text;
comment on column public.medewerker_documenten.beoordeeld_door is
  'Wie het document goedkeurde: "systeem (Didit)" of het e-mailadres van de admin.';

-- Een rij zonder bestand moet een verificatiemethode hebben. NOT VALID: bestaande rijen worden niet
-- opnieuw gecontroleerd, alleen nieuwe en gewijzigde.
alter table public.medewerker_documenten drop constraint if exists medewerker_documenten_bestand_of_methode;
alter table public.medewerker_documenten
  add constraint medewerker_documenten_bestand_of_methode
  check (file_path is not null or file_url is not null or verificatie_methode is not null) not valid;

-- 2. id_verificaties: één rij per ID-controle (Didit-sessie of videocall-verzoek) -------------------
create table if not exists public.id_verificaties (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid not null references public.medewerkers(id) on delete cascade,
  methode text not null default 'didit',
  didit_session_id text,
  didit_sessienummer integer,
  didit_status text,
  status text not null default 'gestart',
  beslissing text,
  beslist_door text,
  beslist_op timestamptz,
  reden text,
  handmatig_redenen text[] not null default '{}',
  vervaldatum date,
  eer boolean,
  naam_komt_overeen boolean,
  documentsoort text,
  uitgifteland text,
  medewerker_document_id uuid references public.medewerker_documenten(id) on delete set null,
  laatste_event_id text,
  sessie_verwijderd_op timestamptz,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

alter table public.id_verificaties drop constraint if exists id_verificaties_methode_check;
alter table public.id_verificaties
  add constraint id_verificaties_methode_check check (methode in ('didit', 'videocall'));
alter table public.id_verificaties drop constraint if exists id_verificaties_status_check;
alter table public.id_verificaties
  add constraint id_verificaties_status_check
  check (status in ('gestart', 'bezig', 'handmatig', 'videocall_gevraagd', 'goedgekeurd', 'afgewezen', 'verlopen'));
alter table public.id_verificaties drop constraint if exists id_verificaties_beslissing_check;
alter table public.id_verificaties
  add constraint id_verificaties_beslissing_check
  check (beslissing is null or beslissing in ('goedgekeurd', 'afgewezen'));
-- Een Didit-controle heeft altijd een sessie-id; een videocall nooit.
alter table public.id_verificaties drop constraint if exists id_verificaties_sessie_check;
alter table public.id_verificaties
  add constraint id_verificaties_sessie_check
  check ((methode = 'didit') = (didit_session_id is not null));
alter table public.id_verificaties drop constraint if exists id_verificaties_uitgifteland_check;
alter table public.id_verificaties
  add constraint id_verificaties_uitgifteland_check
  check (uitgifteland is null or uitgifteland ~ '^[A-Z]{3}$');
alter table public.id_verificaties drop constraint if exists id_verificaties_reden_check;
alter table public.id_verificaties
  add constraint id_verificaties_reden_check check (reden is null or char_length(reden) <= 2000);

-- Eén rij per Didit-sessie (idempotent opslaan + webhook opzoeken). Een gewone unique constraint (geen
-- partiële index): de API gebruikt upsert met on_conflict=didit_session_id. Meerdere NULLs (videocall)
-- mogen.
alter table public.id_verificaties drop constraint if exists id_verificaties_didit_session_id_key;
alter table public.id_verificaties
  add constraint id_verificaties_didit_session_id_key unique (didit_session_id);
-- Hooguit één open videocall-verzoek per medewerker.
create unique index if not exists id_verificaties_een_videocall_verzoek
  on public.id_verificaties (medewerker_id) where status = 'videocall_gevraagd';
-- Nieuwste controle per medewerker.
create index if not exists id_verificaties_medewerker
  on public.id_verificaties (medewerker_id, aangemaakt_op desc);
-- Lijst voor de admin.
create index if not exists id_verificaties_open
  on public.id_verificaties (aangemaakt_op) where status in ('handmatig', 'videocall_gevraagd');

comment on table public.id_verificaties is
  'ID-controles via Didit of videocall. Alleen de uitslag: GEEN naam, geboortedatum, documentnummer, persoonsnummer/BSN, adres, beelden of ruwe payload. Nooit automatisch afgewezen (art. 22 AVG).';
comment on column public.id_verificaties.status is
  'gestart/bezig (Didit loopt), handmatig (een admin moet beslissen), videocall_gevraagd, goedgekeurd, afgewezen (alleen door een mens), verlopen (sessie niet afgerond).';
comment on column public.id_verificaties.didit_status is
  'Laatste sessiestatus van Didit (Not Started, In Progress, Approved, Declined, In Review, Expired, Abandoned, ...).';
comment on column public.id_verificaties.handmatig_redenen is
  'Waarom niet automatisch goedgekeurd: didit_in_review, didit_declined, verlopen, naam_anders, niet_eer, ... (lib/id-check/regels).';
comment on column public.id_verificaties.eer is
  'Nationaliteit binnen EER of Zwitserland (de nationaliteit zelf bewaren we niet). Null = onbekend.';
comment on column public.id_verificaties.naam_komt_overeen is
  'Naam op het document komt overeen met medewerkers.naam (de naam zelf bewaren we niet).';
comment on column public.id_verificaties.uitgifteland is
  'Land dat het document uitgaf (ISO 3166-1 alpha-3).';
comment on column public.id_verificaties.sessie_verwijderd_op is
  'Wanneer de sessie (met beelden) bij Didit is verwijderd na de definitieve beslissing.';

-- 3. RLS: alleen de service role (de API-routes), zoals bij de andere tabellen.
alter table public.id_verificaties enable row level security;
revoke all on public.id_verificaties from anon, authenticated;
drop policy if exists "service_role_only_id_verificaties" on public.id_verificaties;
create policy "service_role_only_id_verificaties" on public.id_verificaties
  for all to service_role using (true) with check (true);

commit;

-- PostgREST het nieuwe schema laten inlezen.
notify pgrst, 'reload schema';

-- Controle achteraf (alleen lezen):
--   select status, count(*) from public.id_verificaties group by status;
--   select verificatie_methode, count(*) from public.medewerker_documenten
--     where document_type = 'id_bewijs' group by verificatie_methode;
