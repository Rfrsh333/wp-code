# AI-Act Classificatie — Kandidaat-screening Agent
## TopTalent B.V. | Audit 2026-04-22

---

## 1. Systeembeschrijving

### 1.1 Locatie in codebase
- **Hoofdbestand:** `src/lib/agents/kandidaat-screening.ts`
- **OpenAI-client:** `src/lib/agents/openai.ts`
- **API-route:** `src/app/api/admin/ai/screening/route.ts`

### 1.2 Werking

**Input:**
- Volledige kandidaatprofiel uit `inschrijvingen`-tabel:
  - Voornaam + achternaam (PII)
  - Berekende leeftijd op basis van geboortedatum (PII)
  - Woonplaats
  - Horeca-ervaring
  - Gewenste functies
  - Talen
  - Eigen vervoer (ja/nee)
  - Beschikbaarheid (weekschema met tijdslots)
  - Beschikbaar vanaf datum
  - Max uren per week
  - Uitbetalingswijze
  - Motivatie (vrije tekst)

**Verwerking:**
- Admin triggert POST naar `/api/admin/ai/screening/` met `inschrijving_id`
- Systeem haalt kandidaatprofiel op uit database
- Profiel wordt **niet-geanonimiseerd** verstuurd naar OpenAI (`gpt-4o-mini`)
- Prompt bevat letterlijk: `Naam: ${profiel.voornaam} ${profiel.achternaam}` en `Leeftijd: ${leeftijd}`
- Temperature: 0.3 (conservatief)
- Max tokens: 2000

**Output:**
- `score` (numeriek 1-10)
- `samenvatting` (tekst)
- `sterke_punten` (lijst)
- `aandachtspunten` (lijst)
- `aanbeveling` (tekst)

**Opslag:**
- Resultaat wordt direct in `inschrijvingen`-tabel geschreven:
  - `ai_screening_score` (1-10)
  - `ai_screening_notes` (volledige JSON als string)
  - `ai_screening_date` (timestamp)

**Besluitvorming:**
- De agent schrijft **niet** automatisch de status "afgewezen"
- Admin wijzigt `onboarding_status` handmatig
- Bij status "afgewezen" wordt automatisch een afwijzingsmail gestuurd (`sendAfwijzingsmail()`)

---

## 2. Alle AI-agents in het systeem

| Agent | Bestand | Doel | PII naar OpenAI? | Recruitment-gerelateerd? |
|-------|---------|------|-------------------|--------------------------|
| **kandidaat-screening** | `kandidaat-screening.ts` | Beoordeling kandidaten | ✅ Naam, leeftijd, locatie, alles | **Ja — primair** |
| **lead-scoring** | `lead-scoring.ts` | Score bedrijfsleads (1-100) | ✅ Bedrijfsnaam, contact, email, telefoon | Indirect |
| **lead-research** | `lead-research.ts` | Bedrijfsinformatie verrijken | ✅ Bedrijfsnaam, website, branche | Indirect |
| **offerte-generator** | `offerte-generator.ts` | Offertes genereren | ✅ Contactpersoon, bedrijf | Indirect |
| **whatsapp-message** | `whatsapp-message.ts` | WhatsApp-berichten genereren | ✅ Contactpersoon, bedrijf, pain points | Indirect |
| **smart-sequence** | `smart-sequence.ts` | Volgende sales-actie bepalen | ✅ Lead metadata (naam, bedrijf, email) | Indirect |
| **klant-retention** | `klant-retention.ts` | Klantretentie-risico analyseren | ✅ Contactpersoon, bedrijf, dienstgeschiedenis | Indirect |
| **lead-followup** | `lead-followup.ts` | Follow-up e-mails genereren | ✅ Contactpersoon, bedrijf, email | Indirect |
| **content-generator** | `content-generator.ts` | Blog/LinkedIn posts | ❌ Alleen geaggregeerde data | Nee |
| **predictive-ai** | `predictive-ai.ts` | Pipeline-voorspellingen | ❌ Alleen geaggregeerde metrics | Nee |
| **competitive-intel** | `competitive-intel.ts` | Concurrentie-analyse | ❌ Alleen bedrijfsinfo | Nee |
| **dienst-planner** | `dienst-planner.ts` | Dienstplanning suggesties | ❌ Alleen aantallen en data | Nee |

---

## 3. EU AI-Act classificatie

### 3.1 Toepasselijk kader

**Verordening (EU) 2024/1689** — EU AI-Act

- **Verboden praktijken (Art. 5):** van kracht sinds **2 februari 2025**
- **AI-geletterdheid (Art. 4):** van kracht sinds **2 februari 2025**
- **High-risk verplichtingen (Art. 6-49):** van kracht vanaf **2 augustus 2026**

### 3.2 Check verboden praktijken (Art. 5)

| Verboden praktijk | Toepasselijk op TopTalent? |
|-------------------|---------------------------|
| Social scoring door publieke instantie | ❌ Nee — privaat bedrijf |
| Emotieherkenning op werkplek/onderwijs | ❌ Nee — agent analyseert tekst, geen emotie |
| Manipulatie / uitbuiting kwetsbaarheden | ❌ Nee — geen manipulatief doel |
| Real-time biometrische identificatie (publieke ruimtes) | ❌ Nee |
| Scraping voor gezichtsherkenningsdatabases | ❌ Nee |
| Risicobeoordeling op basis van profiling (recidive) | ❌ Nee |

**Conclusie:** Geen verboden AI-praktijken geïdentificeerd. ✅

### 3.3 High-risk classificatie (Art. 6 + Annex III)

**Annex III, punt 4(a) — Werkgelegenheid, personeelsbeheer en toegang tot zelfstandige arbeid:**

> *"AI-systemen die bedoeld zijn om te worden gebruikt voor de werving of selectie van natuurlijke personen, met name om gerichte vacatures te plaatsen, sollicitaties te analyseren en te filteren en kandidaten te evalueren."*

**Analyse:**

| Criterium | TopTalent kandidaat-screening | Beoordeling |
|-----------|-------------------------------|-------------|
| AI-systeem? | Ja — OpenAI GPT-4o-mini met gestructureerde prompt | ✅ |
| Bedoeld voor werving/selectie? | Ja — screening van sollicitanten voor uitzendwerk | ✅ |
| Analyseert sollicitaties? | Ja — beoordeelt CV-data, ervaring, motivatie | ✅ |
| Filtert kandidaten? | Ja — genereert score 1-10 die admin gebruikt voor selectie | ✅ |
| Evalueert kandidaten? | Ja — sterke punten, aandachtspunten, aanbeveling | ✅ |

### **Classificatie: HIGH-RISK** `LEGAL_REVIEW_REQUIRED`

**Motivering:** De kandidaat-screening agent valt met hoge waarschijnlijkheid onder Annex III, punt 4(a) als high-risk AI-systeem. Het systeem:
1. Ontvangt sollicitatiegegevens als input
2. Genereert een evaluatie met score, sterke/zwakke punten en aanbeveling
3. Deze output wordt direct gebruikt in het wervingsproces
4. De score beïnvloedt substantieel de beslissing om kandidaten aan te nemen of af te wijzen

**Nuance:** Het systeem wijst niet automatisch af — admin neemt de eindbeslissing. Dit vermindert het risico maar verandert de classificatie niet. De AI-Act kijkt naar het *beoogde doel* van het systeem, niet alleen naar wie de knop indrukt.

---

## 4. Verplichtingen als high-risk AI-systeem

### 4.1 Risicomanagementsysteem (Art. 9)

**Verplichting:** Gedocumenteerd risicomanagementsysteem dat risico's identificeert, analyseert en mitigeert gedurende de hele levenscyclus.

**Huidige status:** ❌ **Niet aanwezig**

**Vereist:**
- Identificatie van bekende en voorzienbare risico's
- Risico's voor gezondheid, veiligheid en grondrechten
- Maatregelen voor risicomitigatie
- Regelmatige evaluatie en actualisering

---

### 4.2 Data en datagovernance (Art. 10)

**Verplichting:** Trainings-, validatie- en testdatasets van hoge kwaliteit, relevant, representatief en zo vrij mogelijk van fouten en bias.

**Huidige status:** ⚠️ **Gedeeltelijk — OpenAI's basismodel is voorgetraind; TopTalent gebruikt geen eigen trainingsdata maar wel een specifieke prompt.**

**Risico's:**
- **Leeftijdsdiscriminatie:** Agent ontvangt leeftijd — kan leiden tot lagere scores voor oudere/jongere kandidaten
- **Locatiediscriminatie:** Agent ontvangt woonplaats — kan leiden tot bias op basis van woonplaats
- **Taaldiscriminatie:** Agent beoordeelt taalvaardigheid — kan indirect discrimineren op afkomst
- **Geslachtsdiscriminatie:** `geslacht` wordt verzameld in registratie — **verifieer of dit naar de agent wordt gestuurd**

**Vereist:**
- Documenteer welke kenmerken de agent ontvangt en waarom
- Test op bias (leeftijd, geslacht, afkomst) met testdatasets
- Overweeg leeftijd en naam **niet** naar de agent te sturen

---

### 4.3 Technische documentatie (Art. 11)

**Verplichting:** Technische documentatie opgesteld vóór het in de handel brengen of in gebruik nemen.

**Huidige status:** ❌ **Niet aanwezig**

**Vereist:**
- Algemene beschrijving van het systeem
- Gedetailleerde beschrijving van ontwikkelingsproces
- Informatie over monitoring, werking en controle
- Beschrijving van het risicomanagementsysteem
- Beschrijving van wijzigingen gedurende levenscyclus

---

### 4.4 Registratie/logging (Art. 12)

**Verplichting:** Automatische registratie van gebeurtenissen (logs) gedurende de levenscyclus.

**Huidige status:** ⚠️ **Gedeeltelijk**

**Wat er is:**
- ✅ `ai_screening_date` — timestamp van screening
- ✅ `ai_screening_notes` — volledige JSON output opgeslagen
- ✅ `ai_screening_score` — score opgeslagen
- ✅ `audit_log` — wijzigingen in onboarding_status gelogd

**Wat ontbreekt:**
- ❌ Geen log van de exacte prompt die naar OpenAI is gestuurd
- ❌ Geen log van het OpenAI-model en -versie per screening
- ❌ Geen log van wie de screening heeft geïnitieerd (admin user)
- ❌ Geen traceerbaarheid naar specifieke OpenAI API-call

---

### 4.5 Transparantie (Art. 13)

**Verplichting:** Voldoende transparant ontworpen en ontwikkeld opdat gebruikers de output kunnen interpreteren en op passende wijze kunnen gebruiken.

**Huidige status:** ⚠️ **Gedeeltelijk**

**Wat er is:**
- ✅ Output bevat `samenvatting`, `sterke_punten`, `aandachtspunten` — admin kan redenering zien

**Wat ontbreekt:**
- ❌ Kandidaat wordt **niet** geïnformeerd dat AI is gebruikt bij de beoordeling
- ❌ Geen uitleg aan kandidaat over de logica van het systeem
- ❌ Geen vermelding van AI-screening in privacyverklaring (privacyverklaring zegt expliciet: "wij nemen geen besluiten op basis van geautomatiseerde verwerking" — **dit is feitelijk onjuist**)

**`CRITICAL`:** De privacyverklaring (sectie 12.7) stelt dat TopTalent **geen** geautomatiseerde besluitvorming toepast. Dit is in tegenspraak met het bestaan van de AI-screening agent. Zelfs als de eindbeslissing menselijk is, moet het gebruik van AI-ondersteuning vermeld worden.

---

### 4.6 Menselijk toezicht (Art. 14)

**Verplichting:** Zodanig ontworpen dat effectief menselijk toezicht mogelijk is gedurende de gebruiksperiode.

**Huidige status:** ⚠️ **Gedeeltelijk**

**Wat er is:**
- ✅ AI schrijft niet automatisch status "afgewezen" — admin neemt eindbeslissing
- ✅ Admin kan score en notities inzien vóór beslissing

**Wat ontbreekt:**
- ❌ Geen "override" mechanisme — admin kan score niet aanpassen, alleen negeren
- ❌ Geen verplichte review vóór statuswijziging (technisch kan admin blind op score afgaan)
- ❌ Geen documentatie dat menselijk toezicht verplicht is in het proces
- ❌ Geen training/instructie voor admins over interpretatie van AI-scores

---

### 4.7 Accuraatheid, robuustheid en cyberveiligheid (Art. 15)

**Huidige status:** ⚠️ **Gedeeltelijk**

**Wat er is:**
- ✅ Rate limiting op screening endpoint (brute force bescherming)
- ✅ Admin-authenticatie vereist (`verifyAdmin()`)
- ✅ Temperature 0.3 (lagere variabiliteit)

**Wat ontbreekt:**
- ❌ Geen validatie van OpenAI output (wordt direct weggeschreven)
- ❌ Geen fallback bij OpenAI API-fout (behalve error response)
- ❌ Geen periodieke evaluatie van screening-accuraatheid
- ❌ Geen adversarial testing (kan een kandidaat de prompt manipuleren via motivatie-veld?)

---

### 4.8 Conformiteitsbeoordeling (Art. 43)

**Verplichting:** High-risk AI-systemen in Annex III moeten een conformiteitsbeoordeling ondergaan vóór ingebruikname. Voor punt 4 (werkgelegenheid) geldt **interne conformiteitsbeoordeling** (Art. 43.2 + Annex VI).

**Huidige status:** ❌ **Niet uitgevoerd**

**Deadline:** Vóór **2 augustus 2026** moet het systeem conform zijn, of uit gebruik genomen worden.

---

## 5. Art. 22 AVG — Geautomatiseerde individuele besluitvorming

**Art. 22 lid 1:** "De betrokkene heeft het recht niet te worden onderworpen aan een uitsluitend op geautomatiseerde verwerking, waaronder profilering, gebaseerd besluit waaraan voor hem rechtsgevolgen zijn verbonden of dat hem anderszins in aanmerkelijke mate treft."

**Analyse:**

| Criterium | TopTalent | Beoordeling |
|-----------|-----------|-------------|
| Uitsluitend geautomatiseerd? | Nee — admin neemt eindbeslissing | ⚠️ Maar: AI-score heeft substantiële invloed |
| Rechtsgevolgen? | Afwijzing heeft geen directe rechtsgevolgen | ⚠️ Maar: treft kandidaat "in aanmerkelijke mate" (geen baan) |
| Profilering? | Ja — scoring op basis van persoonlijke kenmerken | ✅ Dit is profilering |

**`LEGAL_REVIEW_REQUIRED`:** Hoewel de eindbeslissing formeel bij admin ligt, is de vraag of de AI-score de facto bepalend is. Als admin structureel de AI-score volgt, kan dit kwalificeren als "geautomatiseerde besluitvorming" in de zin van Art. 22. AP en EDPB hanteren een ruime interpretatie.

**Ongeacht Art. 22-kwalificatie, zijn de volgende maatregelen verstandig:**
1. Informeer kandidaten dat AI wordt gebruikt bij de beoordeling
2. Leg de logica van het systeem uit (welke factoren worden gewogen)
3. Bied mogelijkheid tot menselijke herbeoordeling
4. Documenteer dat admin daadwerkelijk afwijkt van AI-advies (statistiek bijhouden)

---

## 6. Art. 4 AI-Act — AI-geletterdheid (van kracht sinds 2 feb 2025)

**Verplichting:** Aanbieders en gebruiksverantwoordelijken nemen maatregelen om te zorgen voor een toereikend niveau van AI-geletterdheid van hun personeel en andere personen die namens hen AI-systemen bedienen en gebruiken.

**Huidige status:** ❌ **Niet aangetoond**

**Vereist:**
- Training voor admins over werking, beperkingen en risico's van de AI-screening
- Documentatie over hoe AI-scores te interpreteren
- Bewustzijn van bias-risico's

---

## 7. Samenvatting bevindingen

| Verplichting | Status | Urgentie |
|-------------|--------|----------|
| Verboden praktijken (Art. 5) | ✅ Geen overtredingen | - |
| High-risk classificatie | **Waarschijnlijk high-risk** `LEGAL_REVIEW_REQUIRED` | **CRITICAL** |
| Risicomanagementsysteem (Art. 9) | ❌ Niet aanwezig | **HIGH** |
| Data governance / bias (Art. 10) | ❌ Niet gedocumenteerd | **HIGH** |
| Technische documentatie (Art. 11) | ❌ Niet aanwezig | **HIGH** |
| Logging (Art. 12) | ⚠️ Gedeeltelijk | **MEDIUM** |
| Transparantie (Art. 13) | ❌ Kandidaat niet geïnformeerd; privacyverklaring onjuist | **CRITICAL** |
| Menselijk toezicht (Art. 14) | ⚠️ Admin beslist, maar geen formeel proces | **HIGH** |
| Accuraatheid (Art. 15) | ⚠️ Beperkt | **MEDIUM** |
| Conformiteitsbeoordeling (Art. 43) | ❌ Niet uitgevoerd | **HIGH** (deadline 2 aug 2026) |
| AI-geletterdheid (Art. 4) | ❌ Niet aangetoond | **HIGH** (al verplicht) |
| Art. 22 AVG | ⚠️ Formeel menselijke beslissing, maar AI-invloed substantieel | **HIGH** `LEGAL_REVIEW_REQUIRED` |
| Privacyverklaring klopt niet | ❌ Stelt dat geen geautomatiseerde besluitvorming plaatsvindt | **CRITICAL** |
| PII naar OpenAI zonder anonimisering | ❌ Naam + leeftijd letterlijk verstuurd | **CRITICAL** |

---

## 8. Aanbevelingen

### Onmiddellijk (vóór 2 augustus 2026 — deadline high-risk):

1. **Anonimiseer PII vóór verzending naar OpenAI** — vervang naam door "Kandidaat #[ID]", verwijder leeftijd (gebruik ervaringsjaren)
2. **Corrigeer privacyverklaring** — vermeld AI-gebruik bij screening, verwijder claim dat geen geautomatiseerde besluitvorming plaatsvindt
3. **Informeer kandidaten** dat AI wordt gebruikt bij beoordeling (Art. 13 AVG + Art. 13 AI-Act)
4. **Start met AI-geletterdheid** — train admins (Art. 4, nu al verplicht)

### Korte termijn (3 maanden):

5. Stel risicomanagementsysteem op (Art. 9)
6. Test op discriminatie-bias (leeftijd, geslacht, afkomst)
7. Stel technische documentatie op (Art. 11)
8. Implementeer uitgebreide logging (prompt, model, initiator)
9. Formaliseer menselijk toezicht (verplichte review, afwijkingsstatistiek)

### Middellange termijn (6 maanden — vóór deadline):

10. Voer interne conformiteitsbeoordeling uit (Art. 43 + Annex VI)
11. Registreer systeem in EU-database (Art. 49)
12. Implementeer "vraag menselijke herbeoordeling" voor kandidaten
13. Overweeg of lead-scoring agent ook als high-risk kwalificeert (als het leidt tot het wel/niet benaderen van natuurlijke personen)
