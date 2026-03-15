# Master Prompt — Medewerker Portaal Redesign
## TopTalentJobs.nl | Modern · Apple-Style · Mobile-First

---

## ROL & CONTEXT

Je bent een senior product designer + frontend engineer gespecialiseerd in consumer-grade mobile apps. Je hebt bij Uber, Deliveroo en Linear gewerkt. Je werkt nu aan het **medewerker portaal van TopTalentJobs.nl** — een horeca uitzendbureau.

Stack: Next.js 14 (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS.

**Design inspiratie:**
- Apple iOS apps: groot, bold, veel witruimte, glassmorphism, vloeiende animaties
- Linear.app: clean, snel, subtiele micro-interactions
- Uber Driver App: worker-first UX, één klik acties, duidelijke status

**Bestaande portaal structuur (BEHOUD alles, alleen redesign):**
- `PortalLayout` → `PortalSidebar` + `PortalBottomNav`
- `MedewerkerDashboard` → 9 tabs: home, diensten, uren, beschikbaarheid, berichten, profiel, financieel, documenten, referral
- `DashboardHome` component
- API routes: `/api/medewerker/*`

**Absolute regel: geen bestaande logica, data fetching, of API routes aanpassen.**
Alleen visueel redesignen + nieuwe features toevoegen.

---

## DESIGN SYSTEEM

### Kleurenpalet (Apple-like)

```typescript
// /lib/design-system/colors.ts
export const colors = {
  // Primary — TopTalent oranje (al bestaand)
  primary: '#F27501',
  primaryDark: '#d96800',
  primaryLight: '#fff3e6',

  // Backgrounds — Apple-inspired
  bgPrimary: '#ffffff',
  bgSecondary: '#f2f2f7',    // iOS system background
  bgTertiary: '#ffffff',

  // Glassmorphism
  glassBg: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  glassBlur: 'blur(20px)',   // iOS-style backdrop blur

  // Text
  textPrimary: '#1c1c1e',    // iOS label
  textSecondary: '#6c6c70',  // iOS secondaryLabel
  textTertiary: '#aeaeb2',   // iOS tertiaryLabel

  // Status colors (Apple HIG)
  green: '#34c759',          // iOS systemGreen
  blue: '#007aff',           // iOS systemBlue
  red: '#ff3b30',            // iOS systemRed
  orange: '#ff9500',         // iOS systemOrange
  purple: '#af52de',         // iOS systemPurple
}
```

### Typografie

```css
/* Gebruik SF Pro (web-safe fallback) */
font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;

/* Schaalverdeling Apple-like */
.text-hero    { font-size: 34px; font-weight: 700; letter-spacing: -0.5px; }
.text-title1  { font-size: 28px; font-weight: 700; letter-spacing: -0.3px; }
.text-title2  { font-size: 22px; font-weight: 600; }
.text-title3  { font-size: 20px; font-weight: 600; }
.text-headline { font-size: 17px; font-weight: 600; }
.text-body    { font-size: 17px; font-weight: 400; }
.text-callout { font-size: 16px; font-weight: 400; }
.text-subhead { font-size: 15px; font-weight: 400; }
.text-footnote { font-size: 13px; font-weight: 400; }
.text-caption { font-size: 12px; font-weight: 400; }
```

### Animaties (Framer Motion)

```bash
npm install framer-motion
```

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
```

---

## PACKAGES INSTALLEREN

```bash
npm install framer-motion
npm install react-modal-sheet    # bottom sheets (Temzasse/react-modal-sheet)
npm install react-swipeable       # swipe gestures voor shift accept/decline
```

---

## REDESIGN ONDERDELEN

### 1. NIEUWE PORTAL LAYOUT

Vervang de huidige `PortalLayout` met een Apple-style versie.

**Desktop:** Compacte sidebar links (240px), glassmorphism navigatie items
**Mobile:** Bottom navigation bar (vaste hoogte 83px incl. safe area), exact zoals iOS tab bar

Maak `/components/portal/ApplePortalLayout.tsx`:

```tsx
// Kenmerken:
// - bg-[#f2f2f7] als pagina achtergrond (iOS grijs)
// - Sidebar heeft backdrop-blur met subtiele border
// - Tab items hebben spring-animatie bij selectie
// - Active tab: gekleurde indicator + label bold
// - Mobile bottom nav: exact iOS Tab Bar stijl

// Sidebar item design:
<motion.button
  whileTap={{ scale: 0.96 }}
  className={cn(
    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
    isActive
      ? "bg-[#F27501] text-white shadow-sm"
      : "text-neutral-600 hover:bg-white/80"
  )}
>
  <Icon className="w-5 h-5 flex-shrink-0" />
  <span>{label}</span>
  {badge > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center">{badge}</span>}
</motion.button>

// Mobile bottom nav (iOS-style):
// - backdrop-blur-xl bg-white/80 border-t border-neutral-200/50
// - Icons: 24px, labels: 10px
// - Active: primary kleur icon + label
// - Badge: rode dot/nummer rechtsboven icon
// - Hoogte: 49px + safe-area-inset-bottom
```

**Commit:** `feat: redesign portal layout with apple-style navigation`

---

### 2. DASHBOARD HOME REDESIGN

De huidige DashboardHome is functioneel maar visueel basic. Compleet redesignen naar Apple Wallet / iPhone Home-style.

**Nieuwe layout structuur:**

```
┌─────────────────────────────────┐
│  Goedemorgen, Ahmed 👋          │ ← Groot, bold greeting
│  Zondag 16 maart                │ ← Datum als subtitle
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  VOLGENDE DIENST                │ ← Glass card, prominent
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  🍽️  Restaurant De Hoek        │ ← Groot bedrijfsnaam
│  📍  Amsterdam                  │
│  📅  Morgen · 17:00 - 23:00     │
│  👨‍🍳 Kok                         │
│                                  │
│  [Routebeschrijving] [Details]  │ ← CTA buttons
└─────────────────────────────────┘

┌────────┐ ┌────────┐ ┌────────┐  ← Stats pills
│ 24     │ │ 156u   │ │ €2.4k  │
│ dienst │ │ gewerkt│ │ verdnd │
└────────┘ └────────┘ └────────┘

┌─────────────────────────────────┐
│  ⚡ Actie vereist               │ ← Notification cards
│  3 nieuwe aanbieding...    →    │
│  ID verlopen over 14 dagen  →   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  SNEL NAAR                      │
│  ┌──────────┐ ┌──────────┐     │ ← Icon grid
│  │Shifts    │ │Uren      │     │
│  │📋        │ │🕐        │     │
│  └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐     │
│  │Beschikb. │ │Verdienste│     │
│  │📅        │ │💰        │     │
│  └──────────┘ └──────────┘     │
└─────────────────────────────────┘
```

**Glassmorphism next-shift card:**
```tsx
<motion.div
  {...cardHover}
  className="relative overflow-hidden rounded-3xl p-5 shadow-xl"
  style={{
    background: 'linear-gradient(135deg, #F27501 0%, #d96800 100%)',
  }}
>
  {/* Decoratieve glassmorphism orb */}
  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
  <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-white/5 rounded-full blur-xl" />

  {/* Content */}
  <div className="relative z-10">
    {/* ... shift info */}
  </div>
</motion.div>
```

**Stats pills (iOS-style):**
```tsx
<div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
  {stats.map(stat => (
    <motion.div
      key={stat.label}
      whileTap={{ scale: 0.95 }}
      className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm border border-neutral-100/50"
    >
      <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{stat.label}</p>
    </motion.div>
  ))}
</div>
```

Voeg derde stat toe: **Verdiend deze maand** (€ bedrag, haalt op uit uren + uurtarief).

**Commit:** `feat: redesign dashboard home with apple-style cards and stats`

---

### 3. SHIFTS TAB — SWIPE TO ACCEPT

Dit is de meest gebruikte feature. Maak het als een **Tinder-style card stack** voor nieuwe aanbiedingen.

**Twee views:**
1. **Aanbiedingen** — nog te accepteren/weigeren (swipe UI)
2. **Mijn rooster** — al geaccepteerde diensten (kalender view)

**Swipe card implementatie:**
```tsx
import { useSwipeable } from 'react-swipeable'

// Elke aanbiedings-card:
// - Swipe rechts → Accept (groene overlay)
// - Swipe links → Decline (rode overlay)
// - Klik → Detail bottom sheet

const handlers = useSwipeable({
  onSwipedLeft: () => handleDecline(shift.id),
  onSwipedRight: () => handleAccept(shift.id),
  trackMouse: true,
})

// Card met directional indicator:
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 100) handleAccept(shift.id)
    if (info.offset.x < -100) handleDecline(shift.id)
  }}
  style={{ x: dragX }}
  className="bg-white rounded-3xl p-5 shadow-lg"
>
  {/* Groene overlay rechts */}
  <motion.div style={{ opacity: acceptOpacity }}
    className="absolute inset-0 bg-green-500/20 rounded-3xl flex items-center justify-start pl-8">
    <CheckCircle className="w-12 h-12 text-green-500" />
  </motion.div>

  {/* Rode overlay links */}
  <motion.div style={{ opacity: declineOpacity }}
    className="absolute inset-0 bg-red-500/20 rounded-3xl flex items-center justify-end pr-8">
    <X className="w-12 h-12 text-red-500" />
  </motion.div>

  {/* Card content */}
</motion.div>
```

**Shift detail — Bottom Sheet (react-modal-sheet):**
```tsx
import Sheet from 'react-modal-sheet'

<Sheet isOpen={!!selectedShift} onClose={() => setSelectedShift(null)}>
  <Sheet.Container>
    <Sheet.Header />    {/* drag handle */}
    <Sheet.Content>
      {/* Volledige shift detail */}
      {/* Map embed (Google Maps Static API) */}
      {/* Grote Accept / Decline buttons */}
    </Sheet.Content>
  </Sheet.Container>
  <Sheet.Backdrop onTap={() => setSelectedShift(null)} />
</Sheet>
```

**Mijn Rooster — Kalender view:**
```tsx
// Week view met dag kolommen
// Elke dienst als gekleurde blok op tijdlijn
// Scrollen door weken (swipe links/rechts)
// Klik op dienst → detail bottom sheet
```

**Commit:** `feat: swipe-to-accept shifts and calendar roster view`

---

### 4. UREN TAB REDESIGN

De huidige uren tab is een tabel. Vervang door een **tijdslijn per week** met visuele representatie.

**Nieuwe design:**
```
WEEK 10 — 4-8 MAART             [< Vorige] [Volgende >]
─────────────────────────────────────────────────────
Ma 4   ████████░░░░  6u30  Restaurant De Hoek  ✅
Di 5   ─── geen dienst ───────────────────────────
Wo 6   ████████████  8u00  Hotel Palace        ⏳ invullen
Do 7   ██████░░░░░░  5u15  Café Amsterdam      ✅
Vr 8   ─── geen dienst ───────────────────────────
─────────────────────────────────────────────────────
Totaal week: 19u45   Geschat: €276,50
```

Klik op een rij → Bottom sheet voor uren invullen (start/eind/pauze).

**Uren invullen bottom sheet:**
```
┌─────────────────────────────────┐
│  Uren invullen                  │
│  Restaurant De Hoek · Wo 6 mrt  │
├─────────────────────────────────┤
│  Starttijd      [17:00] ──────  │
│  Eindtijd       [23:00] ──────  │
│  Pauze          [30 min] ─────  │
│                                  │
│  Gewerkt: 5u30                  │
│                                  │
│  [Indienen]                     │
└─────────────────────────────────┘
```

Tijdpicker: gebruik native `<input type="time">` — voelt iOS-achtig op mobiel.

**Commit:** `feat: redesign uren tab with weekly timeline view`

---

### 5. BESCHIKBAARHEID — VISUELE WEEK PICKER

Vervang het huidige formulier door een **visuele maand kalender**.

```
MIJN BESCHIKBAARHEID — APRIL 2026
┌────────────────────────────────────┐
│ Ma  Di  Wo  Do  Vr  Za  Zo        │
│                  1   2   3   4    │
│  5   6   7   8   9  10  11        │
│       ✅  ✅  ✅       ⬜  ⬜      │
│ 12  13  14  15  16  17  18        │
│  ✅  ✅  ✅  ✅  ✅  ⬜  ⬜        │
│ ...                                │
└────────────────────────────────────┘

Klik op dag → toggle beschikbaar/niet beschikbaar
Lang indrukken → selecteer tijdvak (ochtend/middag/avond)
```

Kleur legenda:
- Groen = beschikbaar
- Grijs = niet beschikbaar
- Oranje = al geroosterd (dienst gepland)

**Commit:** `feat: visual calendar availability picker`

---

### 6. FINANCIEEL OVERZICHT REDESIGN

Maak het als een **Apple Wallet**-inspired pagina.

**Bovenkant: Balance card (glassmorphism):**
```
┌──────────────────────────────────┐
│  Verdiensten april               │ ← Glass card op gradient bg
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  €1.248,50                       │ ← Groot bedrag
│  ▲ €124 meer dan vorige maand   │ ← Trend
│                                   │
│  [Factuur aanvragen]             │
└──────────────────────────────────┘
```

**Grafiek (Recharts - al in stack):**
```
Verdiensten per maand (6 maanden)
Bar chart met oranje bars, clean grid
```

**Transactie lijst:**
```
3 mrt  Restaurant De Hoek   6u × €14,50   +€87,00
1 mrt  Hotel Palace         8u × €15,00   +€120,00
...
```

**Commit:** `feat: redesign financial overview with apple wallet style`

---

### 7. PROFIEL PAGINA — DIGITALE ID KAART

Voeg bovenaan de profiel pagina een **digitale ID kaart** toe:

```
┌──────────────────────────────────┐
│ 🟠 TopTalentJobs                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [📷]  Ahmed Al-Rashidi          │
│        Kok · Barman              │
│        Amsterdam                 │
│                                   │
│  ID: TT-2024-0047               │
│  Actief ✅  BSN ✅  ID ✅        │
└──────────────────────────────────┘
```

- Klik op kaart → flip animatie (voor/achterkant)
- Achterkant: QR code met medewerker ID (voor verificatie op locatie)
- "Toon aan klant" modus: fullscreen, helderheid naar max

**Implementatie QR:**
```bash
npm install qrcode.react
```

**Commit:** `feat: add digital ID card with QR code to profile page`

---

### 8. NIEUWE FEATURES

#### 8a. Gamification — Achievements

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
  -- bijv: '10_shifts', '50_hours', 'top_worker', 'first_shift'
  verdiend_op TIMESTAMPTZ DEFAULT NOW(),
  notificatie_gestuurd BOOLEAN DEFAULT FALSE
);
```

Bereken automatisch via een cron job of bij elke uren-update.

**Commit:** `feat: add gamification achievements to employee portal`

---

#### 8b. PWA — Installeerbaar op Telefoon

Voeg toe aan `next.config.ts`:

```typescript
// next.config.ts
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
})

module.exports = withPWA({
  // bestaande config
})
```

Maak `/public/manifest.json`:
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
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Voeg toe aan `/app/medewerker/layout.tsx`:
```tsx
// In <head>:
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="TopTalent" />
<meta name="theme-color" content="#F27501" />
```

Voeg "Installeer app" banner toe op home pagina (iOS: voeg toe aan beginscherm instructie, Android: native install prompt).

```bash
npm install @ducanh2912/next-pwa
```

**Commit:** `feat: add PWA support for installable mobile app`

---

#### 8c. Dark Mode

Voeg dark mode toe — medewerkers werken vaak 's avonds in donkere horeca omgevingen.

```tsx
// Toggle in profiel pagina
// Sla voorkeur op in localStorage
// Gebruik Tailwind dark: classes

// Kleurenpalet dark mode:
// bg: #000000 (iOS true black)
// bg-secondary: #1c1c1e
// cards: #2c2c2e
// text: #ffffff / #ebebf5 / #aeaeb2
```

Implementeer via `next-themes`:
```bash
npm install next-themes
```

**Commit:** `feat: add dark mode support for evening shifts`

---

#### 8d. In-App Notificaties

Voeg een **notificatie bell** toe aan de portal header (mobiel: in de bottom nav of header).

```tsx
// Notificatie types:
// - Nieuwe shift aanbieding → redirect naar diensten tab
// - Uren goedgekeurd/afgewezen → redirect naar uren tab
// - Bericht ontvangen → redirect naar berichten tab
// - Document verlopen → redirect naar documenten tab
// - Achievement verdiend 🎉 → confetti animatie

// Implementatie:
// - Polling elke 60 seconden via /api/medewerker/notificaties
// - Badge count op bell icon
// - Dropdown met laatste 5 notificaties
// - Markeer als gelezen bij klik
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
  link TEXT,           -- welke tab/pagina openen
  gelezen BOOLEAN DEFAULT FALSE,
  gelezen_op TIMESTAMPTZ
);
```

**Commit:** `feat: add in-app notification system`

---

## IMPLEMENTATIE VOLGORDE

Doe dit stap voor stap, commit na elke stap:

```
1. npm packages installeren (framer-motion, react-modal-sheet, etc.)
2. Design systeem bestanden aanmaken (colors.ts, animations.ts)
3. ApplePortalLayout — nieuwe layout met glassmorphism nav
4. DashboardHome redesign
5. Shifts tab — swipe UI + bottom sheet
6. Uren tab — weekly timeline
7. Beschikbaarheid — kalender picker
8. Financieel — wallet style
9. Profiel — digitale ID kaart + QR
10. Gamification achievements
11. PWA support
12. Dark mode
13. Notificaties
```

**Na elke stap:**
```bash
npx tsc --noEmit    # 0 TypeScript errors
npm run build       # succesvol
# Test op 375px (iPhone SE) + 390px (iPhone 15)
```

---

## REFERENTIE REPOS (ter inspiratie, niet kopiëren)

- `Kiranism/next-shadcn-dashboard-starter` — sidebar patterns
- `Temzasse/react-modal-sheet` — bottom sheet animaties
- `thenameiswiiwin/linear-clone` — micro-interaction patterns
- shadcn/ui blocks: `sidebar-07`, `dashboard-01` op ui.shadcn.com

---

## DEFINITION OF DONE

✅ Portaal voelt als een native iOS app op mobiel
✅ Alle animaties zijn smooth (geen jank, 60fps)
✅ Framer Motion transitions tussen tabs
✅ Swipe to accept/decline shifts werkt op touch
✅ Bottom sheets openen/sluiten met drag gesture
✅ Digitale ID kaart met QR code
✅ PWA: installeerbaar op iPhone/Android
✅ Dark mode werkt volledig
✅ In-app notificaties met badge count
✅ Gamification badges zichtbaar op home
✅ Alle bestaande functionaliteit werkt nog
✅ 0 TypeScript errors
✅ npm run build succesvol
✅ Getest op 375px, 390px, 768px, 1280px
