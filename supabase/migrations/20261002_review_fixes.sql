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
