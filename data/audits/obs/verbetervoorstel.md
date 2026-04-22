# 80/20 Verbetervoorstel — Observability

**Datum:** 2026-04-22

---

## Top-3 Quick Wins (binnen 1 dag werk, groot effect)

### 1. Externe uptime monitor — UptimeRobot gratis tier
**Geschatte tijd:** 15 minuten
**Impact:** Van 0% naar 100% uptime-visibility

- Maak gratis account op uptimerobot.com
- Monitor 1: `https://www.toptalentjobs.nl` (HTTP, 5 min interval)
- Monitor 2: `https://www.toptalentjobs.nl/api/health` (keyword: `"status":"ok"`)
- Alert naar: email + Telegram (via UptimeRobot webhook)
- Gratis tier: 50 monitors, 5-min interval

### 2. Sentry.captureException toevoegen aan alle catch-blokken
**Geschatte tijd:** 2-3 uur
**Impact:** Van 0% naar ~100% server-side error visibility

Maak een utility helper:
```typescript
// src/lib/sentry-utils.ts
import * as Sentry from "@sentry/nextjs";

export function captureRouteError(error: unknown, context: { route: string; action?: string }) {
  Sentry.withScope((scope) => {
    scope.setTag("route", context.route);
    if (context.action) scope.setTag("action", context.action);
    Sentry.captureException(error);
  });
  console.error(`[${context.route}]`, error);
}
```

Zoek-en-vervang in alle API routes:
```typescript
// Was:
console.error("Error:", error);

// Wordt:
captureRouteError(error, { route: "/api/inschrijven", action: "POST" });
```

### 3. Release tracking toevoegen
**Geschatte tijd:** 10 minuten
**Impact:** Errors koppelen aan specifieke deploys

Voeg toe aan alle drie Sentry configs:
```typescript
Sentry.init({
  // ... bestaande config
  release: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
});
```

`VERCEL_GIT_COMMIT_SHA` en `VERCEL_ENV` zijn automatisch beschikbaar op Vercel.

---

## Medium-prioriteit (1 week werk)

### 4. Sentry Cron Monitors voor alle 24 cron jobs
**Geschatte tijd:** 3-4 uur
**Impact:** Detecteert stilgevallen of falende cron jobs

```typescript
// Per cron route toevoegen:
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  const checkIn = Sentry.captureCheckIn({
    monitorSlug: "cron-facturen",
    status: "in_progress",
  });

  try {
    // ... bestaande logica
    Sentry.captureCheckIn({ checkInId: checkIn, monitorSlug: "cron-facturen", status: "ok" });
  } catch (error) {
    Sentry.captureCheckIn({ checkInId: checkIn, monitorSlug: "cron-facturen", status: "error" });
    throw error;
  }
}
```

### 5. AI Agent instrumentatie
**Geschatte tijd:** 2-3 uur
**Impact:** Zichtbaarheid in agent-performance en failure rates

```typescript
// Per agent wrapper:
import * as Sentry from "@sentry/nextjs";

export async function runAgent<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  return Sentry.startSpan({ op: "ai.agent", name }, async () => {
    try {
      const result = await fn();
      Sentry.setTag("agent.status", "success");
      return result;
    } catch (error) {
      Sentry.setTag("agent.status", "fallback");
      Sentry.captureException(error, { tags: { agent_name: name } });
      return fallback;
    }
  });
}
```

### 6. Telegram alert rate-limiting
**Geschatte tijd:** 1-2 uur
**Impact:** Voorkomt alert-spam, maakt alerts weer nuttig

```typescript
// In src/lib/telegram.ts toevoegen:
const alertCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minuten

export async function sendTelegramAlert(message: string, dedupeKey?: string) {
  if (dedupeKey) {
    const lastSent = alertCooldowns.get(dedupeKey) || 0;
    if (Date.now() - lastSent < COOLDOWN_MS) return; // Skip
    alertCooldowns.set(dedupeKey, Date.now());
  }
  // ... bestaande send logica
}
```

### 7. beforeSend op edge en client
**Geschatte tijd:** 30 minuten
**Impact:** PII-bescherming op alle Sentry runtimes

---

## Low-prioriteit (alleen als budget/tijd toelaat)

### 8. SLI Dashboard in admin
**Geschatte tijd:** 1-2 dagen
**Impact:** One-pager met 5 key metrics

Bouw `/admin/observability` pagina met:
- Sentry API: error count afgelopen 24u/7d
- Upstash API: rate limit hits per dag
- Resend API: delivery rate
- Vercel Analytics: LCP p75
- Health endpoint: component status

### 9. Rate limit threshold alerts
**Geschatte tijd:** 2-3 uur
**Impact:** DDoS/brute force detectie

Cron job die Upstash analytics queried en alert stuurt bij:
- >50 rate limit hits per IP in 1 uur
- >200 totale rate limit hits in 1 uur

### 10. Distributed tracing (OpenTelemetry)
**Geschatte tijd:** 2-3 dagen
**Impact:** End-to-end request tracing

Alleen relevant als de applicatie schaalt naar meerdere services. Momenteel overkill voor een monolith op Vercel.

---

## Prioriteitsmatrix

| # | Fix | Tijd | Impact | ROI |
|---|-----|------|--------|-----|
| 1 | UptimeRobot | 15 min | Uptime visibility | ***** |
| 2 | Sentry.captureException in routes | 2-3 uur | Error visibility | ***** |
| 3 | Release tracking | 10 min | Deploy correlation | **** |
| 4 | Sentry Cron Monitors | 3-4 uur | Cron visibility | **** |
| 5 | AI Agent instrumentatie | 2-3 uur | Agent failure tracking | *** |
| 6 | Telegram rate-limiting | 1-2 uur | Alert hygiene | *** |
| 7 | beforeSend edge/client | 30 min | PII bescherming | *** |
| 8 | SLI Dashboard | 1-2 dagen | Overzicht | ** |
| 9 | Rate limit alerts | 2-3 uur | Security | ** |
| 10 | OpenTelemetry | 2-3 dagen | Tracing | * |

---

## Kosten

| Tool | Kosten | Tier |
|------|--------|------|
| UptimeRobot | Gratis | Free (50 monitors, 5-min) |
| Sentry | Al actief | Huidige plan |
| Upstash | Al actief | Huidige plan |
| Vercel Analytics | Al actief | Huidige plan |

**Totale extra kosten: €0** — alle verbeteringen zijn binnen bestaande tooling.
