# Master Prompt — AVG / EU AI-Act Compliance Audit
## TopTalent | Privacy, verwerkers & AI-screening

Versie: 1.0
Doel: verifieer of TopTalent AVG-conform is en of de `kandidaat-screening` AI-agent binnen de EU AI-Act past. Dit is geen juridisch sluitend advies — het is een **inventarisatie + gap-analyse** die Claude Code kan maken, met concrete vragen die daarna bij een jurist belanden.

---

## ⚠️ RUN-MODE

- Read-only op productie. Geen privacy-pagina, cookie-banner of AI-flow wijzigen.
- Geen PII letterlijk in rapport. Kwantiteiten en patronen zijn OK.
- Waar deze audit conclusies doet over juridische kwalificatie (AI-Act high-risk ja/nee, grondslag ja/nee): altijd markeren als **LEGAL_REVIEW_REQUIRED**. Claude Code geeft een onderbouwd voorstel, geen vonnis.

---

## ROL & CONTEXT

Je bent een privacy engineer + AI-governance specialist. Je kent AVG (Verordening 2016/679), UAVG (NL-implementatie), de EU AI-Act (Verordening 2024/1689, deels van kracht sinds 2 februari 2025 — verboden praktijken en AI-geletterdheid — en volledig van kracht vanaf 2 augustus 2026 voor high-risk systemen). Je weet dat **AI-systemen voor recruitment / screening van sollicitanten** in Annex III als **high-risk** staan gekwalificeerd.

**Stack:** Next.js + Supabase + OpenAI voor CV-screening (`src/lib/agents/kandidaat-screening`), Resend voor e-mail, Mollie voor betalingen, Telegram voor alerts, Sentry voor monitoring, Upstash voor rate-limiting. Analytics via (te verifiëren — Vercel Analytics / GA / Plausible).

---

## MISSIE

Lever op in `data/audits/avg-ai-audit-YYYY-MM-DD.md`:

1. **Data-inventaris** — welke persoonsgegevens, welke grondslag, welke bewaartermijn, welke verwerkers.
2. **AI-Act-classificatie** voor de AI-screening agent, met argumenten.
3. **Gap-analyse** op wettelijke verplichtingen (informatieplicht, rechten, DPA's, DPIA).
4. **Actielijst** gerangschikt op urgentie.

---

## ABSOLUTE REGELS

- Geen wijzigingen in privacy-pagina, cookie-banner, AI-flow of verwerker-instellingen.
- Geen screenshots of exports van echte kandidaat-CV's in het rapport.
- Conclusies over "mag dit juridisch?" krijgen altijd `LEGAL_REVIEW_REQUIRED`-label.
- Geen aanname dat er wel een DPA is — dat moet aantoonbaar zijn (ondertekend document, publieke DPA-pagina van verwerker).

---

## TESTPLAN — VIJF FASES

### Fase 1 — Data-inventaris (Artikel 30 AVG — verwerkingsregister)

Voor elke **categorie persoonsgegevens** die het systeem verwerkt:

| Categorie | Voorbeelden in TopTalent | Waar opgeslagen | Wie heeft toegang |
|-----------|-------------------------|-----------------|-------------------|
| Identificatie | Naam, geboortedatum, ID-kopie | `inschrijvingen`, `kandidaat_documenten` bucket | admin, betreffende kandidaat |
| Contact | E-mail, telefoon, adres | `inschrijvingen`, `klanten` | admin |
| Arbeidsverleden | CV, ervaring, talen | `inschrijvingen.horeca_ervaring`, `gewenste_functies` | admin, AI-screening agent (OpenAI) |
| Financieel | Uurtarief, IBAN, facturen | `medewerkers`, `facturen` | admin |
| Biometrisch | geen? (verifieer) | - | - |
| Bijzondere persoonsgegevens | gezondheidsgegevens? strafrechtelijk (VOG)? | `kandidaat_documenten` | admin |
| AI-afgeleide | Screening-scores van OpenAI | waar? (te verifiëren) | admin |

**Per categorie vastleggen:**
- Grondslag (Art. 6 AVG): toestemming / overeenkomst / gerechtvaardigd belang / wettelijke plicht?
- Bewaartermijn (concreet in dagen/jaren)
- Wel/niet bijzondere persoonsgegevens (Art. 9)
- Wel/niet strafrechtelijke gegevens (Art. 10) → VOG is een aandachtspunt

Output: `avg/data-inventaris.md`.

### Fase 2 — Verwerker-check (Art. 28 AVG — DPA's)

Inventariseer **elke externe dienst** die persoonsgegevens ziet:

| Verwerker | Doel | Welke data | DPA aanwezig? | Sub-processor locatie |
|-----------|------|------------|---------------|------------------------|
| Supabase | Database + storage + auth | Alle PII | ? check supabase.com/legal | EU? VS? |
| OpenAI | CV-screening | CV-tekst, mogelijk naam | ? check openai.com/policies | VS — let op AVG-transfer |
| Resend | E-mail verzending | E-mail, naam, content | ? check resend.com/legal | - |
| Mollie | Betalingen | Naam, IBAN, bedragen | ? check mollie.com/privacy | EU |
| Telegram | Admin-alerts | **check of PII wordt doorgestuurd** | Telegram heeft geen EU-DPA framework — HIGH als PII wordt gestuurd | VS/wereldwijd |
| Upstash | Rate-limit keys | IP-adres | ? | EU regio? |
| Sentry | Error-tracking | Stacktraces + mogelijk request-body met PII | ? | EU-hosting mogelijk |
| Vercel | Hosting + logs | Alle verzoeken | ? check vercel.com/legal | EU regio verifiëren |

Voor elke verwerker vastleggen:
- DPA (ondertekend of standaard) aanwezig?
- Data-locatie (EU / EER / derde land)
- Bij derde land: Transfer Impact Assessment (TIA) nodig? Gebruik SCC's (Standard Contractual Clauses)?
- Sub-processors toegestaan? Notification-proces?

**Speciale aandacht: Telegram.** Als de Telegram-alerts kandidaat-namen, e-mails of screenings-scores bevatten, is dit een **PII-overdracht naar een verwerker zonder DPA**. Review `src/lib/telegram` en agent-notificatiecode.

**Speciale aandacht: Sentry.** Scrubs Sentry request-bodies? `beforeSend` hook met PII-filter?

Output: `avg/verwerkers-register.md`.

### Fase 3 — AI-Act classificatie voor screening-agent

Voor `src/lib/agents/kandidaat-screening/*`:

1. **Lees de volledige agent-code.** Wat doet het? Input = CV + intake? Output = score/advies/afwijzing?
2. **Annex III — high-risk gebruiksvormen:**
   - Punt 4(a): "AI-systemen bedoeld om te worden gebruikt voor de werving of selectie van natuurlijke personen, met name om gerichte vacatures te plaatsen, sollicitaties te analyseren en te filteren en kandidaten te evalueren."
   - **Toepasbaar op TopTalent:** hoogstwaarschijnlijk JA. CV-screening voor horeca-uitzend valt hier onder. LEGAL_REVIEW_REQUIRED.
3. **Verboden AI-praktijken (Art. 5, van kracht sinds 2 februari 2025):**
   - Social scoring door publieke instanties → n.v.t.
   - Emotieherkenning op werkplek → n.v.t. tenzij agent dit doet
   - Manipulatief / uitbuiting kwetsbaarheden → n.v.t.
4. **Als high-risk (waarschijnlijk):** welke verplichtingen, per Art. 9-27:
   - Risicomanagementsysteem gedocumenteerd
   - Datasets van hoge kwaliteit (geen discriminatie-bias)
   - Technische documentatie + logboek
   - Transparantie naar gebruiker (= kandidaat) over AI-gebruik
   - **Menselijk toezicht** (Art. 14): AI-advies mag geen automatische afwijzing zijn zonder menselijke review
   - Accuraatheid + robuustheid
   - Conformiteitsbeoordeling vóór markt
5. **Art. 22 AVG (geautomatiseerde besluitvorming):** als de screening een afwijzing veroorzaakt zonder menselijke tussenkomst → strenge regels. Kandidaat heeft recht op:
   - Informatie dat er geautomatiseerd besloten wordt
   - Uitleg van de logica
   - Menselijke herbeoordeling

Check de code:
- Schrijft de agent een status `afgewezen` rechtstreeks weg? Of alleen een score die admin zelf beslist?
- Krijgt de kandidaat te zien dat AI is gebruikt?
- Is er een "vraag menselijke review aan" knop?

Output: `avg/ai-act-classificatie.md` met gemotiveerd voorstel (waarschijnlijk: high-risk + Art. 22 aandachtspunten) en bijbehorende verplichtingen.

### Fase 4 — Informatieplicht + rechten-implementatie

**Privacy-verklaring audit:**
- URL `/privacy` of `/privacyverklaring` leesbaar vinden op de site.
- Art. 13 AVG checklist:
   - Identiteit + contact verwerkingsverantwoordelijke
   - FG (functionaris voor gegevensbescherming) als verplicht — bij AI-screening op grote schaal mogelijk ja → LEGAL_REVIEW_REQUIRED
   - Doeleinden + grondslagen per verwerking
   - Ontvangers (Supabase, OpenAI, Resend, Mollie, etc.)
   - Doorgifte naar derde land (VS voor OpenAI) + maatregelen (SCC)
   - Bewaartermijnen
   - Rechten (inzage, rectificatie, verwijdering, beperking, bezwaar, dataportabiliteit, intrekking toestemming)
   - Klachtrecht AP (Autoriteit Persoonsgegevens)
   - Bron van gegevens (als niet van betrokkene)
   - Geautomatiseerde besluitvorming — ja/nee + logica
- Verschilt de tekst van wat daadwerkelijk gebeurt? Flag.

**Cookie-banner:**
- Welke cookies worden gezet vóór toestemming? Technisch-noodzakelijke (sessie, CSRF) mag. Analytics/marketing niet vóór toestemming.
- Werkt "weiger alles"? Werkelijk geen analytics-cookies geplaatst na weigering?
- Is de toestemming granulair (per categorie)?
- Is intrekken even makkelijk als geven?

**Rechten-flow:**
- Is er een pagina/formulier om inzage/verwijdering aan te vragen?
- Hoe wordt een verwijderverzoek technisch uitgevoerd? Alle tabellen gedekt, inclusief OpenAI-logs, Resend-bounces, Sentry-errors met PII, Telegram-logs?
- Termijn: 1 maand (Art. 12 lid 3).

Output: `avg/informatieplicht-en-rechten.md`.

### Fase 5 — DPIA-scoping (Art. 35 AVG)

Een DPIA (Data Protection Impact Assessment) is verplicht bij:
- Grootschalige verwerking van bijzondere persoonsgegevens (VOG telt)
- Systematische monitoring op grote schaal
- Geautomatiseerde besluitvorming met rechtsgevolgen (werving!)

**TopTalent-verwacht:** DPIA vereist voor de AI-screening flow. LEGAL_REVIEW_REQUIRED.

Lever een DPIA-scope-voorstel: welke verwerking, welke risico's, welke mitigaties staan al in plaats, welke nog niet.

Output: `avg/dpia-scope.md`.

---

## DELIVERABLES

1. `data/audits/avg-ai-audit-YYYY-MM-DD.md` — hoofdrapport met executive summary, actielijst, LEGAL_REVIEW_REQUIRED-lijst voor jurist.
2. `data/audits/avg/data-inventaris.md`
3. `data/audits/avg/verwerkers-register.md`
4. `data/audits/avg/ai-act-classificatie.md`
5. `data/audits/avg/informatieplicht-en-rechten.md`
6. `data/audits/avg/dpia-scope.md`

---

## RAPPORTAGESTIJL

- Elke juridische conclusie krijgt `LEGAL_REVIEW_REQUIRED`.
- Severity: CRITICAL (boetekans hoog) / HIGH / MEDIUM / LOW.
- Actielijst: "Regel DPA met OpenAI" is concreter dan "verbeter verwerkersbeleid".
- Geen geruststelling zonder bewijs. Als DPA niet gevonden: "DPA status onbekend — aanvragen bij verwerker".

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/` aangeraakt.
- One-pager met TOP-3 juridische risico's, TOP-3 quick wins (cookie-banner, privacy-tekst updates), TOP-3 vragen voor jurist.

---

## APPENDIX — BESTANDEN & BRONNEN

**Code lezen:**
- `src/lib/agents/kandidaat-screening/*`
- Alle overige `src/lib/agents/*` (zijn er meer AI-flows?)
- `src/app/api/inschrijven/route.ts`
- `src/app/api/personeel-aanvragen/route.ts`
- `src/lib/resend.ts` of equivalent
- `src/lib/telegram.ts`
- `src/lib/mollie.ts` of `src/app/api/mollie/*`
- `src/app/privacy*` / `src/app/voorwaarden*`
- Cookie-banner component (zoek: `cookie`, `consent`)

**Externe bronnen:**
- AVG volledig: https://eur-lex.europa.eu/eli/reg/2016/679
- EU AI-Act: https://eur-lex.europa.eu/eli/reg/2024/1689
- Autoriteit Persoonsgegevens (NL): https://autoriteitpersoonsgegevens.nl
- Supabase DPA: https://supabase.com/legal/dpa
- OpenAI DPA: https://openai.com/policies/data-processing-addendum
- Resend DPA: https://resend.com/legal/dpa

---

## BEGIN

1. Start met data-inventaris (Fase 1). Pauzeer en lever tussenresultaat.
2. Daarna verwerker-register. Pauzeer weer.
3. Dan AI-Act classificatie — met de code-analyse van de screening-agent als basis.
4. Pas daarna informatieplicht + DPIA-scope.
