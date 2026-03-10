# Operations Checklist

Deze onderdelen zijn bewust buiten de app-code gehouden, maar zijn wel essentieel om de site echt productieklaar te maken.

## Nog handmatig instellen

- Resend domein valideren met SPF, DKIM en DMARC voor `toptalentjobs.nl`
- Supabase automatische backups controleren en een restore-runbook vastleggen
- `ADMIN_ROLE_MAP` in productie instellen, bijvoorbeeld `owner@bedrijf.nl:owner,recruiter@bedrijf.nl:recruiter`
- `CRON_SECRET` in Vercel instellen
- `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` in productie instellen

## Regelmatig controleren

- `/api/health`
- Admin overview operations cards
- `audit_log` op gevoelige mutaties
- `email_log` op bounces of delivery failures

## Bewaarbeleid kandidaatdocumenten

- wijs een maximale bewaartermijn toe voor afgewezen kandidaten
- verwijder documenten actief na die termijn
- houd in je privacybeleid aan wie toegang heeft en hoe verwijderverzoeken worden behandeld
