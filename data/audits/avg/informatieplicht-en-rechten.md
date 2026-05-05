# Informatieplicht & Rechten-implementatie (Art. 12-22 AVG)
## TopTalent B.V. | Audit 2026-04-22

---

## 1. Privacyverklaring — Art. 13 AVG Checklist

**URL:** `/privacy`
**Bestand:** `src/app/privacy/page.tsx`
**Laatste update:** December 2024

| # | Vereiste (Art. 13) | Aanwezig? | Opmerking |
|---|-------------------|-----------|----------|
| 1 | Identiteit + contact verwerkingsverantwoordelijke | ✅ | TopTalent B.V., Utrecht, info@toptalentjobs.nl, +31 6 17 17 79 39 |
| 2 | Contactgegevens FG | ❌ | FG niet aangesteld — `LEGAL_REVIEW_REQUIRED`: verplicht bij AI-screening op schaal? |
| 3 | Doeleinden per verwerking | ✅ | 9 doeleinden uitgebreid beschreven |
| 4 | Rechtsgrondslag per verwerking | ✅ | Art. 6.1.a/b/c/f — alle vier gedocumenteerd |
| 5 | Gerechtvaardigd belang (als grondslag) | ✅ | Marketing, beveiliging, serviceverbetering benoemd |
| 6 | Ontvangers / categorieën ontvangers | ⚠️ | Opdrachtgevers, overheid, accountant benoemd. **OpenAI ontbreekt als ontvanger**. Telegram ontbreekt. Sentry ontbreekt. |
| 7 | Doorgifte naar derde land + waarborgen | ⚠️ | Sectie 8 vermeldt internationaal, maar noemt **niet specifiek** OpenAI (VS), Resend (VS), Vercel (VS) |
| 8 | Bewaartermijnen | ✅ | Gedetailleerde tabel met termijnen per categorie |
| 9 | Rechten betrokkene | ✅ | Art. 15-22 alle benoemd |
| 10 | Recht toestemming in te trekken | ✅ | Vermeld |
| 11 | Klachtrecht bij AP | ✅ | Autoriteit Persoonsgegevens + contactgegevens |
| 12 | Wettelijke/contractuele verplichting gegevensverstrekking | ⚠️ | Niet expliciet vermeld welke gegevens verplicht vs. optioneel zijn |
| 13 | Geautomatiseerde besluitvorming + profilering | **❌ FOUT** | Stelt dat TopTalent **geen** geautomatiseerde besluitvorming toepast — **feitelijk onjuist** gezien AI-screening agent |
| 14 | Bron van gegevens (als niet van betrokkene) | ⚠️ | Niet vermeld voor leads die van LinkedIn/Facebook zijn gescraped |

### Kritieke discrepanties tussen verklaring en praktijk:

| Wat de verklaring zegt | Wat er werkelijk gebeurt | Severity |
|------------------------|--------------------------|----------|
| "Wij nemen geen besluiten op basis van geautomatiseerde verwerking" | AI-screening genereert scores die selectie substantieel beïnvloeden | **CRITICAL** |
| Ontvangers: opdrachtgevers, overheid, dienstverleners (generiek) | PII gaat naar OpenAI, Telegram, Sentry (niet benoemd) | **HIGH** |
| Doorgifte VS: generiek vermeld | Specifieke verwerkers (OpenAI, Resend, Vercel) niet benoemd | **HIGH** |
| Cookies: analytics en marketing met toestemming | Vercel Analytics laadt zonder consent | **MEDIUM** |

---

## 2. Cookie-banner audit

### 2.1 Implementatie

**Bestand:** `src/components/CookieConsent.tsx`
**Cookie-instellingen pagina:** `src/app/cookies/page.tsx`

**Bannergedrag:**
- Vaste banner onderaan pagina (z-index: 90)
- Twee knoppen: "Alleen noodzakelijk" + "Alles accepteren"
- Consent opgeslagen in localStorage: `ttj_cookie_consent` = `"necessary"` | `"all"`
- Custom event dispatched: `ttj-cookie-consent`
- dataLayer event: `{ event: "cookie_consent_update", consent: value }`

### 2.2 Checklist

| # | Vereiste | Status | Toelichting |
|---|---------|--------|-------------|
| 1 | Banner verschijnt vóór cookie-plaatsing | ✅ | GTM pas geladen na "all" consent |
| 2 | "Weiger alles" optie | ✅ | "Alleen noodzakelijk" knop aanwezig |
| 3 | Granulaire toestemming per categorie | ❌ | Alleen "alles of niets" — geen aparte analytics/marketing keuze |
| 4 | Toestemming intrekken even makkelijk als geven | ✅ | `/cookies` pagina met knoppen om voorkeur te wijzigen |
| 5 | Geen analytics vóór consent | ⚠️ | GTM: ✅ gated. **Vercel Analytics: ❌ niet gated** — laadt onvoorwaardelijk |
| 6 | Consent-bewijs opgeslagen | ⚠️ | Alleen localStorage (client-side) — geen server-side bewijs |
| 7 | Consent hernieuwing (periodiek) | ❌ | Geen vervaldatum op consent |

### 2.3 Cookies gezet vóór toestemming

| Cookie/tracking | Type | Vóór consent? | Toegestaan? |
|----------------|------|---------------|-------------|
| `medewerker_session` / `klant_session` | Sessie (JWT) | Alleen na login | ✅ Functioneel |
| `ttj_cookie_consent` | Voorkeur | Ja (localStorage) | ✅ Noodzakelijk |
| GTM / GA4 | Analytics | Nee — na "all" consent | ✅ Correct |
| Vercel Analytics | Analytics | **Ja — altijd geladen** | **❌ Niet correct** |
| Vercel Speed Insights | Performance | Ja — altijd geladen | ⚠️ Mogelijk functioneel? `LEGAL_REVIEW_REQUIRED` |
| reCAPTCHA v3 | Beveiliging | Ja — bij formulieren | ⚠️ `LEGAL_REVIEW_REQUIRED`: kwalificeert als technisch noodzakelijk? |

### 2.4 Bevindingen

- **MEDIUM:** Geen granulaire consent (analytics vs. marketing apart) — ePrivacy-richtlijn vereist dit strikt genomen niet, maar AP adviseert het
- **MEDIUM:** Vercel Analytics niet achter consent-gate — Vercel claimt "cookieloos" maar stuurt wel data naar VS-servers
- **LOW:** Consent alleen in localStorage — niet aantoonbaar voor compliance. Server-side logging overwegen.
- **LOW:** Geen consent-verlooptijd — best practice is hernieuwing na 12 maanden

---

## 3. Rechten van betrokkenen — implementatie-audit

### 3.1 Recht op inzage (Art. 15)

**Gedocumenteerd in privacyverklaring:** ✅
**Technisch geïmplementeerd:**
- Medewerker-dashboard: eigen profiel, diensten, uren inzichtelijk ✅
- Klant-dashboard: eigen bedrijfsgegevens, diensten inzichtelijk ✅
- **Geen export-functie** (dataportabiliteit) ❌
- **Geen inzage in AI-screeningresultaten voor kandidaten** ❌
- **Geen inzage in e-mailtracking data** ❌

### 3.2 Recht op rectificatie (Art. 16)

**Gedocumenteerd:** ✅
**Technisch:**
- Medewerker kan eigen profiel bewerken (naam, telefoon, beschikbaarheid) ✅
- Klant kan eigen gegevens bewerken ✅
- Kandidaat (in onboarding) kan documenten opnieuw uploaden ✅
- **Geen mogelijkheid om AI-screeningnotities te laten corrigeren** ❌

### 3.3 Recht op verwijdering (Art. 17)

**Gedocumenteerd:** ✅
**Technisch:** ❌ **NIET GEÏMPLEMENTEERD**

**Gevonden:**
- Geen "verwijder account" knop in medewerker- of klantportaal
- Geen `/api/data-subject-request` endpoint
- Geen self-service verwijderingsformulier
- Privacyverklaring verwijst naar e-mail: info@toptalentjobs.nl

**Bij verwijderverzoek moeten minimaal worden aangepakt:**

| Systeem | Tabel/locatie | Automatisch? |
|---------|--------------|--------------|
| Database | `inschrijvingen`, `medewerkers`, `klanten` + gerelateerde tabellen | ❌ Handmatig |
| Documenten | Supabase Storage bucket `kandidaat-documenten` | ❌ Handmatig |
| AI-screeningdata | `inschrijvingen.ai_screening_*` | ❌ Handmatig |
| E-maillog | `email_log` | ❌ Handmatig |
| Chatbot-gesprekken | `chatbot_conversations`, `chatbot_messages` | Gedeeltelijk (7-dagen cron) |
| Berichten | `berichten` | ❌ Handmatig |
| Contracten | `contracten`, `contract_ondertekeningen` | ❌ Bewaarplicht 7 jaar |
| Telegram-berichten | Telegram chatgeschiedenis | **❌ Niet verwijderbaar** |
| Sentry errors | Sentry platform | ❌ Handmatig in Sentry |
| Resend e-mails | Resend platform | ❌ Handmatig/API |
| OpenAI logs | OpenAI API retentie (30 dagen) | Automatisch na 30 dagen |
| Push subscriptions | `push_subscriptions` | ❌ Handmatig |
| Audit log | `audit_log` | ⚠️ Bewaarplicht vs. verwijderrecht |
| Lead outreach | `lead_outreach` | ❌ Handmatig |
| Referrals | `referrals` | ❌ Handmatig |

**Severity: HIGH** — Art. 12 lid 3 verplicht reactie binnen 1 maand. Zonder geautomatiseerd proces is dit tijdrovend en foutgevoelig.

### 3.4 Recht op beperking (Art. 18)

**Gedocumenteerd:** ✅
**Technisch:** ❌ Geen "freeze" mechanisme op records

### 3.5 Recht op dataportabiliteit (Art. 20)

**Gedocumenteerd:** ✅
**Technisch:** ❌ Geen data-export functie (JSON/CSV) voor betrokkenen

### 3.6 Recht van bezwaar (Art. 21)

**Gedocumenteerd:** ✅
**Technisch:** ❌ Geen opt-out mechanisme voor specifieke verwerkingen (bijv. AI-screening, e-mailtracking)

### 3.7 Recht m.b.t. geautomatiseerde besluitvorming (Art. 22)

**Gedocumenteerd:** ✅ — maar claimt dat het **niet** voorkomt (feitelijk onjuist)
**Technisch:**
- ❌ Kandidaat wordt niet geïnformeerd over AI-screening
- ❌ Geen uitleg van AI-logica beschikbaar voor kandidaat
- ❌ Geen "vraag menselijke herbeoordeling" knop
- ⚠️ AI schrijft score, admin beslist — maar zonder formeel process

---

## 4. Toestemming — registratieformulier

### 4.1 Consent-checkbox

**Bestand:** `src/components/forms/InschrijfFormulier.tsx` (regel 593-631)

**Tekst:** "Ik geef toestemming voor het verwerken van mijn gegevens voor werving en selectie."
**Aanvulling:** "Documenten zoals ID, cv of KvK vragen we later apart op wanneer je onboarding start."

**Validatie:**
- ✅ Verplicht veld — formulier kan niet worden verzonden zonder
- ✅ Visuele feedback (groene rand bij aanvinken)
- ✅ Foutmelding bij niet-aanvinken

### 4.2 Consent-opslag — `CRITICAL GAP`

**Bevinding:** Het veld `toestemming` wordt **client-side gevalideerd** maar **NIET naar de database geschreven**.

In de API-route (`src/app/api/inschrijven/route.ts`, regels 206-228) ontbreekt `toestemming` in het insert-payload:

```typescript
const insertPayload = {
  voornaam,
  achternaam,
  email,
  telefoon,
  // ... alle andere velden
  // ❌ toestemming ONTBREEKT
};
```

**Impact:**
- Geen bewijs van toestemming in database
- Bij controle door AP niet aantoonbaar dat toestemming is verkregen
- Art. 7 lid 1 AVG: "Wanneer de verwerking berust op toestemming, moet de verwerkingsverantwoordelijke kunnen aantonen dat de betrokkene toestemming heeft gegeven."

**Severity: CRITICAL**

### 4.3 Overige consent-issues

- ❌ Geen aparte toestemming voor AI-screening
- ❌ Geen aparte toestemming voor opname in kandidatenpool na afwijzing
- ❌ Geen versienummer van privacyverklaring bij toestemming
- ❌ Geen IP-adres/timestamp van toestemming vastgelegd

---

## 5. Samenvatting gaps

| # | Gap | Art. AVG | Severity | Actie |
|---|-----|----------|----------|-------|
| 1 | Privacyverklaring claimt geen geautomatiseerde besluitvorming — onjuist | 13, 22 | **CRITICAL** | Corrigeer tekst; vermeld AI-screening |
| 2 | Toestemming niet opgeslagen in database | 7 | **CRITICAL** | Voeg `toestemming_*` velden toe |
| 3 | OpenAI, Telegram, Sentry niet benoemd als ontvangers | 13.1.e | **HIGH** | Update privacyverklaring |
| 4 | Geen verwijderfunctionaliteit (self-service) | 17 | **HIGH** | Implementeer data subject request flow |
| 5 | Geen data-export voor betrokkenen | 20 | **HIGH** | Implementeer export endpoint |
| 6 | Geen uitleg AI-logica aan kandidaten | 13.2.f, 22 | **HIGH** | Implementeer transparantie |
| 7 | Vercel Analytics niet achter consent | ePrivacy | **MEDIUM** | Gate of verwijder |
| 8 | Cookie-consent niet granulair | ePrivacy | **MEDIUM** | Voeg categorieën toe |
| 9 | Geen consent-verlooptijd | Best practice | **LOW** | Implementeer 12-maanden hernieuwing |
| 10 | Lead-bronnen niet vermeld in verklaring | 14 | **MEDIUM** | Voeg sectie toe over leads van derden |
