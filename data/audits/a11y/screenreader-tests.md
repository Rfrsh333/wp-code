# Screen Reader Tests — WCAG 2.1 AA Audit TopTalent

**Datum:** 22 april 2026
**Methode:** Code-analyse van broncomponenten (VoiceOver compatibiliteit)
**Focus:** Hoe screen readers de site-structuur en interactieve elementen interpreteren

---

## Paginatitel (WCAG 2.4.2)

| Pagina | Resultaat | Toelichting |
|--------|-----------|-------------|
| Alle pagina's | PASS | Metadata per pagina ingesteld via Next.js `export const metadata`. Unieke titels per pagina. |

---

## Landmarks (WCAG 1.3.1)

| Landmark | Element | Component | Resultaat | Toelichting |
|----------|---------|-----------|-----------|-------------|
| banner | `<header>` | Header.tsx | PASS | Correct aanwezig |
| main | `<main id="main-content">` | PublicShell.tsx | PASS | Correct aanwezig met id voor skip link |
| contentinfo | `<footer>` | Footer.tsx | PASS | Correct aanwezig |
| navigation | `<nav>` (desktop) | Header.tsx | PASS | Aanwezig |
| navigation | `<nav>` (mobiel) | Header.tsx | PASS | Aanwezig |
| Nav labels | `aria-label` op `<nav>` | Header.tsx | **FAIL** (1.3.1) | Geen `aria-label` om desktop- en mobiele navigatie te onderscheiden. Screen readers melden twee keer "navigation" zonder onderscheid. |

---

## Headings (WCAG 1.3.1, 2.4.6)

### Homepage

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| `<h1>` aanwezig | **FAIL** | 1.3.1 | Geen `<h1>` op homepage. Axe meldt `page-has-heading-one`. Hero-titel wordt waarschijnlijk geladen via dynamisch component. |
| Heading-volgorde | **FAIL** | 1.3.1 | Heading levels overgeslagen (h2 naar h6). Axe meldt `heading-order` met 3 instances. |

### /contact

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Heading-volgorde | **FAIL** | 1.3.1 | Heading-volgorde verstoord (axe: heading-order). |

### Overige pagina's

| Test | Resultaat | Toelichting |
|------|-----------|-------------|
| Heading-structuur | PASS | Correcte heading-hierarchie op formulierpagina's, privacy, voorwaarden, FAQ |

---

## Formulier Labels (WCAG 1.3.1, 4.1.2)

### InschrijfFormulier / PersoneelAanvragenWizard

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Labels programmatisch gekoppeld | **FAIL** | 1.3.1, 4.1.2 | `<label>` bevat tekst maar `<input>` zit in sibling `<div>`. Geen `htmlFor`/`id` koppeling. Screen reader meldt label als losstaand tekstelement en input als "edit text" zonder context. |
| Groepering van gerelateerde velden | PASS | 1.3.1 | Stappen bieden logische groepering |

### Homepage

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Textarea label | **FAIL** | 1.3.1, 4.1.2 | Minstens 1 `<textarea>` zonder enig label. Axe critical: `label`. |

---

## Verplichte Velden (WCAG 1.3.1, 3.3.2)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| `aria-required="true"` | **FAIL** | 1.3.1 | Ontbreekt op alle verplichte velden |
| Visuele indicator | PASS | 3.3.2 | Oranje asterisk (*) aanwezig |
| SR-only tekst "(verplicht)" | **FAIL** | 1.3.1 | Ontbreekt. Screen readers lezen alleen de asterisk (als die al gelezen wordt), wat geen betekenis heeft. |

---

## Foutmeldingen (WCAG 3.3.1, 4.1.3)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| `role="alert"` of `aria-live` | **FAIL** | 4.1.3 | Ontbreekt. Dynamische foutmeldingen worden niet aangekondigd door screen readers. |
| `aria-describedby` koppeling | **FAIL** | 3.3.1 | Ontbreekt. Foutmelding niet programmatisch gekoppeld aan bijbehorend invoerveld. |
| `aria-invalid="true"` | **FAIL** | 3.3.1 | Ontbreekt. Invoervelden worden niet als ongeldig gemarkeerd. |
| Foutmelding beschrijvend | PASS | 3.3.1 | Foutmeldingen bevatten begrijpelijke tekst. |

---

## Knoppen vs Links (WCAG 4.1.2)

| Test | Resultaat | Toelichting |
|------|-----------|-------------|
| Semantisch correct gebruik | PASS | Links (`<Link>`) voor navigatie, `<button>` voor acties. Correct toegepast. |
| Knoptekst beschrijvend | PASS | "Volgende", "Vorige", "Versturen" — duidelijke labels |

---

## Afbeeldingen (WCAG 1.1.1)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Logo alt-tekst | PASS | 1.1.1 | `alt="TopTalent Jobs"` aanwezig |
| Decoratieve SVG's | PASS | 1.1.1 | Inline SVG's zonder alt text — correct voor decoratieve elementen |
| Informatieve afbeeldingen | PASS | 1.1.1 | Relevante afbeeldingen hebben alt-attributen |

---

## Tabellen (WCAG 1.3.1)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Tabel headers | PASS | 1.3.1 | Privacy pagina tabellen gebruiken `<th>` headers correct |
| Tabel caption/summary | PASS | 1.3.1 | Context duidelijk uit omringende content |

---

## Samenvatting per WCAG Criterium

| WCAG SC | Criterium | Resultaat | Aangetroffen issues |
|---------|-----------|-----------|-------------------|
| 1.1.1 | Non-text Content | PASS | — |
| 1.3.1 | Info and Relationships | **FAIL** | Labels niet gekoppeld, heading-volgorde, nav labels, required |
| 2.4.2 | Page Titled | PASS | — |
| 2.4.6 | Headings and Labels | **FAIL** | Homepage mist h1, heading levels overgeslagen |
| 3.3.1 | Error Identification | **FAIL** | aria-invalid, aria-describedby ontbreken |
| 3.3.2 | Labels or Instructions | **FAIL** | Required indicator niet voor screen readers |
| 4.1.2 | Name, Role, Value | **FAIL** | Label-associatie, nav aria-labels, textarea label |
| 4.1.3 | Status Messages | **FAIL** | Foutmeldingen niet announced |
