# Disaster Recovery Plan — TopTalent Jobs

**Laatst bijgewerkt:** 2026-04-22
**Verantwoordelijke:** [INVULLEN]
**Noodcontact:** [INVULLEN — telefoon + email]

---

## Snel Overzicht

| Systeem | RTO | RPO | Herstelmethode |
|---------|-----|-----|----------------|
| Database | 30-60 min | < 5 min (PITR) / 24u (daily) | Supabase restore |
| Storage | 2-4 uur | 7 dagen (wekelijkse backup) | Restore vanuit backup |
| Website | 30-60 min | 0 | Redeploy vanuit GitHub |
| Secrets | 1-2 uur | 0 | Wachtwoordmanager |

---

## Backup Schema

### Dagelijks (automatisch via GitHub Actions)
- **03:00 UTC:** Database pg_dump → GitHub Artifact (30 dagen retentie)
- **Supabase:** Daily backup (7-14 dagen retentie)

### Wekelijks (handmatig of via CI)
- **Zondag 04:00 UTC:** Storage buckets → GitHub Artifact (14 dagen retentie)

### Handmatig
```bash
# Database backup
source .env.local && bash scripts/backup-database.sh

# Storage backup
source .env.local && bash scripts/backup-storage.sh

# Verificatie
bash scripts/backup-verify.sh
```

---

## Noodprocedures

### Website down?
1. Check https://www.vercelstatus.com/ en https://status.supabase.com/
2. Als Vercel down → wacht, code is veilig in GitHub
3. Als Supabase down → wacht, data is veilig

### Database corrupt/weg?
→ Zie `data/audits/dr/runbook-db-wiped.md`

### Documenten kwijt?
→ Zie `data/audits/dr/runbook-storage-weg.md`

### Vercel account kwijt?
→ Zie `data/audits/dr/runbook-vercel-weg.md`

---

## Secrets Checklist

Zorg dat ALLE secrets op minimaal 2 plekken staan:

| Secret | Vercel | .env.local | Wachtwoordmanager |
|--------|--------|------------|-------------------|
| SUPABASE_URL | [ ] | [ ] | [ ] |
| SUPABASE_ANON_KEY | [ ] | [ ] | [ ] |
| SUPABASE_SERVICE_ROLE_KEY | [ ] | [ ] | [ ] |
| JWT_SECRET | [ ] | [ ] | [ ] |
| CRON_SECRET | [ ] | [ ] | [ ] |
| KANDIDAAT_TOKEN_SECRET | [ ] | [ ] | [ ] |
| RESEND_API_KEY | [ ] | [ ] | [ ] |
| RESEND_WEBHOOK_SECRET | [ ] | [ ] | [ ] |
| MOLLIE_API_KEY | [ ] | [ ] | [ ] |
| OPENAI_API_KEY | [ ] | [ ] | [ ] |
| UPSTASH_REDIS_REST_URL | [ ] | [ ] | [ ] |
| UPSTASH_REDIS_REST_TOKEN | [ ] | [ ] | [ ] |
| TELEGRAM_BOT_TOKEN | [ ] | [ ] | [ ] |
| TELEGRAM_CHAT_ID | [ ] | [ ] | [ ] |
| ADMIN_EMAILS | [ ] | [ ] | [ ] |
| ADMIN_ROLE_MAP | [ ] | [ ] | [ ] |
| GOOGLE_CLIENT_SECRET | [ ] | [ ] | [ ] |
| GOOGLE_REFRESH_TOKEN | [ ] | [ ] | [ ] |
| VAPID_PRIVATE_KEY | [ ] | [ ] | [ ] |
| SENTRY_AUTH_TOKEN | [ ] | [ ] | [ ] |
| DATABASE_URL | [ ] | [ ] | [ ] |

**Actie:** Vul deze checklist in en bewaar in wachtwoordmanager.

---

## Kwartaal DR-check

Elk kwartaal:
- [ ] Backup-scripts draaien nog (check GitHub Actions)
- [ ] Laatste DB backup < 2 dagen oud
- [ ] Laatste Storage backup < 8 dagen oud
- [ ] Secrets in wachtwoordmanager up-to-date
- [ ] Noodcontact nog bereikbaar
- [ ] Supabase plan + PITR status gecontroleerd

## Jaarlijkse DR-drill

Jaarlijks:
- [ ] Database restore naar test-omgeving
- [ ] Storage restore testen
- [ ] Nieuw Vercel-project opzetten vanuit GitHub (test)
- [ ] Alle env vars handmatig invullen vanuit wachtwoordmanager (test)
- [ ] RTO meten en documenteren
- [ ] Runbooks updaten

---

## Setup-instructies

### GitHub Secrets toevoegen (voor backup workflow)

Ga naar GitHub → Repository → Settings → Secrets and variables → Actions

Voeg toe:
- `DATABASE_URL` — Supabase direct connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key
- `TELEGRAM_BOT_TOKEN` — Voor failure alerts
- `TELEGRAM_CHAT_ID` — Voor failure alerts

### Externe opslag (optioneel, aanbevolen)

Voor off-site backups naar Cloudflare R2:
1. Maak R2 bucket aan in Cloudflare dashboard
2. Installeer rclone: `brew install rclone`
3. Configureer: `rclone config` → S3 compatible → Cloudflare R2
4. Set env var: `BACKUP_REMOTE=r2:toptalent-backups`
