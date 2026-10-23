-- Onboarding van klanten (werkgevers), 23-10-2026.
--
-- Idempotent. De code werkt ook zonder deze migratie (ontbrekende kolom = 42703/PGRST204):
-- - uitnodigen werkt dan gewoon, alleen het moment van de laatste uitnodiging wordt niet bewaard;
-- - registreren werkt zoals voorheen: geen bevestigingsmail, KvK en akkoord niet opgeslagen;
-- - iedere klant geldt als bevestigd en gecontroleerd: diensten gaan direct open, zoals nu.
--
-- Vereist migratie 20261001_klant_portaal.sql (klanten.reset_token + reset_token_expires_at):
-- de uitnodiging hergebruikt die tokenkolommen, met een eigen geldigheid van 7 dagen.

-- 1. Uitnodiging "wachtwoord instellen" --------------------------------------------------------
-- Moment waarop TopTalent de laatste uitnodigingsmail stuurde (lead omzetten, dienst inplannen
-- voor een nieuwe klant, of de knop "Uitnodiging (opnieuw) sturen" in de admin).
alter table public.klanten add column if not exists uitgenodigd_op timestamptz;

comment on column public.klanten.uitgenodigd_op is
  'Laatste uitnodigingsmail (wachtwoord instellen, 7 dagen geldig). Zie src/lib/klant-uitnodiging.ts.';


-- 2. Zelf registreren: e-mailadres bevestigen ------------------------------------------------
-- Diensten plaatsen kan pas na bevestigen (link 48 uur geldig, token alleen als SHA-256-hash).
-- Bestaande klanten gelden als bevestigd: ze werkten al zonder deze stap. Alleen bij het
-- aanmaken van de kolom, zodat opnieuw draaien nieuwe, onbevestigde registraties niet raakt.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'klanten' and column_name = 'email_geverifieerd_op'
  ) then
    alter table public.klanten add column email_geverifieerd_op timestamptz;
    update public.klanten set email_geverifieerd_op = now();
  end if;
end $$;

alter table public.klanten add column if not exists email_verificatie_token text;
alter table public.klanten add column if not exists email_verificatie_verloopt_op timestamptz;
create unique index if not exists idx_klanten_email_verificatie_token
  on public.klanten (email_verificatie_token)
  where email_verificatie_token is not null;

-- 3. Zelf registreren: KvK-nummer en akkoord algemene voorwaarden ----------------------------
-- kvk_nummer bestaat al sinds 20261004_schema_drift.sql; hier voor de zekerheid.
alter table public.klanten add column if not exists kvk_nummer text;
alter table public.klanten add column if not exists av_akkoord_op timestamptz;
alter table public.klanten add column if not exists av_versie text;

comment on column public.klanten.av_versie is
  'Versie van de algemene voorwaarden waarmee de klant bij registratie akkoord ging (lib/klant-registratie-regels.ts).';

-- 4. Eerste-dienstcontrole ------------------------------------------------------------------
-- gecontroleerd_op leeg = zelf geregistreerd en nog niet door TopTalent gecontroleerd: nieuwe
-- diensten krijgen dan status 'in_controle' (geen push, niet zichtbaar voor medewerkers) tot
-- TopTalent ze goedkeurt in admin > Diensten. Door TopTalent aangemaakte of uitgenodigde
-- klanten krijgen gecontroleerd_op meteen (src/lib/klant-onboarding.ts, markeerGecontroleerd).
-- Bestaande klanten gelden als gecontroleerd als ze al een dienst hebben, uit een omgezette lead
-- komen, geen wachtwoord hebben (dus door TopTalent aangemaakt) of een demo-account zijn.
-- Een zelf geregistreerde klant zonder diensten wordt bij zijn eerste dienst gecontroleerd.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'klanten' and column_name = 'gecontroleerd_op'
  ) then
    alter table public.klanten add column gecontroleerd_op timestamptz;

    update public.klanten k
       set gecontroleerd_op = now()
     where k.wachtwoord is null
        or (to_jsonb(k) ->> 'is_demo') = 'true'
        or exists (select 1 from public.diensten d where d.klant_id = k.id);

    if to_regclass('public.acquisitie_leads') is not null then
      execute 'update public.klanten k set gecontroleerd_op = now()
                where k.gecontroleerd_op is null
                  and exists (select 1 from public.acquisitie_leads l where l.klant_id = k.id)';
    end if;
  end if;
end $$;

-- diensten.status: als er een CHECK-constraint op staat, 'in_controle' toevoegen. De
-- basistabel staat niet in de repo, dus de constraint wordt opgezocht. Heeft hij een
-- onverwachte vorm, dan stopt de migratie hier met een duidelijke melding. (Mocht in_controle
-- toch geweigerd worden, dan plaatst de code de dienst zoals voorheen als open en meldt het in
-- Sentry: api/klant/aanvraag, IN_CONTROLE_CONSTRAINT.)
-- Controleren: select conname, pg_get_constraintdef(oid) from pg_constraint
--               where conrelid = 'public.diensten'::regclass and contype = 'c';
do $$
declare
  c record;
begin
  for c in
    select conname, pg_get_constraintdef(oid) as def
      from pg_constraint
     where conrelid = 'public.diensten'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ~ '\mstatus\M'
       and pg_get_constraintdef(oid) not ilike '%in_controle%'
  loop
    if c.def ~ 'ARRAY\[' then
      execute format('alter table public.diensten drop constraint %I', c.conname);
      execute format(
        'alter table public.diensten add constraint %I %s',
        c.conname,
        regexp_replace(c.def, 'ARRAY\[', 'ARRAY[''in_controle''::text, ')
      );
    else
      raise exception 'CHECK-constraint % op diensten heeft een onverwachte vorm: %. Voeg in_controle handmatig toe.', c.conname, c.def;
    end if;
  end loop;
end $$;

create index if not exists idx_diensten_in_controle on public.diensten (klant_id) where status = 'in_controle';

notify pgrst, 'reload schema';
