# SLI/SLO & Stille Fouten

**Datum:** 2026-04-22

---

## Voorgestelde SLI's

| SLI | Hoe meten | Doel-SLO | Huidige status |
|-----|-----------|----------|----------------|
| Homepage availability | Externe uptime monitor (1-min ping) | 99.9% per maand | **NIET GEMETEN** |
| `/api/inschrijven` success rate | Sentry transactions of Vercel 5xx ratio | > 99% | **NIET GEMETEN** |
| `/api/personeel-aanvragen` success rate | Sentry transactions of Vercel 5xx ratio | > 99% | **NIET GEMETEN** |
| Mail delivery rate | Resend webhook events (delivered / sent) | > 98% | Deels (bounce/spam alerts) |
| Page LCP (mobile) | Vercel Analytics | < 2.5s p75 | Via Vercel (consent-gated) |
| API response time p95 | Sentry performance (10% sampling) | < 3s | Deels via Sentry traces |
| Cron job success rate | Custom logging/Sentry Cron Monitors | > 99% | **NIET GEMETEN** |
| Login success rate | Sentry transactions of custom metric | > 95% | **NIET GEMETEN** |
| AI agent success rate | Custom tags in Sentry | > 90% | **NIET GEMETEN** |

---

## Stille Fouten — Detectie

### 1. Console errors in browser
**Status: DEELS GEDEKT**

- `global-error.tsx` vangt React crashes op met `Sentry.captureException()`
- `ignoreErrors` filtert bekende noise (ChunkLoadError, ResizeObserver)
- **GAP:** Niet-React JavaScript errors (bijv. in event handlers, async code buiten componenten) worden alleen door de browser SDK's automatic capture opgepakt — maar alleen als ze als `unhandledrejection` of `error` events optreden

### 2. Failed background jobs (agents)
**Status: BLIND**

Alle 14 AI agents gebruiken try-catch met fallback-responses:
```typescript
try {
  // OpenAI call
} catch (error) {
  console.error("Agent error:", error);
  return { fallbackResponse }; // Silent degradation
}
```

**Probleem:** Als OpenAI 3 dagen down is, merken we het pas als een medewerker klaagt dat AI-scores niet kloppen. Er is:
- Geen success/failure counter
- Geen alert bij herhaald falen
- Geen tracking van fallback-percentage
- Geen OpenAI API error categorisatie (rate limit vs timeout vs auth)

### 3. Emails die niet aankwamen
**Status: DEELS GEDEKT**

- Bounce events → Telegram alert + campagne gestopt
- Spam complaints → Telegram alert + lead afgewezen
- **GAP:** "Soft bounces" (tijdelijk, bijv. mailbox vol) worden niet apart getracked
- **GAP:** Delivery rate als metric wordt niet bijgehouden
- **GAP:** Als Resend zelf down is, merken we niks (webhook komt niet)

### 4. DB-constraint violations
**Status: BLIND**

Supabase errors worden als generieke 500's teruggegeven:
```typescript
const { data, error } = await supabaseAdmin.from("table").insert(payload);
if (error) {
  console.error("Supabase error:", error); // Verdwijnt in Vercel logs
  return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
}
```

**Probleem:**
- Constraint violations (unique, foreign key, not null) zien er hetzelfde uit als connectie-errors
- Geen differentiatie in error handling
- Geen Sentry capture met context (welke tabel, welke constraint)

### 5. Rate limit hits
**Status: DATA AANWEZIG, NIET GEMONITORD**

- Upstash Redis analytics staan aan voor alle limiters
- Data wordt opgeslagen maar niet:
  - Gevisualiseerd in admin dashboard
  - Gealerteerd bij drempels
  - Geanalyseerd voor patronen (brute force, DDoS)
- **GAP:** We weten niet hoeveel kandidaten 429'd worden per dag

### 6. OpenAI errors in screening
**Status: BLIND**

`kandidaat-screening.ts` en andere agents:
- Catch OpenAI errors → return fallback
- Geen onderscheid tussen:
  - Rate limit (429) — moeten we wachten
  - Auth error (401) — API key verlopen
  - Timeout — OpenAI overbelast
  - Content filter — prompt geweigerd
  - Model overloaded (503)

### 7. Cron job execution
**Status: BLIND**

24 cron jobs draaien via Vercel Cron. Er is:
- Geen tracking of een job überhaupt gedraaid heeft
- Geen alert als een job faalt
- Geen duration tracking
- Geen Sentry Cron Monitors (perfect hiervoor)
- Als Vercel Cron stopt met triggeren, merkt niemand het

### 8. Webhook processing failures
**Status: DEELS GEDEKT**

- Resend webhooks: bounce/spam → Telegram (goed)
- **GAP:** Als webhook-verwerking zelf faalt (parsing error, DB error), gaat alleen console.error
- **GAP:** Geen retry-mechanisme voor gefaalde webhook-verwerking
- **GAP:** Geen monitoring of webhooks nog binnenkomen (Resend kan stoppen met sturen)

---

## Risico-inschatting stille fouten

| Stille fout | Kans | Impact | Risico | Detectie nu |
|-------------|------|--------|--------|-------------|
| Cron job failure (facturen) | Laag | HOOG (financieel) | HIGH | Geen |
| AI agent degradation | Medium | MEDIUM (kwaliteit) | HIGH | Geen |
| OpenAI API outage | Medium | MEDIUM | HIGH | Geen |
| Rate limit brute force | Laag | HOOG (security) | HIGH | Data aanwezig, niet gemonitord |
| DB constraint violations | Laag | MEDIUM | MEDIUM | Geen |
| Resend delivery failures | Laag | MEDIUM (communicatie) | MEDIUM | Deels (bounce/spam) |
| Vercel Cron stopped | Zeer laag | HOOG | MEDIUM | Geen |
| Redis uitval | Laag | MEDIUM (fallback actief) | LOW | Eenmalige console.warn |
