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

### 2.5 Identiteitscontrole

> Bijgewerkt 24-10-2026 (privacyverklaring 2.6), op basis van het juridisch advies van 24-10-2026, PR #32 (Didit), #35 (controlerecord volgens de Wav, opschoontool) en #36 (geen ID-upload meer bij kandidaten). Concept, geen juridisch advies; laat de jurist meelezen.

#### 2.5a ID-controle via Didit of videocall (controlerecord)

| Veld | Tabel | Opslag | Toegang |
|------|-------|--------|---------|
| Methode (`didit`/`videocall`/`kopie`), status, uitslag, wie besliste, wanneer, reden bij afwijzing, redenen voor handmatige beoordeling | `id_verificaties` | Supabase PostgreSQL (Frankfurt), RLS: alleen service role | Admin |
| Didit-sessie-id, sessienummer, laatste Didit-status, laatste event-id, wanneer de sessie bij Didit is verwijderd | `id_verificaties` | idem | Admin |
| Naam en geboortedatum zoals op het document, nationaliteit (ISO alpha-3) | `id_verificaties` | idem | Admin |
| Documentsoort, documentnummer, uitgifteland (ISO alpha-3), vervaldatum, EER/Zwitserland ja/nee, naam klopt ja/nee | `id_verificaties` | idem | Admin |
| Bewaar-tot | `id_verificaties.bewaar_tot` | idem | Admin |
| ID-bewijs **zonder bestand**: vervaldatum, review-status, verificatiemethode, beoordeeld door | `medewerker_documenten` (`document_type = 'id_bewijs'`, `file_path` leeg) | idem | Admin, medewerker zelf (status) |

| Onderdeel art. 30 AVG | Invulling |
|---|---|
| Doel | Identiteitsfraude en accountdelen voorkomen; binnen 48 uur kunnen identificeren op verzoek van de Nederlandse Arbeidsinspectie (art. 15a Wav, volgens jurist) |
| Grondslag | Art. 6.1.f (gerechtvaardigd belang), met recht van bezwaar (art. 21); belangenafweging als concept aanwezig |
| Art. 22 AVG | Didit-uitslag wordt alleen automatisch goedgekeurd als alles klopt (Didit Approved, paspoort of ID-kaart, niet verlopen, naam klopt, EER/Zwitserland); anders naar de admin. Nooit automatisch afgewezen (`beoordeelDiditUitslag` in `src/lib/id-check/regels.ts`) |
| Betrokkenen | Zzp'ers die via TopTalent op diensten willen reageren. Kandidaten niet meer (sinds #36) |
| Ontvangers | Didit (verwerker; voor fraudebestrijding deels zelfstandig verantwoordelijke, zie 2.5b); Nederlandse Arbeidsinspectie alleen op verzoek. Niet: horecazaken |
| Doorgifte buiten EER | Nee (Supabase Frankfurt; Didit AWS Ierland). Didit's DPA staat doorgifte met SCC's toe: open punt O3 |
| Bewaartermijn | Tot 31-12 van (jaar laatste dienst + 5); zonder diensten vanaf het jaar van de beslissing (`berekenWavBewaarTot`). Ook na verwijdering van het account |
| Bewaartermijn technisch | Retentie-cron (`src/app/api/cron/retentie/route.ts` → `src/lib/id-check/bewaartermijn.ts`) rekent `bewaar_tot` elke nacht opnieuw uit en ruimt verlopen records en onbesliste controles van verwijderde accounts op; dry-run zolang `RETENTION_DELETE=1` niet gezet is. Bij accountverwijdering: termijn vastgezet, `medewerker_id` → null (`on delete set null`), open Didit-sessies gewist met `privacy_erasure` |
| Bewust **niet** opgeslagen | BSN/persoonsnummer (ook niet als documentnummer: `veiligDocumentnummer`, `controleerDocumentnummer`), adres, beelden, ruwe webhook-payload |
| Documentnummer | Wel opgeslagen: niet in de minimale lijst van de jurist, door Rachid bewust toegevoegd als extra bewijs welk document is gecontroleerd |
| Beveiliging | RLS service role; webhook met HMAC + tijdstempel; witte lijst van velden (`verificatieUpdateNaBeoordeling`); payload nooit gelogd; audit-log bij admin-acties; admin-2FA |
| Code | `src/lib/id-check/*`, `src/app/api/webhooks/didit/route.ts`, `src/app/api/medewerker/id-check/*`, `src/app/api/admin/medewerkers/id-checks/route.ts`, migraties `supabase/migrations/20261024_id_verificaties_didit.sql` en `20261024_id_controlerecord_wav.sql` |
| Privacyverklaring | `/privacy/` §10f (versie 2.6) |

#### 2.5b Gegevens bij Didit

| Veld | Opslag | Toegang |
|------|--------|---------|
| Foto's van voor- en achterkant van het document, pasfoto op het document, uitgelezen gegevens (naam, geboortedatum, nationaliteit, documentnummer, data), apparaat- en IP-gegevens, uitslag | Didit, AWS eu-west-1 (Ierland) | Didit; admin via de Didit-console (bij handmatige beoordeling) |

| Onderdeel | Invulling |
|---|---|
| Doel en grondslag | Als 2.5a |
| Verwerker | Didit Identity Spain S.L., CIF B22929327, Calle Nápoles 227, 08013 Barcelona |
| Zelfstandig verantwoordelijke (DPA §6) | Didit gebruikt gepseudonimiseerde gegevens als zelfstandig verwerkingsverantwoordelijke voor fraudebestrijding en beveiliging van het eigen platform. Geen opt-out. Geaccepteerd door Rachid (24-10-2026) en vermeld in de privacyverklaring (§7.2, §10f, met link naar https://didit.me/terms/verification-privacy-notice/) |
| Subverwerkers | Volgens Didit-helppagina (15-09-2026): AWS EMEA SARL (Ierland) en Google Maps Platform (alleen adrescontrole, niet gebruikt). Officiële lijst: open punt |
| Verwerkersovereenkomst | Annex 2 (DPA) van de Didit Business Terms (versie 23-09-2026), geaccepteerd bij aanmelding. Niet ondertekend |
| Instellingen | Workflow zonder selfie, liveness, face match, face search, NFC en geluid; bewaartermijn 1 maand; modeltraining uit |
| Bewaartermijn | Direct verwijderd na definitieve beslissing (`DELETE /v3/session/{id}/delete/` met `retain_face_embeddings: false`; `face_retention_outcome` wordt gelogd); vangnet 1 maand |
| Biometrie | Niet gebruikt. Schriftelijke bevestiging van Didit volgt (open punt O1) |

#### 2.5c Videocall

| Onderdeel | Invulling |
|---|---|
| Wat | De zzp'er laat zijn ID zien in een videocall met TopTalent |
| Opgeslagen | Alleen het controlerecord (2.5a), met methode `videocall`. De admin vult uitslag, naam, geboortedatum, nationaliteit, documentsoort, documentnummer (verplicht bij goedkeuren) en vervaldatum in; datum en beoordelaar vult de server in. Geen opname, geen foto, geen schermafbeelding |
| Buiten de EER/Zwitserland | Een videocall kan niet goedkeuren; de admin legt "kopie nodig" vast (2.5d) |
| Grondslag | Art. 6.1.f |
| Tool | **Open**: [naam videotool], verwerkersovereenkomst, waar gehost |
| Code | `src/app/api/medewerker/id-check/videocall/route.ts`; admin-actie `id_videocall` in `src/app/api/admin/medewerkers/route.ts`; regels in `controleerVideocallInvoer` (`src/lib/id-check/controlerecord.ts`) |

#### 2.5d Wav-kopie (alleen zzp'ers van buiten de EER/Zwitserland)

| Onderdeel | Invulling |
|---|---|
| Wat | Kopie van het identiteitsbewijs, volgens art. 15 Wav |
| Wanneer | Als de nieuwste controle (Didit of videocall) een nationaliteit buiten de EER/Zwitserland heeft (`kopieNodig`); de werknemer uploadt de kopie bij Documenten, ook als de ID-controle via Didit aan staat |
| Grondslag | Art. 6.1.c (Wav). **Laten bevestigen door jurist** |
| Opslag | `medewerker_documenten` (`document_type = 'id_bewijs'`, `verificatie_methode = 'kopie_wav'`, `bewaar_tot`), bucket `medewerker-documenten` (privé) |
| Toegang | Admin via signed URL; medewerker zelf (eigen documenten) |
| Bewaartermijn | Tot 31-12 van (jaar laatste dienst + 5), zoals 2.5a; bijgehouden door de retentie-cron |
| Let op | `medewerker_documenten` heeft `on delete cascade` op `medewerker_id`: bij verwijdering van het account verdwijnt de Wav-kopie, vóór het einde van de Wav-termijn. Herzien |
| BSN | Niet nodig; afdekken waar mogelijk |

#### 2.5e Oude ID-kopieën (uitfaseren)

| Veld | Tabel | Opslag |
|------|-------|--------|
| ID-kopie / paspoort (upload) | `medewerker_documenten` (`document_type = 'id_bewijs'`, met `file_path`) | Bucket `medewerker-documenten` (privé) |
| ID-kopie (kandidaat) | `kandidaat_documenten` (type `id`) | Bucket `kandidaat-documenten` (privé) |
| Documenten met BSN (o.a. `loonheffingsverklaring`, oudere NL-ID's) | `medewerker_documenten`, `kandidaat_documenten` | idem |

| Onderdeel | Invulling |
|---|---|
| Status | Wordt opgeschoond met de opschoontool (admin → Medewerkers → "Oude ID-kopieën opschonen", `src/lib/id-check/opschonen.ts`, #35). EER/Zwitserland: bestand weg, controlerecord erbij (`kopie_verwijderd`). Buiten de EER: kopie blijft (`kopie_wav`, 2.5d). Kandidaat die nooit werknemer werd: kopie en regel weg, geen record |
| Nieuwe uploads | Kandidaten kunnen geen ID meer uploaden (#36, code `id_niet_nodig`). Werknemers alleen als een Wav-kopie nodig is (2.5d) |
| Planning | Documenten met BSN eerst; de rest uiterlijk 3 maanden na livegang. **Open**: [datum] |
| Vastleggen | Audit-log `id_kopie_opgeschoond` (zichtbaar als opschoonlog in het paneel) |

#### 2.5f Overige documenten (ongewijzigd, wel controleren)

KvK-uittreksel, werkvergunning (TWV), verblijfsvergunning, VSH, VOG, contract, overig (`src/lib/medewerker/documenten.ts`; bij kandidaten `kandidaat_documenten` type `kvk`/`overig`). Grondslag en bewaartermijn per soort nog nalopen.

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
| ID-controle zzp'ers (Didit of videocall) | Gerechtvaardigd belang | f |
| Wav-kopie zzp'ers buiten EER/Zwitserland | Wettelijke verplichting (laten bevestigen) | c |
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
