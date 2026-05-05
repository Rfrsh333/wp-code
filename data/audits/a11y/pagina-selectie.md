# Pagina-selectie WCAG 2.1 AA Audit — TopTalent

**Datum:** 22 april 2026
**Totaal geteste pagina's:** 10

## Selectiecriteria

Pagina's zijn geselecteerd op basis van:
- Gebruikersfrequentie (meest bezochte pagina's)
- Formulier-interactie (kritiek voor kandidaten en opdrachtgevers)
- Juridische pagina's (privacy, voorwaarden)
- Informatieve pagina's (diensten, over ons, FAQ)

## Geteste pagina's

| # | Pad | Omschrijving | Reden voor selectie |
|---|-----|-------------|---------------------|
| 1 | `/` | Homepage | Hoofdingangspagina, meeste bezoekers |
| 2 | `/inschrijven` | Kandidaat inschrijfformulier | Kritiek formulier — kandidaten schrijven zich hier in |
| 3 | `/personeel-aanvragen` | B2B personeelsaanvraag wizard | Kritiek formulier — opdrachtgevers vragen personeel aan |
| 4 | `/contact` | Contactformulier + FAQ | Formulier + interactieve accordeon |
| 5 | `/kosten-calculator` | Kostencalculator wizard | Interactief multi-step formulier |
| 6 | `/privacy` | Privacybeleid | Juridisch verplichte pagina |
| 7 | `/voorwaarden` | Algemene voorwaarden | Juridisch verplichte pagina |
| 8 | `/diensten` | Dienstenoverzicht | Informatieve kernpagina |
| 9 | `/over-ons` | Over ons | Informatieve pagina |
| 10 | `/veelgestelde-vragen` | FAQ | Informatieve pagina met interactieve elementen |

## Niet geteste pagina's

De volgende pagina's zijn **niet** meegenomen in deze audit:
- `/admin/*` — Interne beheeromgeving (niet publiek toegankelijk)
- `/api/*` — API endpoints (geen UI)
- Dynamische vacaturepagina's — Geen vaste content beschikbaar op moment van audit

## Testomgeving

- **Browser:** Chrome 124 (Axe DevTools), Firefox 125 (Pa11y)
- **Screen reader:** VoiceOver (macOS) — code-analyse
- **Keyboard:** Handmatige tab-navigatie analyse op basis van broncode
- **Tools:** axe-core 4.x, Pa11y 6.x
