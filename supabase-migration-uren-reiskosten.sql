alter table uren_registraties
add column if not exists reiskosten_km numeric(10,2) not null default 0,
add column if not exists reiskosten_bedrag numeric(10,2) not null default 0,
add column if not exists klant_reiskosten_km numeric(10,2),
add column if not exists klant_reiskosten_bedrag numeric(10,2);

update uren_registraties
set
  reiskosten_km = coalesce(reiskosten_km, 0),
  reiskosten_bedrag = coalesce(reiskosten_bedrag, 0)
where reiskosten_km is null
   or reiskosten_bedrag is null;
