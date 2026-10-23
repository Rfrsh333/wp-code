-- B1 (onboarding medewerker, 23-10-2026, besluit Rachid): checklist vóór reageren.
-- Een medewerker mag zich pas aanmelden voor een dienst of een aanbieding/uitnodiging accepteren
-- als ID (goedgekeurd, niet verlopen), KvK-nummer, btw-nummer, IBAN en het akkoord op de
-- overeenkomst van opdracht in orde zijn. Daarvoor zijn deze kolommen nodig.
--
-- Draai deze migratie VÓÓR (of tegelijk met) de deploy. Zonder deze kolommen slaat de code de
-- checklist over (en meldt dat in Sentry), zodat niemand vastloopt op velden die hij nog niet kan
-- invullen.
--
-- Veilig om opnieuw te draaien (if not exists / alleen lege velden aanvullen).

begin;

-- 1. KvK-nummer op de medewerker (stond alleen op inschrijvingen).
alter table public.medewerkers add column if not exists kvk_nummer text;
comment on column public.medewerkers.kvk_nummer is
  'KvK-nummer van de zzp''er (8 cijfers). Verplicht voor reageren op diensten (B1).';

-- 2. Akkoord op de overeenkomst van opdracht: tijdstip + versie van de tekst.
alter table public.medewerkers add column if not exists overeenkomst_akkoord_op timestamptz;
alter table public.medewerkers add column if not exists overeenkomst_akkoord_versie text;
comment on column public.medewerkers.overeenkomst_akkoord_op is
  'Moment waarop de medewerker akkoord gaf op de overeenkomst van opdracht (B1).';
comment on column public.medewerkers.overeenkomst_akkoord_versie is
  'Versie van de overeenkomsttekst waarop akkoord is gegeven (src/content/overeenkomst-van-opdracht.ts).';

-- 3. Vervaldatum op kandidaatdocumenten (ID-bewijs), zodat die bij kandidaat → medewerker mee
--    kan naar medewerker_documenten.expiry_date.
alter table public.kandidaat_documenten add column if not exists vervaldatum date;
comment on column public.kandidaat_documenten.vervaldatum is
  'Vervaldatum (vooral ID-bewijs); gaat mee naar medewerker_documenten.expiry_date.';

-- 4. Bestaande medewerkers: KvK-nummer overnemen uit hun inschrijving (alleen 8 cijfers, alleen
--    als het veld nog leeg is). Medewerkers zonder inschrijving vullen het zelf in hun profiel in.
update public.medewerkers m
set kvk_nummer = k.kvk
from (
  select distinct on (i.medewerker_id)
    i.medewerker_id,
    regexp_replace(coalesce(i.kvk_nummer, ''), '[[:space:].-]', '', 'g') as kvk
  from public.inschrijvingen i
  where i.medewerker_id is not null and i.kvk_nummer is not null
  order by i.medewerker_id, i.created_at desc
) k
where m.id = k.medewerker_id
  and (m.kvk_nummer is null or trim(m.kvk_nummer) = '')
  and k.kvk ~ '^[0-9]{8}$';

commit;

-- Controle achteraf (alleen lezen): hoeveel actieve medewerkers missen nog iets?
--   select
--     count(*) filter (where kvk_nummer is null)              as zonder_kvk,
--     count(*) filter (where btw_nummer is null)              as zonder_btw,
--     count(*) filter (where iban is null)                    as zonder_iban,
--     count(*) filter (where overeenkomst_akkoord_op is null) as zonder_akkoord
--   from public.medewerkers where status = 'actief';
