# Master Prompt — Klant Portaal Uitbreidingen
## TopTalentJobs.nl | Restaurant & Horeca Klanten Dashboard

---

## ROL & CONTEXT

Je bent een senior fullstack engineer gespecialiseerd in B2B SaaS portalen. Je werkt aan het **klant portaal van TopTalentJobs.nl** — een horeca uitzendbureau. De klanten zijn restaurant managers en horeca bedrijven die via TopTalentJobs personeel inhuren.

**Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + RLS + Realtime), shadcn/ui, Tailwind CSS, Framer Motion.

**Referentie repos voor patronen (kijk hier naar voor technische inspiratie):**

| Repo | Sterren | Gebruikt voor |
|------|---------|---------------|
| `Kiranism/next-shadcn-dashboard-starter` | 5.5k ⭐ | Dashboard layout, stats cards, data tables |
| `adityathakurxd/next-supabase-chat` | — | Supabase Realtime chat met shadcn/ui |
| `TodoONada/nextjs-supabase-auth-and-realtime-chat` | — | Realtime messaging patronen |
| `HariKrishna-9885699666/qr-code-generator-react-supabase` | — | QR code + Supabase verificatie |
| `shadcn/ui blocks` | ui.shadcn.com | `dashboard-01`, data-table patronen |

---

## WAT ER AL BESTAAT — NIET AANPASSEN

Het klant portaal (`/src/app/klant/`) heeft al de volgende werkende functionaliteit:

**Bestaande tabs in `KlantUrenClient.tsx`:**
1. **Overzicht** — stats cards (uren wachten, goedgekeurd, reviews, open facturen) + aankomende diensten
2. **Uren beoordelen** — uren goedkeuren/aanpassen per medewerker
3. **Diensten** — aankomende geplande diensten
4. **Facturen** — overzicht facturen met viewUrl PDF link
5. **Beoordelingen** — 5-sterren review systeem (punctualiteit, professionaliteit, vaardigheden, communicatie)
6. **Verwijs & Bespaar** — referral programma

**Bestaande API routes:**
- `GET/POST /api/klant/uren` — uren ophalen + goedkeuren/aanpassen
- `GET /api/klant/beoordelingen` + `POST` — reviews
- `GET /api/klant/dashboard` — stats + upcoming diensten + facturen
- `GET /api/klant/referral`
- `POST /api/klant/login` + logout

**Absolute regel:** Geen bestaande logica, data fetching, of API routes aanpassen. Alleen uitbreiden.

---

## NIEUWE FEATURES — IN VOLGORDE IMPLEMENTEREN

---

### Feature 1: Favoriete Medewerkers

Klanten kunnen medewerkers die ze goed vinden markeren als favoriet. Bij een nieuwe dienstaanvraag worden favorieten automatisch als eerste ingepland.

**Database:**
```sql
CREATE TABLE IF NOT EXISTS klant_favoriete_medewerkers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID REFERENCES klanten(id) ON DELETE CASCADE,
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE CASCADE,
  notitie TEXT,                  -- bijv. "Vraag altijd naar Ahmed voor zaterdagavond"
  UNIQUE(klant_id, medewerker_id)
);

-- RLS
ALTER TABLE klant_favoriete_medewerkers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "klant_eigen_favorieten" ON klant_favoriete_medewerkers
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));
```

**Nieuwe API route `/api/klant/favorieten/route.ts`:**
```typescript
// GET — haal favoriete medewerkers op met naam + foto + functies + gemiddelde score
// POST — voeg medewerker toe aan favorieten (body: { medewerker_id, notitie? })
// DELETE — verwijder uit favorieten (body: { medewerker_id })
```

**Nieuwe tab "Favorieten" in KlantUrenClient:**
```tsx
// Lijstview met:
// - Profielfoto (of initialen placeholder)
// - Naam + functies (Kok, Barman, etc.)
// - Gemiddelde beoordeling (sterren)
// - Totaal diensten bij dit bedrijf
// - Notitie (bewerkbaar inline)
// - Verwijder knop
// - "Aanvragen" knop → opent aanvraagformulier met deze medewerker pre-geselecteerd

// Medewerkers die nog niet als favoriet zijn, maar wel eerder hebben gewerkt:
// "Voeg toe" sectie onderaan — toont recent gewerkte medewerkers met ⭐ toggle
```

**Commit:** `feat: add favorite employees feature to client portal`

---

### Feature 2: Rooster Overzicht (Week/Maand Kalender)

Klanten zien in één oogopslag wie er wanneer werkt, per locatie.

**Nieuwe tab "Rooster":**

```
ROOSTER APRIL 2026
[Week] [Maand]              [< Vorige] [Volgende >]

WEEK 14 — 1-6 APRIL
─────────────────────────────────────────────────────
Di 1   Ahmed A. (Kok)         17:00-23:00  Restaurant Centrum  ✅ Bevestigd
       Fatima B. (Bediening)  18:00-22:00  Restaurant Centrum  ✅ Bevestigd
─────────────────────────────────────────────────────
Wo 2   — Geen diensten gepland ────────────────────
─────────────────────────────────────────────────────
Do 3   Marco V. (Barman)      20:00-02:00  Bar Lounge          ⏳ Wacht op akkoord
─────────────────────────────────────────────────────
Vr 4   Ahmed A. (Kok)         17:00-23:00  Restaurant Centrum  ✅ Bevestigd
       Sarah K. (Bediening)   17:00-22:00  Restaurant Centrum  ✅ Bevestigd
─────────────────────────────────────────────────────
```

**Maandweergave:** Kalenderblokken met gekleurde dots per dag (groen = bevestigd, oranje = wacht, rood = probleem).

**Implementatie:**
```tsx
// /components/klant/RoosterTab.tsx

// State: view ('week' | 'month'), currentDate
// Data: haal op via /api/klant/rooster (nieuwe API route)
// Week view: lijst per dag, klik op dienst → detail slideover
// Maand view: kalender grid, klik op dag → week view van die dag

// Kleurcoding:
// bg-green-100 text-green-800 → bevestigd
// bg-amber-100 text-amber-800 → wacht op akkoord / ingediend
// bg-red-100 text-red-800 → probleem / geen medewerker gevonden
// bg-blue-100 text-blue-800 → aangevraagd (in behandeling)
```

**Nieuwe API route `/api/klant/rooster/route.ts`:**
```typescript
// GET /api/klant/rooster?start=2026-04-01&end=2026-04-30
// Haalt diensten + bijbehorende medewerkers + status op
// Joins: diensten → dienst_medewerkers → medewerkers
```

**Commit:** `feat: add roster calendar view to client portal`

---

### Feature 3: Personeel Aanvragen vanuit Portaal

Klanten kunnen direct vanuit het portaal nieuw personeel aanvragen, zonder e-mail of telefoon.

**Nieuwe tab "Aanvragen":**

```
NIEUW PERSONEEL AANVRAGEN

Stap 1: Functie
  [Kok] [Barman] [Bediening] [Afwasser] [Manager] [Anders]

Stap 2: Datum & Tijd
  Datum:     [Di 8 april 2026]
  Starttijd: [17:00]
  Eindtijd:  [23:00]
  Locatie:   [Restaurant Centrum (standaard)] ▼

Stap 3: Details
  Aantal personen: [1] [2] [3] [+]
  Bijzonderheden: [Ervaring met Italiaanse keuken gewenst...]

Stap 4: Favoriete medewerker
  □ Alleen favoriete medewerkers inzetten
  □ Ahmed Al-Rashidi indien beschikbaar

[Verstuur aanvraag]
```

**Implementatie `/components/klant/AanvraagTab.tsx`:**
```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Multi-step form (4 stappen)
// Stap indicator bovenaan (iOS-style progress dots of stepper)
// Validatie per stap voor doorgaan
// Submit → POST /api/klant/aanvraag
// Succesmelding + direct zichtbaar in Rooster tab als 'aangevraagd'

type AanvraagStep = 1 | 2 | 3 | 4

interface AanvraagForm {
  functie: string
  datum: string
  starttijd: string
  eindtijd: string
  locatie_id: string
  aantal: number
  bijzonderheden: string
  alleen_favorieten: boolean
  gewenste_medewerker_id?: string
}
```

**Nieuwe API route `/api/klant/aanvraag/route.ts`:**
```typescript
// POST — verwerkt aanvraag
// 1. Sla op in diensten tabel met status 'aangevraagd'
// 2. Stuur notificatie naar admin (Telegram + e-mail)
// 3. Als alleen_favorieten: markeer in aanvraag voor admin
// 4. Return bevestiging + dienst_id
```

**Commit:** `feat: add staff request form to client portal`

---

### Feature 4: QR Code Medewerker Verificatie

Wanneer een medewerker arriveert, scant de restaurantmanager de QR code op het digitale ID kaartje van de medewerker. De klant ziet direct: wie is dit, is dit de juiste persoon voor vandaag, en zijn alle documenten geldig?

**Verificatiepagina `/app/verify/[token]/page.tsx`:**
```tsx
// Publiek toegankelijk (geen login vereist)
// Toont na scannen:

┌──────────────────────────────────┐
│  ✅ Verificatie geslaagd          │
│                                   │
│  [📷 Profielfoto]                 │
│  Ahmed Al-Rashidi                 │
│  Kok · Barman                     │
│                                   │
│  🏢 Restaurant De Hoek           │  ← Verwacht bij dit bedrijf vandaag
│  📅 Di 8 april · 17:00-23:00     │
│                                   │
│  ✅ BSN geverifieerd              │
│  ✅ Identiteitsbewijs geldig      │
│  ✅ VOG aanwezig                  │
│                                   │
│  TopTalentJobs.nl                 │
│  📞 020-123 4567                  │
└──────────────────────────────────┘
```

**Database:**
```sql
-- Voeg verificatie_token toe aan medewerkers tabel (als nog niet aanwezig)
ALTER TABLE medewerkers
ADD COLUMN IF NOT EXISTS verificatie_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Log elke scan
CREATE TABLE IF NOT EXISTS verificatie_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gescand_op TIMESTAMPTZ DEFAULT NOW(),
  medewerker_id UUID REFERENCES medewerkers(id),
  gescand_door_klant_id UUID REFERENCES klanten(id),
  locatie TEXT,
  ip_adres TEXT
);
```

**Nieuwe API route `/api/verify/[token]/route.ts`:**
```typescript
// GET — lookup medewerker via token
// Geeft terug: naam, foto, functies, document status, dienst van vandaag bij dit klant-bedrijf
// Rate limit: max 10 scans per minuut per IP
// Logt elke scan in verificatie_logs
```

**Verificatiepagina features:**
- Grote, duidelijke status indicator (groen vinkje of rood kruis)
- Toont of de medewerker vandaag verwacht wordt bij DIT bedrijf
- Geen login nodig — werkt puur op token in QR
- Responsief — optimaal op telefoon scherm
- TopTalentJobs branding + contactnummer voor vragen

**Commit:** `feat: add QR verification page for employee check-in`

---

### Feature 5: Berichten / Chat met TopTalentJobs

Klanten kunnen direct vanuit het portaal berichten sturen naar het TopTalentJobs team. Geen e-mail meer nodig.

**Database (Supabase Realtime):**
```sql
CREATE TABLE IF NOT EXISTS klant_berichten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID REFERENCES klanten(id) ON DELETE CASCADE,
  afzender TEXT NOT NULL,        -- 'klant' | 'toptalent'
  bericht TEXT NOT NULL,
  bijlage_url TEXT,              -- optioneel: PDF/afbeelding bijlage
  gelezen BOOLEAN DEFAULT FALSE,
  gelezen_op TIMESTAMPTZ
);

-- RLS
ALTER TABLE klant_berichten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "klant_eigen_berichten" ON klant_berichten
  USING (klant_id = (SELECT id FROM klanten WHERE session_token = current_setting('app.klant_session', true)));

-- Realtime inschakelen
ALTER PUBLICATION supabase_realtime ADD TABLE klant_berichten;
```

**Nieuwe tab "Berichten" in KlantUrenClient:**
```tsx
// /components/klant/BerichtenTab.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function BerichtenTab({ klantId }: { klantId: string }) {
  const [berichten, setBerichten] = useState<Bericht[]>([])
  const [nieuwBericht, setNieuwBericht] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`klant-berichten-${klantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'klant_berichten',
        filter: `klant_id=eq.${klantId}`,
      }, (payload) => {
        setBerichten(prev => [...prev, payload.new as Bericht])
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [klantId, supabase])

  // UI: iMessage-style chat bubbles
  // Klant berichten: rechts, oranje bubble
  // TopTalent berichten: links, grijs bubble
  // Datum separators
  // Verzenden via Enter of knop
  // Scroll naar nieuwste bericht bij laden + nieuw bericht
}
```

**Chat UI (iMessage-stijl):**
```
┌──────────────────────────────────────┐
│  💬 Berichten — TopTalentJobs        │
│ ─────────────────────────────────── │
│                                       │
│     Ma 7 april · 14:32               │
│  [TopTalent]                          │
│  ┌──────────────────────────────┐    │
│  │ Beste meneer Jansen,          │    │
│  │ Uw aanvraag voor vrijdag is   │    │
│  │ bevestigd. Ahmed werkt die    │    │
│  │ avond bij u.                  │    │
│  └──────────────────────────────┘    │
│                                       │
│                           [Klant]     │
│    ┌───────────────────────────────┐  │
│    │ Top, bedankt! Kan hij ook de  │  │
│    │ zaterdagochtend erbij doen?   │  │
│    └───────────────────────────────┘  │
│                          14:45 ✓✓   │
│                                       │
│ ─────────────────────────────────── │
│  [Type een bericht...]     [Stuur →] │
└──────────────────────────────────────┘
```

**Nieuwe API route `/api/klant/berichten/route.ts`:**
```typescript
// GET — haal berichten op (max 50, meest recent)
// POST — stuur nieuw bericht
//   → Trigger Telegram notificatie naar TopTalentJobs team
//   → Stuur bevestigings-email naar team
// Markeer als gelezen bij GET
```

**Badge in tab navigatie:**
```tsx
// Toon ongelezen badge (rode dot) op "Berichten" tab
// Bereken: berichten WHERE afzender='toptalent' AND gelezen=false
```

**Commit:** `feat: add real-time messaging to client portal`

---

### Feature 6: Kosten Dashboard (Uitgaven Inzicht)

Klanten zien een overzichtelijk financieel dashboard: wat heeft dit jaar personeel gekost per maand, per functie, per locatie.

**Nieuwe sectie in "Overzicht" tab (of aparte "Kosten" tab):**

```
KOSTEN OVERZICHT 2026

Totaal besteed (dit jaar):  €12.450
Gemiddeld per maand:        €2.490
vs. vorige maand:           ▲ €340

┌─────────────────────────────────────────┐
│ Verdeling per functie (taartdiagram)    │
│  Kok          45% · €5.600              │
│  Bediening    30% · €3.740              │
│  Barman       15% · €1.870              │
│  Overig       10% · €1.240              │
└─────────────────────────────────────────┘

Maand voor maand (Recharts bar chart):
Jan  Feb  Mar  Apr  Mei  Jun
█    ██   ███  ████  ─    ─

Top medewerkers (uren × tarief):
1. Ahmed A.   142u  €2.130
2. Fatima B.   98u  €1.470
3. Marco V.    76u  €1.140
```

**Implementatie `/components/klant/KostenDashboard.tsx`:**
```tsx
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
// Recharts zit al in je project stack

// Data ophalen via /api/klant/kosten (nieuwe API route)
// Filtering: dit jaar / vorig jaar / custom periode
// Export knop: "Download als CSV" (simpele client-side CSV export)
```

**Nieuwe API route `/api/klant/kosten/route.ts`:**
```typescript
// GET /api/klant/kosten?jaar=2026
// Berekent uit uren_registraties × uurtarief per medewerker
// Groepeert per maand, functie, medewerker
// Bestaande goedgekeurde uren gebruiken als databron
```

**Commit:** `feat: add cost analytics dashboard to client portal`

---

## IMPLEMENTATIE VOLGORDE

```
1. Feature 4: QR Verificatiepagina (/app/verify/[token]) — standalone, geen login nodig
   → Meteen nuttig want medewerkers portaal heeft al QR code (stap 9 medewerker prompt)

2. Feature 1: Favoriete Medewerkers — database tabel + API + UI tab
   → Relatief eenvoudig, grote waarde voor klanten

3. Feature 3: Personeel Aanvragen — multi-step form
   → Vermindert e-mail/telefoon voor TopTalentJobs team

4. Feature 2: Rooster Overzicht — kalender UI
   → Bouwt verder op bestaande diensten data

5. Feature 6: Kosten Dashboard — Recharts visualisaties
   → Bouwt op bestaande facturen/uren data

6. Feature 5: Berichten/Chat — Supabase Realtime
   → Meest complex, bewaar voor laatste
```

**Na elke feature:**
```bash
npx tsc --noEmit --skipLibCheck
npm run build
# Test op 375px (mobiel) + 1280px (desktop)
```

---

## DATABASE MIGRATIES OVERZICHT

Alle nieuwe tabellen die aangemaakt moeten worden:

```sql
-- 1. Favoriete medewerkers
CREATE TABLE klant_favoriete_medewerkers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID REFERENCES klanten(id) ON DELETE CASCADE,
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE CASCADE,
  notitie TEXT,
  UNIQUE(klant_id, medewerker_id)
);

-- 2. Rooster aanvragen (diensten tabel uitbreiden of aparte tabel)
-- Controleer of 'diensten' tabel al een 'status' kolom heeft,
-- zo niet: voeg toe: status TEXT DEFAULT 'aangevraagd'

-- 3. Verificatie token op medewerkers
ALTER TABLE medewerkers
ADD COLUMN IF NOT EXISTS verificatie_token TEXT UNIQUE
  DEFAULT encode(gen_random_bytes(32), 'hex');

-- 4. Verificatie scan logs
CREATE TABLE verificatie_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gescand_op TIMESTAMPTZ DEFAULT NOW(),
  medewerker_id UUID REFERENCES medewerkers(id),
  gescand_door_klant_id UUID REFERENCES klanten(id),
  ip_adres TEXT
);

-- 5. Berichten
CREATE TABLE klant_berichten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  klant_id UUID REFERENCES klanten(id) ON DELETE CASCADE,
  afzender TEXT NOT NULL CHECK (afzender IN ('klant', 'toptalent')),
  bericht TEXT NOT NULL,
  bijlage_url TEXT,
  gelezen BOOLEAN DEFAULT FALSE,
  gelezen_op TIMESTAMPTZ
);

ALTER PUBLICATION supabase_realtime ADD TABLE klant_berichten;
```

---

## NIEUWE API ROUTES OVERZICHT

```
/api/klant/favorieten         GET, POST, DELETE
/api/klant/rooster            GET (met ?start=&end= query params)
/api/klant/aanvraag           POST
/api/klant/berichten          GET, POST
/api/klant/kosten             GET (met ?jaar= query param)
/api/verify/[token]           GET (publiek, geen auth)
```

Alle klant-routes: verifieer sessie via `klant_session` cookie (gebruik bestaand `verifyKlantSession` patroon).

---

## TECH STACK DETAILS

### Supabase Realtime (voor berichten)
```typescript
// Client-side subscription — patroon van TodoONada/nextjs-supabase-auth-and-realtime-chat:
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
const channel = supabase
  .channel('room-1')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'klant_berichten' }, handler)
  .subscribe()
```

### Recharts (voor kosten dashboard — al in stack)
```typescript
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
// Oranje primaire kleur: #F27501
// Grid: stroke="#f0f0f0", strokeDasharray="3 3"
```

### QR Verificatie (patronen van HariKrishna-9885699666/qr-code-generator-react-supabase)
```typescript
// Server-side: lookup token in medewerkers tabel
// Check of medewerker dienst heeft vandaag bij dit bedrijf
// Geen client-side rendering nodig — puur server component
```

---

## DEFINITION OF DONE

✅ Favorieten tab: klant kan medewerkers als favoriet markeren/verwijderen + notitie toevoegen
✅ Rooster: week + maand weergave met kleurcodering per status
✅ Aanvraagformulier: 4-stappen wizard, bevestiging zichtbaar in rooster
✅ QR verificatie: `/verify/[token]` werkt zonder login, toont medewerker info + dienst vandaag
✅ Berichten: realtime chat werkt, badge bij ongelezen berichten, Telegram alert voor team
✅ Kosten dashboard: bar chart per maand, taartdiagram per functie, top medewerkers lijst
✅ Alle bestaande functionaliteit werkt nog exact hetzelfde
✅ Nieuwe tabs zichtbaar in navigatie naast bestaande tabs
✅ RLS policies correct: klant ziet alleen eigen data
✅ 0 TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
✅ `npm run build` succesvol
✅ Getest op 375px (iPhone) + 768px (tablet) + 1280px (desktop)
