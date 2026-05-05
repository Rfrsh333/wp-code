# Fase 4: WKA Ketenaansprakelijkheid + SNA-readiness

**Datum:** 2026-04-22
**Scope:** Wet Ketenaansprakelijkheid (WKA), NEN 4400-1, SNA-certificering, G-rekening, identificatieplicht
**Status:** `LEGAL_REVIEW_REQUIRED`

---

## 1. WKA (Wet Ketenaansprakelijkheid)

### 1a. G-rekening

| Check | Status | Detail |
|---|---|---|
| G-rekening veld in klanten-tabel | ONTBREEKT | Geen `g_rekening` veld |
| G-rekening optie op facturen | ONTBREEKT | Geen split-betaling logica |
| G-rekening in factuur-config | ONTBREEKT | `factuur-config.ts` heeft alleen 1 IBAN |

**Toelichting:** Bij uitzendwerk kan de opdrachtgever verzoeken een deel van de factuur op een G-rekening te storten (loonheffingen + BTW). Dit beschermt de opdrachtgever tegen ketenaansprakelijkheid. Het systeem biedt deze optie niet.

### 1b. Inlenersaansprakelijkheid

| Check | Status | Detail |
|---|---|---|
| Klant KvK-nummer opgeslagen | ONTBREEKT | Klanten-tabel mist `kvk_nummer` |
| Verificatie klant-identiteit | ONTBREEKT | Geen KvK-lookup of -verificatie |
| WKA-verklaring aan klant | ONTBREEKT | Geen template of document |

### 1c. Verklaring Betalingsgedrag (VBG)

| Check | Status | Detail |
|---|---|---|
| VBG van Belastingdienst | ONTBREEKT | Geen veld, upload of workflow |
| VBG aan klanten verstrekken | ONTBREEKT | Niet in codebase |

## 2. NEN 4400-1 / SNA-readiness

### 2a. Vereiste administratie

| NEN 4400-1 Eis | Status | Detail |
|---|---|---|
| Correcte loonadministratie | DEELS | Uren-registratie aanwezig, maar ontbreken: loonheffingskorting, anoniemenheffing, functiegroep, toeslagen |
| Identiteit kandidaten vastgelegd | AANWEZIG | `kandidaat_documenten` en `medewerker_documenten` met ID-upload en review |
| ID-bewijs retentie (5 jaar) | ONTBREEKT | Geen automatische retentie of verwijderlogica |
| Kopie ID 5 jaar na uitdienst verwijderen | ONTBREEKT | Geen uitdienst-workflow |
| WAV-compliance (werkvergunningen) | ONTBREEKT | Geen nationaliteit-veld, geen werkvergunning-tracking |
| Vakantiedagen/-bijslag traceerbaar | ONTBREEKT | Niet in codebase |
| CAO-inschaling traceerbaar | ONTBREEKT | Geen functiegroep of CAO-verwijzing |
| Loonstroken | ONTBREEKT | Geen loonstrook-generatie in codebase |

### 2b. Documentbeheer

| Document | Kandidaat-upload | Medewerker-portaal | Admin-review |
|---|---|---|---|
| ID-bewijs | Ja (type `id`) | Ja | Ja (goedkeuren/afkeuren) |
| CV | Ja (type `cv`) | Ja | Ja |
| KvK-uittreksel (ZZP) | Ja (type `kvk`) | Ja | Ja |
| BTW-registratie (ZZP) | Ja (type `btw`) | Ja | Ja |
| Certificaat (incl. VSH) | Ja (type `certificaat`) | Ja | Ja |
| **Verblijfsvergunning** | **Nee** | **Nee** | **Nee** |
| **Werkvergunning (TWV)** | **Nee** | **Nee** | **Nee** |
| **Loonheffingsverklaring** | **Nee** | **Nee** | **Nee** |

### 2c. SNA-claim verificatie

De privacypagina claimt: *"In het kader van onze SNA-certificering (NEN 4400-1) kunnen gegevens worden ingezien door auditoren van de Stichting Normering Arbeid."*

| Check | Status |
|---|---|
| SNA-certificaatnummer op website | ONTBREEKT |
| SNA-logo in footer | ONTBREEKT |
| Link naar SNA-register | ONTBREEKT |
| SNA-certificaatnummer in factuur-config | ONTBREEKT |

**Risico:** Als TopTalent niet daadwerkelijk SNA-gecertificeerd is, is deze claim misleidend en potentieel in strijd met de Wet oneerlijke handelspraktijken.

## 3. Wet op de Identificatieplicht (WID)

| Check | Status | Detail |
|---|---|---|
| ID-bewijs verplicht bij inschrijving | DEELS | Verplicht als upload-type, maar inschrijving kan worden afgerond zonder daadwerkelijke upload |
| ID-bewijs verificatie-workflow | AANWEZIG | Admin kan documenten goedkeuren/afkeuren |
| ID-bewijs verloopdatum tracking | DEELS | `kandidaat_documenten` heeft `verloopdatum` kolom, maar geen automatische waarschuwing |
| Blokkering bij verlopen ID | ONTBREEKT | Geen automatische blokkade bij verlopen ID |

## 4. Wet DBA (Deregulering Beoordeling Arbeidsrelaties)

| Check | Status | Detail |
|---|---|---|
| Modelovereenkomst / Zelfstandigenverklaring | ONTBREEKT | Voorwaarden benoemen ZZP-constructie maar geen modelovereenkomst in het systeem |
| Controle op schijnzelfstandigheid | ONTBREEKT | Geen assessment of checklist |
| DBA-risico-indicatoren in contract | DEELS | Contract-types omvatten `overeenkomst_van_opdracht`, voorwaarden benoemen vrije vervanging en geen werkgeversgezag |

**Risico:** TopTalent biedt zowel uitzendovereenkomsten als overeenkomsten van opdracht (ZZP) aan. De Algemene Voorwaarden zijn uitsluitend voor ZZP geschreven, terwijl het systeem ook uitzenden faciliteert. Dit creëert een Wet DBA-risico bij feitelijke controle door Belastingdienst.

---

## Bevindingen Samenvatting

| # | Bevinding | Ernst | Type |
|---|---|---|---|
| F4-01 | G-rekening niet ondersteund in factuursysteem | HOOG | CODE |
| F4-02 | Klant KvK-nummer ontbreekt (ketenregeling) | HOOG | CODE |
| F4-03 | NEN 4400-1 loonadministratie incompleet | KRITIEK | CODE+BELEID |
| F4-04 | Geen werkvergunning/nationaliteit tracking (WAV) | KRITIEK | CODE |
| F4-05 | ID-retentiebeleid ontbreekt (5 jaar na uitdienst) | HOOG | CODE |
| F4-06 | SNA-certificering claim zonder bewijs | HOOG | BELEID |
| F4-07 | Geen loonstrook-generatie | HOOG | CODE |
| F4-08 | Geen modelovereenkomst/DBA-assessment | HOOG | JURIST |
| F4-09 | Geen VBG-workflow | MIDDEL | BELEID |
| F4-10 | Geen blokkering bij verlopen ID | MIDDEL | CODE |

`LEGAL_REVIEW_REQUIRED`
