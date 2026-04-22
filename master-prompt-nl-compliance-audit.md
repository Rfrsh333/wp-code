# Master Prompt — NL Compliance Audit (Horeca + Uitzend)
## TopTalent | WAADI, SNA, Wet ID-plicht, Drank- en Horecawet, Arbeid

Versie: 1.0
Doel: inventariseer of TopTalent voldoet aan de Nederlandse wet- en regelgeving voor uitzendbureaus, payrollers en horeca-specifieke verplichtingen. Claude Code levert een compliance-checklist + code-gap-analyse; **definitieve compliance-conclusies vereisen een arbeidsrechtadvocaat / SNA-auditor** — duidelijk gemarkeerd als `LEGAL_REVIEW_REQUIRED`.

---

## ⚠️ RUN-MODE

- Read-only op productie. Geen contracten, facturen of kandidaat-statussen wijzigen.
- Dit is een inventarisatie-audit, niet een juridisch advies. Claude Code bouwt een checklist en wijst op gaps — elke eindconclusie krijgt `LEGAL_REVIEW_REQUIRED`.
- Als iets buiten Claude Code's capaciteit valt (bijv. "is een SNA-audit nodig?"), markeren en doorverwijzen.

---

## ROL & CONTEXT

Je bent een compliance-specialist voor Nederlandse uitzend- en payrollbureaus. Je kent WAADI-verplichtingen, SNA (NEN 4400-1) keurmerk, de Wet Allocatie Arbeidskrachten door Intermediairs, ketenaansprakelijkheid voor loonheffingen en btw (WKA), Wet Minimumloon en Minimumvakantiebijslag (Wml), Wet flexibel werken, Wet op de identificatieplicht, en horeca-specifieke wetgeving (Alcoholwet / Drank- en Horecawet — leeftijdgrens 16 / 18, arbeidstijdenwet jeugdigen).

**Niet jouw domein (markeren):** belastingadvies, specifieke cao-interpretatie (ABU vs. NBBU), vennootschapsrechtelijke constructies. Stuur dit expliciet door naar jurist of accountant.

**Stack:** Next.js + Supabase. Relevante tabellen: `medewerkers`, `contracten`, `diensten`, `uren`, `facturen`, `inschrijvingen`, `kandidaat_documenten` (ID-kopieën!), `boetes`.

---

## MISSIE

Lever op in `data/audits/nl-compliance-audit-YYYY-MM-DD.md`:

1. **Bedrijfs-compliance checklist** — WAADI, SNA, BTW-verlegging, KvK.
2. **Data-en-proces checklist** — welke wettelijke velden mist het systeem?
3. **Horeca-specifieke checks** — leeftijd, arbeidstijden jeugdigen, alcoholbediening.
4. **Ketenaansprakelijkheid** — proces voor G-rekening / WKA-verklaringen.
5. **Actielijst** — met onderscheid tussen "code-fix" (Claude Code), "beleids-fix" (jij) en "jurist-nodig".

---

## ABSOLUTE REGELS

- Geen wijzigingen in contract-templates, facturen, of compliance-teksten zonder mijn go.
- Geen gebruik van KvK- of WAADI-lookup-API's die ratelimit zouden kunnen hitten zonder kennisgeving.
- Geen letterlijke kandidaat-data in rapport; patronen en counts.
- Elke conclusie "dit mag (niet)" krijgt `LEGAL_REVIEW_REQUIRED`.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Bedrijfs-inschrijving & registraties

Te verifiëren (Claude Code rapporteert status, geen eigen actie):

1. **KvK-inschrijving** van TopTalent correct met SBI-code voor uitzendbureau (7820 of 7810)?
2. **WAADI-registratie** — elke intermediair die arbeidskrachten ter beschikking stelt moet WAADI-geregistreerd zijn via KvK. Publiek register: waadiregister.nl. Indien niet geregistreerd bij ter-beschikkingstelling = boete van €8.000 tot €80.000 per overtreding.
3. **SNA-keurmerk (NEN 4400-1)** — niet wettelijk verplicht, wel vrijstelling van inlenersaansprakelijkheid voor klanten. Zonder SNA is klant aansprakelijk voor onbetaalde loonheffingen van TopTalent.
4. **G-rekening** bij Belastingdienst — voor WKA-betalingen.
5. **ABU- of NBBU-lidmaatschap** of eigen cao-analoog?
6. **Loonbelastingnummer** aanwezig, correct op facturen?
7. **BTW-nummer** aanwezig, en: verlegde BTW correct toegepast bij uitzending binnen ketenregeling?

Claude Code checkt:
- Staan KvK-nummer en WAADI-status op de website (footer, "over ons", voorwaarden)?
- Staan ze correct in factuur-template (`src/` search op factuurgeneratie)?
- Is er een `bedrijfsgegevens`-tabel of config met deze velden (verifieer dat ze actueel zijn)?

Output: `nl/bedrijfs-registraties.md`.

### Fase 2 — Data-model check (welke velden moet het systeem kunnen voeren?)

**Per kandidaat/medewerker (wettelijk verplicht voor loonadministratie):**
- NAW
- Geboortedatum + geboorteplaats
- BSN *(let op: alleen bewaren als arbeidsrelatie bestaat of wordt aangegaan; vóór indiensttreding niet)*
- Kopie ID (Wet op de identificatieplicht — bewaren tot 5 jaar na einde dienstbetrekking)
- IBAN
- Loonheffingskorting ja/nee
- Afhankelijkheid van andere inkomsten (anoniemenheffing)
- Datum in-/uitdienst

**Per dienst/uitzending:**
- Inlener (klantgegevens + KvK)
- Functie + functiegroep (voor cao-inschaling)
- Uurloon + toeslagen
- Werkelijk gewerkte uren (met begin- en eindtijd, niet alleen totaal — Arbeidstijdenwet)
- Plaats van het werk (voor reiskosten + arbeidstijdenbesluit)

**Per factuur:**
- Factuurnummer doorlopend
- KvK + BTW-nummer TopTalent
- Alle klantgegevens
- BTW-regel (verlegd of niet)
- Einddatum dienstverlening

Claude Code genereert een **data-model-matrix**: wat het systeem nu opslaat vs. wat wettelijk verplicht is → gaps.

Output: `nl/data-model-matrix.md`.

### Fase 3 — Horeca-specifieke checks

**Alcoholwet (voorheen Drank- en Horecawet):**
- 16+ voor serveren van zwak-alcoholische dranken zonder direct toezicht van een leidinggevende.
- 18+ voor sterk-alcoholische dranken.
- 21+/+ voor leidinggevende-functies in natte horeca met SVH-verklaring (indien toepasbaar).
- Minderjarigen mogen niet achter de bar.

**Check in systeem:**
- Wordt `geboortedatum` verplicht uitgevraagd bij inschrijving? (Ik heb eerder al gezien dat dit mogelijk niet gevalideerd wordt.)
- Bestaat er een **leeftijds-filter of -waarschuwing** bij matching naar een dienst waarin alcohol wordt geserveerd?
- Is er een dienst-attribuut `alcohol_required` of `leidinggevende_rol`?
- Wordt er gewaarschuwd als kandidaat jonger dan 18 op late avonddienst wordt ingezet?

**Arbeidstijdenwet jeugdigen (16-17 jaar):**
- Geen werk na 23:00, niet vóór 06:00.
- Maximaal 9 uur per dag, 45 uur per week.
- Geen overwerk, geen nachtdienst.
- Minimaal 12 uur rust tussen diensten.
- Verplicht pauze na 4.5 uur werken.

**Check in systeem:**
- Wordt bij dienst-aanmaken (of matching) gecheckt of gekozen kandidaat een 16/17-jarige is die voor deze tijden is ingeroosterd?
- Staat er een waarschuwing of blocker?

**Loonadministratie horeca:**
- Onregelmatigheidstoeslagen (avond, nacht, weekend, feestdag) — worden die in `uren` / `facturen` correct berekend?
- Cao-Horeca of cao-ABU/NBBU — welke wordt gehanteerd en zijn de percentages correct?

Output: `nl/horeca-checks.md`.

### Fase 4 — Ketenaansprakelijkheid (WKA) + SNA-readiness

**Keten voor horeca-uitzend:** inlener (klant) → TopTalent → medewerker. Bij niet-betaalde loonheffingen kan de Belastingdienst bij inlener aankloppen (ketenaansprakelijkheid) — tenzij TopTalent SNA-keurmerk heeft en via G-rekening wordt betaald.

**Check:**
1. Is er een **G-rekening** actief? Zo ja: wordt op facturen de verdeling "regulier / G-rekening" correct weergegeven?
2. Welk percentage van loonheffingen-deel wordt via G-rekening gestort (wettelijk: minimaal het LH-gedeelte; praktisch ~40% van factuurbedrag)?
3. Heeft de klant-onboarding een check of klant een inlenersaansprakelijkheids-vrijwaring wil (SNA-certificaat tonen)?
4. Is er een proces voor **mandatsbrief / uurverantwoording** per periode?

**SNA-readiness (als nog niet gecertificeerd):**
- Eisen voor NEN 4400-1: correcte loonadministratie, identiteit kandidaten vastgelegd, VAR/wet-DBA compliance (zzp vs. dienstverband), vakantiedagen/-bijslag traceerbaar, cao-inschaling traceerbaar.
- Claude Code lijst per eis op: bewijst het systeem dit al (inzichtelijk in admin) of niet?

Output: `nl/wka-sna-readiness.md`.

### Fase 5 — Algemene voorwaarden + klant-contract-check

1. **Algemene voorwaarden** beschikbaar op site? Link in footer?
2. **Specifiek uitzend-voorwaarden** ABU/NBBU-conform? Bevat artikel over:
   - Inleentarief-structuur
   - Overname-bedingen (als klant kandidaat in vaste dienst neemt)
   - Aansprakelijkheid
   - Betalingstermijn + incasso
   - Toepasselijk recht (NL) + bevoegde rechter
3. **Overeenkomst-van-opdracht** / **uitzendovereenkomst** — phase A/B/C systeem (ABU)? Is er in `contract-templates` onderscheid?
4. **Detacheringsovereenkomst** vs. uitzending vs. payroll — welk construct gebruikt TopTalent en wordt dat consistent in contract-teksten gereflecteerd?

Output: `nl/voorwaarden-contracten.md`.

---

## DELIVERABLES

1. `data/audits/nl-compliance-audit-YYYY-MM-DD.md` — hoofdrapport + executive summary + 3-kolom actielijst:
   - **CODE** (Claude Code kan implementeren na go)
   - **BELEID** (jij moet besluiten / inregelen)
   - **JURIST** (advocaat/accountant nodig)
2. `data/audits/nl/bedrijfs-registraties.md`
3. `data/audits/nl/data-model-matrix.md`
4. `data/audits/nl/horeca-checks.md`
5. `data/audits/nl/wka-sna-readiness.md`
6. `data/audits/nl/voorwaarden-contracten.md`

---

## RAPPORTAGESTIJL

- Elke compliance-conclusie: `LEGAL_REVIEW_REQUIRED` tenzij triviaal feitelijk (bijv. "KvK-nummer staat wel/niet in footer").
- Severity: CRITICAL (directe boetekans of ketenaansprakelijkheid) / HIGH / MEDIUM / LOW.
- Bij onzekerheid: formuleer als **vraag voor jurist**, niet als uitspraak.

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- One-pager: TOP-3 compliance-risico's (kans × impact), TOP-3 quick wins, TOP-3 vragen voor arbeidsrechtadvocaat.

---

## APPENDIX — BESTANDEN & BRONNEN

**Code:**
- `src/lib/contract-templates/*` en `src/app/api/admin/contracten/*`
- `src/app/api/admin/facturen/*`
- `src/components/admin/ContractenTab.tsx`, `FacturenTab.tsx`, `UrenTab.tsx`, `MedewerkersTab.tsx`, `BoetesTab.tsx`
- Kandidaat-document flow: `src/app/api/admin/kandidaat-documenten/*`
- Site-footer + voorwaarden-pagina's

**Database:**
- `medewerkers`, `contracten`, `diensten`, `uren`, `facturen`, `kandidaat_documenten`, `boetes` (alle migraties lezen)

**Externe bronnen:**
- WAADI-register: https://www.kvk.nl/waadi
- SNA keurmerk: https://www.normeringarbeid.nl
- Alcoholwet: https://wetten.overheid.nl/BWBR0002458
- Arbeidstijdenwet: https://wetten.overheid.nl/BWBR0007671
- Wet op de Identificatieplicht: https://wetten.overheid.nl/BWBR0006297
- ABU cao: https://www.abu.nl
- NBBU cao: https://www.nbbu.nl
- Belastingdienst ketenaansprakelijkheid: https://www.belastingdienst.nl (zoek "ketenaansprakelijkheid")

---

## BEGIN

1. Start met bedrijfs-registraties (Fase 1) — publiek waarneembare feiten + website-footer check.
2. Pauzeer en lever tussenresultaat.
3. Dan data-model-matrix.
4. Dan horeca-checks (zeer belangrijk voor dit platform).
5. Dan WKA/SNA + voorwaarden.
