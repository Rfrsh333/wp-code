# Master Prompt — TopTalent Hub YoungOnes-Style Redesign
## TopTalentJobs.nl | Dark Mode · Shift Marketplace · Oranje Accent · Native App Feel

---

## ROL & CONTEXT

Je bent een senior mobile-first frontend engineer. Je redesignt het **TopTalent Hub van TopTalentJobs.nl** naar een design dat geïnspireerd is op de YoungOnes app — een gig-platform voor horeca flexwerkers.

**Doel:** Combineer het visuele layout van YoungOnes (donker, premium, foto-rijke kaarten, 4-tab nav) met de bestaande TopTalentJobs merkidentiteit (**oranje `#F27501` als primaire kleur**) en alle bestaande én geplande functionaliteiten.

**BELANGRIJK:** De accent/CTA kleur is **oranje `#F27501`** — NIET teal zoals bij YoungOnes. TopTalentJobs oranje is de merkkleur en moet overal terugkomen waar YoungOnes teal/cyan gebruikt.

**Stack:** Next.js 14 (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS, Framer Motion, next-themes.

**Referentie repos:**
- `pacocoursey/next-themes` (4.1k ⭐) — dark/light mode toggle
- `Temzasse/react-modal-sheet` (2.4k ⭐) — bottom sheets
- `shadcn/ui` — component basis, dark mode CSS variables
- `Kiranism/next-shadcn-dashboard-starter` (5.5k ⭐) — layout patronen

---

## YOUNGONES DESIGN ANALYSE (uit screenshots)

### Kleurenpalet
| Element | YoungOnes | TopTalent Implementatie |
|---------|-----------|------------------------|
| Achtergrond | True black `#000000` | `#000000` (dark) / `#f2f2f7` (light) |
| Cards | Donkergrijs `#1c1c1e` | `#1c1c1e` (dark) / `#ffffff` (light) |
| Card hover/secondary | `#2c2c2e` | `#2c2c2e` (dark) / `#f9f9f9` (light) |
| **Accent/CTA kleur** | Teal/cyan (YoungOnes) | **Oranje `#F27501`** voor knoppen + active states |
| Bedrijfsnaam | Teal (YoungOnes) | **Oranje `#F27501`** |
| Prijzen/bedragen | Wit bold | `text-white font-bold` |
| Tags | Roze/magenta badge | `#F27501` oranje voor "Speciaal voor jou" |
| Sterren | Goud `#f59e0b` | `#f59e0b` voor ratings |
| Tekst primair | Wit `#ffffff` | `#ffffff` (dark) / `#1c1c1e` (light) |
| Tekst secundair | Grijs `#9ca3af` | `#9ca3af` (dark) / `#6c6c70` (light) |

### Typografie
```
Headers:     ALL CAPS, bold, tracking-wider (bijv. "VIND JOUW DIENST", "MIJN DIENSTEN")
Titels:      Semibold, 17-20px, wit
Subtekst:    Regular, 14-15px, grijs
Prijzen:     Bold, 20px, wit, rechts uitgelijnd
Bedrijfsnaam: Semibold, 15px, oranje #F27501
```

### Layout Patronen
```
Bottom nav:     4 tabs (vast, met labels)
Active tab:     Oranje lijn bovenaan + oranje icon/label
Sub-tabs:       Horizontale tabs met oranje underline indicator
Cards:          Afbeelding bovenaan + content blok eronder
Buttons:        Rounded-xl, oranje achtergrond, zwarte tekst
Settings:       Gegroepeerde rijen met chevrons (iOS Settings-stijl)
Filter:         Full-screen bottom sheet met sticky CTA
```

---

## DESIGN SYSTEEM

### Kleurenpalet — globals.css

```css
:root {
  /* Light mode */
  --bg-page: #f2f2f7;
  --bg-card: #ffffff;
  --bg-card-secondary: #f9f9f9;
  --bg-card-grouped: #ffffff;
  --text-primary: #1c1c1e;
  --text-secondary: #6c6c70;
  --text-tertiary: #aeaeb2;
  --border-color: rgba(0, 0, 0, 0.08);
  --accent: #F27501;           /* TopTalent oranje — primaire merk kleur */
  --accent-dark: #d96800;
  --accent-light: #fff3e6;
  --tag-special: #F27501;      /* Oranje "Speciaal voor jou" badge */
  --stars: #f59e0b;            /* Goud voor sterren */
  --glass-bg: rgba(255, 255, 255, 0.72);
}

.dark {
  /* Dark mode — YoungOnes style */
  --bg-page: #000000;          /* True black */
  --bg-card: #1c1c1e;
  --bg-card-secondary: #2c2c2e;
  --bg-card-grouped: #1c1c1e;
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --text-tertiary: #6b7280;
  --border-color: rgba(255, 255, 255, 0.08);
  --accent: #F27501;
  --accent-dark: #d96800;
  --accent-light: rgba(242, 117, 1, 0.15);
  --tag-special: #F27501;
  --stars: #f59e0b;
  --glass-bg: rgba(28, 28, 30, 0.85);
}
```

### Dark/Light Mode Toggle — behouden

Dark mode is de standaard (medewerkers werken 's avonds), maar de **licht/donker toggle uit de SUPER master prompt blijft behouden**. Medewerkers kunnen zelf schakelen. De zon/maan toggle component (`ThemeToggle.tsx`) wordt meegenomen en is te vinden in Account → "Donkere modus".

```tsx
// In ThemeProvider:
<ThemeProvider
  attribute="class"
  defaultTheme="dark"        // dark als standaard
  enableSystem={false}
  storageKey="toptalent-theme"
>
```

**Beide modi moeten er goed uitzien.** Alle componenten gebruiken CSS variabelen (`var(--bg-card)`, `var(--text-primary)`, etc.) die automatisch schakelen. De oranje accent kleur (`#F27501`) blijft in beide modi hetzelfde — oranje werkt goed op zowel zwart als wit.

---

## BOTTOM NAVIGATION — 4 TABS (YoungOnes style)

De huidige TopTalent Hub heeft 9 tabs. YoungOnes heeft er maar 4. Herstructureer naar **4 primaire tabs** met sub-navigatie:

```
┌────────────────────────────────────────────────────┐
│  🔍 Ontdekken    📋 Mijn diensten   🕐 Uren    👤 Account  │
│      (oranje)                                         │
└────────────────────────────────────────────────────┘
```

### Tab mapping

| Bottom tab | Wat erin zit | Bestaande tabs die erin opgaan |
|------------|-------------|-------------------------------|
| **Ontdekken** | Shift feed + filters (nieuw!) | diensten (beschikbare aanbiedingen) |
| **Mijn diensten** | Sub-tabs: Aangeboden / Geaccepteerd / Archief | diensten (mijn shifts), beschikbaarheid |
| **Uren** | Uren invullen + uren status + financieel | uren, financieel |
| **Account** | Profiel, ID kaart, documenten, berichten, referral, settings | profiel, documenten, berichten, referral |

### Component `/components/medewerker/YoungOnesBottomNav.tsx`

```tsx
'use client'

import { motion } from 'framer-motion'
import { Search, Briefcase, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'ontdekken', label: 'Ontdekken', icon: Search },
  { id: 'mijn-diensten', label: 'Mijn diensten', icon: Briefcase },
  { id: 'uren', label: 'Uren', icon: Clock },
  { id: 'account', label: 'Account', icon: User },
]

export function YoungOnesBottomNav({
  activeTab,
  onTabChange,
  badges,
}: {
  activeTab: string
  onTabChange: (id: string) => void
  badges?: Record<string, number>
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--bg-page)] border-t border-[var(--border-color)] safe-bottom">
      <div className="flex h-[49px]">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              {/* Oranje indicator lijn bovenaan — YoungOnes style */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-4 right-4 h-[2px] bg-[var(--accent)] rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <div className="relative">
                <tab.icon
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
                  )}
                />
                {badges?.[tab.id] && badges[tab.id] > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {badges[tab.id]}
                  </span>
                )}
              </div>

              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
              )}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

**Commit:** `feat: add YoungOnes-style 4-tab bottom navigation`

---

## TAB 1: ONTDEKKEN — Shift Marketplace Feed

Dit is het hart van de app. Medewerkers scrollen door beschikbare shifts als een marketplace feed, vergelijkbaar met YoungOnes "VIND JOUW KLUS".

### Header

```tsx
// Bold uppercase header + zoek icoon
<div className="flex items-center justify-between px-4 pt-4 pb-2">
  <h1 className="text-2xl font-bold tracking-wider uppercase text-[var(--text-primary)]">
    Vind jouw dienst
  </h1>
  <button className="w-10 h-10 rounded-full bg-[var(--bg-card-secondary)] flex items-center justify-center">
    <Search className="w-5 h-5 text-[var(--text-secondary)]" />
  </button>
</div>
```

### Filter balk (horizontaal scrollbaar)

```tsx
// Net als YoungOnes: horizontale pill buttons
<div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
  <button
    onClick={() => setFilterOpen(true)}
    className="flex items-center gap-1.5 bg-[var(--accent)] text-black px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0"
  >
    <SlidersHorizontal className="w-4 h-4" />
  </button>
  <FilterPill label="Snelle filters" hasDropdown />
  <FilterPill label="Tijden" hasDropdown />
  <FilterPill label="Uurtarief" hasDropdown />
  <FilterPill label="Afstand" hasDropdown />
</div>
```

### Shift Card — YoungOnes style met bedrijfsfoto

```tsx
// /components/medewerker/ShiftCard.tsx

export function ShiftCard({ shift, onFavorite, onTap }: ShiftCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(shift)}
      className="mx-4 mb-4 rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)]"
    >
      {/* Bedrijfsfoto — groot, breed, 180px hoog */}
      {shift.bedrijf_foto_url && (
        <div className="relative h-[180px] w-full overflow-hidden">
          <img
            src={shift.bedrijf_foto_url}
            alt={shift.bedrijf}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay voor leesbaarheid */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
        </div>
      )}

      {/* Content blok */}
      <div className="p-4">
        {/* Bedrijfsnaam (oranje) + favoriet hartje */}
        <div className="flex items-start justify-between">
          <span className="text-[var(--accent)] font-semibold text-sm">{shift.bedrijf}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(shift.id) }}
            className="p-1"
          >
            <Heart
              className={cn("w-5 h-5", shift.is_favoriet
                ? "fill-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--text-tertiary)]"
              )}
            />
          </button>
        </div>

        {/* Functie titel (bold, wit) */}
        <h3 className="text-[var(--text-primary)] font-bold text-lg mt-1 leading-tight">
          {shift.functie_titel}
        </h3>

        {/* Datum | Tijd | Locatie (grijs, met dividers) */}
        <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)]">
          <span>{formatDatum(shift.datum)}</span>
          <span className="text-[var(--text-tertiary)]">|</span>
          <span>{shift.start_tijd} - {shift.eind_tijd}</span>
          <span className="text-[var(--text-tertiary)]">|</span>
          <span>{shift.locatie}</span>
        </div>

        {/* Tags + prijs */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            {shift.is_speciaal && (
              <span className="bg-[var(--tag-special)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                Speciaal voor jou
              </span>
            )}
            {shift.extra_dagen > 0 && (
              <span className="bg-[var(--bg-card-secondary)] text-[var(--text-secondary)] text-xs font-medium px-2.5 py-1 rounded-full">
                +{shift.extra_dagen} dagen
              </span>
            )}
          </div>
          <span className="text-[var(--text-primary)] text-xl font-bold">
            € {shift.uurtarief.toFixed(2)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
```

### Filter bottom sheet — YoungOnes style (full screen)

```tsx
// Fullscreen filter — "FILTER DE KLUSSEN" equivalent

import Sheet from 'react-modal-sheet'

<Sheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} snapPoints={[0.95]}>
  <Sheet.Container className="!bg-[var(--bg-page)] !rounded-t-[20px]">
    <Sheet.Header>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-bold tracking-wider uppercase text-[var(--text-primary)]">
          Filter diensten
        </h2>
        <button
          onClick={handleResetFilters}
          className="text-[var(--text-secondary)] text-sm font-medium"
        >
          Wissen
        </button>
      </div>
    </Sheet.Header>
    <Sheet.Content className="px-5 pb-24 overflow-y-auto">

      {/* Sortering dropdown */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 mb-4">
        <label className="text-xs text-[var(--text-secondary)] block mb-1">Sortering</label>
        <select className="w-full bg-transparent text-[var(--text-primary)] font-medium">
          <option>Aanbevolen</option>
          <option>Dichtstbijzijnd</option>
          <option>Hoogste uurtarief</option>
          <option>Binnenkort</option>
        </select>
      </div>

      {/* Snelle filters — met emoji's, net als YoungOnes */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Snelle filters</h3>
      <div className="flex flex-col gap-2 mb-6">
        {[
          { emoji: '❤️', label: 'Diensten van favoriete klanten' },
          { emoji: '🏃', label: 'Invalklussen (< 24u)' },
          { emoji: '📅', label: 'Diensten voor morgen' },
          { emoji: '📅', label: 'Diensten voor aankomend weekend' },
        ].map(f => (
          <button
            key={f.label}
            className={cn(
              "flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl px-4 py-3 text-sm text-left transition-colors",
              filters[f.label] ? "ring-1 ring-[var(--accent)]" : ""
            )}
          >
            <span className="text-lg">{f.emoji}</span>
            <span className="text-[var(--text-primary)] font-medium">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Kalender — "Welke dagen wil je werken?" */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Welke dagen wil je werken?</h3>
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 mb-6">
        {/* Mini kalender component — maand view */}
        {/* Klik op dag → toggle selectie */}
        {/* Vandaag: oranje cirkel */}
      </div>

      {/* Tijd range */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Tussen welke tijden?</h3>
      <div className="flex gap-3 mb-6">
        <input type="time" className="flex-1 bg-[var(--bg-card)] rounded-2xl px-4 py-3 text-[var(--text-primary)]" placeholder="Begin" />
        <input type="time" className="flex-1 bg-[var(--bg-card)] rounded-2xl px-4 py-3 text-[var(--text-primary)]" placeholder="Eind" />
      </div>

      {/* Locatie */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Waar wil je werken?</h3>
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 mb-6">
        <label className="text-xs text-[var(--text-secondary)] block mb-1">Jouw locatie</label>
        <select className="w-full bg-transparent text-[var(--text-primary)] font-medium">
          <option>Amsterdam</option>
          <option>Rotterdam</option>
          <option>Utrecht</option>
          <option>Den Haag</option>
        </select>
      </div>

      {/* Afstand slider */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Hoe ver wil je reizen?</h3>
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)]">Maximale afstand</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{afstand} km</span>
        </div>
        <input
          type="range" min="5" max="50" step="5" value={afstand}
          onChange={e => setAfstand(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      {/* Minimaal uurtarief slider */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Minimaal uurtarief</h3>
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)]">Minimaal uurtarief</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">€ {minUurtarief.toFixed(2)}</span>
        </div>
        <input
          type="range" min="12" max="30" step="0.5" value={minUurtarief}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      {/* Functie categorieën — oranje checkboxes */}
      <h3 className="font-bold text-[var(--text-primary)] mb-3">Welke functies wil je zien?</h3>
      {['Kok', 'Bediening', 'Barman', 'Afwasser', 'Catering', 'Events'].map(cat => (
        <label
          key={cat}
          className="flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl px-4 py-3.5 mb-2 cursor-pointer"
        >
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors",
            filters.categorien?.includes(cat)
              ? "bg-[var(--accent)] border-[var(--accent)]"
              : "border-[var(--text-tertiary)]"
          )}>
            {filters.categorien?.includes(cat) && <Check className="w-4 h-4 text-black" />}
          </div>
          <span className="text-[var(--text-primary)] font-medium">{cat}</span>
        </label>
      ))}
    </Sheet.Content>
  </Sheet.Container>

  {/* Sticky Opslaan knop — oranje, net als YoungOnes */}
  <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-page)] border-t border-[var(--border-color)]">
    <button
      onClick={applyFilters}
      className="w-full py-4 rounded-2xl bg-[var(--accent)] text-black font-bold text-base"
    >
      Opslaan
    </button>
    <button
      onClick={() => setFilterOpen(false)}
      className="w-full py-2 text-[var(--text-secondary)] text-sm font-medium mt-2 underline"
    >
      Annuleren
    </button>
  </div>
</Sheet>
```

**Commit:** `feat: add shift marketplace feed with YoungOnes-style filter sheet`

---

## TAB 2: MIJN DIENSTEN

Sub-tabs met oranje underline indicator (exact YoungOnes patroon):

```tsx
// Sub-tabs: "Aangeboden" | "Geaccepteerd" | "Archief"

<div className="flex border-b border-[var(--border-color)]">
  {['aangeboden', 'geaccepteerd', 'archief'].map(sub => (
    <button
      key={sub}
      onClick={() => setSubTab(sub)}
      className="flex-1 py-3 relative"
    >
      <span className={cn(
        "text-sm font-medium capitalize transition-colors",
        subTab === sub ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
      )}>
        {sub === 'aangeboden' ? 'Aangeboden' : sub === 'geaccepteerd' ? 'Geaccepteerd' : 'Archief'}
      </span>
      {subTab === sub && (
        <motion.div
          layoutId="subTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent)] rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  ))}
</div>
```

**Aangeboden tab:** Hier komen swipe-to-accept kaarten (uit SUPER master prompt). Combineer de swipe gesture met het YoungOnes card design (foto + oranje bedrijfsnaam).

**Geaccepteerd tab:** Kalender/rooster view — diensten die al bevestigd zijn.

**Archief tab:** Afgelopen diensten met status.

**Empty state (YoungOnes-style):**
```tsx
<div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-8">
  <p className="text-[var(--text-secondary)] text-base leading-relaxed">
    Hier komen de diensten te staan waarvoor je bent uitgekozen om te komen werken.
    Reageer op openstaande diensten en wacht tot je wordt bevestigd.
  </p>
</div>
```

**Commit:** `feat: add sub-tabbed shift management with oranje indicators`

---

## TAB 3: UREN

Gecombineerde tab voor uren invullen + uren status + financieel. Shift cards met bedrijfsfoto (YoungOnes "UREN INVULLEN" stijl):

```tsx
// Uren card — met bedrijfsfoto bovenaan, net als YoungOnes
<div className="mx-4 mb-4 rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)]">
  {shift.bedrijf_foto_url && (
    <div className="h-[140px] overflow-hidden">
      <img src={shift.bedrijf_foto_url} className="w-full h-full object-cover" />
    </div>
  )}
  <div className="p-4">
    <span className="text-[var(--accent)] font-semibold text-sm">{shift.bedrijf}</span>
    <h3 className="text-[var(--text-primary)] font-bold mt-1">{shift.functie_titel}</h3>
    <p className="text-sm text-[var(--text-secondary)] mt-1">
      {formatDatum(shift.datum)} | {shift.start_tijd} - {shift.eind_tijd} | {shift.locatie}
    </p>

    {/* Status bericht */}
    {shift.uren_status === 'afgekeurd' && (
      <div className="mt-3">
        <p className="text-[var(--text-primary)] font-semibold text-sm">
          Je ingediende uren zijn afgekeurd
        </p>
        <p className="text-[var(--text-secondary)] text-sm">
          {shift.bedrijf} heeft je een tegenvoorstel gedaan.
        </p>
      </div>
    )}

    {/* CTA knop — oranje */}
    <button className="w-full mt-3 py-3 rounded-2xl bg-[var(--accent)] text-black font-bold text-sm">
      {shift.uren_status === 'afgekeurd' ? 'Bekijk het tegenvoorstel' : 'Uren invullen'}
    </button>
  </div>
</div>
```

**Commit:** `feat: add YoungOnes-style hours submission cards`

---

## TAB 4: ACCOUNT — Profiel Hub

Alle profiel-, document- en instellingen-features gecombineerd in één scrollbare pagina. Dit volgt exact het YoungOnes account scherm.

### Profiel header (oranje gradient + foto + sterren)

```tsx
// Oranje gradient header achtergrond
<div className="relative">
  {/* Gradient header */}
  <div
    className="h-40"
    style={{
      background: 'linear-gradient(135deg, #F27501 0%, #d96800 50%, #1c1c1e 100%)',
    }}
  />

  {/* Profiel foto — overlapt de gradient */}
  <div className="flex flex-col items-center -mt-16 relative z-10">
    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--bg-page)] shadow-lg">
      {medewerker.foto_url
        ? <img src={medewerker.foto_url} className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-[var(--bg-card-secondary)] flex items-center justify-center text-3xl">👤</div>
      }
    </div>

    {/* Naam */}
    <h2 className="text-[var(--text-primary)] font-bold text-xl mt-3">{medewerker.naam}</h2>

    {/* Sterren rating */}
    <div className="flex items-center gap-1 mt-2">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className="w-5 h-5" fill={i <= Math.round(medewerker.gemiddelde_score) ? '#f59e0b' : 'transparent'} color="#f59e0b" />
      ))}
    </div>
    <button className="text-[var(--text-secondary)] text-sm underline mt-1">
      {medewerker.aantal_beoordelingen} beoordelingen
    </button>

    {/* Stats rij — YoungOnes style: 3 kolommen met dividers */}
    <div className="flex w-full max-w-sm mt-5 bg-[var(--bg-card)] rounded-2xl overflow-hidden">
      <div className="flex-1 py-4 text-center border-r border-[var(--border-color)]">
        <p className="text-[var(--text-primary)] font-bold text-xl">{stats.gematchte}</p>
        <p className="text-[var(--text-secondary)] text-xs mt-0.5">Gewerkte diensten</p>
      </div>
      <div className="flex-1 py-4 text-center border-r border-[var(--border-color)]">
        <p className="text-[var(--text-primary)] font-bold text-xl">{stats.noShows}</p>
        <p className="text-[var(--text-secondary)] text-xs mt-0.5">Niet voltooid</p>
      </div>
      <div className="flex-1 py-4 text-center">
        <p className="text-[var(--text-primary)] font-bold text-xl">{stats.vervangingen}</p>
        <p className="text-[var(--text-secondary)] text-xs mt-0.5">Vervanging geregeld</p>
      </div>
    </div>
  </div>
</div>
```

### Gegroepeerde menu items — iOS Settings stijl

```tsx
// Groepen met chevrons, net als YoungOnes Account tab

function MenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden mx-4 mb-4">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.onPress}
          className={cn(
            "flex items-center justify-between w-full px-4 py-3.5 text-left",
            i < items.length - 1 && "border-b border-[var(--border-color)]"
          )}
        >
          <span className="text-[var(--text-primary)] text-[15px] font-medium">{item.label}</span>
          <div className="flex items-center gap-2">
            {item.value && (
              <span className="text-[var(--text-tertiary)] text-sm">{item.value}</span>
            )}
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
        </button>
      ))}
    </div>
  )
}

// Groepen:
<MenuGroup items={[
  { label: 'Digitale ID kaart', onPress: () => setShowIDCard(true) },
  { label: 'Berichten', onPress: () => navigate('berichten'), badge: ongelezen },
  { label: 'Meldingen', onPress: () => navigate('notificaties') },
  { label: 'Favoriete opdrachtgevers', onPress: () => navigate('favorieten') },
]} />

<MenuGroup items={[
  { label: 'Persoonlijke gegevens', onPress: () => navigate('profiel-edit') },
  { label: 'Werkervaring', onPress: () => navigate('werkervaring') },
  { label: 'Vaardigheden', onPress: () => navigate('vaardigheden') },
  { label: 'Documenten', onPress: () => navigate('documenten') },
  { label: 'Certificeringen', onPress: () => navigate('certificeringen') },
]} />

<MenuGroup items={[
  { label: 'Facturenoverzicht', onPress: () => navigate('financieel') },
  { label: 'Referral programma', onPress: () => navigate('referral') },
]} />

<MenuGroup items={[
  { label: 'E-mailadres wijzigen', onPress: () => navigate('email-wijzigen') },
  { label: 'Wachtwoord wijzigen', onPress: () => navigate('wachtwoord-wijzigen') },
]} />

<MenuGroup items={[
  { label: 'Donkere modus', value: theme === 'dark' ? 'Aan' : 'Uit', onPress: toggleTheme },
  { label: 'Selecteer taal', value: 'Nederlands', onPress: () => {} },
]} />

<MenuGroup items={[
  { label: 'Uitloggen', onPress: handleLogout },
]} />
```

**Commit:** `feat: add YoungOnes-style account page with grouped settings`

---

## BESTAANDE FEATURES DIE BEHOUDEN BLIJVEN

Al deze features uit eerdere master prompts worden meegenomen maar krijgen het YoungOnes dark design:

| Feature | Waar het zit | Design aanpassing |
|---------|-------------|-------------------|
| Swipe to accept shifts | Mijn diensten → Aangeboden | Cards krijgen bedrijfsfoto + oranje accenten |
| Digitale ID kaart + QR | Account → "Digitale ID kaart" menu item → sheet | Donkere kaart, oranje accent |
| Gamification badges | Account → onder stats rij | Oranje checkmarks in donkere cards |
| PWA | Ongewijzigd | |
| Dark/Light toggle | Account → "Donkere modus" | YoungOnes style: "Automatisch" / "Aan" / "Uit" |
| In-app notificaties | Account → "Meldingen" | |
| Uren invullen bottom sheet | Uren tab → tik op card | |
| Beschikbaarheid kalender | Filter → "Welke dagen wil je werken?" | Geïntegreerd in filter |
| Financieel overzicht | Account → "Facturenoverzicht" | |
| 48u annulering + vervanging | Mijn diensten → op shift card | |
| Ratings weergave | Account → onder sterren | |

---

## IMPLEMENTATIE VOLGORDE

```
1.  CSS variabelen + dark mode als default instellen
2.  YoungOnesBottomNav — 4 tab navigatie
3.  Tab 1: Ontdekken — shift marketplace feed (ShiftCard component)
4.  Tab 1: Filter bottom sheet (volledig)
5.  Tab 2: Mijn diensten — sub-tabs met oranje indicator
6.  Tab 2: Swipe cards in "Aangeboden" sub-tab (bestaande SUPER prompt logica)
7.  Tab 3: Uren — cards met bedrijfsfoto en status
8.  Tab 4: Account — profiel header met gradient + sterren + stats
9.  Tab 4: Gegroepeerde menu items (alle sub-pagina's)
10. Integreer alle bestaande features in nieuwe structuur
11. Test dark + light mode op alle componenten
```

**Na elke stap:**
```bash
npx tsc --noEmit --skipLibCheck
npm run build
# Test op 375px (iPhone SE) + 390px (iPhone 15)
```

---

## BEDRIJFSFOTO'S

YoungOnes toont bedrijfsfoto's bij elke shift. Voeg dit toe:

```sql
-- Voeg kolom toe aan klanten tabel
ALTER TABLE klanten
ADD COLUMN IF NOT EXISTS bedrijf_foto_url TEXT;
-- URL naar foto van het restaurant/bedrijf (upload via admin dashboard)
```

Als er geen foto is, toon een fallback met gradient + bedrijfsnaam:
```tsx
{!shift.bedrijf_foto_url && (
  <div className="h-[180px] w-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--bg-card)] flex items-center justify-center">
    <span className="text-[var(--text-tertiary)] text-lg font-bold">{shift.bedrijf}</span>
  </div>
)}
```

---

## DEFINITION OF DONE

✅ Dark mode is standaard, true black achtergrond
✅ Oranje (`#F27501`) als accent kleur voor CTA's, active states, checkboxes
✅ 4-tab bottom nav met oranje indicator lijn bovenaan active tab
✅ Ontdekken tab: shift feed met foto-rijke kaarten + bedrijfsnaam in oranje
✅ Filter bottom sheet: snelle filters, kalender, afstand slider, uurtarief slider, categorieën
✅ Mijn diensten: sub-tabs met oranje underline, swipe-to-accept in "Aangeboden"
✅ Uren: cards met bedrijfsfoto en status berichten, oranje CTA knoppen
✅ Account: oranje gradient header, profielfoto, sterren, stats rij, gegroepeerde menu items
✅ Bold uppercase headers ("VIND JOUW DIENST", "MIJN DIENSTEN", etc.)
✅ Light mode werkt ook (toggle in Account settings)
✅ Alle bestaande features behouden en werkend
✅ 0 TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
✅ `npm run build` succesvol
✅ Getest op 375px (iPhone SE) + 390px (iPhone 15) + 1280px (desktop)
