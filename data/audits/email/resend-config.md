# Resend Configuratie Inspectie

**Datum:** 2026-04-22
**Auditor:** Email Deliverability Audit

---

## Status: Gedeeltelijk Beoordeeld

> Resend dashboard-toegang is niet beschikbaar voor deze audit. Onderstaande bevindingen zijn gebaseerd op code-analyse en DNS-records. **Eigenaar moet dashboard-items handmatig verifiëren.**

---

## Bevindingen uit Code-Analyse

### 1. Sender Domeinen

**Gedetecteerde `from:`-adressen in code:**

| From-adres | Gebruikt in | Aantal locaties |
|-----------|-------------|-----------------|
| `info@toptalentjobs.nl` | Meeste routes (onboarding, notificaties, offertes, acquisitie) | ~35 |
| `noreply@toptalentjobs.nl` | Tickets, calculator leads | ~3 |
| `facturen@toptalentjobs.nl` | Factuur-reminders, herinneringen | ~2 |
| `diensten@toptalentjobs.nl` | Shift-aanbiedingen (via admin settings) | ~2 |
| Dynamisch (admin settings) | Bookings, reminders | ~7 |

**Risico-analyse:**

| Issue | Severity | Detail |
|-------|----------|--------|
| Root-domein gebruikt (`@toptalentjobs.nl`) | MEDIUM | Alle mail gaat via het hoofddomein. Bij reputatieschade treft dit ook de website en ontvangst. **Best practice: gebruik subdomein** zoals `mail.toptalentjobs.nl` of `send.toptalentjobs.nl`. |
| Meerdere from-adressen | LOW | `info@`, `noreply@`, `facturen@` — OK zolang SPF/DKIM kloppen. |
| Dynamische from-adressen | MEDIUM | Sommige routes gebruiken admin-configureerbare from-adressen. Als admin een niet-geverifieerd adres instelt, faalt de send of wordt het spam. |

### 2. API Keys

**Uit code-analyse:**
- `RESEND_API_KEY` — environment variable, gebruikt in `/src/lib/resend.ts`
- Eén key in gebruik (productie)
- **Te verifiëren in dashboard:**
  - [ ] Hoeveel API keys zijn actief?
  - [ ] Zijn er ongebruikte keys die geroteerd moeten worden?
  - [ ] Wanneer is de key voor het laatst geroteerd?

### 3. Webhooks

**Webhook handler gevonden:** `/src/app/api/webhooks/resend/route.ts`

**Ondersteunde events:**
- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.opened`
- `email.clicked`
- `email.complained`

**Webhook-verificatie:** Ja — HMAC SHA256 via `RESEND_WEBHOOK_SECRET` en `svix-signature` header.

**Te verifiëren in dashboard:**
- [ ] Is webhook-URL correct geconfigureerd? (verwacht: `https://<domein>/api/webhooks/resend`)
- [ ] Zijn alle events aangevinkt?
- [ ] Worden webhook-deliveries succesvol afgeleverd? (check failure log)

### 4. Suppression List

**In code:**
- Resend's ingebouwde suppression list wordt **niet** programmatisch geraadpleegd voor het verzenden.
- Eigen suppression via `email_bounced` flag op `inschrijvingen`-tabel en `email-bounced` tag op `acquisitie_leads`.
- **PROBLEEM:** Bulk-email route (`/api/admin/bulk-email`) checkt `email_bounced` NIET voor verzending.

**Te verifiëren in dashboard:**
- [ ] Hoeveel adressen staan op Resend's suppression list?
- [ ] Worden suppressed adressen automatisch geweigerd door Resend bij send-call?

### 5. Domein-verificatie

**DKIM-record gevonden:** `resend._domainkey.toptalentjobs.nl` — key aanwezig.

**SPF-record MIST `include:_spf.resend.com`** — zie dns-audit.md.

**Te verifiëren in dashboard:**
- [ ] Is `toptalentjobs.nl` status "Verified"?
- [ ] Zijn er subdomeinen geconfigureerd?
- [ ] Worden alle from-adressen (info@, noreply@, facturen@) ondersteund?

---

## Dashboard Checklist voor Eigenaar

Ga naar https://resend.com/dashboard en verifieer:

- [ ] **Domains** → `toptalentjobs.nl` status = Verified
- [ ] **Domains** → DNS records matching (SPF, DKIM, DMARC)
- [ ] **API Keys** → Roteer ongebruikte keys
- [ ] **Webhooks** → URL correct, alle events aan, geen failures
- [ ] **Suppression** → Review suppressed adressen
- [ ] **Logs** → Check recente bounce/complaint rates
- [ ] **Usage** → Dagelijks volume (relevant voor Gmail/Yahoo bulk-sender vereisten)

---

## Aanbevelingen

| # | Aanbeveling | Severity | Impact |
|---|------------|----------|--------|
| 1 | **Migreer naar subdomein** (`mail.toptalentjobs.nl`) | MEDIUM | Isoleert transactionele mail-reputatie van hoofddomein |
| 2 | **Fix SPF-record** — voeg `include:_spf.resend.com` toe | HIGH | SPF faalt momenteel voor alle Resend-mails |
| 3 | **Valideer dynamische from-adressen** — check dat admin-ingestelde adressen geverifieerd zijn in Resend | MEDIUM | Voorkomt send-failures |
| 4 | **Raadpleeg Resend suppression list** programmatisch voor bulk-sends | HIGH | Voorkomt herhaalzending naar gebounced/complained adressen |
| 5 | **API key rotatie** — implementeer kwartaalrotatie | LOW | Security best practice |
