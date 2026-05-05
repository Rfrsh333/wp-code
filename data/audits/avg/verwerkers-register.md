# Verwerkers-register (Art. 28 AVG)
## TopTalent B.V. | Audit 2026-04-22

---

## 1. Overzicht verwerkers

| # | Verwerker | Doel | DPA status | Datalocatie | Severity |
|---|-----------|------|------------|-------------|----------|
| 1 | **Supabase** | Database, storage, auth | Standaard DPA beschikbaar (supabase.com/legal/dpa) — **ondertekening verifiëren** | EU (Frankfurt) — te verifiëren in project settings | MEDIUM |
| 2 | **OpenAI** | AI-screening, lead-scoring, content | DPA beschikbaar (openai.com/policies/data-processing-addendum) — **ondertekening verifiëren** | **VS** — transfer-risico | **CRITICAL** |
| 3 | **Resend** | E-mailverzending + tracking | DPA beschikbaar (resend.com/legal/dpa) — **ondertekening verifiëren** | VS — te verifiëren | HIGH |
| 4 | **Mollie** | Betalingen (boetes) | DPA standaard in gebruikersovereenkomst | **EU (Amsterdam)** ✅ | LOW |
| 5 | **Telegram** | Admin-alerts met PII | **Geen DPA beschikbaar** | VS/wereldwijd | **CRITICAL** |
| 6 | **Upstash** | Rate limiting (Redis) | DPA status onbekend | EU-regio mogelijk — verifiëren | MEDIUM |
| 7 | **Sentry** | Error tracking + monitoring | DPA beschikbaar — **ondertekening verifiëren** | EU-hosting mogelijk — verifiëren | **HIGH** |
| 8 | **Vercel** | Hosting, analytics, logs | DPA beschikbaar (vercel.com/legal/dpa) — **ondertekening verifiëren** | VS (edge: wereldwijd) | HIGH |
| 9 | **Google** (GTM/GA4) | Analytics + tracking | DPA via Google Ads/Analytics overeenkomst | VS + wereldwijd | MEDIUM |
| 10 | **Google** (Calendar) | Agenda-integratie | Via Google Workspace DPA | VS | MEDIUM |
| 11 | **Google** (reCAPTCHA) | Bot-detectie | Via Google Cloud DPA | VS | LOW |
| 12 | **LinkedIn** | Social media posting | DPA status onbekend | VS | MEDIUM |

---

## 2. Gedetailleerde analyse per verwerker

### 2.1 OpenAI — `CRITICAL`

**Doel:** AI-screening van kandidaten, lead-scoring, offerte-generatie, WhatsApp-berichten, content-generatie, klantretentie-analyse, follow-up e-mails

**Model:** `gpt-4o-mini`

**Welke PII wordt verstuurd:**
- **Kandidaat-screening:** Volledige naam (voor+achternaam), berekende leeftijd, woonplaats, horeca-ervaring, motivatie, beschikbaarheid, talen, functies
- **Lead-scoring:** Bedrijfsnaam, contactpersoon, e-mail, telefoon, locatie, website-content
- **Offerte-generator:** Contactpersoon naam, bedrijfsnaam, locatie
- **WhatsApp-berichten:** Contactpersoon naam, bedrijfsnaam, pain points
- **Klant-retentie:** Contactpersoon naam, bedrijfsnaam, dienstgeschiedenis
- **Lead-followup:** Contactpersoon naam, bedrijfsnaam, e-mail, personalisatienotities

**Bevindingen:**
- ❌ **Geen anonimisering** — volledige namen en leeftijden worden naar OpenAI gestuurd
- ❌ Geen pseudonimisering of hashing
- ❌ Geen retentiebeleid geconfigureerd in OpenAI-integratie
- OpenAI bewaart data standaard 30 dagen (API data retention policy)
- **Transfer naar VS** zonder aantoonbare SCC's of adequaatheidsbesluit

**DPA:** OpenAI biedt een Data Processing Addendum aan via openai.com/policies/data-processing-addendum. **Status ondertekening: ONBEKEND — verifiëren.**

**Vereiste acties:**
1. Verifieer of DPA is geaccepteerd/ondertekend
2. Implementeer data-anonimisering vóór verzending (vervang namen door "Kandidaat #ID")
3. Verifieer SCC's (Standard Contractual Clauses) voor VS-transfer
4. Overweeg opt-out van training data (API-data wordt standaard niet voor training gebruikt, maar verifiëren)
5. Documenteer Transfer Impact Assessment (TIA)

---

### 2.2 Telegram — `CRITICAL`

**Doel:** Real-time alerts naar admin over nieuwe inschrijvingen, contactformulieren, lead-scores, errors

**Welke PII wordt verstuurd:**

| Bron | PII in Telegram-bericht |
|------|------------------------|
| Contactformulier (`/api/contact`) | Volledige naam, e-mail, telefoonnummer, berichtinhoud |
| Calculator lead (`/api/calculator/lead`) | Naam, bedrijfsnaam, e-mail |
| Personeelsaanvraag (`/api/personeel-aanvragen`) | Bedrijfsnaam, e-mail, telefoonnummer |
| Lead-scoring (`/api/admin/ai/lead-score`) | Bedrijfsnaam, score, pain points |
| Sentry errors (via webhook) | Error-details (mogelijk PII in variabelen) |
| Klantregistratie (`/api/klant/register`) | Bedrijfsnaam, e-mail |

**Bevindingen:**
- ❌ **Telegram heeft geen DPA-framework** — geen verwerkersovereenkomst mogelijk
- ❌ PII wordt in platte tekst naar Telegram Bot API gestuurd
- ❌ Berichten worden opgeslagen op Telegram-servers (geen controle over retentie)
- ❌ Telegram-chat is toegankelijk voor alle teamleden met toegang tot de groep
- ⚠️ Gedeeltelijke HTML-escaping (`escapeTelegramHtml()`) maar PII blijft zichtbaar
- ❌ Geen data-minimalisatie — volledige namen en e-mails waar alleen notificatie nodig is

**Vereiste acties:**
1. **Onmiddellijk:** Verwijder alle PII uit Telegram-alerts (alleen "Nieuwe inschrijving ontvangen — bekijk in dashboard")
2. Vervang namen door ID's of generieke beschrijvingen
3. Overweeg alternatief notificatiekanaal met DPA (Slack, eigen notificatiesysteem)
4. Documenteer als risico in DPIA

---

### 2.3 Sentry — `HIGH`

**Doel:** Error tracking, performance monitoring, log collection

**Configuratie gevonden:**

```typescript
// sentry.server.config.ts + sentry.edge.config.ts
sendDefaultPii: true,        // ❌ ALLE PII automatisch meesturen
includeLocalVariables: true,  // ❌ Lokale variabelen (mogelijk met PII) in stacktraces
enableLogs: true,             // Alle logs naar Sentry
tracesSampleRate: 0.1,        // 10% van requests wordt getraceerd
```

**Bevindingen:**
- ❌ `sendDefaultPii: true` — stuurt automatisch IP-adressen, cookies, user context mee
- ❌ `includeLocalVariables: true` — als een error optreedt in code die kandidaatdata verwerkt, worden lokale variabelen (namen, e-mails, etc.) naar Sentry gestuurd
- ❌ **Geen `beforeSend` hook** om PII te filteren
- ❌ **Geen `allowUrls` of `denyUrls`** filtering
- ⚠️ Sentry errors worden ook doorgestuurd naar Telegram via `/api/webhooks/sentry`

**DPA:** Sentry biedt DPA aan. **Status ondertekening: ONBEKEND — verifiëren.**
**Datalocatie:** Sentry biedt EU-hosting (sentry.io). **Regio-instelling verifiëren.**

**Vereiste acties:**
1. **Onmiddellijk:** Zet `sendDefaultPii: false`
2. **Onmiddellijk:** Voeg `beforeSend` hook toe die PII uit events filtert
3. Verwijder `includeLocalVariables: true` of voeg scrubbing toe
4. Verifieer of EU-regio geconfigureerd is
5. Verifieer DPA-ondertekening

---

### 2.4 Resend — `HIGH`

**Doel:** Transactionele e-mails (bevestigingen, afwijzingen, herinneringen, documenten), e-mailtracking

**Welke PII wordt verstuurd:**
- E-mailadressen (alle ontvangers)
- Namen (in e-mailcontent en subject)
- Telefoonnummers (in sommige templates)
- Contractdetails (in bevestigingsmails)
- Screeningresultaten (in afwijzingsmails — indirect)

**E-mailtracking:**
- Open tracking (pixel)
- Click tracking
- Bounce tracking
- Delivery tracking
- Webhook naar `/api/webhooks/resend` met event-updates

**Bevindingen:**
- ✅ HTML-escaping in templates (`escapeHtml()`)
- ⚠️ Resend slaat volledige e-mailcontent op per hun retentiebeleid
- ⚠️ E-mail open/click tracking = gedragsmonitoring van betrokkenen

**DPA:** Resend biedt DPA aan via resend.com/legal/dpa. **Status ondertekening: ONBEKEND — verifiëren.**
**Datalocatie:** VS — **SCC's verifiëren.**

**Vereiste acties:**
1. Verifieer DPA-ondertekening
2. Verifieer SCC's voor VS-transfer
3. Beoordeel of e-mail open/click tracking proportioneel is (Art. 5.1.c — dataminimalisatie)
4. Vermeld e-mailtracking expliciet in privacyverklaring

---

### 2.5 Supabase — `MEDIUM`

**Doel:** Primaire database (PostgreSQL), bestandsopslag (Storage), authenticatie

**Welke PII:** Alle persoonsgegevens in het systeem

**Bevindingen:**
- ✅ Supabase biedt standaard DPA (supabase.com/legal/dpa)
- ✅ Private storage bucket met RLS-beleid voor documenten
- ✅ Encrypted connections (HTTPS)
- ✅ At-rest encryption (standaard PostgreSQL)
- ⚠️ **Datalocatie verifiëren** in Supabase project settings (EU Frankfurt vs. VS)

**DPA:** Standaard DPA beschikbaar. **Verifieer acceptatie en datacenterlocatie.**

**Vereiste acties:**
1. Verifieer dat datacenter in EU staat (Supabase dashboard → Project Settings)
2. Verifieer DPA-acceptatie
3. Als VS: documenteer SCC's + TIA

---

### 2.6 Vercel — `HIGH`

**Doel:** Hosting Next.js applicatie, edge functions, analytics, speed insights

**Welke PII:**
- Alle HTTP-verzoeken passeren Vercel (inclusief form submissions)
- Vercel Analytics: web vitals, paginabezoeken
- Vercel Speed Insights: performance data
- Server logs: request/response data

**Bevindingen:**
- ⚠️ Vercel Analytics is **niet consent-gated** — wordt onvoorwaardelijk geladen in `layout.tsx`
- ⚠️ Vercel is VS-gebaseerd (edge servers wereldwijd)
- Vercel Analytics claimt privacy-vriendelijk (geen cookies, geen cross-site tracking)

**DPA:** Vercel biedt DPA aan. **Status ondertekening: ONBEKEND — verifiëren.**

**Vereiste acties:**
1. Verifieer DPA-ondertekening
2. Gate Vercel Analytics achter cookie-consent OF documenteer als "functioneel"
3. Verifieer edge-regio instelling (EU-only mogelijk?)
4. Documenteer als verwerker in privacyverklaring

---

### 2.7 Google (GTM/GA4/Calendar/reCAPTCHA) — `MEDIUM`

**GTM ID:** GTM-5X3QX6Z6

**Bevindingen:**
- ✅ GTM alleen geladen na consent (`ttj_cookie_consent === "all"`)
- ✅ IP-anonimisering in GA4 (vermeld in privacyverklaring)
- ⚠️ reCAPTCHA v3 laadt zonder expliciete consent (technisch noodzakelijk?)
- ⚠️ Google Calendar integratie slaat OAuth tokens op in `linkedin_connections` tabel (lijkt verkeerde naamgeving)

**DPA:** Via Google Cloud/Workspace DPA. **Verifieer per product.**

**Vereiste acties:**
1. Verifieer DPA per Google-product (Analytics, Calendar, reCAPTCHA)
2. Beoordeel of reCAPTCHA als "technisch noodzakelijk" kwalificeert — `LEGAL_REVIEW_REQUIRED`
3. Verifieer SCC's met Google voor VS-transfer

---

### 2.8 Mollie — `LOW`

**Doel:** Betalingsverwerking (boetes/penalties)

**Bevindingen:**
- ✅ Mollie is EU-gebaseerd (Amsterdam)
- ✅ DPA standaard in gebruikersovereenkomst
- ✅ PCI DSS compliant
- Webhook naar `/api/webhooks/mollie` voor statusupdates

**Vereiste acties:**
1. Verifieer dat Mollie DPA actueel is

---

### 2.9 Upstash — `MEDIUM`

**Doel:** Redis voor rate limiting

**Welke data:** IP-adressen (als rate limit keys: `ai-admin:${clientIP}`)

**Bevindingen:**
- IP-adressen zijn persoonsgegevens onder AVG
- Retentie: kort (rate limit windows)

**DPA:** Status onbekend.
**Datalocatie:** Onbekend — Upstash biedt EU-regio's aan.

**Vereiste acties:**
1. Verifieer DPA met Upstash
2. Verifieer dat EU-regio geconfigureerd is
3. Beoordeel of IP-opslag proportioneel is

---

### 2.10 LinkedIn — `MEDIUM`

**Doel:** OAuth-integratie voor social media posting

**Welke PII:** LinkedIn profile naam, profile image URL, LinkedIn person ID, OAuth tokens

**Bevindingen:**
- OAuth tokens opgeslagen in `linkedin_connections` tabel
- Toegang tot LinkedIn profiel (naam, foto)
- Gebruikt voor content publicatie

**DPA:** LinkedIn DPA status onbekend.

**Vereiste acties:**
1. Verifieer DPA met LinkedIn
2. Documenteer als verwerker

---

## 3. Transfer Impact Assessment (TIA) — samenvatting

| Verwerker | Land | Adequaatheidsbesluit? | SCC's nodig? | TIA gedocumenteerd? |
|-----------|------|----------------------|--------------|---------------------|
| OpenAI | VS | EU-US Data Privacy Framework (DPF) — **verifieer of OpenAI gecertificeerd is** | Ja, als niet DPF-gecertificeerd | **Nee — GAP** |
| Resend | VS | DPF — verifiëren | Waarschijnlijk ja | **Nee — GAP** |
| Vercel | VS | DPF — verifiëren | Waarschijnlijk ja | **Nee — GAP** |
| Google | VS | DPF-gecertificeerd ✅ | Ja (standaard in voorwaarden) | **Nee — GAP** |
| Telegram | VS/wereldwijd | **Nee** | **Niet beschikbaar** | **Nee — CRITICAL GAP** |
| Sentry | VS (of EU) | Afhankelijk van regio | Mogelijk | **Nee — GAP** |

**`LEGAL_REVIEW_REQUIRED`:** Voor alle VS-transfers: verifieer EU-US Data Privacy Framework certificering van elke verwerker. Als niet gecertificeerd: SCC's + aanvullende maatregelen (encryptie, pseudonimisering) vereist.

---

## 4. Urgente acties

| Prioriteit | Actie | Verwerker | Deadline voorstel |
|-----------|-------|-----------|-------------------|
| **CRITICAL** | Verwijder PII uit Telegram-alerts | Telegram | 1 week |
| **CRITICAL** | Implementeer data-anonimisering voor OpenAI | OpenAI | 2 weken |
| **CRITICAL** | Zet `sendDefaultPii: false` + voeg `beforeSend` PII-filter toe | Sentry | 1 week |
| **HIGH** | Verifieer en onderteken DPA's met alle verwerkers | Alle | 4 weken |
| **HIGH** | Documenteer TIA voor alle VS-transfers | OpenAI, Resend, Vercel, Google | 4 weken |
| **MEDIUM** | Verifieer EU-datacenterlocatie | Supabase, Upstash, Sentry | 2 weken |
| **MEDIUM** | Gate Vercel Analytics achter consent | Vercel | 2 weken |
