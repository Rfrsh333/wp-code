# Fase 5: Algemene Voorwaarden + Klant-contract Check

**Datum:** 2026-04-22
**Scope:** Algemene Voorwaarden, contracttemplates, klant-overeenkomsten, rechtsbescherming
**Status:** `LEGAL_REVIEW_REQUIRED`

---

## 1. Algemene Voorwaarden Analyse

**Bestand:** `src/app/voorwaarden/page.tsx`
**Versie:** 3.0 | april 2025

### 1a. Structuur

De Algemene Voorwaarden bestaan uit:
- **Deel I**: Algemene Bepalingen (art. 1-8) -- begrippen, toepasselijkheid, dienstverlening, vereisten ZZP'er, tarieven, facturering, aansprakelijkheid, overmacht
- **Deel II**: Specifieke Bepalingen (art. 9-15) -- ZZP-kwaliteit, compliance, relatiebeding, geschillen, slotbepalingen

### 1b. Juridische Beoordeling

| Aspect | Status | Detail |
|---|---|---|
| KvK-vermelding | AANWEZIG | Art. 1: "ingeschreven bij de KvK onder nummer 73401161" |
| BTW-vermelding | AANWEZIG | Header: "BTW: NL002387654B82" |
| WAADI-vermelding | ONTBREEKT | Nergens in voorwaarden |
| ABU/NBBU-verwijzing | ONTBREEKT | Geen cao-verwijzing |
| Toepasselijk recht | AANWEZIG | Nederlands recht |
| Bevoegde rechter | AANWEZIG | Rechtbank Midden-Nederland (Utrecht) |
| Betalingstermijn | AANWEZIG | Art. 6: 14 dagen |
| Incassokosten | AANWEZIG | Buitengerechtelijke kosten per art. 6:96 BW |
| Aansprakelijkheidsbeperking | AANWEZIG | Art. 7: beperkt tot directe schade, max factuurbedrag afgelopen 6 maanden |
| Overmacht | AANWEZIG | Art. 8: uitgebreide overmachtsclausule |
| Relatiebeding | AANWEZIG | Art. 12: 12 maanden na laatste dienst, EUR 5.000 boete per overtreding |

### 1c. Kritieke Mismatch: ZZP-voorwaarden vs. Uitzendactiviteiten

| Website biedt aan | Voorwaarden dekken |
|---|---|
| Uitzenden (`/diensten/uitzenden`) | NEE - voorwaarden spreken uitsluitend over ZZP/Overeenkomst van Opdracht |
| Detachering (`/diensten/detachering`) | NEE - geen detacheringsbepalingen |
| Recruitment (`/diensten/recruitment`) | DEELS - bemiddelingsactiviteiten |
| ZZP-bemiddeling | JA - volledig afgedekt |

**Risico KRITIEK:** Het contractsysteem ondersteunt 7 contracttypen waaronder `uitzendovereenkomst`, `arbeidsovereenkomst`, `oproepovereenkomst`, maar de Algemene Voorwaarden zijn uitsluitend geschreven voor ZZP-bemiddeling. Er zijn GEEN voorwaarden voor:
- Uitzendovereenkomsten (ABU/NBBU)
- Arbeidsovereenkomsten
- Detacheringsovereenkomsten

### 1d. Relatiebeding

Art. 12 bevat een relatiebeding (12 maanden, EUR 5.000 boete). Dit is gebruikelijk bij ZZP-bemiddeling maar:
- Bij uitzendovereenkomsten geldt de ABU/NBBU-beperking voor overname-bepalingen
- Het beding is niet geimplementeerd in het systeem (geen tracking van relatie-einddatum)

## 2. Contract-systeem

### 2a. Ondersteunde contracttypen (`src/types/contracten.ts:7-14`)

1. `arbeidsovereenkomst`
2. `uitzendovereenkomst`
3. `oproepovereenkomst`
4. `freelance`
5. `overeenkomst_van_opdracht`
6. `stage`
7. `custom`

### 2b. Contract-workflow

| Stap | Status | Detail |
|---|---|---|
| Template-systeem | AANWEZIG | `contract_templates` tabel met secties + variabelen |
| Contract-generatie | AANWEZIG | Admin kan contract aanmaken per type |
| Digitale ondertekening | AANWEZIG | SHA-256 hash, IP-logging, audit trail |
| Contract verzenden | AANWEZIG | Via token-based link naar medewerker |
| Ondertekening door medewerker | AANWEZIG | Met handtekening-canvas |
| Ondertekening door admin | AANWEZIG | `teken_admin` actie |
| Contract-PDF generatie | AANWEZIG | `src/lib/pdf/contract-pdf.tsx` |

### 2c. Ontbrekende elementen in contracten

| Element | Status | Detail |
|---|---|---|
| **ABU/NBBU cao-verwijzing** | ONTBREEKT | Geen verwijzing in PDF of template |
| **Fase A/B/C** | ONTBREEKT | Geen fasensysteem |
| **Inlenersbeloning** | ONTBREEKT | Geen berekening of verwijzing |
| **Pensioen (StiPP)** | ONTBREEKT | Niet in contract |
| **Vakantiedagen/-bijslag** | ONTBREEKT | Niet in contract |
| **Proeftijd** | ONTBREEKT | Geen veld |
| **Opzegtermijn** | DEELS | `opgezegd_at` timestamp maar geen opzegtermijn-logica |
| BTW-nummer op contract | ONTBREEKT | Alleen KvK op contract-PDF |

## 3. Klant-overeenkomst

| Check | Status | Detail |
|---|---|---|
| Klant-registratie vereiste velden | MINIMAAL | Alleen: bedrijfsnaam, contactpersoon, email, telefoon |
| Klant-contract/raamovereenkomst | ONTBREEKT | Geen klant-specifiek contract-systeem |
| Tarief-afspraken opgeslagen | DEELS | `diensten.uurtarief` per dienst, `klanten.default_hourly_rate` |
| Betalingsvoorwaarden per klant | ONTBREEKT | Standaard 14 dagen voor alle klanten |
| Inlenersinstructie | ONTBREEKT | Geen template of document voor inlenersinstructies |

## 4. Offerte-systeem

| Check | Status | Detail |
|---|---|---|
| Offerte-generatie | AANWEZIG | `src/lib/pdf/offerte-pdf.tsx` |
| AI-offerte-generator | AANWEZIG | `src/app/api/admin/ai/offerte-generator/route.ts` |
| Offerte-opvolging | DEELS | Offerte-status tracking in database |
| Geldigheid/vervaldatum | AANWEZIG | Op offerte-PDF |

## 5. Documenten-compliance

### 5a. Kandidaat documenten bij inschrijving

| Uitbetalingswijze | Vereiste documenten | Status |
|---|---|---|
| Loondienst | ID-bewijs, CV | AANWEZIG |
| ZZP | ID-bewijs, CV, KvK-uittreksel | AANWEZIG |
| ZZP (extra) | BTW-registratie, Verzekeringspolis | DEELS (btw als doc-type, verzekering niet) |

### 5b. Wettelijk vereiste documenten die ontbreken

| Document | Verplicht voor | Status |
|---|---|---|
| Loonheffingsverklaring | Alle werknemers | ONTBREEKT |
| Verblijfsvergunning | Niet-EU werknemers | ONTBREEKT |
| Tewerkstellingsvergunning (TWV) | Niet-EU werknemers | ONTBREEKT |
| Modelovereenkomst (DBA) | ZZP'ers | ONTBREEKT |
| Beroepsaansprakelijkheidsverzekering | ZZP'ers | DEELS (vermeld in voorwaarden, niet als upload-type) |

---

## Bevindingen Samenvatting

| # | Bevinding | Ernst | Type |
|---|---|---|---|
| F5-01 | Algemene Voorwaarden dekken alleen ZZP, niet uitzenden/detachering | KRITIEK | JURIST |
| F5-02 | Geen ABU/NBBU cao-verwijzing in contracten | KRITIEK | JURIST |
| F5-03 | Geen Fase A/B/C systeem voor uitzendovereenkomsten | KRITIEK | CODE+JURIST |
| F5-04 | Geen klant-raamovereenkomst of inlenersinstructie | HOOG | JURIST |
| F5-05 | Loonheffingsverklaring ontbreekt als document-type | HOOG | CODE |
| F5-06 | Verblijfs-/werkvergunning ontbreekt als document-type | HOOG | CODE |
| F5-07 | Geen pensioen/vakantiedagen/proeftijd in contracten | HOOG | CODE+JURIST |
| F5-08 | WAADI niet vermeld in Algemene Voorwaarden | MIDDEL | JURIST |
| F5-09 | Relatiebeding niet geimplementeerd in systeem | LAAG | CODE |

`LEGAL_REVIEW_REQUIRED`
