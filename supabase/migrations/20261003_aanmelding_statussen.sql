-- dienst_aanmeldingen.status: de CHECK-constraint (ooit via het dashboard aangemaakt, staat niet in
-- de migraties) weigerde statussen die de code wél schrijft, o.a. 'bevestigd' (uitnodiging/spoeddienst
-- aannemen, admin inplannen), 'uitgenodigd' (favoriet uitnodigen) en 'vervanging_gezocht'.
-- Gevonden 1-10-2026 bij het aanmaken van testdata: insert met 'bevestigd' → 23514.
--
-- NOT VALID: bestaande rijen worden niet opnieuw gecontroleerd, alleen nieuwe/gewijzigde.

do $$
declare
  oud text;
begin
  select pg_get_constraintdef(oid) into oud
    from pg_constraint
   where conrelid = 'public.dienst_aanmeldingen'::regclass
     and conname = 'dienst_aanmeldingen_status_check';
  raise notice 'oude constraint: %', coalesce(oud, '(geen)');
end $$;

alter table public.dienst_aanmeldingen drop constraint if exists dienst_aanmeldingen_status_check;
alter table public.dienst_aanmeldingen
  add constraint dienst_aanmeldingen_status_check
  check (status in (
    'aangemeld', 'uitgenodigd', 'aangeboden',
    'geaccepteerd', 'bevestigd',
    'afgewezen', 'geannuleerd',
    'vervanging_gezocht', 'vervangen',
    'voltooid'
  )) not valid;

select status, count(*) from public.dienst_aanmeldingen group by status order by 2 desc;
