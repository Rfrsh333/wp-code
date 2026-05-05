# Fase 2 — Database-veld coverage per categorie

**Datum:** 2026-04-22

---

## Coverage matrix

| # | Categorie | Tabel | Expiry-veld | Gevuld? | Index? | Status |
|---|-----------|-------|-------------|---------|--------|--------|
| 1 | ID-kopie medewerker | `medewerker_documenten` | `expiry_date` (DATE) | Optioneel, vaak NULL bij handmatige upload | `idx_medewerker_documenten_expiry` (partial) | PARTIAL |
| 2 | ID-kopie kandidaat | `kandidaat_documenten` | `document_expires_at` (DATE) | Optioneel, upload-form vraagt het NIET | `idx_kandidaat_documenten_expiry` (partial) | PARTIAL |
| 3 | VOG | `medewerker_documenten` | `expiry_date` (DATE) | Geen apart type, deelt veld met #1 | Zie #1 | PARTIAL |
| 4 | SVH/VSH | `certificeringen` | `verloopt_op` (DATE) | Optioneel | Geen index | WEAK |
| 5 | BHV | `certificeringen` | `verloopt_op` (DATE) | Optioneel | Geen index | WEAK |
| 6 | Werkvergunning | `medewerkers` | `werkvergunning_geldig_tot` (DATE) | Optioneel | `idx_medewerkers_werkvergunning` (composite) | PARTIAL |
| 7 | Verblijfsvergunning | `medewerker_documenten` | `expiry_date` (DATE) | Deelt veld met #1 | Zie #1 | PARTIAL |
| 8 | Uitzendcontract | `contracten` | `einddatum` (DATE) | Optioneel bij aanmaak | Geen dedicated index | PARTIAL |
| 9 | Onderteken-token | `contracten` | `onderteken_token_verloopt_at` (TIMESTAMPTZ) | Gezet bij verzending (+7d) | Geen dedicated index | OK |
| 10 | Offerte | `offertes` | `geldig_tot` (TIMESTAMPTZ) | Optioneel | Geen index | WEAK |
| 11 | Onboarding-token | `inschrijvingen` | `onboarding_portal_token_expires_at` (TIMESTAMPTZ) | Gezet bij aanmaak | `idx_inschrijvingen_portal_token` | OK |
| 12 | Retentie medewerker-docs | `medewerker_documenten` | `bewaar_tot` (DATE) | Altijd NULL — nooit gepopuleerd | Geen index | MISSING |
| 13 | Retentie kandidaat-docs | `kandidaat_documenten` | `bewaar_tot` (DATE) | Altijd NULL — nooit gepopuleerd | Geen index | MISSING |
| 14 | Datum uit dienst | `medewerkers` | `datum_uit_dienst` (DATE) | Optioneel | Geen index | WEAK |
| 15 | CV (sollicitant) | `kandidaat_documenten` | Geen dedicated expiry | N.v.t. | N.v.t. | MISSING |
| 16 | Sessie-tokens | `medewerker_sessies` | `created_at` (cleanup na 30d) | Altijd gezet | N.v.t. | OK |

## Samenvatting

| Status | Aantal | Betekenis |
|--------|--------|-----------|
| **OK** | 3 | Veld + vulling + index/cleanup aanwezig |
| **PARTIAL** | 6 | Veld bestaat maar wordt inconsistent gevuld of mist index |
| **WEAK** | 4 | Veld bestaat maar nooit gevuld of geen index |
| **MISSING** | 3 | Geen veld of nooit gepopuleerd terwijl het er wel is |

## Kritieke gaps

### GAP-DB-1: `expiry_date` wordt niet gevraagd bij upload (CRITICAL)
- **Medewerker documenten upload** (`/api/medewerker/documenten` POST): accepteert `file` + `document_type`, maar NIET `expiry_date`
- **Kandidaat documenten upload** (`/api/kandidaat/documenten` POST): accepteert `file` + `document_type`, maar NIET `document_expires_at`
- **Gevolg**: expiry-velden bestaan in DB maar zijn altijd NULL tenzij admin handmatig invult

### GAP-DB-2: `bewaar_tot` nooit gepopuleerd (HIGH)
- Kolom `bewaar_tot` bestaat op beide documenten-tabellen (migratie nl-compliance)
- Wordt nergens in code gezet — geen enkele INSERT/UPDATE schrijft naar `bewaar_tot`
- Functie `berekenBewaarTot()` bestaat in `arbeidstijden.ts:290` maar wordt nergens aangeroepen

### GAP-DB-3: `certificeringen.verloopt_op` niet in expiry-cron (HIGH)
- De `document-expiry` cron checkt alleen `medewerker_documenten.expiry_date`
- `certificeringen.verloopt_op` (BHV, SVH, allergiekaart) wordt nergens gemonitord

### GAP-DB-4: Medewerker API retourneert `expiry_date` niet (MEDIUM)
- `/api/medewerker/documenten` GET select: `id, medewerker_id, document_type, file_name, file_path, file_url, file_size, uploaded_at`
- `expiry_date` ontbreekt — medewerker-portaal kan expiry niet tonen
- **NB**: Frontend `DocumentenPage.tsx` toont WEL expiry als het veld er zou zijn

### GAP-DB-5: Geen index op `contracten.einddatum` (LOW)
- Contract-expiry cron filtert op `einddatum < today` zonder index
- Bij kleine volumes geen probleem, maar index is best practice
