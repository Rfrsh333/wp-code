-- Portalen + native app (1-10-2026)
--
-- Alles idempotent; de code werkt ook zonder deze migratie (valt dan terug op het oude gedrag),
-- maar pas mét deze migratie werken sessie-intrekking, de dubbele-aanmelding-blokkade,
-- de zelfherstellende bezetting en native push.

-- 1. Sessie-intrekking -------------------------------------------------------------------
-- Tokens met een uitgiftemoment vóór deze tijd worden geweigerd (src/lib/portal-auth.ts).
-- Wordt gezet bij wachtwoord wijzigen/resetten en bij "overal uitloggen".
alter table public.medewerkers add column if not exists sessie_geldig_vanaf timestamptz;
alter table public.klanten     add column if not exists sessie_geldig_vanaf timestamptz;

-- 2. Eén aanmelding per medewerker per dienst --------------------------------------------
-- Alleen aanmaken als er geen dubbelen zijn; anders een melding zodat je ze eerst opruimt.
do $$
begin
  if exists (
    select 1 from public.dienst_aanmeldingen
    group by dienst_id, medewerker_id having count(*) > 1
  ) then
    raise notice 'dienst_aanmeldingen bevat dubbelen (dienst_id, medewerker_id); unieke index NIET aangemaakt. Ruim eerst op met: select dienst_id, medewerker_id, count(*) from dienst_aanmeldingen group by 1,2 having count(*) > 1;';
  else
    create unique index if not exists uq_dienst_aanmeldingen_dienst_medewerker
      on public.dienst_aanmeldingen (dienst_id, medewerker_id);
  end if;
end $$;

-- 3. Bezetting altijd afgeleid van de aanmeldingen ---------------------------------------
-- plekken_beschikbaar werd met losse +1/-1-updates bijgehouden en liep daardoor uit de pas
-- (afmelden verhoogde ook als er niets verwijderd was; 'bevestigd' telde niet mee).
create or replace function public.herbereken_plekken(p_dienst_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.diensten d
     set plekken_beschikbaar = greatest(
           0,
           coalesce(d.plekken_totaal, d.aantal_nodig, 1) - (
             select count(*) from public.dienst_aanmeldingen a
              where a.dienst_id = d.id and a.status in ('geaccepteerd', 'bevestigd')
           )
         )
   where d.id = p_dienst_id;
$$;

revoke all on function public.herbereken_plekken(uuid) from public, anon, authenticated;

create or replace function public.trg_herbereken_plekken()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.herbereken_plekken(old.dienst_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.dienst_id is distinct from old.dienst_id or new.status is distinct from old.status) then
    perform public.herbereken_plekken(new.dienst_id);
  end if;
  return null;
end $$;

revoke all on function public.trg_herbereken_plekken() from public, anon, authenticated;

drop trigger if exists dienst_aanmeldingen_herbereken_plekken on public.dienst_aanmeldingen;
create trigger dienst_aanmeldingen_herbereken_plekken
  after insert or update or delete on public.dienst_aanmeldingen
  for each row execute function public.trg_herbereken_plekken();

-- Eenmalig rechtzetten van alle toekomstige diensten.
select public.herbereken_plekken(id) from public.diensten where datum >= current_date;

-- 4. Native push (Expo → APNs/FCM) -------------------------------------------------------
-- Web-push rijen houden endpoint/p256dh/auth; app-rijen hebben alleen een expo_token.
alter table public.push_subscriptions add column if not exists platform text not null default 'web';
alter table public.push_subscriptions add column if not exists expo_token text;
alter table public.push_subscriptions alter column endpoint drop not null;
alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth drop not null;
create unique index if not exists uq_push_subscriptions_expo_token
  on public.push_subscriptions (expo_token) where expo_token is not null;

-- 5. Factuurnummers uniek ----------------------------------------------------------------
-- De klant-factuurroute probeert bij een botsing (23505) het volgende nummer.
do $$
begin
  if exists (select 1 from public.facturen group by factuur_nummer having count(*) > 1) then
    raise notice 'facturen bevat dubbele factuur_nummer; unieke index NIET aangemaakt.';
  else
    create unique index if not exists uq_facturen_factuur_nummer on public.facturen (factuur_nummer);
  end if;
end $$;
