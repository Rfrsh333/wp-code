-- Review-fixes portalen (2-10-2026)
--
-- Idempotent. Draai NA de migraties 20261001_*.sql. De code werkt ook zonder deze migratie.

-- 1. Dubbele aanmeldingen (dienst_id + medewerker_id) ------------------------------------
-- De unieke index uit 20261001_portaal_sessies.sql wordt NIET aangemaakt zolang er dubbelen
-- bestaan. Deze migratie verwijdert niets automatisch: bekijk de dubbelen eerst.
--
-- a) Dubbelen bekijken (welke rij blijft staan staat in kolom `houden`):
--
--   select a.id, a.dienst_id, a.medewerker_id, a.status, a.aangemeld_at,
--          row_number() over w = 1 as houden
--     from public.dienst_aanmeldingen a
--    where (a.dienst_id, a.medewerker_id) in (
--            select dienst_id, medewerker_id from public.dienst_aanmeldingen
--             group by 1, 2 having count(*) > 1)
--   window w as (
--     partition by a.dienst_id, a.medewerker_id
--     -- Voorkeur: een rij met uren/check-in, dan een ingeplande rij, dan de oudste.
--     order by (exists (select 1 from public.uren_registraties u where u.aanmelding_id = a.id)) desc,
--              (a.check_in_at is not null) desc,
--              (a.status in ('geaccepteerd', 'bevestigd')) desc,
--              a.aangemeld_at asc nulls last, a.id asc)
--   order by a.dienst_id, a.medewerker_id, houden desc;
--
-- b) Pas na controle opruimen (zelfde volgorde; houdt per paar één rij):
--
--   with gerangschikt as (
--     select a.id, row_number() over (
--              partition by a.dienst_id, a.medewerker_id
--              order by (exists (select 1 from public.uren_registraties u where u.aanmelding_id = a.id)) desc,
--                       (a.check_in_at is not null) desc,
--                       (a.status in ('geaccepteerd', 'bevestigd')) desc,
--                       a.aangemeld_at asc nulls last, a.id asc) as rn
--       from public.dienst_aanmeldingen a)
--   delete from public.dienst_aanmeldingen d
--    using gerangschikt g
--    where d.id = g.id and g.rn > 1
--      and not exists (select 1 from public.uren_registraties u where u.aanmelding_id = d.id);
--
--   Rijen met uren_registraties worden nooit verwijderd; blijven er daarna nog dubbelen over,
--   dan handmatig beoordelen.
--
-- c) Daarna de unieke index alsnog aanmaken (doet niets als hij al bestaat of er nog dubbelen zijn):
do $$
begin
  if not exists (
    select 1 from public.dienst_aanmeldingen
    group by dienst_id, medewerker_id having count(*) > 1
  ) then
    create unique index if not exists uq_dienst_aanmeldingen_dienst_medewerker
      on public.dienst_aanmeldingen (dienst_id, medewerker_id);
  else
    raise notice 'dienst_aanmeldingen bevat nog dubbelen; unieke index niet aangemaakt (zie stap a/b in 20261002_review_fixes.sql).';
  end if;
end $$;

-- 2. Klant-NAW vastleggen op de factuur ---------------------------------------------------
-- Bij het aanmaken van een factuur (api/klant/facturen, api/facturen/generate, boetefactuur in
-- api/klant/annuleren) worden de klantgegevens op de factuur zelf gezet. PDF en mail tonen de
-- snapshot en vallen per veld terug op de live klant als de snapshot leeg is.
-- klant_naam en klant_email bestonden al; voor de zekerheid ook hier idempotent.
alter table public.facturen add column if not exists klant_naam text;
alter table public.facturen add column if not exists klant_email text;
alter table public.facturen add column if not exists klant_contactpersoon text;
alter table public.facturen add column if not exists klant_adres text;
alter table public.facturen add column if not exists klant_postcode text;
alter table public.facturen add column if not exists klant_stad text;
alter table public.facturen add column if not exists klant_kvk_nummer text;
alter table public.facturen add column if not exists klant_btw_nummer text;

-- Eenmalige backfill voor bestaande facturen, alleen waar de snapshotkolom nog leeg is.
-- LET OP: dit neemt de HUIDIGE klantgegevens over, niet die van het factuurmoment (die zijn niet
-- bewaard). Is een klant sinds de factuur verhuisd, dan staat het nieuwe adres op de oude factuur.
-- to_jsonb(k) ->> '…' geeft null als een kolom op klanten (nog) niet bestaat, dus dit faalt niet
-- zonder de adres-/KvK-kolommen. Contactpersoon/e-mail van verwijderde (geanonimiseerde)
-- accounts worden niet overgenomen.
update public.facturen f
   set klant_naam           = coalesce(f.klant_naam, nullif(to_jsonb(k) ->> 'bedrijfsnaam', '')),
       klant_email          = coalesce(f.klant_email,
                                case when (to_jsonb(k) ->> 'email') like '%@verwijderd.invalid' then null
                                     else nullif(to_jsonb(k) ->> 'email', '') end),
       klant_contactpersoon = coalesce(f.klant_contactpersoon,
                                case when (to_jsonb(k) ->> 'email') like '%@verwijderd.invalid' then null
                                     else nullif(to_jsonb(k) ->> 'contactpersoon', '') end),
       klant_adres          = coalesce(f.klant_adres,      nullif(to_jsonb(k) ->> 'adres', '')),
       klant_postcode       = coalesce(f.klant_postcode,   nullif(to_jsonb(k) ->> 'postcode', '')),
       klant_stad           = coalesce(f.klant_stad,       nullif(to_jsonb(k) ->> 'stad', '')),
       klant_kvk_nummer     = coalesce(f.klant_kvk_nummer, nullif(to_jsonb(k) ->> 'kvk_nummer', '')),
       klant_btw_nummer     = coalesce(f.klant_btw_nummer, nullif(to_jsonb(k) ->> 'btw_nummer', ''))
  from public.klanten k
 where k.id = f.klant_id
   and (f.klant_naam is null or f.klant_email is null or f.klant_contactpersoon is null
        or f.klant_adres is null or f.klant_postcode is null or f.klant_stad is null
        or f.klant_kvk_nummer is null or f.klant_btw_nummer is null);
