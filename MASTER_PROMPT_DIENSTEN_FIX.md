# MASTER PROMPT: Fix Diensten Zichtbaarheid (Kritiek Bug)

## PROBLEEM
Wanneer een klant een dienst aanmaakt via het klant portaal, verschijnt deze dienst NIET in het medewerker portaal en soms niet correct in het admin portaal. Dit is een van de belangrijkste functies van het platform.

## ROOT CAUSE ANALYSE

### BUG 1 (KRITIEK): Hardcoded `functie: "horeca"` bij klant aanvraag
**Bestanden:**
- `src/app/api/klant/aanvraag/route.ts` (regel 64)
- `src/app/klant/uren/KlantUrenClient.tsx` (regel 1541)

**Probleem:** Bij het nieuwe multi-functie format wordt `functie: "horeca"` hardcoded ingesteld. De werkelijke functienaam (bediening, bar, keuken, etc.) wordt in het `notities` veld gezet.

**Impact op medewerker portaal:** In `src/app/api/medewerker/diensten/route.ts` (regels 114-122) staat een backwards compatibility filter:
```typescript
if (categorieFilter.length === 0 && functieFilter.length === 0) {
  const functies = Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie];
  filteredDiensten = filteredDiensten.filter(d => {
    if (!d.functie) return true;
    return functies.includes(d.functie);
  });
}
```
Dit filtert op `medewerker.functie` (bijv. "bediening", "bar"). Omdat de klant-dienst `functie: "horeca"` heeft (geen medewerker heeft dit als functie), wordt de dienst NOOIT getoond aan medewerkers.

### BUG 2 (HOOG): Ontbrekende `plekken_totaal` en `plekken_beschikbaar`
**Bestand:** `src/app/api/klant/aanvraag/route.ts`

**Probleem:** Wanneer een klant een dienst aanmaakt, worden `plekken_totaal` en `plekken_beschikbaar` NIET gezet. Bij admin-aangemaakte diensten worden deze WEL gezet (regels 48-51 in `src/app/api/admin/diensten/route.ts`). UI componenten die deze velden gebruiken zullen 0 of null tonen.

### BUG 3 (MEDIUM): Admin portaal week-filter mist nieuwe diensten
**Bestand:** `src/app/api/admin/diensten/route.ts` (regels 17-22)

**Probleem:** De admin GET query filtert op `week` parameter. Als de admin UI standaard de huidige week toont, maar de klant een dienst aanmaakt voor volgende week, ziet de admin die niet totdat ze naar de juiste week navigeren. Dit is niet per se een bug maar kan verwarring veroorzaken.

---

## IMPLEMENTATIE PLAN

### FASE 1: Fix klant aanvraag API
**Bestand:** `src/app/api/klant/aanvraag/route.ts`

**Stap 1.1:** Fix het nieuwe multi-functie format (regels 58-81):
```typescript
// VOOR (BROKEN):
const insertData: Record<string, unknown> = {
  klant_id: klantData.id,
  klant_naam: klantData.bedrijfsnaam || null,
  functie: "horeca", // ❌ HARDCODED - medewerkers zien dit niet!
  datum,
  start_tijd,
  eind_tijd,
  aantal_nodig: functieAantal,
  locatie: locatie || null,
  uurtarief: tarief,
  status: "open",
  notities: `${functieName}${opmerkingen ? ` - ${opmerkingen}` : ''}`,
};

// NA (FIXED):
const insertData: Record<string, unknown> = {
  klant_id: klantData.id,
  klant_naam: klantData.bedrijfsnaam || null,
  functie: functieName.toLowerCase(), // ✅ Gebruik de daadwerkelijke functienaam
  datum,
  start_tijd,
  eind_tijd,
  aantal_nodig: functieAantal,
  plekken_totaal: functieAantal,           // ✅ NIEUW
  plekken_beschikbaar: functieAantal,       // ✅ NIEUW
  locatie: locatie || null,
  uurtarief: tarief,
  status: "open",
  notities: opmerkingen || null,            // ✅ Alleen opmerkingen, niet de functienaam
};
```

**Stap 1.2:** Fix het oude single-functie format (regels 82-106):
```typescript
// Voeg toe na regel 94 (status: "open"):
plekken_totaal: parseInt(aantal) || 1,        // ✅ NIEUW
plekken_beschikbaar: parseInt(aantal) || 1,    // ✅ NIEUW
```

**Stap 1.3:** Voeg categorie_id en functie_id toe voor het nieuwe format:
Bij het multi-functie format worden `categorie_id` en `functie_id` NIET gezet. Voeg lookup logic toe:
```typescript
// Voor elk item in functies_met_aantal, zoek de juiste functie_id op
if (functieName) {
  const { data: functieRef } = await supabaseAdmin
    .from('dienst_functies')
    .select('id, categorie_id')
    .ilike('naam', functieName)
    .maybeSingle();

  if (functieRef) {
    insertData.functie_id = functieRef.id;
    insertData.categorie_id = functieRef.categorie_id;
  }
}
```

### FASE 2: Fix medewerker diensten API backwards compatibility filter
**Bestand:** `src/app/api/medewerker/diensten/route.ts` (regels 113-122)

**Probleem:** Het huidige filter is te restrictief. Als een dienst een `functie` veld heeft dat niet matcht met de medewerker functie, wordt het verborgen.

**Fix:** Pas het filter aan zodat klant-aangemaakte diensten altijd zichtbaar zijn:
```typescript
// VOOR (BROKEN):
if (categorieFilter.length === 0 && functieFilter.length === 0) {
  const functies = Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie];
  filteredDiensten = filteredDiensten.filter(d => {
    if (!d.functie) return true;
    return functies.includes(d.functie);
  });
}

// NA (FIXED - Optie A: Toon alle diensten zonder filter):
// Verwijder het hele backwards compatibility blok.
// Nu het filter systeem met categorie_id/functie_id bestaat,
// is het beter om ALLE open diensten te tonen en medewerkers zelf te laten filteren.

// NA (FIXED - Optie B: Betere matching):
if (categorieFilter.length === 0 && functieFilter.length === 0) {
  const functies = Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie];
  const normalizedFuncties = functies.map((f: string) => f?.toLowerCase().trim());

  filteredDiensten = filteredDiensten.filter(d => {
    // Diensten zonder functie: altijd tonen
    if (!d.functie) return true;
    // Diensten met categorie_id/functie_id (nieuw systeem): altijd tonen
    if (d.categorie_id || d.functie_id) return true;
    // Alleen oude diensten filteren op functie match
    return normalizedFuncties.includes(d.functie?.toLowerCase().trim());
  });
}
```

**KEUZE:** Gebruik **Optie A** (verwijder het hele blok). Het is beter om alle diensten te tonen. Het filter systeem via de UI (categorie/functie dropdowns) geeft medewerkers genoeg controle. Het automatisch verbergen van diensten op basis van functie is een slechte UX — een medewerker met functie "bediening" kan misschien ook "bar" diensten doen.

### FASE 3: Fix KlantUrenClient.tsx aanvraag form
**Bestand:** `src/app/klant/uren/KlantUrenClient.tsx`

**Stap 3.1:** Verwijder hardcoded `functie: "horeca"` uit het formulier state (regel 1541):
```typescript
// VOOR:
functie: "horeca", // backwards compatibility - set to horeca

// NA:
functie: "", // Wordt gezet op basis van geselecteerde functies
```

**Stap 3.2:** In de submit handler, stuur de functie correct mee:
- Bij single functie: stuur de functienaam als `functie`
- Bij multi functie: stuur `functies_met_aantal` met correcte namen

### FASE 4: Fix bestaande data in database
**Maak een SQL migratie** om bestaande klant-aangemaakte diensten te fixen:

```sql
-- Fix diensten met hardcoded "horeca" functie die door klanten zijn aangemaakt
-- Stap 1: Zet plekken_totaal/beschikbaar voor diensten waar die ontbreken
UPDATE diensten
SET
  plekken_totaal = COALESCE(plekken_totaal, aantal_nodig, 1),
  plekken_beschikbaar = COALESCE(plekken_beschikbaar, aantal_nodig, 1)
WHERE plekken_totaal IS NULL;

-- Stap 2: Probeer functienaam te extraheren uit notities voor "horeca" diensten
-- (De functienaam staat in het notities veld vóór een eventuele " - ")
-- Dit moet handmatig gecontroleerd worden omdat de data kan variëren
-- Markeer ze eerst:
SELECT id, functie, notities, klant_naam, datum
FROM diensten
WHERE functie = 'horeca'
AND klant_id IS NOT NULL
ORDER BY created_at DESC;

-- Na review, update individueel of met een batch:
-- UPDATE diensten SET functie = 'bediening' WHERE id = '...';
```

### FASE 5: Admin portaal verbeteringen
**Bestand:** `src/app/api/admin/diensten/route.ts`

**Stap 5.1:** Voeg een optioneel `status` filter toe zodat admin kan filteren:
```typescript
const status = request.nextUrl.searchParams.get("status");
if (status) {
  query = query.eq("status", status);
}
```

**Stap 5.2:** Als er geen `week` parameter is, toon diensten vanaf vandaag (niet alle historische):
```typescript
if (week) {
  // bestaande week filter
} else {
  // Standaard: toon diensten vanaf gisteren (zodat recente ook zichtbaar zijn)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  query = query.gte("datum", yesterday.toISOString().split("T")[0]);
}
```

### FASE 6: Verificatie en testen

**Test scenario's:**
1. **Klant maakt dienst aan** → Check database: status="open", functie=correct, plekken_totaal=correct
2. **Medewerker bekijkt diensten** → Dienst van klant moet zichtbaar zijn
3. **Admin bekijkt diensten** → Dienst van klant moet zichtbaar zijn (ook als geen week filter)
4. **Medewerker meldt zich aan** → Aanmelding moet werken
5. **Bestaande admin-aangemaakte diensten** → Moeten nog steeds werken

**Verificatie queries:**
```sql
-- Check of nieuwe diensten correct worden aangemaakt
SELECT id, klant_id, klant_naam, functie, status, plekken_totaal, plekken_beschikbaar, categorie_id, functie_id, datum
FROM diensten
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check of er "horeca" diensten zijn (de bug)
SELECT COUNT(*) FROM diensten WHERE functie = 'horeca';
```

### FASE 7: Build verificatie
```bash
npm run build
```
Controleer dat er geen TypeScript errors of build errors zijn.

---

## SAMENVATTING WIJZIGINGEN

| Bestand | Actie |
|---------|-------|
| `src/app/api/klant/aanvraag/route.ts` | Fix functie, voeg plekken_totaal/beschikbaar toe, lookup functie_id |
| `src/app/api/medewerker/diensten/route.ts` | Verwijder restrictief backwards compatibility filter |
| `src/app/klant/uren/KlantUrenClient.tsx` | Verwijder hardcoded "horeca" |
| `src/app/api/admin/diensten/route.ts` | Voeg status filter toe, verbeter standaard datum filter |
| `supabase-migration-fix-diensten.sql` | Fix bestaande data in database |

## BELANGRIJK
- Maak GEEN andere wijzigingen dan hierboven beschreven
- Test na elke fase of de bestaande functionaliteit nog werkt
- Draai `npm run build` aan het einde om te verifiëren dat alles compileert
- De SQL migratie voor bestaande data moet EERST gereviewed worden voordat je het uitvoert
