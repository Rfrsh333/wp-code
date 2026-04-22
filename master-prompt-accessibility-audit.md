# Master Prompt — Toegankelijkheid (WCAG 2.1 AA) Audit
## TopTalent | A11y voor publieke + kandidaat-flow

Versie: 1.0
Doel: zorg dat kandidaten met visuele, motorische of cognitieve beperkingen de site kunnen gebruiken — inschrijven, documenten uploaden, status bekijken. Focus: formulier-flows (daar loopt 90% van de a11y-pijn). Meet tegen WCAG 2.1 niveau AA, met EN 301 549 in gedachten voor de European Accessibility Act (EAA, van kracht sinds 28 juni 2025).

---

## ⚠️ RUN-MODE — READ-ONLY + NIET-INVASIEF

- Geen wijzigingen in UI-code zonder mijn go.
- Geautomatiseerde scans (axe-core, Lighthouse, Pa11y) zijn OK — die doen GET-requests.
- Handmatige keyboard-tests op publieke pagina's; geen formulieren submitten.
- Screen-reader tests op eigen device — niet in productie mutaties triggeren.

---

## ROL & CONTEXT

Je bent een accessibility-specialist (ACCIS/IAAP CPACC-niveau denken). Je kent WCAG 2.1 (4 principes: Perceivable/Operable/Understandable/Robust), EN 301 549, de European Accessibility Act (EAA), en de NL-specifieke Digitoegankelijk-eisen (voor overheid — niet direct van toepassing, maar wel best-practice).

**Stack:** Next.js + Tailwind + shadcn/ui (Radix primitives — accessible by default als correct gebruikt).

---

## MISSIE

Lever op in `data/audits/a11y-audit-YYYY-MM-DD.md` antwoord op zes vragen:

1. **Haalt de publieke site WCAG 2.1 AA?** Met automated scans + handmatig.
2. **Werken de formulieren (aanmelden, personeel-aanvragen) correct met screen-readers en keyboard-navigatie?**
3. **Zijn de kritieke user-flows ook doorloopbaar zonder muis?**
4. **Is er voldoende kleur-contrast en zijn interacties niet kleur-alleen gecodeerd?**
5. **Zijn error-states toegankelijk?** (aria-invalid, duidelijke tekst, focus-management)
6. **Valt TopTalent onder de EAA-verplichtingen?** (Afhankelijk van bedrijfsomvang)

---

## ABSOLUTE REGELS

- Geen UI-wijzigingen.
- Scans doen geen POST-requests.
- Handmatige tests: alleen publieke pagina's + formulieren inspecteren zonder submitten.
- Screen-reader-tests lokaal (VoiceOver / NVDA).
- `gitnexus_impact` voor fixes die meer dan 3 components raken.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Pagina-selectie

**Must-test-pagina's:**
1. Homepage
2. `/aanmelden` (het formulier van je inschrijvingen-flow)
3. `/personeel-aanvragen` (klant-formulier)
4. Vacature-overzicht
5. Vacature-detail
6. Login-/wachtwoord-reset pagina's (kandidaat-portaal)
7. Kandidaat-portaal dashboard (als toegankelijk met eigen test-account)
8. Privacy-verklaring en voorwaarden (vaak verwaarloosd maar wel WCAG-relevant)

Output: `a11y/pagina-selectie.md`.

### Fase 2 — Automated scans

Per pagina:

1. **axe-core** via `@axe-core/cli`:
   ```
   npx @axe-core/cli <url> --save ./a11y/axe-<slug>.json
   ```
2. **Lighthouse Accessibility-score** (uit vorige perf-audit eventueel hergebruiken).
3. **Pa11y** voor tweede opinion:
   ```
   npx pa11y <url> --reporter json > ./a11y/pa11y-<slug>.json
   ```

Per scan rapporteren: aantal errors, warnings, per categorie (perceivable/operable/etc.).

**Let op:** automated scans vinden maar 30-40% van a11y-problemen. Zij zijn een vertrekpunt, geen eindoordeel.

Output: `a11y/automated-scans.md`.

### Fase 3 — Handmatig: keyboard-navigatie

Voor elke must-test pagina:

1. Druk `Tab` herhaaldelijk.
2. **Volg de focus:**
   - Is elke interactive element bereikbaar?
   - Is de volgorde logisch (top-to-bottom, left-to-right)?
   - Is focus-ring duidelijk zichtbaar (niet `outline: none` zonder alternatief)?
   - Komt er geen "focus trap" zonder escape?
3. **Skip-link** op eerste Tab? (meestal "Naar inhoud skippen")
4. **Modals** — wordt focus naar modal gezet bij openen, en gaat 'ie terug naar triggerknop bij sluiten? `Escape` sluit?
5. **Dropdown / combobox** — werkbaar met pijltjes, Enter, Escape?
6. **Formulieren** — kun je elk veld bereiken, labels + errors lezen, submitten met Enter?

Per pagina: `PASS / FAIL` met bevindingen.

Output: `a11y/keyboard-nav.md`.

### Fase 4 — Handmatig: screen-reader testing

Gebruik VoiceOver (macOS Cmd+F5) of NVDA (Windows). Op 1-2 pagina's:

1. **Page title** — wordt correct aangekondigd?
2. **Landmarks** — `<header>`, `<nav>`, `<main>`, `<footer>` aanwezig? Rotor-navigatie werkt?
3. **Headings** — logische h1 → h2 → h3 volgorde zonder skips?
4. **Form-labels** — voor elk input wordt het juiste label gelezen?
5. **Required-indicator** — wordt "verplicht" hoorbaar?
6. **Error-messages** — na validatie-fout wordt de fout aangekondigd? `aria-live="polite"` op error-regio?
7. **Buttons vs links** — correct element (clickable `<div>` = FAIL)?
8. **Images** — `alt`-tekst beschrijvend voor informatieve images, `alt=""` voor decoratieve?
9. **Tabellen** — headers correct (`<th scope="col">`)?

Output: `a11y/screenreader-tests.md` met transcript-achtige bevindingen.

### Fase 5 — Visueel & cognitief

1. **Kleur-contrast.** Alle tekst-achtergrond paren minimaal 4.5:1 voor normale tekst, 3:1 voor grote tekst (≥18pt of 14pt bold). Gebruik browser DevTools "Accessibility" tab of contrastchecker.com.
2. **Kleur-alleen info.** Is ergens status ("verlopen") alleen rood gekleurd zonder icoon of tekst? WCAG 1.4.1.
3. **Focus-contrast.** Focus-ring zelf minimaal 3:1 tegen achtergrond (WCAG 2.4.11, nieuwe regel sinds 2.1 → 2.2, maar goed om mee te nemen).
4. **Resize.** Zoom naar 200% — raakt layout broken? Tekst moet still readable zijn.
5. **Motion-sensitivity.** Zijn er auto-playing animaties of carousels? `prefers-reduced-motion` gerespecteerd?
6. **Taal.** `lang="nl"` op `<html>` correct? Engelse woorden met `lang="en"` waar relevant?
7. **Forms — cognitieve load.** Zijn verplichte velden duidelijk? Zijn instructies vóór het veld, niet erachter? Worden fouten begrijpelijk uitgelegd ("E-mail bevat geen @ teken", niet "Ongeldige invoer")?

Output: `a11y/visueel-cognitief.md`.

### Fase 6 — EAA / wetgevingscheck

Europese Toegankelijkheidswet (EAA, Richtlijn (EU) 2019/882, van kracht 28 juni 2025) is van toepassing op bepaalde diensten, waaronder e-commerce. Voor TopTalent:

- **Valt uitzendplatform onder "e-commerce"?** Waarschijnlijk JA, want er worden diensten online aangeboden en overeenkomsten gesloten.
- **Micro-onderneming uitzondering:** < 10 werknemers **én** < €2M jaaromzet = uitgezonderd van een deel van de verplichtingen (maar best-practice blijft). TopTalent past mogelijk qua intern team, verifieer met eigenaar.
- **Handelsregister check** verifieert of TopTalent micro-onderneming is.

LEGAL_REVIEW_REQUIRED: definitieve verplichting ja/nee + welke specifieke eisen.

Output: `a11y/eaa-scope.md`.

---

## DELIVERABLES

1. `data/audits/a11y-audit-YYYY-MM-DD.md` — hoofdrapport met:
   - Executive summary (scores per pagina, top-10 te fixen, EAA-statusvoorstel)
   - Per-pagina bevindingsmatrix
   - Top-5 code-fixes (voor elk: component, beschrijving, voorbeeld-snippet, gitnexus_impact)
2. `data/audits/a11y/pagina-selectie.md`
3. `data/audits/a11y/automated-scans.md` + `axe-*.json` / `pa11y-*.json`
4. `data/audits/a11y/keyboard-nav.md`
5. `data/audits/a11y/screenreader-tests.md`
6. `data/audits/a11y/visueel-cognitief.md`
7. `data/audits/a11y/eaa-scope.md`

---

## RAPPORTAGESTIJL

- WCAG success criterion-nummer per bevinding (bijv. "1.4.3 Contrast (Minimum)").
- Severity: BLOCKER (volledig onbruikbaar voor groep), SERIOUS (ernstig hinderlijk), MODERATE, MINOR.
- Fix-voorstel in code-snippet + testinstructie.

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- Bevestig: "Geen UI-wijzigingen. Geen formulieren gesubmit."
- One-pager: TOP-3 BLOCKERS, TOP-3 SERIOUS, TOP-3 quick wins, EAA-advies.

---

## APPENDIX — BESTANDEN & TOOLS

**Code:**
- `src/components/ui/*` (shadcn)
- Formulier-componenten (`AanmeldForm`, `PersoneelAanvraagForm` of equivalent)
- `app/layout.tsx` (lang-attribute, skip-link?)

**Tools:**
- axe-core CLI: `npx @axe-core/cli`
- Pa11y: `npx pa11y`
- Lighthouse (mobile + desktop)
- Browser DevTools Accessibility tree
- VoiceOver (macOS) / NVDA (Windows)
- https://www.tpgi.com/color-contrast-checker
- https://wave.webaim.org

**Externe:**
- WCAG 2.1 Quick Reference: https://www.w3.org/WAI/WCAG21/quickref
- EN 301 549: https://www.etsi.org/deliver/etsi_en/301500_301599/301549
- EAA: https://ec.europa.eu/social/main.jsp?catId=1202

---

## BEGIN

1. Pagina-selectie bevestigen (Fase 1).
2. Automated scans (Fase 2) — geeft snelle triage.
3. Keyboard-tests (Fase 3).
4. Screen-reader-tests (Fase 4) — hier zit de diepte.
5. Visueel + cognitief (Fase 5).
6. EAA-scope + advies (Fase 6).
