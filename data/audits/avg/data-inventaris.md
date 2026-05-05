# Data-inventaris — Verwerkingsregister (Art. 30 AVG)
## TopTalent B.V. | Audit 2026-04-22

---

## 1. Verwerkingsverantwoordelijke

| Veld | Waarde |
|------|--------|
| Organisatie | TopTalent B.V. |
| Vestiging | Utrecht, Nederland |
| Contact | info@toptalentjobs.nl / +31 6 17 17 79 39 |
| FG (Functionaris Gegevensbescherming) | **Niet aangesteld — `LEGAL_REVIEW_REQUIRED`: bij AI-screening op schaal mogelijk verplicht** |

---

## 2. Categorieën persoonsgegevens

### 2.1 Identificatiegegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| Voornaam, tussenvoegsel, achternaam | `inschrijvingen`, `medewerkers`, `klanten`, `leads` | Supabase PostgreSQL | Admin, betreffende betrokkene |
| Geboortedatum | `inschrijvingen`, `medewerkers`, `contracten.contract_data` | Supabase PostgreSQL | Admin, betreffende betrokkene |
| Geslacht | `inschrijvingen`, `medewerkers` | Supabase PostgreSQL | Admin |
| Adres + stad | `inschrijvingen`, `medewerkers`, `klanten` | Supabase PostgreSQL | Admin |
| Profielfoto | `medewerkers.profile_photo_url` | Supabase Storage | Admin, medewerker zelf |

**Grondslag:** Art. 6.1.b (uitvoering overeenkomst — nodig voor uitzendrelatie)
**Bewaartermijn (privacyverklaring):** 2 jaar na einde dienstverband; afgewezen sollicitanten 4 weken (of 1 jaar met toestemming)
**Bewaartermijn (technisch geïmplementeerd):** Geen automatische verwijdering gevonden — **GAP**

---

### 2.2 Contactgegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| E-mailadres | `inschrijvingen`, `medewerkers`, `klanten`, `leads`, `contact_berichten` | Supabase PostgreSQL | Admin, betrokkene |
| Telefoonnummer | `inschrijvingen`, `medewerkers`, `klanten`, `leads`, `contact_berichten` | Supabase PostgreSQL | Admin, betrokkene |
| Noodcontact (naam, telefoon, relatie) | `medewerkers` | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.b (uitvoering overeenkomst)
**Bewaartermijn (privacyverklaring):** E-mailcommunicatie 2 jaar na laatste contact
**Bewaartermijn (technisch):** Geen automatische verwijdering — **GAP**

---

### 2.3 Arbeidsverleden & vaardigheden

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| Horeca-ervaring | `inschrijvingen.horeca_ervaring` | Supabase PostgreSQL | Admin, AI-screening agent (OpenAI) |
| Gewenste functies | `inschrijvingen.gewenste_functies` | Supabase PostgreSQL | Admin, AI-screening agent (OpenAI) |
| Talen | `inschrijvingen.talen`, `medewerkers.languages` | Supabase PostgreSQL | Admin, AI-screening agent (OpenAI) |
| Motivatie (vrije tekst) | `inschrijvingen.motivatie` | Supabase PostgreSQL | Admin, AI-screening agent (OpenAI) |
| Werkervaring | medewerker werkervaring endpoint | Supabase PostgreSQL | Admin, medewerker |
| Certificeringen | medewerker certificeringen endpoint | Supabase PostgreSQL | Admin, medewerker |
| CV-document | `kandidaat_documenten` (type='cv') | Supabase Storage bucket `kandidaat-documenten` (privé) | Admin (signed URL) |

**Grondslag:** Art. 6.1.b (beoordeling geschiktheid voor uitzendwerk)
**Bewaartermijn:** Zie identificatiegegevens
**Let op:** Deze gegevens worden **niet-geanonimiseerd** naar OpenAI gestuurd — zie AI-Act classificatie

---

### 2.4 Financiële gegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| Uurtarief | `medewerkers`, `klanten.default_hourly_rate`, `contracten.contract_data` | Supabase PostgreSQL | Admin |
| Uitbetalingswijze | `inschrijvingen.uitbetalingswijze` | Supabase PostgreSQL | Admin |
| KvK-nummer | `inschrijvingen.kvk_nummer`, `klanten.kvk_nummer` | Supabase PostgreSQL | Admin |
| Factuurbedragen | `facturen`, `factuur_regels` | Supabase PostgreSQL | Admin, betreffende klant |
| Boete-betalingen | Mollie webhook | Supabase + Mollie | Admin |

**Grondslag:** Art. 6.1.b (uitvoering overeenkomst) + Art. 6.1.c (wettelijke verplichting — fiscale bewaarplicht)
**Bewaartermijn:** 7 jaar (fiscale verplichting)
**BSN:** Privacy policy vermeldt dat BSN alleen bij wettelijke verplichting verwerkt wordt. Niet in huidige database-schema gevonden — mogelijk extern/handmatig.

---

### 2.5 Identiteitsdocumenten

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| ID-kopie / paspoort | `kandidaat_documenten` (type='id') | Supabase Storage `kandidaat-documenten` (privé bucket, RLS) | Admin via signed URL |
| KvK-uittreksel | `kandidaat_documenten` (type='kvk') | Supabase Storage | Admin via signed URL |
| Overige documenten | `kandidaat_documenten` (type='overig') | Supabase Storage | Admin via signed URL |
| Documentvervaldatum | `kandidaat_documenten.document_expires_at` | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.c (wettelijke verplichting — WAV, identificatieplicht)
**Bewaartermijn:** ID-kopie 5 jaar na einde dienstverband (wettelijk)
**Beveiliging:** Private bucket, alleen service_role + authenticated admin. Signed URLs met tijdslimiet. ✅

---

### 2.6 Bijzondere persoonsgegevens (Art. 9 AVG)

| Categorie | Aanwezig? | Toelichting |
|-----------|-----------|-------------|
| Gezondheidsgegevens | **Niet gevonden** | Noodcontactgegevens opgeslagen, maar geen medische data |
| Biometrische gegevens | **Digitale handtekening** | `contract_ondertekeningen.handtekening_data` (base64 PNG) — `LEGAL_REVIEW_REQUIRED`: kwalificeert dit als biometrisch? |
| Strafrechtelijke gegevens (Art. 10) | **Niet in database** | VOG wordt niet digitaal opgeslagen. Mogelijk fysiek/handmatig? — **verifieer** |
| Ras/etniciteit | Nee | - |
| Politieke opvattingen | Nee | - |
| Religieuze overtuigingen | Nee | - |
| Vakbondslidmaatschap | Nee | - |
| Seksueel gedrag/geaardheid | Nee | - |

**`LEGAL_REVIEW_REQUIRED`:** Digitale handtekening als biometrisch gegeven. Art. 9.2.a vereist uitdrukkelijke toestemming of Art. 9.2.b (noodzakelijk voor uitvoering arbeidsrecht). Contractondertekening valt waarschijnlijk onder 9.2.b, maar juridische bevestiging nodig.

---

### 2.7 AI-afgeleide gegevens

| Veld | Tabel | Opslag | Toegang |
|------|-------|--------|---------|
| AI-screeningscore (1-10) | `inschrijvingen.ai_screening_score` | Supabase PostgreSQL | Admin |
| AI-screeningnotities (JSON) | `inschrijvingen.ai_screening_notes` | Supabase PostgreSQL | Admin |
| AI-screeningdatum | `inschrijvingen.ai_screening_date` | Supabase PostgreSQL | Admin |
| Lead-score (1-100) | Via lead-scoring agent | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.f (gerechtvaardigd belang — efficiënte werving). **`LEGAL_REVIEW_REQUIRED`:** Is gerechtvaardigd belang voldoende voor AI-screening, of is toestemming vereist?
**Bewaartermijn:** Niet gedefinieerd — **GAP**
**Art. 22 AVG:** Screening schrijft score weg maar wijst niet automatisch af. Admin wijzigt status handmatig. Echter: AI-score beïnvloedt beslissing substantieel — `LEGAL_REVIEW_REQUIRED`.

---

### 2.8 Communicatiegegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| E-maillog (verzonden, geopend, geklikt, bounced) | `email_log` | Supabase PostgreSQL | Admin |
| Chatbot-gesprekken | `chatbot_conversations`, `chatbot_messages` | Supabase PostgreSQL | Admin |
| Privéberichten | `berichten` | Supabase PostgreSQL | Admin, deelnemers |
| Contactformulierberichten | `contact_berichten` | Supabase PostgreSQL | Admin |
| WhatsApp-berichten (outreach) | `lead_outreach` | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.b (uitvoering overeenkomst) voor operationele communicatie; Art. 6.1.f (gerechtvaardigd belang) voor e-mailtracking
**Bewaartermijn (privacyverklaring):** E-mailcommunicatie 2 jaar na laatste contact
**Bewaartermijn (technisch):** Chatbot-gesprekken gesloten na 7 dagen (cron). Overige: geen automatische verwijdering — **GAP**
**Let op:** E-mail open/click tracking is granulaire gedragsmonitoring — in privacyverklaring vermelden

---

### 2.9 Contractgegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| Contractnummer, type, titel | `contracten` | Supabase PostgreSQL | Admin, medewerker |
| Contract-inhoud (JSON) | `contracten.contract_data` (bevat naam, adres, geboortedatum, uurtarief, etc.) | Supabase PostgreSQL | Admin |
| Digitale handtekening | `contract_ondertekeningen.handtekening_data` | Supabase PostgreSQL | Admin |
| Handtekening-hash | `contract_ondertekeningen.handtekening_hash` (SHA-256) | Supabase PostgreSQL | Admin |
| IP-adres + user agent bij ondertekening | `contract_ondertekeningen` | Supabase PostgreSQL | Admin |
| Contract-PDF | `contracten.pdf_pad`, `contracten.getekend_pdf_pad` | Supabase Storage | Admin |
| Versiegeschiedenis | `contract_versies` | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.b (uitvoering overeenkomst) + Art. 6.1.c (wettelijke bewaarplicht)
**Bewaartermijn:** Juridisch minimaal 7 jaar na einde contract

---

### 2.10 Gedragsgegevens & gamificatie

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| Aantal diensten | `medewerkers.totaal_diensten` | Supabase PostgreSQL | Admin, medewerker |
| Streak-count | `medewerkers.streak_count` | Supabase PostgreSQL | Admin, medewerker |
| No-show-count | `medewerkers.no_show_count` | Supabase PostgreSQL | Admin |
| Admin-scores (aanwezigheid, vaardigheden) | `medewerkers.admin_score_*` | Supabase PostgreSQL | Admin |
| Gemiddelde score | `medewerkers.gemiddelde_score` | Supabase PostgreSQL | Admin, medewerker |
| Badge | `medewerkers.badge` | Supabase PostgreSQL | Admin, medewerker |
| Laatste activiteit | `medewerkers.last_active_at` | Supabase PostgreSQL | Admin |
| Beschikbaarheidspatronen | `availability_schedules`, `medewerker_beschikbaarheid_overrides` | Supabase PostgreSQL | Admin, medewerker |

**Grondslag:** Art. 6.1.f (gerechtvaardigd belang — personeelsplanning en kwaliteitsbewaking)
**Bewaartermijn:** Niet gedefinieerd — **GAP**

---

### 2.11 Leads & acquisitiegegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| Naam, bedrijf, functie | `leads` | Supabase PostgreSQL | Admin |
| E-mail, telefoon | `leads` | Supabase PostgreSQL | Admin |
| Stad, regio | `leads` | Supabase PostgreSQL | Admin |
| Platform/bron (Facebook, LinkedIn, etc.) | `leads.platform`, `leads.bron_url` | Supabase PostgreSQL | Admin |
| Contactgeschiedenis | `lead_outreach` | Supabase PostgreSQL | Admin |
| Lead-score (AI-gegenereerd) | via lead-scoring agent | Supabase PostgreSQL | Admin |
| Outreach-berichten | `lead_outreach.bericht` | Supabase PostgreSQL | Admin |
| UTM-tracking | `inschrijvingen`, `personeel_aanvragen`, `contact_berichten` | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.f (gerechtvaardigd belang — commerciële acquisitie). **`LEGAL_REVIEW_REQUIRED`:** Geldt voor leads die niet zelf contact hebben opgenomen (scraped van LinkedIn/Facebook).
**Bewaartermijn:** Niet gedefinieerd — **GAP**

---

### 2.12 Technische gegevens

| Veld | Tabel(len) | Opslag | Toegang |
|------|-----------|--------|---------|
| IP-adres (rate limiting) | Upstash Redis keys | Upstash Redis | Systeem |
| IP-adres (bij ondertekening) | `contract_ondertekeningen.ip_adres` | Supabase PostgreSQL | Admin |
| User agent | `contract_ondertekeningen.user_agent` | Supabase PostgreSQL | Admin |
| Sessie JWT (naam, email, rol) | Cookie `medewerker_session` / `klant_session` | Browser cookie (HttpOnly, Secure) | Systeem |
| Push notification subscriptions | `push_subscriptions` | Supabase PostgreSQL | Systeem |
| Cookie-voorkeur | `localStorage: ttj_cookie_consent` | Browser localStorage | Client-side |
| LinkedIn OAuth tokens | `linkedin_connections` | Supabase PostgreSQL | Admin |

**Grondslag:** Art. 6.1.f (gerechtvaardigd belang — beveiliging, systeemwerking)
**Bewaartermijn:** Sessietokens 7 dagen (JWT expiry). Redis rate-limit keys: kort. Push subscriptions: tot uitschrijving.

---

## 3. Samenvatting grondslagen per verwerking

| Verwerking | Grondslag | Art. 6.1 |
|------------|-----------|----------|
| Werving & selectie | Uitvoering overeenkomst | b |
| AI-screening kandidaten | Gerechtvaardigd belang **`LEGAL_REVIEW_REQUIRED`** | f |
| Salarisadministratie | Wettelijke verplichting | c |
| Identiteitscontrole (WAV) | Wettelijke verplichting | c |
| E-mailcommunicatie | Uitvoering overeenkomst | b |
| E-mail open/click tracking | Gerechtvaardigd belang | f |
| Analytics (GTM/GA4) | Toestemming | a |
| Vercel Analytics | **Onduidelijk — niet consent-gated** **GAP** | ? |
| Lead acquisitie | Gerechtvaardigd belang | f |
| Lead scoring (AI) | Gerechtvaardigd belang | f |
| Contractbeheer | Uitvoering overeenkomst | b |
| Gamificatie/badges | Gerechtvaardigd belang | f |
| Chatbot | Uitvoering overeenkomst | b |
| Noodcontacten | Gerechtvaardigd belang (veiligheid) | f |

---

## 4. Kritieke gaps

| # | Gap | Severity | Actie |
|---|-----|----------|-------|
| 1 | Toestemming wordt **niet opgeslagen** in database (alleen client-side validatie) | **CRITICAL** | Voeg `toestemming_timestamp`, `consent_version` toe aan `inschrijvingen` |
| 2 | Geen automatische verwijdering na bewaartermijn | **HIGH** | Implementeer retention cron-job |
| 3 | Bewaartermijn AI-screeningdata niet gedefinieerd | **HIGH** | Definieer en implementeer |
| 4 | Bewaartermijn leads niet gedefinieerd | **MEDIUM** | Definieer en implementeer |
| 5 | Bewaartermijn gedragsdata (no-shows, scores) niet gedefinieerd | **MEDIUM** | Definieer en implementeer |
| 6 | Vercel Analytics niet achter consent-gate | **MEDIUM** | Wrap in consent check |
| 7 | FG niet aangesteld | **`LEGAL_REVIEW_REQUIRED`** | Beoordeel of verplicht |
