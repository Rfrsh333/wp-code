# Master Prompt — Dashboard UX Redesign
## TopTalentJobs.nl | Overzichtelijker, Sneller, Mobielvriendelijk

---

## ROL & CONTEXT

Je bent een senior frontend engineer gespecialiseerd in admin dashboards en developer experience. Je werkt aan **TopTalentJobs.nl** — een horeca uitzendbureau. De stack: Next.js 14 (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS.

Het admin dashboard heeft momenteel 20+ secties en is functioneel volledig. **Niets mag kapotgaan.** Het doel van deze sessie is de UX drastisch te verbeteren: overzichtelijker, sneller bruikbaar op mobiel, en professioneler — gebaseerd op patronen van `next-shadcn-dashboard-starter` (5.5k ⭐, Kiranism/next-shadcn-dashboard-starter).

**Bestaande architectuur (behoud dit volledig):**
- `AdminShell` + `Sidebar` + `SidebarGroups` — al goed gebouwd
- `sidebar-config.ts` — 7 groepen, pinnable items, badge keys
- `AdminDashboard.tsx` — 2914 regels, bevat alle tab content
- Alle tab components zijn `dynamic()` imports

---

## WAT ABSOLUUT NIET MAG BREKEN

- ❌ Geen bestaande functionaliteit aanpassen (tabs, data fetching, form logic)
- ❌ Geen database queries aanpassen
- ❌ Geen API routes aanpassen
- ❌ Geen auth/session logic aanpassen
- ❌ Geen bestaande components verwijderen
- ✅ Alleen visuele/UX verbeteringen, nieuwe UI components toevoegen

---

## VERBETERINGEN — IN VOLGORDE UITVOEREN

### VERBETERING 1: Command Palette (Cmd+K / Ctrl+K)

**Probleem:** Met 20+ secties is het moeilijk snel te navigeren.
**Oplossing:** Voeg een command palette toe — de standaard UX oplossing voor dit probleem (gebruikt door Linear, Vercel, Notion, GitHub).

shadcn/ui heeft dit ingebouwd. Implementeer:

```bash
npx shadcn@latest add command
```

Maak `/components/navigation/CommandPalette.tsx`:
- Trigger: `Cmd+K` (Mac) / `Ctrl+K` (Windows) + een zoekknop in de header
- Toont alle sidebar items (uit `allSidebarItems` in sidebar-config.ts) doorzoekbaar
- Fuzzy search op `title` + `keywords`
- Recent bezochte tabs bovenaan
- Keyboard navigatie (↑↓ + Enter)
- Groepering: Dashboard | Recruitment | Finance | Growth | Content | System

Voeg de trigger toe aan de admin header:
```tsx
// In AdminShell header
<button onClick={() => setCommandOpen(true)} className="...">
  <Search className="w-4 h-4" />
  <span className="text-sm text-neutral-400">Zoeken...</span>
  <kbd className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">⌘K</kbd>
</button>
```

**Commit:** `feat: add command palette (Cmd+K) for quick navigation`

---

### VERBETERING 2: Mobile Bottom Navigation Bar

**Probleem:** Op mobiel is de sidebar verborgen achter een hamburger menu — te veel klikken voor dagelijks gebruik.
**Oplossing:** Vaste bottom navigation bar op mobiel met de 5 meest gebruikte secties.

Maak `/components/navigation/MobileBottomNav.tsx`:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Gauge, BriefcaseBusiness, Users, CalendarRange, MoreHorizontal } from 'lucide-react'

const bottomNavItems = [
  { id: 'overzicht', label: 'Home', icon: Gauge, tab: 'overzicht' },
  { id: 'aanvragen', label: 'Aanvragen', icon: BriefcaseBusiness, tab: 'aanvragen' },
  { id: 'inschrijvingen', label: 'Kandidaten', icon: Users, tab: 'inschrijvingen' },
  { id: 'planning', label: 'Planning', icon: CalendarRange, tab: 'planning' },
  { id: 'meer', label: 'Meer', icon: MoreHorizontal, tab: null }, // opent sidebar
]
```

- Alleen zichtbaar op `<lg` (mobiel + tablet)
- Actieve tab krijgt oranje accent + label
- "Meer" knop opent de bestaande sidebar sheet
- Badge indicators voor nieuwe items (aanvragen, inschrijvingen)
- Gebruik `safe-area-inset-bottom` voor iPhone notch

Voeg toe aan `AdminShell`:
```tsx
<>
  <Sidebar ... />
  <main ...>{children}</main>
  <MobileBottomNav activeTab={activeTab} badges={badges} onTabSelect={onTabSelect} />
</>
```

Voeg toe aan `body` in layout: `pb-16 lg:pb-0` zodat content niet achter de bar verdwijnt.

**Commit:** `feat: add mobile bottom navigation bar`

---

### VERBETERING 3: Verbeterd Overzicht (Home) Dashboard

**Probleem:** De huidige overzicht pagina heeft 4 stat cards, een onboarding funnel, en een activiteitsfeed — maar is nog vrij kaal. Er zijn geen trends (stijging/daling t.o.v. vorige week), geen quick actions, en geen prioriteiten.
**Oplossing:** Moderniseer de overzicht pagina op basis van `next-shadcn-dashboard-starter` patronen.

**Wijzig de overzicht sectie in `AdminDashboard.tsx`:**

#### 3a. Stat Cards met Trend Indicator

Vervang de huidige 4 stat cards door een herbruikbaar `StatCard` component:

Maak `/components/admin/dashboard/StatCard.tsx`:
```tsx
interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  badge?: { count: number; label: string; color: string }
  trend?: { value: number; label: string; positive: boolean } // bijv. +12% vs vorige week
  onClick?: () => void
  href?: string // tab om naar te navigeren
}
```

Features:
- Klikbaar — navigeert direct naar die tab
- Hover state met subtiele scale transform
- Trend indicator: klein pijltje omhoog/omlaag met percentage
- Badge voor nieuwe items
- Gebruik Lucide icons (geen raw SVG's meer)

#### 3b. Prioriteiten Widget — "Actie Vereist"

Vervang de huidige "Wat vraagt aandacht" sectie door een duidelijkere **actie-georiënteerde widget**:

```
┌─────────────────────────────────────────┐
│ ⚡ Actie Vereist                  Vandaag │
├─────────────────────────────────────────┤
│ 🔴 3 nieuwe aanvragen              →    │
│ 🟠 5 kandidaten wachten op docs    →    │
│ 🟡 2 uren moeten goedgekeurd       →    │
│ ✅ Geen openstaande tickets             │
└─────────────────────────────────────────┘
```

Elke rij is klikbaar en navigeert naar de relevante tab. Gebruik de bestaande `workflowAlerts` data — alleen de UI aanpassen.

#### 3c. Activiteiten Feed — Compactere Weergave

De bestaande recente activiteit feed is functioneel maar breed. Maak hem compacter:
- Max 8 items tonen
- Compact list design (geen grote cards)
- Tijdstempel rechts uitlichten: "2 min geleden", "1 uur", "gisteren"
- Platform badge (van welk kanaal: website, calculator, etc.)
- "Alle activiteit →" link onderaan

#### 3d. Snelle Acties Bar

Voeg een horizontale balk toe bovenaan de overzicht pagina:

```
[+ Nieuwe Medewerker] [+ Aanvraag verwerken] [📋 Lead toevoegen] [📅 Agenda]
```

Gebruik shadcn `Button` variant="outline" met icons.

**Commit:** `feat: modernize dashboard overview with stat cards, quick actions, and compact activity feed`

---

### VERBETERING 4: Header Verbeteringen

**Probleem:** De mobile header is minimaal.
**Oplossing:** Verbeter de admin header (die al in AdminShell/Sidebar zit).

Maak `/components/navigation/AdminHeader.tsx` (voor mobile):
- Logo / "TopTalent Admin" links
- Command palette zoekknop (uit verbetering 1) midden/rechts
- Notificatie bell icoon met badge (aantal nieuwe items totaal)
- Hamburger menu rechts (opent bestaande sidebar sheet)

Desktop header (boven de main content area):
- Breadcrumb: "Dashboard > Recruitment > Inschrijvingen"
- Pagina titel (dynamisch op basis van activeTab)
- Laatste sync tijd: "Bijgewerkt 2 min geleden" + refresh knop

**Commit:** `feat: improve admin header with breadcrumbs and notification count`

---

### VERBETERING 5: Sidebar UX Verbeteringen

De sidebar architectuur is al goed. Kleine verbeteringen:

#### 5a. Sidebar Footer Met User Info
Voeg onderaan de sidebar toe:
```
┌────────────────────────┐
│ 👤 Rachid              │
│    Admin               │
│                [Logout]│
└────────────────────────┘
```
Haal de user info op via de bestaande Supabase session.

#### 5b. Betere Badge Kleuren
Huidige badges zijn allemaal hetzelfde. Differentieer:
- Nieuwe items (aanvragen, inschrijvingen): 🔴 rood badge
- Calculator leads: 🟢 groen badge
- Berichten: 🔵 blauw badge

#### 5c. Tooltip op Collapsed State
Als de sidebar collapsed is (alleen icons), toon een tooltip met de naam bij hover. Gebruik shadcn `Tooltip`:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>{iconButton}</TooltipTrigger>
    <TooltipContent side="right">{item.title}</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Commit:** `feat: improve sidebar with user footer, better badges, and tooltips`

---

### VERBETERING 6: Responsive Tabel Layout

**Probleem:** De inline tabel code in `AdminDashboard.tsx` (aanvragen, inschrijvingen, contact tabs) is niet mobielvriendelijk — tabellen schuiven horizontaal.
**Oplossing:** Maak de tabellen adaptive.

Patroon: op mobiel (<768px) → card list view, op desktop → tabel.

Maak een herbruikbaar `ResponsiveDataView` component:

```tsx
// Op desktop: normale tabel
// Op mobiel: card-stijl lijst

interface Column<T> {
  key: keyof T
  label: string
  mobile?: boolean // toon op mobiel?
  render?: (value: T[keyof T], row: T) => React.ReactNode
}
```

Pas toe op de 3 inline tabellen in AdminDashboard.tsx (aanvragen, inschrijvingen, contact). De data fetching en state management blijven ONGEWIJZIGD — alleen de render JSX aanpassen.

**Commit:** `feat: responsive data tables with card view on mobile`

---

### VERBETERING 7: Loading & Empty States

**Probleem:** Sommige secties hebben geen duidelijke loading of lege state.
**Oplossing:** Consistente patterns door het hele dashboard.

Maak `/components/admin/dashboard/EmptyState.tsx`:
```tsx
interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}
```

Voorbeelden:
- Geen aanvragen: "Nog geen aanvragen ontvangen. Deel je website om je eerste aanvraag te krijgen."
- Geen leads: "Installeer de bookmarklet om leads te beginnen toevoegen."

Verbeter ook de `TabSkeleton` in AdminDashboard.tsx: voeg specifieke skeletons toe per tab-type (tabel skeleton vs card skeleton vs kanban skeleton).

**Commit:** `feat: consistent empty states and improved loading skeletons`

---

## PACKAGES NODIG

```bash
# shadcn command component (voor command palette)
npx shadcn@latest add command tooltip

# Geen extra npm packages nodig — alles al aanwezig
```

---

## IMPLEMENTATIE VOLGORDE

Doe elke verbetering afzonderlijk, commit na elke stap:

1. Command Palette → test op desktop
2. Mobile Bottom Nav → test op 375px (iPhone SE)
3. Overzicht page redesign → test data loading
4. Header verbeteringen → test mobile + desktop
5. Sidebar UX → test collapsed state
6. Responsive tabellen → test op 375px, 768px, 1280px
7. Loading & empty states → test met lege database

**Na elke verbetering:**
```bash
npx tsc --noEmit    # 0 TypeScript errors
npm run build       # succesvol
```

---

## DEFINITION OF DONE

✅ Command palette opent met Cmd+K, toont alle 20+ secties, keyboard navigeerbaar
✅ Op 375px is bottom navigation bar zichtbaar en functioneel
✅ Overzicht pagina toont trends, quick actions, en compacte activiteiten feed
✅ Sidebar toont user info onderaan
✅ Tabellen zijn op mobiel leesbaar zonder horizontaal scrollen
✅ Alle loading states zijn consistent
✅ 0 TypeScript errors
✅ npm run build succesvol
✅ Alle bestaande functionaliteit werkt nog exact hetzelfde
