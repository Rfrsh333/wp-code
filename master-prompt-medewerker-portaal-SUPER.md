# 🚀 SUPER Master Prompt — TopTalent Hub Complete Redesign
## TopTalentJobs.nl | Modern · Apple-Style · Mobile-First · Dark Mode · PWA

---

## ROL & CONTEXT

Je bent een senior product designer + frontend engineer gespecialiseerd in consumer-grade mobile apps. Je combineert de beste patronen van Uber Driver App, Linear.app, en Apple iOS. Je werkt aan het **TopTalent Hub van TopTalentJobs.nl** — een horeca uitzendbureau.

**Stack:** Next.js 14 (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS, Framer Motion.

**Referentie repos die je MOET bekijken voor technische patronen:**
- `Kiranism/next-shadcn-dashboard-starter` (5.5k ⭐) — sidebar patterns, dark mode setup, layout structuur
- `Temzasse/react-modal-sheet` (2.4k ⭐) — bottom sheets met smooth drag gestures
- `pacocoursey/cmdk` (shadcn Command basis) — command palette patroon
- `pacocoursey/next-themes` — dark/light mode toggle, CSS variables aanpak
- shadcn/ui blocks: `dashboard-01`, `sidebar-07` op ui.shadcn.com

**Bestaande portaal structuur (BEHOUD alles, alleen redesign + uitbreiding):**
- `PortalLayout` → `PortalSidebar` + `PortalBottomNav`
- `MedewerkerDashboard` → 9 tabs: home, diensten, uren, beschikbaarheid, berichten, profiel, financieel, documenten, referral
- `DashboardHome` component
- API routes: `/api/medewerker/*`

**Absolute regel:** Geen bestaande logica, data fetching, of API routes aanpassen. Alleen visueel redesignen + nieuwe features toevoegen.

---

## ⭐ HIGH IMPACT FEATURES — VERPLICHT EERST IMPLEMENTEREN

De volgende 4 features zijn het meest zichtbaar voor medewerkers. Implementeer ze in deze volgorde vóór de rest:

1. **Dark/Light Mode Toggle** — Apple-style, animated sun/moon switch (Stap 12)
2. **Swipe to Accept/Decline Shifts** — Tinder-style card stack (Stap 5)
3. **Digitale ID Kaart + QR Code** — Flip animatie, fullscreen modus (Stap 9)
4. **PWA — Installeerbaar op Telefoon** — iOS/Android home screen app (Stap 11)

---

## DESIGN SYSTEEM

### Kleurenpalet — Light én Dark Mode

```typescript
// /lib/design-system/colors.ts

// === LIGHT MODE ===
export const lightColors = {
  primary: '#F27501',           // TopTalent oranje
  primaryDark: '#d96800',
  primaryLight: '#fff3e6',

  bgPage: '#f2f2f7',            // iOS system background (warm lichtgrijs)
  bgCard: '#ffffff',
  bgCardSecondary: '#f9f9f9',

  // Glassmorphism
  glassBg: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',

  // Text (iOS HIG)
  textPrimary: '#1c1c1e',
  textSecondary: '#6c6c70',
  textTertiary: '#aeaeb2',

  // Accents (Apple HIG)
  green: '#34c759',
  blue: '#007aff',
  red: '#ff3b30',
  orange: '#ff9500',
  purple: '#af52de',

  // Toggle specifiek (light mode)
  toggleBg: '#f0e6d0',          // Warm crème/beige track
  toggleCircle: '#ffd700',      // Gouden zon cirkel
  toggleTrack: '#e8d5b0',       // Subtiel beige border
}

// === DARK MODE ===
export const darkColors = {
  primary: '#F27501',
  primaryDark: '#d96800',
  primaryLight: '#2d1a00',

  bgPage: '#000000',            // iOS true black
  bgCard: '#1c1c1e',            // Tweede niveau
  bgCardSecondary: '#2c2c2e',   // Derde niveau

  // Glassmorphism dark
  glassBg: 'rgba(28, 28, 30, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // Text dark
  textPrimary: '#ffffff',
  textSecondary: '#ebebf5',
  textTertiary: '#aeaeb2',

  // Accents (iets helderder op dark)
  green: '#30d158',
  blue: '#0a84ff',
  red: '#ff453a',
  orange: '#ff9f0a',
  purple: '#bf5af2',

  // Toggle specifiek (dark mode)
  toggleBg: '#1a2a3a',          // Donker teal/navy track
  toggleCircle: '#4a9eff',      // Helder blauw maan cirkel
  toggleTrack: '#0d1f30',       // Diep navy border
}
```

### Tailwind CSS Variables Setup

Voeg toe aan `/app/globals.css`:

```css
:root {
  --bg-page: #f2f2f7;
  --bg-card: #ffffff;
  --bg-card-secondary: #f9f9f9;
  --text-primary: #1c1c1e;
  --text-secondary: #6c6c70;
  --text-tertiary: #aeaeb2;
  --border-color: rgba(0, 0, 0, 0.08);
  --toggle-bg: #f0e6d0;
  --toggle-circle: #ffd700;
  --glass-bg: rgba(255, 255, 255, 0.72);
}

.dark {
  --bg-page: #000000;
  --bg-card: #1c1c1e;
  --bg-card-secondary: #2c2c2e;
  --text-primary: #ffffff;
  --text-secondary: #ebebf5;
  --text-tertiary: #aeaeb2;
  --border-color: rgba(255, 255, 255, 0.08);
  --toggle-bg: #1a2a3a;
  --toggle-circle: #4a9eff;
  --glass-bg: rgba(28, 28, 30, 0.85);
}
```

### Typografie (Apple SF Pro)

```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;

/* Tailwind custom classes in tailwind.config.ts */
fontSize: {
  'hero':    ['34px', { lineHeight: '41px', fontWeight: '700', letterSpacing: '-0.5px' }],
  'title1':  ['28px', { lineHeight: '34px', fontWeight: '700', letterSpacing: '-0.3px' }],
  'title2':  ['22px', { lineHeight: '28px', fontWeight: '600' }],
  'title3':  ['20px', { lineHeight: '25px', fontWeight: '600' }],
  'headline':['17px', { lineHeight: '22px', fontWeight: '600' }],
  'body':    ['17px', { lineHeight: '22px', fontWeight: '400' }],
  'callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
  'subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
  'footnote':['13px', { lineHeight: '18px', fontWeight: '400' }],
  'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
}
```

### Animaties (Framer Motion)

```typescript
// /lib/design-system/animations.ts
export const spring = {
  gentle: { type: 'spring', stiffness: 300, damping: 30 },
  snappy: { type: 'spring', stiffness: 400, damping: 25 },
  bouncy: { type: 'spring', stiffness: 600, damping: 20 },
}

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
}

export const cardHover = {
  whileHover: { scale: 1.02, transition: spring.gentle },
  whileTap: { scale: 0.98 },
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: spring.gentle,
}
```

---

## PACKAGES INSTALLEREN

```bash
npm install framer-motion
npm install react-modal-sheet        # Temzasse/react-modal-sheet — bottom sheets
npm install react-swipeable           # swipe gestures
npm install next-themes               # dark/light mode
npm install qrcode.react              # QR code voor ID kaart
npm install @ducanh2912/next-pwa      # PWA support
```

---

## IMPLEMENTATIE STAPPEN — IN VOLGORDE UITVOEREN

---

### Stap 1: Packages + Design Systeem Bestanden

```bash
npm install framer-motion react-modal-sheet react-swipeable next-themes qrcode.react @ducanh2912/next-pwa
```

Maak aan:
- `/lib/design-system/colors.ts`
- `/lib/design-system/animations.ts`

**Commit:** `setup: install packages and create design system files`

---

### Stap 2: next-themes Setup

Voeg `ThemeProvider` toe aan `/app/medewerker/layout.tsx`:

```tsx
import { ThemeProvider } from 'next-themes'

export default function MedewerkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"          // voegt 'dark' class toe aan <html>
      defaultTheme="light"
      enableSystem={false}       // geen automatisch systeem-theme
      storageKey="toptalent-theme"
    >
      <html lang="nl" suppressHydrationWarning>
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="TopTalent" />
          <meta name="theme-color" content="#F27501" />
        </head>
        <body className="bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300">
          {children}
        </body>
      </html>
    </ThemeProvider>
  )
}
```

**Commit:** `setup: configure next-themes provider in medewerker layout`

---

### Stap 3: Nieuwe Portal Layout

Vervang de huidige `PortalLayout` met een Apple-style versie.

**Desktop:** Compacte sidebar links (240px), glassmorphism navigatie items
**Mobile:** Bottom navigation bar (83px incl. safe area), exact iOS Tab Bar stijl

Maak `/components/portal/ApplePortalLayout.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Sidebar item design:
<motion.button
  whileTap={{ scale: 0.96 }}
  className={cn(
    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
    "dark:text-neutral-400 dark:hover:bg-[#2c2c2e]",
    isActive
      ? "bg-[#F27501] text-white shadow-sm"
      : "text-neutral-600 hover:bg-white/80 dark:hover:bg-white/5"
  )}
>
  <Icon className="w-5 h-5 flex-shrink-0" />
  <span>{label}</span>
  {badge > 0 && (
    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center">
      {badge}
    </span>
  )}
</motion.button>

// Mobile bottom nav (iOS-style):
// - backdrop-blur-xl bg-white/80 dark:bg-black/80
// - border-t border-neutral-200/50 dark:border-white/8
// - Hoogte: 49px + safe-area-inset-bottom
// - active: #F27501 icon + label
```

Voeg toe aan `/app/globals.css`:
```css
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

**Commit:** `feat: redesign portal layout with apple-style navigation and dark mode support`

---

### Stap 4: Dashboard Home Redesign

De huidige DashboardHome vervangen door Apple Wallet / iPhone Home-style.

**Nieuwe layout structuur:**

```
┌─────────────────────────────────┐
│  Goedemorgen, Ahmed 👋          │ ← Bold greeting + naam uit Supabase
│  Zondag 16 maart                │ ← Datum subtitle
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  VOLGENDE DIENST                │ ← Glassmorphism card op oranje gradient
│  🍽️  Restaurant De Hoek        │
│  📅  Morgen · 17:00 - 23:00    │
│  👨‍🍳 Kok  📍 Amsterdam          │
│  [Routebeschrijving] [Details]  │
└─────────────────────────────────┘

┌────────┐ ┌────────┐ ┌────────┐  ← Stats pills
│ 24     │ │ 156u   │ │ €2.4k  │
│ dienst │ │ gewerkt│ │ verdnd │
└────────┘ └────────┘ └────────┘

┌─────────────────────────────────┐
│  ⚡ Actie vereist               │
│  3 nieuwe aanbiedingen     →    │
│  ID verlopen over 14 dagen →    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  SNEL NAAR                      │
│  [Shifts] [Uren] [Beschikb.] [€]│
└─────────────────────────────────┘
```

**Volgende dienst card (glassmorphism + gradient):**
```tsx
<motion.div
  {...cardHover}
  className="relative overflow-hidden rounded-3xl p-5 shadow-xl"
  style={{ background: 'linear-gradient(135deg, #F27501 0%, #d96800 100%)' }}
>
  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
  <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-white/5 rounded-full blur-xl" />
  <div className="relative z-10 text-white">
    {/* shift info */}
  </div>
</motion.div>
```

**Commit:** `feat: redesign dashboard home with apple-style cards and stats`

---

### Stap 5: ⭐ Shifts Tab — Swipe to Accept (HIGH IMPACT)

Dit is de meest gebruikte feature. Maak het als een **Tinder-style card stack** voor nieuwe shift aanbiedingen.

**Twee views:**
1. **Aanbiedingen** — te accepteren/weigeren (swipe UI)
2. **Mijn rooster** — geaccepteerde diensten (kalender view)

**Swipe card implementatie:**

```tsx
'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { CheckCircle, X } from 'lucide-react'

export function SwipeShiftCard({ shift, onAccept, onDecline }: ShiftCardProps) {
  const x = useMotionValue(0)

  // Kleur overlays op basis van drag richting
  const acceptOpacity = useTransform(x, [0, 100], [0, 1])
  const declineOpacity = useTransform(x, [-100, 0], [1, 0])
  const rotate = useTransform(x, [-200, 200], [-15, 15])

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) onAccept(shift.id)
    else if (info.offset.x < -100) onDecline(shift.id)
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      className="relative bg-[var(--bg-card)] rounded-3xl p-5 shadow-lg cursor-grab active:cursor-grabbing touch-none"
    >
      {/* Groen overlay (accepteren) */}
      <motion.div
        style={{ opacity: acceptOpacity }}
        className="absolute inset-0 bg-green-500/20 rounded-3xl flex items-center justify-start pl-8 pointer-events-none"
      >
        <div className="bg-green-500 rounded-full p-2">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <span className="ml-3 text-green-600 font-bold text-lg dark:text-green-400">ACCEPTEREN</span>
      </motion.div>

      {/* Rood overlay (weigeren) */}
      <motion.div
        style={{ opacity: declineOpacity }}
        className="absolute inset-0 bg-red-500/20 rounded-3xl flex items-center justify-end pr-8 pointer-events-none"
      >
        <span className="mr-3 text-red-600 font-bold text-lg dark:text-red-400">WEIGEREN</span>
        <div className="bg-red-500 rounded-full p-2">
          <X className="w-8 h-8 text-white" />
        </div>
      </motion.div>

      {/* Card content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-headline font-semibold text-[var(--text-primary)]">{shift.bedrijf}</h3>
            <p className="text-subhead text-[var(--text-secondary)]">{shift.locatie}</p>
          </div>
          <span className="bg-[#fff3e6] dark:bg-[#2d1a00] text-[#F27501] text-caption font-semibold px-2.5 py-1 rounded-full">
            {shift.functie}
          </span>
        </div>
        <div className="flex items-center gap-4 text-subhead text-[var(--text-secondary)]">
          <span>📅 {shift.datum}</span>
          <span>🕐 {shift.starttijd} - {shift.eindtijd}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-title3 font-bold text-[var(--text-primary)]">€{shift.uurtarief}/uur</span>
          <span className="text-footnote text-[var(--text-secondary)]">
            ≈ €{(parseFloat(shift.uurtarief) * shift.uren).toFixed(2)} totaal
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// Swipe instructie hint (eerste keer):
// Animeer een demo-swipe bij eerste gebruik
// "← Weigeren   Accepteren →"
```

**Swipe hint onderaan de card stack:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex justify-between px-8 mt-4 text-caption text-[var(--text-tertiary)]"
>
  <span>← Weigeren</span>
  <span>Accepteren →</span>
</motion.div>
```

**Shift detail — Bottom Sheet (react-modal-sheet):**
```tsx
import Sheet from 'react-modal-sheet'

<Sheet isOpen={!!selectedShift} onClose={() => setSelectedShift(null)} snapPoints={[600, 300]}>
  <Sheet.Container className="!bg-[var(--bg-card)] !rounded-t-[24px]">
    <Sheet.Header className="pt-2">
      {/* Drag handle */}
      <div className="w-10 h-1 bg-[var(--text-tertiary)] rounded-full mx-auto opacity-40" />
    </Sheet.Header>
    <Sheet.Content className="px-5 pb-8">
      <h2 className="text-title2 font-bold text-[var(--text-primary)] mt-4">{selectedShift?.bedrijf}</h2>
      {/* Shift details */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => handleDecline(selectedShift!.id)}
          className="flex-1 py-3.5 rounded-2xl border-2 border-red-500 text-red-500 font-semibold"
        >
          Weigeren
        </button>
        <button
          onClick={() => handleAccept(selectedShift!.id)}
          className="flex-1 py-3.5 rounded-2xl bg-[#F27501] text-white font-semibold shadow-lg"
        >
          Accepteren ✓
        </button>
      </div>
    </Sheet.Content>
  </Sheet.Container>
  <Sheet.Backdrop onTap={() => setSelectedShift(null)} className="!bg-black/40 backdrop-blur-sm" />
</Sheet>
```

**Mijn Rooster — Week kalender view:**
```tsx
// Week view met dag kolommen
// Dienst als gekleurde blok op tijdlijn
// Swipe links/rechts voor andere weken
// Klik → detail bottom sheet
```

**Commit:** `feat: swipe-to-accept shifts with bottom sheet details`

---

### Stap 6: Uren Tab — Weekoverzicht

Vervang de tabel door een **tijdslijn per week** met visuele representatie.

```
WEEK 10 — 4-8 MAART             [< Vorige] [Volgende >]
──────────────────────────────────────────────────────
Ma 4   ████████░░░░  6u30  Restaurant De Hoek  ✅
Di 5   ─── geen dienst ──────────────────────────
Wo 6   ████████████  8u00  Hotel Palace        ⏳ invullen
Do 7   ██████░░░░░░  5u15  Café Amsterdam      ✅
Vr 8   ─── geen dienst ──────────────────────────
──────────────────────────────────────────────────────
Totaal: 19u45   Geschat: €276,50
```

Klik op rij → bottom sheet voor uren invullen (native `<input type="time">` — iOS-achtig op mobiel).

**Commit:** `feat: redesign uren tab with weekly timeline view`

---

### Stap 7: Beschikbaarheid — Visuele Maandkalender

Vervang het formulier door een **visuele maand kalender**:

- Groen = beschikbaar
- Grijs = niet beschikbaar
- Oranje = al geroosterd

Klik op dag → toggle beschikbaar/niet
Lang indrukken → selecteer tijdvak (ochtend/middag/avond)

**Commit:** `feat: visual calendar availability picker`

---

### Stap 8: Financieel — Apple Wallet Style

**Balance card (glassmorphism op gradient achtergrond):**
```
€1.248,50                         ← Groot bedrag
▲ €124 meer dan vorige maand     ← Trend indicator
[Factuur aanvragen]
```

**Recharts bar chart** (al in stack) — verdiensten per 6 maanden, oranje bars.

**Transactie lijst** per dienst met datum/bedrijf/uren/bedrag.

**Commit:** `feat: redesign financial overview with apple wallet style`

---

### Stap 9: ⭐ Profiel — Digitale ID Kaart + QR Code (HIGH IMPACT)

Voeg bovenaan de profiel pagina een **digitale ID kaart** toe met 3D flip animatie.

**Voorkant:**
```
┌──────────────────────────────────┐
│ 🟠 TopTalentJobs                 │
│ ──────────────────────────────── │
│  [📷]  Ahmed Al-Rashidi          │ ← Profielfoto
│        Kok · Barman              │ ← Functies
│        Amsterdam                 │
│                                   │
│  ID: TT-2024-0047               │
│  Actief ✅  BSN ✅  ID ✅        │
│                                   │
│  [Toon aan klant 📱]             │ ← Fullscreen modus
└──────────────────────────────────┘
```

**Achterkant (na flip):**
```
┌──────────────────────────────────┐
│  SCAN VOOR VERIFICATIE           │
│                                   │
│     ████████████████             │
│     ██      ██      ██           │ ← QR code
│     ██  ██  ██  ██  ██           │
│     ████████████████             │
│                                   │
│  TT-2024-0047 · Ahmed            │
│  Geldig t/m: dec 2026            │
└──────────────────────────────────┘
```

**Implementatie (3D CSS flip + Framer Motion):**

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode.react'

export function DigitaleIDKaart({ medewerker }: { medewerker: Medewerker }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const qrData = JSON.stringify({
    id: medewerker.id,
    naam: medewerker.naam,
    token: medewerker.verificatie_token, // sla op in DB, genereer bij account aanmaken
    geldig_tot: medewerker.contract_eind,
  })

  return (
    <div className="perspective-1000">
      <motion.div
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-52 cursor-pointer"
      >
        {/* VOORKANT */}
        <div
          className="absolute inset-0 backface-hidden rounded-3xl p-5 overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-700 flex-shrink-0">
              {medewerker.foto_url
                ? <img src={medewerker.foto_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
              }
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg leading-tight">{medewerker.naam}</p>
              <p className="text-neutral-400 text-sm mt-0.5">{medewerker.functies?.join(' · ')}</p>
              <p className="text-neutral-500 text-xs mt-1">{medewerker.stad}</p>
            </div>
            <span className="text-[#F27501] font-bold text-sm">TopTalent</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-xs">MEDEWERKER ID</p>
              <p className="text-white font-mono text-sm font-semibold">TT-{medewerker.id.slice(0,8).toUpperCase()}</p>
            </div>
            <div className="flex gap-2">
              {medewerker.bsn_geverifieerd && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">BSN ✓</span>}
              {medewerker.id_geverifieerd && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">ID ✓</span>}
            </div>
          </div>
          <p className="text-neutral-600 text-xs mt-2 text-right">Tik om QR te zien →</p>
        </div>

        {/* ACHTERKANT */}
        <div
          className="absolute inset-0 backface-hidden rounded-3xl p-5 flex flex-col items-center justify-center bg-[#1c1c1e] shadow-xl"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <p className="text-neutral-400 text-xs font-semibold tracking-widest mb-4">SCAN VOOR VERIFICATIE</p>
          <div className="bg-white p-3 rounded-2xl">
            <QRCode value={qrData} size={140} level="H" />
          </div>
          <p className="text-neutral-400 text-xs mt-4">
            TT-{medewerker.id.slice(0,8).toUpperCase()} · {medewerker.naam}
          </p>
          <p className="text-neutral-600 text-xs mt-1">← Tik om terug te draaien</p>
        </div>
      </motion.div>

      {/* Toon aan klant — fullscreen modus */}
      <button
        onClick={() => setIsFullscreen(true)}
        className="mt-3 w-full py-2.5 rounded-2xl bg-[var(--bg-card-secondary)] text-[var(--text-secondary)] text-sm font-medium flex items-center justify-center gap-2"
      >
        📱 Toon aan klant (fullscreen)
      </button>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8"
            onClick={() => setIsFullscreen(false)}
          >
            <div className="bg-white p-4 rounded-3xl">
              <QRCode value={qrData} size={240} level="H" />
            </div>
            <p className="text-white text-lg font-bold mt-6">{medewerker.naam}</p>
            <p className="text-neutral-400 text-sm mt-1">TopTalentJobs Medewerker</p>
            <p className="text-neutral-600 text-xs mt-8">Tik om te sluiten</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

Voeg toe aan `/app/globals.css`:
```css
.perspective-1000 { perspective: 1000px; }
.backface-hidden { backface-visibility: hidden; }
```

**Verificatiepagina voor klanten** (restaurant manager scant QR):
Maak `/app/verify/[token]/page.tsx` — publiek toegankelijk, toont naam + foto + status van medewerker.

**Commit:** `feat: add digital ID card with QR code and fullscreen verification mode`

---

### Stap 10: Gamification — Achievements

Voeg toe aan de home pagina (onderaan, collapsible):

```
JOUW BADGES
🔥 10 diensten op rij     ● ● ● ● ● ● ● ● ● ●
⭐ Topmedewerker maart    [Verdiend!]
🎯 50 uren milestone      [Bijna: 43/50u]
```

Database tabel:
```sql
CREATE TABLE IF NOT EXISTS medewerker_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medewerker_id UUID REFERENCES medewerkers(id),
  achievement_type TEXT NOT NULL,
  verdiend_op TIMESTAMPTZ DEFAULT NOW(),
  notificatie_gestuurd BOOLEAN DEFAULT FALSE
);
```

**Commit:** `feat: add gamification achievements to employee portal`

---

### Stap 11: ⭐ PWA — Installeerbaar als App (HIGH IMPACT)

**next.config.ts:**
```typescript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
})

module.exports = withPWA({ /* bestaande config */ })
```

**`/public/manifest.json`:**
```json
{
  "name": "TopTalentJobs Medewerker",
  "short_name": "TopTalent",
  "description": "Jouw shifts, uren en verdiensten",
  "start_url": "/medewerker/dashboard",
  "display": "standalone",
  "background_color": "#f2f2f7",
  "theme_color": "#F27501",
  "orientation": "portrait",
  "categories": ["productivity", "business"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ],
  "screenshots": [
    { "src": "/screenshot-mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

**"Installeer app" banner op home pagina:**
```tsx
// Detecteer of PWA installeerbaar is via beforeinstallprompt event
// iOS: toon "Voeg toe aan beginscherm" instructie
// Android: toon native install prompt

const [installPrompt, setInstallPrompt] = useState<Event | null>(null)

useEffect(() => {
  const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
  window.addEventListener('beforeinstallprompt', handler)
  return () => window.removeEventListener('beforeinstallprompt', handler)
}, [])

{installPrompt && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#F27501] rounded-2xl p-4 flex items-center gap-3 mb-4"
  >
    <span className="text-2xl">📱</span>
    <div className="flex-1">
      <p className="text-white font-semibold text-sm">Installeer de app</p>
      <p className="text-orange-100 text-xs">Voeg TopTalent toe aan je beginscherm</p>
    </div>
    <button onClick={handleInstall} className="bg-white text-[#F27501] text-xs font-semibold px-3 py-1.5 rounded-xl">
      Installeer
    </button>
  </motion.div>
)}
```

**Commit:** `feat: add PWA support for installable mobile app`

---

### Stap 12: ⭐ Dark/Light Mode Toggle (HIGH IMPACT)

Dit is de meest zichtbare visuele feature. Implementeer een **animated toggle** met zon (licht) en maan (donker) iconen.

**Design (exact zoals de afbeelding):**
- **Light mode:** Warm crème/beige track (`#f0e6d0`), gouden gele cirkel met zon icoon ☀️
- **Dark mode:** Donker teal/navy track (`#1a2a3a`), helder blauwe cirkel met maan icoon 🌙
- Cirkel glijdt soepel van links naar rechts (spring animatie)
- Track kleur verandert mee met smooth transition

**Component — `/components/portal/ThemeToggle.tsx`:**

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Voorkom hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-14 h-7 rounded-full bg-neutral-200 animate-pulse" />

  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F27501] rounded-full"
      aria-label={isDark ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus'}
    >
      {/* Track */}
      <motion.div
        className="w-14 h-7 rounded-full flex items-center px-0.5"
        animate={{
          backgroundColor: isDark ? '#1a2a3a' : '#f0e6d0',
          boxShadow: isDark
            ? 'inset 0 2px 4px rgba(0,0,0,0.4)'
            : 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Sliding cirkel */}
        <motion.div
          className="w-6 h-6 rounded-full flex items-center justify-center shadow-md"
          animate={{
            x: isDark ? 28 : 0,  // schuif van links naar rechts
            backgroundColor: isDark ? '#4a9eff' : '#ffd700',
            boxShadow: isDark
              ? '0 2px 8px rgba(74, 158, 255, 0.5)'
              : '0 2px 8px rgba(255, 215, 0, 0.5)',
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        >
          {/* Icoon binnen de cirkel */}
          <motion.span
            animate={{ opacity: 1, rotate: isDark ? 0 : 360 }}
            transition={{ duration: 0.3 }}
            className="text-xs leading-none select-none"
          >
            {isDark ? '🌙' : '☀️'}
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.button>
  )
}
```

**Gebruik de toggle op 2 plekken:**

1. **In de profiel pagina** (primaire locatie, prominente sectie):
```tsx
// In /components/medewerker/ProfielTab.tsx (of vergelijkbaar)
<div className="bg-[var(--bg-card)] rounded-2xl p-4 flex items-center justify-between">
  <div>
    <p className="text-[var(--text-primary)] font-semibold">Weergave</p>
    <p className="text-[var(--text-secondary)] text-sm">
      {theme === 'dark' ? 'Donkere modus' : 'Lichte modus'}
    </p>
  </div>
  <ThemeToggle />
</div>
```

2. **In de portal header** (altijd zichtbaar, rechtsboven):
```tsx
// In ApplePortalLayout header of sidebar footer
<div className="flex items-center gap-2">
  <span className="text-xs text-[var(--text-tertiary)]">
    {theme === 'dark' ? '🌙' : '☀️'}
  </span>
  <ThemeToggle />
</div>
```

**Dark mode klassen op alle componenten:**

Vervang hardcoded kleuren door CSS variabelen of dark: classes. Voorbeelden:

```tsx
// VOOR:
className="bg-white text-neutral-900 border-neutral-200"

// NA:
className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)]"

// Of met Tailwind dark: classes:
className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white"
```

**Belangrijke dark mode regels:**
- Achtergronden: `bg-white` → `dark:bg-[#1c1c1e]`, page bg: `dark:bg-black`
- Cards: `dark:bg-[#2c2c2e]`
- Text: `dark:text-white` / `dark:text-neutral-400`
- Borders: `dark:border-white/10`
- Oranje gradient card (volgende dienst): blijft oranje — geen dark mode variant nodig
- Bottom nav: `dark:bg-black/90 dark:border-white/8`

**Commit:** `feat: add animated dark/light mode toggle with sun/moon design`

---

### Stap 13: In-App Notificaties

Voeg een **notificatie bell** toe aan de portal header.

```tsx
// Notificatie types:
// - Nieuwe shift aanbieding → redirect naar diensten tab
// - Uren goedgekeurd/afgewezen → redirect naar uren tab
// - Bericht ontvangen → redirect naar berichten tab
// - Document verlopen → redirect naar documenten tab
// - Achievement verdiend 🎉 → confetti animatie

// Polling elke 60 seconden via /api/medewerker/notificaties
// Badge count op bell icon
// Dropdown met laatste 5 notificaties
// Markeer als gelezen bij klik
```

Database:
```sql
CREATE TABLE IF NOT EXISTS medewerker_notificaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  titel TEXT NOT NULL,
  bericht TEXT,
  link TEXT,
  gelezen BOOLEAN DEFAULT FALSE,
  gelezen_op TIMESTAMPTZ
);
```

**Commit:** `feat: add in-app notification system with bell icon`

---

## VOLLEDIGE IMPLEMENTATIE VOLGORDE

```
1.  npm packages installeren
2.  Design systeem bestanden (colors.ts, animations.ts)
3.  next-themes setup + globals.css variabelen
4.  ApplePortalLayout — glassmorphism nav + dark mode support
    → Test: sidebar opent, tabs werken, bottom nav zichtbaar op 375px
5.  ★ DARK/LIGHT MODE TOGGLE — ThemeToggle component + profiel sectie
    → Test: toggle klikt, zon↔maan animatie smooth, dark mode activates
6.  ★ SWIPE SHIFTS — SwipeShiftCard + bottom sheet
    → Test: swipe rechts = groen overlay, swipe links = rood overlay
7.  ★ DIGITALE ID KAART + QR — flip animatie, fullscreen modus
    → Test: kaart flipt, QR code zichtbaar, fullscreen werkt
8.  ★ PWA — manifest.json + next-pwa config + install banner
    → Test: manifest geladen, "Installeer" verschijnt op Android
9.  DashboardHome redesign
10. Uren tab — weekly timeline
11. Beschikbaarheid — maandkalender
12. Financieel — wallet style
13. Gamification achievements
14. In-app notificaties
```

**Na elke stap:**
```bash
npx tsc --noEmit --skipLibCheck   # TypeScript check (skipLibCheck voor snelheid)
npm run build                      # succesvol
# Test op 375px (iPhone SE) + 390px (iPhone 15) + 1280px (desktop)
```

---

## TECHNISCHE REFERENTIES

### Repo's voor inspiratie (patronen, niet letterlijk kopiëren):

| Repo | Sterren | Gebruikt voor |
|------|---------|---------------|
| `Kiranism/next-shadcn-dashboard-starter` | 5.5k ⭐ | Dark mode setup, layout structuur, shadcn patronen |
| `Temzasse/react-modal-sheet` | 2.4k ⭐ | Bottom sheets animaties en drag behavior |
| `pacocoursey/next-themes` | 4.1k ⭐ | Dark/light mode met next-themes, CSS variabelen aanpak |
| `thenameiswiiwin/linear-clone` | Linear-style | Micro-interactions, keyboard navigation |
| `shadcn/ui blocks` | ui.shadcn.com | `dashboard-01`, `sidebar-07` layout patronen |

### Dark Mode aanpak (next-shadcn-dashboard-starter patroon):

```typescript
// 1. ThemeProvider wrapping hele app
// 2. CSS variabelen in :root en .dark selector
// 3. Tailwind dark: classes voor component-level overrides
// 4. useTheme() hook voor programmatische toegang
// 5. suppressHydrationWarning op <html> tag (verplicht!)
```

### Swipe UX (Framer Motion patroon):

```typescript
// useMotionValue(0) voor x positie
// useTransform(x, [0, 100], [0, 1]) voor overlay opacity
// drag="x" + dragConstraints={{ left: 0, right: 0 }}
// dragElastic={0.2} voor natuurlijk gevoel
// onDragEnd check: offset.x > 100 = accept, < -100 = decline
```

### QR Verificatie flow:

```
medewerker klikt "Toon aan klant"
    ↓
Fullscreen QR code met verificatie token
    ↓
Klant (restaurant manager) scant met camera
    ↓
/verify/[token] pagina opent in browser
    ↓
Pagina toont: naam, foto, functies, geldigheid, TopTalent logo
```

---

## DEFINITION OF DONE

✅ Toggle: zon↔maan animatie smooth, dark mode activates op hele portaal
✅ Swipe shifts: drag links/rechts werkt op touch, overlay feedback zichtbaar
✅ ID kaart: 3D flip animatie, QR code zichtbaar, fullscreen modus
✅ PWA: manifest geladen, installeerbaar op iPhone/Android
✅ Portaal voelt als een native iOS app op mobiel
✅ Alle animaties smooth (geen jank, 60fps)
✅ Framer Motion transitions tussen tabs
✅ Bottom sheets openen/sluiten met drag gesture
✅ Dark mode compleet: achtergronden, cards, tekst, borders, nav
✅ Gamification badges zichtbaar op home
✅ In-app notificaties met badge count
✅ Alle bestaande functionaliteit werkt nog exact hetzelfde
✅ 0 TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
✅ `npm run build` succesvol
✅ Getest op 375px (iPhone SE), 390px (iPhone 15), 768px (iPad), 1280px (desktop)
