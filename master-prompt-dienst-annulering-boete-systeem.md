# Master Prompt — Dienst Annulering, Vervanging & Boete Systeem
## TopTalentJobs.nl | 48u Policy · Shift Swap · €50 Boete · Mollie Betaling

---

## ROL & CONTEXT

Je bent een senior fullstack engineer. Je bouwt een **dienst-annulering en vervangingssysteem** voor TopTalentJobs.nl — een horeca uitzendbureau. Medewerkers kunnen geaccepteerde diensten niet zomaar annuleren. Als een dienst binnen 48 uur begint, moeten ze zelf een vervanger regelen. Doen ze dat niet én werken ze de dienst niet, dan krijgen ze een boete van €50 en wordt hun account gepauzeerd.

**Stack:** Next.js 14 (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS, Mollie (betalingen).

**Referentie repos:**
- `hreinberger/mollie-next` — Mollie + Next.js demo met webhooks
- `vernondegoede/nextjs-mollie` — Mollie integratie patronen
- `mollie/mollie-api-typescript` — Officiële Mollie TypeScript SDK
- `mollie/mollie-api-node` — Officiële Mollie Node.js client

**Absolute regel:** Geen bestaande logica aanpassen. Alleen uitbreiden.

---

## FEATURE OVERZICHT

1. **Ratings zichtbaar** op medewerker profiel pagina
2. **48u annuleringsbeleid** — knop verdwijnt, "Zoek vervanging" verschijnt
3. **Vervangingsflow** — dienst komt weer online, originele medewerker keurt vervanger goed/af
4. **Geen-show boete** — €50 boete + account gepauzeerd
5. **Mollie betaling** — medewerker betaalt boete via iDEAL/creditcard, account vrijgegeven

---

## BESTAANDE DATA (gebruik dit)

De `beoordelingen` tabel bestaat al met kolommen:
- `score` (1-5 algemeen)
- `score_punctualiteit`
- `score_professionaliteit`
- `score_vaardigheden`
- `score_communicatie`

De `medewerkers` tabel heeft al:
- `gemiddelde_score` (wordt bijgewerkt na elke beoordeling)
- `aantal_beoordelingen`

De `diensten` tabel heeft al:
- `aanmelding_status` per medewerker

---

## STAP 1: RATINGS WEERGAVE OP PROFIEL

### Wat toevoegen

Bovenaan de profiel tab (na de digitale ID kaart), toon een **ratings sectie**:

```
JOUW BEOORDELINGEN

Algehele score     ★★★★☆  4.2  (38 beoordelingen)

Per categorie:
Punctualiteit      ████████░░  4.5 ★
Professionaliteit  ███████░░░  4.1 ★
Vaardigheden       ████████░░  4.3 ★
Communicatie       ██████░░░░  3.9 ★

Aanwezigheid       96%  (2 no-shows van 48 diensten)
```

### Nieuwe API route `/api/medewerker/ratings/route.ts`

```typescript
// GET — haalt ratings op voor ingelogde medewerker
// Berekent uit beoordelingen tabel:
// - gemiddelde per categorie
// - totaal aantal beoordelingen
// - aanwezigheidspercentage (diensten gewerkt / diensten geaccepteerd)
// - no-show count (diensten met status 'geen_show')

export async function GET(request: Request) {
  const medewerker = await verifyMedewerkerSession(request)
  if (!medewerker) return new Response('Unauthorized', { status: 401 })

  const { data: beoordelingen } = await supabaseAdmin
    .from('beoordelingen')
    .select('score, score_punctualiteit, score_professionaliteit, score_vaardigheden, score_communicatie')
    .eq('medewerker_id', medewerker.id)

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const scores = beoordelingen || []

  // Aanwezigheid berekenen
  const { count: totaalDiensten } = await supabaseAdmin
    .from('dienst_medewerkers')
    .select('*', { count: 'exact' })
    .eq('medewerker_id', medewerker.id)
    .eq('status', 'gewerkt')

  const { count: noShows } = await supabaseAdmin
    .from('dienst_medewerkers')
    .select('*', { count: 'exact' })
    .eq('medewerker_id', medewerker.id)
    .eq('status', 'geen_show')

  const totaal = (totaalDiensten || 0) + (noShows || 0)
  const aanwezigheid = totaal > 0 ? Math.round(((totaalDiensten || 0) / totaal) * 100) : 100

  return Response.json({
    algemeen: Math.round(avg(scores.map(s => s.score)) * 10) / 10,
    punctualiteit: Math.round(avg(scores.filter(s => s.score_punctualiteit).map(s => s.score_punctualiteit!)) * 10) / 10,
    professionaliteit: Math.round(avg(scores.filter(s => s.score_professionaliteit).map(s => s.score_professionaliteit!)) * 10) / 10,
    vaardigheden: Math.round(avg(scores.filter(s => s.score_vaardigheden).map(s => s.score_vaardigheden!)) * 10) / 10,
    communicatie: Math.round(avg(scores.filter(s => s.score_communicatie).map(s => s.score_communicatie!)) * 10) / 10,
    aanwezigheid,
    noShows: noShows || 0,
    aantalBeoordelingen: scores.length,
    totaalDiensten: totaal,
  })
}
```

### UI Component `/components/medewerker/RatingsCard.tsx`

```tsx
'use client'

// Toon sterrenscore met Framer Motion progress bars
// Kleurcodering:
// 4.5+ → groen
// 3.5-4.4 → oranje
// < 3.5 → rood

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className="w-4 h-4"
          fill={i <= Math.floor(score) ? '#F27501' : i - 0.5 <= score ? '#F27501' : 'none'}
          color="#F27501"
          opacity={i - 0.5 <= score ? 1 : 0.3}
        />
      ))}
    </div>
  )
}

function ScoreBalk({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--text-secondary)] w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 5) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full bg-[#F27501]"
        />
      </div>
      <span className="text-sm font-semibold text-[var(--text-primary)] w-8">{score}</span>
    </div>
  )
}
```

**Commit:** `feat: add ratings display to medewerker profile page`

---

## STAP 2: DATABASE UITBREIDINGEN

Voer deze SQL uit in Supabase SQL Editor:

```sql
-- Vervangingsverzoeken tabel
CREATE TABLE IF NOT EXISTS dienst_vervangingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dienst_id UUID REFERENCES diensten(id) ON DELETE CASCADE,
  originele_medewerker_id UUID REFERENCES medewerkers(id),
  vervanger_id UUID REFERENCES medewerkers(id),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'aangeboden', 'geaccepteerd', 'geweigerd', 'verlopen')),
  aangeboden_op TIMESTAMPTZ,
  beantwoord_op TIMESTAMPTZ,
  vervalt_op TIMESTAMPTZ,    -- 24u na aanbieding, daarna automatisch 'verlopen'
  notitie TEXT
);

-- Boetes tabel
CREATE TABLE IF NOT EXISTS medewerker_boetes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE CASCADE,
  dienst_id UUID REFERENCES diensten(id),
  bedrag DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  reden TEXT NOT NULL,       -- bijv. 'geen_show_dienst' | 'geen_vervanging_gevonden'
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'betaald', 'kwijtgescholden')),
  mollie_payment_id TEXT,    -- Mollie betaling ID voor tracking
  betaald_op TIMESTAMPTZ,
  mollie_checkout_url TEXT   -- iDEAL betaallink
);

-- Status kolommen uitbreiden op dienst_medewerkers (als nog niet aanwezig)
-- Controleer eerst of tabel bestaat:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'dienst_medewerkers';
ALTER TABLE dienst_medewerkers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aangemeld'
  CHECK (status IN ('aangemeld', 'bevestigd', 'gewerkt', 'geen_show', 'vervangen', 'geannuleerd'));

-- Account pauzeer kolom op medewerkers
ALTER TABLE medewerkers
ADD COLUMN IF NOT EXISTS account_gepauzeerd BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pauzeer_reden TEXT,
ADD COLUMN IF NOT EXISTS open_boete_id UUID REFERENCES medewerker_boetes(id);

-- RLS
ALTER TABLE dienst_vervangingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE medewerker_boetes ENABLE ROW LEVEL SECURITY;

-- Medewerker ziet eigen vervangingen en boetes
CREATE POLICY "medewerker_eigen_vervangingen" ON dienst_vervangingen
  USING (originele_medewerker_id = auth.uid() OR vervanger_id = auth.uid());

CREATE POLICY "medewerker_eigen_boetes" ON medewerker_boetes
  USING (medewerker_id = auth.uid());
```

---

## STAP 3: 48U ANNULERINGSBELEID IN DIENSTEN TAB

### Logica

```typescript
// Helper functie — gebruik in frontend én backend
export function kanAnnuleren(dienstDatum: string, dienstStarttijd: string): boolean {
  const dienstStart = new Date(`${dienstDatum}T${dienstStarttijd}`)
  const nuPlus48u = new Date(Date.now() + 48 * 60 * 60 * 1000)
  return dienstStart > nuPlus48u  // true = meer dan 48u weg, mag annuleren
}

export function urenTotDienst(dienstDatum: string, dienstStarttijd: string): number {
  const dienstStart = new Date(`${dienstDatum}T${dienstStarttijd}`)
  return (dienstStart.getTime() - Date.now()) / (1000 * 60 * 60)
}
```

### UI aanpassing in diensten tab

Op elke geaccepteerde dienst kaart:

```tsx
const uren = urenTotDienst(dienst.datum, dienst.start_tijd)
const magAnnuleren = uren > 48

{magAnnuleren ? (
  // Normaal annuleren (ruim voor 48u)
  <button
    onClick={() => handleAnnuleer(dienst.id)}
    className="text-sm text-red-500 underline"
  >
    Annuleren
  </button>
) : uren > 0 ? (
  // Binnen 48u — zoek vervanging knop
  <button
    onClick={() => handleZoekVervanging(dienst.id)}
    className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
  >
    <RefreshCw className="w-4 h-4" />
    Zoek vervanging
  </button>
) : null}

// Countdown timer als dienst < 48u weg is:
{!magAnnuleren && uren > 0 && (
  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
    ⚠️ Annuleren niet mogelijk — dienst begint over {Math.floor(uren)}u
  </p>
)}
```

**Commit:** `feat: add 48h cancellation policy UI to shifts tab`

---

## STAP 4: VERVANGINGSFLOW

### Stap 4a: Medewerker klikt "Zoek vervanging"

```tsx
// Toon confirmatie bottom sheet (react-modal-sheet):
<Sheet isOpen={vervangingModal} onClose={() => setVervangingModal(false)}>
  <Sheet.Container>
    <Sheet.Header />
    <Sheet.Content className="px-5 pb-8">
      <h2 className="text-title3 font-bold mt-4">Vervanging zoeken</h2>

      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mt-4">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Let op — jij blijft verantwoordelijk
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          De dienst komt online voor andere medewerkers. Jij moet de vervanger
          goedkeuren. Vind je niemand? Dan moet jij de dienst zelf werken.
          Werk je niet? Dan volgt een boete van €50 en wordt je account gepauzeerd.
        </p>
      </div>

      <button
        onClick={handleBevestigZoekVervanging}
        className="w-full mt-6 py-3.5 rounded-2xl bg-[#F27501] text-white font-semibold"
      >
        Bevestig — zet dienst online voor vervanging
      </button>
      <button
        onClick={() => setVervangingModal(false)}
        className="w-full mt-3 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-[var(--text-secondary)] font-medium"
      >
        Toch zelf werken
      </button>
    </Sheet.Content>
  </Sheet.Container>
  <Sheet.Backdrop onTap={() => setVervangingModal(false)} />
</Sheet>
```

### Stap 4b: API — Dienst online zetten voor vervanging

**`/api/medewerker/vervanging/route.ts`:**

```typescript
// POST — initieer vervangingsverzoek
export async function POST(request: Request) {
  const medewerker = await verifyMedewerkerSession(request)
  const { dienst_id } = await request.json()

  // 1. Controleer of medewerker aangemeld is voor deze dienst
  // 2. Controleer of dienst binnen 48u is (server-side validatie!)
  // 3. Maak vervangingsverzoek aan in dienst_vervangingen
  // 4. Update dienst status naar 'zoekt_vervanging'
  // 5. Stuur notificatie naar alle beschikbare medewerkers (Telegram/email)
  // 6. Return bevestiging

  await supabaseAdmin.from('dienst_vervangingen').insert({
    dienst_id,
    originele_medewerker_id: medewerker.id,
    status: 'open',
    vervalt_op: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24u om vervanger te vinden
  })

  // Update aanmelding_status van originele medewerker
  await supabaseAdmin
    .from('dienst_medewerkers')
    .update({ status: 'zoekt_vervanging' })
    .eq('dienst_id', dienst_id)
    .eq('medewerker_id', medewerker.id)

  return Response.json({ success: true })
}

// PATCH — originele medewerker accepteert/weigert vervanger
export async function PATCH(request: Request) {
  const medewerker = await verifyMedewerkerSession(request)
  const { vervanging_id, actie } = await request.json()
  // actie: 'accepteer' | 'weiger'

  if (actie === 'accepteer') {
    // 1. Update dienst_vervangingen status naar 'geaccepteerd'
    // 2. Verwijder originele medewerker uit dienst_medewerkers
    // 3. Voeg vervanger toe als bevestigde medewerker
    // 4. Stuur bevestiging naar vervanger + admin
  } else {
    // 1. Update status naar 'geweigerd'
    // 2. Dienst blijft online voor nieuwe vervanger
    // 3. Notificeer originele medewerker: "Vervanger geweigerd, dienst blijft online"
  }
}
```

### Stap 4c: Andere medewerkers zien de dienst + melden zich aan

```tsx
// In de diensten tab, apart sectie "Vervanging nodig":
// Toont diensten van andere medewerkers die vervanging zoeken
// Aanmelden werkt hetzelfde als normale dienst
// Maar: bij aanmelding → notificatie naar ORIGINELE medewerker
//   "Mohammed wil jou vervangen voor zondag. Accepteer?"

// Notificatie in-app (bell icon) + Telegram naar originele medewerker
```

### Stap 4d: Cron job — verlopen vervangingen afhandelen

```typescript
// /api/cron/check-vervangingen/route.ts
// Draait elk uur (Vercel Cron of Supabase Edge Function)

// Voor elke vervangen dienst die over 2u begint en nog 'open' staat:
//   → Stuur urgente notificatie naar originele medewerker
//   → "⚠️ Nog geen vervanger! Jij moet nu gaan werken."

// Na afloop van dienst (dienst.eind_tijd + 2u):
//   → Check dienst_medewerkers status
//   → Als originele medewerker status = 'geen_show' EN geen vervanger:
//      → Maak boete aan van €50
//      → Pauzeer account
//      → Stuur Mollie betaallink via email + in-app notificatie
```

**Commit:** `feat: implement shift replacement flow with 48h policy`

---

## STAP 5: BOETE & ACCOUNT PAUZERING

### Account geblokkeerd scherm

Als een medewerker inlogt met gepauzeerd account, toon een blokkeer overlay:

```tsx
// In MedewerkerDashboard, bovenaan checken:
{medewerker.account_gepauzeerd && (
  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6">
    <div className="bg-[var(--bg-card)] rounded-3xl p-6 max-w-sm w-full text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-title3 font-bold text-[var(--text-primary)]">Account gepauzeerd</h2>
      <p className="text-[var(--text-secondary)] text-sm mt-2">
        Je account is gepauzeerd vanwege een openstaande boete van €50.
        Betaal de boete om je account te heractiveren.
      </p>
      <p className="text-[var(--text-tertiary)] text-xs mt-2 mb-6">
        Reden: {medewerker.pauzeer_reden}
      </p>
      <button
        onClick={handleBetaalBoete}
        className="w-full py-3.5 rounded-2xl bg-[#F27501] text-white font-semibold shadow-lg"
      >
        Betaal €50 boete via iDEAL
      </button>
      <p className="text-xs text-[var(--text-tertiary)] mt-3">
        Vragen? Bel 020-123 4567
      </p>
    </div>
  </div>
)}
```

**Commit:** `feat: add account suspension screen with fine payment CTA`

---

## STAP 6: MOLLIE BETALING INTEGREREN

### Moet je Mollie integreren?

**Ja, als je €50 automatisch wil innen.** Alternatief: je stuurt een factuur of houdt het in op het salaris (simpeler, geen techstack nodig). Maar Mollie is professioneler en volledig automatisch.

**Mollie is de beste keuze voor Nederland** — iDEAL, creditcard, geen maandkosten, alleen transactiekosten (±2-4%).

### Setup

```bash
npm install @mollie/api-client
```

```env
# .env.local
MOLLIE_API_KEY=live_xxxxx          # of test_xxxxx voor development
MOLLIE_WEBHOOK_BASE_URL=https://jouwsite.nl
```

### Mollie betaling aanmaken `/api/medewerker/betaal-boete/route.ts`

```typescript
// Patroon van hreinberger/mollie-next en mollie/mollie-api-typescript

import { createMollieClient } from '@mollie/api-client'

const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! })

export async function POST(request: Request) {
  const medewerker = await verifyMedewerkerSession(request)
  if (!medewerker) return new Response('Unauthorized', { status: 401 })

  // Haal open boete op
  const { data: boete } = await supabaseAdmin
    .from('medewerker_boetes')
    .select('*')
    .eq('medewerker_id', medewerker.id)
    .eq('status', 'open')
    .single()

  if (!boete) return Response.json({ error: 'Geen open boete gevonden' }, { status: 404 })

  // Maak Mollie betaling aan
  const payment = await mollie.payments.create({
    amount: { currency: 'EUR', value: '50.00' },
    description: `TopTalentJobs — Boete medewerker #${medewerker.id.slice(0,8)}`,
    redirectUrl: `${process.env.MOLLIE_WEBHOOK_BASE_URL}/medewerker/dashboard?betaling=succes`,
    webhookUrl: `${process.env.MOLLIE_WEBHOOK_BASE_URL}/api/webhooks/mollie`,
    metadata: {
      boete_id: boete.id,
      medewerker_id: medewerker.id,
    },
  })

  // Sla Mollie payment ID op
  await supabaseAdmin
    .from('medewerker_boetes')
    .update({
      mollie_payment_id: payment.id,
      mollie_checkout_url: payment.getCheckoutUrl(),
    })
    .eq('id', boete.id)

  // Stuur medewerker naar Mollie checkout
  return Response.json({ checkoutUrl: payment.getCheckoutUrl() })
}
```

### Mollie webhook `/api/webhooks/mollie/route.ts`

```typescript
// Mollie roept deze URL aan na betaling (succes of mislukking)
// KRITIEK: Mollie stuurt ALLEEN een payment ID — jij moet de status ophalen!

export async function POST(request: Request) {
  const body = await request.formData()
  const paymentId = body.get('id') as string

  // Haal actuele status op bij Mollie
  const payment = await mollie.payments.get(paymentId)

  if (payment.status === 'paid') {
    // 1. Update boete status naar 'betaald'
    await supabaseAdmin
      .from('medewerker_boetes')
      .update({ status: 'betaald', betaald_op: new Date().toISOString() })
      .eq('mollie_payment_id', paymentId)

    // 2. Haal medewerker ID op uit metadata
    const medewerker_id = payment.metadata?.medewerker_id

    // 3. Heractiveer account
    await supabaseAdmin
      .from('medewerkers')
      .update({
        account_gepauzeerd: false,
        pauzeer_reden: null,
        open_boete_id: null,
      })
      .eq('id', medewerker_id)

    // 4. Stuur bevestigingsmail naar medewerker
    // 5. Notificeer admin via Telegram
  }

  return new Response('OK', { status: 200 })
}
```

### In de blokkeer overlay — betaal knop handler

```typescript
const handleBetaalBoete = async () => {
  const res = await fetch('/api/medewerker/betaal-boete', { method: 'POST' })
  const { checkoutUrl } = await res.json()
  window.location.href = checkoutUrl  // redirect naar Mollie iDEAL pagina
}
```

**Commit:** `feat: integrate Mollie payments for employee fine collection`

---

## STAP 7: ADMIN DASHBOARD UITBREIDINGEN

Voeg toe aan het admin dashboard (bestaande AdminDashboard.tsx):

```tsx
// Nieuwe sectie in medewerkers tab of apart tabblad "Boetes & Pauzes":

// Overzicht open boetes:
// Medewerker | Dienst | Datum | Status | Mollie link | Acties (kwijtschelden)

// Mogelijkheid voor admin:
// "Kwijtschelden" knop → boete.status = 'kwijtgescholden', account direct heractiveren
// Handig als er omstandigheden zijn die het niet-werken rechtvaardigen

// Vervanging monitor:
// Live overzicht van diensten die vervanging zoeken
// Met countdown: "Dienst begint over 6u — nog geen vervanger!"
```

**Commit:** `feat: add fines and replacement monitor to admin dashboard`

---

## IMPLEMENTATIE VOLGORDE

```
1. Database migraties uitvoeren (stap 2)
2. Ratings weergave op profiel (stap 1) — makkelijkste, hoge waarde
3. 48u beleid UI aanpassing (stap 3) — knoppen aanpassen
4. Vervangingsflow backend (stap 4b)
5. Vervangingsflow UI (stap 4a + 4c)
6. Cron job no-show afhandeling (stap 4d)
7. Boete + account pauzering scherm (stap 5)
8. Mollie integratie (stap 6)
9. Admin dashboard uitbreidingen (stap 7)
```

---

## MOLLIE: DEVELOPMENT VS PRODUCTIE

```env
# Testen (geen echte betalingen):
MOLLIE_API_KEY=test_xxxxxx

# Live (echte iDEAL betalingen):
MOLLIE_API_KEY=live_xxxxxx
```

In test modus kun je betalen met testnummers van Mollie dashboard. Wissel naar `live_` als je in productie gaat. Mollie account aanmaken op mollie.com — gratis, alleen transactiekosten.

**Webhook testen lokaal:** Gebruik `ngrok` om localhost bereikbaar te maken voor Mollie webhooks:
```bash
npx ngrok http 3000
# Kopieer de https URL naar MOLLIE_WEBHOOK_BASE_URL in .env.local
```

---

## JURIDISCHE NOOT

De €50 boete moet opgenomen zijn in de **arbeidsvoorwaarden / inschrijfcontract** van de medewerker. Zorg dat medewerkers bij inschrijving expliciet akkoord gaan met dit beleid. Voeg dit toe aan:
- `/src/app/voorwaarden/page.tsx` (je hebt al een voorwaardenpage)
- Inschrijfformulier: extra checkbox "Ik ga akkoord met het annuleringsbeleid (48u + €50 boete)"

---

## DEFINITION OF DONE

✅ Ratings sectie zichtbaar op profiel: algemeen + 4 subcategorieën + aanwezigheid %
✅ Diensten < 48u: annuleer knop verdwenen, "Zoek vervanging" knop zichtbaar
✅ Vervangingsflow: dienst komt online, originele medewerker keurt vervanger goed/af
✅ No-show: boete aangemaakt, account gepauzeerd
✅ Blokkeer overlay getoond bij gepauzeerd account met betaal knop
✅ Mollie: iDEAL betaallink werkt, webhook heractiveer account na betaling
✅ Admin: boetes overzicht + kwijtschelding + vervangings-monitor
✅ Cron job checkt verlopen vervangingen en no-shows
✅ 0 TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
✅ `npm run build` succesvol
✅ Getest in Mollie test modus met test betaling
