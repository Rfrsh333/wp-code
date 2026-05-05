# Geautomatiseerde Scans — WCAG 2.1 AA Audit TopTalent

**Datum:** 22 april 2026
**Tools:** axe-core 4.x, Pa11y 6.x

---

## Axe-core Resultaten

### Homepage (`/`)

**7 violations** (2 critical, 4 serious, 1 moderate)

| Regel | Ernst | Instances | WCAG SC | Omschrijving |
|-------|-------|-----------|---------|-------------|
| `button-name` | Critical | 4 | 4.1.2 | Knoppen zonder accessible name (carousel navigatie) |
| `label` | Critical | 1 | 1.3.1, 4.1.2 | `<textarea>` zonder label |
| `color-contrast` | Serious | 37 | 1.4.3 | Onvoldoende kleurcontrast |
| `aria-command-name` | Serious | 2 | 4.1.2 | ARIA command elementen zonder accessible name |
| `scrollable-region-focusable` | Serious | 1 | 2.1.1 | Scrollbaar gebied niet focusbaar via keyboard |
| `heading-order` | Moderate | 3 | 1.3.1 | Heading-niveau's overgeslagen |
| `page-has-heading-one` | Moderate | 1 | 1.3.1 | Pagina mist `<h1>` element |

### /inschrijven

**0 violations** — 27 passes

### /personeel-aanvragen

**0 violations** — 27 passes

### /contact

**3 violations**

| Regel | Ernst | Instances | WCAG SC | Omschrijving |
|-------|-------|-----------|---------|-------------|
| `color-contrast` | Serious | 6 | 1.4.3 | Onvoldoende kleurcontrast |
| `scrollable-region-focusable` | Serious | 1 | 2.1.1 | Scrollbaar gebied niet focusbaar |
| `heading-order` | Moderate | 1 | 1.3.1 | Heading-niveau's overgeslagen |

### /kosten-calculator

**0 violations** — 27 passes

### /privacy

**0 violations** — 27 passes

### /voorwaarden

**0 violations** — 27 passes

### /diensten

**3 violations**

| Regel | Ernst | Instances | WCAG SC | Omschrijving |
|-------|-------|-----------|---------|-------------|
| `aria-command-name` | Serious | 2 | 4.1.2 | ARIA command elementen zonder naam |
| `color-contrast` | Serious | 16 | 1.4.3 | Onvoldoende kleurcontrast |
| `scrollable-region-focusable` | Serious | 1 | 2.1.1 | Scrollbaar gebied niet focusbaar |

### /over-ons

**2 violations**

| Regel | Ernst | Instances | WCAG SC | Omschrijving |
|-------|-------|-----------|---------|-------------|
| `color-contrast` | Serious | 5 | 1.4.3 | Onvoldoende kleurcontrast |
| `scrollable-region-focusable` | Serious | 1 | 2.1.1 | Scrollbaar gebied niet focusbaar |

### /veelgestelde-vragen

**0 violations** — 27 passes

---

## Axe-core Samenvatting

| Pagina | Critical | Serious | Moderate | Totaal |
|--------|----------|---------|----------|--------|
| Homepage | 2 | 4 | 1 | **7** |
| /inschrijven | 0 | 0 | 0 | **0** |
| /personeel-aanvragen | 0 | 0 | 0 | **0** |
| /contact | 0 | 2 | 1 | **3** |
| /kosten-calculator | 0 | 0 | 0 | **0** |
| /privacy | 0 | 0 | 0 | **0** |
| /voorwaarden | 0 | 0 | 0 | **0** |
| /diensten | 0 | 3 | 0 | **3** |
| /over-ons | 0 | 2 | 0 | **2** |
| /veelgestelde-vragen | 0 | 0 | 0 | **0** |
| **Totaal** | **2** | **11** | **2** | **15** |

---

## Pa11y Resultaten

### Homepage (`/`)

**85 issues**

| Type | Aantal | WCAG SC | Omschrijving |
|------|--------|---------|-------------|
| color-contrast | 67 | 1.4.3 | Tekst met onvoldoende contrast |
| button-name | 5 | 4.1.2 | Knoppen zonder accessible name |
| fieldset-name | 6 | 1.3.1 | Fieldsets zonder legend |
| legend | 6 | 1.3.1 | Ontbrekende of lege legend elementen |
| overig | 1 | — | Overige issues |

### /inschrijven

**2 issues**

| Type | Aantal | WCAG SC | Omschrijving |
|------|--------|---------|-------------|
| color-contrast | 2 | 1.4.3 | Tekst met onvoldoende contrast |

### /personeel-aanvragen

**2 issues**

| Type | Aantal | WCAG SC | Omschrijving |
|------|--------|---------|-------------|
| color-contrast | 2 | 1.4.3 | Tekst met onvoldoende contrast |

### /contact

**20 issues**

| Type | Aantal | WCAG SC | Omschrijving |
|------|--------|---------|-------------|
| color-contrast | 8 | 1.4.3 | Tekst met onvoldoende contrast |
| fieldset-name | 6 | 1.3.1 | Fieldsets zonder naam |
| legend | 6 | 1.3.1 | Ontbrekende legend elementen |

### /kosten-calculator

**2 issues**

| Type | Aantal | WCAG SC | Omschrijving |
|------|--------|---------|-------------|
| color-contrast | 2 | 1.4.3 | Tekst met onvoldoende contrast |

---

## Pa11y Samenvatting

| Pagina | Issues |
|--------|--------|
| Homepage | **85** |
| /inschrijven | **2** |
| /personeel-aanvragen | **2** |
| /contact | **20** |
| /kosten-calculator | **2** |
| **Totaal** | **111** |

---

## Tooling Beperkingen

Geautomatiseerde tools detecteren slechts **30-40%** van alle WCAG-issues. De volgende categorieën worden NIET gedetecteerd door axe/Pa11y:

- Label-associatie via wrapping (alleen `htmlFor`/`id` wordt gecontroleerd)
- `aria-pressed` op toggle buttons
- Focus management bij stap-wisseling in wizards
- Keyboard-navigatie van custom dropdown menu's
- Focus trap in modale dialogen (cookie consent)
- Bruikbaarheid van focus indicators (alleen aanwezigheid, niet zichtbaarheid)

Deze issues zijn handmatig getest en gerapporteerd in `keyboard-nav.md` en `screenreader-tests.md`.
