# Master Prompt — Digitaal Contractsysteem

> Kopieer de prompt hieronder en plak in je terminal met `claude --dangerously-skip-permissions`

---

```
Je bent een senior full-stack developer. Je bouwt een compleet digitaal contractsysteem voor het TopTalent Jobs platform (Next.js 16, React 19, TypeScript 5, Supabase, Tailwind CSS 4).

BELANGRIJK:
- Breek GEEN bestaande functionaliteit
- Run `npm run build` na elke grote wijziging
- Het project heeft al @react-pdf/renderer voor PDF generatie (zie src/lib/pdf/offerte-pdf.tsx als voorbeeld)
- Het project heeft al Resend voor email (zie src/lib/email-templates.ts als voorbeeld)
- Het project heeft al Supabase Storage (buckets: editorial-images, kandidaat-documenten)
- Er bestaan al uitgebreide Algemene Voorwaarden op `/voorwaarden` en Privacy Policy op `/privacy`

---

## CONTEXT

### Wat er nu NIET is:
- Geen contract/voorwaarden acceptatie bij medewerker onboarding (src/app/medewerker/activeren/)
- Geen contract/voorwaarden acceptatie bij klant registratie (src/app/klant/registreren/)
- Geen akkoordverklaring bij dienst aanmelding (src/app/api/medewerker/diensten/route.ts)
- Geen digitale handtekening functionaliteit
- Geen contract archief of audit trail

### Wat er WEL is:
- Medewerker activatie flow via magic token + wachtwoord instellen (src/app/medewerker/activeren/)
- Klant registratie met bedrijfsgegevens + wachtwoord (src/app/klant/registreren/)
- Dienst aanmelding flow (POST action "aanmelden" in medewerker/diensten API)
- PDF generatie met @react-pdf/renderer (src/lib/pdf/offerte-pdf.tsx als patroon)
- Email verzending via Resend (src/lib/email-templates.ts)
- Supabase Storage voor bestanden
- Voorwaarden pagina op /voorwaarden (versie 2.0, januari 2025)
- Privacy pagina op /privacy

---

## FASE 1: DATABASE SCHEMA

### Maak migratie `supabase/migrations/20260316_contract_systeem.sql`

```sql
-- ===========================================
-- CONTRACT TEMPLATES
-- Admin kan contract templates beheren
-- ===========================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('medewerker_raamcontract', 'klant_samenwerkingsovereenkomst', 'medewerker_dienst_voorwaarden', 'klant_dienst_voorwaarden')),
  titel TEXT NOT NULL,
  versie TEXT NOT NULL DEFAULT '1.0',
  inhoud JSONB NOT NULL,                 -- Gestructureerde contract content (secties/artikelen)
  html_content TEXT,                      -- Gerenderde HTML versie voor preview
  actief BOOLEAN NOT NULL DEFAULT true,   -- Alleen de actieve versie wordt gebruikt
  vereist_handtekening BOOLEAN NOT NULL DEFAULT false, -- Vereist digitale handtekening?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT                          -- Admin email
);

-- ===========================================
-- GETEKENDE CONTRACTEN
-- Elke ondertekening wordt hier opgeslagen
-- ===========================================
CREATE TABLE IF NOT EXISTS contracten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Wie tekent
  ondertekenaar_type TEXT NOT NULL CHECK (ondertekenaar_type IN ('medewerker', 'klant')),
  ondertekenaar_id UUID NOT NULL,
  ondertekenaar_naam TEXT NOT NULL,
  ondertekenaar_email TEXT NOT NULL,

  -- Welk contract
  template_id UUID NOT NULL REFERENCES contract_templates(id),
  template_versie TEXT NOT NULL,           -- Snapshot van versie op moment van tekenen

  -- Status
  status TEXT NOT NULL DEFAULT 'verstuurd' CHECK (status IN ('verstuurd', 'geopend', 'getekend', 'verlopen', 'ingetrokken')),

  -- Handtekening data
  handtekening_data TEXT,                  -- Base64 van handtekening afbeelding (signature pad)
  handtekening_ip TEXT,                    -- IP adres bij ondertekening
  handtekening_user_agent TEXT,            -- Browser user agent
  handtekening_datum TIMESTAMPTZ,          -- Exacte moment van ondertekening

  -- PDF
  pdf_url TEXT,                            -- URL naar getekend contract PDF in Supabase Storage
  pdf_gegenereerd_op TIMESTAMPTZ,

  -- Contract inhoud snapshot (voor juridische geldigheid)
  contract_inhoud_snapshot JSONB NOT NULL,  -- Volledige contract tekst op moment van tekenen

  -- Tokens
  onderteken_token TEXT UNIQUE,            -- Unieke token voor onderteken link
  onderteken_token_verloopt TIMESTAMPTZ,   -- Token verlooptijd

  -- Metadata
  verstuurd_op TIMESTAMPTZ,
  geopend_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- VOORWAARDEN ACCEPTATIES
-- Voor per-dienst checkbox + onboarding acceptatie
-- ===========================================
CREATE TABLE IF NOT EXISTS voorwaarden_acceptaties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Wie accepteert
  gebruiker_type TEXT NOT NULL CHECK (gebruiker_type IN ('medewerker', 'klant')),
  gebruiker_id UUID NOT NULL,

  -- Wat wordt geaccepteerd
  type TEXT NOT NULL CHECK (type IN (
    'algemene_voorwaarden',      -- Volledige voorwaarden
    'privacy_policy',            -- Privacy beleid
    'dienst_voorwaarden',        -- Per-dienst acceptatie
    'contract_getekend'          -- Verwijzing naar getekend contract
  )),
  versie TEXT NOT NULL,                    -- Versie van de voorwaarden (bijv. "2.0")

  -- Context
  referentie_type TEXT,                    -- bijv. 'dienst', 'contract', 'registratie'
  referentie_id UUID,                      -- bijv. dienst_id, contract_id

  -- Audit trail
  ip_adres TEXT,
  user_agent TEXT,
  geaccepteerd_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_contracten_ondertekenaar ON contracten(ondertekenaar_type, ondertekenaar_id);
CREATE INDEX IF NOT EXISTS idx_contracten_status ON contracten(status);
CREATE INDEX IF NOT EXISTS idx_contracten_token ON contracten(onderteken_token);
CREATE INDEX IF NOT EXISTS idx_contracten_template ON contracten(template_id);
CREATE INDEX IF NOT EXISTS idx_acceptaties_gebruiker ON voorwaarden_acceptaties(gebruiker_type, gebruiker_id);
CREATE INDEX IF NOT EXISTS idx_acceptaties_type ON voorwaarden_acceptaties(type, versie);
CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(type, actief);

-- ===========================================
-- ENABLE REALTIME
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE contracten;

-- ===========================================
-- STORAGE BUCKET
-- ===========================================
-- Maak een bucket voor contract PDFs (moet via Supabase dashboard of API)
-- Bucket naam: contracten
-- Public: false (alleen via signed URLs)
```

---

## FASE 2: TYPESCRIPT TYPES

### Maak `src/types/contracten.ts`

```typescript
export interface ContractTemplate {
  id: string;
  type: 'medewerker_raamcontract' | 'klant_samenwerkingsovereenkomst' | 'medewerker_dienst_voorwaarden' | 'klant_dienst_voorwaarden';
  titel: string;
  versie: string;
  inhoud: ContractInhoud;
  html_content: string | null;
  actief: boolean;
  vereist_handtekening: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ContractInhoud {
  secties: ContractSectie[];
  variabelen: Record<string, string>; // Placeholders die ingevuld worden
}

export interface ContractSectie {
  titel: string;
  artikelen: ContractArtikel[];
}

export interface ContractArtikel {
  nummer: string;
  titel: string;
  tekst: string;      // Kan {{variabelen}} bevatten
  subsecties?: string[];
}

export interface Contract {
  id: string;
  ondertekenaar_type: 'medewerker' | 'klant';
  ondertekenaar_id: string;
  ondertekenaar_naam: string;
  ondertekenaar_email: string;
  template_id: string;
  template_versie: string;
  status: 'verstuurd' | 'geopend' | 'getekend' | 'verlopen' | 'ingetrokken';
  handtekening_data: string | null;
  handtekening_datum: string | null;
  pdf_url: string | null;
  onderteken_token: string | null;
  onderteken_token_verloopt: string | null;
  verstuurd_op: string | null;
  geopend_op: string | null;
  created_at: string;
}

export interface VoorwaardenAcceptatie {
  id: string;
  gebruiker_type: 'medewerker' | 'klant';
  gebruiker_id: string;
  type: 'algemene_voorwaarden' | 'privacy_policy' | 'dienst_voorwaarden' | 'contract_getekend';
  versie: string;
  referentie_type: string | null;
  referentie_id: string | null;
  geaccepteerd_op: string;
}
```

---

## FASE 3: DIGITALE HANDTEKENING COMPONENT

### Maak `src/components/shared/SignaturePad.tsx`

Een canvas-gebaseerd handtekening component. Gebruik de HTML5 Canvas API (GEEN externe library nodig).

**Functionaliteit:**
- Canvas element waar de gebruiker kan tekenen met muis of vinger (touch support)
- "Wissen" knop om opnieuw te beginnen
- "Bevestigen" knop die de handtekening als base64 PNG exporteert
- Responsive: past zich aan aan container breedte
- Touch events voor mobile (touchstart, touchmove, touchend)
- Mouse events voor desktop (mousedown, mousemove, mouseup)
- Lijn styling: 2px breed, donkerblauw (#1E3A5F), smooth curves
- Achtergrond: wit met lichtgrijze stippellijn onderin (ondertekeningsregel)
- State: isEmpty (boolean) — voorkom bevestigen zonder handtekening

```typescript
interface SignaturePadProps {
  onSave: (signatureData: string) => void;  // base64 PNG string
  width?: number;
  height?: number;
  disabled?: boolean;
}
```

**Implementatie richtlijnen:**
- Gebruik `useRef` voor het canvas element
- Gebruik `useCallback` voor event handlers
- Resize observer voor responsive canvas
- `canvas.toDataURL('image/png')` voor export
- Smooth curves met `quadraticCurveTo` in plaats van `lineTo`

---

## FASE 4: CONTRACT PDF GENERATIE

### Maak `src/lib/pdf/contract-pdf.tsx`

Gebruik het EXACTE patroon van `src/lib/pdf/offerte-pdf.tsx` als basis. Lees dat bestand eerst en kopieer de styling aanpak.

**Contract PDF bevat:**

1. **Header**
   - TopTalent logo (gebruik hetzelfde logo als in offerte-pdf)
   - Contracttype titel
   - Versienummer + datum
   - Contractnummer (UUID kort formaat)

2. **Partijen sectie**
   - TopTalent gegevens (uit env vars: FACTUUR_BEDRIJFSNAAM, FACTUUR_ADRES, etc.)
   - Ondertekenaar gegevens (naam, bedrijfsnaam indien klant, email)

3. **Contract artikelen**
   - Genummerde secties en artikelen
   - Professionele opmaak met inspringen
   - Vetgedrukte artikel titels

4. **Handtekening sectie**
   - "Getekend door:" met naam en datum
   - Ingevoegde handtekening afbeelding (van SignaturePad base64)
   - "Digitaal ondertekend op [datum] om [tijd]"
   - IP adres en user agent (kleine tekst)

5. **Footer**
   - "Dit document is digitaal ondertekend via het TopTalent platform"
   - "Contractnummer: [UUID]"
   - Paginanummering

**Twee varianten:**
- `generateMedewerkerContract(data)` — Raamcontract voor medewerkers
- `generateKlantContract(data)` — Samenwerkingsovereenkomst voor klanten

**Beide retourneren een Buffer (PDF bytes) die in Supabase Storage opgeslagen wordt.**

---

## FASE 5: CONTRACT API ROUTES

### 5.1: `src/app/api/contracten/route.ts` (Admin)

**GET:** Haal contracten op (met filters: type, status, ondertekenaar)
**POST:** Maak nieuw contract aan en verstuur per email

POST flow:
1. Admin selecteert template + ondertekenaar (medewerker of klant)
2. Genereer unieke `onderteken_token` (crypto.getRandomValues, 32 chars hex)
3. Zet `onderteken_token_verloopt` op 7 dagen
4. Sla contract op in database met status "verstuurd"
5. Stuur email met onderteken link via Resend
6. Return contract ID

### 5.2: `src/app/api/contracten/[token]/route.ts` (Publiek)

**GET:** Haal contract op via onderteken token
- Valideer dat token geldig is en niet verlopen
- Update status naar "geopend" + sla `geopend_op` op
- Return contract data met template inhoud (met variabelen ingevuld)

**POST:** Onderteken het contract
- Valideer token
- Ontvang: handtekening_data (base64), naam bevestiging
- Sla handtekening op + IP + user agent + datum
- Genereer PDF met handtekening via contract-pdf.tsx
- Upload PDF naar Supabase Storage bucket "contracten"
- Update contract status naar "getekend"
- Sla voorwaarden_acceptatie record op
- Stuur bevestigings email naar ondertekenaar met PDF als bijlage
- Stuur notificatie naar admin (email + Telegram)
- Return success

### 5.3: `src/app/api/contracten/templates/route.ts` (Admin)

CRUD voor contract templates:
- GET: Alle templates ophalen
- POST: Nieuw template aanmaken
- PUT: Template updaten (maakt nieuwe versie)
- DELETE: Template deactiveren (niet verwijderen)

### 5.4: `src/app/api/contracten/bulk/route.ts` (Admin)

Bulk contract verzending:
- POST: Stuur contract naar meerdere medewerkers/klanten tegelijk
- Accepteert: template_id + array van ondertekenaar IDs
- Maakt individuele contracten aan en verstuurt emails
- Rate limiting: max 10 per request, met delay tussen emails

### 5.5: `src/app/api/voorwaarden-acceptatie/route.ts`

**POST:** Registreer een voorwaarden acceptatie
- Valideer sessie (medewerker of klant)
- Sla acceptatie op met IP, user agent, versie
- Return success

**GET:** Check of gebruiker specifieke voorwaarden heeft geaccepteerd
- Query params: type, versie
- Return: boolean + acceptatie datum indien ja

---

## FASE 6: CONTRACT ONDERTEKEN PAGINA

### Maak `src/app/contract/[token]/page.tsx`

Een PUBLIEKE pagina (geen login nodig) waar contracten ondertekend worden.

**Layout:**
```
┌──────────────────────────────────────────┐
│  [TopTalent Logo]     Contract #TT-XXXX  │
├──────────────────────────────────────────┤
│                                          │
│  RAAMOVEREENKOMST / SAMENWERKINGS-       │
│  OVEREENKOMST                            │
│                                          │
│  Partijen:                               │
│  1. TopTalent, gevestigd te Utrecht...   │
│  2. [Naam ondertekenaar]...              │
│                                          │
│  Artikel 1: Definities                   │
│  1.1 In deze overeenkomst wordt...       │
│  ...                                     │
│  (scrollbaar contract document)          │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  ☑ Ik heb het contract volledig gelezen  │
│  ☑ Ik ga akkoord met de Algemene        │
│    Voorwaarden (link naar /voorwaarden)  │
│  ☑ Ik ga akkoord met het Privacy Beleid  │
│    (link naar /privacy)                  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │    [Handtekening Canvas]         │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│  [Wissen]                                │
│                                          │
│  Naam: ______________________________    │
│  Datum: 16 maart 2026 (automatisch)      │
│                                          │
│  [        Onderteken Contract        ]   │
│                                          │
└──────────────────────────────────────────┘
```

**Gedrag:**
1. Pagina laadt contract via GET `/api/contracten/[token]`
2. Contract status wordt "geopend"
3. Gebruiker leest contract (scroll tracking: ze MOETEN naar beneden scrollen)
4. 3 checkboxes MOETEN aangevinkt zijn
5. Handtekening MOET gezet worden
6. Naam MOET ingevuld worden (pre-filled, maar editeerbaar)
7. "Onderteken" knop pas actief als alles ingevuld
8. Na ondertekenen: success pagina met "Contract ondertekend! Een kopie is naar je email verstuurd."
9. Automatische PDF download optie

**States:**
- Loading: Skeleton loader
- Verlopen: "Deze onderteken link is verlopen. Neem contact op met TopTalent."
- Al getekend: "Dit contract is al ondertekend op [datum]." + Download PDF knop
- Ongeldig: "Ongeldige link."

**Responsive:** Mobile-friendly, handtekening pad werkt met touch

---

## FASE 7: EMAIL TEMPLATES VOOR CONTRACTEN

### Voeg toe aan `src/lib/email-templates.ts`:

**1. `buildContractVerstuurdHtml(data)`**
- Onderwerp: "Nieuw contract ter ondertekening — TopTalent"
- Body: Uitleg + grote CTA knop "Contract Bekijken & Ondertekenen"
- Vermelding verlooptermijn (7 dagen)
- TopTalent branding (gebruik oranje gradient stijl uit bestaande templates)

**2. `buildContractGetekendHtml(data)`**
- Onderwerp: "Contract ondertekend — bevestiging"
- Body: Bevestiging + "Download je contract" knop
- PDF als bijlage meesturen via Resend attachments API

**3. `buildContractGetekendAdminHtml(data)`**
- Onderwerp: "[Naam] heeft contract ondertekend"
- Body: Korte samenvatting voor admin + link naar contract in dashboard

**4. `buildContractHerinneringHtml(data)`**
- Onderwerp: "Herinnering: contract nog niet ondertekend"
- Body: Vriendelijke herinnering + CTA knop + verlooptermijn

---

## FASE 8: ONBOARDING INTEGRATIES

### 8.1: Medewerker Activatie + Contract

Bewerk `src/app/medewerker/activeren/MedewerkerActiverenClient.tsx`:

Na het wachtwoord instellen, voeg een TWEEDE stap toe:

**Stap 1 (bestaand):** Wachtwoord instellen
**Stap 2 (nieuw):** Contract ondertekenen

De flow wordt:
1. Medewerker klikt op activatielink
2. Stelt wachtwoord in
3. Wordt doorgestuurd naar contract onderteken pagina (inline in de activatie flow, of als redirect naar /contract/[token])
4. Na ondertekening wordt account volledig geactiveerd
5. Redirect naar /medewerker/login?activated=1

OF (eenvoudigere aanpak): Na wachtwoord instellen, toon een scherm met:
- Embedded contract tekst (scrollbaar)
- Checkboxes voor voorwaarden + privacy
- Handtekening pad
- "Account Activeren & Ondertekenen" knop

Kies de aanpak die het beste past bij de bestaande code.

### 8.2: Klant Registratie + Voorwaarden

Bewerk `src/app/klant/registreren/page.tsx`:

Voeg onder het wachtwoord veld toe:
- ☑ "Ik ga akkoord met de Algemene Voorwaarden" (link naar /voorwaarden in nieuw tabblad)
- ☑ "Ik ga akkoord met het Privacy Beleid" (link naar /privacy in nieuw tabblad)

De registratie knop is NIET klikbaar totdat beide checkboxes aangevinkt zijn.

In de API route (`src/app/api/klant/register/route.ts`):
1. Valideer dat `voorwaarden_akkoord` en `privacy_akkoord` true zijn
2. Na succesvolle registratie, sla 2 records op in `voorwaarden_acceptaties`
3. Stuur automatisch een samenwerkingsovereenkomst contract per email (optioneel, kan ook handmatig vanuit admin)

### 8.3: Dienst Aanmelding + Checkbox

Bewerk `src/components/medewerker/DienstenTab.tsx`:

Bij de "Aanmelden" knop/actie, voeg een bevestigingsmodal toe:

```
┌─────────────────────────────────────┐
│  Aanmelden voor dienst              │
│                                     │
│  Bediening bij Restaurant X         │
│  17 maart 2026 · 18:00 - 23:00     │
│                                     │
│  ☑ Ik ga akkoord met de dienst-     │
│    voorwaarden en het annulerings-  │
│    beleid (48-uur regel)            │
│                                     │
│  [Annuleren]  [Bevestig Aanmelding] │
└─────────────────────────────────────┘
```

In de API route (`src/app/api/medewerker/diensten/route.ts`), bij action "aanmelden":
1. Valideer dat `dienst_voorwaarden_akkoord` true is in de request body
2. Sla een record op in `voorwaarden_acceptaties` met type "dienst_voorwaarden" en referentie_id = dienst_id

---

## FASE 9: ADMIN DASHBOARD — CONTRACTEN TAB

### Maak `src/components/admin/tabs/ContractenTab.tsx`

Nieuwe tab in het admin dashboard voor contractbeheer.

**Subtabs:**
1. **Overzicht** — Alle contracten met status badges, filters, zoekbalk
2. **Templates** — Contract templates beheren (CRUD)
3. **Bulk Verzenden** — Selecteer medewerkers/klanten en verstuur contract

**Overzicht tab:**
- Tabel met: Naam, Type, Status, Verstuurd op, Getekend op, Acties
- Status badges: Verstuurd (geel), Geopend (blauw), Getekend (groen), Verlopen (rood)
- Acties: Bekijk PDF, Herinnering sturen, Intrekken
- Filters: type (medewerker/klant), status
- Zoekbalk op naam/email
- Statistieken bovenaan: Totaal verstuurd, Getekend %, Openstaand, Verlopen

**Templates tab:**
- Lijst van templates per type
- Template editor: titel, versie, artikelen toevoegen/verwijderen/herordenen
- Preview knop (toont hoe het contract eruit ziet als PDF)
- Activeer/deactiveer toggle

**Bulk verzenden tab:**
- Stap 1: Selecteer template
- Stap 2: Selecteer ontvangers (checkbox lijst van medewerkers of klanten die nog geen getekend contract hebben)
- Stap 3: Preview + bevestig
- Stap 4: Voortgangsbalk tijdens verzending

---

## FASE 10: CRON JOB — CONTRACT HERINNERINGEN

### Maak `src/app/api/cron/contract-herinneringen/route.ts`

Dagelijks check (bijv. 09:00):
1. Zoek contracten met status "verstuurd" die ouder zijn dan 3 dagen
2. Stuur herinneringsemail
3. Zoek contracten die bijna verlopen (< 24 uur)
4. Stuur urgente herinneringsemail
5. Zoek contracten die verlopen zijn
6. Update status naar "verlopen"

Beveilig met CRON_SECRET (zie bestaande cron routes als voorbeeld).

---

## FASE 11: MEDEWERKER/KLANT PORTAAL — CONTRACTEN PAGINA

### 11.1: Medewerker Contracten

Maak `src/app/medewerker/contracten/page.tsx` (of voeg toe als tab in het dashboard):

- Lijst van alle contracten van de medewerker
- Status per contract
- "Bekijk PDF" knop → opent signed URL
- "Onderteken" knop voor openstaande contracten
- Informatie over geaccepteerde voorwaarden

### 11.2: Klant Contracten

Maak `src/app/klant/contracten/page.tsx` (of voeg toe als sectie in klant dashboard):

- Zelfde layout als medewerker maar voor klant contracten
- Download/bekijk getekende contracten

---

## FASE 12: SEED DATA — CONTRACT TEMPLATES

Maak in de migratie of een apart seed script twee standaard templates:

### Template 1: Medewerker Raamcontract

Basis structuur (de admin kan dit later aanpassen):
- Artikel 1: Definities
- Artikel 2: Aard van de overeenkomst (geen arbeidsovereenkomst, flexibele inzet)
- Artikel 3: Werkzaamheden en inzet
- Artikel 4: Beschikbaarheid en planning
- Artikel 5: Beloning en betaling
- Artikel 6: Annulering en vervanging (48-uur regel)
- Artikel 7: Gedragsregels en kledingvoorschriften
- Artikel 8: Geheimhouding
- Artikel 9: Aansprakelijkheid
- Artikel 10: Duur en beëindiging
- Artikel 11: Toepasselijk recht

Gebruik de inhoud van de bestaande voorwaarden pagina (`/voorwaarden`) als basis — pas het aan naar een ondertekendocument formaat.

### Template 2: Klant Samenwerkingsovereenkomst

- Artikel 1: Definities
- Artikel 2: Dienstverlening
- Artikel 3: Tarieven en facturatie
- Artikel 4: Betalingsvoorwaarden
- Artikel 5: Urenregistratie en goedkeuring
- Artikel 6: Annulering (48-uur regel, 50% charge)
- Artikel 7: Aansprakelijkheid
- Artikel 8: Geheimhouding
- Artikel 9: Overnameregeling (non-compete: 1040 uur of 12 maanden)
- Artikel 10: Klachten
- Artikel 11: Duur en beëindiging
- Artikel 12: Toepasselijk recht

---

## FASE 13: SUPABASE STORAGE BUCKET

Maak de "contracten" bucket aan. In de code, gebruik:

```typescript
// Upload getekend contract PDF
const { data, error } = await supabaseAdmin.storage
  .from('contracten')
  .upload(
    `${ondertekenaar_type}/${ondertekenaar_id}/${contract_id}.pdf`,
    pdfBuffer,
    { contentType: 'application/pdf', upsert: false }
  );

// Genereer tijdelijke download link (1 uur geldig)
const { data: signedUrl } = await supabaseAdmin.storage
  .from('contracten')
  .createSignedUrl(path, 3600);
```

BELANGRIJK: Maak de bucket PRIVATE (niet public). Gebruik alleen signed URLs.

---

## FASE 14: BUILD VERIFICATIE

1. Run `npm run build` — moet zonder errors
2. Run `npx tsc --noEmit` — moet zonder errors
3. Run `npm run lint` — fix eventuele errors

Maak een rapport `CONTRACT_SYSTEEM_REPORT.md` met:
- Alle nieuwe bestanden
- Alle gewijzigde bestanden
- Database migratie instructies
- Supabase Storage bucket instructies
- Cron job configuratie instructies

---

## WERKWIJZE

1. **Fase 1-2**: Database + Types (snel, basis)
2. **Fase 3**: SignaturePad component
3. **Fase 4**: Contract PDF generatie (volg offerte-pdf.tsx patroon)
4. Run `npm run build`
5. **Fase 5**: API routes
6. **Fase 6**: Contract onderteken pagina
7. **Fase 7**: Email templates
8. Run `npm run build`
9. **Fase 8**: Onboarding integraties (medewerker activatie + klant registratie + dienst checkbox)
10. **Fase 9**: Admin contracten tab
11. Run `npm run build`
12. **Fase 10-11**: Cron job + portaal pagina's
13. **Fase 12-13**: Seed data + storage
14. **Fase 14**: Final build check + rapport

Begin NU en werk alles af zonder te stoppen.
```
