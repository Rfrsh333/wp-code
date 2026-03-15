# Master Prompt — Diensten Filter Systeem (Medewerker Portaal)

> Kopieer de prompt hieronder en plak in je terminal met `claude --dangerously-skip-permissions`

---

```
Je bent een senior full-stack developer. Je gaat een compleet filter- en categoriesysteem bouwen voor het medewerker portaal van het TopTalent Jobs platform (Next.js 16, React 19, TypeScript 5, Supabase, Tailwind CSS 4).

BELANGRIJK:
- Breek GEEN bestaande functionaliteit
- Run `npm run build` na elke grote wijziging
- De bestaande diensten tab moet blijven werken — je VOEGT filters toe, je VERVANGT niet

---

## CONTEXT

### Huidige situatie:
- Diensten tab staat in `src/components/medewerker/DienstenTab.tsx`
- Diensten worden opgehaald via `src/app/api/medewerker/diensten/route.ts`
- Een `dienst` heeft een `functie` veld (simpele string, bijv. "bediening", "bar", "keuken")
- Er is GEEN categorie, taal, of tags systeem
- Er is GEEN filter UI in het medewerker portaal
- Admin maakt diensten aan via `src/components/admin/DienstenTab.tsx` met een dropdown van 4 functies (bediening, bar, keuken, afwas)
- De `diensten` tabel heeft GEEN kolommen voor categorie, taal, of tags

### Wat er moet komen:
1. Database tabellen voor categorieën, functies, en tags (beheerbaar vanuit admin)
2. Nieuwe kolommen op de diensten tabel (categorie_id, taal, tags)
3. Filter UI als dropdown/accordion boven de diensten lijst in het medewerker portaal
4. Admin interface om categorieën, functies, en tags te beheren
5. Admin diensten formulier updaten met de nieuwe velden

---

## FASE 1: DATABASE SCHEMA

### Stap 1.1: Maak migratie `supabase/migrations/20260315_diensten_filter_system.sql`

```sql
-- ===========================================
-- CATEGORIEËN TABEL
-- Hoofdcategorieën zoals: Bouw, Horeca, Logistiek, etc.
-- ===========================================
CREATE TABLE IF NOT EXISTS dienst_categorieen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,                              -- Optioneel: Lucide icon naam
  volgorde INT NOT NULL DEFAULT 0,        -- Voor sortering in UI
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- FUNCTIES TABEL
-- Functies binnen een categorie, bijv. Bouw → Timmerman, Stukadoor
-- ===========================================
CREATE TABLE IF NOT EXISTS dienst_functies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID NOT NULL REFERENCES dienst_categorieen(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  slug TEXT NOT NULL,
  actief BOOLEAN NOT NULL DEFAULT true,
  volgorde INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categorie_id, slug)
);

-- ===========================================
-- TAGS TABEL
-- Vrije tags voor extra filtering
-- ===========================================
CREATE TABLE IF NOT EXISTS dienst_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  kleur TEXT DEFAULT '#6B7280',           -- Hex kleur voor UI badge
  actief BOOLEAN NOT NULL DEFAULT true,
  volgorde INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- KOPPELTABEL: diensten ↔ tags (many-to-many)
-- ===========================================
CREATE TABLE IF NOT EXISTS diensten_tags (
  dienst_id UUID NOT NULL REFERENCES diensten(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES dienst_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (dienst_id, tag_id)
);

-- ===========================================
-- NIEUWE KOLOMMEN OP DIENSTEN TABEL
-- ===========================================
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES dienst_categorieen(id);
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS functie_id UUID REFERENCES dienst_functies(id);
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS vereiste_taal TEXT CHECK (vereiste_taal IN ('nl', 'en', 'nl_en', NULL));
-- nl = Alleen Nederlands, en = Alleen Engels, nl_en = beide, NULL = geen voorkeur

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_dienst_functies_categorie ON dienst_functies(categorie_id);
CREATE INDEX IF NOT EXISTS idx_diensten_categorie ON diensten(categorie_id);
CREATE INDEX IF NOT EXISTS idx_diensten_functie_id ON diensten(functie_id);
CREATE INDEX IF NOT EXISTS idx_diensten_taal ON diensten(vereiste_taal);
CREATE INDEX IF NOT EXISTS idx_diensten_tags_dienst ON diensten_tags(dienst_id);
CREATE INDEX IF NOT EXISTS idx_diensten_tags_tag ON diensten_tags(tag_id);

-- ===========================================
-- SEED DATA: Categorieën en Functies
-- ===========================================

-- Bouw
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Bouw', 'bouw', 'HardHat', 1) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Bouwhulp', 'bouwhulp', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Groenvoorziening medewerker', 'groenvoorziening-medewerker', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Schilder', 'schilder', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Stukadoor', 'stukadoor', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Timmerman', 'timmerman', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Vloerlegger', 'vloerlegger', 6)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Facilitaire dienstverlening
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Facilitaire dienstverlening', 'facilitair', 'Building2', 2) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Glazenwasser', 'glazenwasser-facilitair', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Klushulp', 'klushulp-facilitair', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Parkeerwachter', 'parkeerwachter', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Receptie medewerker', 'receptie-medewerker-facilitair', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Schoonmaak', 'schoonmaak-facilitair', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Verhuizer', 'verhuizer-facilitair', 6),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Vloerreinigingsspecialist', 'vloerreinigingsspecialist-facilitair', 7)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Horeca
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Horeca', 'horeca', 'UtensilsCrossed', 3) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Administratief medewerker', 'administratief-medewerker', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Barista', 'barista', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bartending', 'bartending', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bediening', 'bediening', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bedrijfscatering', 'bedrijfscatering', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bezorging', 'bezorging-horeca', 6),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Catering', 'catering', 7),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Festivalmedewerker', 'festivalmedewerker', 8),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Garderobe', 'garderobe', 9),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Gebruikersonderzoeken', 'gebruikersonderzoeken', 10),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Hosting', 'hosting-horeca', 11),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Housekeeping', 'housekeeping', 12),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Hulpkok', 'hulpkok', 13),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Productiemedewerker', 'productiemedewerker-horeca', 14),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Receptie medewerker', 'receptie-medewerker', 15),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Roomservice', 'roomservice', 16),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Schoonmaak', 'schoonmaak', 17),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Sitecrew - Hospitality', 'sitecrew-hospitality', 18),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Spoelkeuken medewerker', 'spoelkeuken-medewerker', 19),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Training', 'training', 20),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Zelfstandig werkend kok', 'zelfstandig-werkend-kok', 21)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Logistiek
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Logistiek', 'logistiek', 'Truck', 4) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Bezorging', 'bezorging-logistiek', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Heftruckchauffeur', 'heftruckchauffeur', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Magazijnmedewerker', 'magazijnmedewerker', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Orderpicker', 'orderpicker', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Productiemedewerker', 'productiemedewerker-logistiek', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Verhuizer', 'verhuizer-logistiek', 6)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Opleidingen
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Opleidingen', 'opleidingen', 'GraduationCap', 5) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='opleidingen'), 'Educatief Medewerker', 'educatief-medewerker', 1)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Promotie
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Promotie', 'promotie', 'Megaphone', 6) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='promotie'), 'Productpromotie', 'productpromotie', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='promotie'), 'Straatverkoper', 'straatverkoper', 2)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Retail
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Retail', 'retail', 'ShoppingBag', 7) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Allround supermarkt hulp', 'allround-supermarkt-hulp', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Hosting', 'hosting-retail', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Klantenservice', 'klantenservice', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Merchandiser', 'merchandiser', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Sitecrew', 'sitecrew-retail', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Verkoper', 'verkoper', 6),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Winkelmanager', 'winkelmanager', 7)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Vrijwilligerswerk
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Vrijwilligerswerk', 'vrijwilligerswerk', 'Heart', 8) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='vrijwilligerswerk'), 'Vrijwilligerswerk', 'vrijwilligerswerk', 1)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- ===========================================
-- SEED DATA: Tags
-- ===========================================
INSERT INTO dienst_tags (naam, slug, kleur, volgorde) VALUES
  ('Geen aanmeldingen', 'geen-aanmeldingen', '#EF4444', 1),
  ('Weinig aanmeldingen', 'weinig-aanmeldingen', '#F59E0B', 2),
  ('Populaire shift', 'populaire-shift', '#10B981', 3),
  ('Vorige opdrachtgever', 'vorige-opdrachtgever', '#6366F1', 4),
  ('In flexpool', 'in-flexpool', '#3B82F6', 5),
  ('Vervangingen', 'vervangingen', '#8B5CF6', 6)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- ENABLE REALTIME
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE dienst_categorieen;
ALTER PUBLICATION supabase_realtime ADD TABLE dienst_functies;
ALTER PUBLICATION supabase_realtime ADD TABLE dienst_tags;
```

BELANGRIJK: Voer deze migratie NIET automatisch uit. Sla het bestand op zodat de gebruiker het kan uitvoeren via Supabase SQL editor of `supabase db push`.

---

## FASE 2: TYPESCRIPT TYPES

### Stap 2.1: Maak/update `src/types/dienst-filters.ts`

```typescript
export interface DienstCategorie {
  id: string;
  naam: string;
  slug: string;
  icon: string | null;
  volgorde: number;
  actief: boolean;
}

export interface DienstFunctie {
  id: string;
  categorie_id: string;
  naam: string;
  slug: string;
  actief: boolean;
  volgorde: number;
}

export interface DienstTag {
  id: string;
  naam: string;
  slug: string;
  kleur: string;
  actief: boolean;
  volgorde: number;
}

export interface CategorieMetFuncties extends DienstCategorie {
  functies: DienstFunctie[];
}

export interface DienstFilters {
  categorieen: string[];       // categorie slugs
  functies: string[];          // functie slugs
  taal: 'nl' | 'en' | null;   // vereiste taal filter
  tags: string[];              // tag slugs
}

export const EMPTY_FILTERS: DienstFilters = {
  categorieen: [],
  functies: [],
  taal: null,
  tags: [],
};
```

---

## FASE 3: API ENDPOINTS

### Stap 3.1: Maak `src/app/api/dienst-filters/route.ts`

Publiek endpoint (of medewerker-auth beschermd) dat alle actieve categorieën, functies, en tags ophaalt:

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Haal categorieën op met hun functies
    const { data: categorieen, error: catError } = await supabaseAdmin
      .from('dienst_categorieen')
      .select('id, naam, slug, icon, volgorde')
      .eq('actief', true)
      .order('volgorde');

    if (catError) throw catError;

    const { data: functies, error: funcError } = await supabaseAdmin
      .from('dienst_functies')
      .select('id, categorie_id, naam, slug, volgorde')
      .eq('actief', true)
      .order('volgorde');

    if (funcError) throw funcError;

    const { data: tags, error: tagError } = await supabaseAdmin
      .from('dienst_tags')
      .select('id, naam, slug, kleur, volgorde')
      .eq('actief', true)
      .order('volgorde');

    if (tagError) throw tagError;

    // Groepeer functies per categorie
    const categorieenMetFuncties = categorieen?.map(cat => ({
      ...cat,
      functies: functies?.filter(f => f.categorie_id === cat.id) || [],
    })) || [];

    return NextResponse.json({
      categorieen: categorieenMetFuncties,
      tags: tags || [],
    });
  } catch (error) {
    console.error('[DIENST-FILTERS] Error:', error);
    return NextResponse.json({ error: 'Kon filters niet ophalen' }, { status: 500 });
  }
}
```

### Stap 3.2: Update `src/app/api/medewerker/diensten/route.ts`

Voeg filter query parameters toe aan de GET handler:

1. Accepteer query params: `?categorie=horeca,bouw&functie=bediening,barista&taal=nl&tags=populaire-shift`
2. Bouw de Supabase query dynamisch op:
   - Als `categorie` gezet is: filter op `categorie_id` IN (selecteer IDs uit dienst_categorieen WHERE slug IN (...))
   - Als `functie` gezet is: filter op `functie_id` IN (selecteer IDs uit dienst_functies WHERE slug IN (...))
   - Als `taal` gezet is: filter op `vereiste_taal = taal`
   - Als `tags` gezet is: filter op dienst_id IN (selecteer dienst_id uit diensten_tags WHERE tag_id IN (selecteer IDs uit dienst_tags WHERE slug IN (...)))
3. BEHOUD alle bestaande filters (functie match, status, datum >= today, etc.)
4. Voeg de categorie en functie namen toe aan de response voor display

BELANGRIJK: De bestaande `functie` string-based matching moet BLIJVEN werken voor backwards compatibility. Als een dienst nog geen `functie_id` heeft maar wel een `functie` string, moet die nog steeds gevonden worden.

### Stap 3.3: Maak Admin CRUD endpoint `src/app/api/admin/dienst-filters/route.ts`

CRUD endpoint voor admin om categorieën, functies, en tags te beheren:

- GET: Haal alle categorieën, functies, tags op (inclusief inactieve)
- POST met action:
  - `create_categorie`: naam, icon → maak categorie
  - `update_categorie`: id, naam, icon, actief, volgorde → update
  - `delete_categorie`: id → verwijder (cascade naar functies)
  - `create_functie`: categorie_id, naam → maak functie
  - `update_functie`: id, naam, actief, volgorde → update
  - `delete_functie`: id → verwijder
  - `create_tag`: naam, kleur → maak tag
  - `update_tag`: id, naam, kleur, actief → update
  - `delete_tag`: id → verwijder

Voeg Zod validatie toe (gebruik het patroon uit `src/lib/validations-admin.ts`).

---

## FASE 4: MEDEWERKER FILTER UI

### Stap 4.1: Maak `src/components/medewerker/DienstenFilters.tsx`

Dit is het hoofdcomponent — een dropdown/accordion filter paneel BOVEN de diensten lijst.

**Ontwerp:**

```
┌─────────────────────────────────────────────┐
│ 🔍 Filters  [3 actief]          [Wis alles] │
├─────────────────────────────────────────────┤
│ ▼ Vereiste talen                            │
│   ○ Alle talen                              │
│   ○ Alleen Nederlands                       │
│   ○ Alleen Engels                            │
├─────────────────────────────────────────────┤
│ ▼ Categorieën                               │
│   □ Bouw (6)                                │
│   □ Facilitaire dienstverlening (7)         │
│   □ Horeca (21)                     ← open  │
│     ┊ □ Bediening                           │
│     ┊ □ Barista                             │
│     ┊ □ Bartending                          │
│     ┊ □ ... (meer functies)                 │
│   □ Logistiek (6)                           │
│   □ Opleidingen (1)                         │
│   □ Promotie (2)                            │
│   □ Retail (7)                              │
│   □ Vrijwilligerswerk (1)                   │
├─────────────────────────────────────────────┤
│ ▼ Tags                                      │
│   □ Geen aanmeldingen   □ Populaire shift   │
│   □ Weinig aanmeldingen □ In flexpool       │
│   □ Vorige opdrachtgever □ Vervangingen     │
└─────────────────────────────────────────────┘
```

**Component gedrag:**

1. **Standaard:** Filter paneel is DICHTGEKLAPT — alleen de header "Filters" zichtbaar met badge van aantal actieve filters
2. **Klik op header:** Paneel klapt open met alle secties
3. **Elke sectie** (Talen, Categorieën, Tags) is een accordion die open/dicht kan
4. **Categorieën** zijn genest: klik op een categorie om de functies eronder te zien
5. **Checkbox selectie:**
   - Selecteer een categorie → alle functies van die categorie worden meegenomen
   - Deselecteer individuele functies → de categorie checkbox wordt "indeterminate" (half aangevinkt)
   - "Wis selectie" knop per sectie
6. **"Wis alles"** knop reset alle filters
7. **Filter changes** worden DIRECT toegepast (geen "Toepassen" knop) — de diensten lijst filtert mee
8. **Actieve filters** tonen als kleine chips onder het filter paneel (bijv. "Horeca × | Bediening × | Nederlands ×")
9. **Mobile:** Op mobile (< 768px) wordt het filter paneel een slide-down sheet

**Styling:** Gebruik Tailwind CSS classes consistent met de rest van het medewerker portaal. Kijk naar bestaande componenten voor de design tokens (kleuren, border-radius, shadows).

**Animatie:** Gebruik Framer Motion (al geïnstalleerd) voor smooth open/close transitions.

### Stap 4.2: Maak `src/hooks/useDienstFilters.ts`

Custom hook die de filter state beheert:

```typescript
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DienstFilters, CategorieMetFuncties, DienstTag } from '@/types/dienst-filters';

export function useDienstFilters() {
  const [filters, setFilters] = useState<DienstFilters>({
    categorieen: [],
    functies: [],
    taal: null,
    tags: [],
  });

  // Haal filter opties op uit database
  const { data: filterOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ['dienst-filters'],
    queryFn: async () => {
      const res = await fetch('/api/dienst-filters');
      if (!res.ok) throw new Error('Failed to fetch filters');
      return res.json() as Promise<{
        categorieen: CategorieMetFuncties[];
        tags: DienstTag[];
      }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minuten - filters veranderen niet vaak
  });

  // Toggle functies
  const toggleCategorie = useCallback((slug: string) => {
    setFilters(prev => {
      const isSelected = prev.categorieen.includes(slug);
      if (isSelected) {
        // Verwijder categorie EN alle functies van die categorie
        const categorie = filterOptions?.categorieen.find(c => c.slug === slug);
        const functieSlugs = categorie?.functies.map(f => f.slug) || [];
        return {
          ...prev,
          categorieen: prev.categorieen.filter(c => c !== slug),
          functies: prev.functies.filter(f => !functieSlugs.includes(f)),
        };
      } else {
        return { ...prev, categorieen: [...prev.categorieen, slug] };
      }
    });
  }, [filterOptions]);

  const toggleFunctie = useCallback((slug: string) => {
    setFilters(prev => ({
      ...prev,
      functies: prev.functies.includes(slug)
        ? prev.functies.filter(f => f !== slug)
        : [...prev.functies, slug],
    }));
  }, []);

  const setTaal = useCallback((taal: 'nl' | 'en' | null) => {
    setFilters(prev => ({ ...prev, taal }));
  }, []);

  const toggleTag = useCallback((slug: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(slug)
        ? prev.tags.filter(t => t !== slug)
        : [...prev.tags, slug],
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ categorieen: [], functies: [], taal: null, tags: [] });
  }, []);

  const activeFilterCount = useMemo(() => {
    return filters.categorieen.length + filters.functies.length + (filters.taal ? 1 : 0) + filters.tags.length;
  }, [filters]);

  // Bouw query string voor API
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.categorieen.length) params.set('categorie', filters.categorieen.join(','));
    if (filters.functies.length) params.set('functie_filter', filters.functies.join(','));
    if (filters.taal) params.set('taal', filters.taal);
    if (filters.tags.length) params.set('tags', filters.tags.join(','));
    return params.toString();
  }, [filters]);

  return {
    filters,
    filterOptions,
    optionsLoading,
    toggleCategorie,
    toggleFunctie,
    setTaal,
    toggleTag,
    clearAll,
    activeFilterCount,
    queryString,
  };
}
```

### Stap 4.3: Integreer filters in DienstenTab

Open `src/components/medewerker/DienstenTab.tsx`:

1. Importeer en gebruik `useDienstFilters()` hook
2. Plaats `<DienstenFilters>` component BOVEN de bestaande diensten grid
3. Geef `queryString` door aan de diensten API call (of filter client-side)
4. Toon het aantal resultaten: "12 diensten gevonden" na de filters

**Client-side vs Server-side filtering:**
- VOORKEUR: Server-side (via query params naar API) — schaalt beter
- FALLBACK: Als de API aanpassing te complex is, filter client-side in de component

### Stap 4.4: Update de diensten API query

In `src/app/api/medewerker/diensten/route.ts` of de React Query hook die de diensten ophaalt: voeg de `queryString` toe aan de fetch URL:

```typescript
// In de useQuery hook of fetch call:
const url = queryString
  ? `/api/medewerker/diensten?${queryString}`
  : '/api/medewerker/diensten';
```

---

## FASE 5: ADMIN BEHEER UI

### Stap 5.1: Maak `src/components/admin/tabs/DienstFiltersTab.tsx`

Een nieuwe admin tab voor het beheren van categorieën, functies, en tags.

**Layout:**
- 3 kolommen (of tabs): Categorieën | Functies | Tags
- Per item: naam, actief toggle, drag-to-reorder (of volgorde pijltjes)
- Toevoegen knop per sectie
- Inline editing van namen
- Verwijder knop met bevestiging

### Stap 5.2: Voeg tab toe aan AdminDashboard

In `src/components/admin/AdminDashboard.tsx`:
1. Voeg een nieuwe tab toe: "Filters" of "Categorieën"
2. Lazy load de component
3. Zet het naast de bestaande "Diensten" tab

### Stap 5.3: Update Admin Diensten Formulier

In `src/components/admin/DienstenTab.tsx`:

1. **Vervang** de hardcoded `functie` dropdown (bediening/bar/keuken/afwas) door:
   - Een `Categorie` dropdown → vult de `Functie` dropdown
   - Een `Functie` dropdown (gefilterd op geselecteerde categorie)
2. **Voeg toe:** "Vereiste taal" radio buttons (Alle / Nederlands / Engels)
3. **Voeg toe:** "Tags" multi-select checkboxes
4. **Behoud** backwards compatibility: als een dienst al een `functie` string heeft maar geen `functie_id`, toon de string

---

## FASE 6: TAGS LOGICA (Automatische tags)

Sommige tags moeten AUTOMATISCH bepaald worden, niet handmatig:

### "Geen aanmeldingen"
- Een dienst heeft dit tag als `dienst_aanmeldingen` count = 0
- Bereken dit in de API response, NIET opgeslagen in database

### "Weinig aanmeldingen"
- Een dienst heeft dit tag als aanmeldingen count < aantal_nodig / 2
- Bereken dit in de API response

### "Populaire shift"
- Een dienst heeft dit tag als aanmeldingen count >= aantal_nodig
- Bereken dit in de API response

### "Vorige opdrachtgever"
- De huidige medewerker heeft eerder voor deze klant gewerkt
- Bereken dit door te checken of er een voltooide dienst_aanmelding bestaat voor dezelfde klant

### "In flexpool"
- De medewerker staat in de flexpool van deze klant
- Dit vereist een `flexpool` tabel of kolom — als die niet bestaat, skip dit tag voorlopig

### "Vervangingen"
- De dienst zoekt een vervanging (er is een aanmelding met status "vervanging_gezocht")
- Bereken dit in de API response

Implementeer dit als computed tags in de medewerker diensten API response. De tags uit de database zijn voor HANDMATIGE tags die admin kan toewijzen.

De filter UI moet BEIDE soorten tags tonen en beide werkend filteren.

---

## FASE 7: BUILD VERIFICATIE

1. Run `npm run build` — moet zonder errors
2. Run `npx tsc --noEmit` — moet zonder errors
3. Run `npm run lint` — fix eventuele lint errors

---

## WERKWIJZE

1. **Fase 1**: Database migratie bestand aanmaken (niet uitvoeren, alleen opslaan)
2. **Fase 2**: Types aanmaken
3. **Fase 3**: API endpoints bouwen
4. **Fase 4**: Medewerker filter UI bouwen — dit is het meeste werk
5. **Fase 5**: Admin beheer UI
6. **Fase 6**: Automatische tags logica
7. **Fase 7**: Build check
8. Run `npm run build` na fase 3, 4, 5, en 7

Begin NU en werk alles af zonder te stoppen.
```
