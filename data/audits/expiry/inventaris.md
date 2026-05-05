# Fase 1 — Inventarisatie: alles met een vervaldatum

**Datum:** 2026-04-22

---

## Documenten & certificaten

| # | Categorie | Voorbeeld | Wettelijke / praktische vervaldatum | Reden bewaren / verwijderen |
|---|-----------|-----------|-------------------------------------|----------------------------|
| 1 | **ID-kopie** | Paspoort, ID-kaart | Geldigheid document zelf (5-10j) | Wet ID-plicht: bewaren tot 5j na einde dienstverband |
| 2 | **VOG** | Verklaring Omtrent Gedrag | Advies max 3-6 maanden bij indiensttreding, daarna geen verplichting vernieuwing | Inlener-eis, best practice: vernieuw bij nieuw dienstverband |
| 3 | **BHV-certificaat** | Bedrijfshulpverlening | 1 jaar na uitgifte (herhaling verplicht) | Operationeel, Arbo-wet |
| 4 | **SVH/VSH-verklaring** | Verklaring Sociale Hygiene | Onbeperkt geldig (eenmalig behaald) | Drank- en Horecawet, vereist voor bar/tap functies |
| 5 | **Werkvergunning** | TWV / GVVA (niet-EU) | Variabel, vaak 1-3 jaar | WAV: boete tot EUR 8.000 per persoon bij controle |
| 6 | **Verblijfsvergunning** | VVR | Variabel, vaak 1-5 jaar | Wet arbeid vreemdelingen |
| 7 | **Diploma's** | Koksdiploma, horecadiploma | Geen vervaldatum | Bewijs kwalificatie |
| 8 | **Allergiekaart-certificaat** | HACCP, allergenencursus | 1-3 jaar | Praktisch, NVWA-eis bij horecabedrijven |
| 9 | **Loonheffingsverklaring** | Model opgaaf gegevens loonheffingen | Geldig tot wijziging | Fiscale wet |
| 10 | **KVK-uittreksel** | Kamer van Koophandel | 3-6 maanden (actueel houden) | Commercieel, zzp-verificatie |

## Contracten & overeenkomsten

| # | Categorie | Vervaldatum | Reden bewaren / verwijderen |
|---|-----------|-------------|----------------------------|
| 11 | **Uitzendcontract** | `einddatum` per contract (Fase A/B/C) | Wettelijk: 2j na einde + 7j fiscaal |
| 12 | **Onderteken-token** | 7 dagen na verzending | Automatisch geannuleerd na verloop |
| 13 | **Klantcontract / SLA** | Per overeenkomst | Commercieel: 7j na einde samenwerking |
| 14 | **Offerte** | `geldig_tot` per offerte | Commercieel: geen bewaarplicht na verval |

## Persoonsgegevens & tokens

| # | Categorie | Vervaldatum | Reden bewaren / verwijderen |
|---|-----------|-------------|----------------------------|
| 15 | **BSN** | Alleen tijdens arbeidsrelatie + 5j fiscaal | AVG + fiscale wet |
| 16 | **Bankgegevens (IBAN)** | Geen | Bewaren tijdens dienstverband, daarna 7j fiscaal |
| 17 | **Onboarding-portal-token** | 7 dagen na aanmaak | Opgeschoond door `onboarding-cleanup` cron |
| 18 | **Medewerker-sessie** | 7 dagen (JWT), cleanup na 30 dagen | Opgeschoond door `daily-cleanup` cron |
| 19 | **CV** | 4 weken na sollicitatie, max 1j met toestemming | AVG + AP-richtlijn |
| 20 | **Inschrijving zonder follow-up** | 4 weken (AP-richtlijn) | AVG |

## Samenvatting

- **20 categorieen** met vervaldatum of retentietermijn
- **5 met wettelijke boetekans** bij verlopen: ID-kopie (#1), werkvergunning (#5), verblijfsvergunning (#6), uitzendcontract (#11), BSN (#15)
- **3 met operationeel risico**: BHV (#3), SVH/VSH (#4), allergiekaart (#8)
