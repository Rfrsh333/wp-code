-- Retentie-kolommen (AVG art. 5 lid 1 sub e — opslagbeperking).
--
-- De retentie-cron (/api/cron/retentie, audit P0-8) draaide tegen kolommen die nooit
-- zijn aangemaakt: `medewerkers.datum_uit_dienst` en `bewaar_tot` op beide
-- documenttabellen. Supabase geeft bij een onbekende kolom een error en `data: null`,
-- waarna de loops leeg blijven — de cron rapporteerde dus 0 opgeruimde documenten
-- zonder ooit iets te kunnen doen. Deze migratie dicht dat gat.

-- Datum uit dienst: startpunt voor de fiscale bewaartermijn van 5 jaar.
alter table public.medewerkers
  add column if not exists datum_uit_dienst date;

comment on column public.medewerkers.datum_uit_dienst is
  'Laatste dag in dienst. Vult de bewaartermijn van gekoppelde documenten (datum + 5 jaar).';

-- Bewaartermijn per document; na deze datum ruimt de cron het op (rij + opslag-object).
alter table public.medewerker_documenten
  add column if not exists bewaar_tot date;

comment on column public.medewerker_documenten.bewaar_tot is
  'Uiterste bewaardatum. NULL = nog niet bepaald (medewerker nog in dienst).';

alter table public.kandidaat_documenten
  add column if not exists bewaar_tot date;

comment on column public.kandidaat_documenten.bewaar_tot is
  'Uiterste bewaardatum. Wordt nog niet automatisch gevuld — de bewaartermijn voor '
  'afgewezen kandidaten is een beleidskeuze (AVG-praktijk: 4 weken, of 1 jaar met toestemming).';

-- De cron zoekt op "bewaar_tot is null" en op "bewaar_tot < vandaag"; beide partieel
-- geindexeerd zodat de dagelijkse run niet over de volle tabel hoeft te scannen.
create index if not exists medewerker_documenten_bewaar_tot_open_idx
  on public.medewerker_documenten (id) where bewaar_tot is null;

create index if not exists medewerker_documenten_bewaar_tot_idx
  on public.medewerker_documenten (bewaar_tot) where bewaar_tot is not null;

create index if not exists kandidaat_documenten_bewaar_tot_idx
  on public.kandidaat_documenten (bewaar_tot) where bewaar_tot is not null;
