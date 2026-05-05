# Fase 1: State-inventarisatie

**Datum:** 2026-04-22
**Scope:** Alle systemen die productie-state houden
**Status:** `AUDIT_COMPLETE`

---

## Overzicht

| # | Systeem | Wat erin | Recoverability | Vervangend (nood) |
|---|---------|----------|----------------|-------------------|
| 1 | Supabase DB (Postgres) | Alle business-data: klanten, medewerkers, diensten, facturen, contracten, uren, leads, inschrijvingen | PITR indien ingeschakeld (Pro+), anders daily backups (7-14 dagen) | Geen — enige bron van waarheid |
| 2 | Supabase Storage | 4 buckets: kandidaat-documenten (CV's, ID), medewerker-documenten, editorial-images, dienst-afbeeldingen | GEEN automatische backup door Supabase | Onvervangbaar (PII!) — opnieuw opvragen bij kandidaten |
| 3 | Supabase Auth | User-accounts (admin, medewerker, klant) | Onderdeel van DB-backup | Accounts opnieuw aanmaken vanuit DB |
| 4 | Vercel | Hosting, env vars, 16 cron jobs, deployment history | Redeploy vanuit Git; env vars NIET geback-upt | Code in GitHub, env vars in .env.local |
| 5 | GitHub | Broncode, CI workflows, migraties | Distributed Git — laag risico | Clone op lokale machines |
| 6 | Resend | Mail-logs, suppression list, bounce tracking | Per account, niet exporteerbaar | Opnieuw opbouwen; templates staan in code |
| 7 | Mollie | Payment records (boetes) | Permanent bij Mollie, via API opvraagbaar | Mollie API exports |
| 8 | Upstash Redis | Rate-limit keys, cache | Korte TTL, ephemeral — laag risico | Automatisch herbouwd bij restart |
| 9 | Telegram | Alert-berichten (forward-only) | Niet te recoveren, niet nodig | Opnieuw configureren |
| 10 | Sentry | Error-history, performance traces | 30-90 dagen retentie bij Sentry | Acceptabel verlies |
| 11 | OpenAI | Geen state bewaard | Stateless API | N.v.t. |
| 12 | Google Calendar | Afspraken/agenda | Bij Google, via API opvraagbaar | Google export |

---

## Detail per systeem

### 1. Supabase Database

**Hostname:** `nntxpyoyrpquzghsnwxj.supabase.co`
**Regio:** Onbekend (vermoedelijk EU — Frankfurt of Amsterdam)

**Tabellen (kerndata):**
- `klanten` — Klantbedrijven met contactinfo
- `medewerkers` — Werknemers met persoonsgegevens, BSN, IBAN
- `inschrijvingen` — Kandidaat-aanmeldingen
- `diensten` — Geplande diensten/shifts
- `dienst_aanmeldingen` — Medewerker-dienst koppelingen
- `uren_registraties` — Gewerkte uren + pauze + reiskosten
- `facturen` + `factuur_regels` — Facturatie
- `contracten` + `contract_ondertekeningen` — Digitale contracten
- `leads` + `lead_tracking` — CRM/acquisitie
- `admin_users` — Admin accounts
- `audit_log` — Wijzigingslog

**Migraties:** 17 in `supabase/migrations/` + 56 legacy SQL files in root

### 2. Supabase Storage

| Bucket | Toegang | Inhoud | Gevoeligheid |
|--------|---------|--------|-------------|
| `kandidaat-documenten` | Privaat | CV's (PDF/DOC), max 5MB | HOOG (PII) |
| `medewerker-documenten` | Privaat | ID-bewijzen, contracten, certificaten | KRITIEK (PII + WID) |
| `editorial-images` | Publiek | AI-gegenereerde hero images, max 10MB | LAAG |
| `dienst-afbeeldingen` | Privaat | Dienst-foto's | LAAG |

### 3. Vercel

**Project:** toptalent-wordpress-html
**Regio:** `arn1` (Stockholm, EU)
**Cron jobs:** 16 actief in vercel.json, 24 endpoints aanwezig
**Max API duration:** 10 seconden

### 4. Environment Variables (40+)

**Kritiek (zonder = app broken):**
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (throws error if missing)
- `RESEND_API_KEY`
- `CRON_SECRET`

**Belangrijk (functionaliteit beperkt):**
- `MOLLIE_API_KEY`
- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL` + `TOKEN`
- `TELEGRAM_BOT_TOKEN` + `CHAT_ID`
- `GOOGLE_*` (calendar)
- `VAPID_*` (push notifications)

**Opgeslagen in:**
- `.env.local` (lokaal)
- `.env.production.local` (productie overrides)
- `.env.example` (template — GEEN secrets)
- Vercel dashboard (productie)

---

`AUDIT_COMPLETE`
