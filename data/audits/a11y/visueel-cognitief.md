# Visueel & Cognitief — WCAG 2.1 AA Audit TopTalent

**Datum:** 22 april 2026
**Methode:** Code-analyse, geautomatiseerde contrastratio-berekeningen

---

## Kleurcontrast (WCAG 1.4.3 — Minimum Contrast)

### Resultaat: FAIL

**67+ contrastfouten** op de homepage alleen. Doorlopend probleem op meerdere pagina's.

### Veelvoorkomende patronen

| CSS Klasse | Hex | Achtergrond | Ratio | Vereist | Resultaat |
|-----------|-----|------------|-------|---------|-----------|
| `text-neutral-400` | #a3a3a3 | #ffffff (wit) | 2.57:1 | 4.5:1 | **FAIL** |
| `text-neutral-500` | #737373 | #fafafa (neutral-50) | 4.39:1 | 4.5:1 (normaal) | **FAIL** |
| `text-neutral-500` | #737373 | #ffffff (wit) | 4.48:1 | 4.5:1 (normaal) | **FAIL** (net onder grens) |
| Teller-nummers | — | — | 1.15:1 | 4.5:1 | **FAIL** (extreem laag) |
| Oranje merk (#F27501) | #F27501 | #ffffff (wit) | ~3.2:1 | 4.5:1 (normaal) | **FAIL** voor normaal tekst |
| Oranje merk (#F27501) | #F27501 | #ffffff (wit) | ~3.2:1 | 3.0:1 (groot) | **PASS** voor groot tekst (>=18pt/24px) |

### Per pagina

| Pagina | Contrast-issues (axe) | Contrast-issues (Pa11y) |
|--------|----------------------|------------------------|
| Homepage | 37 | 67 |
| /inschrijven | 0 | 2 |
| /personeel-aanvragen | 0 | 2 |
| /contact | 6 | 8 |
| /kosten-calculator | 0 | 2 |
| /diensten | 16 | N/A |
| /over-ons | 5 | N/A |

### Aanbevolen oplossingen

| Huidig | Vervangen door | Nieuw ratio | Resultaat |
|--------|---------------|-------------|-----------|
| `text-neutral-400` | `text-neutral-600` (#525252) | 7.45:1 | PASS |
| `text-neutral-500` | `text-neutral-600` (#525252) | 7.45:1 | PASS |
| `#F27501` (normaal tekst) | `#c45e00` (donkerder oranje) | ~4.6:1 | PASS |

---

## Gebruik van Kleur Alleen (WCAG 1.4.1 — Use of Color)

### Resultaat: PARTIAL

| Element | Resultaat | Toelichting |
|---------|-----------|-------------|
| Foutmeldingen | PASS | Rode rand EN rode tekst — dubbele indicator |
| ToggleGroup selectiestatus | PASS | Achtergrondkleur verandert — voldoende differentiatie |
| Verplichte velden (asterisk) | **FAIL** | Alleen oranje asterisk (*) zonder tekst-alternatief. Kleurenblinde gebruikers herkennen de oranje kleur mogelijk niet als "verplicht". |

---

## Focus Zichtbaarheid (WCAG 2.4.7 — Focus Visible, 2.4.11 — Focus Appearance)

### Resultaat: FAIL

| Element | Resultaat | WCAG SC | Toelichting |
|---------|-----------|---------|-------------|
| Formulier inputs | **FAIL** | 2.4.7, 2.4.11 | Alle inputs gebruiken `focus:outline-none` wat de standaard browser focus indicator verwijdert. Ter vervanging wordt `ring-4 ring-[#F27501]/10` toegepast — een oranje ring op slechts 10% opacity. Dit is onvoldoende contrast voor focus indicator (2.4.11 vereist 3:1). |
| Skip link | PASS | 2.4.7 | Wordt zichtbaar bij focus |
| Navigatie links | **FAIL** | 2.4.7 | Alleen kleurverandering als focus indicator — geen duidelijke outline of ring |
| Knoppen | **FAIL** | 2.4.7 | Zelfde patroon als inputs — te zwakke focus ring |

### Aanbevolen fix

```css
/* Vervang */
focus:outline-none focus:ring-4 focus:ring-[#F27501]/10

/* Door */
focus:outline-2 focus:outline-offset-2 focus:outline-[#F27501]
```

---

## Herschalen / Zoom (WCAG 1.4.4 — Resize Text)

### Resultaat: PASS

| Test | Resultaat | Toelichting |
|------|-----------|-------------|
| 200% zoom | PASS | Tailwind responsive classes en `max-w` containers schalen correct |
| Tekst-only zoom | PASS | Relatieve eenheden (`rem`, responsive classes) worden gebruikt |
| Horizontaal scrollen bij 320px | PASS | Responsive grid past zich aan |

---

## Beweging en Animatie (WCAG 2.3.1 — Three Flashes, 2.3.3 — Animation from Interactions)

### Resultaat: FAIL

| Element | Resultaat | WCAG SC | Toelichting |
|---------|-----------|---------|-------------|
| ClickSparkWrapper | **FAIL** | 2.3.3 | Klik-animaties zonder `prefers-reduced-motion` check |
| GradientBackground | **FAIL** | 2.3.3 | Geanimeerde achtergrond zonder `prefers-reduced-motion` check |
| Dynamisch laden (SSR: false) | PARTIAL | — | Componenten laden via `dynamic({ ssr: false })` — blokkeren niet initial render, maar animatie draait zonder motion-preference check |

### Aanbevolen fix

```tsx
// In GradientBackground en ClickSparkWrapper:
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) return null; // of statische versie
```

Of via CSS:

```css
@media (prefers-reduced-motion: reduce) {
  .gradient-bg, .click-spark { animation: none !important; }
}
```

---

## Taal (WCAG 3.1.1 — Language of Page, 3.1.2 — Language of Parts)

### Resultaat: PARTIAL

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| `lang="nl"` op `<html>` | PASS | 3.1.1 | Correct ingesteld in layout.tsx |
| Engelse termen gemarkeerd | **FAIL** | 3.1.2 | Woorden als "FAQ", "Login", "Host(ess)", "Event staff" missen `lang="en"` attribuut. Screen readers spreken deze uit met Nederlandse uitspraak. |

### Aanbevolen fix

```tsx
<span lang="en">FAQ</span>
<span lang="en">Host(ess)</span>
<span lang="en">Event staff</span>
```

---

## Formulieren — Cognitieve Belasting (WCAG 3.3.2 — Labels or Instructions)

### Resultaat: PARTIAL

| Test | Resultaat | WCAG SC | Toelichting |
|------|-----------|---------|-------------|
| Stap-beschrijvingen | PASS | 3.3.2 | Elke stap heeft duidelijke uitleg |
| Label-positie | PASS | 3.3.2 | Labels boven invoervelden (niet eronder) |
| Foutmeldingen beschrijvend | PARTIAL | 3.3.1 | Meeste meldingen zijn duidelijk, sommige kunnen specifieker |
| Verplichte velden gemarkeerd | **FAIL** | 3.3.2 | Alleen visueel (oranje asterisk) — niet voor screen readers |

---

## Samenvatting

| WCAG SC | Criterium | Resultaat |
|---------|-----------|-----------|
| 1.4.1 | Use of Color | PARTIAL |
| 1.4.3 | Contrast (Minimum) | **FAIL** — 67+ instances |
| 1.4.4 | Resize Text | PASS |
| 2.3.1 | Three Flashes | PASS (geen flitsen) |
| 2.3.3 | Animation from Interactions | **FAIL** |
| 2.4.7 | Focus Visible | **FAIL** |
| 2.4.11 | Focus Appearance | **FAIL** |
| 3.1.1 | Language of Page | PASS |
| 3.1.2 | Language of Parts | **FAIL** |
| 3.3.2 | Labels or Instructions | PARTIAL |
