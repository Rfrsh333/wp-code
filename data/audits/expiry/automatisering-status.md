# Fase 3 — Automatisering & notificatie-status

**Datum:** 2026-04-22

---

## Overzicht cron-jobs in vercel.json

| # | Route | Schedule | Doel | Status |
|---|-------|----------|------|--------|
| 1 | `/api/cron/onboarding-cleanup` | `0 5 * * *` (dagelijks 05:00 UTC) | Verlopen portal-tokens opschonen | ACTIEF |
| 2 | `/api/cron/herinneringen` | `0 8 * * *` | Herinneringen versturen | ACTIEF |
| 3 | `/api/cron/facturen` | `0 8:15 * * *` | Facturatie-taken | ACTIEF |
| 4 | `/api/cron/dienst-herinnering` | `0 18 * * *` | Dienst-herinneringen | ACTIEF |
| 5 | `/api/cron/document-reminders` | `0 10 * * *` | Onboarding doc-reminders | ACTIEF |
| 6 | `/api/cron/acquisitie-drip` | `0 9 * * *` | Lead drip-campagne | ACTIEF |
| 7 | `/api/cron/onboarding-autopilot` | `0 8 * * *` | Onboarding automatisering | ACTIEF |
| 8 | `/api/cron/klant-analytics` | `0 7 * * *` | Klant-analytics | ACTIEF |
| 9 | `/api/cron/referral-check` | `0 11 * * *` | Referral-verificatie | ACTIEF |
| 10 | `/api/cron/review-requests` | `0 10 * * *` | Review-verzoeken | ACTIEF |
| 11 | `/api/cron/content-suggestion` | `0 9 * * 1` | Content-suggesties (maandag) | ACTIEF |
| 12-16 | Booking crons | Diverse | Booking reminders/followup | ACTIEF |

## NIET-geschedulede cron-routes (ORPHANED)

| # | Route | Code bestaat? | In vercel.json? | Ernst |
|---|-------|--------------|-----------------|-------|
| **A** | `/api/cron/document-expiry` | JA (54 regels, volledig werkend) | **NEE** | **CRITICAL** |
| **B** | `/api/cron/contract-expiry` | JA (54 regels, volledig werkend) | **NEE** | **CRITICAL** |
| **C** | `/api/cron/daily-cleanup` | JA (76 regels, volledig werkend) | **NEE** | **HIGH** |

---

## Detail per expiry-mechanisme

### A. Document-expiry cron — ORPHANED (CRITICAL)

**Bestand:** `src/app/api/cron/document-expiry/route.ts`
**Wat het doet:**
1. Zoekt `medewerker_documenten` met `expiry_date` binnen 30 dagen
2. Haalt medewerker-naam + email op via join
3. Stuurt email via `buildDocumentVerlooptHtml()` template
4. Rapporteert `{ checked: N, sent: N }`

**Waarom orphaned:**
- Route bestaat en is functioneel
- NIET opgenomen in `vercel.json` crons-array
- Wordt dus NOOIT automatisch aangeroepen
- Handmatig triggeren vereist Bearer token met CRON_SECRET

**Gaps in de code:**
- Checkt alleen `medewerker_documenten`, NIET `kandidaat_documenten.document_expires_at`
- Checkt NIET `certificeringen.verloopt_op`
- Checkt NIET `medewerkers.werkvergunning_geldig_tot`
- Geen deduplicatie: stuurt elke dag opnieuw dezelfde mail als doc nog steeds binnen 30 dagen valt
- Geen admin-notificatie, alleen medewerker

### B. Contract-expiry cron — ORPHANED (CRITICAL)

**Bestand:** `src/app/api/cron/contract-expiry/route.ts`
**Wat het doet:**
1. Markeert actieve contracten met `einddatum < today` als `verlopen`
2. Annuleert verzonden/bekeken contracten met verlopen onderteken-token
3. Rapporteert contract-nummers

**Waarom orphaned:**
- Exact dezelfde situatie als document-expiry
- Contracten worden NOOIT automatisch als verlopen gemarkeerd
- Admin moet handmatig status wijzigen of iemand moet de URL bezoeken met Bearer token

### C. Daily-cleanup cron — ORPHANED (HIGH)

**Bestand:** `src/app/api/cron/daily-cleanup/route.ts`
**Wat het doet:**
1. Sluit verlopen diensten (status → `gesloten`)
2. Annuleert aanmeldingen voor verlopen diensten
3. Verwijdert sessie-tokens ouder dan 30 dagen
4. Sluit oude chatbot-gesprekken (>7 dagen)

**Impact van niet-schedulen:**
- Verlopen diensten blijven op "open" staan
- Oude sessie-tokens stapelen op
- Chatbot-gesprekken blijven actief

---

## Notificatie-coverage

| Trigger | Wie wordt gemaild? | Template | Werkend? |
|---------|--------------------|----------|----------|
| Document verloopt <30d | Medewerker | `buildDocumentVerlooptHtml()` | Code OK, NIET gescheduled |
| Onboarding doc-reminder | Kandidaat | `sendDocumentenReminder()` | ACTIEF (dagelijks 10:00) |
| Contract verzonden | Medewerker | Onderteken-link email | ACTIEF (bij verzending) |
| Contract verlopen | Niemand | Geen template | **ONTBREEKT** |
| Werkvergunning verloopt | Niemand | Geen template | **ONTBREEKT** |
| Certificering verloopt | Niemand | Geen template | **ONTBREEKT** |
| ID verlopen + admin alert | Niemand | Geen template | **ONTBREEKT** |

## Admin dashboard expiry-widgets

| Widget | Component | Toont expiry? |
|--------|-----------|---------------|
| DashboardOverzicht | `OpsSnapshot` | `expiredUploadLinks` + `pendingDocumentReviews` — NIET document-expiry |
| OnboardingAnalytics | Conversion funnel | Onboarding-status bottlenecks — NIET document-expiry |
| PipelineHealthPanel | Content pipeline | Content-gerelateerd — NIET document-expiry |
| ContractenTab | Contract lijst | Filter op "verlopen" status — maar werkt alleen als cron draait |

**Conclusie:** Er is GEEN admin-widget die verlopende documenten/certificeringen/werkvergunningen toont.

---

## Samenvatting

- **3 volledig werkende cron-routes zijn NIET gescheduled** — dit is de #1 gap
- **4 notificatie-types ontbreken** volledig (contract verlopen, werkvergunning, certificering, admin-alert)
- **Geen admin-dashboard** voor expiry-monitoring
- **Document-expiry cron checkt maar 1 van 4 tabellen** met vervaldatums
