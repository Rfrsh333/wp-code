# Fase 3: Restore-drill resultaten (gesimuleerd)

**Datum:** 2026-04-22
**Modus:** Gesimuleerd — geen restore in productie
**Status:** `NOT_TESTED_IN_PRACTICE`

---

## Waarom gesimuleerd?

Per audit-regels is geen restore in productie uitgevoerd. Deze drill is een **desktop exercise** — we lopen het herstelproces door en identificeren waar het blokkeert.

---

## 1. Database Restore Test (desktop)

### Stap 1: pg_dump verkrijgen

**Optie A: Supabase Dashboard**
1. Ga naar Supabase Dashboard → Project → Database → Backups
2. Klik "Download backup" op meest recente backup
3. Download is een `.sql.gz` bestand
4. Geschatte grootte: 5-50MB (afhankelijk van data-volume)

**Optie B: pg_dump via CLI**
```bash
pg_dump "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  --clean --if-exists --no-owner --no-privileges \
  -f backup_$(date +%Y%m%d).sql
```

**Blokkade gevonden:** De database connection string is niet gedocumenteerd buiten Vercel env vars. Bij Vercel-account-verlies is de connection string onbekend.

### Stap 2: Restore naar test-omgeving

```bash
# Optie A: Lokale Docker Postgres
docker run -d --name pg-test -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:16
psql -h localhost -p 5433 -U postgres -f backup_20260422.sql

# Optie B: Nieuw Supabase-project
# Maak nieuw project aan in Supabase dashboard
# Restore via psql naar de nieuwe connection string
```

**Geschatte RTO-component:** 15-30 minuten voor download + restore

### Stap 3: Verificatie checklist

| Check | Verwacht | Methode |
|-------|----------|---------|
| Alle tabellen aanwezig | ~30+ tabellen | `\dt` in psql |
| Row counts matchen | ±5% van productie | `SELECT count(*) FROM <tabel>` |
| RLS policies mee-gerestored | Alle policies | `SELECT * FROM pg_policies` |
| Functies + triggers aanwezig | Alle functions | `\df` in psql |
| Migraties-state consistent | 17+ migraties | Check `supabase_migrations` tabel |
| Indexes intact | Performance-critical | `\di` in psql |
| Constraints intact | FK, CHECK | `\d+ <tabel>` |

### Stap 4: App aansluiten

```bash
# Wijzig .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://[nieuw-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[nieuw-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[nieuw-service-role-key]

# Start dev server
npm run dev
# Test: /admin login, /medewerker portaal, factuur-generatie
```

---

## 2. Storage Restore Test (desktop)

### Stap 1: Objects downloaden

```bash
# Via Supabase CLI (als geïnstalleerd)
supabase storage cp -r storage://kandidaat-documenten ./backup-storage/kandidaat/
supabase storage cp -r storage://medewerker-documenten ./backup-storage/medewerker/

# Of via Supabase JS client
# Script nodig dat alle objects lijst en per stuk downloadt
```

**Blokkade gevonden:** Supabase CLI is niet geïnitialiseerd in dit project (geen `config.toml`). Handmatig downloaden via API vereist een custom script.

### Stap 2: Verifieer metadata

| Check | Methode |
|-------|---------|
| Content-type behouden | Vergelijk HTTP headers |
| File size correct | Vergelijk bytes |
| Pad-structuur intact | Vergelijk bucket paths |

### Stap 3: Upload naar test-bucket

```bash
# In nieuw Supabase-project
supabase storage cp -r ./backup-storage/kandidaat/ storage://kandidaat-documenten-restore/
```

---

## 3. Secret Restore Test (desktop)

### Checklist: Kunnen alle env vars gereconstrueerd worden?

| Variabele | Bron buiten Vercel | Herstelbaar? |
|-----------|-------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard | JA |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard | JA |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard | JA |
| `JWT_SECRET` | .env.local (lokaal) | RISICO — alleen lokaal |
| `RESEND_API_KEY` | Resend dashboard | JA — nieuw genereren |
| `MOLLIE_API_KEY` | Mollie dashboard | JA — nieuw genereren |
| `OPENAI_API_KEY` | OpenAI dashboard | JA — nieuw genereren |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard | JA |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard | JA |
| `TELEGRAM_BOT_TOKEN` | Telegram BotFather | RISICO — moet je onthouden |
| `TELEGRAM_CHAT_ID` | Telegram API | RISICO — moet je opzoeken |
| `CRON_SECRET` | Zelf gegenereerd | RISICO — opnieuw genereren = alle crons vernieuwen |
| `KANDIDAAT_TOKEN_SECRET` | Zelf gegenereerd | RISICO — uitstaande tokens breken |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | JA |
| `GOOGLE_REFRESH_TOKEN` | OAuth flow | RISICO — opnieuw autoriseren |
| `VAPID_PRIVATE_KEY` | Zelf gegenereerd | RISICO — bestaande push subs breken |
| `SENTRY_AUTH_TOKEN` | Sentry dashboard | JA — nieuw genereren |
| `ADMIN_EMAILS` | Configuratie | RISICO — moet je onthouden |
| `ADMIN_ROLE_MAP` | Configuratie | RISICO — moet je onthouden |

### Resultaat

**Volledig herstelbaar vanuit externe dashboards:** 9/19
**Risico — alleen lokaal of zelf gegenereerd:** 10/19

**Bevinding KRITIEK:** Meer dan de helft van de secrets zijn niet herstelbaar zonder lokale `.env.local` of geheugen van de eigenaar.

---

## Samenvatting

| Scenario | Geschatte RTO | Geschatte RPO | Blokkades |
|----------|--------------|---------------|-----------|
| DB restore (Supabase daily) | 30-60 min | 24 uur | Connection string nodig, geen test gedaan |
| DB restore (PITR) | 15-30 min | Minuten | Alleen als PITR actief is |
| Storage restore | 2-4 uur+ | Onbeperkt (geen backup) | Geen backup-script, geen off-site kopie |
| Secret restore | 1-2 uur | N.v.t. | 10/19 secrets alleen lokaal beschikbaar |
| Full system restore | 4-8 uur | 24 uur (DB) + onbeperkt (Storage) | Te veel handmatige stappen |

---

`NOT_TESTED_IN_PRACTICE`
