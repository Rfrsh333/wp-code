# Fase 6 — Expiry Agent Specificatie

**Datum:** 2026-04-22

---

## Naam: `expiry-compliance-agent`

## Doel
Dagelijkse geautomatiseerde controle van alle vervaldatums en retentietermijnen in het TopTalent-platform. Voorkomt:
1. Inzet van medewerkers zonder geldige papieren (boetekans)
2. Contracten die ongemerkt verlopen
3. Data die langer bewaard wordt dan AVG-conform

---

## Trigger
- **Schedule:** dagelijks 06:00 UTC (`0 6 * * *`)
- **Route:** `/api/cron/expiry-compliance`
- **Auth:** `Bearer ${CRON_SECRET}`

---

## Stappen

### Stap 1: Document-expiry scan
Zoek documenten met vervaldatum binnen 60/30/7/0 dagen.

**Tabellen:**
- `medewerker_documenten` WHERE `expiry_date` IS NOT NULL
- `kandidaat_documenten` WHERE `document_expires_at` IS NOT NULL
- `certificeringen` WHERE `verloopt_op` IS NOT NULL
- `medewerkers` WHERE `werkvergunning_geldig_tot` IS NOT NULL

**Urgentie-niveaus:**
| Dagen tot expiry | Urgentie | Actie |
|-----------------|----------|-------|
| <= 0 (verlopen) | CRITICAL | Email medewerker + admin + zet `documenten_compleet = false` |
| 1-7 | HIGH | Email medewerker + admin |
| 8-30 | MEDIUM | Email medewerker |
| 31-60 | LOW | Email medewerker (eenmalig) |

**Deduplicatie:** Track `last_expiry_notification_sent_at` per document. Stuur niet opnieuw als al verstuurd in:
- CRITICAL: elke 3 dagen
- HIGH: eenmalig
- MEDIUM: eenmalig
- LOW: eenmalig

### Stap 2: Beschikbaarheid-blokkade
Als document verlopen (urgentie CRITICAL):

```sql
-- Markeer medewerker als niet-inzetbaar
UPDATE medewerkers
SET documenten_compleet = false
WHERE id IN (SELECT medewerker_id FROM medewerker_documenten
             WHERE expiry_date < CURRENT_DATE
             AND document_type IN ('id_bewijs', 'werkvergunning', 'verblijfsvergunning'))
AND documenten_compleet = true;
```

**Vereist:** `documenten_compleet` veld check in matching.ts (aanvulling op huidige C-23 filter).

### Stap 3: Contract-expiry scan
Combineer met bestaande `contract-expiry` route:

```sql
-- Actieve contracten met verlopen einddatum → status "verlopen"
UPDATE contracten SET status = 'verlopen'
WHERE status = 'actief' AND einddatum < CURRENT_DATE;

-- Verzonden contracten met verlopen onderteken-token → geannuleerd
UPDATE contracten SET status = 'geannuleerd'
WHERE status IN ('verzonden', 'bekeken')
AND onderteken_token_verloopt_at < NOW();
```

### Stap 4: Retentie-scan
Zoek documenten voorbij hun retentietermijn:

```sql
-- Documenten met verlopen bewaar_tot
SELECT id, document_type, file_path, bewaar_tot
FROM medewerker_documenten
WHERE bewaar_tot IS NOT NULL AND bewaar_tot < CURRENT_DATE;

-- Kandidaat-documenten met verlopen bewaar_tot
SELECT id, document_type, file_path, bewaar_tot
FROM kandidaat_documenten
WHERE bewaar_tot IS NOT NULL AND bewaar_tot < CURRENT_DATE;

-- CV's ouder dan 1 jaar zonder actief dienstverband
SELECT kd.id, kd.file_path, kd.uploaded_at
FROM kandidaat_documenten kd
JOIN inschrijvingen i ON kd.inschrijving_id = i.id
WHERE kd.document_type = 'cv'
AND kd.uploaded_at < NOW() - INTERVAL '1 year'
AND i.onboarding_status NOT IN ('inzetbaar', 'actief');
```

**Actie:** Markeer voor verwijdering → admin-goedkeuring vereist (geen auto-purge).

### Stap 5: Rapport genereren
Schrijf samenvatting naar admin-dashboard + Telegram-alert:

```json
{
  "datum": "2026-04-22",
  "documenten": {
    "verlopen": 3,
    "verloopt_7d": 5,
    "verloopt_30d": 12,
    "verloopt_60d": 8
  },
  "contracten": {
    "verlopen_gemarkeerd": 2,
    "tokens_geannuleerd": 1
  },
  "retentie": {
    "voorbij_bewaar_tot": 15,
    "cvs_ouder_dan_1j": 42
  },
  "blokkades": {
    "medewerkers_geblokkeerd": 3
  },
  "notificaties_verstuurd": 20
}
```

---

## Database-migratie (vereist)

```sql
-- 1. Expiry notification tracking
ALTER TABLE medewerker_documenten
  ADD COLUMN IF NOT EXISTS last_expiry_notification_at TIMESTAMPTZ;

ALTER TABLE kandidaat_documenten
  ADD COLUMN IF NOT EXISTS last_expiry_notification_at TIMESTAMPTZ;

ALTER TABLE certificeringen
  ADD COLUMN IF NOT EXISTS last_expiry_notification_at TIMESTAMPTZ;

-- 2. Index voor retentie-scan
CREATE INDEX IF NOT EXISTS idx_medewerker_doc_bewaar_tot
  ON medewerker_documenten(bewaar_tot) WHERE bewaar_tot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kandidaat_doc_bewaar_tot
  ON kandidaat_documenten(bewaar_tot) WHERE bewaar_tot IS NOT NULL;

-- 3. Index voor certificeringen expiry
CREATE INDEX IF NOT EXISTS idx_certificeringen_verloopt_op
  ON certificeringen(verloopt_op) WHERE verloopt_op IS NOT NULL;

-- 4. Index voor contract expiry
CREATE INDEX IF NOT EXISTS idx_contracten_einddatum
  ON contracten(einddatum) WHERE einddatum IS NOT NULL;

-- 5. Retentie-markeringen
ALTER TABLE medewerker_documenten
  ADD COLUMN IF NOT EXISTS retentie_markering TEXT CHECK (
    retentie_markering IN ('actief', 'verlopen_bewaar', 'klaar_voor_verwijdering', 'verwijderd')
  ) DEFAULT 'actief';

ALTER TABLE kandidaat_documenten
  ADD COLUMN IF NOT EXISTS retentie_markering TEXT CHECK (
    retentie_markering IN ('actief', 'verlopen_bewaar', 'klaar_voor_verwijdering', 'verwijderd')
  ) DEFAULT 'actief';
```

---

## Email-templates (nieuw)

| Template | Ontvanger | Trigger |
|----------|-----------|---------|
| `buildDocumentVerlooptHtml()` | Medewerker | Bestaand, hergebruiken |
| `buildDocumentVerlopenHtml()` | Medewerker + Admin | **NIEUW** — document verlopen, actie vereist |
| `buildWerkvergunningVerlooptHtml()` | Medewerker + Admin | **NIEUW** — werkvergunning-specifiek (hogere urgentie) |
| `buildContractVerlooptHtml()` | Medewerker | **NIEUW** — contract loopt af |
| `buildRetentieOverzichtHtml()` | Admin | **NIEUW** — wekelijks overzicht documenten voorbij retentietermijn |

---

## Matching.ts aanpassingen (vereist)

Huidige C-23 filter checkt alleen `id_bewijs`. Uitbreiden naar:

```typescript
// C-23+: Haal ALLE verlopen documenten op
const { data: verlopenDocs } = await supabaseAdmin
  .from("medewerker_documenten")
  .select("medewerker_id, document_type, expiry_date")
  .in("document_type", ["id_bewijs", "werkvergunning", "verblijfsvergunning"])
  .lt("expiry_date", today);

const verlopenSet = new Set(verlopenDocs?.map(d => d.medewerker_id) || []);

// C-23+: Check werkvergunning apart
const { data: verlopenWV } = await supabaseAdmin
  .from("medewerkers")
  .select("id")
  .eq("werkvergunning_nodig", true)
  .lt("werkvergunning_geldig_tot", today);

verlopenWV?.forEach(m => verlopenSet.add(m.id));

// Filter uit matching
const matches = medewerkers
  .filter(m => !verlopenSet.has(m.id))
  // ... rest van matching
```

---

## vercel.json toevoeging

```json
{
  "path": "/api/cron/expiry-compliance",
  "schedule": "0 6 * * *"
}
```

Plus de 2 orphaned crons activeren:
```json
{
  "path": "/api/cron/daily-cleanup",
  "schedule": "0 5 * * *"
}
```

(Contract-expiry wordt gemerged in expiry-compliance, niet apart nodig.)

---

## Implementatie-volgorde

1. **DB-migratie** draaien (indexes + kolommen)
2. **vercel.json** updaten (orphaned crons activeren + nieuwe cron toevoegen)
3. **Expiry-compliance route** bouwen (`/api/cron/expiry-compliance`)
4. **Email-templates** toevoegen
5. **Matching.ts** uitbreiden (werkvergunning + verblijfsvergunning check)
6. **Medewerker documenten API** uitbreiden (`expiry_date` in SELECT + in upload form)
7. **Admin dashboard widget** bouwen (verlopende documenten overzicht)
8. **Retentie-workflow** bouwen (uitdienst → bewaar_tot berekenen → markeren → admin-goedkeuring)
