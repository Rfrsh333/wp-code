# European Accessibility Act (EAA) — Scope Analyse TopTalent

**Datum:** 22 april 2026
**Regelgeving:** Richtlijn (EU) 2019/882 — European Accessibility Act
**Ingangsdatum:** 28 juni 2025

---

## Wat is de EAA?

De European Accessibility Act (EAA) is een EU-richtlijn die eist dat bepaalde producten en diensten toegankelijk zijn voor mensen met een beperking. De richtlijn is in Nederland geimplementeerd via de Wet implementatie richtlijn toegankelijkheidseisen producten en diensten.

---

## Valt TopTalent onder de EAA?

### Analyse

TopTalent B.V. biedt online diensten aan waarbij:
- **Overeenkomsten worden gesloten** (uitzendovereenkomsten, bemiddelingsovereenkomsten)
- **Kandidaten zich inschrijven** via een online formulier
- **Opdrachtgevers personeel aanvragen** via een online wizard
- **Betalingen/kosten berekend worden** via een online calculator

Dit valt waarschijnlijk onder **"e-commerce diensten"** in de zin van de EAA, specifiek:
- Diensten die op afstand worden verleend via elektronische weg
- Diensten waarbij consumenten overeenkomsten aangaan

### Conclusie

**TopTalent valt waarschijnlijk onder de reikwijdte van de EAA.**

---

## Micro-onderneming Uitzondering

De EAA bevat een **uitzondering voor micro-ondernemingen** die diensten verlenen:

> Micro-onderneming: minder dan 10 werknemers EN minder dan EUR 2 miljoen jaaromzet of balanstotaal.

### TopTalent beoordeling

| Criterium | Status | Toelichting |
|-----------|--------|-------------|
| < 10 werknemers (intern) | ONBEKEND | Het interne team van TopTalent is mogelijk klein |
| Uitzendkrachten meetellen? | JURIDISCH ONDUIDELIJK | Uitzendkrachten staan formeel op payroll van TopTalent. Afhankelijk van interpretatie kunnen zij meetellen voor het werknemerscriterium. |
| < EUR 2M jaaromzet | ONBEKEND | Niet geverifieerd |

**ACTIE VEREIST:** Verifieer bij de Kamer van Koophandel (KvK) of TopTalent B.V. kwalificeert als micro-onderneming. Let specifiek op:
1. Aantal werknemers inclusief uitzendkrachten
2. Jaaromzet (laatst gedeponeerde jaarrekening)
3. Balanstotaal

---

## Welke eisen gelden er?

Als de EAA van toepassing is, moet de website voldoen aan:

### Technische standaard: EN 301 549

EN 301 549 is de Europese norm voor digitale toegankelijkheid, gebaseerd op **WCAG 2.1 niveau AA**. Specifiek:

| Eis | EN 301 549 sectie | WCAG equivalent | Status TopTalent |
|----|-------------------|-----------------|-----------------|
| Perceivable content | 9.1 | WCAG 1.x | **FAIL** — Contrast, labels |
| Operable interface | 9.2 | WCAG 2.x | **FAIL** — Keyboard, focus |
| Understandable content | 9.3 | WCAG 3.x | **FAIL** — Error handling, taal |
| Robust markup | 9.4 | WCAG 4.x | **FAIL** — ARIA, naam/rol/waarde |

### Specifieke formulier-eisen

De EAA stelt extra eisen aan **formulieren waarmee overeenkomsten worden gesloten**:
- Formulieren moeten volledig keyboard-toegankelijk zijn
- Formulieren moeten compatible zijn met screen readers
- Foutmeldingen moeten waarneembaar en begrijpelijk zijn
- Verplichte velden moeten duidelijk gemarkeerd zijn

**TopTalent status:** NIET VOLDAAN — Zie `keyboard-nav.md` en `screenreader-tests.md` voor details.

---

## Handhaving en sancties

| Aspect | Details |
|--------|---------|
| Toezichthouder | Nog aan te wijzen door Nederland (verwacht: Autoriteit Consument & Markt of equivalent) |
| Klachtrecht | Consumenten kunnen klachten indienen |
| Sancties | Boetes en/of gebod tot aanpassing |
| Discriminatie | Los van de EAA kunnen kandidaten met een beperking een discriminatieklacht indienen als zij de inschrijfformulieren niet kunnen gebruiken |

---

## Advies

### Ongeacht micro-onderneming status:

1. **De gevonden BLOCKER en SERIOUS issues moeten gefixed worden.** De inschrijf- en aanvraagformulieren zijn onbruikbaar voor screen reader gebruikers. Dit is een directe belemmering voor kandidaten met een visuele beperking.

2. **Discriminatierisico:** Zelfs als TopTalent als micro-onderneming kwalificeert en daarmee vrijgesteld is van de EAA, geldt de Wet gelijke behandeling op grond van handicap of chronische ziekte (Wgbh/cz) onverkort. Ontoegankelijke formulieren kunnen als indirecte discriminatie worden beschouwd.

3. **Best practice:** WCAG 2.1 AA compliance is de industriestandaard en wordt door steeds meer opdrachtgevers als eis gesteld in aanbestedingen.

### Aanbevolen actieplan

| Prioriteit | Actie | Deadline |
|------------|-------|----------|
| 1 (BLOCKER) | Form labels koppelen, aria-attributes toevoegen | 2 weken |
| 2 (SERIOUS) | Kleurcontrast herstellen, keyboard navigatie fixen | 4 weken |
| 3 (MODERATE) | Cookie consent WCAG-compliant maken, heading structuur | 6 weken |
| 4 (VERIFIEER) | KvK check micro-onderneming status | 1 week |

---

## Referenties

- Richtlijn (EU) 2019/882 — European Accessibility Act
- EN 301 549 v3.2.1 — Accessibility requirements for ICT products and services
- WCAG 2.1 — Web Content Accessibility Guidelines
- Wet implementatie richtlijn toegankelijkheidseisen producten en diensten
- Wet gelijke behandeling op grond van handicap of chronische ziekte (Wgbh/cz)
