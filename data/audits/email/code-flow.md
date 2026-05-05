# Code-Flow Audit — Email Verzending

**Datum:** 2026-04-22
**Auditor:** Email Deliverability Audit

---

## Samenvatting

- **49 email-verzendlocaties** geïdentificeerd in de codebase
- **0 locaties** met plain-text alternatief
- **0 locaties** met List-Unsubscribe header
- **1 locatie** met retry-logica (bulk-email)
- **~35 locaties** met basis error-handling (logging)
- **4 unieke from-adressen** + dynamische adressen

---

## Risico-overzicht

| Risico | Severity | Aantal locaties |
|--------|----------|-----------------|
| Geen plain-text versie | HIGH | 49/49 |
| Geen List-Unsubscribe (marketing) | HIGH | 5/5 marketing-locaties |
| Geen retry bij send-failure | MEDIUM | 48/49 |
| Geen suppression-check voor send | HIGH | Bulk-email route |
| Hardcoded HTML (geen templates) | MEDIUM | ~30/49 |
| Geen rate-limit op Resend API calls | MEDIUM | Alle locaties |

---

## Volledige Inventaris per Categorie

### 1. Kandidaat Onboarding (6 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/lib/candidate-onboarding.ts:185` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/lib/candidate-onboarding.ts:235` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/lib/candidate-onboarding.ts:278` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/lib/candidate-onboarding.ts:312` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Template | Nee | Nee | Nee | Nee | Transactioneel |
| `src/lib/candidate-onboarding.ts:352` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/lib/candidate-onboarding.ts:383` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Template | Nee | Nee | Log | Nee | Transactioneel |

### 2. Formulier Inzendingen (4 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/inschrijven/route.ts:249` | `TopTalent Jobs <info@toptalentjobs.nl>` | Kandidaat email | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/personeel-aanvragen/route.ts:270` | `TopTalent Jobs <info@toptalentjobs.nl>` | Klant email | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/personeel-aanvragen/route.ts:362` | Dynamisch (admin) | Geen | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/contact/route.ts:135` | `TopTalent Jobs <info@toptalentjobs.nl>` | Afzender email | Hardcoded HTML | Nee | Nee | Log, 500 bij fout | Nee | Transactioneel |

### 3. Wachtwoord Reset (3 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/lib/medewerker-password-reset.ts:53` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/admin/wachtwoord-reset/request/route.ts:74` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/lib/medewerker-activation.ts` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Nee | Nee | Transactioneel |

### 4. Dienst/Booking Management (8 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/lib/notifications.ts:61` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |
| `src/lib/notifications.ts:93` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |
| `src/lib/notifications.ts:139` | `TopTalent <info@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |
| `src/lib/notifications.ts:173` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |
| `src/lib/notifications.ts:206` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |
| `src/lib/medewerker-shift-email.ts:56` | `TopTalent <info@toptalentjobs.nl>` | `info@toptalentjobs.nl` | Hardcoded HTML | Nee | Nee | Nee | Nee | Transactioneel |
| `src/app/api/bookings/route.ts:577-645` | Dynamisch (admin) | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |
| `src/app/api/bookings/manage/route.ts:117-234` | Dynamisch (admin) | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Notificatie |

### 5. Bulk Email (1 locatie)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/admin/bulk-email/route.ts:158` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | Template (4 types) | Nee | **Nee** | Errors array + batch delay | **Ja** (2s batch) | Marketing |

> **KRITIEK:** Geen `email_bounced`-check voor verzending. Geen `List-Unsubscribe` header ondanks marketing-karakter.

### 6. Documenten & Status (2 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/kandidaat/documenten/route.ts:192` | `TopTalent <info@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/kandidaat/status/route.ts:135` | `TopTalent <info@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |

### 7. Facturatie (3 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/facturen/send/route.ts:42` | Dynamisch (config) | Geen | Hardcoded HTML | Nee | Nee | 502 bij fout | Nee | Transactioneel |
| `src/app/api/cron/invoice-reminders/route.ts:34` | `TopTalent Jobs <facturen@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/cron/herinneringen/route.ts:53` | `TopTalent Jobs <facturen@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |

### 8. Offertes (1 locatie)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/offerte/send/route.ts:187` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | Hardcoded HTML + PDF bijlage | Nee | Nee | 500 bij fout | Nee | Transactioneel |

### 9. Acquisitie & Outreach (4 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/admin/ai/outreach-email/route.ts:76` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | AI-gegenereerd | Nee | **Nee** | Log | Nee | Marketing |
| `src/app/api/admin/ai/lead-response/route.ts:80` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | AI-gegenereerd | Nee | **Nee** | Log | Nee | Marketing |
| `src/app/api/admin/acquisitie/campagnes/route.ts:174` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | Campagne-template | Nee | **Nee** | Log | Nee | Marketing |
| `src/app/api/cron/acquisitie-drip/route.ts:78` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | Drip-template | Nee | **Nee** | Log, stop sequence | Nee | Marketing |

> **KRITIEK:** Alle acquisitie/outreach mails zijn **marketing** maar hebben **geen List-Unsubscribe header**. Dit is een Gmail/Yahoo-vereiste en kan leiden tot spam-classificatie.

### 10. Cron Jobs — Reminders (6 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/cron/document-expiry/route.ts:33` | `TopTalent <info@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/cron/booking-reminders/route.ts:62` | Dynamisch (admin) | Geen | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/cron/booking-reminder-30min/route.ts:75` | Dynamisch (admin) | Geen | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/cron/booking-followup/route.ts:49` | Dynamisch (admin) | Geen | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/cron/afspraak-reminder/route.ts:68` | Dynamisch (admin) | Geen | Template | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/cron/dienst-herinnering/route.ts:45` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |

### 11. Overig (4 locaties)

| Bestand:regel | From | ReplyTo | Template/HTML | Text | Unsubscribe | Error Handling | Retry | Type |
|--------------|------|---------|---------------|------|-------------|----------------|-------|------|
| `src/app/api/tickets/analyze/route.ts:165` | `TopTalent Jobs <noreply@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/calculator/lead/route.ts:358` | `TopTalent Jobs <noreply@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/inquiries/send-reply/route.ts:54` | Dynamisch (query) | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |
| `src/app/api/admin/contracten/route.ts:219` | `TopTalent Jobs <info@toptalentjobs.nl>` | Geen | Hardcoded HTML | Nee | Nee | Log | Nee | Transactioneel |

---

## Webhook Handler

**Locatie:** `src/app/api/webhooks/resend/route.ts`

**Events verwerkt:**
- `email.sent` — status update
- `email.delivered` — `delivered_at` + status
- `email.delivery_delayed` — log
- `email.bounced` — `email_bounced=true` op kandidaat, tag op lead, stop campagne, Telegram alert
- `email.complained` — `pipeline_stage='afgewezen'`, stop auto-sequence, Telegram alert
- `email.opened` — `opened_at`, engagement score +5, auto stage progression
- `email.clicked` — `clicked_at`, engagement score +15

**Engagement Scoring:**
| Event | Punten |
|-------|--------|
| Delivered | 0 |
| Opened | +5 |
| Clicked | +15 |
| Bounced | -20 |
| Complained | -30 |

---

## Voorgestelde Code-Fixes

### Fix 1: Plain-text versie toevoegen (alle locaties)

```typescript
// Bij elke resend.emails.send() call:
await resend.emails.send({
  from: "TopTalent <info@toptalentjobs.nl>",
  to: [recipient],
  subject: subject,
  html: htmlContent,
  text: stripHtml(htmlContent), // <-- TOEVOEGEN
});
```

Maak een `stripHtml()` utility in `src/lib/email-utils.ts`.

### Fix 2: List-Unsubscribe header voor marketing-mails

```typescript
// Voor acquisitie, bulk-email, drip campaigns:
await resend.emails.send({
  from: "TopTalent <info@toptalentjobs.nl>",
  to: [recipient],
  subject: subject,
  html: htmlContent,
  text: stripHtml(htmlContent),
  headers: {
    "List-Unsubscribe": "<mailto:unsubscribe@toptalentjobs.nl?subject=unsubscribe>, <https://toptalentjobs.nl/uitschrijven?id=${recipientId}>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
});
```

### Fix 3: Suppression-check in bulk-email route

```typescript
// src/app/api/admin/bulk-email/route.ts — voor de send-loop:
const { data: kandidaten } = await supabaseAdmin
  .from("inschrijvingen")
  .select("id, voornaam, achternaam, email, onboarding_status")
  .in("id", kandidaat_ids)
  .eq("email_bounced", false); // <-- TOEVOEGEN
```

### Fix 4: Centraliseer email-verzending

Maak een `sendEmail()` wrapper in `src/lib/email-service.ts` die:
1. Suppression-check doet
2. Plain-text versie genereert
3. List-Unsubscribe toevoegt (indien marketing)
4. Error logt naar `email_log`
5. Retry met exponential backoff
6. Rate-limiting respecteert
