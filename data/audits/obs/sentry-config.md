# Sentry Configuration Audit

**Datum:** 2026-04-22
**Scope:** `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`, `instrumentation.ts`, `next.config.ts`
**Sentry versie:** `@sentry/nextjs@^10.43.0`

---

## Bestanden

| Bestand | Runtime | Status |
|---------|---------|--------|
| `sentry.server.config.ts` | Node.js (Server) | Aanwezig |
| `sentry.edge.config.ts` | Edge/Middleware | Aanwezig |
| `instrumentation-client.ts` | Browser (Client) | Aanwezig |
| `instrumentation.ts` | Next.js lifecycle | Aanwezig |
| `next.config.ts` | Build-time (plugin) | Aanwezig |

---

## Configuratie-analyse

### 1. DSN

| | Server | Edge | Client |
|-|--------|------|--------|
| **DSN aanwezig** | Ja | Ja | Ja |
| **Hardcoded** | Ja | Ja | Ja |
| **Env-gescheiden** | Nee | Nee | Nee |

**Severity: HIGH** — Dezelfde DSN wordt in alle drie configs hardcoded gebruikt. Dev-errors vervuilen het productie-project in Sentry. Aanbeveling: `process.env.SENTRY_DSN` of `process.env.NEXT_PUBLIC_SENTRY_DSN`.

### 2. sendDefaultPii

| Server | Edge | Client |
|--------|------|--------|
| `false` | `false` | `false` |

**Status: OK** — Alle configs staan op `false`.

### 3. tracesSampleRate

| Server | Edge | Client |
|--------|------|--------|
| dev: 1.0, prod: 0.1 | dev: 1.0, prod: 0.1 | dev: 1.0, prod: 0.1 |

**Status: OK** — 10% sampling in productie is redelijk voor het verkeersniveau.

### 4. Session Replay

| | Server | Edge | Client |
|-|--------|------|--------|
| `replaysSessionSampleRate` | N/A | N/A | 0.1 (10%) |
| `replaysOnErrorSampleRate` | N/A | N/A | 1.0 (100%) |
| `replayIntegration()` | N/A | N/A | Ja |

**Status: OK** — Goede balans. 100% replay bij errors is waardevol voor debugging.

### 5. beforeSend Hook

| Server | Edge | Client |
|--------|------|--------|
| Aanwezig | **ONTBREEKT** | **ONTBREEKT** |

**Server (sentry.server.config.ts:12-26):**
```typescript
beforeSend(event) {
  if (event.request) {
    delete event.request.cookies;   // OK
    delete event.request.headers;   // Te breed — verwijdert ook User-Agent
    delete event.request.data;      // Te breed — verwijdert alle request body
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }
  return event;
}
```

**Severity: MEDIUM**
- Edge config heeft geen beforeSend — middleware errors kunnen PII bevatten
- Client config heeft geen beforeSend — browser errors kunnen gevoelige data lekken
- Server's header-deletion is te breed: User-Agent en Accept-Language zijn nuttig voor debugging

### 6. ignoreErrors (noise filtering)

| Server | Edge | Client |
|--------|------|--------|
| **ONTBREEKT** | **ONTBREEKT** | Aanwezig |

**Client (instrumentation-client.ts:21-26):**
```typescript
ignoreErrors: [
  "ResizeObserver loop",
  "Non-Error promise rejection",
  "Load failed",
  "ChunkLoadError",
]
```

**Severity: LOW** — Server en edge missen noise filtering, maar genereren minder noise dan browser.

### 7. Release Tracking

| Server | Edge | Client |
|--------|------|--------|
| **ONTBREEKT** | **ONTBREEKT** | **ONTBREEKT** |

**Severity: HIGH** — Geen `release` field in enige config. Gevolgen:
- Kan errors niet koppelen aan specifieke deploys
- Source map version matching werkt niet
- Geen regressie-detectie per release

**Fix:** `release: process.env.VERCEL_GIT_COMMIT_SHA` toevoegen aan alle drie configs.

### 8. Source Maps

| Aspect | Status |
|--------|--------|
| `withSentryConfig()` in next.config.ts | Ja (regel 210-220) |
| `deleteSourcemapsAfterUpload` | `true` |
| `widenClientFileUpload` | `true` |
| `tunnelRoute` | `/monitoring` |
| `SENTRY_AUTH_TOKEN` | Via env var |
| `productionBrowserSourceMaps` | `false` (regel 54) |

**Status: OK** — Source maps worden geupload naar Sentry en daarna verwijderd. Tunnel route bypast ad blockers.

### 9. onRequestError

**instrumentation.ts:12:**
```typescript
export const onRequestError = Sentry.captureRequestError;
```

**Status: OK** — Vangt server-side request errors op via Next.js instrumentation hook.

---

## Samenvatting

| Aspect | Status | Severity |
|--------|--------|----------|
| DSN env-gescheiden | Nee | HIGH |
| sendDefaultPii | OK (false) | - |
| Sampling rates | OK (10% prod) | - |
| Session Replay | OK (client) | - |
| beforeSend (server) | Aanwezig maar te breed | MEDIUM |
| beforeSend (edge) | ONTBREEKT | MEDIUM |
| beforeSend (client) | ONTBREEKT | MEDIUM |
| ignoreErrors | Alleen client | LOW |
| Release tracking | ONTBREEKT (alle configs) | HIGH |
| Source maps | OK | - |
| Tunnel route | OK (/monitoring) | - |
| onRequestError | OK | - |
