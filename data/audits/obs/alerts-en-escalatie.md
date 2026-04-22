# Alerts & Escalatie

**Datum:** 2026-04-22
**Alert kanalen:** Telegram (primair), Sentry (error tracking)

---

## 1. Telegram Alerts vanuit code

### Configuratie (`src/lib/telegram.ts`)
- Bot token + chat ID via environment variables
- 10-seconde timeout met AbortController
- HTML parse mode
- Silent error handling (logt warning, gooit geen exception)
- **Geen retry-mechanisme** als Telegram faalt
- **Geen rate-limiting** op alerts

### Overzicht alert-triggers

| Event | Route | Bericht | PII-vrij |
|-------|-------|---------|----------|
| Nieuw contactbericht | `/api/contact` | "Nieuw contactbericht ontvangen" | Ja |
| Personeel aanvraag (succes) | `/api/personeel-aanvragen` | "[aantal] personen [type]" | Ja |
| Personeel aanvraag (DB error) | `/api/personeel-aanvragen` | "DATABASE ERROR — data NIET opgeslagen" | Ja |
| Nieuwe klant registratie | `/api/klant/register` | "Nieuwe klant geregistreerd" | Ja |
| Personeelsaanvraag (klant) | `/api/klant/aanvraag` | "[aantal] personen op [datum]" | Ja |
| Nieuw bericht van klant | `/api/klant/berichten` | "Nieuw bericht van klant" | Ja |
| Calculator lead | `/api/calculator/lead` | "Nieuwe calculator lead" | Ja |
| High-score lead (AI) | `/api/admin/ai/lead-score` | "[score]/100" | Ja |
| High-score lead (acquisitie) | `/api/admin/acquisitie/leads` | "[score]/100" | Ja |
| Positieve reactie | `/api/admin/acquisitie/contactmomenten` | "Positieve reactie — pipeline update" | Ja |
| Email bounced | `/api/webhooks/resend` | "Email bounced — campagne gestopt" | Ja |
| Spam klacht | `/api/webhooks/resend` | "Spam klacht — lead afgewezen" | Ja |
| Hot lead (engagement 50+) | `/api/webhooks/resend` | "Hot Lead! Engagement: [score]" | Ja |
| WhatsApp (onbekend) | `/api/webhooks/whatsapp` | "WhatsApp van onbekend nummer" | Ja |
| WhatsApp (bekend) | `/api/webhooks/whatsapp` | "WhatsApp van bekende lead" | Ja |

**Totaal: 15 alert-triggers in 11 bestanden**

### Problemen

1. **Geen rate-limiting** — Hot lead triggers (engagement 50+) kunnen rapid-fire Telegram-berichten genereren
2. **Geen deduplicatie** — Identieke events sturen identieke berichten
3. **Geen cooldown per event type** — 10 bounces = 10 aparte alerts
4. **Dubbele alerts** in personeel-aanvragen: zowel in main response als in `after()` callback
5. **Telegram-falen is silent** — Als Telegram API down is, verdwijnen alerts zonder waarschuwing

---

## 2. Sentry Webhook → Telegram

**Route:** `/api/webhooks/sentry/route.ts`

- Verifieert `sentry-hook-signature` header
- Filtert op actions: `created` en `triggered`
- Stuurt naar Telegram met severity-emoji:
  - Fatal: rode cirkel
  - Error: oranje cirkel
  - Warning: gele cirkel
- Bevat: issue title, culprit, count, Sentry URL

**Probleem:** Geen filtering of deduplicatie — elke nieuwe Sentry issue triggert Telegram.

---

## 3. Health Check Endpoint

**Route:** `/api/health`

| Check | Wat het test |
|-------|-------------|
| Supabase | DB-connectiviteit |
| Redis | Upstash ping |
| Resend | API key aanwezig |
| Sentry | DSN aanwezig |
| Telegram | Bot token + chat ID aanwezig |
| JWT secrets | Admin + medewerker secrets aanwezig |

- Public: basis status (ok/degraded)
- Admin: gedetailleerde component-status
- 60-seconde cache met stale-while-revalidate

**Probleem:** Endpoint bestaat maar wordt door niemand gepolld.

---

## 4. Externe monitoring

| Service | Status |
|---------|--------|
| UptimeRobot | **NIET GECONFIGUREERD** |
| BetterStack | **NIET GECONFIGUREERD** |
| Statuscake | **NIET GECONFIGUREERD** |
| Pingdom | **NIET GECONFIGUREERD** |
| Vercel deployment alerts | Standaard (email bij failed deploy) |

**Severity: CRITICAL** — Er is geen externe uptime-monitoring. Downtime wordt pas gemerkt als een klant of kandidaat het meldt.

---

## 5. Rate Limit Monitoring

### Geconfigureerde rate limits (`src/lib/rate-limit-redis.ts`)

| Limiter | Limiet | Prefix |
|---------|--------|--------|
| loginRateLimit | 5 req / 15 min | `ratelimit:admin-login` |
| formRateLimit | 5 req / 1 min | `ratelimit:form` |
| apiRateLimit | 10 req / 1 min | `ratelimit:api` |
| klantLoginRateLimit | 5 req / 15 min | `ratelimit:klant-login` |
| klantRegisterRateLimit | 3 req / 15 min | `ratelimit:klant-register` |
| calculatorLeadRateLimit | 10 req / 1 uur | `ratelimit:calculator-lead` |
| contractSignRateLimit | 5 req / 15 min | `ratelimit:contract-sign` |
| aiRateLimit | 5 req / 1 min | `ratelimit:ai` |
| bulkEmailRateLimit | 3 req / 1 uur | `ratelimit:bulk-email` |

- Upstash analytics: **ingeschakeld** op alle limiters
- **Geen alerts bij rate limit hits** — data zit in Upstash maar wordt niet gemonitord
- **Geen DDoS-detectie** (bijv. "10+ IPs geratelimit in 5 minuten")
- Fallback naar in-memory bij Redis-uitval (schaalt niet over instances)

---

## 6. Supabase & Database Monitoring

| Aspect | Status |
|--------|--------|
| DB error logging | console.error in routes |
| DB error alerts | Alleen personeel-aanvragen (Telegram) |
| Storage quota monitoring | **NIET GEIMPLEMENTEERD** |
| Row count monitoring | **NIET GEIMPLEMENTEERD** |
| Connection pool monitoring | **NIET GEIMPLEMENTEERD** |

---

## 7. Mollie / Payment Monitoring

| Aspect | Status |
|--------|--------|
| Payment webhook | Niet gevonden in `/api/webhooks/` |
| Failed payment alerts | **NIET GEIMPLEMENTEERD** |

---

## Alert-kanaal dekking samenvatting

| Alert type | Kanaal | Auto-alert | Dekking |
|-----------|--------|-----------|---------|
| User actions (forms, registraties) | Telegram | Ja | Goed |
| Critical DB errors | Telegram | Deels | Alleen personeel-aanvragen |
| Application errors | Sentry → Telegram | Ja | Alleen global-error.tsx + onRequestError |
| Rate limit hits | Geen | Nee | **BLIND** |
| Cron job failures | Geen | Nee | **BLIND** |
| Uptime | Geen | Nee | **BLIND** |
| Supabase quotas | Geen | Nee | **BLIND** |
| Email bounces/spam | Telegram | Ja | Goed |
| Hot leads | Telegram | Ja | Goed |
