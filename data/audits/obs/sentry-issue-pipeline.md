# Sentry Issue Pipeline

**Datum:** 2026-04-22
**Status:** Geen Sentry dashboard-toegang — analyse op basis van code-configuratie

---

## Huidige situatie

Sentry dashboard-data (open issues, gemiddelde leeftijd, resolved rate) kan alleen via de Sentry UI of API worden gecontroleerd. Dit rapport beschrijft wat we vanuit de code kunnen vaststellen.

### Wat we weten

1. **Sentry webhook is geconfigureerd** (`/api/webhooks/sentry/route.ts`)
   - Ontvangt `issue.created` en `alert.triggered` events
   - Stuurt door naar Telegram met severity-emoji (fatal/error/warning)
   - Bevat: issue title, culprit, count, Sentry URL link

2. **Geen issue-triage workflow zichtbaar in code**
   - Geen Sentry API-integratie voor issue-management
   - Geen automatische assignment-regels
   - Geen resolved/ignored tracking

3. **Geen deduplicatie op Telegram-alerts**
   - Elke nieuwe Sentry issue triggert een Telegram-bericht
   - Geen cooldown of rate-limiting
   - Bij een error-storm wordt Telegram overspoeld

---

## Verwachte issues op basis van code-analyse

### Waarschijnlijk hoog volume (noise)

| Issue type | Bron | Verwacht volume | Actie nodig |
|-----------|------|-----------------|-------------|
| ChunkLoadError | Browser (gefilterd) | Laag (al in ignoreErrors) | Geen |
| ResizeObserver loop | Browser (gefilterd) | Laag (al in ignoreErrors) | Geen |
| Rate limit 429's | API routes | Onbekend — niet naar Sentry | Monitor toevoegen |
| OpenAI timeouts | 14 agents | Potentieel hoog — niet naar Sentry | Instrument toevoegen |
| Supabase connection errors | Alle routes | Laag normaal, hoog bij outage | Instrument toevoegen |

### Waarschijnlijk lage visibility (gemiste errors)

| Issue type | Bron | Reden onzichtbaar |
|-----------|------|-------------------|
| Cron job failures | 24 cron routes | Alleen console.error |
| Auth failures | Login routes | Alleen console.error |
| Agent fallbacks | 14 AI agents | Silent degradation |
| Webhook processing errors | Resend/WhatsApp | Alleen console.error |

---

## Aanbevelingen voor issue-hygiëne

### 1. Triage-workflow instellen
- **Wekelijks 30 minuten:** Open Sentry, bekijk nieuwe issues
- **Assignment:** Elke issue krijgt een eigenaar
- **SLA:** Criticals binnen 24u, highs binnen 1 week, mediums binnen 1 maand

### 2. Ignore-rules voor bekende noise
Voeg toe aan Sentry project settings:
- Browser extension errors (`chrome-extension://`, `moz-extension://`)
- Bot/crawler errors (Googlebot, Bingbot user-agents)
- Third-party script errors (Google Analytics, Facebook Pixel)

### 3. Alert-rules verfijnen
- **New issue:** Alert naar Telegram (huidige setup)
- **Regression:** Alert naar Telegram + email
- **Threshold:** >10 events in 5 min = critical alert
- **Quiet hours:** Niet na 23:00 tenzij fatal

### 4. PII-leak check
- Controleer of bestaande Sentry issues e-mailadressen of namen bevatten
- `beforeSend` is alleen op server actief — client en edge kunnen lekken
- Review eerste 50 issues in dashboard op PII

---

## Actie vereist

Zonder Sentry dashboard-toegang kunnen we het volgende niet vaststellen:
- [ ] Aantal open issues
- [ ] Gemiddelde leeftijd open issues
- [ ] Top-10 events by frequency
- [ ] Issues zonder assignee
- [ ] Resolved rate per maand
- [ ] PII in bestaande stack traces

**Aanbeveling:** Eigenaar opent Sentry dashboard en deelt screenshot/export van bovenstaande metrics voor volledige analyse.
