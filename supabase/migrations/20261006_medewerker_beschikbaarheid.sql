-- Vaste weekbeschikbaarheid voor medewerkers zonder inschrijving (3-10-2026).
--
-- /api/medewerker/beschikbaarheid las en schreef alleen `inschrijvingen` op e-mailadres.
-- Medewerkers die de admin rechtstreeks aanmaakt hebben geen inschrijving: voor 3 van de 4
-- actieve medewerkers gaf het rooster daarom altijd 404 ("Inschrijving niet gevonden") en kon
-- de matching hun beschikbaarheid nooit zien. Voor hen bewaren we het rooster nu op de
-- medewerker zelf. Wie wél een inschrijving heeft, blijft daar lezen en schrijven.
-- De code werkt ook zonder deze migratie (42703 → leeg rooster, opslaan geeft een nette melding).

alter table public.medewerkers
  add column if not exists beschikbaarheid jsonb,
  add column if not exists beschikbaar_vanaf date,
  add column if not exists max_uren_per_week integer;

comment on column public.medewerkers.beschikbaarheid is
  'Vaste weekbeschikbaarheid {ma..zo: [ochtend|middag|avond|nacht|hele_dag]} voor medewerkers zonder inschrijving; anders geldt inschrijvingen.beschikbaarheid.';
