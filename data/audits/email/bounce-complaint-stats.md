# Bounce & Complaint Statistieken

**Datum:** 2026-04-22
**Auditor:** Email Deliverability Audit

---

## Status: Schema Geaudit — Live Data Vereist Dashboard/DB Toegang

> Live statistieken (aantallen verzonden, bounced, complained) zijn niet beschikbaar zonder directe database-toegang of Resend dashboard. Onderstaand rapport documenteert het schema en de mechanismen.

---

## 1. Email Log Schema

**Tabel:** `email_log`
**Migratie:** `supabase-migration-complete-onboarding.sql`

| Kolom | Type | Doel |
|-------|------|------|
| `id` | UUID (PK) | Uniek ID |
| `kandidaat_id` | UUID (FK → inschrijvingen) | Link naar kandidaat |
| `email_type` | TEXT | Type: bevestiging, documenten_opvragen, inzetbaar, documenten_reminder, custom |
| `recipient` | TEXT | Ontvanger email |
| `subject` | TEXT | Onderwerp |
| `sent_at` | TIMESTAMPTZ | Verzenddatum |
| `delivered_at` | TIMESTAMPTZ | Afleverdatum (via webhook) |
| `bounced_at` | TIMESTAMPTZ | Bounce-datum (via webhook) |
| `opened_at` | TIMESTAMPTZ | Open-datum (via webhook) |
| `clicked_at` | TIMESTAMPTZ | Klik-datum (via webhook) |
| `status` | TEXT | sent, delivered, bounced, failed |
| `resend_email_id` | TEXT | Resend ID voor webhook-matching |
| `created_at` | TIMESTAMPTZ | Record-aanmaakdatum |

**Indexes:**
- `idx_email_log_kandidaat` — op `kandidaat_id`
- `idx_email_log_type` — op `email_type`
- `idx_email_log_sent_at` — op `sent_at DESC`
- `idx_email_log_resend_id` — op `resend_email_id` (partial: WHERE NOT NULL)

---

## 2. Bounce Tracking

**Migratie:** `supabase-migration-bounce-tracking.sql`

Voegt `email_bounced BOOLEAN DEFAULT false` toe aan `inschrijvingen`-tabel.

**Flow:**
```
Resend webhook (email.bounced)
    → /api/webhooks/resend
    → UPDATE inschrijvingen SET email_bounced = true WHERE email = <bounced_email>
    → UPDATE email_log SET status = 'bounced', bounced_at = <timestamp>
    → Telegram alert naar admin
```

---

## 3. Acquisitie Bounce/Complaint Tracking

Bounces en complaints voor acquisitie-leads worden apart getrackt:

**Bij bounce:**
- `acquisitie_leads.tags` += `'email-bounced'`
- `acquisitie_leads.engagement_score` -= 20
- `acquisitie_campagne_leads.next_send_date` = NULL (stopt toekomstige sends)
- Telegram alert

**Bij complaint (spam):**
- `acquisitie_leads.pipeline_stage` = `'afgewezen'`
- `acquisitie_leads.auto_sequence_active` = false
- `acquisitie_campagne_leads.next_send_date` = NULL
- Telegram alert

---

## 4. Suppression Mechanisme — Analyse

### Wat WEL werkt:
- Webhook handler verwerkt bounce/complaint events correct
- `email_bounced` flag wordt gezet op kandidaten
- `email-bounced` tag wordt gezet op acquisitie-leads
- Drip campagnes stoppen via `next_send_date = NULL`
- Admin krijgt Telegram alerts bij bounces/complaints
- Engagement scoring penaliseert bounced/complained leads

### Wat NIET werkt (gaps):

| Gap | Severity | Detail |
|-----|----------|--------|
| **Bulk-email route checkt `email_bounced` niet** | HIGH | `src/app/api/admin/bulk-email/route.ts` stuurt naar alle geselecteerde kandidaten zonder bounced-adressen te filteren |
| **Geen pre-send suppression check** | HIGH | Er is geen centrale `canSendTo(email)` functie die voor elke send checkt of het adres gesuppressed is |
| **email_log dekt niet alle sends** | MEDIUM | Alleen onboarding-gerelateerde mails worden in `email_log` gelogd. Facturen, bookings, notificaties worden NIET gelogd |
| **Geen soft-bounce tracking** | MEDIUM | Geen onderscheid tussen hard bounce (permanent) en soft bounce (tijdelijk). Alle bounces worden gelijk behandeld |
| **Geen complaint-type tracking** | LOW | Complaint wordt opgeslagen maar het type (abuse, fraud, virus, other) wordt niet bijgehouden |
| **Geen bounce-rate monitoring/alerting** | MEDIUM | Geen automatische alert wanneer bounce-rate boven drempel komt (bijv. >2%) |

---

## 5. Statistieken — Queries voor Eigenaar

Voer deze queries uit in Supabase SQL Editor om actuele stats te krijgen:

### Totaal per status (laatste 30 dagen):
```sql
SELECT status, COUNT(*) as aantal
FROM email_log
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY aantal DESC;
```

### Bounce-rate berekenen:
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
  COUNT(*) as totaal,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'bounced')::numeric /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as bounce_rate_pct
FROM email_log
WHERE sent_at > NOW() - INTERVAL '30 days';
```

### Gebounced kandidaten:
```sql
SELECT COUNT(*) as bounced_kandidaten
FROM inschrijvingen
WHERE email_bounced = true;
```

### Acquisitie bounce/complaint stats:
```sql
SELECT
  COUNT(*) FILTER (WHERE 'email-bounced' = ANY(tags)) as bounced_leads,
  COUNT(*) FILTER (WHERE pipeline_stage = 'afgewezen') as afgewezen_leads,
  COUNT(*) as totaal_leads
FROM acquisitie_leads;
```

### Campagne performance:
```sql
SELECT
  c.naam,
  c.emails_sent,
  c.emails_opened,
  c.emails_clicked,
  ROUND(c.emails_opened::numeric / NULLIF(c.emails_sent, 0) * 100, 1) as open_rate,
  ROUND(c.emails_clicked::numeric / NULLIF(c.emails_sent, 0) * 100, 1) as click_rate
FROM acquisitie_campagnes c
ORDER BY c.created_at DESC;
```

---

## 6. Benchmarks

| Metric | Goed | Acceptabel | Slecht | Kritiek |
|--------|------|------------|--------|---------|
| Bounce rate | < 2% | 2-5% | 5-10% | > 10% (account-schorsing) |
| Complaint rate | < 0.1% | 0.1-0.3% | 0.3-0.5% | > 0.5% (blacklist) |
| Open rate (trans.) | > 50% | 30-50% | 20-30% | < 20% |
| Open rate (marketing) | > 25% | 15-25% | 10-15% | < 10% |
| Delivery rate | > 98% | 95-98% | 90-95% | < 90% |

---

## 7. Aanbevelingen

| # | Actie | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Voeg `email_bounced` check toe aan bulk-email route** | HIGH | Voorkomt herhaalzending naar dode adressen |
| 2 | **Maak centrale `canSendTo()` functie** | HIGH | Eén plek voor suppression-logica |
| 3 | **Log ALLE email sends naar `email_log`** (niet alleen onboarding) | MEDIUM | Compleet beeld van deliverability |
| 4 | **Voeg soft/hard bounce onderscheid toe** | MEDIUM | Soft bounces na 3x → hard bounce |
| 5 | **Implementeer bounce-rate alerting** | MEDIUM | Vroegtijdige waarschuwing bij problemen |
| 6 | **Maandelijkse lijst-hygiëne** | LOW | Verwijder inactieve adressen (>6 maanden geen open) |
