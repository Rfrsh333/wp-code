# Fase 5 — Retentie & verwijdering

**Datum:** 2026-04-22

---

## Privacy Policy retentietermijnen (gedocumenteerd)

Bron: `src/app/privacy/page.tsx:271-337`

| Document | Bewaartermijn na einde dienstverband | Wettelijke basis | In code afgedwongen? |
|----------|--------------------------------------|------------------|---------------------|
| Sollicitatiedata (niet aangenomen) | 4 weken, max 1j met toestemming | AVG + AP-richtlijn | **NEE** |
| Kandidaat-pool (met consent) | Max 2 jaar na laatste contact | AVG | **NEE** |
| Arbeidscontract + personeelsdossier | 2 jaar na einde dienst | Arbeidsrecht | **NEE** |
| Loonadministratie | 7 jaar | Fiscale wet | **NEE** |
| ID-kopie | 5 jaar na einde dienst | Wet ID-plicht + fiscale wet | **NEE** (functie `berekenBewaarTot()` bestaat maar wordt niet aangeroepen) |
| Loonbelastingverklaringen | 5 jaar na einde dienst | Fiscale wet | **NEE** |
| Urenregistraties | 7 jaar | Fiscale wet | **NEE** |
| Facturen + financieel | 7 jaar | Fiscale wet | **NEE** |
| Klantdata | 7 jaar na einde samenwerking | Fiscale wet | **NEE** |
| Email-correspondentie | 2 jaar na laatste contact | Best practice | **NEE** |
| Website-analytics | 26 maanden (geanonimiseerd) | AVG | Via Vercel/GA instellingen |
| Klachten & geschillen | 5 jaar na afhandeling | Best practice | **NEE** |

**Conclusie: GEEN ENKELE retentietermijn wordt technisch afgedwongen.**

---

## Bestaande cleanup-mechanismen

| Mechanisme | Wat wordt opgeschoond? | Termijn | Scheduled? |
|------------|----------------------|---------|-----------|
| `onboarding-cleanup` cron | Verlopen portal-tokens | Na expiry | JA (dagelijks 05:00) |
| `daily-cleanup` cron | Sessie-tokens | 30 dagen | **NEE** (orphaned) |
| `daily-cleanup` cron | Chatbot-gesprekken | 7 dagen (status → closed) | **NEE** (orphaned) |
| `daily-cleanup` cron | Verlopen diensten | Na datum | **NEE** (orphaned) |
| Admin DELETE endpoint | Medewerker record | Handmatig (owner-only) | N.v.t. |
| Admin data endpoint | Inschrijving record | Handmatig (owner-only) | N.v.t. |
| Medewerker portaal | Eigen documenten | Handmatig (zelf-bediening) | N.v.t. |

---

## Ontbrekende retentie-mechanismen

### RET-1: Geen automatische verwijdering na retentietermijn (CRITICAL)
- `bewaar_tot` kolom bestaat op `medewerker_documenten` en `kandidaat_documenten`
- `berekenBewaarTot()` functie bestaat in `arbeidstijden.ts:290-294`
- **Maar:** `bewaar_tot` wordt NERGENS gepopuleerd
- **Maar:** Er is GEEN cron/agent die records met verlopen `bewaar_tot` verwijdert
- **Impact:** Documenten worden oneindig bewaard

### RET-2: Geen automatische CV-verwijdering na 4 weken (HIGH)
- AP-richtlijn: CV's van afgewezen sollicitanten moeten binnen 4 weken verwijderd worden
- `kandidaat_documenten` met `document_type = 'cv'` heeft geen `bewaar_tot` of auto-cleanup
- Kandidaat kan zelf ook niet verwijderen (geen DELETE endpoint voor kandidaten)
- **Impact:** CV's blijven oneindig in `kandidaat-documenten` bucket

### RET-3: Geen "recht op vergeten" endpoint (HIGH)
- Privacy policy belooft: "U kunt uw gegevens laten verwijderen" (Art. 17)
- Er is GEEN self-service portaal of API-endpoint hiervoor
- Verwijdering vereist: email naar `info@toptalentjobs.nl` → admin handmatig delete
- **Ontbreekt bij verwijdering:**
  - Storage-objects in Supabase buckets (alleen DB record wordt verwijderd)
  - Chatbot-berichten (alleen status → closed, berichten blijven)
  - `email_log` records
  - `audit_log` records (moet juist bewaard voor accountability)

### RET-4: Geen `datum_uit_dienst` workflow (HIGH)
- Kolom `medewerkers.datum_uit_dienst` bestaat (DATE)
- Wordt NERGENS automatisch gezet
- Geen "uitdienst-flow" die:
  1. `datum_uit_dienst` zet
  2. `bewaar_tot` berekent op documenten
  3. Beschikbaarheid sluit
  4. Status naar "inactief" zet
- **Impact:** Geen startpunt voor retentietermijn-berekening

### RET-5: Chatbot-berichten nooit verwijderd (MEDIUM)
- `daily-cleanup` zet status naar "closed" na 7 dagen
- Berichten in `chatbot_messages` worden NOOIT verwijderd
- Kunnen PII bevatten (namen, telefoonnummers, situatiebeschrijvingen)
- Privacy policy zegt niets over chatbot-retentie

### RET-6: OpenAI/AI-screening logs (MEDIUM)
- AI-screening data wordt via OpenAI API verwerkt
- Geen lokale opslag van AI-responses (gaat via streaming)
- Privacy policy claimt: "geanonimiseerd" (geen naam/geboortedatum)
- **Maar:** OpenAI retentie-policy: 30 dagen default (controleer DPA)

### RET-7: Geen soft-delete patroon (LOW)
- Alle deletes zijn hard deletes (`supabaseAdmin.from("x").delete()`)
- Geen `deleted_at` kolom of trash/archief mechanisme
- Geen mogelijkheid tot "undo" na admin-verwijdering
- **Audit-log** vangt acties op, maar data is onherstelbaar weg

---

## Recht op vergeten — coverage check

| Actie | Geimplementeerd? | Methode |
|-------|-----------------|---------|
| Medewerker-record verwijderen | JA | Admin DELETE (owner-only) |
| Inschrijving-record verwijderen | JA | Admin data DELETE (owner-only, CASCADE naar kandidaat_documenten) |
| Storage-bestanden verwijderen | **GEDEELTELIJK** | CASCADE delete verwijdert DB record, maar NIET het bestand in Supabase Storage |
| Email-log opschonen | **NEE** | Geen endpoint |
| Audit-log opschonen | **NEE** (bewust — accountability) | Geen endpoint |
| Chatbot-berichten verwijderen | **NEE** | Alleen status → closed |
| OpenAI-verzoekhistorie | **NEE** (extern) | Afhankelijk van OpenAI DPA |
| Push-subscriptions verwijderen | **NEE** | Geen endpoint |

---

## Samenvatting

| Ernst | Gap | Risico |
|-------|-----|--------|
| **CRITICAL** | Geen automatische retentie-verwijdering | AVG-overtreding: data oneindig bewaard |
| **HIGH** | CV's niet verwijderd na 4 weken | AP-richtlijn overtreding |
| **HIGH** | Geen recht-op-vergeten endpoint | GDPR Art. 17 niet volledig geimplementeerd |
| **HIGH** | Geen uitdienst-workflow | Geen startpunt voor retentietermijnen |
| **MEDIUM** | Chatbot-berichten nooit verwijderd | PII-opslag zonder retentiebeleid |
| **MEDIUM** | Storage-bestanden niet mee-verwijderd bij record delete | Weesbestanden in buckets |
| **LOW** | Geen soft-delete patroon | Onherstelbaar dataverlies bij admin-fout |
