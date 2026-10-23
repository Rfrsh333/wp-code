-- Bedrijfsfoto van de werkgever (23-10-2026, "een sfeerfoto bij elke dienst").
--
-- klanten.foto_url: één vaste sfeerfoto van de zaak. Die komt automatisch bij al zijn diensten
-- zonder eigen foto (voorrang: diensten.afbeelding_url → klanten.foto_url → standaardfoto per
-- functie, src/lib/sfeerfotos.ts). Waarde: de absolute URL van een eigen upload in de bucket
-- dienst-afbeeldingen (map bedrijven/<klant_id>/) of van een standaardfoto
-- (https://www.toptalentjobs.nl/images/sfeer/groot/<id>.jpg). Alleen te zetten via
-- GET/PUT/DELETE /api/klant/bedrijfsfoto.
--
-- De code werkt ook zolang deze migratie nog niet gedraaid is (42703/PGRST204-fallback):
-- GET /api/klant/bedrijfsfoto geeft dan beschikbaar: false, PUT een 503, en elke dienst zonder
-- eigen foto krijgt een standaardfoto. De bucket bestaat al (20260317_dienst_afbeelding.sql).
--
-- Veilig om opnieuw te draaien (if not exists / drop constraint if exists). De CHECK is NOT VALID:
-- bestaande rijen worden niet opnieuw gecontroleerd (de kolom is nieuw, dus overal null).
-- Raakt alleen klanten; volgorde ten opzichte van de andere 20261023-migraties maakt niet uit.

begin;

alter table public.klanten add column if not exists foto_url text;

comment on column public.klanten.foto_url is
  'Bedrijfsfoto (sfeerfoto van de zaak): absolute URL van een upload (dienst-afbeeldingen/bedrijven/<klant_id>/) of van een standaardfoto (/images/sfeer/groot/<id>.jpg). Komt bij elke dienst zonder eigen afbeelding_url.';

alter table public.klanten drop constraint if exists klanten_foto_url_check;
alter table public.klanten
  add constraint klanten_foto_url_check
  check (foto_url is null or (foto_url ~ '^https?://' and char_length(foto_url) <= 500)) not valid;

commit;

-- Controle achteraf (alleen lezen):
--   select count(*) filter (where foto_url is not null)                     as met_bedrijfsfoto,
--          count(*) filter (where foto_url like '%/images/sfeer/%')         as standaardfoto,
--          count(*) filter (where foto_url like '%/dienst-afbeeldingen/%') as eigen_upload
--   from public.klanten;
