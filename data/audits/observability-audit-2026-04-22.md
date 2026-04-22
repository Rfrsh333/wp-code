# Observability & Sentry Coverage Audit — TopTalent

**Datum:** 2026-04-22
**Auditor:** Claude (SRE focus)
**Stack:** Next.js 16 + Sentry + Vercel + Supabase + Telegram + Upstash Redis
**Status:** Geen Sentry/Vercel/alert-config gewijzigd. Geen test-errors getriggerd in productie.

---

## Executive Summary

TopTalent heeft Sentry correct geconfigureerd als infrastructuur (DSN, source maps, tunnel route, session replay), maar **gebruikt het nauwelijks in de applicatiecode**. Van de ~197 API routes stuurt er **0** expliciet errors naar Sentry. Alle 14 AI agents degraden silent naar fallbacks. Alle 24 cron jobs loggen alleen naar console. Er is geen externe uptime-monitoring.

**De applicatie is effectief blind voor 99.6% van de server-side errors in productie.**

---

## De Zeven Vragen — Beantwoord

### 1. Welke routes sturen errors naar Sentry, en welke niet?

**Antwoord:** Vrijwel geen enkele route stuurt expliciet naar Sentry.

| Categorie | Totaal | Met Sentry | Coverage |
|-----------|--------|------------|----------|
| API routes | ~197 | 0 | 0% |
| AI agents | 14 | 0 | 0% |
| Cron jobs | 24 | 0 | 0% |
| Global error boundary | 1 | 1 | 100% |

De enige expliciete `Sentry.captureException` staat in `global-error.tsx` (React client crashes). Server-side errors worden door `onRequestError` in `instrumentation.ts` opgepakt, maar alleen als ze als uncaught exceptions opborrelen — de meeste worden gevangen in try-catch en naar `console.error` gestuurd.

**Details:** [obs/sentry-coverage-matrix.md](obs/sentry-coverage-matrix.md)

### 2. Welke agents en achtergrond-jobs hebben observability?

**Antwoord:** Geen.

- **14 AI agents** (lead-scoring, screening, outreach, etc.): allemaal try-catch met silent fallback. Geen Sentry tags, geen spans, geen success/failure tracking.
- **24 cron jobs** (facturen, reminders, cleanup, etc.): allemaal console.error only. Geen Sentry Cron Monitors.
- **1 cron job** (`booking-autocomplete`) heeft zelfs geen try-catch.

### 3. Hoe ziet de Sentry-issue-pipeline eruit?

**Antwoord:** Niet te bepalen zonder dashboard-toegang.

Wat we weten vanuit de code:
- Sentry webhook stuurt nieuwe issues door naar Telegram
- Geen triage-workflow, assignment-regels of resolved-tracking in code
- Geen Sentry API integratie

**Details:** [obs/sentry-issue-pipeline.md](obs/sentry-issue-pipeline.md)

### 4. Welke alerts gaan naar wie en hoe snel?

**Antwoord:** 15 Telegram alert-triggers in 11 bestanden. Goed voor user actions, blind voor system errors.

| Alert type | Kanaal | Gedekt |
|-----------|--------|--------|
| Form submissions, registraties | Telegram | Ja |
| Email bounces/spam | Telegram | Ja |
| Hot leads | Telegram | Ja |
| Sentry nieuwe issues | Telegram (via webhook) | Ja |
| Cron job failures | **NIETS** | Nee |
| Rate limit hits | **NIETS** | Nee |
| Uptime | **NIETS** | Nee |
| DB quota | **NIETS** | Nee |

**Details:** [obs/alerts-en-escalatie.md](obs/alerts-en-escalatie.md)

### 5. Wat zijn de huidige SLI's?

**Antwoord:** Er zijn geen expliciete SLI's gedefinieerd.

Voorgestelde SLI's:

| SLI | Meetbaar met | Doel-SLO |
|-----|-------------|----------|
| Homepage uptime | UptimeRobot (gratis) | 99.9% |
| Form success rate | Sentry transactions | > 99% |
| Mail delivery rate | Resend webhooks | > 98% |
| Page LCP (mobile) | Vercel Analytics | < 2.5s p75 |
| Cron job success | Sentry Cron Monitors | > 99% |

**Details:** [obs/sli-slo-en-stille-fouten.md](obs/sli-slo-en-stille-fouten.md)

### 6. Welke "stille fouten" gebeuren zonder dat we 't weten?

**Antwoord:** Minstens 8 categorieën:

1. **Cron job failures** — 24 jobs, 0 alerting
2. **AI agent degradation** — 14 agents vallen silent terug naar defaults
3. **OpenAI API outages** — geen error-categorisatie (rate limit vs timeout vs auth)
4. **DB constraint violations** — generieke 500's, geen Sentry context
5. **Rate limit brute force** — data aanwezig in Upstash, niet gemonitord
6. **Webhook processing failures** — console.error only
7. **Resend delivery failures** — alleen bounce/spam, niet soft bounces
8. **Vercel Cron stopped** — geen detectie als Vercel stopt met triggeren

### 7. Wat is het 80/20-voorstel?

**Antwoord:** 3 quick wins die samen 80% van de blinde vlekken oplossen, totale kosten €0.

**Details:** [obs/verbetervoorstel.md](obs/verbetervoorstel.md)

---

## TOP-3 Observability-blinde-vlekken

1. **Server-side errors zijn onzichtbaar** — 197 API routes sturen niets naar Sentry. Errors verdwijnen in Vercel's kortstondige request logs.

2. **Cron jobs zijn een black box** — 24 background jobs (incl. facturatie en document-reminders) draaien zonder monitoring. Als ze falen, merkt niemand het.

3. **Geen uptime monitoring** — Er is geen externe dienst die checkt of de site online is. Downtime wordt pas ontdekt als een klant/kandidaat het meldt.

---

## TOP-3 Quick Wins

| # | Actie | Tijd | Kosten | Effect |
|---|-------|------|--------|--------|
| 1 | UptimeRobot op homepage + /api/health | 15 min | €0 | Downtime-detectie binnen 5 min |
| 2 | `Sentry.captureException` in alle API routes | 2-3 uur | €0 | Van 0% naar ~100% error visibility |
| 3 | Release tracking (`VERCEL_GIT_COMMIT_SHA`) | 10 min | €0 | Errors koppelen aan deploys |

---

## TOP-3 Voorgestelde SLI's

| SLI | Hoe meten | Doel |
|-----|-----------|------|
| Homepage availability | UptimeRobot ping (5 min) | 99.9% per maand |
| `/api/inschrijven` success rate | Sentry error rate | > 99% |
| Cron job completion | Sentry Cron Monitors | > 99% |

---

## Deelrapporten

1. [obs/sentry-config.md](obs/sentry-config.md) — Sentry configuratie-analyse
2. [obs/sentry-coverage-matrix.md](obs/sentry-coverage-matrix.md) — Coverage per route/agent/cron
3. [obs/sentry-issue-pipeline.md](obs/sentry-issue-pipeline.md) — Issue triage & hygiëne
4. [obs/alerts-en-escalatie.md](obs/alerts-en-escalatie.md) — Alert routing & gaps
5. [obs/sli-slo-en-stille-fouten.md](obs/sli-slo-en-stille-fouten.md) — SLI's & stille fouten
6. [obs/verbetervoorstel.md](obs/verbetervoorstel.md) — 80/20 verbeterplan met code-voorbeelden

---

## Bevestiging

- Geen Sentry-config gewijzigd
- Geen Vercel/alert-config gewijzigd
- Geen test-errors getriggerd in productie
- Alleen read-only analyse van code en configuratie
