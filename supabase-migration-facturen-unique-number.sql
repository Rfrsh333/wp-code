-- Zorg dat bestaande duplicate factuurnummers eerst zichtbaar worden
do $$
begin
  if exists (
    select 1
    from facturen
    group by factuur_nummer
    having count(*) > 1
  ) then
    raise exception 'Duplicate factuur_nummer values found. Los eerst duplicates op voordat je de unique index toevoegt.';
  end if;
end $$;

create unique index if not exists idx_facturen_factuur_nummer_unique
on facturen(factuur_nummer);
