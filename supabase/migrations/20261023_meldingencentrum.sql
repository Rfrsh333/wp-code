-- Stap 5 "Meldingencentrum zoals YoungOnes" (23-10-2026): elke push wordt ook een melding die de
-- medewerker of werkgever terugziet in het portaal en de app, ook zonder pushabonnement.
--
-- Tabel meldingen: één rij per ontvanger per melding.
--   user_type   'medewerker' | 'klant' (zelfde waarden als push_subscriptions.user_type)
--   user_id     id uit medewerkers of klanten (geen foreign key: de tabel hoort bij twee tabellen;
--               de triggers onderaan wissen de meldingen als het account echt verwijderd wordt)
--   categorie   'diensten' | 'uren_geld' | 'account' (tabs Alles / Diensten / Uren & geld)
--   titel, tekst, url (relatief pad, zelfde als `url` in de push)
--   gelezen_op  null = ongelezen
--   sleutels    waar de melding over gaat (bv. 'dienst_<uuid>'), om dubbele kaarten binnen een kort
--               venster te voorkomen (uitnodiging of aanbieding vervangt "nieuwe dienst"); null = geen
-- Bewaartermijn 90 dagen: de dagelijkse cron /api/cron/meldingen-opruimen verwijdert oudere rijen
-- (privacyverklaring, paragraaf 6).
--
-- Alleen service_role (alle toegang loopt via de API met supabaseAdmin).
-- De code werkt ook zolang deze migratie niet gedraaid is (42P01/PGRST205): dan worden er geen
-- meldingen opgeslagen, gaan pushes gewoon door en geeft de API `beschikbaar: false`.
-- Veilig om opnieuw te draaien (if not exists / or replace / drop … if exists).

begin;

create table if not exists public.meldingen (
  id uuid primary key default gen_random_uuid(),
  user_type text not null check (user_type in ('medewerker', 'klant')),
  user_id uuid not null,
  categorie text not null check (categorie in ('diensten', 'uren_geld', 'account')),
  titel text not null check (char_length(titel) between 1 and 200),
  tekst text not null default '' check (char_length(tekst) <= 1000),
  url text check (url is null or (char_length(url) <= 500 and url like '/%' and url not like '//%')),
  gelezen_op timestamptz,
  sleutels text[] check (sleutels is null or cardinality(sleutels) <= 50),
  created_at timestamptz not null default now()
);

comment on table public.meldingen is
  'Meldingencentrum (portaal en app): elke push is ook een melding, ook zonder pushabonnement. Bewaard 90 dagen (cron meldingen-opruimen).';
comment on column public.meldingen.user_id is
  'medewerkers.id of klanten.id, afhankelijk van user_type.';
comment on column public.meldingen.url is
  'Relatief pad waar de kaart naartoe gaat (zelfde als de url in de push), of null.';
comment on column public.meldingen.gelezen_op is
  'Wanneer de melding gelezen is; null = ongelezen.';
comment on column public.meldingen.sleutels is
  'Waar de melding over gaat (bv. dienst_<uuid>), voor het ontdubbelen van kaarten binnen een kort venster.';

-- Lijst per gebruiker, nieuwste eerst (cursor op created_at + id).
create index if not exists idx_meldingen_gebruiker
  on public.meldingen (user_type, user_id, created_at desc, id desc);
-- Badge: ongelezen per gebruiker en categorie.
create index if not exists idx_meldingen_ongelezen
  on public.meldingen (user_type, user_id, categorie) where gelezen_op is null;
-- Opruimen na 90 dagen.
create index if not exists idx_meldingen_created_at
  on public.meldingen (created_at);

alter table public.meldingen enable row level security;
revoke all on public.meldingen from anon, authenticated;
drop policy if exists "service_role_only" on public.meldingen;
create policy "service_role_only" on public.meldingen
  for all to service_role using (true) with check (true);

-- Account echt verwijderd (admin verwijdert een medewerker, of een klantrij wordt gewist): meldingen mee.
-- Bij het anonimiseren van een klantaccount wist de API ze zelf (api/klant/account/verwijderen).
create or replace function public.meldingen_wis_bij_verwijderen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.meldingen where user_type = tg_argv[0] and user_id = old.id;
  return old;
end;
$$;

revoke all on function public.meldingen_wis_bij_verwijderen() from public, anon, authenticated;

drop trigger if exists meldingen_wis_bij_verwijderen on public.medewerkers;
create trigger meldingen_wis_bij_verwijderen
  after delete on public.medewerkers
  for each row execute function public.meldingen_wis_bij_verwijderen('medewerker');

drop trigger if exists meldingen_wis_bij_verwijderen on public.klanten;
create trigger meldingen_wis_bij_verwijderen
  after delete on public.klanten
  for each row execute function public.meldingen_wis_bij_verwijderen('klant');

commit;

-- Controle achteraf (alleen lezen):
--   select user_type, categorie, count(*), count(*) filter (where gelezen_op is null) as ongelezen
--   from public.meldingen group by 1, 2 order by 1, 2;
--   select min(created_at) from public.meldingen;  -- na de eerste cron-run niet ouder dan 90 dagen
