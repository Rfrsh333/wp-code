# DPIA-scope (Art. 35 AVG)
## TopTalent B.V. | Audit 2026-04-22

---

## 1. Is een DPIA verplicht?

### Art. 35 lid 1 — Wanneer verplicht?

> "Wanneer een soort verwerking, in het bijzonder een verwerking waarbij nieuwe technologieën worden gebruikt, gelet op de aard, de omvang, de context en de doeleinden ervan, waarschijnlijk een **hoog risico** inhoudt voor de rechten en vrijheden van natuurlijke personen, voert de verwerkingsverantwoordelijke vóór de verwerking een gegevensbeschermingseffectbeoordeling uit."

### Art. 35 lid 3 — Specifieke gevallen

| Criterium | Toepasselijk? | Toelichting |
|-----------|--------------|-------------|
| **(a)** Systematische en uitgebreide beoordeling van persoonlijke aspecten op basis van geautomatiseerde verwerking, waaronder profilering, waarop besluiten worden gebaseerd die rechtsgevolgen hebben | **JA** | AI-screening beoordeelt kandidaten systematisch; screeningscore beïnvloedt selectie (indirect rechtsgevolg: geen baan) |
| **(b)** Grootschalige verwerking van bijzondere persoonsgegevens of strafrechtelijke gegevens | **MOGELIJK** | ID-kopieën (niet bijzonder, maar gevoelig). VOG niet digitaal gevonden, maar indien verwerkt: ja. `LEGAL_REVIEW_REQUIRED` |
| **(c)** Stelselmatige en grootschalige monitoring van openbaar toegankelijke ruimten | **NEE** | Niet van toepassing |

### AP-lijst (NL) — Verwerkingen waarvoor DPIA verplicht is

De Autoriteit Persoonsgegevens heeft een lijst gepubliceerd van verwerkingen waarvoor een DPIA verplicht is. Relevante categorieën:

| AP-criterium | Toepasselijk? |
|-------------|--------------|
| Heimelijke waarneming of surveillance | Nee |
| Stelselmatig monitoren van activiteiten werknemers | **MOGELIJK** — no-show tracking, streaks, scores, e-mail open/click tracking |
| Geautomatiseerde besluitvorming met significante gevolgen | **JA** — AI-screening beïnvloedt aanname/afwijzing |
| Nieuwe technologieën | **JA** — generatieve AI (OpenAI) in recruitment |
| Profilering | **JA** — AI genereert scores op basis van persoonlijke kenmerken |

### **Conclusie: DPIA is verplicht** `LEGAL_REVIEW_REQUIRED`

**Motivering:**
1. Geautomatiseerde profilering van sollicitanten (Art. 35.3.a)
2. Gebruik van nieuwe technologieën (generatieve AI) in recruitment
3. Verwerking heeft potentieel significante gevolgen voor betrokkenen (wel/niet aangenomen)
4. Combinatie van meerdere AP-criteria (profilering + nieuwe technologie + significante gevolgen)

---

## 2. Scope van de DPIA

### 2.1 Verwerkingen in scope

| # | Verwerking | Betrokkenen | Reden in scope |
|---|-----------|-------------|----------------|
| **1** | **AI-screening van kandidaten** | Sollicitanten | Geautomatiseerde profilering met significante gevolgen |
| **2** | **Doorgifte PII naar OpenAI** | Sollicitanten | Transfer naar VS + nieuwe technologie + profilering |
| **3** | **AI-afgeleide scores opslaan** | Sollicitanten | Resultaten beïnvloeden selectie |
| **4** | **Afwijzing op basis van AI-advies** | Sollicitanten | Significante gevolgen voor betrokkene |
| **5** | **E-mail tracking (open/click)** | Kandidaten, klanten | Stelselmatige monitoring van gedrag |
| **6** | **Lead-scoring met AI** | Contactpersonen bedrijven | Profilering van natuurlijke personen |
| **7** | **PII in Telegram-alerts** | Sollicitanten, leads | Onbeveiligde overdracht |
| **8** | **PII in Sentry (sendDefaultPii)** | Alle gebruikers | Ongecontroleerde PII-verspreiding |
| **9** | **Gamificatie/scoring medewerkers** | Medewerkers | Systematische monitoring/scoring |

### 2.2 Verwerkingen buiten scope (maar monitoren)

| Verwerking | Reden buiten scope |
|-----------|-------------------|
| Salarisadministratie | Standaard verwerking, wettelijke grondslag |
| Contractbeheer | Standaard verwerking, contractuele grondslag |
| Klant-facturatie | Standaard verwerking |
| Websitebezoek (na consent) | Standaard analytics met toestemming |

---

## 3. Risico-inventarisatie (voorlopig)

### 3.1 Risico's voor betrokkenen

| # | Risico | Kans | Impact | Score | Toelichting |
|---|--------|------|--------|-------|-------------|
| R1 | **Discriminatie door AI-bias** | MEDIUM | HOOG | **HOOG** | Leeftijd, woonplaats, taal worden meegewogen. Kan leiden tot indirecte discriminatie op grond van leeftijd, afkomst. |
| R2 | **Onterechte afwijzing** | MEDIUM | HOOG | **HOOG** | AI-score kan onnauwkeurig zijn; kandidaat wordt mogelijk ten onrechte niet geselecteerd |
| R3 | **Gebrek aan transparantie** | HOOG | MEDIUM | **HOOG** | Kandidaat weet niet dat AI is gebruikt; kan geen uitleg vragen of bezwaar maken |
| R4 | **PII-lek via Telegram** | MEDIUM | HOOG | **HOOG** | Naam, email, telefoon in onbeveiligd kanaal zonder DPA |
| R5 | **PII-lek via Sentry** | MEDIUM | MEDIUM | **MEDIUM** | `sendDefaultPii: true` + lokale variabelen in stacktraces |
| R6 | **PII-retentie door OpenAI** | MEDIUM | MEDIUM | **MEDIUM** | Data 30 dagen bewaard bij VS-bedrijf; geen controle over gebruik |
| R7 | **Chilling effect door monitoring** | LAAG | MEDIUM | **LAAG** | E-mail open/click tracking + gamificatie-scores kunnen druk uitoefenen |
| R8 | **Datalekrisico bij verwerkers** | LAAG | HOOG | **MEDIUM** | Meerdere verwerkers zonder geverifieerde DPA's |

### 3.2 Risico's voor de organisatie

| # | Risico | Impact |
|---|--------|--------|
| O1 | Boete AP (max €20M of 4% jaaromzet) | HOOG |
| O2 | Boete AI-Act (max €35M of 7% jaaromzet voor verboden praktijken; max €15M of 3% voor high-risk niet-naleving) | HOOG |
| O3 | Reputatieschade bij datalek | HOOG |
| O4 | Schadeclaims van afgewezen kandidaten (discriminatie) | MEDIUM |

---

## 4. Bestaande mitigerende maatregelen

| Maatregel | Status | Effectiviteit |
|-----------|--------|---------------|
| Admin neemt eindbeslissing (niet AI) | ✅ Aanwezig | Gedeeltelijk — geen formeel proces |
| Rate limiting op API's | ✅ Aanwezig | Goed voor beveiliging |
| Admin-authenticatie vereist | ✅ Aanwezig | Goed |
| Private storage bucket met RLS | ✅ Aanwezig | Goed voor documenten |
| Bcrypt wachtwoord-hashing | ✅ Aanwezig | Goed |
| JWT sessietokens (HttpOnly, Secure) | ✅ Aanwezig | Goed |
| HTML-escaping in e-mails | ✅ Aanwezig | Goed |
| Cookie-consent banner | ✅ Aanwezig | Gedeeltelijk — Vercel Analytics niet gated |
| Audit logging | ✅ Aanwezig | Gedeeltelijk — niet alle acties gelogd |
| Sessie-cleanup cron (30 dagen) | ✅ Aanwezig | Goed |
| Chatbot-cleanup cron (7 dagen) | ✅ Aanwezig | Goed |

---

## 5. Ontbrekende mitigerende maatregelen

| # | Maatregel | Adresseert risico | Prioriteit |
|---|----------|-------------------|------------|
| M1 | **Anonimiseer PII vóór OpenAI-verzending** | R1, R2, R6 | **CRITICAL** |
| M2 | **Verwijder PII uit Telegram-alerts** | R4 | **CRITICAL** |
| M3 | **Zet Sentry `sendDefaultPii: false`** | R5 | **CRITICAL** |
| M4 | **Informeer kandidaten over AI-gebruik** | R3 | **CRITICAL** |
| M5 | **Corrigeer privacyverklaring** | R3 | **CRITICAL** |
| M6 | **Formaliseer menselijk toezicht** | R1, R2 | **HIGH** |
| M7 | **Test AI op discriminatie-bias** | R1 | **HIGH** |
| M8 | **Implementeer data subject request flow** | R3, O1 | **HIGH** |
| M9 | **Verifieer en onderteken alle DPA's** | R8 | **HIGH** |
| M10 | **Documenteer TIA voor VS-transfers** | R6, R8 | **HIGH** |
| M11 | **Implementeer bewaartermijn-automatisering** | O1 | **MEDIUM** |
| M12 | **Sla toestemming op in database** | O1 | **CRITICAL** |
| M13 | **Log AI-prompts en modelversies** | R2 | **MEDIUM** |

---

## 6. Advies voor DPIA-uitvoering

### 6.1 Wie moet betrokken worden?

| Rol | Persoon/partij |
|-----|---------------|
| Verwerkingsverantwoordelijke | TopTalent B.V. (directie) |
| Uitvoerder DPIA | Privacy consultant of interne privacy officer |
| FG (indien aangesteld) | `LEGAL_REVIEW_REQUIRED`: beoordeel of FG verplicht is |
| Juridisch adviseur | Extern jurist (AVG + AI-Act expertise) |
| Technisch verantwoordelijke | Ontwikkelaar(s) van het AI-screening systeem |
| Betrokkenen (optioneel) | Vertegenwoordiger van kandidaten (bijv. via enquête) |

### 6.2 Tijdlijn

| Fase | Activiteit | Doorlooptijd |
|------|-----------|-------------|
| 1 | Goedkeuring scope (dit document) | 1 week |
| 2 | Gedetailleerde beschrijving verwerkingen | 2 weken |
| 3 | Noodzakelijkheids- en proportionaliteitsbeoordeling | 1 week |
| 4 | Risicobeoordeling (uitgebreid) | 2 weken |
| 5 | Mitigerende maatregelen (plan + implementatie) | 4-8 weken |
| 6 | Advies FG (indien van toepassing) | 1 week |
| 7 | Advies betrokkenen (optioneel) | 2 weken |
| 8 | Eindrapport + goedkeuring directie | 1 week |
| **Totaal** | | **12-16 weken** |

### 6.3 Relatie met AI-Act conformiteitsbeoordeling

De DPIA kan gecombineerd worden met de interne conformiteitsbeoordeling onder de AI-Act (Art. 43 + Annex VI). Dit bespaart tijd en voorkomt dubbel werk. **Deadline AI-Act high-risk: 2 augustus 2026.**

---

## 7. Voorlopige proportionaliteitsbeoordeling

| Vraag | Antwoord |
|-------|---------|
| Is de verwerking noodzakelijk voor het doel? | Ja — efficiënte screening is nodig voor uitzendbureau |
| Zijn er minder ingrijpende alternatieven? | Ja — screening zonder AI (handmatig), of AI zonder PII (geanonimiseerd) |
| Is de omvang proportioneel? | Nee — meer data dan nodig wordt naar OpenAI gestuurd (naam, leeftijd niet relevant voor screening) |
| Zijn de bewaartermijnen proportioneel? | Niet gedefinieerd voor AI-data — **GAP** |
| Worden betrokkenen adequaat geïnformeerd? | Nee — kandidaten weten niet dat AI wordt gebruikt |

**Conclusie proportionaliteit:** De huidige implementatie is **niet proportioneel** vanwege het ontbreken van dataminimalisatie (naam/leeftijd naar OpenAI) en transparantie (kandidaat niet geïnformeerd). Met de voorgestelde mitigaties (M1, M4, M5) wordt proportionaliteit substantieel verbeterd.
