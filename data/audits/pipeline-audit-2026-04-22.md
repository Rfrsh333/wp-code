# Pipeline Audit & End-to-End Test Report

**Datum**: 2026-04-22
**Scope**: Pipeline A (personeel-aanvragen) + Pipeline B (inschrijvingen)
**Status**: Audit rapport compleet, test scripts klaar voor review

---

## Samenvatting

| | Pipeline A | Pipeline B |
|---|---|---|
| **Route** | `/api/personeel-aanvragen` | `/api/inschrijven` |
| **Doel** | Klant vraagt personeel aan | Kandidaat schrijft zich in |
| **Rate limit** | `personeel:{IP}` (formRateLimit) | `inschrijven:{IP}` (formRateLimit) |
| **Validatie** | Zod + manueel | Zod (5 velden) + manueel (15+ velden) |
| **reCAPTCHA** | Ja (v3, score >= 0.5) | Ja (v3, score >= 0.5) |
| **Admin email** | Resend -> info@toptalentjobs.nl | Resend -> info@toptalentjobs.nl |
| **DB insert** | `personeel_aanvragen` | `inschrijvingen` |
| **Background tasks** | `after()`: Telegram, auto-reply, offerte | **BLOKKEREND**: bevestigingsmail, AI screening, Telegram |
| **XSS bescherming** | `escapeHtml` op alle velden | **ONTBREEKT** |

**Totaal findings**: 5 CRITICAL, 8 HIGH, 12 MEDIUM, 7 LOW

---

## CRITICAL Findings

### C-1: Pipeline B — Geen `escapeHtml` op admin email (XSS)

**Bestand**: `src/app/api/inschrijven/route.ts:126-184`
**Impact**: Alle 15+ user-input velden worden ongeescaped in HTML email geinterpoleerd

Pipeline A (`personeel-aanvragen/route.ts`) importeert `escapeHtml` uit `@/lib/sanitize` en past het toe op elk veld. Pipeline B doet dit **nergens**. Velden als `motivatie` (vrije tekst) en `volledigeNaam` gaan raw de HTML template in.

**Risico**: HTML injection in admin-email. Meeste email clients blokkeren `<script>`, maar phishing-HTML (nep knoppen, links) werkt wel.

**Fix**: Importeer `escapeHtml` en wrap elk veld in de `emailHtml` template.

---

### C-2: Pipeline B — Response blokkeert op AI screening (Vercel timeout)

**Bestand**: `src/app/api/inschrijven/route.ts:254-321`
**Impact**: Dezelfde bug die Pipeline A had en die we eerder hebben gefixt

Pipeline A gebruikt nu `after()` voor background tasks (Telegram, auto-reply, offerte). Pipeline B doet alles **voor** `return NextResponse.json({ success: true })` (regel 321):
- Bevestigingsmail verzenden (Resend API call)
- AI screening via OpenAI (5-30 seconden)
- Supabase update met screening resultaat
- Telegram alert verzenden

Op Vercel Pro is de timeout 60s, maar OpenAI + Resend + Supabase + Telegram kan makkelijk 15-45 seconden duren. Bij trage OpenAI responses krijgt de kandidaat een timeout error terwijl alles wel werkt.

**Fix**: Wrap de bevestigingsmail, AI screening, en Telegram in `after()` net als Pipeline A.

---

### C-3: Pipeline B — Admin email failure blokkeert DB insert

**Bestand**: `src/app/api/inschrijven/route.ts:196-203`
**Impact**: Als Resend faalt, wordt de kandidaat NIET opgeslagen in de database

De volgorde is:
1. Resend email verzenden (regel 188)
2. Als error -> return 500 (regel 198-201)
3. DB insert (regel 207) **wordt nooit bereikt**

Bij Pipeline A is de admin email ook voor de DB insert, maar die heeft `after()` voor de rest. Het kernprobleem: de primary operation (DB insert) hangt af van een secondary operation (email notificatie).

**Fix**: Verplaats de DB insert VOOR de admin email, of maak de admin email non-blocking.

---

### C-4: Schema — Geen `CREATE TABLE` voor core tabellen

**Bestanden**: Alle `supabase-migration-*.sql` bestanden
**Impact**: `personeel_aanvragen` en `inschrijvingen` hebben geen `CREATE TABLE` in version control

Alle migraties gebruiken alleen `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. De ~15 core kolommen per tabel (email, voornaam, etc.) bestaan alleen in de live Supabase database. Als de database ooit vanuit migraties moet worden hersteld, falen alle migraties.

**Fix**: Exporteer het huidige schema met `supabase db dump` en commit als `supabase-migration-000-base-schema.sql`.

---

### C-5: Pipeline A — Missing RESEND_API_KEY skipt DB insert

**Bestand**: `src/app/api/personeel-aanvragen/route.ts:217-222`
**Impact**: Als `RESEND_API_KEY` niet geconfigureerd is, returned de route `{success: true}` ZONDER database insert

De DB insert zit in het `else` blok van de Resend check, wat betekent dat zonder API key de aanvraag verloren gaat. De klant ziet "succesvol" maar er wordt niets opgeslagen.

**Fix**: Verplaats DB insert buiten de Resend conditie.

---

## HIGH Findings

### H-1: Pipeline B — Geen `geboortedatum` validatie

**Bestand**: `src/app/api/inschrijven/route.ts:71`, `src/lib/validations.ts:27`
**Impact**: Geen format check, geen toekomstige-datum check, geen minimum leeftijd (16 voor horeca NL)

`geboortedatum` is gewoon `z.string().optional()` in Zod en wordt als raw string geaccepteerd. De AI screening berekent leeftijd op basis van deze string — bij ongeldig formaat wordt de leeftijd NaN.

---

### H-2: Pipeline B — Geen duplicate email handling

**Bestand**: `src/app/api/inschrijven/route.ts:207-229`
**Impact**: Dubbele submissions maken dubbele records, dubbele emails, dubbele AI screening (kosten)

Geen `SELECT` check voor bestaand email adres. Als de DB een unique constraint heeft, faalt de insert met generiek "Database fout" zonder uitleg.

---

### H-3: Pipeline B — `generateAndSaveUploadToken` geen DB error check

**Bestand**: `src/lib/candidate-onboarding.ts:390-396`
**Impact**: Token wordt teruggegeven aan caller ook als de DB update faalt. Kandidaat ontvangt email link met token die niet in DB staat.

---

### H-4: Pipeline B — Geen Resend error check in candidate-onboarding

**Bestand**: `src/lib/candidate-onboarding.ts` (alle email functies)
**Impact**: `resend.emails.send()` return value wordt niet op `error` gecontroleerd. Callers krijgen `undefined` data terug bij failures.

---

### H-5: Email templates — `escapeHtml` maar in 1 van 15+ templates

**Bestand**: `src/lib/email-templates.ts`
**Impact**: Alleen `buildAutoReplyEmailHtml` escaped user input. Alle booking/notification/reminder/cancellation templates interpoleren parameters direct.

Stored XSS risico als database-waarden (oorspronkelijk user input) in deze templates worden gebruikt.

---

### H-6: Pipeline A — Race condition in auto-reply query

**Bestand**: `src/app/api/personeel-aanvragen/route.ts:358-365`
**Impact**: Auto-reply query zoekt record op `email + bedrijfsnaam` in plaats van inserted `id`. Bij gelijktijdige submissions kan de verkeerde record worden opgehaald.

---

### H-7: Pipeline A — Double reCAPTCHA development skip

**Bestand**: `src/lib/recaptcha.ts:18` + `src/app/api/personeel-aanvragen/route.ts:73`
**Impact**: reCAPTCHA wordt op twee plekken overgeslagen in development. Redundant maar niet schadelijk — wel verwarrend voor debugging.

---

### H-8: Zod schema `beschikbaarheid` is `z.any().optional()`

**Bestand**: `src/lib/validations.ts:30`
**Impact**: Accepteert willekeurige types (object, array, number) zonder enige validatie. Dit veld gaat naar de database en de AI screening.

---

## MEDIUM Findings

### M-1: Pipeline B — AI screening DB update geen error check
`src/app/api/inschrijven/route.ts:301-305` — OpenAI kosten gemaakt maar resultaat mogelijk verloren.

### M-2: Pipeline B — Referral update geen Supabase error check
`src/app/api/inschrijven/route.ts:239-247` — Supabase logical errors niet afgevangen.

### M-3: Pipeline B — Telegram ontvangt unsanitized HTML
`src/app/api/inschrijven/route.ts:307-313` — `volledigeNaam` en AI output niet escaped voor Telegram HTML mode.

### M-4: Pipeline B — Missing `RESEND_API_KEY` silently skips admin email
`src/app/api/inschrijven/route.ts:186` — Geen logging als API key ontbreekt.

### M-5: Telegram API response niet gecontroleerd
`src/lib/telegram.ts:11-19` — Geen `response.ok` check. Stille failure bij verkeerde token/chat ID.

### M-6: Telegram fetch geen timeout
`src/lib/telegram.ts` — Geen `AbortController`. Kan indefinite blocken.

### M-7: `candidate-onboarding.ts` — `logEmail` geen Supabase error check
Silently failing email log maakt audit trail onbetrouwbaar.

### M-8: `kandidaat-screening.ts` — PII naar OpenAI zonder disclosure (GDPR)
`src/lib/agents/kandidaat-screening.ts:70-83` — Naam, leeftijd, stad, motivatie naar OpenAI zonder consent.

### M-9: `kandidaat-screening.ts` — AI response score niet gevalideerd
`src/lib/agents/kandidaat-screening.ts:95` — GPT kan score 999 of -5 returnen, geen Zod validatie.

### M-10: `offerte-generator.ts` — `parseInt` zonder validatie
`src/lib/agents/offerte-generator.ts:56` — `parseInt(input.aantalPersonen) || 1` — NaN wordt silently 1.

### M-11: `email-templates.ts` — `infoBlock`/`kandidaatInfoBlock` escapen niet
`src/lib/email-templates.ts:50-55` en `413-418` — Helper functies geven raw values door.

### M-12: UTM tracking gap op `inschrijvingen`
Migratie voegt `lead_source`, `utm_source` etc. toe aan `inschrijvingen`, maar `inschrijven/route.ts` insert deze NOOIT. Alle kandidaat-registraties defaulten naar 'website'.

---

## LOW Findings

### L-1: Zod schema en manuele validatie misaligned (Pipeline B)
### L-2: `candidate-onboarding.ts` — PII in URL query parameters
### L-3: `kandidaat-screening.ts` — Fallback score 5 kan admins misleiden
### L-4: `offerte-generator.ts` — AI response niet schema-gevalideerd
### L-5: `supabase.ts` — Proxy pattern verbergt init errors
### L-6: `instrumentation-client.ts` — Sentry DSN hardcoded (niet via env var)
### L-7: Type ambiguity — `geboortedatum` string vs DATE, `aantal_personen` string vs INTEGER

---

## Cross-Cutting Checks

### Rate Limit Keys (geen collision)

| Route | Key prefix | Config |
|-------|-----------|--------|
| Pipeline A (personeel) | `ratelimit:form:personeel:{IP}` | formRateLimit |
| Pipeline B (inschrijven) | `ratelimit:form:inschrijven:{IP}` | formRateLimit |
| Contact | `ratelimit:form:contact:{IP}` | formRateLimit |
| Login | `ratelimit:form:admin-login:{IP}` | loginRateLimit |
| 2FA | `ratelimit:form:2fa-verify:{IP}` | loginRateLimit |

Alle keys zijn uniek. Geen cross-pipeline collision. Redis fallback (in-memory) werkt correct.

### Sentry / Observability

- `instrumentation.ts`: `onRequestError = Sentry.captureRequestError` — vangt unhandled API route errors
- `instrumentation-client.ts`: Replay, traces, logs enabled
- **GAP**: Errors in `after()` callbacks (Pipeline A) worden mogelijk NIET gevangen door `onRequestError` omdat ze na de response plaatsvinden. Ze worden wel gevangen door de try/catch blokken die `console.error` doen, maar Sentry ziet deze niet tenzij er expliciet `Sentry.captureException()` wordt aangeroepen.
- **GAP**: Pipeline B's screening errors (regel 315-317) doen alleen `console.error`, geen Sentry reporting.

### Schema Drift Samenvatting

| Tabel | CREATE TABLE in repo? | Core kolommen gedocumenteerd? | ALTER TABLE migraties |
|-------|----------------------|------------------------------|----------------------|
| `personeel_aanvragen` | NEE | NEE (15 kolommen) | 4 migraties (11 kolommen) |
| `inschrijvingen` | NEE | NEE (15 kolommen) | 12 migraties (31 kolommen) |
| `email_log` | JA | JA | - |
| `referrals` | JA | JA | - |

---

## Test Plan

### Happy Path Tests

#### Test A1: Pipeline A — Personeel aanvragen (succes)
```
POST /api/personeel-aanvragen
Content-Type: application/json

{
  "bedrijfsnaam": "Audit Test BV",
  "contactpersoon": "Test Persoon",
  "email": "audit-test@toptalentjobs.nl",
  "telefoon": "0612345678",
  "typePersoneel": ["bediening"],
  "aantalPersonen": "2",
  "contractType": ["uitzenden"],
  "gewenstUurtarief": "15",
  "startDatum": "2026-05-01",
  "werkdagen": ["maandag", "dinsdag"],
  "werktijden": "09:00-17:00",
  "locatie": "Utrecht",
  "recaptchaToken": "<valid_token>"
}

Verwacht:
- Status 200, body: { success: true }
- Record in `personeel_aanvragen` met status 'nieuw'
- Email naar info@toptalentjobs.nl
- Telegram alert (if configured)
```

#### Test A2: Pipeline A — Rate limit
```
6x dezelfde request binnen 1 minuut
Verwacht: 5x 200, 6e 429 met Retry-After header
```

#### Test A3: Pipeline A — Validatie (ontbrekend veld)
```
POST zonder 'bedrijfsnaam'
Verwacht: 400 met Zod foutmelding
```

#### Test B1: Pipeline B — Inschrijven (succes)
```
POST /api/inschrijven (FormData)

voornaam: "Audit"
achternaam: "Test"
email: "audit-kandidaat@toptalentjobs.nl"
telefoon: "0687654321"
stad: "Utrecht"
geboortedatum: "2000-01-15"
geslacht: "man"
horecaErvaring: "2-5 jaar"
beschikbaarheid: "fulltime"
beschikbaarVanaf: "2026-05-01"
motivatie: "Audit test motivatie"
hoeGekomen: "google"
uitbetalingswijze: "loondienst"
functies: ["bediening"]
talen: ["nederlands"]
recaptchaToken: "<valid_token>"

Verwacht:
- Status 200, body: { success: true }
- Record in `inschrijvingen` met onboarding_status 'nieuw'
- Bevestigingsmail naar kandidaat email
- AI screening score in record (als OpenAI geconfigureerd)
```

#### Test B2: Pipeline B — Rate limit
```
6x dezelfde request binnen 1 minuut
Verwacht: 5x 200, 6e 429
```

#### Test B3: Pipeline B — ZZP zonder KVK
```
POST met uitbetalingswijze: "zzp" en geen kvkNummer
Verwacht: 400 "KVK nummer is verplicht voor ZZP inschrijvingen"
```

### Negative / Edge Cases

#### Test N1: reCAPTCHA zonder token
```
POST zonder recaptchaToken
Verwacht: 400 "reCAPTCHA verificatie vereist"
```

#### Test N2: XSS payload in Pipeline B
```
POST met motivatie: '<img src=x onerror="alert(1)">'
Verwacht: Record wordt opgeslagen, MAAR admin email zou escaped moeten zijn
Huidig gedrag: HTML wordt raw in email gerenderd (BUG - zie C-1)
```

#### Test N3: Ongeldige geboortedatum
```
POST met geboortedatum: "niet-een-datum"
Verwacht: Zou 400 moeten returnen
Huidig gedrag: Wordt geaccepteerd en opgeslagen (BUG - zie H-1)
```

#### Test N4: Duplicate email submission (Pipeline B)
```
2x POST met zelfde email
Verwacht: 2e zou waarschuwing moeten geven
Huidig gedrag: 2 records worden aangemaakt (BUG - zie H-2)
```

---

## Aanbevolen Fix Prioriteit

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | **C-2**: Wrap Pipeline B background tasks in `after()` | Voorkomt timeout errors voor kandidaten | Laag (zelfde pattern als Pipeline A) |
| 2 | **C-3**: DB insert VOOR admin email in Pipeline B | Voorkomt data verlies bij Resend failure | Laag (regels verplaatsen) |
| 3 | **C-1**: `escapeHtml` toevoegen aan Pipeline B email | Voorkomt HTML injection | Laag (import + wrap) |
| 4 | **C-5**: Pipeline A DB insert buiten Resend conditie | Voorkomt data verlies zonder API key | Laag |
| 5 | **H-1**: `geboortedatum` format + leeftijd validatie | Voorkomt garbage data | Middel |
| 6 | **H-2**: Duplicate email check in Pipeline B | Voorkomt dubbele records + kosten | Middel |
| 7 | **M-12**: UTM tracking toevoegen aan inschrijven route | Marketing attribution voor kandidaten | Laag |
| 8 | **H-5**: `escapeHtml` in alle email templates | Sluit stored XSS vector | Middel |
| 9 | **C-4**: Base schema exporteren en committen | Disaster recovery | Middel |

---

## Volgende Stappen

1. **Gebruiker geeft "go"** voor happy-path tests
2. Tests draaien tegen lokale dev server of staging
3. Resultaten documenteren in dit rapport
4. Fixes implementeren na goedkeuring per finding
