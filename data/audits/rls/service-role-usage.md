# Fase 5 — Service-Role Usage & Code-Level Bypass Audit

**Datum:** 2026-04-22
**Conclusie:** 100% van alle API-routes gebruikt `supabaseAdmin` (service-role). De `supabase` (anon) client wordt nergens gebruikt.

---

## Architectuur

```
src/lib/supabase.ts exporteert:
├── supabase        → createClient(URL, ANON_KEY)       ← NIET GEBRUIKT
└── supabaseAdmin   → createClient(URL, SERVICE_ROLE_KEY) ← OVERAL GEBRUIKT
```

Beide clients gebruiken een Proxy-pattern voor lazy initialisatie (voorkomt build-time errors).

---

## Routes ZONDER authenticatie die naar DB schrijven

### KRITIEK

| Route | Methode | Tabel(len) | Probleem |
|-------|---------|-----------|----------|
| `/api/faq` | POST | `faq_items` | Geen auth, geen reCAPTCHA, geen rate limiting. Iedereen kan FAQ items aanmaken. |
| `/api/cv-upload` | POST | Storage bucket | Geen reCAPTCHA. Alleen rate limiting (5/min). Iedereen kan bestanden uploaden. |

### CORRECTIES (na diepere analyse)

- **`/api/kandidaat/documenten`**: Heeft WEL auth via `onboarding_portal_token` (form field, DB lookup + expiry check). Geen rate limiting, maar token-gated.
- **`/api/ai-chat` routes**: Hebben WEL auth via `verifyMedewerkerSession` / `verifyKlantSession`. Eerdere inschatting was incorrect.

### HOOG

| Route | Methode | Tabel(len) | Probleem |
|-------|---------|-----------|----------|
| `/api/platform-options` | GET | `diensten`, `medewerkers`, `klanten` | Geen auth. Retourneert ALLE klant-namen, locaties, functies via full table scans. |
| `/api/dienst-filters` | GET | `diensten` | Geen auth. Retourneert distinct values van klant_naam, locatie, functie. |
| `/api/bookings` | GET | `bookings` + `personeel_aanvragen` | Via `ref` param worden PII-velden uit personeel_aanvragen gelekt (bedrijfsnaam, email, telefoon). |
| `/api/kandidaat/status` | GET | `inschrijvingen` | HMAC-token check, maar voert eerst FULL TABLE SCAN uit (`.select("id, email")` op alle kandidaten) om token te valideren. |
| `/api/verify/[token]` | GET | `medewerkers`, `dienst_aanmeldingen` | Retourneert medewerker PII (naam, functie, foto). Token wordt niet geïnvalideerd na gebruik. |

### MEDIUM

| Route | Methode | Tabel(len) | Probleem |
|-------|---------|-----------|----------|
| `/api/tickets/analyze` | POST | `tickets`, `faq_items` | Geen reCAPTCHA. Triggert OpenAI call (kosten) + email alerts voor hoge-prio tickets. Alleen rate limit. |
| `/api/calculator/lead` | POST | `leads` | Geen auth, wel rate limit. Schrijft naar leads-tabel. |
| `/api/calculator/pdf` | POST | — | Geen auth. Genereert PDF (CPU-intensief, DoS-risico). |
| `/api/spoeddienst/[token]` | POST | `spoeddienst_responses` | Token-gated maar geen rate limiting op POST. Kan gespamt worden met fake responses. |
| `/api/offerte/[token]/accept` | POST | `offertes` | Token-gated maar geen rate limiting. |

---

## Routes MET authenticatie — correctheid van rij-filtering

### Klant-routes (verifyKlantSession) — GOED

| Route | Filter | Beoordeling |
|-------|--------|-------------|
| `/api/klant/dashboard` | `.eq("klant_id", klant.id)` | OK |
| `/api/klant/diensten` | `.eq("klant_id", klant.id)` + eigendom-check | OK |
| `/api/klant/rooster` | `.eq("klant_id", klant.id)` + date range | OK |
| `/api/klant/uren` | Two-level: dienst → klant eigendom | OK |
| `/api/klant/berichten` | `.or("van_id.eq.X,aan_id.eq.X")` | OK |
| `/api/klant/beoordelingen` | `.eq("klant_id", klant.id)` | OK |
| `/api/klant/facturen` | `.eq("klant_id", klant.id)` + signed JWT voor PDF | OK |
| `/api/klant/favorieten` | `.eq("klant_id", klant.id)` | OK |
| `/api/klant/kosten` | `.eq("klant_id", klant.id)` | OK |
| `/api/klant/annuleren` | Eigendom-verificatie vóór annulering | OK |
| `/api/klant/checkin` | QR-code generatie, eigendom-check | OK |

### Medewerker-routes (verifyMedewerkerSession) — GOED

| Route | Filter | Beoordeling |
|-------|--------|-------------|
| `/api/medewerker/dashboard` | `.eq("medewerker_id", m.id)` | OK |
| `/api/medewerker/diensten` | Open diensten + `.eq("medewerker_id", m.id)` voor eigen | OK |
| `/api/medewerker/profile` | `.eq("id", m.id)` | OK |
| `/api/medewerker/documenten` | `.eq("medewerker_id", m.id)` | OK |
| `/api/medewerker/certificeringen` | `.eq("medewerker_id", m.id)` | OK |
| `/api/medewerker/uren/lijst` | `.eq("medewerker_id", m.id)` | OK |
| `/api/medewerker/berichten` | `.eq("aan_id", m.id)` of `.eq("van_id", m.id)` | OK |
| `/api/medewerker/beschikbaarheid` | `.eq("medewerker_id", m.id)` | OK |
| `/api/medewerker/boetes` | `.eq("medewerker_id", m.id)` | OK |
| `/api/medewerker/betaal-boete` | `.eq("medewerker_id", m.id).eq("id", boete_id)` | OK |
| `/api/medewerker/ratings` | Via dienst_aanmeldingen → medewerker_id | OK |
| `/api/medewerker/aanbiedingen` | `.eq("medewerker_id", m.id)` | OK |

### Admin-routes (verifyAdmin) — ACCEPTABEL

Admin-routes hebben bewust volledige toegang (geen rij-filtering). Dit is by design.
Beveiliging: JWT + Supabase auth.getUser() + email whitelist + optioneel 2FA.

### Cron-routes (CRON_SECRET) — GOED

Alle ~25 cron-routes controleren `CRON_SECRET` via Bearer token. Geen publieke toegang.

### Webhook-routes (HMAC) — GOED

| Route | Verificatie |
|-------|-----------|
| `/api/webhooks/mollie` | HMAC-SHA256 + timing-safe comparison |
| `/api/webhooks/resend` | HMAC-SHA256 |
| `/api/webhooks/whatsapp` | HMAC-SHA256 (X-Hub-Signature-256) |
| `/api/webhooks/sentry` | SENTRY_WEBHOOK_SECRET |

---

## Token-based Routes — Beoordeling

| Route | Token-type | Lengte | Verloopt? | One-time? | Beoordeling |
|-------|-----------|--------|-----------|-----------|-------------|
| `/api/offerte/[token]` | Offerte-token | 32+ char | Ja (geldig_tot) | Nee | GOED |
| `/api/offerte/[token]/accept` | Offerte-token | 32+ char | Ja + duplicate check | Nee | GOED |
| `/api/contract/ondertekenen` | Onderteken-token | UUID | Ja (verloopt_at) | Nee | GOED |
| `/api/spoeddienst/[token]` | Spoeddienst-token | 16 char | Nee (dienst_datum) | Nee | MEDIUM — kort |
| `/api/verify/[token]` | Verificatie-token | 32+ char | Nee | Nee | MEDIUM — geen expiry |
| `/api/kandidaat/status` | HMAC-token | Computed | N.v.t. | N.v.t. | MEDIUM — full table scan |

---

## Supabase Client Gebruik (code-bewijs)

Alle bestanden die `supabaseAdmin` importeren (= alle API-routes):

```
src/app/api/*/route.ts → import { supabaseAdmin } from "@/lib/supabase"
                          of
                          import { supabaseAdmin as supabase } from "@/lib/supabase"
```

De alias `as supabase` wordt soms gebruikt, maar verwijst altijd naar de service-role client.

**Geen enkel bestand importeert de anon `supabase` client voor API-operaties.**

---

## Aanbevelingen

### P0 — Onmiddellijk

1. **ENABLE RLS op alle tabellen zonder RLS** — minimaal een service-role-only policy als defense-in-depth
2. **Fix `/api/faq` POST** — voeg reCAPTCHA + rate limiting toe
3. **Fix `/api/cv-upload`** — voeg reCAPTCHA toe
4. **Fix `/api/kandidaat/documenten`** — voeg token-based auth toe
5. **Fix `/api/platform-options`** — vereis admin auth of beperk data
6. **Fix `/api/kandidaat/status`** — verwijder full table scan, gebruik indexed lookup

### P1 — Korte termijn

7. **Verwijder public read van `bookings`** — vervang door service-role only
8. **Beperk `/api/dienst-filters`** — vereis auth of sanitize output
9. **Token expiry toevoegen** aan verificatie-tokens
10. **AI-chat sessie-management** verstevigen met signed tokens
11. **Rate limiting** toevoegen aan alle admin GET routes

### P2 — Middellange termijn

12. **Overweeg user-level RLS** voor klant en medewerker tabellen (defense-in-depth):
    ```sql
    CREATE POLICY klant_eigen_data ON diensten
      FOR SELECT USING (klant_id = current_setting('app.klant_id')::uuid);
    ```
    Dit vereist het zetten van `app.klant_id` via `supabase.rpc('set_claim', ...)` na sessie-verificatie.

13. **Encrypt at rest** voor OAuth tokens in `linkedin_connections`
14. **Data retention policies** voor chat logs, audit logs, email logs
