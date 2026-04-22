# Sentry Coverage Matrix

**Datum:** 2026-04-22
**Methode:** Grep op `Sentry.captureException`, `Sentry.captureMessage`, `Sentry.startSpan`, `Sentry.withScope` + handmatige inspectie van try/catch blokken

---

## Kernstatistieken

| Metric | Waarde |
|--------|--------|
| Totaal API routes | ~197 |
| Routes met `Sentry.captureException` | **0** (0%) |
| Routes met `Sentry.startSpan` | **0** (0%) |
| Routes met alleen `console.error` | **197** (100%) |
| Agents met Sentry | **0 van 14** |
| Cron jobs met Sentry | **0 van 24** |
| Bestanden met expliciete Sentry capture | **1** (`global-error.tsx`) |

---

## Coverage per categorie

### Authenticatie Routes (CRITICAL)

| Route | Bestand | Sentry? | Error handling | Severity |
|-------|---------|---------|----------------|----------|
| POST /api/admin/login | `src/app/api/admin/login/route.ts` | Nee | console.error (r159) | CRITICAL |
| POST /api/medewerker/login | `src/app/api/medewerker/login/route.ts` | Nee | console.error (r84) | CRITICAL |
| POST /api/klant/login | `src/app/api/klant/login/route.ts` | Nee | console.error (r75) | CRITICAL |
| POST /api/admin/verify-otp | `src/app/api/admin/verify-otp/route.ts` | Nee | console.error | CRITICAL |
| POST /api/klant/register | `src/app/api/klant/register/route.ts` | Nee | console.error | HIGH |

### Cron Jobs (CRITICAL)

| Cron | Bestand | Sentry? | Error handling | Severity |
|------|---------|---------|----------------|----------|
| /api/cron/facturen | `src/app/api/cron/facturen/route.ts` | Nee | console.error (r99) | CRITICAL |
| /api/cron/document-reminders | `src/app/api/cron/document-reminders/route.ts` | Nee | console.error (r65, r135) | CRITICAL |
| /api/cron/onboarding-autopilot | `src/app/api/cron/onboarding-autopilot/route.ts` | Nee | console.error | HIGH |
| /api/cron/onboarding-cleanup | `src/app/api/cron/onboarding-cleanup/route.ts` | Nee | console.error | HIGH |
| /api/cron/booking-autocomplete | `src/app/api/cron/booking-autocomplete/route.ts` | Nee | Geen try-catch! | CRITICAL |
| /api/cron/booking-reminders | `src/app/api/cron/booking-reminders/route.ts` | Nee | console.error | MEDIUM |
| /api/cron/acquisitie-drip | `src/app/api/cron/acquisitie-drip/route.ts` | Nee | console.error | MEDIUM |
| /api/cron/content-suggestion | `src/app/api/cron/content-suggestion/route.ts` | Nee | console.error | LOW |
| /api/cron/review-requests | `src/app/api/cron/review-requests/route.ts` | Nee | console.error | LOW |
| /api/cron/daily-cleanup | `src/app/api/cron/daily-cleanup/route.ts` | Nee | console.error | MEDIUM |
| Overige 14 cron routes | diverse | Nee | console.error | MEDIUM |

### Financieel (HIGH)

| Route | Bestand | Sentry? | Error handling | Severity |
|-------|---------|---------|----------------|----------|
| POST /api/facturen/generate | `src/app/api/facturen/generate/route.ts` | Nee | console.error (r159) | HIGH |
| POST /api/personeel-aanvragen | `src/app/api/personeel-aanvragen/route.ts` | Nee | console.error + Telegram | HIGH |
| POST /api/calculator/lead | `src/app/api/calculator/lead/route.ts` | Nee | console.error | MEDIUM |

### Webhooks (HIGH)

| Route | Bestand | Sentry? | Error handling | Severity |
|-------|---------|---------|----------------|----------|
| POST /api/webhooks/sentry | `src/app/api/webhooks/sentry/route.ts` | Nee | console.error (r59) | MEDIUM |
| POST /api/webhooks/resend | `src/app/api/webhooks/resend/route.ts` | Nee | console.error | HIGH |
| POST /api/webhooks/whatsapp | `src/app/api/webhooks/whatsapp/route.ts` | Nee | console.error | HIGH |

### AI / Chat (MEDIUM)

| Route | Bestand | Sentry? | Error handling | Severity |
|-------|---------|---------|----------------|----------|
| POST /api/ai-chat/user-message | `src/app/api/ai-chat/user-message/route.ts` | Nee | console.error (r67) | MEDIUM |
| POST /api/admin/ai/screening | `src/app/api/admin/ai/screening/route.ts` | Nee | console.error | MEDIUM |
| POST /api/admin/ai/lead-score | `src/app/api/admin/ai/lead-score/route.ts` | Nee | console.error | MEDIUM |

### Overige publieke routes

| Route | Bestand | Sentry? | Error handling | Severity |
|-------|---------|---------|----------------|----------|
| POST /api/contact | `src/app/api/contact/route.ts` | Nee | console.error | MEDIUM |
| POST /api/inschrijven | `src/app/api/inschrijven/route.ts` | Nee | console.error | HIGH |
| GET /api/health | `src/app/api/health/route.ts` | Nee | try-catch | LOW |

---

## AI Agents

| Agent | Bestand | Sentry? | Tags? | Error handling |
|-------|---------|---------|-------|----------------|
| lead-scoring | `src/lib/agents/lead-scoring.ts` | Nee | Nee | try-catch + fallback |
| outreach-email | `src/lib/agents/outreach-email.ts` | Nee | Nee | try-catch + fallback |
| smart-sequence | `src/lib/agents/smart-sequence.ts` | Nee | Nee | try-catch + fallback |
| lead-followup | `src/lib/agents/lead-followup.ts` | Nee | Nee | try-catch + fallback |
| content-generator | `src/lib/agents/content-generator.ts` | Nee | Nee | try-catch + fallback |
| lead-research | `src/lib/agents/lead-research.ts` | Nee | Nee | try-catch + fallback |
| whatsapp-message | `src/lib/agents/whatsapp-message.ts` | Nee | Nee | try-catch + fallback |
| competitive-intel | `src/lib/agents/competitive-intel.ts` | Nee | Nee | try-catch + fallback |
| predictive-ai | `src/lib/agents/predictive-ai.ts` | Nee | Nee | try-catch + fallback |
| klant-retention | `src/lib/agents/klant-retention.ts` | Nee | Nee | try-catch + fallback |
| review-response | `src/lib/agents/review-response.ts` | Nee | Nee | try-catch + fallback |
| offerte-generator | `src/lib/agents/offerte-generator.ts` | Nee | Nee | try-catch + fallback |
| kandidaat-screening | `src/lib/agents/kandidaat-screening.ts` | Nee | Nee | try-catch + fallback |
| dienst-planner | `src/lib/agents/dienst-planner.ts` | Nee | Nee | try-catch + fallback |

**Probleem:** Alle agents degraden graceful naar fallback-responses, maar rapporteren nooit *waarom* ze terugvielen. Dit maakt het onmogelijk om structurele OpenAI-fouten of prompt-problemen te detecteren.

---

## Global Error Handlers

| Handler | Status | Locatie |
|---------|--------|---------|
| React Error Boundary | Aanwezig | `src/app/global-error.tsx` — `Sentry.captureException(error)` |
| onRequestError | Aanwezig | `instrumentation.ts` — `Sentry.captureRequestError` |
| unhandledRejection | **ONTBREEKT** | Geen globale handler |
| uncaughtException | **ONTBREEKT** | Geen server-side handler |

---

## Conclusie

De applicatie is effectief **blind** voor 99.6% van de errors in productie. Sentry's infrastructuur is correct geconfigureerd (DSN, sampling, source maps), maar wordt nauwelijks gebruikt in de applicatiecode. De enige expliciete `Sentry.captureException` staat in `global-error.tsx` (client-side React crashes). Alle server-side errors verdwijnen in `console.error()` die alleen zichtbaar is in Vercel's kortstondige request logs.
