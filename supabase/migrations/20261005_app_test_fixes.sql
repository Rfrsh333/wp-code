-- Gevonden bij de volledige app-test van 2-10-2026.
-- Idempotent: veilig om meerdere keren te draaien.

-- 1. Persoonlijke gegevens medewerker: de API/app lezen en schrijven adres, postcode en KOR,
--    maar de kolommen bestonden niet (42703 → profiel leeg, opslaan faalde altijd).
alter table public.medewerkers add column if not exists adres text;
alter table public.medewerkers add column if not exists postcode text;
alter table public.medewerkers add column if not exists kor_actief boolean not null default false;

-- 2. Contracten: medewerker_id/klant_id hadden geen foreign key, dus PostgREST kende de relatie
--    niet (PGRST200) en "Contract ondertekenen" gaf altijd "Contract niet gevonden".
--    ON DELETE SET NULL i.p.v. CASCADE: een getekend contract moet blijven bestaan als de
--    medewerker of klant wordt verwijderd (bewaarplicht).
--    NOT VALID: bestaande rijen worden niet gecontroleerd; PostgREST herkent de relatie wel.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contracten_medewerker_id_fkey') then
    alter table public.contracten
      add constraint contracten_medewerker_id_fkey
      foreign key (medewerker_id) references public.medewerkers(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contracten_klant_id_fkey') then
    alter table public.contracten
      add constraint contracten_klant_id_fkey
      foreign key (klant_id) references public.klanten(id) on delete set null not valid;
  end if;
end $$;

-- PostgREST het nieuwe schema laten inlezen.
notify pgrst, 'reload schema';
