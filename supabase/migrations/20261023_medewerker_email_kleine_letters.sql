-- B4 (onboarding medewerker, 23-10-2026): e-mailadressen van medewerkers in kleine letters.
--
-- Login (web + /api/app/login) en wachtwoord-reset zochten op `email = lower(invoer)`, maar de
-- inschrijving bewaarde het adres zoals het werd getypt. "Jan@Gmail.com" kon zo nooit inloggen
-- en kreeg geen resetmail. De code zoekt nu hoofdletterongevoelig en slaat nieuwe adressen klein
-- op; deze migratie zet de bestaande medewerkers recht en houdt het zo (trigger + unieke index).
--
-- Volgorde: in één transactie. Stap 1 stopt met een foutmelding als er medewerkers zijn met
-- hetzelfde adres dat alleen in hoofdletters verschilt (twee accounts voor één persoon). Dan
-- wordt er niets gewijzigd. Los die eerst met de hand op (één account houden of het adres van
-- de ander aanpassen) en draai de migratie opnieuw. Controlequery:
--
--   select lower(trim(email)) as adres, array_agg(id) as ids, array_agg(status) as statussen
--   from public.medewerkers
--   where email is not null and trim(email) <> ''
--   group by lower(trim(email)) having count(*) > 1;
--
-- Bewust NIET voor `inschrijvingen`: de statuslink in de kandidaatmails is een hash over het
-- opgeslagen adres (lib/candidate-onboarding.ts generateStatusToken). Kleine letters maken van
-- bestaande statuslinks dode links. De code zoekt in inschrijvingen al hoofdletterongevoelig,
-- en nieuwe inschrijvingen komen klein binnen.

begin;

-- 1. Eerst controleren op dubbelen (los van hoofdletters en spaties).
do $$
declare
  dubbelen text;
begin
  select string_agg(d.adres || ' (' || d.aantal || 'x)', ', ')
    into dubbelen
  from (
    select lower(trim(m.email)) as adres, count(*) as aantal
    from public.medewerkers m
    where m.email is not null and trim(m.email) <> ''
    group by lower(trim(m.email))
    having count(*) > 1
  ) d;

  if dubbelen is not null then
    raise exception 'Medewerkers met hetzelfde e-mailadres (los van hoofdletters): %. Los dit eerst op; er is niets gewijzigd.', dubbelen;
  end if;
end $$;

-- 2. Bestaande adressen klein en getrimd.
update public.medewerkers
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

-- 3. Nieuwe en gewijzigde adressen altijd klein, ook via routes die het zelf vergeten.
create or replace function public.medewerker_email_klein()
returns trigger
language plpgsql
as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
  end if;
  return new;
end;
$$;

drop trigger if exists medewerkers_email_klein on public.medewerkers;
create trigger medewerkers_email_klein
  before insert or update of email on public.medewerkers
  for each row execute function public.medewerker_email_klein();

-- 4. Eén account per adres (lege adressen tellen niet mee).
create unique index if not exists medewerkers_email_klein_uniek
  on public.medewerkers (lower(email))
  where email is not null and email <> '';

commit;
