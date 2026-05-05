# Keyboard Navigatie Audit — WCAG 2.1 AA TopTalent

**Datum:** 22 april 2026
**Methode:** Code-analyse van broncomponenten
**Geanalyseerde componenten:** PublicShell.tsx, Header.tsx, InschrijfFormulier.tsx, PersoneelAanvragenWizard.tsx, CookieConsent.tsx

---

## Skip Link (WCAG 2.4.1)

| Test | Resultaat | Toelichting |
|------|-----------|-------------|
| Skip link aanwezig | PASS | "Ga naar inhoud" skip link in PublicShell.tsx |
| Verborgen tot focus | PASS | Gebruikt `sr-only` met `focus:not-sr-only` |
| Linkt naar main content | PASS | Target is `#main-content` |
| Eerste focusbaar element | PASS | Skip link is eerste element in DOM |

---

## Header Navigatie (WCAG 2.1.1, 4.1.2)

### Desktop navigatie

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Nav links focusbaar | PASS | 2.1.1 | Alle links zijn `<Link>` (anchor) elementen |
| Diensten dropdown keyboard | **FAIL** | 2.1.1 | Dropdown is CSS-only (`group-hover`). Geen keyboard event handlers (Enter/Space/Arrow). Dropdown items onbereikbaar via keyboard. |
| `aria-expanded` op dropdown trigger | **FAIL** | 4.1.2 | Ontbreekt volledig |
| `aria-haspopup` op dropdown trigger | **FAIL** | 4.1.2 | Ontbreekt volledig |
| Social links aria-labels | PASS | 4.1.2 | Correcte aria-labels aanwezig |

### Mobiele navigatie

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Menu button aria-label | PASS | 4.1.2 | `aria-label="Menu"` aanwezig |
| Menu button aria-expanded | **FAIL** | 4.1.2 | Geen `aria-expanded` om open/dicht status aan te geven |
| Diensten sub-menu aria-expanded | **FAIL** | 4.1.2 | Sub-menu toggle mist `aria-expanded` |
| Focus trap in mobiel menu | **FAIL** | 2.1.2 | Geen focus trap — gebruiker kan uit menu tabben |

---

## InschrijfFormulier (WCAG 1.3.1, 2.1.1, 3.3.1, 4.1.2)

### FormInput component

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Label gekoppeld aan input | **FAIL** | 1.3.1, 4.1.2 | `<label>` bevat tekst maar `<input>` zit in een sibling `<div>`. Geen `htmlFor`/`id` koppeling. Screen readers melden "edit text" zonder labelnaam. |
| `aria-required` op verplichte velden | **FAIL** | 1.3.1 | Ontbreekt. Verplichte indicator is alleen visueel (oranje asterisk). |
| `aria-invalid` bij fouten | **FAIL** | 3.3.1 | Ontbreekt volledig. |
| `aria-describedby` naar foutmelding | **FAIL** | 3.3.1 | Ontbreekt. Foutmeldingen niet programmatisch gekoppeld. |
| Foutmelding `aria-live` | **FAIL** | 4.1.3 | Geen `aria-live` of `role="alert"`. Fouten niet aangekondigd. |

### FormSelect component

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Label gekoppeld aan select | **FAIL** | 1.3.1, 4.1.2 | Zelfde probleem als FormInput — geen `htmlFor`/`id`. |

### FormTextarea component

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Label gekoppeld aan textarea | **FAIL** | 1.3.1, 4.1.2 | Zelfde probleem als FormInput — geen `htmlFor`/`id`. |

### ToggleGroup component

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Buttons focusbaar | PASS | 2.1.1 | Zijn `<button>` elementen |
| `aria-pressed` voor selectiestatus | **FAIL** | 4.1.2 | Ontbreekt. Screen readers kunnen niet detecteren of een optie geselecteerd is. |

### Multi-step navigatie

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Stap-knoppen zijn buttons | PASS | 2.1.1 | `<button type="button">` correct gebruikt |
| Focus management bij stap-wissel | **FAIL** | 3.2.2 | Bij klik op "Volgende" blijft focus op vorige positie. Nieuwe stap-content is niet gefocust. |

### Checkbox (toestemming)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Checkbox keyboard-toegankelijk | PASS | 2.1.1 | `sr-only` input is focusbaar |
| Label associatie | PASS | 1.3.1 | Wrapping `<label>` correct |

---

## PersoneelAanvragenWizard (WCAG 1.3.1, 2.1.1, 4.1.2)

Gebruikt dezelfde FormInput/FormSelect/FormTextarea componenten als InschrijfFormulier. Alle bovenstaande FAIL-resultaten zijn identiek van toepassing:

- **FAIL:** Label-associatie ontbreekt (1.3.1, 4.1.2)
- **FAIL:** `aria-required` ontbreekt (1.3.1)
- **FAIL:** `aria-invalid` ontbreekt (3.3.1)
- **FAIL:** `aria-describedby` ontbreekt (3.3.1)
- **FAIL:** Foutmeldingen niet announced (4.1.3)
- **FAIL:** Focus management bij stap-wissel ontbreekt (3.2.2)

---

## CookieConsent (WCAG 2.4.3, 4.1.2)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Buttons zijn `<button>` elementen | PASS | 2.1.1 | Correcte semantiek |
| Buttons hebben duidelijke tekst | PASS | 4.1.2 | "Accepteren", "Weigeren" etc. |
| `role="dialog"` | **FAIL** | 4.1.2 | Ontbreekt. Banner is niet als dialog gemarkeerd. |
| `aria-label` op banner | **FAIL** | 4.1.2 | Ontbreekt. |
| Focus verplaatst naar banner | **FAIL** | 2.4.3 | Focus blijft op pagina-content. Keyboard-gebruikers merken banner mogelijk niet op. |
| Focus trap in banner | **FAIL** | 2.4.3 | Geen focus trap. Gebruikers kunnen voorbij de banner tabben zonder interactie. |

---

## Contact pagina FAQ (WCAG 2.1.1)

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Scrollbaar FAQ-gebied focusbaar | **FAIL** | 2.1.1 | Axe meldt `scrollable-region-focusable` — FAQ accordion niet keyboard-toegankelijk |

---

## Samenvatting

| Component | PASS | FAIL | Totaal tests |
|-----------|------|------|-------------|
| Skip link | 4 | 0 | 4 |
| Header desktop | 2 | 3 | 5 |
| Header mobiel | 1 | 3 | 4 |
| InschrijfFormulier | 3 | 8 | 11 |
| PersoneelAanvragenWizard | 0 | 6 | 6 |
| CookieConsent | 2 | 4 | 6 |
| Contact FAQ | 0 | 1 | 1 |
| **Totaal** | **12** | **25** | **37** |

**Keyboard navigatie slaagpercentage: 32%** — Er zijn 25 van 37 tests gefaald.
