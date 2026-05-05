# Fase 3: Horeca-specifieke Checks

**Datum:** 2026-04-22
**Scope:** Alcoholwet, Arbeidstijdenwet (jeugdigen), Arbowet, matching/planning, uren-administratie
**Status:** `LEGAL_REVIEW_REQUIRED`

---

## 1. Alcoholwet / Drank- en Horecawet

### 1a. Verklaring Sociale Hygiene (VSH)

| Check | Status | Detail |
|---|---|---|
| VSH als verplicht document | DEELS | Niet als apart document-type in het systeem. Alleen generieke types: `id`, `cv`, `kvk`, `btw`, `certificaat`, `contract`, `bankbewijs`. "Certificaat" zou VSH kunnen zijn maar is niet expliciet. |
| VSH-vereiste bij matching | ONTBREEKT | `src/lib/matching.ts` matcht op functie, beschikbaarheid, locatie en admin-score. Geen check op VSH-certificering bij "bar" functies. |
| VSH-vermelding in voorwaarden | AANWEZIG | `voorwaarden/page.tsx:80` noemt "Verklaring sociale hygiene" als voorbeeld van relevante certificeringen. |
| VSH in AI-screening | NIET GEVONDEN | `src/lib/agents/kandidaat-screening.ts` controleert op functie, werkervaring, badges, maar niet specifiek op VSH. |

**Risico:** Bij bardiensten in de horeca is een leidinggevende met VSH wettelijk verplicht. Het systeem biedt geen waarborg dat alleen VSH-gecertificeerde medewerkers voor bar/tap-functies worden ingepland.

### 1b. Leeftijdsgrens alcohol schenken

| Check | Status | Detail |
|---|---|---|
| Minimumleeftijd 18 voor alcohol | NIET GEIMPLEMENTEERD | Inschrijving accepteert minimaal 16 jaar (`validations.ts:36`). Geen leeftijdscheck bij toewijzing aan bar/tap-diensten. |
| Leeftijdsvalidatie bij matching | ONTBREEKT | `matching.ts` controleert geen leeftijd bij functie-toewijzing. |

**Risico:** Een 16/17-jarige kan worden ingepland voor bardiensten waar alcohol wordt geschonken. Dit is in strijd met de Alcoholwet.

## 2. Arbeidstijdenwet -- Jeugdigen (16-17 jaar)

### 2a. Werktijdbeperkingen

| Beperking | Wet | Status | Detail |
|---|---|---|---|
| Max 9 uur per dag (16-17 jaar) | Arbeidstijdenwet art. 5:3 | NIET GEIMPLEMENTEERD | Geen leeftijdsafhankelijke urenvalidatie |
| Max 45 uur per week (16-17 jaar) | Arbeidstijdenwet art. 5:3 | NIET GEIMPLEMENTEERD | `max_uren_per_week` is zelf-opgegeven, geen wettelijke cap |
| Nachtwerk verbod < 18 jaar (na 23:00) | Arbeidstijdenwet art. 5:3 | NIET GEIMPLEMENTEERD | Systeem kent nachtdiensten (00:00-06:00) maar controleert geen leeftijd |
| Verplichte pauze > 4,5 uur | Arbeidstijdenwet art. 5:3 | DEELS | `uren_registraties.pauze_minuten` registreert pauze, maar geen automatische validatie |

### 2b. Overzicht leeftijdsvalidatie in systeem

| Component | Leeftijdscheck | Detail |
|---|---|---|
| Inschrijving (`validations.ts:36`) | Min. 16 jaar | "Je moet minimaal 16 jaar oud zijn" |
| Matching (`matching.ts`) | GEEN | Geen leeftijds-factor |
| Dienst-planner AI (`dienst-planner.ts`) | GEEN | Diner diensten tot 23:00, geen leeftijdscheck |
| Uren-goedkeuring (`admin/uren/route.ts`) | GEEN | Nachtdienst-berekening aanwezig maar geen leeftijdsvalidatie |
| DienstenTab (`DienstenTab.tsx:157`) | GEEN | Default eindtijd 23:00, geen leeftijdscheck |

## 3. Arbeidstijdenwet -- Algemeen

### 3a. Pauze-registratie

| Check | Status | Detail |
|---|---|---|
| Pauze-veld in uren | AANWEZIG | `uren_registraties.pauze_minuten` |
| Automatische pauze-validatie (>5,5 uur = min. 30 min pauze) | ONTBREEKT | Geen validatie-logica |
| Wekelijkse rusttijd (11 uur aaneengesloten per 24 uur) | ONTBREEKT | Geen controle |

### 3b. Maximum werktijden

| Check | Status | Detail |
|---|---|---|
| Max 12 uur per dienst | ONTBREEKT | Geen validatie bij uren-registratie of dienst-aanmaak |
| Max 60 uur per week | ONTBREEKT | `max_uren_per_week` is zelf-opgegeven preferentie, geen wettelijke cap |
| Gemiddeld max 48 uur per week over 16 weken | ONTBREEKT | Geen cumulatieve berekening |

## 4. Toeslagen en Onregelmatigheidstoeslag

| Toeslag | Verplicht door | Status | Detail |
|---|---|---|---|
| Avondtoeslag (na 20:00) | ABU-cao / Horeca-cao | ONTBREEKT | Geen toeslagberekening |
| Nachttoeslag (na 00:00) | ABU-cao / Horeca-cao | ONTBREEKT | Nachtdienst wordt herkend maar geen toeslag berekend |
| Weekendtoeslag | ABU-cao / Horeca-cao | ONTBREEKT | Geen check op dag van de week |
| Feestdagtoeslag | ABU-cao / Horeca-cao | ONTBREEKT | Geen feestdagenlijst of -logica |
| Overwerktoeslag | ABU-cao | ONTBREEKT | Geen cumulatieve urencheck |

## 5. CAO-compliance

| Check | Status | Detail |
|---|---|---|
| Toepasselijke CAO bepaald | ONTBREEKT | Geen veld/logica voor cao-keuze (ABU, NBBU, Horeca) |
| Inlenersbeloning berekening | ONTBREEKT | Geen vergelijking medewerker-loon vs. klant-cao |
| ABU-fasensysteem | ONTBREEKT | Geen Fase A/B/C tracking |
| Pensioen (StiPP) aansluiting | ONTBREEKT | Privacypagina noemt StiPP maar geen implementatie |

---

## Bevindingen Samenvatting

| # | Bevinding | Ernst | Type |
|---|---|---|---|
| F3-01 | Geen leeftijdsvalidatie bij bardiensten (Alcoholwet) | KRITIEK | CODE |
| F3-02 | Geen nachtwerk-verbod voor 16-17 jarigen | KRITIEK | CODE |
| F3-03 | VSH-certificering niet gevalideerd bij matching | HOOG | CODE |
| F3-04 | Geen toeslagberekening (avond/nacht/weekend/feestdag) | KRITIEK | CODE+JURIST |
| F3-05 | Geen maximale werktijd-validatie (12u/dag, 60u/week) | HOOG | CODE |
| F3-06 | Geen automatische pauze-validatie | MIDDEL | CODE |
| F3-07 | Geen CAO-keuze of inlenersbeloning-berekening | KRITIEK | JURIST |
| F3-08 | StiPP-pensioen niet geimplementeerd | HOOG | BELEID |

`LEGAL_REVIEW_REQUIRED`
