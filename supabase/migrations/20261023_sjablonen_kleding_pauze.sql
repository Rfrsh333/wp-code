-- Aanvraagsjablonen (dienst_templates) bewaren ook kledingvoorschrift en pauze (23-10-2026,
-- nawerk "uitgebreid reageren", zie 20261023_uitgebreid_reageren.sql voor dezelfde velden op diensten).
--
-- Zelfde regels als bij de aanvraag (lib/medewerker/reactie-regels: parseKledingvoorschrift en
-- parsePauzeMinuten): kledingvoorschrift max. 500 tekens, pauze 0–240 minuten, leeg = null.
--
-- De code werkt ook zolang deze migratie nog niet gedraaid is: /api/klant/templates vangt
-- 42703/PGRST204 op deze kolommen af, slaat de template zonder kleding en pauze op en geeft dan een
-- waarschuwing terug (alleen als er echt een waarde wegviel). GET gebruikt select *, dus de velden
-- verschijnen vanzelf zodra de kolommen er zijn.
--
-- Veilig om opnieuw te draaien (if not exists / drop constraint if exists). CHECK-constraints
-- NOT VALID: bestaande rijen worden niet opnieuw gecontroleerd (ze zijn allemaal null).
-- Raakt alleen dienst_templates; volgorde ten opzichte van 20261023_uitgebreid_reageren.sql maakt niet uit.

begin;

alter table public.dienst_templates add column if not exists kledingvoorschrift text;
alter table public.dienst_templates add column if not exists pauze_minuten integer;

comment on column public.dienst_templates.kledingvoorschrift is
  'Kledingvoorschrift dat bij hergebruik van de template in de aanvraag wordt ingevuld (max. 500 tekens).';
comment on column public.dienst_templates.pauze_minuten is
  'Pauze in minuten (onbetaald) die bij hergebruik van de template in de aanvraag wordt ingevuld.';

alter table public.dienst_templates drop constraint if exists dienst_templates_pauze_minuten_check;
alter table public.dienst_templates
  add constraint dienst_templates_pauze_minuten_check
  check (pauze_minuten is null or (pauze_minuten >= 0 and pauze_minuten <= 240)) not valid;

alter table public.dienst_templates drop constraint if exists dienst_templates_kledingvoorschrift_lengte_check;
alter table public.dienst_templates
  add constraint dienst_templates_kledingvoorschrift_lengte_check
  check (kledingvoorschrift is null or char_length(kledingvoorschrift) <= 500) not valid;

commit;

-- Controle achteraf (alleen lezen):
--   select count(*) filter (where kledingvoorschrift is not null) as met_kleding,
--          count(*) filter (where pauze_minuten is not null)      as met_pauze
--   from public.dienst_templates;
