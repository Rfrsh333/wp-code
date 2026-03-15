# Master Prompt — AI Offerte Automaat
## TopTalentJobs.nl | Aanvraag → AI Offerte → Email binnen 5 minuten

---

## ROL & CONTEXT

Je bent een senior Next.js engineer. Je werkt aan **TopTalentJobs.nl** — een horeca uitzendbureau. Stack: Next.js 14, TypeScript, Supabase, shadcn/ui, Resend (email), OpenAI API, `@react-pdf/renderer`.

**Het goede nieuws: de infrastructuur bestaat al.**
- `/api/offerte/route.ts` — genereert PDF offerte
- `/api/offerte/send/route.ts` — verstuurt PDF via Resend email
- `/api/personeel-aanvragen/route.ts` — ontvangt nieuwe aanvragen

**Wat er ontbreekt:**
1. Automatische trigger: nieuwe aanvraag → offerte verzenden (zonder handmatige actie)
2. OpenAI personalisatie: een menselijk voelende intro per aanvraag
3. Training mode: eerste periode offertes als concept opslaan zodat de eigenaar kan vergelijken

**Niets mag breken.** De bestaande booking-email flow (klant plant een Google meeting) blijft volledig intact. De offerte is een extra email die tegelijk of vlak daarna verstuurd wordt.

---

## HUIDIGE FLOW (behoud dit)

```
Aanvraag formulier → POST /api/personeel-aanvragen
  → Opslaan in database
  → Resend: auto-reply email naar klant (bevestiging + booking link)
  → Telegram: alert naar admin
```

## NIEUWE FLOW (voeg dit toe)

```
Aanvraag formulier → POST /api/personeel-aanvragen
  → Opslaan in database
  → Resend: auto-reply email (ongewijzigd)          ← BEHOUDEN
  → Telegram: alert naar admin (ongewijzigd)         ← BEHOUDEN
  → [NIEUW] Background: genereer AI offerte
      → OpenAI: schrijf persoonlijke intro (3 zinnen)
      → Sla offerte op in database (status: concept/verzonden)
      → Genereer PDF
      → Resend: stuur offerte email met PDF bijlage
      → WhatsApp: kort berichtje "offerte is verstuurd"
```

---

## IMPLEMENTATIE

### Stap 1: Training Mode Toggle

Voeg toe aan de `.env.local` en Vercel:
```
OFFERTE_AUTO_SEND=false   # true = direct versturen, false = concept (training mode)
```

Als `OFFERTE_AUTO_SEND=false`: offerte wordt gegenereerd en opgeslagen als status `concept` maar NIET automatisch verstuurd. Admin ziet het in de offerte tab en kan handmatig goedkeuren.

Als `OFFERTE_AUTO_SEND=true`: offerte wordt direct verstuurd. Schakel dit in als je de AI voldoende hebt getraind.

---

### Stap 2: OpenAI Personalisatie

Maak `/lib/ai/offerte-intro.ts`:

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface AanvraagContext {
  bedrijfsnaam: string
  contactpersoon: string
  typePersoneel: string[]      // bijv. ["kok", "bediening"]
  aantalPersonen: string       // bijv. "2-3"
  locatie: string              // bijv. "Amsterdam"
  startDatum: string
  werkdagen: string[]          // bijv. ["maandag", "dinsdag", "vrijdag"]
  werktijden: string           // bijv. "17:00 - 23:00"
  contractType: string[]       // bijv. ["uitzendkracht"]
  opmerkingen?: string
}

export async function generateOfferteIntro(aanvraag: AanvraagContext): Promise<string> {
  const functiesNL = aanvraag.typePersoneel.join(' en ')
  const dagenNL = aanvraag.werkdagen.join(', ')

  const prompt = `
Je bent een accountmanager bij TopTalentJobs — een professioneel horeca uitzendbureau in Nederland.

Schrijf een korte, persoonlijke en warme openingsparagraaf (maximaal 4 zinnen) voor een offerte aan:
- Bedrijf: ${aanvraag.bedrijfsnaam}
- Contactpersoon: ${aanvraag.contactpersoon}
- Gezochte functies: ${functiesNL}
- Aantal: ${aanvraag.aantalPersonen} persoon/personen
- Locatie: ${aanvraag.locatie}
- Start: ${aanvraag.startDatum}
- Werkdagen: ${dagenNL}
- Tijden: ${aanvraag.werktijden}
${aanvraag.opmerkingen ? `- Extra info van klant: ${aanvraag.opmerkingen}` : ''}

Regels:
- Schrijf in het Nederlands, professioneel maar niet formeel
- Noem de specifieke functie(s) die ze zoeken
- Spreek de contactpersoon aan met voornaam
- Verwijs naar de locatie (stad)
- Toon dat je hun aanvraag serieus neemt
- GEEN bullet points, GEEN headers — gewoon vloeiende tekst
- Begin met "Beste [voornaam],"
- Eindig NIET met een afsluiting of handtekening — dat komt later in de PDF

Voorbeeld toon: warm, professioneel, direct. Niet overdreven formeel, niet te casual.
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',    // snel en goedkoop voor dit gebruik
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}
```

---

### Stap 3: Pas de personeel-aanvragen route aan

In `/api/personeel-aanvragen/route.ts`, na het opslaan in de database en het versturen van de bestaande emails, voeg toe:

```typescript
// Na de bestaande Resend + Telegram code:

// ============================================================
// NIEUW: Automatische offerte generatie (non-blocking)
// ============================================================
if (insertedId) {
  // Fire and forget — blokkeer de form response niet
  generateAndSendOfferte(insertedId, data).catch((err) => {
    console.error('[OFFERTE] Automatische generatie mislukt:', err)
    // Stille fout — de aanvraag is al succesvol opgeslagen
  })
}
```

Maak de helper functie in hetzelfde bestand (of als aparte lib):

```typescript
async function generateAndSendOfferte(aanvraagId: string, formData: FormData) {
  const autoSend = process.env.OFFERTE_AUTO_SEND === 'true'

  try {
    // 1. Genereer AI intro (optioneel — als OpenAI niet beschikbaar: gewoon doorgaan)
    let aiIntro = ''
    try {
      const { generateOfferteIntro } = await import('@/lib/ai/offerte-intro')
      aiIntro = await generateOfferteIntro({
        bedrijfsnaam: formData.bedrijfsnaam,
        contactpersoon: formData.contactpersoon,
        typePersoneel: formData.typePersoneel,
        aantalPersonen: formData.aantalPersonen,
        locatie: formData.locatie,
        startDatum: formData.startDatum,
        werkdagen: formData.werkdagen,
        werktijden: formData.werktijden,
        contractType: formData.contractType,
        opmerkingen: formData.opmerkingen,
      })
    } catch (aiErr) {
      console.warn('[OFFERTE] AI intro generatie overgeslagen:', aiErr)
      // Geen AI beschikbaar? Ga door met standaard offerte
    }

    // 2. Sla offerte op als concept (met ai_intro veld)
    const offerteNummer = `OFF-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const geldigTot = new Date()
    geldigTot.setDate(geldigTot.getDate() + 14)

    const { data: offerte } = await supabase.from('offertes').insert({
      offerte_nummer: offerteNummer,
      aanvraag_id: aanvraagId,
      bedrijfsnaam: formData.bedrijfsnaam,
      contactpersoon: formData.contactpersoon,
      email: formData.email,
      locatie: formData.locatie,
      geldig_tot: geldigTot.toISOString(),
      status: autoSend ? 'verzonden' : 'concept',
      ai_generated: true,
      ai_intro: aiIntro,  // sla de AI intro op voor review
      type_personeel: formData.typePersoneel,
      aantal_personen: formData.aantalPersonen,
    }).select('id').single()

    console.log(`[OFFERTE] Concept aangemaakt: ${offerteNummer} (auto_send: ${autoSend})`)

    // 3. Als training mode: stop hier. Admin kan concept bekijken in dashboard.
    if (!autoSend) {
      // Stuur een Telegram/WhatsApp notificatie aan admin:
      await sendTelegramAlert(
        `📄 Nieuwe offerte concept klaar:\n` +
        `Bedrijf: ${formData.bedrijfsnaam}\n` +
        `Functie(s): ${formData.typePersoneel.join(', ')}\n` +
        `Bekijk in admin → Offertes`
      )
      return
    }

    // 4. Als auto-send aan: stuur de offerte email
    const sendRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/offerte/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ aanvraagId }),
    })

    if (!sendRes.ok) {
      console.error('[OFFERTE] Send mislukt:', await sendRes.text())
    } else {
      console.log(`[OFFERTE] Verstuurd naar ${formData.email}`)
    }

  } catch (err) {
    console.error('[OFFERTE] Fout in generateAndSendOfferte:', err)
    throw err
  }
}
```

---

### Stap 4: Pas de PDF aan om de AI intro te tonen

In `/lib/pdf/offerte-pdf.tsx`, voeg een `aiIntro` prop toe aan het PDF component:

```typescript
interface OffertePDFProps {
  data: {
    // bestaande velden...
    aiIntro?: string   // nieuw: persoonlijke opening van AI
  }
}
```

Voeg de intro toe als eerste sectie in de PDF, boven de tarieven tabel:

```tsx
{data.aiIntro && (
  <View style={styles.introSection}>
    <Text style={styles.introText}>{data.aiIntro}</Text>
  </View>
)}
```

---

### Stap 5: Verbeter de offerte email template

In `/api/offerte/send/route.ts`, maak de email body persoonlijker. De subject line en body moeten de specifieke functie noemen:

```typescript
// Subject:
const subject = `Uw offerte voor ${typePersoneelNL} — TopTalentJobs`
// bijv: "Uw offerte voor een kok en bediening — TopTalentJobs"

// Email body (HTML):
const emailHtml = `
<p>Beste ${contactpersoon.split(' ')[0]},</p>

<p>Bedankt voor uw aanvraag! Zoals beloofd stuur ik u hierbij een persoonlijk voorstel
voor ${typePersoneelNL} in ${locatie}.</p>

<p>In de bijlage vindt u de offerte (geldig tot ${geldigTotFormatted}).
Heeft u vragen of wilt u dit persoonlijk bespreken?
Plan dan direct een gratis kennismakingsgesprek in:</p>

<p><a href="${process.env.NEXT_PUBLIC_BOOKING_URL}"
   style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
   📅 Plan een kennismaking
</a></p>

<p>Met vriendelijke groet,<br>
<strong>TopTalentJobs</strong><br>
info@toptalentjobs.nl</p>
`
```

---

### Stap 6: Admin Review Interface (Training Mode)

In `OffertesTab.tsx`, voeg een "Concepten" sectie toe:

- Tab: "Concepten (3)" naast "Verzonden"
- Per concept: toon de AI intro + de gegenereerde offerte data
- Knop: **"✅ Goedkeuren & Versturen"** → roept `/api/offerte/send` aan
- Knop: **"✏️ Aanpassen"** → inline editbaar tekstveld voor de AI intro
- Knop: **"❌ Afwijzen"** → status → `afgewezen`

Voeg ook een **vergelijkingsweergave** toe: jouw handmatige offerte (die je zelf zou maken) naast de AI versie. Dit helpt bij training.

Voeg toe aan de offerte tab header:
```tsx
{process.env.NEXT_PUBLIC_OFFERTE_AUTO_SEND !== 'true' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 mb-4">
    🧠 Training mode actief — offertes worden als concept opgeslagen.
    Bekijk, vergelijk en keur goed. Zet OFFERTE_AUTO_SEND=true als je tevreden bent.
  </div>
)}
```

---

### Stap 7: Database migratie

Voeg kolommen toe aan de offertes tabel:

```sql
ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS ai_intro TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS type_personeel TEXT[],
  ADD COLUMN IF NOT EXISTS aantal_personen TEXT,
  ADD COLUMN IF NOT EXISTS auto_send_attempted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_send_at TIMESTAMPTZ;

-- Index voor snel ophalen van concepten
CREATE INDEX IF NOT EXISTS offertes_status_idx ON offertes(status);
CREATE INDEX IF NOT EXISTS offertes_aanvraag_id_idx ON offertes(aanvraag_id);
```

---

## ENVIRONMENT VARIABLES

Voeg toe aan `.env.local` en Vercel:

```
OFFERTE_AUTO_SEND=false              # start in training mode
NEXT_PUBLIC_OFFERTE_AUTO_SEND=false  # voor client-side training banner
NEXT_PUBLIC_BOOKING_URL=https://toptalentjobs.nl/kennismaking-plannen  # jouw booking pagina
```

---

## HOE JE TRAINT

**Week 1-2 (training mode aan):**
1. Aanvraag komt binnen
2. AI genereert concept offerte
3. Jij bekijkt het in admin dashboard
4. Je vergelijkt met wat jij zelf zou schrijven
5. Als de AI afwijkt: pas de system prompt aan in `/lib/ai/offerte-intro.ts`
6. Na elke aanpassing test je met de volgende aanvraag

**Aanpassingen die je zult maken in de system prompt:**
- Tone of voice (formeler/informeler)
- Specifieke USPs die je altijd wil noemen (bijv. "beschikbaar binnen 48 uur")
- Branche-specifieke termen die jij gebruikt
- Wat te zeggen bij specifieke functies (kok vs barman vs event staff)

**Week 3+:**
Als 8 van 10 concepten goed genoeg zijn zonder aanpassing:
```
OFFERTE_AUTO_SEND=true
```
Klaar. Volledig automatisch.

---

## IMPLEMENTATIE VOLGORDE

```
Stap 1: Database migratie uitvoeren
Stap 2: /lib/ai/offerte-intro.ts aanmaken
Stap 3: /api/personeel-aanvragen/route.ts uitbreiden
Stap 4: /lib/pdf/offerte-pdf.tsx: aiIntro prop toevoegen
Stap 5: /api/offerte/send/route.ts: betere email template
Stap 6: OffertesTab.tsx: concept review interface
Stap 7: .env variabelen toevoegen
```

Commit na elke stap:
```
git: "feat: add ai offerte intro generation with openai"
git: "feat: auto-trigger offerte after new aanvraag (training mode)"
git: "feat: add pdf ai intro section"
git: "feat: improve offerte email with personalized subject"
git: "feat: add concept review interface in offertes tab"
```

---

## DEFINITION OF DONE

✅ Nieuwe aanvraag → binnen 5 minuten offerte concept in admin dashboard
✅ AI intro is gepersonaliseerd (noemt functie, locatie, naam)
✅ Training mode banner zichtbaar in admin
✅ Admin kan concept bekijken, aanpassen, goedkeuren of afwijzen
✅ Bij goedkeuren: PDF verstuurd naar klant + booking link in email
✅ OFFERTE_AUTO_SEND=true schakelt training mode uit → volledig automatisch
✅ Bestaande booking email flow ongewijzigd
✅ 0 TypeScript errors
✅ npm run build succesvol
✅ Werkt ook als OpenAI down is (graceful fallback zonder AI intro)

---

## UITBREIDING A: Outreach & Verzend Tracking

### Wie is benaderd, wie niet, wat is verstuurd

Voeg een `outreach_log` tabel toe (of gebruik de bestaande `lead_outreach` tabel als die beschikbaar is):

```sql
CREATE TABLE IF NOT EXISTS aanvraag_outreach_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  aanvraag_id UUID REFERENCES personeel_aanvragen(id) ON DELETE CASCADE,
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,

  -- Wat is er gedaan
  actie TEXT NOT NULL CHECK (actie IN (
    'aanvraag_ontvangen',
    'auto_reply_verstuurd',
    'offerte_concept_aangemaakt',
    'offerte_verstuurd',
    'whatsapp_verstuurd',
    'meeting_geboekt',
    'handmatig_benaderd',
    'geen_reactie',
    'deal_gewonnen',
    'deal_verloren'
  )),

  -- Details
  kanaal TEXT CHECK (kanaal IN ('email', 'whatsapp', 'telefoon', 'handmatig')),
  notitie TEXT,
  uitgevoerd_door TEXT DEFAULT 'systeem',  -- 'systeem' of naam admin

  -- Status van de actie
  succes BOOLEAN DEFAULT TRUE,
  fout_melding TEXT  -- als succes=false
);

CREATE INDEX aanvraag_outreach_log_aanvraag_id_idx ON aanvraag_outreach_log(aanvraag_id);
CREATE INDEX aanvraag_outreach_log_actie_idx ON aanvraag_outreach_log(actie);
```

**Log elke stap in de automatische flow:**

In `/api/personeel-aanvragen/route.ts`, na elke actie:
```typescript
// Helper functie
async function logOutreach(aanvraagId: string, actie: string, details: {
  kanaal?: string, notitie?: string, succes?: boolean, foutMelding?: string, offerteId?: string
} = {}) {
  await supabase.from('aanvraag_outreach_log').insert({
    aanvraag_id: aanvraagId,
    actie,
    kanaal: details.kanaal,
    notitie: details.notitie,
    succes: details.succes ?? true,
    fout_melding: details.foutMelding,
    offerte_id: details.offerteId,
  })
}

// Gebruik:
await logOutreach(aanvraagId, 'aanvraag_ontvangen')
await logOutreach(aanvraagId, 'auto_reply_verstuurd', { kanaal: 'email' })
await logOutreach(aanvraagId, 'offerte_verstuurd', { kanaal: 'email', offerteId: offerte.id })
// Bij een fout:
await logOutreach(aanvraagId, 'offerte_verstuurd', { succes: false, foutMelding: err.message })
```

### Outreach Overzicht in Admin Dashboard

Voeg een nieuw tabblad "Outreach" toe in de aanvragen sectie van `AdminDashboard.tsx`:

**Per aanvraag toon:**
```
Bedrijfsnaam          Status              Benaderd    Offerte     Meeting
Restaurant De Hoek    🟢 Deal gewonnen    ✅ Email     ✅ PDF      ✅ Geboekt
Café Amsterdam        🟡 In behandeling   ✅ Email     ✅ PDF      ⏳ Wacht
Hotel Palace          🔴 Niet benaderd    ❌           ❌          ❌
Catering XL           🟡 In behandeling   ✅ Email     ❌ Mislukt  ❌
```

Klik op een rij → timeline popup met alle stappen:
```
14 mrt 10:23  📥 Aanvraag ontvangen
14 mrt 10:24  📧 Auto-reply verstuurd (email)
14 mrt 10:26  📄 Offerte concept aangemaakt
14 mrt 10:27  📧 Offerte verstuurd (email)
              ⏳ Meeting nog niet geboekt
```

**Filter opties:**
- "Nog niet benaderd" — aanvragen zonder outreach log
- "Offerte verstuurd maar geen meeting" — follow-up nodig
- "Vandaag" / "Deze week" / "Alle"

---

## UITBREIDING B: Error Dashboard

### Wanneer iets misgaat in de flow

Maak een dedicated error tracking tabel:

```sql
CREATE TABLE IF NOT EXISTS system_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  flow TEXT NOT NULL,  -- bijv. 'offerte_automaat', 'whatsapp_send', 'email_send'
  stap TEXT,           -- bijv. 'ai_intro_genereren', 'pdf_aanmaken', 'resend_versturen'
  aanvraag_id UUID REFERENCES personeel_aanvragen(id) ON DELETE SET NULL,

  -- Error details
  error_message TEXT,
  error_stack TEXT,
  error_code TEXT,     -- bijv. 'OPENAI_QUOTA', 'RESEND_FAILED', 'PDF_RENDER_ERROR'

  -- Impact
  ernst TEXT CHECK (ernst IN ('kritiek', 'hoog', 'medium', 'laag')) DEFAULT 'medium',
  opgelost BOOLEAN DEFAULT FALSE,
  opgelost_op TIMESTAMPTZ,
  notitie TEXT
);

CREATE INDEX system_errors_flow_idx ON system_errors(flow);
CREATE INDEX system_errors_opgelost_idx ON system_errors(opgelost);
CREATE INDEX system_errors_created_at_idx ON system_errors(created_at DESC);
```

**Log errors overal in de flow:**

```typescript
// Helper — gebruik overal
async function logError(flow: string, stap: string, err: unknown, context: {
  aanvraagId?: string, ernst?: string, errorCode?: string
} = {}) {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  await supabase.from('system_errors').insert({
    flow,
    stap,
    aanvraag_id: context.aanvraagId,
    error_message: message,
    error_stack: stack,
    error_code: context.errorCode,
    ernst: context.ernst || 'medium',
  })

  // Kritieke errors: ook Telegram alert
  if (context.ernst === 'kritiek') {
    await sendTelegramAlert(`🔴 KRITIEKE FOUT\nFlow: ${flow}\nStap: ${stap}\nFout: ${message}`)
  }

  console.error(`[${flow}] ${stap}:`, message)
}

// Gebruik:
try {
  await sendOfferte(aanvraagId)
} catch (err) {
  await logError('offerte_automaat', 'resend_versturen', err, {
    aanvraagId,
    ernst: 'hoog',
    errorCode: 'RESEND_FAILED'
  })
}
```

### Error Dashboard Pagina in Admin

Voeg toe aan de admin sidebar onder "System": **"Systeem Status"**

Maak `/app/admin/settings/system-status/page.tsx` (of voeg toe als tab in settings):

**Boven aan de pagina: Health Check Banner**
```
┌─────────────────────────────────────────────────────────┐
│ 🟢 Alle systemen operationeel     Bijgewerkt: zojuist   │
│                                                          │
│ Email (Resend)     🟢 OK          WhatsApp    🟢 OK      │
│ OpenAI             🟢 OK          Database    🟢 OK      │
│ PDF Generator      🟢 OK          Agenda      🟢 OK      │
└─────────────────────────────────────────────────────────┘
```

Als er errors zijn:
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 2 kritieke errors — actie vereist                    │
└─────────────────────────────────────────────────────────┘
```

**Error Tabel:**
| Tijd | Flow | Stap | Fout | Ernst | Aanvraag | Actie |
|------|------|------|------|-------|----------|-------|
| 5 min | offerte_automaat | resend_versturen | API timeout | 🔴 Kritiek | Restaurant X | ✅ Opgelost |
| 2u | whatsapp_send | api_call | 429 quota | 🟠 Hoog | Hotel Y | Actief |

Klik op een rij → detail panel:
- Volledige error stack trace
- Welke aanvraag het betreft
- Knop: "Opnieuw proberen" (herstart die specifieke flow stap)
- Knop: "Markeer als opgelost"
- Vrij tekstveld voor notities

**Notificatie badge** in sidebar: als er onopgeloste kritieke errors zijn, toon een rode badge bij "Systeem Status".

### Automatische Health Check (Cron)

Voeg toe aan `/app/api/cron/route.ts` (of maak nieuw cron endpoint):

```typescript
// Elke 30 minuten: check of er kritieke errors zijn zonder reactie
// Als een kritieke error >1 uur onopgelost is: Telegram alert
async function checkUnresolvedErrors() {
  const { data: errors } = await supabase
    .from('system_errors')
    .select('id, flow, stap, error_message, created_at')
    .eq('opgelost', false)
    .eq('ernst', 'kritiek')
    .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if (errors && errors.length > 0) {
    await sendTelegramAlert(
      `⚠️ ${errors.length} kritieke error(s) onopgelost >1u:\n` +
      errors.map(e => `• ${e.flow}: ${e.error_message}`).join('\n')
    )
  }
}
```

---

## UITGEBREIDE DEFINITION OF DONE

✅ Elke stap in de aanvraag flow wordt gelogd in `aanvraag_outreach_log`
✅ Admin ziet per aanvraag exact wat er is gedaan (email, offerte, meeting)
✅ Filter "Nog niet benaderd" toont aanvragen die follow-up nodig hebben
✅ Alle errors worden gelogd in `system_errors` tabel
✅ Kritieke errors triggeren direct een Telegram notificatie
✅ Admin heeft een System Status pagina met health check en error tabel
✅ Errors kunnen gemarkeerd worden als opgelost
✅ Cron job stuurt alert bij onopgeloste kritieke errors >1 uur
✅ 0 TypeScript errors
✅ npm run build succesvol
