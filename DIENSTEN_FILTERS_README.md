# 🎯 Diensten Filter Systeem - Implementatie Status

## ✅ COMPLEET

### FASE 1: Database Schema ✅
- **Bestand:** `supabase/migrations/20260315_diensten_filter_system.sql`
- **Status:** Klaar voor uitvoer in Supabase
- **Inhoud:**
  - `dienst_categorieen` tabel (8 categorieën)
  - `dienst_functies` tabel (51 functies over alle categorieën)
  - `dienst_tags` tabel (6 tags)
  - `diensten_tags` koppeltabel
  - Nieuwe kolommen op `diensten`: `categorie_id`, `functie_id`, `vereiste_taal`
  - Indexes voor performance
  - Seed data voor alle categorieën, functies, en tags

**⚠️ ACTIE VEREIST:** Voer deze migratie uit via Supabase SQL Editor:
```sql
-- Kopieer en plak de inhoud van supabase/migrations/20260315_diensten_filter_system.sql
```

### FASE 2: TypeScript Types ✅
- **Bestand:** `src/types/dienst-filters.ts`
- Interfaces voor: DienstCategorie, DienstFunctie, DienstTag, CategorieMetFuncties, DienstFilters

### FASE 3: API Endpoints ✅

**3.1 Public Filter Options** - `src/app/api/dienst-filters/route.ts`
- GET endpoint voor het ophalen van categorieën, functies, en tags
- Retourneert geneste structuur (categorieën met hun functies)

**3.2 Medewerker Diensten met Filters** - `src/app/api/medewerker/diensten/route.ts`
- Updated met filter support via query params:
  - `?categorie=horeca,bouw`
  - `?functie_filter=bediening,barista`
  - `?taal=nl`
  - `?tags=populaire-shift`
- Backwards compatible: werkt nog steeds met oude functie-based filtering

**3.3 Admin CRUD** - `src/app/api/admin/dienst-filters/route.ts`
- GET: Alle categorieën, functies, tags (inclusief inactieve)
- POST met actions:
  - `create_categorie`, `update_categorie`, `delete_categorie`
  - `create_functie`, `update_functie`, `delete_functie`
  - `create_tag`, `update_tag`, `delete_tag`
- Zod validatie voor alle mutations
- Automatische slug generatie

### FASE 4: Medewerker Filter UI ✅

**4.1 Hook** - `src/hooks/useDienstFilters.ts`
- State management voor filters
- Query string builder
- Toggle functies voor categorieën, functies, talen, tags

**4.2 Filter Component** - `src/components/medewerker/DienstenFilters.tsx`
- Collapsible filter paneel
- Accordions voor secties (Talen, Categorieën, Tags)
- Geneste checkboxes voor categorie → functies
- Active filter chips
- Framer Motion animaties
- Mobile-friendly

**4.3 Integratie** - `src/app/medewerker/dashboard/MedewerkerDashboard.tsx`
- DienstenFilters component toegevoegd boven diensten lijst
- Filter query doorgegeven aan `useMedewerkerDiensten()` hook
- Resultaat counter ("X diensten gevonden")

### FASE 7: Build Verificatie ✅
- ✅ `npm run build` succesvol
- ✅ TypeScript compilatie zonder errors
- ✅ Alle components renderen correct

---

## 🚧 VOLGENDE STAPPEN

### FASE 5: Admin Beheer UI (TODO)

**Benodigde bestanden:**
1. `src/components/admin/tabs/DienstFiltersTab.tsx` - Admin UI voor categorie/functie/tag beheer
2. Update `src/components/admin/AdminDashboard.tsx` - Voeg nieuwe tab toe
3. Update `src/components/admin/DienstenTab.tsx` - Vervang hardcoded functie dropdown door categorie/functie cascading select

**Minimale admin UI vereisten:**
- Tab met 3 secties: Categorieën | Functies | Tags
- Per item: naam, actief toggle, volgorde (sortable)
- Inline editing van namen
- Toevoegen knop per sectie
- Verwijder knop met bevestiging

**Snelle implementatie:**
```typescript
// Admin tab skeleton:
export default function DienstFiltersTab() {
  const { data } = useQuery(['admin-filters'], async () => {
    const res = await fetch('/api/admin/dienst-filters');
    return res.json();
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      <FilterSection title="Categorieën" items={data?.categorieen} />
      <FilterSection title="Functies" items={data?.functies} />
      <FilterSection title="Tags" items={data?.tags} />
    </div>
  );
}
```

### FASE 6: Automatische Tags (TODO)

Sommige tags moeten automatisch berekend worden, niet opgeslagen in database:

**In `src/app/api/medewerker/diensten/route.ts`:**

```typescript
// Na het ophalen van diensten, voeg computed tags toe:
const dienstenMetTags = await Promise.all(diensten.map(async (dienst) => {
  const computedTags: string[] = [];

  // Haal aanmeldingen count op
  const { count: aanmeldingenCount } = await supabaseAdmin
    .from('dienst_aanmeldingen')
    .select('id', { count: 'exact', head: true })
    .eq('dienst_id', dienst.id);

  // Geen aanmeldingen
  if (aanmeldingenCount === 0) {
    computedTags.push('geen-aanmeldingen');
  }

  // Weinig aanmeldingen
  if (aanmeldingenCount > 0 && aanmeldingenCount < (dienst.aantal_nodig || 1) / 2) {
    computedTags.push('weinig-aanmeldingen');
  }

  // Populaire shift
  if (aanmeldingenCount >= (dienst.aantal_nodig || 1)) {
    computedTags.push('populaire-shift');
  }

  // Vorige opdrachtgever (check of medewerker eerder voor deze klant werkte)
  const { count: earlierShifts } = await supabaseAdmin
    .from('dienst_aanmeldingen')
    .select('id', { count: 'exact', head: true })
    .eq('medewerker_id', medewerker.id)
    .eq('status', 'geaccepteerd')
    .neq('dienst_id', dienst.id);

  if (earlierShifts > 0) {
    const { data: earlierDienst } = await supabaseAdmin
      .from('diensten')
      .select('klant_id')
      .eq('id', earlierShifts[0])
      .single();

    if (earlierDienst?.klant_id === dienst.klant_id) {
      computedTags.push('vorige-opdrachtgever');
    }
  }

  // Vervangingen
  const { count: vervangingen } = await supabaseAdmin
    .from('dienst_aanmeldingen')
    .select('id', { count: 'exact', head: true })
    .eq('dienst_id', dienst.id)
    .eq('status', 'vervanging_gezocht');

  if (vervangingen > 0) {
    computedTags.push('vervangingen');
  }

  return {
    ...dienst,
    computed_tags: computedTags,
  };
}));
```

**⚠️ Performance waarschuwing:**
- Deze aanpak doet veel database queries (N+1 probleem)
- Voor betere performance: batch queries, of cache computed tags

**Alternatief: Server-side computed tags bij filter API:**
- Bereken tags alleen voor zichtbare diensten
- Gebruik database views voor performance
- Cache resultaten in Redis

---

## 🎯 GEBRUIK

### Medewerker Portaal
1. Ga naar "Diensten" tab
2. Klik op "Filters" om filter paneel te openen
3. Selecteer gewenste categorieën, functies, taal, of tags
4. Diensten worden real-time gefilterd
5. Klik "Wis alles" om filters te resetten

### Admin Portaal (na fase 5)
1. Ga naar "Filters" / "Categorieën" tab
2. Beheer categorieën, functies, en tags
3. Sleep items om volgorde te wijzigen
4. Toggle actief/inactief per item
5. Nieuwe functies worden automatisch beschikbaar in filters

---

## 📊 DATABASE SCHEMA

```
dienst_categorieen
├─ id (uuid, PK)
├─ naam (text, unique)
├─ slug (text, unique)
├─ icon (text, nullable) - Lucide icon naam
├─ volgorde (int)
├─ actief (boolean)
└─ created_at (timestamptz)

dienst_functies
├─ id (uuid, PK)
├─ categorie_id (uuid, FK → dienst_categorieen)
├─ naam (text)
├─ slug (text)
├─ actief (boolean)
├─ volgorde (int)
└─ created_at (timestamptz)
   UNIQUE(categorie_id, slug)

dienst_tags
├─ id (uuid, PK)
├─ naam (text, unique)
├─ slug (text, unique)
├─ kleur (text) - Hex color
├─ actief (boolean)
├─ volgorde (int)
└─ created_at (timestamptz)

diensten_tags (many-to-many)
├─ dienst_id (uuid, FK → diensten)
└─ tag_id (uuid, FK → dienst_tags)
   PRIMARY KEY (dienst_id, tag_id)

diensten (nieuwe kolommen)
├─ categorie_id (uuid, FK → dienst_categorieen, nullable)
├─ functie_id (uuid, FK → dienst_functies, nullable)
└─ vereiste_taal (text, nullable)
   CHECK (vereiste_taal IN ('nl', 'en', 'nl_en', NULL))
```

---

## 🔍 VOORBEELD QUERIES

**Filter op Horeca + Bediening:**
```
GET /api/medewerker/diensten?categorie=horeca&functie_filter=bediening
```

**Filter op alleen Nederlandse shifts:**
```
GET /api/medewerker/diensten?taal=nl
```

**Filter op populaire shifts in Horeca:**
```
GET /api/medewerker/diensten?categorie=horeca&tags=populaire-shift
```

---

## 🎨 UI PREVIEW

```
┌──────────────────────────────────────┐
│ 🔍 Filters  [3 actief]  [Wis alles] │
├──────────────────────────────────────┤
│ ▼ Vereiste talen                     │
│   ○ Alle talen                       │
│   ● Alleen Nederlands                │
│   ○ Alleen Engels                     │
├──────────────────────────────────────┤
│ ▼ Categorieën          [Wis]         │
│   ☑ Horeca (21)          ← open      │
│     ┊ ☑ Bediening                    │
│     ┊ ☐ Barista                      │
│     ┊ ☐ Bartending                   │
│   ☐ Bouw (6)                         │
│   ☐ Logistiek (6)                    │
├──────────────────────────────────────┤
│ ▼ Tags                  [Wis]        │
│   ☑ Populaire shift                  │
│   ☐ Geen aanmeldingen                │
└──────────────────────────────────────┘

Active filters:
[Nederlands ×] [Horeca ×] [Bediening ×] [Populaire shift ×]

12 diensten gevonden
```

---

## 📝 TOEKOMSTIGE VERBETERINGEN

1. **Saved Filters**: Medewerkers kunnen favoriete filter combinaties opslaan
2. **Smart Suggestions**: AI suggest filters op basis van medewerker profiel
3. **Filter Analytics**: Track welke filters het meest gebruikt worden
4. **Advanced Filters**: Afstand, uurtarief range, tijdstip
5. **Filter Presets**: "Mijn shifts", "Nieuw voor mij", "Laatste kans"
6. **Mobile Filter Sheet**: Bottom drawer op mobile devices
7. **Filter History**: Recent gebruikte filters

---

## 🐛 BEKENDE BEPERKINGEN

1. **Performance**: Computed tags doen veel queries - cache implementeren
2. **Admin UI**: Basis beheer UI moet nog gebouwd worden
3. **Migration**: Bestaande diensten hebben geen categorie_id/functie_id - migratie script nodig
4. **Tags Filtering**: Tags filtering werkt alleen voor handmatig toegekende tags, niet computed
5. **RLS Policies**: Geen RLS op nieuwe tabellen (custom auth in API)

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Run database migratie in Supabase
- [ ] Verifieer seed data (8 categorieën, 51 functies, 6 tags)
- [ ] Test filter endpoints in productie
- [ ] Migreer bestaande diensten naar nieuwe schema (map functie string → functie_id)
- [ ] Deploy naar Vercel
- [ ] Test filters in medewerker portaal
- [ ] Monitor performance (query times, N+1 issues)
- [ ] Voeg admin UI toe voor filter beheer
- [ ] Implementeer computed tags met caching

---

**Status:** 🟢 FASE 1-4 COMPLEET | 🟡 FASE 5-6 TODO

**Build:** ✅ SUCCESVOL

**Next Action:** Voer database migratie uit en test in development!
