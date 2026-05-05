# Fase 2: Backup-status per systeem

**Datum:** 2026-04-22
**Status:** `CRITICAL_GAPS`

---

## Samenvatting

| Systeem | Backup aanwezig | Frequentie | Retentie | Restore getest | Status |
|---------|----------------|------------|----------|----------------|--------|
| Supabase DB | Supabase daily backups | Dagelijks | 7-14d (plan-afhankelijk) | NEE | RISICO |
| Supabase Storage | GEEN | - | - | NEE | KRITIEK |
| Supabase Auth | Via DB backup | Dagelijks | 7-14d | NEE | RISICO |
| Vercel (env vars) | GEEN offsite | - | - | NEE | KRITIEK |
| GitHub (code) | Git distributed | Elke push | Onbeperkt | JA (clone) | OK |
| Resend | GEEN | - | - | N.v.t. | LAAG |
| Mollie | Bij Mollie | Realtime | Onbeperkt | N.v.t. | OK |
| Upstash | Ephemeral | - | - | N.v.t. | OK |

---

## Detail per systeem

### 1. Supabase Database

**Supabase-ingebouwde backups:**
- Free plan: dagelijks, 7 dagen retentie
- Pro plan: dagelijks, 7 dagen retentie
- Scale-Up: dagelijks, 14 dagen retentie

**Point-in-Time Recovery (PITR):**
- Status: ONBEKEND — moet in Supabase dashboard gecontroleerd worden
- Vereist: Pro plan + addon ($100/maand, 7 dagen; $200/maand, 14-35 dagen)
- Als PITR NIET aan staat: RPO = 24 uur (alleen daily backup)

**Handmatige pg_dump:**
- Status: NIET AANWEZIG
- Geen backup-script in `scripts/` directory
- Geen GitHub Action voor geautomatiseerde dumps
- Geen off-site kopie van database dumps

**Bevinding KRITIEK:** Er is geen enkele door TopTalent beheerde backup. Er wordt volledig vertrouwd op Supabase's ingebouwde daily backups, die NIET getest zijn en waarvan de plan-retentie onbekend is.

### 2. Supabase Storage

**Supabase Storage backup:**
- Status: NIET BESCHIKBAAR
- Supabase biedt GEEN automatische backup van Storage buckets
- Dit is gedocumenteerd in Supabase docs: "Storage objects are not included in database backups"

**Eigen backup-script:**
- Status: NIET AANWEZIG
- Geen rsync, rclone, of ander kopieerscript
- Geen periodieke export naar S3/B2/R2/lokaal

**Inhoud op risico:**
- `kandidaat-documenten`: CV's van alle kandidaten — onvervangbaar tenzij opnieuw opgevraagd
- `medewerker-documenten`: ID-bewijzen, contracten, certificaten — wettelijk verplichte bewaring (WID, 5 jaar)

**Bevinding KRITIEK:** Bij Storage-verlies zijn alle kandidaat-CV's, ID-bewijzen en contractdocumenten permanent verloren. Dit is het grootste DR-risico.

### 3. Vercel (Environment Variables)

**Deployment rollback:** Vercel bewaart alle deployments — rollback is direct mogelijk.

**Environment variables:**
- Opgeslagen in Vercel dashboard
- Lokale kopie: `.env.local` en `.env.production.local` (in .gitignore)
- Template: `.env.example` bevat alle variabelen-namen (zonder secrets)
- Wachtwoordmanager: ONBEKEND of secrets ook in 1Password/Bitwarden staan

**Bevinding HOOG:** Als het Vercel-account gecompromitteerd of verwijderd wordt, zijn 40+ environment variables weg. De `.env.local` bestanden zijn alleen lokaal beschikbaar.

### 4. GitHub

**Branche-protectie:**
- Status: NIET GECONFIGUREERD
- Geen required reviews
- Geen required status checks
- Force-push naar main is mogelijk

**Repository mirrors:**
- Status: GEEN mirror
- Alleen GitHub als remote

**Bevinding MIDDEL:** Code-verlies is onwaarschijnlijk (Git distributed), maar account-lockout of force-push kan wel schade aanrichten.

### 5. Externe Services

| Service | Data bij hen | Backup door ons | Risico |
|---------|-------------|-----------------|--------|
| Resend | Mail-logs, bounce-data | NEE | LAAG — templates in code |
| Mollie | Payment records | NEE — ophaalbaar via API | LAAG |
| Sentry | Error-data 30-90d | NEE | LAAG |
| Upstash | Ephemeral cache | NEE — herbouwt automatisch | LAAG |
| Google Calendar | Afspraken | Via Google Takeout | LAAG |

---

## Gap-analyse

| # | Gap | Ernst | Actie |
|---|-----|-------|-------|
| B-01 | Geen off-site database backup (pg_dump) | KRITIEK | Dagelijks pg_dump naar externe opslag |
| B-02 | Geen Storage backup | KRITIEK | Wekelijks alle buckets kopiëren naar R2/S3 |
| B-03 | PITR status onbekend | HOOG | Controleer in Supabase dashboard, activeer indien niet aan |
| B-04 | Env vars niet in wachtwoordmanager | HOOG | Kopieer alle secrets naar 1Password/Bitwarden |
| B-05 | Geen restore ooit getest | HOOG | Plan maandelijkse restore-drill |
| B-06 | Geen branch protection | MIDDEL | GitHub settings activeren |
| B-07 | Backup-retentie plan onbekend | MIDDEL | Controleer Supabase plan-level |

---

`CRITICAL_GAPS`
