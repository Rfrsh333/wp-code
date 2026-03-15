# Master Prompt — Security Fix: Bookmarklet Token & Auth
## TopTalentJobs.nl | Kritieke Issues Oplossen

---

## ROL & CONTEXT

Je bent een senior security engineer. Je werkt aan **TopTalentJobs.nl** (Next.js 14, TypeScript, Supabase). Er zijn **2 kritieke security issues** gevonden in het Social Lead Capture systeem die direct opgelost moeten worden. Niets anders mag worden gewijzigd.

---

## DE 2 KRITIEKE ISSUES

### Issue 1 🔴 — Token staat in plain text in `public/bookmarklet-built.json`

**Wat er nu is:**
```json
{
  "href": "javascript:...TOKEN=ac347b95ae35d7dc8b122c999f5323de690b7beb6346aaba22eabb5434bcb0d2...",
  "size": 8.1,
  "builtAt": "2026-03-14T22:11:19.484Z"
}
```

**Het probleem:** `public/bookmarklet-built.json` is publiek toegankelijk op `toptalentjobs.nl/bookmarklet-built.json`. Iedereen kan dit bestand openen en het token stelen. Met het token kunnen nep-leads worden aangemaakt.

**Fix:** Verplaats het token naar een server-side API endpoint. De bookmarklet page haalt het token op via een authenticatied API call.

---

### Issue 2 🔴 — Token doorgegeven als URL parameter

**Wat er nu is:**
```javascript
// In bookmarklet-built.json (de gebouwde bookmarklet code):
window.open(BASE + "/admin/leads/add?" + params.join("&"))
// Dit resulteert in URL zoals:
// /admin/leads/add?naam=Rachid&platform=linkedin&token=ac347b95...
```

**Het probleem:** Het token staat in de URL, wat betekent:
1. Het staat in server access logs (Vercel logs)
2. Het staat in browser history
3. Het kan lekken via Referer header

**Fix:** Sla het token op in `sessionStorage` via de bookmarklet page, zodat de `/admin/leads/add` pagina het token ophaalt uit sessionStorage — niet uit de URL.

---

## DE FIX — STAP VOOR STAP

### Stap 1: Beveilig `public/bookmarklet-built.json`

**Verwijder het token uit het JSON bestand.** Sla alleen niet-sensitieve metadata op:

```json
{
  "href": "javascript:...(zonder token, met placeholder)...",
  "size": 8.1,
  "builtAt": "2026-03-14T22:11:19.484Z"
}
```

De bookmarklet code krijgt het token niet meer hardcoded. In plaats daarvan opent de bookmarklet altijd `/admin/leads/add` met de lead data (maar **zonder token**), en de add-pagina haalt het token op via een authenticatied API call.

### Stap 2: Nieuwe API route voor token ophalen

Maak `/app/api/leads/bookmarklet-token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // Alleen ingelogde admins mogen het token ophalen
  const { isAdmin } = await verifyAdmin(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Retourneer het token — alleen server-side leesbaar
  const token = process.env.BOOKMARKLET_SECRET_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token not configured' }, { status: 500 })
  }

  return NextResponse.json({ token })
}
```

### Stap 3: Pas de bookmarklet source aan

In het bookmarklet source bestand (`/lib/bookmarklet/bookmarklet-source.js` of hoe het heet):

**Verwijder:** `TOKEN = "hardcoded_token_here"`

**Vervang door:** De bookmarklet stuurt de lead data naar `/admin/leads/add` via URL params — maar **zonder token**. De token wordt later opgehaald door de add-pagina.

Het enige dat de bookmarklet doet: data van de pagina scrapen + nieuw tabblad openen met die data als URL params.

```javascript
// Bookmarklet opent alleen een nieuw tabblad met lead data
// GEEN TOKEN in de URL
var params = []
params.push("naam=" + encodeURIComponent(naam))
params.push("platform=" + encodeURIComponent(platform))
params.push("bron_url=" + encodeURIComponent(window.location.href))
// ... rest van de velden
// GEEN token param meer

window.open(BASE + "/admin/leads/add?" + params.join("&"), "_blank")
```

### Stap 4: Pas `/admin/leads/add/page.tsx` aan

De add-pagina moet nu:
1. **Eerst** de admin sessie controleren of het token ophalen
2. Pas dan de lead opslaan

```typescript
// In AddLeadForm component:

const handleSave = useCallback(async () => {
  if (!form.naam.trim()) return
  setStatus('saving')

  try {
    const { data: { session } } = await supabase.auth.getSession()

    let authHeader: Record<string, string>

    if (session?.access_token) {
      // Ingelogde admin: gebruik Supabase session
      authHeader = { Authorization: `Bearer ${session.access_token}` }
    } else {
      // Niet ingelogd: probeer bookmarklet token via API op te halen
      // Dit werkt ALLEEN als de admin is ingelogd in een ander tabblad
      // (want de API check gebruikt cookies)
      const tokenRes = await fetch('/api/leads/bookmarklet-token')
      if (!tokenRes.ok) {
        throw new Error('Niet ingelogd. Log eerst in op /admin om leads toe te voegen.')
      }
      const { token } = await tokenRes.json()
      authHeader = {} // token wordt apart meegegeven

      // Gebruik bookmarklet token
      const payload = { ...form, bookmarklet_token: token }
      // Verwijder lege velden
      Object.keys(payload).forEach(k => { if (!payload[k as keyof typeof payload]) delete payload[k as keyof typeof payload] })

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Opslaan mislukt')
      }
      setStatus('success')
      return
    }

    // Ingelogde admin flow
    const payload: Record<string, string> = { ...form }
    Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k] })

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Opslaan mislukt')
    }

    setStatus('success')
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : 'Onbekende fout')
    setStatus('error')
  }
}, [form])
```

**Voeg ook toe:** Als de gebruiker niet is ingelogd, toon een duidelijke melding:

```tsx
// Boven het formulier, als er geen sessie is:
{!hasSession && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800">
    ⚠️ Je bent niet ingelogd als admin.
    <a href="/admin/login" target="_blank" className="underline font-medium ml-1">
      Log in om leads op te slaan →
    </a>
  </div>
)}
```

### Stap 5: Voeg middleware bescherming toe voor admin/leads routes

Check in `/middleware.ts` (of maak een matcher toe) of de volgende routes beschermd zijn:
- `/admin/leads/bookmarklet` — moet admin-only zijn
- `/admin/leads/add` — mag publiek zijn (bookmarklet opent dit), maar toont een warning als niet ingelogd

Controleer of `/admin/leads` al in de bestaande admin middleware bescherming zit. Als niet, voeg toe:

```typescript
// In middleware.ts, in de matcher of de auth check:
// Zorg dat /admin/leads/* (behalve /admin/leads/add) admin auth vereist
```

### Stap 6: Rebuild de bookmarklet

Na de bovenstaande wijzigingen:

```bash
# Rebuild de bookmarklet zonder token
npm run build:bookmarklet
# of het script dat bookmarklet-built.json genereert
```

Verifieer dat `public/bookmarklet-built.json`:
- Geen token bevat
- Geen gevoelige data bevat
- De `href` geen `token=` parameter bevat

### Stap 7: Regenereer het token

Aangezien het oude token mogelijk al gelekt is:

```bash
# Genereer een nieuw token
openssl rand -hex 32
```

Update `.env.local` en Vercel environment variables met het nieuwe token.

---

## VERIFICATIE CHECKLIST

Na de implementatie, verifieer handmatig:

- [ ] Open `https://toptalentjobs.nl/bookmarklet-built.json` — staat er geen token in?
- [ ] Open de bookmarklet op LinkedIn — werkt het formulier?
- [ ] Sla een test-lead op terwijl je ingelogd bent als admin — werkt het?
- [ ] Sla een test-lead op terwijl je NIET ingelogd bent — krijg je een duidelijke foutmelding?
- [ ] Controleer Vercel logs — staat er geen token in de access logs?
- [ ] Open `/admin/leads/bookmarklet` zonder in te loggen — word je doorgestuurd?

---

## EXTRA: Rate Limiting Verbetering

De bestaande rate limiter gebruikt IP-based limiting. Dit is goed, maar voeg ook toe:

```typescript
// In /app/api/leads/route.ts, POST handler:
// Naast IP-based limiting, ook token-based limiting
const tokenRateLimit = await checkRedisRateLimit(
  `leads:token:${data.bookmarklet_token?.slice(0, 8)}`,
  { requests: 50, window: 3600 } // max 50 leads per uur per token
)
if (!tokenRateLimit.success) {
  return NextResponse.json(
    { error: 'Daglimiet bereikt. Probeer morgen opnieuw.' },
    { status: 429, headers: corsHeaders() }
  )
}
```

---

## COMMITS

```
git: "security: remove hardcoded bookmarklet token from public JSON"
git: "security: add authenticated API endpoint for bookmarklet token retrieval"
git: "security: remove token from URL params in add-lead flow"
git: "security: add auth warning on /admin/leads/add when not logged in"
git: "security: regenerate bookmarklet token"
```

---

## DEFINITION OF DONE

✅ `public/bookmarklet-built.json` bevat geen token
✅ Token wordt niet doorgegeven als URL parameter
✅ Token ophalen vereist ingelogde admin sessie
✅ Niet-ingelogde gebruiker ziet duidelijke melding op `/admin/leads/add`
✅ Bookmarklet werkt nog correct voor ingelogde admins
✅ Nieuw token aangemaakt en geconfigureerd in Vercel
✅ 0 TypeScript errors
✅ npm run build succesvol
