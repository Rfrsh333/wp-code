# Fase 2: Data-model Matrix

**Datum:** 2026-04-22
**Scope:** Database schema, migraties, API routes, Zod-validatieschema's
**Status:** `LEGAL_REVIEW_REQUIRED`

---

## 1. Per Kandidaat / Medewerker (Loonadministratie)

| Veld | Verplicht door | Status | Waar gevonden | Opmerkingen |
|---|---|---|---|---|
| Voornaam | Wet LB, identificatie | AANWEZIG | `inschrijvingen.voornaam`, `medewerkers.voornaam` | Verplicht bij inschrijving |
| Achternaam | Wet LB, identificatie | AANWEZIG | `inschrijvingen.achternaam`, `medewerkers.achternaam` | Verplicht bij inschrijving |
| Tussenvoegsel | Wet LB | AANWEZIG | `inschrijven/route.ts:64` | Optioneel, correct |
| Adres | Art. 28 Wet LB | DEELS | `medewerkers.adres` | Enkelvoudig tekstveld, niet gesplitst. Niet verplicht bij inschrijving. |
| Postcode | Art. 28 Wet LB | DEELS | `medewerkers.postcode` | Bestaat maar optioneel |
| Woonplaats | Art. 28 Wet LB | AANWEZIG | `inschrijvingen.stad`, `medewerkers.stad`/`woonplaats` | OK |
| Geboortedatum | Art. 28 Wet LB | AANWEZIG | `inschrijvingen.geboortedatum` | Verplicht bij inschrijving |
| **Geboorteplaats** | Art. 28 Wet LB | **ONTBREEKT** | Nergens als databaseveld | Wettelijk verplicht voor loonaangifte |
| BSN | Art. 28 Wet LB, SUWI | DEELS | `medewerkers.bsn` in validatie-schema, `bsn_geverifieerd` (boolean) | Geen bevestigde migratie die `bsn` kolom aanmaakt. Geen controle op bestaande arbeidsrelatie (art. 46 UAVG). |
| Kopie ID (WID) | WID art. 1, Wet LB art. 29 | AANWEZIG | `kandidaat_documenten` + `medewerker_documenten` tabellen | Review-workflow aanwezig. GEEN automatische retentie (5 jaar na uitdienst). |
| IBAN | Loonadministratie | AANWEZIG | `medewerkers.iban` | Optioneel |
| **Loonheffingskorting** | Art. 27 lid 2 Wet LB | **ONTBREEKT** | Nergens | Wettelijk verplicht. Volledig ontbrekend. |
| **Anoniemenheffing** | Art. 26b Wet LB | **ONTBREEKT** | Nergens | Geen logica voor 52% tarief bij ontbreken BSN/ID |
| Datum in-dienst | Art. 28 Wet LB | DEELS | `contracten.startdatum` | Niet als veld op `medewerkers` |
| Datum uit-dienst | Art. 28 Wet LB | DEELS | `contracten.einddatum` | Geen uitdiensttreding-workflow |
| **Nationaliteit** | WAV, NEN 4400-1 | **ONTBREEKT** | Nergens | Verplicht voor werkvergunning-check |
| Geslacht | Loonaangifte | DEELS | `inschrijvingen.geslacht` | Niet doorgezet naar `medewerkers` |

## 2. Per Dienst / Uitzending

| Veld | Verplicht door | Status | Waar gevonden | Opmerkingen |
|---|---|---|---|---|
| Inlener (klant) | ABU-cao, WAADI | AANWEZIG | `diensten.klant_naam`, `diensten.klant_id` FK | OK |
| **Klant KvK-nummer** | Ketenregeling, NEN 4400-1 | **ONTBREEKT** | Niet in klanten-tabel | Nodig voor ketenregeling en inlenersaansprakelijkheid |
| **Klant BTW-nummer** | Factuurvereisten, BTW | **ONTBREEKT** | Niet in klanten-tabel | Verplicht voor facturering |
| **Klant adresgegevens** | Art. 35a Wet OB | **ONTBREEKT** | Klant-registratie slaat alleen bedrijfsnaam, contactpersoon, email, telefoon op | Verplicht op facturen |
| Functie | ABU-cao | AANWEZIG | `diensten.functie` | Beperkte set: bediening, bar, keuken, afwas, gastheer |
| **Functiegroep (cao)** | ABU-cao art. 19-22 | **ONTBREEKT** | Nergens | Nodig voor correcte loontrede |
| Uurloon | ABU-cao | DEELS | `diensten.uurtarief` | Dit is klanttarief, NIET medewerker-loon |
| **Toeslagen** | ABU-cao, Arbeidstijdenwet | **ONTBREEKT** | Nergens | Geen toeslag-berekening voor avond/nacht/weekend |
| Gewerkte uren | Wet LB, ABU-cao | AANWEZIG | `uren_registraties` met begin/eind/pauze | Goed geimplementeerd |
| Werklocatie | ABU-cao, Arbowet | AANWEZIG | `diensten.locatie` | Vrij tekstveld |

## 3. Per Factuur

| Veld | Verplicht door | Status | Waar gevonden |
|---|---|---|---|
| Factuurnummer (doorlopend) | Art. 35a Wet OB | AANWEZIG | `facturen.factuur_nummer` met UNIQUE INDEX |
| Factuurdatum | Art. 35a Wet OB | AANWEZIG | `facturen.created_at` |
| KvK TopTalent | Art. 35a Wet OB | AANWEZIG | `factuur-config.ts` |
| BTW TopTalent | Art. 35a Wet OB | AANWEZIG | `factuur-config.ts` |
| Bedrijfsnaam + adres TopTalent | Art. 35a Wet OB | AANWEZIG | `factuur-config.ts` |
| Klant bedrijfsnaam | Art. 35a Wet OB | AANWEZIG | Op PDF |
| **Klant adres** | Art. 35a Wet OB | **ONTBREEKT** | Niet op PDF, niet in klanten-tabel |
| BTW-percentage | Art. 35a Wet OB | AANWEZIG | 21% hardcoded |
| BTW-bedrag | Art. 35a Wet OB | AANWEZIG | Correct berekend |
| Subtotaal + totaal | Art. 35a Wet OB | AANWEZIG | OK |
| **BTW verlegd** | Art. 12 lid 5 Wet OB | **ONTBREEKT** | Geen logica of veld |
| Periode | Art. 35a Wet OB | AANWEZIG | `periode_start`, `periode_eind` |
| Factuurregels | Art. 35a Wet OB | AANWEZIG | `factuur_regels` tabel |
| IBAN | Gebruikelijk | AANWEZIG | Op PDF |
| Betalingstermijn | Art. 6:119a BW | AANWEZIG | 14 dagen default |

## 4. Kritieke Ontbrekende Velden -- Prioriteit

### HOOG (blokkerend voor correcte loon-/belastingaangifte)

1. **Loonheffingskorting ja/nee** -- Verplicht per Wet LB art. 27
2. **Anoniemenheffing indicator** -- Als BSN/ID ontbreekt, 52% inhouden
3. **Geboorteplaats** -- Verplicht voor loonaangifte
4. **Klant adresgegevens** -- Ontbreken in DB en op facturen (BTW-wet)
5. **Toeslagen** -- Geen registratie voor onregelmatige uren (ABU-cao)
6. **Functiegroep / cao-inschaling** -- Ontbreekt (ABU-cao)
7. **Nationaliteit / werkvergunning-status** -- Ontbreekt (WAV, NEN 4400-1)

### MIDDEL

8. **BSN als expliciet databaseveld** -- Geen bevestigde migratie
9. **Klant KvK-nummer** -- Ontbreekt (ketenregeling)
10. **Klant BTW-nummer** -- Ontbreekt (BTW-verlegging)
11. **BTW-verleggingsregel** -- Geen logica op facturen
12. **Datum in-/uit-dienst op medewerkerniveau** -- Alleen in contractsysteem
13. **ID-bewijs retentiebeleid** -- Geen automatische verwijdering na 5 jaar
14. **Medewerker bruto-uurloon vs. klanttarief** -- Slechts 1 tarief

### LAAG

15. **Geslacht doorzetten naar medewerkers** -- Wordt niet overgenomen
16. **Vakantiedagen/-bijslag tracking** -- Niet in codebase
17. **Pensioengegevens (StiPP)** -- Niet in codebase

---

`LEGAL_REVIEW_REQUIRED`
