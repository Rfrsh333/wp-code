# Document & Contract Expiry Audit — TopTalent

**Datum:** 2026-04-22
**Auditor:** Claude Opus 4.6
**Scope:** Vervaldatum-mechanismen, inplanning-blockers, AVG-retentietermijnen
**Status:** AFGEROND

---

## Executive Summary

TopTalent heeft **gedeeltelijke** expiry-infrastructuur: database-velden bestaan, cron-routes zijn gebouwd, en compliance-checks voor leeftijd/ID zijn geimplementeerd in de matching-engine. Echter, **3 kritieke cron-routes zijn niet gescheduled**, **retentietermijnen worden nergens afgedwongen**, en **medewerkers met verlopen werkvergunning kunnen worden ingepland**.

### TOP-5 Expiry-risico's

| # | Risico | Ernst | Impact |
|---|--------|-------|--------|
| 1 | **Document-expiry cron NIET gescheduled** | CRITICAL | Niemand wordt gewaarschuwd dat documenten verlopen |
| 2 | **Contract-expiry cron NIET gescheduled** | CRITICAL | Verlopen contracten behouden status "actief" |
| 3 | **Werkvergunning NIET gecheckt bij inplanning** | CRITICAL | Boete EUR 8.000+ bij inspectie SZW |
| 4 | **Medewerker kan zich aanmelden met verlopen ID** | HIGH | Zelf-aanmelding bypass auto-matching checks |
| 5 | **`expiry_date` niet gevraagd bij document-upload** | HIGH | Expiry-velden altijd NULL — monitoring onmogelijk |

### TOP-3 Retentie/AVG-gaps

| # | Gap | Ernst | Impact |
|---|-----|-------|--------|
| 1 | **Geen automatische retentie-verwijdering** | CRITICAL | Documenten oneindig bewaard — AVG-overtreding |
| 2 | **CV's niet verwijderd na 4 weken** | HIGH | AP-richtlijn overtreding voor afgewezen sollicitanten |
| 3 | **Geen recht-op-vergeten endpoint** | HIGH | GDPR Art. 17 niet volledig geimplementeerd |

### Voorstel expiry-agent (1 alinea)
Bouw een `expiry-compliance-agent` die dagelijks om 06:00 draait en 4 tabellen scant op vervaldatums (medewerker_documenten, kandidaat_documenten, certificeringen, medewerkers.werkvergunning_geldig_tot). De agent stuurt gelaagde notificaties (60d/30d/7d/verlopen) aan medewerkers en admins, blokkeert medewerkers met verlopen kritieke documenten voor inplanning, markeert verlopen contracten, en signaleert documenten voorbij hun retentietermijn voor admin-goedkeuring tot verwijdering. Zie `expiry/expiry-agent-spec.md` voor de volledige specificatie.

---

## Bevindingen per categorie

### CRITICAL (4)

#### EXP-C1: Document-expiry cron niet gescheduled
- **Locatie:** `src/app/api/cron/document-expiry/route.ts` (54 regels, werkend)
- **Probleem:** Route bestaat maar ontbreekt in `vercel.json` crons-array
- **Impact:** Medewerkers worden NOOIT gewaarschuwd dat hun ID/VOG/certificaat verloopt
- **Fix:** Toevoegen aan `vercel.json`: `{ "path": "/api/cron/document-expiry", "schedule": "0 6 * * *" }`

#### EXP-C2: Contract-expiry cron niet gescheduled
- **Locatie:** `src/app/api/cron/contract-expiry/route.ts` (54 regels, werkend)
- **Probleem:** Route bestaat maar ontbreekt in `vercel.json` crons-array
- **Impact:** Verlopen contracten behouden status "actief", signing-tokens worden niet geannuleerd
- **Fix:** Toevoegen aan `vercel.json`: `{ "path": "/api/cron/contract-expiry", "schedule": "0 6 * * *" }`

#### EXP-C3: Werkvergunning niet gecheckt bij inplanning
- **Locatie:** `src/lib/matching.ts:226-238` — checkt alleen `id_bewijs`, niet `werkvergunning`
- **Probleem:** Medewerkers met verlopen werkvergunning verschijnen in matching-resultaten
- **Impact:** WAV-boete tot EUR 8.000 per persoon bij inspectie SZW
- **Fix:** Uitbreiden filter met `werkvergunning_geldig_tot` check (zie `expiry-agent-spec.md`)

#### EXP-C4: Geen automatische retentie-verwijdering
- **Locatie:** `bewaar_tot` kolom op `medewerker_documenten` + `kandidaat_documenten`
- **Probleem:** Kolom bestaat maar wordt (a) nooit gevuld en (b) nooit gecontroleerd
- **Impact:** Documenten oneindig bewaard — AVG-overtreding
- **Fix:** Bouw retentie-scan in expiry-agent + populeer `bewaar_tot` bij uitdiensttreding

### HIGH (5)

#### EXP-H1: Zelf-aanmelding zonder document-check
- **Locatie:** `src/app/api/medewerker/diensten/route.ts` (POST action="aanmelden")
- **Probleem:** Medewerker kan zich aanmelden voor dienst zonder dat documenten gevalideerd worden
- **Impact:** Bypass van auto-matching document-checks
- **Fix:** Document-validatie toevoegen voor aanmelding

#### EXP-H2: Handmatige toewijzing zonder document-check
- **Locatie:** `src/components/admin/PlanningTab.tsx:170-180`
- **Probleem:** Admin ziet alle medewerkers met passende functie, geen expiry-indicator
- **Impact:** Admin kan onbewust medewerker met verlopen ID inplannen
- **Fix:** Document-status indicator in PlanningTab + waarschuwing

#### EXP-H3: `expiry_date` niet gevraagd bij upload
- **Locatie:** `src/app/api/medewerker/documenten/route.ts` (POST) + `src/app/api/kandidaat/documenten/route.ts` (POST)
- **Probleem:** Upload-endpoints accepteren `file` + `document_type` maar niet `expiry_date`
- **Impact:** Expiry-velden altijd NULL — monitoring onmogelijk
- **Fix:** `expiry_date` parameter toevoegen aan upload-endpoints

#### EXP-H4: CV's niet verwijderd na 4 weken
- **Probleem:** Geen automatische cleanup van CV's van afgewezen kandidaten
- **Impact:** AP-richtlijn overtreding
- **Fix:** Retentie-scan in expiry-agent voor `document_type = 'cv'`

#### EXP-H5: VSH-check niet aangeroepen in matching
- **Locatie:** `src/lib/compliance/arbeidstijden.ts:168-180` — functie bestaat maar niet aangeroepen
- **Probleem:** `valideerVSHVoorFunctie()` wordt niet gecalled in `calculateMatchScore()`
- **Impact:** Medewerker zonder SVH kan bar-functie uitvoeren — overtreding Drank- en Horecawet
- **Fix:** Aanroepen in matching + VSH-status ophalen uit `certificeringen` tabel

### MEDIUM (4)

#### EXP-M1: Daily-cleanup cron niet gescheduled
- **Locatie:** `src/app/api/cron/daily-cleanup/route.ts`
- **Probleem:** Route ontbreekt in `vercel.json` — verlopen diensten/sessies niet opgeschoond
- **Fix:** Toevoegen aan `vercel.json`: `{ "path": "/api/cron/daily-cleanup", "schedule": "0 5 * * *" }`

#### EXP-M2: Medewerker API retourneert `expiry_date` niet
- **Locatie:** `src/app/api/medewerker/documenten/route.ts:17`
- **Probleem:** SELECT mist `expiry_date` — frontend kan expiry niet tonen
- **Fix:** `expiry_date` toevoegen aan SELECT

#### EXP-M3: Certificeringen niet in expiry-monitoring
- **Locatie:** `src/app/api/cron/document-expiry/route.ts`
- **Probleem:** Cron scant alleen `medewerker_documenten`, niet `certificeringen.verloopt_op`
- **Fix:** Uitbreiden met query op `certificeringen` tabel

#### EXP-M4: Geen admin-dashboard voor verlopende documenten
- **Probleem:** Geen widget die verlopende docs/certificaten/werkvergunningen toont
- **Fix:** Bouw expiry-overzicht component in admin-dashboard

### LOW (2)

#### EXP-L1: Geen index op `contracten.einddatum`
- **Fix:** `CREATE INDEX idx_contracten_einddatum ON contracten(einddatum) WHERE einddatum IS NOT NULL`

#### EXP-L2: Document-expiry cron stuurt elke dag opnieuw
- **Probleem:** Geen deduplicatie — medewerker krijgt dagelijks dezelfde mail
- **Fix:** Track `last_expiry_notification_at` per document

---

## Wat WEL werkt

| Mechanisme | Status | Locatie |
|------------|--------|---------|
| C-23: Verlopen ID filtert uit auto-matching | ACTIEF | `matching.ts:226-238` |
| C-11: Alcoholwet (bar <18) | ACTIEF | `arbeidstijden.ts:138-145` |
| C-12: Nachtwerk <18 | ACTIEF | `arbeidstijden.ts:147-159` |
| C-14: Max dienst 12u | ACTIEF | `arbeidstijden.ts:191-214` |
| C-15: Pauze-validatie | ACTIEF | `arbeidstijden.ts:245-275` |
| C-18: `berekenBewaarTot()` helper | CODE BESTAAT | `arbeidstijden.ts:290-294` |
| Onboarding-token cleanup | GESCHEDULED | `vercel.json` + cron route |
| Document-reminder (onboarding) | GESCHEDULED | `vercel.json` + cron route |
| Contract onderteken-token (7d) | BIJ VERZENDING | `admin/contracten` route |
| Medewerker kan eigen docs verwijderen | ACTIEF | `medewerker/documenten` DELETE |
| Frontend toont expiry-status | ACTIEF | `DocumentenPage.tsx:158-170` |

---

## Voorgestelde DB-migratie (NIET UITGEVOERD)

```sql
-- Notificatie-tracking
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS last_expiry_notification_at TIMESTAMPTZ;
ALTER TABLE kandidaat_documenten ADD COLUMN IF NOT EXISTS last_expiry_notification_at TIMESTAMPTZ;
ALTER TABLE certificeringen ADD COLUMN IF NOT EXISTS last_expiry_notification_at TIMESTAMPTZ;

-- Indexes voor expiry-scans
CREATE INDEX IF NOT EXISTS idx_certificeringen_verloopt_op ON certificeringen(verloopt_op) WHERE verloopt_op IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracten_einddatum ON contracten(einddatum) WHERE einddatum IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medewerker_doc_bewaar_tot ON medewerker_documenten(bewaar_tot) WHERE bewaar_tot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kandidaat_doc_bewaar_tot ON kandidaat_documenten(bewaar_tot) WHERE bewaar_tot IS NOT NULL;

-- Retentie-markeringen
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS retentie_markering TEXT DEFAULT 'actief'
  CHECK (retentie_markering IN ('actief', 'verlopen_bewaar', 'klaar_voor_verwijdering', 'verwijderd'));
ALTER TABLE kandidaat_documenten ADD COLUMN IF NOT EXISTS retentie_markering TEXT DEFAULT 'actief'
  CHECK (retentie_markering IN ('actief', 'verlopen_bewaar', 'klaar_voor_verwijdering', 'verwijderd'));
```

---

## Deliverables

| # | Bestand | Status |
|---|---------|--------|
| 1 | `data/audits/expiry-audit-2026-04-22.md` | Dit bestand |
| 2 | `data/audits/expiry/inventaris.md` | Fase 1: 20 categorieen |
| 3 | `data/audits/expiry/db-veld-coverage.md` | Fase 2: 16 velden geanalyseerd |
| 4 | `data/audits/expiry/automatisering-status.md` | Fase 3: 3 orphaned crons |
| 5 | `data/audits/expiry/inplanning-blockers.md` | Fase 4: 5 ontbrekende checks |
| 6 | `data/audits/expiry/retentie-status.md` | Fase 5: 7 retentie-gaps |
| 7 | `data/audits/expiry/expiry-agent-spec.md` | Fase 6: volledige agent-spec |

---

## Telling

| Ernst | Aantal |
|-------|--------|
| CRITICAL | 4 |
| HIGH | 5 |
| MEDIUM | 4 |
| LOW | 2 |
| **Totaal** | **15** |
