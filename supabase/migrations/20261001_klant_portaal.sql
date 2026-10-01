-- Klantportaal (1-10-2026)
--
-- Idempotent. De code werkt ook zonder deze migratie:
-- - wachtwoord vergeten geeft dan netjes "niet beschikbaar" (geen mail, geen crash);
-- - templates slaan dan alleen de eerste functie op (oude gedrag);
-- - het gebruik-teller valt terug op lezen + schrijven.

-- 1. Wachtwoord vergeten/reset voor klanten -------------------------------------------------
-- Zelfde opzet als medewerkers (supabase-migration-medewerker-password-reset.sql):
-- token alleen als SHA-256-hash (src/lib/token-hash.ts), 2 uur geldig.
alter table public.klanten add column if not exists reset_token text;
alter table public.klanten add column if not exists reset_token_expires_at timestamptz;
create unique index if not exists idx_klanten_reset_token
  on public.klanten (reset_token)
  where reset_token is not null;

-- 2. Account verwijderen (Apple 5.1.1(v)) ---------------------------------------------------
-- Moment van verwijderen/anonimiseren; facturen blijven bewaard (fiscale bewaarplicht).
alter table public.klanten add column if not exists verwijderd_at timestamptz;

-- 3. Templates met meerdere functies --------------------------------------------------------
-- [{ "functie": "bediening", "aantal": 2, "uurtarief": "27.50" }, …]
alter table public.dienst_templates add column if not exists functies_met_aantal jsonb;

-- 4. Gebruik van een template atomair ophogen ----------------------------------------------
-- De route gaf een query-builder als kolomwaarde mee (supabase.rpc(...) binnen .update()),
-- waardoor de teller nooit veranderde.
create or replace function public.template_gebruikt(p_template_id uuid, p_klant_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.dienst_templates
     set aantal_keer_gebruikt = coalesce(aantal_keer_gebruikt, 0) + 1,
         laatst_gebruikt_op   = now()
   where id = p_template_id
     and klant_id = p_klant_id;
$$;

revoke all on function public.template_gebruikt(uuid, uuid) from public, anon, authenticated;

-- 5. Status 'verwijderd' voor klanten -------------------------------------------------------
-- Als klanten.status een CHECK-constraint heeft zonder 'verwijderd', valt de code terug op
-- 'inactief'. Controleer met:
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.klanten'::regclass and contype = 'c';
