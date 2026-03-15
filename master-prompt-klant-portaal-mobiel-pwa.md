# Master Prompt — Klant Portaal Mobiel + PWA
## TopTalentJobs.nl | Business Dashboard · Manager-First · Eigen identiteit

---

## ROL & CONTEXT

Je bent een senior product designer + frontend engineer. Je redesignt het **klant portaal van TopTalentJobs.nl** voor restaurant managers en horecabedrijven. Dit portaal moet:

- **Compleet anders voelen** dan het medewerker portaal
- **Professioneel en zakelijk** — managers willen data snel zien, niet speels
- **Mobiel-first** — restaurant managers staan achter de bar, niet achter een bureau
- **Installeerbaar als PWA** — eigen app op de telefoon, apart van de medewerker app

**Stack:** Next.js 14 (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS, Framer Motion.

**Absolute regel:** Geen bestaande logica, data fetching, of API routes aanpassen. Alleen visueel redesignen + PWA toevoegen.

---

## MEDEWERKER vs KLANT — VISUELE IDENTITEIT

| | Medewerker Portaal | Klant Portaal |
|---|---|---|
| **Gevoel** | Consumer app, iOS-style | B2B dashboard, zakelijk |
| **Primaire kleur** | Oranje `#F27501` | Donker blauw `#1e3a5f` |
| **Achtergrond** | `#f2f2f7` (warm grijs) | `#f0f4f8` (koel blauw-grijs) |
| **Cards** | Grote ronde cards, veel padding | Strak, compacte cards, data-dense |
| **Typografie** | Bold en groot (consumer) | Medium weight, zakelijk |
| **Dark mode** | Ja (medewerkers werken 's avonds) | Nee (managers overdag op kantoor) |
| **Iconen** | Lucide, groot (28px) | Lucide, kleiner (20px) |
| **App naam PWA** | "TopTalent Medewerker" | "TopTalent Beheer" |
| **App kleur** | Oranje `#F27501` | Donker blauw `#1e3a5f` |

---

## DESIGN SYSTEEM KLANT PORTAAL

### Kleurenpalet

```typescript
// /lib/design-system/klant-colors.ts
export const klantColors = {
  // Primary — zakelijk blauw (vertrouwen, professionaliteit)
  primary: '#1e3a5f',           // donker navy blauw
  primaryMid: '#2d5a9e',        // medium blauw voor hover states
  primaryLight: '#e8f0fb',      // lichtblauw voor badges/tags

  // Accent — gebruik oranje spaarzaam, alleen voor CTAs
  accent: '#F27501',            // TopTalent oranje
  accentLight: '#fff3e6',

  // Achtergronden
  bgPage: '#f0f4f8',            // koel blauw-grijs (zakelijk gevoel)
  bgCard: '#ffffff',
  bgCardHover: '#fafbfc',

  // Status kleuren
  green: '#059669',             // bevestigd
  amber: '#d97706',             // wacht op actie
  red: '#dc2626',               // probleem
  blue: '#2563eb',              // informatie

  // Text
  textPrimary: '#0f172a',       // bijna zwart
  textSecondary: '#475569',     // slate grijs
  textTertiary: '#94a3b8',      // licht grijs

  // Border
  border: '#e2e8f0',            // subtiele border
  borderFocus: '#2d5a9e',       // bij focus/active
}
```

### Tailwind globals toevoegen aan `/app/globals.css`

```css
/* Klant portaal specifieke CSS variabelen */
.klant-portal {
  --kp-primary: #1e3a5f;
  --kp-primary-mid: #2d5a9e;
  --kp-primary-light: #e8f0fb;
  --kp-accent: #F27501;
  --kp-bg-page: #f0f4f8;
  --kp-bg-card: #ffffff;
  --kp-text-primary: #0f172a;
  --kp-text-secondary: #475569;
  --kp-text-tertiary: #94a3b8;
  --kp-border: #e2e8f0;
}
```

Voeg `klant-portal` class toe aan de root wrapper van het klant portaal.

---

## STAP 1: NIEUWE KLANT PORTAL LAYOUT

Maak een **volledig aparte layout** voor het klant portaal. Gebruik NIET de bestaande `PortalLayout` — die is gedeeld met medewerkers. Maak een eigen `KlantPortalLayout`.

### Maak `/components/klant/KlantPortalLayout.tsx`

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Desktop: Sidebar links (260px), strakke blauwe header
// Mobile: Bottom nav met max 5 tabs (belangrijkste), rest via "Meer" menu

interface KlantPortalLayoutProps {
  children: React.ReactNode
  tabs: KlantTab[]
  activeTab: string
  onTabChange: (id: string) => void
  bedrijfsnaam: string
  contactpersoon: string
  onLogout: () => void
}

// === DESKTOP SIDEBAR ===
// Donker navy sidebar (bg-[#1e3a5f]) — lijkt op Linear of Vercel dashboard
// Logo bovenaan + bedrijfsnaam
// Navigatie items: wit tekst op blauw achtergrond
// Active item: lichtblauw `bg-white/15` met witte tekst
// Logout knop onderaan

// === MOBILE BOTTOM NAV ===
// Maximaal 5 tabs onderaan
// Tabs buiten de 5: via "Meer" knop → sheet/drawer
// Wit met blauwe active indicator
// Hoogte: 49px + safe-area-inset-bottom

export default function KlantPortalLayout({ ... }: KlantPortalLayoutProps) {
  return (
    <div className="klant-portal min-h-screen bg-[var(--kp-bg-page)] flex">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] min-h-screen bg-[#1e3a5f] fixed left-0 top-0 bottom-0">

        {/* Logo + bedrijfsnaam */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F27501] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">TT</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{bedrijfsnaam}</p>
              <p className="text-blue-300 text-xs">Klant Portaal</p>
            </div>
          </div>
        </div>

        {/* Navigatie */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm mb-1 transition-colors",
                activeTab === tab.id
                  ? "bg-white/15 text-white font-semibold"
                  : "text-blue-200 hover:bg-white/8 hover:text-white font-medium"
              )}
            >
              <tab.Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="bg-[#F27501] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {tab.badge}
                </span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Footer: gebruiker + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-blue-200 text-xs mb-2">{contactpersoon}</p>
          <button
            onClick={onLogout}
            className="text-blue-300 hover:text-white text-xs transition-colors"
          >
            Uitloggen →
          </button>
        </div>
      </aside>

      {/* Hoofdcontent */}
      <main className="flex-1 md:ml-[260px] pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-4 md:p-6 max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobiele bottom nav */}
      <KlantBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  )
}
```

### Maak `/components/klant/KlantBottomNav.tsx`

```tsx
// Maximaal 5 tabs zichtbaar onderaan
// Tabs na de 5e → via "Meer" knop die een Sheet opent met de rest

// Primaire 5 tabs voor bottom nav:
// 1. Overzicht (Home icoon)
// 2. Aanvragen (Plus icoon) — meest gebruikte actie
// 3. Rooster (Kalender icoon)
// 4. Uren (Clock icoon)
// 5. Meer (Grid icoon) → sheet met: Facturen, Favorieten, Beoordelingen, Kosten, Berichten, Referral

const PRIMAIRE_TABS = ['overzicht', 'aanvragen', 'rooster', 'uren']
// De 5e positie is altijd "Meer"

// Bottom nav stijl:
// bg-white border-t border-[var(--kp-border)]
// Active: blauwe indicator lijn bovenaan tab + blauwe icon/label
// Inactive: grijs icon + label
// Hoogte: 49px + env(safe-area-inset-bottom)
```

**Commit:** `feat: create dedicated KlantPortalLayout with navy sidebar and mobile bottom nav`

---

## STAP 2: KLANT PORTAAL HEADER (MOBIEL)

Op mobiel heeft het klant portaal een **compacte header bovenaan** (geen sidebar zichtbaar):

```tsx
// /components/klant/KlantMobileHeader.tsx

// Stijl: wit, subtiele shadow
// Links: TT logo + bedrijfsnaam
// Rechts: notification bell (ongelezen berichten) + avatar cirkel

<header className="md:hidden sticky top-0 z-40 bg-white border-b border-[var(--kp-border)] px-4 py-3 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">TT</span>
    </div>
    <span className="font-semibold text-[var(--kp-text-primary)] text-sm">{bedrijfsnaam}</span>
  </div>

  <div className="flex items-center gap-3">
    {/* Notificatie bell */}
    <button className="relative">
      <Bell className="w-5 h-5 text-[var(--kp-text-secondary)]" />
      {ongelezen > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#F27501] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {ongelezen}
        </span>
      )}
    </button>

    {/* Avatar */}
    <div className="w-7 h-7 bg-[#1e3a5f] rounded-full flex items-center justify-center">
      <span className="text-white text-xs font-semibold">
        {contactpersoon.charAt(0).toUpperCase()}
      </span>
    </div>
  </div>
</header>
```

**Commit:** `feat: add mobile header to klant portal`

---

## STAP 3: OVERZICHT TAB REDESIGN

De huidige overzicht tab heeft 4 stats cards + aankomende diensten. Maak het compacter en zakelijker voor mobiel.

**Nieuwe mobiele layout:**

```
┌──────────────────────────────────────┐
│  Goedemiddag, Meneer Jansen 👋       │
│  Restaurant De Hoek · Amsterdam     │
└──────────────────────────────────────┘

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  3     │ │ 12u    │ │  2     │ │  1     │
│ Uren   │ │Goed-   │ │Reviews │ │Open    │
│ wachten│ │gekeurd │ │wachten │ │Factuur │
└────────┘ └────────┘ └────────┘ └────────┘
(horizontaal scrollbaar op mobiel)

┌──────────────────────────────────────┐
│  ⚡ Actie vereist                   │ ← Oranje accent
│  3 uren wachten op akkoord    →      │
│  2 medewerkers te beoordelen  →      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  VANDAAG & MORGEN                    │
│  ──────────────────────────────────  │
│  ✅ Ahmed · Kok · 17:00-23:00        │
│  ✅ Fatima · Bediening · 18:00-22:00 │
│  ─ Morgen: 3 diensten gepland        │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  [+ Personeel aanvragen]             │ ← Grote CTA knop
└──────────────────────────────────────┘
```

**Stats cards (horizontaal scrollbaar op mobiel):**
```tsx
<div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
  {stats.map(stat => (
    <motion.button
      key={stat.label}
      whileTap={{ scale: 0.97 }}
      onClick={() => onTabChange(stat.targetTab)}
      className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm border border-[var(--kp-border)] min-w-[100px]"
    >
      <p className="text-2xl font-bold text-[var(--kp-text-primary)]">{stat.value}</p>
      <p className="text-xs text-[var(--kp-text-secondary)] mt-0.5 leading-tight">{stat.label}</p>
      {stat.urgent && (
        <div className="w-2 h-2 bg-[#F27501] rounded-full mt-1.5" />
      )}
    </motion.button>
  ))}
</div>
```

**Actie vereist kaart:**
```tsx
{acties.length > 0 && (
  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
    <p className="text-sm font-semibold text-orange-800 mb-2">⚡ Actie vereist</p>
    {acties.map(actie => (
      <button
        key={actie.id}
        onClick={() => onTabChange(actie.tab)}
        className="flex items-center justify-between w-full py-2 border-b border-orange-100 last:border-0"
      >
        <span className="text-sm text-orange-700">{actie.tekst}</span>
        <ChevronRight className="w-4 h-4 text-orange-400" />
      </button>
    ))}
  </div>
)}
```

**Commit:** `feat: redesign klant overzicht tab for mobile with action cards`

---

## STAP 4: MOBIELE OPTIMALISATIES PER TAB

### Uren beoordelen — mobiel

Vervang de tabel door **swipeable kaarten** op mobiel:

```tsx
// Op mobiel (< 768px): kaartjes per uren-registratie
// Op desktop: bestaande tabel behouden

// Mobiele kaart per uren-registratie:
<div className="bg-white rounded-2xl p-4 border border-[var(--kp-border)] shadow-sm">
  <div className="flex items-start justify-between">
    <div>
      <p className="font-semibold text-[var(--kp-text-primary)]">{medewerker_naam}</p>
      <p className="text-sm text-[var(--kp-text-secondary)]">{formatDateLong(dienst_datum)}</p>
      <p className="text-xs text-[var(--kp-text-tertiary)] mt-0.5">{dienst_locatie}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-[var(--kp-text-primary)]">{gewerkte_uren}u</p>
      <p className="text-sm text-[var(--kp-text-secondary)]">€{(gewerkte_uren * uurtarief).toFixed(2)}</p>
    </div>
  </div>
  <div className="flex gap-2 mt-3">
    <button
      onClick={() => approveUren(id)}
      className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold"
    >
      ✓ Akkoord
    </button>
    <button
      onClick={() => openAanpassingModal(uren)}
      className="flex-1 py-2.5 rounded-xl border border-[var(--kp-border)] text-[var(--kp-text-secondary)] text-sm"
    >
      Aanpassen
    </button>
  </div>
</div>
```

### Aanvraag tab — mobiel geoptimaliseerd

De bestaande multi-step aanvraag werkt al. Zorg dat:
- Inputs groot genoeg zijn voor touch (min height 44px)
- Datum/tijd pickers native `<input type="date">` en `<input type="time">` gebruiken (iOS/Android native pickers)
- Stap indicator bovenaan zichtbaar op kleine schermen
- "Volgende" knop altijd onderaan zichtbaar (sticky)

```tsx
// Sticky bottom CTA op mobiel:
<div className="sticky bottom-0 bg-white border-t border-[var(--kp-border)] p-4 md:hidden">
  <button className="w-full py-3.5 rounded-2xl bg-[#1e3a5f] text-white font-semibold">
    {stap < 4 ? 'Volgende →' : 'Verstuur aanvraag'}
  </button>
</div>
```

### Facturen tab — mobiel

```tsx
// Factuurkaartje:
<div className="bg-white rounded-2xl p-4 border border-[var(--kp-border)] flex items-center gap-3">
  <div className="w-10 h-10 bg-[var(--kp-primary-light)] rounded-xl flex items-center justify-center flex-shrink-0">
    <FileText className="w-5 h-5 text-[var(--kp-primary)]" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-semibold text-[var(--kp-text-primary)] text-sm truncate">
      {factuur_nummer}
    </p>
    <p className="text-xs text-[var(--kp-text-secondary)]">
      {formatDate(periode_start)} – {formatDate(periode_eind)}
    </p>
  </div>
  <div className="text-right flex-shrink-0">
    <p className="font-bold text-[var(--kp-text-primary)]">€{totaal.toFixed(2)}</p>
    <span className={cn(
      "text-xs px-2 py-0.5 rounded-full font-medium",
      status === 'betaald'
        ? "bg-green-100 text-green-700"
        : "bg-amber-100 text-amber-700"
    )}>
      {status}
    </span>
  </div>
</div>
```

**Commit:** `feat: optimize all klant portal tabs for mobile`

---

## STAP 5: PWA VOOR KLANT PORTAAL

**Belangrijk:** De klant portaal PWA is **compleet apart** van de medewerker PWA:
- Andere app naam
- Andere kleur
- Andere start URL
- Medewerker installeert "TopTalent Medewerker" — blauw/oranje
- Klant installeert "TopTalent Beheer" — navy blauw

### `public/manifest-klant.json`

```json
{
  "name": "TopTalentJobs Beheer",
  "short_name": "TT Beheer",
  "description": "Beheer uw horeca personeel via TopTalentJobs",
  "start_url": "/klant/dashboard",
  "scope": "/klant/",
  "display": "standalone",
  "background_color": "#f0f4f8",
  "theme_color": "#1e3a5f",
  "orientation": "portrait",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "/icon-klant-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-klant-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-klant-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "/apple-touch-icon-klant.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

> **App icoon verschil:**
> - Medewerker: oranje achtergrond (`#F27501`) met wit "TT"
> - Klant: navy achtergrond (`#1e3a5f`) met wit "TT"
>
> Maak deze 4 PNG iconen aan met een simpel script of gebruik een online tool zoals pwa-asset-generator.

### Voeg manifest toe aan `/app/klant/layout.tsx`

```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // PWA meta tags
  manifest: '/manifest-klant.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TT Beheer',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'theme-color': '#1e3a5f',
  },
}

export default function KlantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Apple-specifieke meta tags (Metadata API dekt dit niet altijd) */}
      {/* Voeg toe via een client component als nodig */}
      {children}
    </>
  )
}
```

Of voeg toe via een `<head>` component in de klant layout:

```tsx
// In /app/klant/layout.tsx — als je directe <head> controle nodig hebt:
import Head from 'next/head'

// HEAD tags voor iOS:
<head>
  <link rel="manifest" href="/manifest-klant.json" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="TT Beheer" />
  <meta name="theme-color" content="#1e3a5f" />
  <link rel="apple-touch-icon" href="/apple-touch-icon-klant.png" />
</head>
```

### PWA Service Worker (next-pwa — al geïnstalleerd via medewerker portaal)

De `@ducanh2912/next-pwa` package is al geconfigureerd. Controleer `next.config.ts`:

```typescript
// next.config.ts — voeg klant start_url toe aan cache scope als nodig
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Beide portalen worden gecached door dezelfde service worker
  // De aparte manifests zorgen voor aparte PWA installaties
})
```

### "Installeer app" banner voor klanten

Voeg toe aan de **overzicht tab**, bovenaan, éénmalig zichtbaar:

```tsx
// Toon alleen als:
// 1. PWA nog niet geïnstalleerd (beforeinstallprompt event beschikbaar)
// 2. Gebruiker heeft banner niet eerder gesloten (localStorage flag)

const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
const [bannerGesloten, setBannerGesloten] = useState(
  typeof window !== 'undefined'
    ? localStorage.getItem('klant-pwa-banner-gesloten') === 'true'
    : false
)

useEffect(() => {
  const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
  window.addEventListener('beforeinstallprompt', handler)
  return () => window.removeEventListener('beforeinstallprompt', handler)
}, [])

const handleInstall = async () => {
  if (!installPrompt) return
  ;(installPrompt as any).prompt()
  const result = await (installPrompt as any).userChoice
  if (result.outcome === 'accepted') setInstallPrompt(null)
}

const handleSluit = () => {
  setBannerGesloten(true)
  localStorage.setItem('klant-pwa-banner-gesloten', 'true')
}

{installPrompt && !bannerGesloten && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#1e3a5f] rounded-2xl p-4 flex items-center gap-3 mb-4"
  >
    <span className="text-2xl">📲</span>
    <div className="flex-1">
      <p className="text-white font-semibold text-sm">Installeer TopTalent Beheer</p>
      <p className="text-blue-200 text-xs">Beheer uw personeel direct vanaf uw beginscherm</p>
    </div>
    <button
      onClick={handleInstall}
      className="bg-white text-[#1e3a5f] text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
    >
      Installeer
    </button>
    <button onClick={handleSluit} className="text-blue-300 ml-1">
      <X className="w-4 h-4" />
    </button>
  </motion.div>
)}
```

**iOS instructie** (Safari herkent beforeinstallprompt niet):
```tsx
// Detecteer iOS: /iPad|iPhone|iPod/.test(navigator.userAgent)
// Toon andere banner: "Tik op het deel-icoon en kies 'Zet op beginscherm'"
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

{isIOS && !isInStandaloneMode && !bannerGesloten && (
  <div className="bg-[#1e3a5f] rounded-2xl p-4 mb-4">
    <p className="text-white font-semibold text-sm">📲 Installeer TopTalent Beheer</p>
    <p className="text-blue-200 text-xs mt-1">
      Tik op <strong className="text-white">□↑</strong> onderaan en kies
      <strong className="text-white"> "Zet op beginscherm"</strong>
    </p>
  </div>
)}
```

**Commit:** `feat: add separate PWA manifest and install banner for klant portal`

---

## STAP 6: KlantUrenClient UPDATEN

Vervang de bestaande `PortalLayout` import in `KlantUrenClient.tsx` door de nieuwe `KlantPortalLayout`:

```tsx
// VOOR:
import PortalLayout, { PortalTab } from "@/components/portal/PortalLayout"

// NA:
import KlantPortalLayout from "@/components/klant/KlantPortalLayout"
import KlantMobileHeader from "@/components/klant/KlantMobileHeader"
```

Pas de render aan:
```tsx
// VOOR:
return (
  <PortalLayout
    tabs={tabs}
    activeTab={activeTab}
    onTabChange={setActiveTab}
    portalType="klant"
    userName={klant.contactpersoon}
    onLogout={handleLogout}
  >
    {/* ... */}
  </PortalLayout>
)

// NA:
return (
  <>
    <KlantMobileHeader
      bedrijfsnaam={klant.bedrijfsnaam}
      contactpersoon={klant.contactpersoon}
      ongelezen={ongelezen}
    />
    <KlantPortalLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      bedrijfsnaam={klant.bedrijfsnaam}
      contactpersoon={klant.contactpersoon}
      onLogout={handleLogout}
    >
      {/* ... alle bestaande tab content, ongewijzigd ... */}
    </KlantPortalLayout>
  </>
)
```

**Commit:** `feat: switch KlantUrenClient to new KlantPortalLayout`

---

## IMPLEMENTATIE VOLGORDE

```
1. Design systeem klant kleuren aanmaken (klant-colors.ts + globals.css)
2. KlantBottomNav component
3. KlantPortalLayout (desktop sidebar + mobile wrapper)
4. KlantMobileHeader
5. KlantUrenClient updaten naar nieuwe layout
6. Overzicht tab redesign (stats cards + actie kaart)
7. Uren tab mobiele kaartjes
8. Aanvraag tab sticky CTA + touch-friendly inputs
9. Facturen tab mobiele kaartjes
10. PWA: manifest-klant.json + meta tags in layout
11. Installeer banner in overzicht tab
12. App iconen aanmaken (192px + 512px + 180px)
```

**Na elke stap:**
```bash
npx tsc --noEmit --skipLibCheck
npm run build
# Test op 375px (iPhone) + 390px (iPhone 15) + 768px (iPad) + 1280px (desktop)
```

---

## PWA TESTEN

Zodra deployed op Vercel:

**Android (Chrome):**
1. Open Chrome → ga naar `jouwsite.nl/klant/dashboard`
2. Chrome toont automatisch "Installeer TopTalent Beheer" banner
3. Of: drie puntjes → "App installeren"

**iPhone (Safari):**
1. Open Safari → ga naar `jouwsite.nl/klant/dashboard`
2. Tik op deel-icoon (□↑) onderaan
3. Kies "Zet op beginscherm"
4. App naam: "TT Beheer", icoon: navy blauw

**Controleer dat de twee apps apart staan:**
- Medewerker app: oranje icoon, naam "TopTalent Medewerker"
- Klant app: blauwe icoon, naam "TopTalent Beheer"
- Ze openen elk hun eigen portaal, geen verwarring

---

## DEFINITION OF DONE

✅ Klant portaal heeft eigen `KlantPortalLayout` — volledig los van medewerker portaal
✅ Navy blauwe sidebar op desktop — professioneel en zakelijk
✅ Mobiele bottom nav met max 5 tabs + "Meer" sheet
✅ Compacte mobiele header met notificatie bell
✅ Overzicht tab: horizontaal scrollbare stats + actie vereist sectie
✅ Uren tab: kaartjes op mobiel (geen tabel)
✅ Aanvraag tab: sticky bottom CTA + touch-friendly
✅ Facturen tab: compacte kaartjes mobiel
✅ `manifest-klant.json` aangemaakt met navy kleur en eigen app naam
✅ Meta tags correct in klant layout
✅ Installeer banner zichtbaar (Android: native prompt, iOS: instructie)
✅ App iconen aangemaakt (192px + 512px navy blauw)
✅ Op Android: "TT Beheer" installeerbaar als standalone app
✅ Op iPhone: via Safari "Zet op beginscherm" → blauwe app
✅ Twee aparte PWA installaties mogelijk op zelfde telefoon
✅ 0 TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
✅ `npm run build` succesvol
✅ Getest op 375px, 768px, 1280px
