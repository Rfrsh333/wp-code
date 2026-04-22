# Master Prompt — Observability & Sentry Coverage Audit
## TopTalent | Errors, logs, alerts, metrics

Versie: 1.0
Doel: weet of je productie écht observeerbaar is. Welke routes en agents sturen errors naar Sentry, welke slikken ze stilletjes, hoe laat je merkt dat iets stuk is, en heb je een workflow om de signalen ook daadwerkelijk te verwerken (of stapelt het zich op tot een dashboard vol rode rommel die niemand meer leest)?

---

## ⚠️ RUN-MODE — READ-ONLY

- Geen Sentry-projecten of alert-rules wijzigen.
- Geen wijzigingen in `Sentry.init` of `beforeSend`.
- Geen test-errors triggeren in productie (alleen in lokaal of staging).
- Sentry/Vercel/Supabase logs alleen lezen, niet exporteren met PII.

---

## ROL & CONTEXT

Je bent een SRE met focus op observability voor kleine SaaS. Je kent het verschil tussen **logs**, **metrics** en **traces** (de drie pillars), het concept van **SLI/SLO/SLA**, en de praktische realiteit dat een indie-dev geen Datadog-budget heeft maar wél fatsoenlijke alerts nodig heeft.

**Stack:** Sentry (al actief), Vercel logs (per request), Supabase logs (DB queries + auth events), Telegram (admin-alert kanaal), eventueel Upstash Redis. Geen dedicated APM.

---

## MISSIE

Lever op in `data/audits/observability-audit-YYYY-MM-DD.md` antwoord op zeven vragen:

1. **Welke routes/components sturen errors naar Sentry, en welke niet?**
2. **Welke agents en achtergrond-jobs hebben observability?**
3. **Hoe ziet de Sentry-issue-pipeline eruit?** (Aantal open issues, gemiddelde leeftijd, % afgehandeld.)
4. **Welke alerts gaan naar wie en hoe snel?** (Telegram? Mail? Niets?)
5. **Wat zijn de huidige SLI's (Service Level Indicators)?** (Uptime? Form-submit-success-rate?)
6. **Welke "stille fouten" gebeuren in productie zonder dat we 't weten?**
7. **Wat is het 80/20-voorstel** voor betere observability zonder dure tooling?

---

## ABSOLUTE REGELS

- Geen Sentry-config wijzigingen.
- Geen test-errors in productie.
- PII uit Sentry-issues niet letterlijk in rapport.
- `gitnexus_impact` voor elke code-fix die meer dan 3 files raakt.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Sentry-config audit

1. **Initialisatie:**
   - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — bestaan ze, allemaal correct geïnitialiseerd?
   - DSN per env (dev/prod gescheiden)?
   - `tracesSampleRate` — productie waarde? 1.0 = alle requests (duur), 0.1 = 10%.
   - `replaysSessionSampleRate` + `replaysOnErrorSampleRate` (Session Replay) — aan/uit?
2. **`beforeSend`-hook:**
   - Wordt PII gescrubd uit request-body, headers, breadcrumbs?
   - Worden bekende noise-errors gefilterd (browser-extensies, third-party scripts)?
3. **Release-tracking:**
   - Wordt `release` per deploy gezet (commit-sha)? Cruciaal voor "wanneer is dit kapot gegaan?"-vragen.
4. **Source maps:**
   - Worden source maps geüpload zodat stack traces leesbaar zijn?

Output: `obs/sentry-config.md`.

### Fase 2 — Sentry-coverage in code

1. `gitnexus_query({query: "Sentry capture"})` + grep voor `Sentry.captureException`, `Sentry.captureMessage`, `withSentry`, `Sentry.startSpan`.
2. **Per try/catch in API-routes:** wordt error-tak naar Sentry gestuurd of alleen `console.error`?
3. **Per agent in `src/lib/agents/*`:** wordt agent-execution gewrapped in Sentry? Tags voor `agent_name`?
4. **`unhandledRejection` / `uncaughtException` handlers** geconfigureerd?
5. **Webhook-routes** (Mollie, Resend) — sturen ze errors naar Sentry? Cruciaal want webhooks zijn black box anders.
6. **Cron / scheduled-tasks:** wordt elke run getrackt (success/failure)? Sentry "Cron Monitors" feature is hier perfect voor.

Maak een matrix `obs/sentry-coverage-matrix.md`:

| Locatie | Sentry-instrumented? | Tags? | Severity bij gemis |
|---------|----------------------|-------|---------------------|
| `src/app/api/inschrijven/route.ts` | ja/nee | route, user_id | HIGH als nee |
| `src/lib/agents/kandidaat-screening` | ? | agent_name | HIGH |
| `src/app/api/admin/bulk-email` | ? | route | HIGH |
| ... | ... | ... | ... |

### Fase 3 — Sentry issue-pipeline check

In Sentry dashboard (vraag eigenaar te delen):

1. **Open issues count.** > 50 = signaal dat ze niet worden behandeld; alerts worden ruis.
2. **Gemiddelde leeftijd open issues.** > 30 dagen = workflow-probleem.
3. **Top-10 events by frequency.** Welke errors gebeuren het meest? Waarschijnlijk een paar bekende noise-items + een paar echte bugs.
4. **Issues without assignee.** Niet-toegewezen issues = niemands probleem.
5. **Resolved-rate per maand.** Trending op?
6. **PII-leak risico:** zijn er issues met e-mailadressen/namen in de stack-trace?

Geef een issue-hygiëne-advies: triage-frequentie, assignment-regel, ignore-rules voor bekende noise.

Output: `obs/sentry-issue-pipeline.md`.

### Fase 4 — Alert-routing en escalatie

1. **Sentry alert-rules:**
   - Welke triggers (new issue, regression, threshold)?
   - Naar welk kanaal (email, Slack, Telegram)?
   - Met welke frequentie?
2. **Telegram alerts buiten Sentry** (uit code):
   - Welke events sturen direct Telegram-alerts (nieuwe inschrijving, nieuwe aanvraag, kritieke fout)?
   - Is er een rate-limit op Telegram-spam?
3. **Vercel deployment alerts:** mailen bij failed deploy?
4. **Supabase alerts:** DB-storage-quota nadert, auth-error-spike?
5. **Mollie:** failed payment alert?
6. **Uptime monitoring:** is er een externe dienst (BetterStack / UptimeRobot / Statuscake) die ping't naar je homepage en `/api/health`? Geen = je merkt downtime pas als klant belt.

Output: `obs/alerts-en-escalatie.md`.

### Fase 5 — SLI/SLO + "stille fouten" detectie

**SLI's voorstellen** (haalbaar zonder dure tools):

| SLI | Hoe meten | Doel-SLO |
|-----|-----------|----------|
| Homepage availability | Uptime monitor 1-min ping | 99.9% per maand |
| `/api/inschrijven` success rate | Sentry transactions of Vercel logs / 5xx ratio | > 99% |
| Mail delivery rate | Resend webhook events | > 98% |
| Mollie webhook processing latency | Sentry span | < 5s p95 |
| Page LCP (mobile) | Vercel Analytics | < 2.5s p75 |

**Stille fouten** zoeken:
1. **Console errors in browser.** Worden ze met Sentry browser-SDK opgevangen? Of zegt alleen DevTools "rood"?
2. **Failed background jobs.** Agents die crashen — wordt dat gerapporteerd of stilzwijgend overgeslagen?
3. **Mailen die niet aankwamen** (zie email-audit-prompt voor diepte). Bounces & complaints automatisch alerten?
4. **DB-constraint violations** die als 500 worden teruggegeven — Sentry vangt op of `console.error`?
5. **Rate-limit hits** — worden gelogd? Hoeveel kandidaten worden 429'd?
6. **OpenAI errors** in screening — fallback-pad? Logged?

Output: `obs/sli-slo-en-stille-fouten.md`.

### Fase 6 — 80/20 verbetervoorstel

Op basis van bevindingen, lever:

1. **Top-3 quick wins** (binnen 1 dag werk, groot effect):
   - Bijv. uptime-monitor (UptimeRobot gratis tier) op homepage.
   - Bijv. Sentry Cron Monitor op alle scheduled tasks.
   - Bijv. `beforeSend` PII-scrubbing.
2. **Medium-prioriteit** (1 week werk):
   - Bijv. SLI-dashboard met 5 metrics in admin.
   - Bijv. issue-triage workflow (wekelijks 30 min).
3. **Low-prioriteit** (alleen als budget toelaat):
   - Bijv. distributed tracing met OpenTelemetry.
   - Bijv. dedicated APM.

Output: `obs/verbetervoorstel.md`.

---

## DELIVERABLES

1. `data/audits/observability-audit-YYYY-MM-DD.md` — hoofdrapport.
2. `data/audits/obs/sentry-config.md`
3. `data/audits/obs/sentry-coverage-matrix.md`
4. `data/audits/obs/sentry-issue-pipeline.md`
5. `data/audits/obs/alerts-en-escalatie.md`
6. `data/audits/obs/sli-slo-en-stille-fouten.md`
7. `data/audits/obs/verbetervoorstel.md`

---

## RAPPORTAGESTIJL

- Severity per gap.
- Per fix: ingeschatte impact ("hierdoor zien we 40% meer fouten direct").
- Quick-wins-eerst aanpak.

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- Bevestig: "Geen Sentry/Vercel/alert-config gewijzigd. Geen test-errors getriggerd in productie."
- One-pager: TOP-3 observability-blinde-vlekken, TOP-3 quick wins (kosten/uren-inschatting), TOP-3 voorstel-SLI's.

---

## APPENDIX — BESTANDEN & TOOLS

**Code:**
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `next.config.js` (Sentry-plugin)
- Alle `src/app/api/**/route.ts` (try/catch patroon)
- `src/lib/agents/*` (instrumentatie)
- `src/lib/telegram*` (alert-routes)
- `scripts/*` (cron / scheduled tasks)

**Externe:**
- Sentry dashboard
- Vercel Analytics + logs
- Supabase logs panel
- UptimeRobot / BetterStack (als nog niet gebruikt — voorstel)

---

## BEGIN

1. Sentry-config audit (Fase 1).
2. Sentry-coverage in code (Fase 2) — geeft direct beeld van blinde vlekken.
3. Issue-pipeline check (Fase 3, vraag eigenaar Sentry-toegang).
4. Alert-routing (Fase 4).
5. SLI/SLO + stille fouten (Fase 5).
6. 80/20 verbetervoorstel (Fase 6).
