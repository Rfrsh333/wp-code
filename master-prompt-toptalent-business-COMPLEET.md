# Master Prompt — TopTalent Business Uitbreidingen
## TopTalentJobs.nl | Additive features op bestaand klant portaal

---

## ROL & CONTEXT

Je bent een senior frontend engineer. Je **breidt het bestaande TopTalent Business portaal uit** met nieuwe features. Je past GEEN structuur aan, je herbouwt NIETS, je verwijdert NIETS bestaands.

**Bestaande structuur (NIET aanpassen):**
- `src/components/klant/KlantPortalLayout.tsx` — layout met navy sidebar + bottom nav
- `src/components/klant/KlantBottomNav.tsx` — bottom nav met "Meer" sheet
- `src/app/klant/uren/KlantUrenClient.tsx` — hoofdcomponent met alle tabs
- `src/app/klant/dashboard/page.tsx` — laadt sessie en rendert `KlantUrenClient`
- `src/app/klant/layout.tsx` — metadata + PWA + `RegisterSW`

**Bestaande tabs (BEHOUDEN):** overzicht · aanvragen · rooster · uren · facturen · beoordelingen · berichten · kosten · favorieten

**Stack:** Next.js 14, TypeScript, Supabase, shadcn/ui, Tailwind CSS, Framer Motion.

**Absolute regel:** Alle bestaande data fetching, API routes, database queries en logica blijven ongewijzigd. Alleen UI toevoegen/verbeteren.

---

## WAT ER AL IS (ter referentie)

In `KlantUrenClient` bestaan al deze interfaces en state variabelen — gebruik ze, maak ze niet opnieuw aan:

```typescript
// Al beschikbaar in state:
dashboardStats: DashboardStats    // pendingHoursCount, pendingHoursTotal, approvedHoursThisMonth, activeDienstenCount, openFacturenCount
upcomingDiensten: UpcomingDienst[] // datum, start_tijd, locatie, functie, status, aanmeldingen
recentFacturen: Factuur[]          // factuur_nummer, totaal, status
teBeoordeelen: TeBeoordelen[]      // medewerker_naam, datum
ongelesCount: number               // ongelezen berichten
uren: UrenRegistratie[]            // gewerkte uren lijst

// Interfaces die al bestaan:
interface DashboardStats { pendingHoursCount, pendingHoursTotal, approvedHoursThisMonth, activeDienstenCount, openFacturenCount }
interface UpcomingDienst { id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, status, aanmeldingen_count, aanmeldingen_geaccepteerd }
interface Factuur { id, factuur_nummer, periode_start, periode_eind, totaal, status, viewUrl }
interface Favoriet { id, medewerker_id, naam, functie, gemiddelde_score, diensten_count }
interface KostenData { jaar, totaal, per_maand, per_functie, top_medewerkers }
interface KlantBericht { id, created_at, afzender, bericht, gelezen }
```

---

## FEATURE 1 — DASHBOARD WIDGETS (overzicht tab)

Voeg bovenaan de **overzicht tab** 4 snap-in widgets toe, vóór de bestaande content.

### Nieuw bestand: `src/components/klant/DashboardWidgets.tsx`

```tsx
// src/components/klant/DashboardWidgets.tsx
"use client";

import { motion } from "framer-motion";
import { CalendarDays, Euro, Star, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";

interface DashboardStats {
  pendingHoursCount: number;
  pendingHoursTotal: number;
  approvedHoursThisMonth: number;
  activeDienstenCount: number;
  openFacturenCount: number;
}

interface UpcomingDienst {
  datum: string;
  start_tijd: string;
  locatie: string;
  functie: string;
}

interface Factuur {
  totaal: number;
  status: string;
}

interface DashboardWidgetsProps {
  stats: DashboardStats | null;
  volgendeDienst: UpcomingDienst | null;
  openFacturen: Factuur[];
  maandBedrag: number;
  budgetGebruikt?: number;
  budgetTotaal?: number;
  onTabChange: (tab: string) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: "easeOut" },
  }),
};

export default function DashboardWidgets({
  stats,
  volgendeDienst,
  openFacturen,
  maandBedrag,
  budgetGebruikt = 0,
  budgetTotaal = 3000,
  onTabChange,
}: DashboardWidgetsProps) {
  const openBedrag = openFacturen
    .filter((f) => f.status === "openstaand")
    .reduce((s, f) => s + f.totaal, 0);
  const budgetPct = budgetTotaal > 0 ? Math.min(100, Math.round((budgetGebruikt / budgetTotaal) * 100)) : 0;
  const budgetWaarschuwing = budgetPct >= 85;

  return (
    <div className="space-y-3 mb-6">
      {/* Budget alert */}
      {budgetWaarschuwing && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Budget bijna bereikt</p>
            <p className="text-amber-700 text-xs mt-0.5">
              €{budgetGebruikt.toLocaleString("nl-NL")} van €{budgetTotaal.toLocaleString("nl-NL")} gebruikt ({budgetPct}%)
            </p>
          </div>
        </motion.div>
      )}

      {/* 2×2 widget grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Widget 1 — Volgende dienst */}
        <motion.button
          custom={0} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("rooster")}
          className="bg-[#1e3a5f] text-white rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Volgende dienst</span>
          </div>
          {volgendeDienst ? (
            <>
              <p className="font-bold text-sm leading-tight">{volgendeDienst.functie}</p>
              <p className="text-white/70 text-xs truncate">{volgendeDienst.locatie}</p>
              <span className="mt-auto self-start bg-[#F27501] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {volgendeDienst.start_tijd?.slice(0, 5)}
              </span>
            </>
          ) : (
            <p className="text-white/50 text-sm">Geen gepland</p>
          )}
        </motion.button>

        {/* Widget 2 — Openstaande facturen */}
        <motion.button
          custom={1} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("facturen")}
          className="bg-white border border-[var(--kp-border)] rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-[var(--kp-text-tertiary)] text-xs font-medium">
            <Euro className="w-3.5 h-3.5" />
            <span>Openstaand</span>
          </div>
          <p className="font-bold text-2xl text-[var(--kp-text-primary)]">
            €{openBedrag.toLocaleString("nl-NL")}
          </p>
          <div className="mt-auto flex items-center gap-1.5">
            {(stats?.openFacturenCount ?? 0) > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {stats?.openFacturenCount} factuur{stats?.openFacturenCount !== 1 ? "en" : ""}
              </span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--kp-text-tertiary)]" />
          </div>
        </motion.button>

        {/* Widget 3 — Uren goed te keuren */}
        <motion.button
          custom={2} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("uren")}
          className="bg-white border border-[var(--kp-border)] rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-[var(--kp-text-tertiary)] text-xs font-medium">
            <Star className="w-3.5 h-3.5" />
            <span>Uren goed te keuren</span>
          </div>
          <p className="font-bold text-2xl text-[var(--kp-text-primary)]">
            {stats?.pendingHoursCount ?? 0}
          </p>
          <p className="text-[var(--kp-text-tertiary)] text-xs">
            {stats?.pendingHoursTotal?.toFixed(1) ?? 0}u in behandeling
          </p>
          {(stats?.pendingHoursCount ?? 0) > 0 && (
            <span className="mt-auto self-start bg-[#F27501]/10 text-[#F27501] text-xs font-semibold px-2 py-0.5 rounded-full">
              Actie vereist
            </span>
          )}
        </motion.button>

        {/* Widget 4 — Deze maand */}
        <motion.button
          custom={3} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onTabChange("kosten")}
          className="bg-white border border-[var(--kp-border)] rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-[var(--kp-text-tertiary)] text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Deze maand</span>
          </div>
          <p className="font-bold text-xl text-[#F27501]">
            €{maandBedrag.toLocaleString("nl-NL")}
          </p>
          {budgetTotaal > 0 && (
            <div className="mt-1 space-y-1">
              <div className="h-1.5 bg-[var(--kp-bg-page)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetWaarschuwing ? "bg-amber-500" : "bg-[#F27501]"}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <p className="text-[var(--kp-text-tertiary)] text-[10px]">
                {budgetPct}% van €{budgetTotaal.toLocaleString("nl-NL")} budget
              </p>
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
}
```

### Gebruik in `KlantUrenClient.tsx` — overzicht tab

Zoek in `KlantUrenClient.tsx` de plek waar de **overzicht tab** gerenderd wordt (zoek op `activeTab === "overzicht"` of vergelijkbaar). Voeg bovenaan die tab de `DashboardWidgets` toe:

```tsx
// Importeer bovenaan KlantUrenClient.tsx
import DashboardWidgets from "@/components/klant/DashboardWidgets";

// In de render, bovenaan de overzicht tab sectie:
{activeTab === "overzicht" && (
  <>
    <DashboardWidgets
      stats={dashboardStats}
      volgendeDienst={upcomingDiensten[0] ?? null}
      openFacturen={recentFacturen}
      maandBedrag={/* gebruik bestaande kosten state of dashboardStats */0}
      onTabChange={setActiveTab}
    />
    {/* ... bestaande overzicht content hieronder ... */}
  </>
)}
```

---

## FEATURE 2 — QUICK ACTIONS (overzicht tab)

Voeg 3 grote CTA knoppen toe onder de widgets, vóór de bestaande overzicht content.

### Nieuw bestand: `src/components/klant/QuickActions.tsx`

```tsx
// src/components/klant/QuickActions.tsx
"use client";

import { Plus, MessageSquare, Download } from "lucide-react";
import { motion } from "framer-motion";

interface QuickActionsProps {
  onTabChange: (tab: string) => void;
}

export default function QuickActions({ onTabChange }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onTabChange("aanvragen")}
        className="flex flex-col items-center gap-2 bg-[#F27501] text-white rounded-2xl p-4 font-semibold text-xs text-center shadow-lg shadow-orange-200/50"
      >
        <Plus className="w-6 h-6" />
        <span>Personeel aanvragen</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onTabChange("berichten")}
        className="flex flex-col items-center gap-2 bg-[#1e3a5f] text-white rounded-2xl p-4 font-semibold text-xs text-center"
      >
        <MessageSquare className="w-6 h-6" />
        <span>Stuur bericht</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onTabChange("facturen")}
        className="flex flex-col items-center gap-2 bg-white text-[#1e3a5f] rounded-2xl p-4 font-semibold text-xs text-center border border-[var(--kp-border)]"
      >
        <Download className="w-6 h-6" />
        <span>Download factuur</span>
      </motion.button>
    </div>
  );
}
```

### Gebruik in overzicht tab (na `DashboardWidgets`):

```tsx
import QuickActions from "@/components/klant/QuickActions";

// Direct onder DashboardWidgets:
<QuickActions onTabChange={setActiveTab} />
```

---

## FEATURE 3 — LIVE STATUS TRACKER (overzicht tab)

Voeg een live status sectie toe die diensten van vandaag toont met check-in status. Gebruik de bestaande `upcomingDiensten` state.

### Nieuw bestand: `src/components/klant/LiveStatusTracker.tsx`

```tsx
// src/components/klant/LiveStatusTracker.tsx
"use client";

import { useEffect, useState } from "react";

interface LiveDienst {
  id: string;
  datum: string;
  start_tijd: string;
  functie: string;
  locatie: string;
  status: string;
  aanmeldingen_geaccepteerd?: number;
  aantal_nodig: number;
}

interface LiveStatusTrackerProps {
  diensten: LiveDienst[];
  onTabChange: (tab: string) => void;
}

function isVandaag(datum: string): boolean {
  return new Date(datum).toDateString() === new Date().toDateString();
}

export default function LiveStatusTracker({ diensten, onTabChange }: LiveStatusTrackerProps) {
  const vandaag = diensten.filter((d) => isVandaag(d.datum));
  if (vandaag.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          <h3 className="font-bold text-[var(--kp-text-primary)] text-sm uppercase tracking-wider">
            Live vandaag
          </h3>
        </div>
        <button
          onClick={() => onTabChange("rooster")}
          className="text-[#F27501] text-xs font-semibold"
        >
          Alles →
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--kp-border)] overflow-hidden">
        {vandaag.map((dienst, i) => {
          const bezet = dienst.aanmeldingen_geaccepteerd ?? 0;
          const nodig = dienst.aantal_nodig;
          const vol = bezet >= nodig;

          return (
            <div
              key={dienst.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-[var(--kp-border)]" : ""
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  vol
                    ? "bg-green-500"
                    : bezet > 0
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-500 animate-pulse"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--kp-text-primary)] text-sm truncate">
                  {dienst.functie}
                </p>
                <p className="text-[var(--kp-text-tertiary)] text-xs truncate">
                  {dienst.locatie}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[var(--kp-text-primary)] text-sm font-medium">
                  {dienst.start_tijd?.slice(0, 5)}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    vol
                      ? "text-green-600"
                      : bezet > 0
                      ? "text-amber-600"
                      : "text-red-500"
                  }`}
                >
                  {bezet}/{nodig} ingepland
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Gebruik in overzicht tab:

```tsx
import LiveStatusTracker from "@/components/klant/LiveStatusTracker";

<LiveStatusTracker diensten={upcomingDiensten} onTabChange={setActiveTab} />
```

---

## FEATURE 4 — MEDEWERKER POOL VERBETERING (favorieten tab)

De bestaande favorieten tab toont al medewerkers. Verbeter de weergave door ratings, aanwezigheid, en "Boek opnieuw" knop toe te voegen.

### Zoek in `KlantUrenClient.tsx` de favorieten tab render sectie

Vervang de bestaande favoriet-kaart render door dit verbeterde kaartje. Pas ALLEEN de JSX aan voor de individuele favoriet-kaart, niet de logica of state:

```tsx
// VERVANGT de bestaande favoriet-kaart JSX (behoud de .map() wrapper)
// Zoek op: favorieten.map of soortgelijk

{/* Favoriet kaart — verbeterde versie */}
<div key={fav.id} className="bg-white rounded-2xl border border-[var(--kp-border)] overflow-hidden">
  <div className="flex items-center gap-3 p-4">
    {/* Avatar */}
    <div className="relative flex-shrink-0">
      {fav.profile_photo_url ? (
        <img
          src={fav.profile_photo_url}
          alt={fav.naam}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-lg">
          {fav.naam.charAt(0)}
        </div>
      )}
      {/* Favoriet ster */}
      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[var(--kp-text-primary)]">{fav.naam}</p>
      <p className="text-[var(--kp-text-tertiary)] text-sm">
        {Array.isArray(fav.functie) ? fav.functie.join(", ") : fav.functie}
      </p>
      <div className="flex items-center gap-3 mt-1">
        {/* Sterren */}
        {fav.gemiddelde_score != null && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[var(--kp-text-secondary)] text-xs font-semibold">
              {fav.gemiddelde_score.toFixed(1)}
            </span>
          </div>
        )}
        {/* Aantal diensten */}
        <span className="text-[var(--kp-text-tertiary)] text-xs">
          {fav.diensten_count}× gewerkt
        </span>
      </div>
    </div>

    {/* Boek opnieuw knop */}
    <button
      onClick={() => setActiveTab("aanvragen")}
      className="flex-shrink-0 bg-[#F27501] text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
    >
      Boek
    </button>
  </div>
</div>
```

---

## FEATURE 5 — ZOEKBALK & FILTERS (uren tab + diensten tab)

Voeg een zoekbalk toe bovenaan de uren tab om snel te filteren op medewerker naam.

### Nieuw bestand: `src/components/klant/TabSearchBar.tsx`

```tsx
// src/components/klant/TabSearchBar.tsx
"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

interface TabSearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

export default function TabSearchBar({
  placeholder = "Zoeken...",
  onSearch,
}: TabSearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  return (
    <div className="relative mb-4">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kp-text-tertiary)]" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-10 bg-white border border-[var(--kp-border)] rounded-xl text-[var(--kp-text-primary)] text-sm placeholder-[var(--kp-text-tertiary)] focus:outline-none focus:border-[#F27501] focus:ring-2 focus:ring-[#F27501]/20 transition-all"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="w-4 h-4 text-[var(--kp-text-tertiary)]" />
        </button>
      )}
    </div>
  );
}
```

### Gebruik in KlantUrenClient — uren tab

```tsx
import TabSearchBar from "@/components/klant/TabSearchBar";

// Voeg state toe:
const [urenZoek, setUrenZoek] = useState("");

// Gefilterde uren:
const gefilterdeUren = uren.filter((u) =>
  u.medewerker_naam.toLowerCase().includes(urenZoek.toLowerCase())
);

// Bovenaan uren tab:
{activeTab === "uren" && (
  <>
    <TabSearchBar
      placeholder="Zoek op medewerker naam..."
      onSearch={setUrenZoek}
    />
    {/* bestaande uren lijst maar gebruik gefilterdeUren i.p.v. uren */}
  </>
)}
```

---

## FEATURE 6 — BUDGET ALERT BANNER (kosten tab)

Voeg een waarschuwingsbanner toe bovenaan de kosten tab als het budget bijna op is.

### Gebruik rechtstreeks in kosten tab sectie van `KlantUrenClient.tsx`

```tsx
// Voeg state toe:
const MAANDBUDGET = 3000; // of haal op uit Supabase/config

// Bereken budget percentage uit bestaande kostenData:
const budgetGebruikt = kostenData?.per_maand?.find(
  (m) => m.maand === new Date().toLocaleString("nl-NL", { month: "long" })
)?.kosten ?? 0;
const budgetPct = Math.min(100, Math.round((budgetGebruikt / MAANDBUDGET) * 100));

// Bovenaan kosten tab:
{activeTab === "kosten" && (
  <>
    {budgetPct >= 80 && (
      <div className={`flex items-start gap-3 rounded-2xl p-4 mb-4 ${
        budgetPct >= 95
          ? "bg-red-50 border border-red-200"
          : "bg-amber-50 border border-amber-200"
      }`}>
        <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${budgetPct >= 95 ? "text-red-600" : "text-amber-600"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className={`font-semibold text-sm ${budgetPct >= 95 ? "text-red-900" : "text-amber-900"}`}>
            {budgetPct >= 95 ? "Budget bijna uitgeput!" : "Budget waarschuwing"}
          </p>
          <p className={`text-xs mt-0.5 ${budgetPct >= 95 ? "text-red-700" : "text-amber-700"}`}>
            €{budgetGebruikt.toLocaleString("nl-NL")} van €{MAANDBUDGET.toLocaleString("nl-NL")} gebruikt ({budgetPct}%).
            Nog €{(MAANDBUDGET - budgetGebruikt).toLocaleString("nl-NL")} beschikbaar.
          </p>
        </div>
      </div>
    )}
    {/* ... bestaande kosten content ... */}
  </>
)}
```

---

## FEATURE 7 — NOTIFICATIE TELLER IN HEADER

De bestaande `KlantMobileHeader` toont al het bedrijfsnaam. Voeg een notificatiebel toe die het aantal openstaande acties toont.

### Bestand aanpassen: `src/components/klant/KlantMobileHeader.tsx`

Lees eerst de bestaande `KlantMobileHeader.tsx`. Voeg een `notifCount` prop toe en render een badge bij de header:

```tsx
// Voeg toe aan de props interface:
interface KlantMobileHeaderProps {
  // ... bestaande props ...
  notifCount?: number; // nieuw
}

// In de header JSX, voeg toe naast de bedrijfsnaam of logout knop:
{(notifCount ?? 0) > 0 && (
  <div className="relative">
    <svg className="w-6 h-6 text-[var(--kp-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F27501] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
      {notifCount! > 9 ? "9+" : notifCount}
    </span>
  </div>
)}
```

### Geef notifCount door vanuit `KlantUrenClient`:

```tsx
// Bereken totale notif count uit bestaande state:
const totalNotifCount =
  (dashboardStats?.pendingHoursCount ?? 0) +
  (teBeoordeelen.length) +
  (ongelesCount);

// Geef door aan KlantMobileHeader:
<KlantMobileHeader
  // ... bestaande props ...
  notifCount={totalNotifCount}
/>
```

---

## IMPLEMENTATIE VOLGORDE

Voer stap voor stap uit — bouw altijd één component, test, dan door:

```
1. DashboardWidgets.tsx aanmaken
   → Importeren in KlantUrenClient, toevoegen aan overzicht tab

2. QuickActions.tsx aanmaken
   → Toevoegen na DashboardWidgets in overzicht tab

3. LiveStatusTracker.tsx aanmaken
   → Toevoegen na QuickActions in overzicht tab

4. TabSearchBar.tsx aanmaken
   → Toevoegen aan uren tab, state toevoegen voor zoekfilter

5. Favoriet kaart UI verbeteren
   → Alleen JSX van individuele kaart vervangen, geen logica aanraken

6. Budget alert banner
   → Inline toevoegen aan kosten tab

7. KlantMobileHeader notifCount
   → Prop toevoegen + badge renderen

8. npm run build → controleer op TypeScript errors
```

**Na elke stap controleren:**
- `npm run build` — geen errors
- Bestaande tabs werken nog
- Data fetching ongewijzigd
- Mobiel testen op 375px

---

## KLEUREN REFERENTIE

Gebruik altijd de bestaande CSS variabelen uit `.klant-portal`:

```
var(--kp-primary)       → #1e3a5f  (navy, structuur)
var(--kp-accent)        → #F27501  (oranje, CTAs/actie)
var(--kp-bg-page)       → #f0f4f8  (pagina achtergrond)
var(--kp-border)        → #e2e8f0  (borders)
var(--kp-text-primary)  → #0f172a  (hoofdtekst)
var(--kp-text-secondary)→ #475569  (subtekst)
var(--kp-text-tertiary) → #94a3b8  (placeholder/label)
```

Hardcode **nooit** kleuren direct — gebruik altijd de CSS variabelen zodat een eventueel thema-update automatisch werkt.
