# Fase 1: Bedrijfs-registraties

**Datum:** 2026-04-22
**Scope:** Website footer, facturen, contracten, offertes, Algemene Voorwaarden, Privacy Policy, Structured Data
**Status:** `LEGAL_REVIEW_REQUIRED`

---

## 1. Website Footer (`src/components/Footer.tsx`)

| Item | Status | Detail |
|---|---|---|
| KvK-nummer | ONTBREEKT | Footer bevat alleen bedrijfsnaam, locatie ("Utrecht, Nederland"), telefoon, email, copyright |
| BTW-nummer | ONTBREEKT | Niet vermeld |
| WAADI-registratie | ONTBREEKT | Niet vermeld |
| SNA-keurmerk | ONTBREEKT | Geen logo of vermelding |

## 2. Over Ons (`src/app/over-ons/page.tsx`)

Geen enkele registratie vermeld. Uitsluitend marketing content.

## 3. Algemene Voorwaarden (`src/app/voorwaarden/page.tsx`)

| Item | Status | Locatie |
|---|---|---|
| KvK-nummer | AANWEZIG | Regel 34: `KvK: 73401161`, Regel 48: `ingeschreven bij de KvK onder nummer 73401161` |
| BTW-nummer | AANWEZIG | Regel 34: `BTW: NL002387654B82` |
| WAADI-registratie | ONTBREEKT | Niet vermeld |
| SNA-keurmerk | ONTBREEKT | Niet vermeld |

**Kritiek:** Voorwaarden zijn geschreven voor ZZP-bemiddeling (Overeenkomst van Opdracht), terwijl de website uitzenden en detachering aanbiedt en het contractsysteem `uitzendovereenkomst` als type ondersteunt.

## 4. Privacy Policy (`src/app/privacy/page.tsx`)

| Item | Status | Locatie |
|---|---|---|
| WAADI-vermelding | AANWEZIG | Regel 204: `Wet allocatie arbeidskrachten door intermediairs (WAADI)` |
| SNA-certificering | AANWEZIG | Regel 207: `NEN 4400-1 / SNA-certificering`, Regel 379: `In het kader van onze SNA-certificering (NEN 4400-1)` |
| KvK/BTW-nummer | ONTBREEKT | Nummers niet op privacypagina |

**Kritiek:** Privacypagina claimt SNA-certificering maar nergens in de codebase is een certificaatnummer, SNA-logo of verificatielink aanwezig.

## 5. Structured Data (`src/components/StructuredData.tsx`)

Geen `taxID`, `naics`, of `identifier` voor KvK/BTW in JSON-LD schema.

## 6. Factuur PDF

### 6a. Productie-facturen (`src/app/api/facturen/[id]/pdf/route.ts` + `src/lib/factuur-config.ts`)

| Item | Status | Detail |
|---|---|---|
| KvK-nummer | AANWEZIG | `factuur-config.ts:6` -> `73401161` |
| BTW-nummer | AANWEZIG | `factuur-config.ts:7` -> `NL002387654B82` |
| WAADI-registratie | ONTBREEKT | Niet op facturen |
| Loonbelastingnummer | ONTBREEKT | Niet in config en niet op PDF |
| IBAN | AANWEZIG | Maar placeholder fallback: `NL00 BANK 0000 0000 00` |

### 6b. Voorbeeld-factuur (`src/app/api/facturen/voorbeeld/route.ts`)

| Item | Status | Detail |
|---|---|---|
| KvK-nummer | FOUTIEF | Hardcoded `KVK: 12345678` (dummy) |
| BTW-nummer | FOUTIEF | Hardcoded `BTW: NL123456789B01` (dummy) |
| Gebruikt factuur-config | NEE | Gebruikt `getFactuurConfig()` niet |

## 7. Contract PDF (`src/lib/pdf/contract-pdf.tsx`)

| Item | Status |
|---|---|
| KvK-nummer | AANWEZIG (regel 298, 395) |
| BTW-nummer | ONTBREEKT |
| WAADI | ONTBREEKT |
| ABU/NBBU CAO-referentie | ONTBREEKT |
| Fase A/B/C systeem | ONTBREEKT |

## 8. Offerte PDF (`src/lib/pdf/offerte-pdf.tsx`)

| Item | Status |
|---|---|
| KvK-nummer | AANWEZIG (regel 432, 601) |
| BTW-nummer | ONTBREEKT |
| WAADI | ONTBREEKT |

## 9. Centrale Config (`src/lib/factuur-config.ts`)

| Veld | Aanwezig | Waarde |
|---|---|---|
| bedrijfsnaam | Ja | "TopTalent Jobs" |
| adres | Ja | "Kanaalstraat 15" |
| postcodeStad | Ja | "3531 CJ Utrecht" |
| kvk | Ja | "73401161" |
| btw | Ja | "NL002387654B82" |
| iban | Ja | Placeholder: "NL00 BANK 0000 0000 00" |
| **waadi** | **Nee** | Ontbreekt volledig |
| **loonbelastingnummer** | **Nee** | Ontbreekt volledig |
| **sna_certificaat** | **Nee** | Ontbreekt volledig |

## 10. Environment Variables (`.env.example`)

Alleen factuur-gerelateerde vars (FACTUUR_KVK, FACTUUR_BTW, FACTUUR_IBAN). Geen WAADI, SNA, of loonbelastingnummer env vars.

---

## Bevindingen Samenvatting

| # | Bevinding | Ernst | Type |
|---|---|---|---|
| F1-01 | WAADI-registratienummer ontbreekt overal (footer, facturen, contracten) | KRITIEK | CODE |
| F1-02 | Loonbelastingnummer ontbreekt op facturen | KRITIEK | CODE |
| F1-03 | KvK/BTW ontbreekt in website Footer | HOOG | CODE |
| F1-04 | Voorbeeld-factuur heeft hardcoded foutieve dummy data | HOOG | CODE |
| F1-05 | Fase A/B/C systeem ontbreekt in contractsysteem | KRITIEK | CODE+JURIST |
| F1-06 | ABU/NBBU CAO-verwijzing ontbreekt in contracten | KRITIEK | JURIST |
| F1-07 | SNA-keurmerk claim zonder bewijs op privacypagina | HOOG | BELEID |
| F1-08 | BTW-nummer ontbreekt op contract- en offerte-PDF | MIDDEL | CODE |
| F1-09 | IBAN is placeholder in factuur-config | MIDDEL | BELEID |
| F1-10 | Juridische inconsistentie: ZZP-voorwaarden vs. uitzendaanbod | KRITIEK | JURIST |

`LEGAL_REVIEW_REQUIRED`
