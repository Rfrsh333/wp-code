# NL Compliance Audit -- TopTalent Jobs

**Datum:** 2026-04-22
**Bedrijf:** TopTalent Jobs | KvK 73401161 | Utrecht
**Scope:** Nederlandse wet- en regelgeving voor horeca-uitzendbureau
**Auditor:** Geautomatiseerde code-analyse (Claude)
**Status:** `LEGAL_REVIEW_REQUIRED`

---

## Executive Summary

TopTalent Jobs opereert als horeca-staffing platform met zowel ZZP-bemiddeling als uitzendactiviteiten. De technische codebase is functioneel sterk maar vertoont **significante compliance-gaps** op het gebied van arbeidsrecht, belastingwetgeving en sectorspecifieke regelgeving.

**Kernprobleem:** Het platform biedt uitzendovereenkomsten aan maar de juridische infrastructuur (Algemene Voorwaarden, contracttemplates, loonadministratie) is uitsluitend ingericht voor ZZP-bemiddeling. Dit creëert risico's bij controle door Inspectie SZW, Belastingdienst en SNA-auditors.

### Statistieken

| Categorie | Aantal bevindingen |
|---|---|
| KRITIEK | 11 |
| HOOG | 14 |
| MIDDEL | 7 |
| LAAG | 3 |
| **Totaal** | **35** |

---

## Actielijst (3-kolommen)

### CODE -- Te implementeren in de applicatie

| # | Actie | Ernst | Fase | Referentie |
|---|---|---|---|---|
| C-01 | WAADI-nummer toevoegen aan `factuur-config.ts`, Footer, factuur-PDF, contract-PDF, offerte-PDF | KRITIEK | 1 | F1-01 |
| C-02 | Loonbelastingnummer toevoegen aan factuur-config en factuur-PDF | KRITIEK | 1 | F1-02 |
| C-03 | KvK + BTW toevoegen aan Footer component | HOOG | 1 | F1-03 |
| C-04 | Voorbeeld-factuur laten werken met `getFactuurConfig()` | HOOG | 1 | F1-04 |
| C-05 | BTW-nummer toevoegen aan contract-PDF en offerte-PDF | MIDDEL | 1 | F1-08 |
| C-06 | Klant-tabel uitbreiden: `kvk_nummer`, `btw_nummer`, `adres`, `postcode`, `stad` | KRITIEK | 2 | F2-04 |
| C-07 | Klant-adres tonen op factuur-PDF | KRITIEK | 2 | F2-04 |
| C-08 | Medewerker-velden toevoegen: `geboorteplaats`, `nationaliteit`, `loonheffingskorting`, `datum_in_dienst`, `datum_uit_dienst` | KRITIEK | 2 | F2-01-03 |
| C-09 | Functiegroep-veld toevoegen aan diensten (voor cao-inschaling) | KRITIEK | 2 | F2-06 |
| C-10 | Toeslagberekening implementeren (avond/nacht/weekend/feestdag) | KRITIEK | 3 | F3-04 |
| C-11 | Leeftijdsvalidatie bij matching: bar/tap-diensten alleen >= 18 jaar | KRITIEK | 3 | F3-01 |
| C-12 | Nachtwerk-verbod voor < 18 jaar implementeren | KRITIEK | 3 | F3-02 |
| C-13 | VSH-certificering check bij bar-functies in matching | HOOG | 3 | F3-03 |
| C-14 | Maximale werktijd-validatie (12u/dag, 60u/week) | HOOG | 3 | F3-05 |
| C-15 | Pauze-validatie (>5,5 uur = min 30 min pauze) | MIDDEL | 3 | F3-06 |
| C-16 | G-rekening ondersteuning in factuursysteem | HOOG | 4 | F4-01 |
| C-17 | Werkvergunning/nationaliteit tracking toevoegen | KRITIEK | 4 | F4-04 |
| C-18 | ID-retentiebeleid implementeren (5 jaar na uitdienst) | HOOG | 4 | F4-05 |
| C-19 | Loonstrook-generatie toevoegen | HOOG | 4 | F4-07 |
| C-20 | Document-types uitbreiden: verblijfsvergunning, werkvergunning, loonheffingsverklaring | HOOG | 5 | F5-06 |
| C-21 | Fase A/B/C systeem voor uitzendovereenkomsten | KRITIEK | 5 | F5-03 |
| C-22 | BTW-verleggingsregel op facturen | MIDDEL | 2 | F2-11 |
| C-23 | Blokkering bij verlopen ID-bewijs | MIDDEL | 4 | F4-10 |
| C-24 | Medewerker bruto-uurloon apart van klanttarief | HOOG | 2 | F2-14 |

### BELEID -- Organisatorische/procedurele acties

| # | Actie | Ernst | Referentie |
|---|---|---|---|
| B-01 | SNA-certificering claim verifiëren: als niet gecertificeerd, verwijderen van privacypagina | HOOG | F4-06 |
| B-02 | IBAN invullen in productie-environment (niet placeholder) | MIDDEL | F1-09 |
| B-03 | VBG (Verklaring Betalingsgedrag) workflow opzetten | MIDDEL | F4-09 |
| B-04 | StiPP-pensioen aansluiting regelen voor uitzendkrachten | HOOG | F3-08 |
| B-05 | Vakantiedagen/-bijslag administratie opzetten | HOOG | F2-16 |

### JURIST -- Aan arbeidsrechtadvocaat voorleggen

| # | Actie | Ernst | Referentie |
|---|---|---|---|
| J-01 | Algemene Voorwaarden herschrijven: apart deel voor uitzenden + detachering naast ZZP | KRITIEK | F5-01 |
| J-02 | ABU/NBBU-cao keuze maken en verwerken in contracttemplates | KRITIEK | F5-02 |
| J-03 | Modelovereenkomst (Wet DBA) opstellen voor ZZP-constructie | HOOG | F4-08 |
| J-04 | Klant-raamovereenkomst template opstellen | HOOG | F5-04 |
| J-05 | Inlenersbeloning berekening laten valideren | KRITIEK | F3-07 |
| J-06 | WAADI-registratie verifiëren en nummer opvragen | KRITIEK | F1-01 |

---

## TOP-3 Compliance Risico's

1. **Juridische mismatch ZZP vs. Uitzenden**: De Algemene Voorwaarden, contracttemplates en loonadministratie zijn ingericht voor ZZP-bemiddeling, terwijl het platform uitzendovereenkomsten aanbiedt. Bij controle door Inspectie SZW kan dit leiden tot herkwalificatie van ZZP-relaties naar dienstverbanden, met terugwerkende kracht (loonheffingen, premies, boetes).

2. **Onvolledige loonadministratie**: Kritieke velden ontbreken (loonheffingskorting, geboorteplaats, nationaliteit, anoniemenheffing). Zonder deze velden is correcte loonaangifte onmogelijk en faalt een SNA-audit direct.

3. **Geen leeftijds-/arbeidstijdvalidatie**: 16-17 jarigen kunnen worden ingepland voor nachtdiensten en bardiensten (alcohol). Dit is in strijd met de Arbeidstijdenwet en Alcoholwet en kan leiden tot boetes van Inspectie SZW.

## TOP-3 Quick Wins

1. **Footer + factuur-config uitbreiden** (C-01, C-02, C-03): KvK, BTW, WAADI en loonbelastingnummer toevoegen aan footer en factuur-config. ~2-4 uur werk, direct wettelijk compliant.

2. **Voorbeeld-factuur fixen** (C-04): `getFactuurConfig()` gebruiken ipv hardcoded dummy data. ~30 minuten werk.

3. **Leeftijdscheck bij bar-matching** (C-11): In `matching.ts` check toevoegen: `if functie === "bar" && leeftijd < 18 -> uitsluiten`. ~1 uur werk, voorkomt Alcoholwet-overtreding.

## TOP-3 Vragen voor Arbeidsrechtadvocaat

1. **Moet TopTalent aparte Algemene Voorwaarden hebben voor uitzendactiviteiten vs. ZZP-bemiddeling?** De huidige voorwaarden (Versie 3.0, april 2025) zijn uitsluitend voor ZZP. Het contractsysteem ondersteunt echter ook uitzendovereenkomsten, arbeidsovereenkomsten en oproepcontracten.

2. **Is TopTalent verplicht zich aan te sluiten bij ABU of NBBU, en welke CAO is van toepassing?** De privacypagina claimt SNA-certificering (NEN 4400-1) maar er is geen ABU/NBBU-lidmaatschap of cao-verwijzing in de codebase. Als TopTalent feitelijk als uitzendbureau opereert, is de ABU-cao of NBBU-cao van toepassing.

3. **Hoe moet de Wet DBA-beoordeling worden ingericht voor de ZZP-constructie?** De voorwaarden benoemen vrije vervanging, geen werkgeversgezag en eigen materiaal, maar er is geen modelovereenkomst of zelfstandigenverklaring. Welke aanvullende maatregelen zijn nodig om schijnzelfstandigheid-risico te mitigeren?

---

## Sub-rapporten

| Fase | Rapport | Pad |
|---|---|---|
| 1 | Bedrijfs-registraties | `data/audits/nl/bedrijfs-registraties.md` |
| 2 | Data-model Matrix | `data/audits/nl/data-model-matrix.md` |
| 3 | Horeca-specifieke Checks | `data/audits/nl/horeca-checks.md` |
| 4 | WKA + SNA-readiness | `data/audits/nl/wka-sna-readiness.md` |
| 5 | Voorwaarden + Contracten | `data/audits/nl/voorwaarden-contracten.md` |

---

*Dit rapport is een technische code-analyse. Alle compliance-conclusies moeten worden geverifieerd door een arbeidsrechtadvocaat en/of SNA-auditor.*

`LEGAL_REVIEW_REQUIRED`
