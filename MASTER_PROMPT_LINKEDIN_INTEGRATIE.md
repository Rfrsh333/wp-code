# Master Prompt — LinkedIn Automatische Post Integratie

> Kopieer de prompt hieronder en plak in je terminal met `claude --dangerously-skip-permissions`

---

```
Je bent een senior full-stack developer. Je bouwt een LinkedIn automatische post integratie voor het TopTalent Jobs platform (Next.js 16, React 19, TypeScript 5, Supabase, OpenAI, Tailwind CSS 4).

BELANGRIJK:
- Breek GEEN bestaande functionaliteit
- Run `npm run build` na elke grote wijziging
- Het project heeft TWEE content systemen:
  1. Simpele blog/LinkedIn generator in `src/lib/agents/content-generator.ts` (genereert al LinkedIn-type posts)
  2. Geavanceerde editorial pipeline in `src/lib/content/` met Trigger jobs, clusters, drafts
- Er bestaan al LinkedIn post types in de content_posts tabel (type="linkedin")
- De OpenAI integratie is al volledig werkend (`src/lib/openai.ts` + `src/lib/ai/openai-content-client.ts`)

---

## CONTEXT

### Wat er al is:
- `src/lib/agents/content-generator.ts` genereert al LinkedIn posts (120-170 woorden) met OpenAI
- `content_posts` tabel heeft type="linkedin" support
- Admin ContentTab kan LinkedIn posts genereren, bewerken, en publiceren (naar de website)
- Editorial pipeline kan ook LinkedIn-format content genereren
- Resend email systeem voor notificaties
- Cron job infrastructuur met CRON_SECRET

### Wat er NIET is:
- Geen LinkedIn API koppeling (OAuth, posting)
- Geen planning/scheduling van LinkedIn posts
- Geen LinkedIn analytics
- Posts worden nu alleen op de website "gepubliceerd", niet op LinkedIn zelf

### Wat er moet komen:
1. LinkedIn OAuth 2.0 koppeling voor de TopTalent bedrijfspagina
2. Post wachtrij met planning functionaliteit
3. Admin UI om posts te reviewen, bewerken, en goed te keuren
4. Automatisch posten op geplande tijden via cron job
5. LinkedIn analytics ophalen (optioneel)

---

## FASE 1: LINKEDIN APP SETUP DOCUMENTATIE

### Maak `docs/LINKEDIN_SETUP.md`

Schrijf een duidelijke handleiding voor het opzetten van de LinkedIn Developer App:

```markdown
# LinkedIn API Setup Guide — TopTalent

## Stap 1: LinkedIn Developer App aanmaken
1. Ga naar https://developer.linkedin.com/
2. Klik "Create App"
3. Vul in:
   - App naam: "TopTalent Content Manager"
   - LinkedIn Page: Selecteer de TopTalent bedrijfspagina
   - App logo: Upload TopTalent logo
   - Accepteer Legal Agreement
4. Klik "Create App"

## Stap 2: Products toevoegen
1. Ga naar je app > Products tab
2. Vraag toegang aan voor:
   - "Share on LinkedIn" (voor posts publiceren)
   - "Community Management API" (voor bedrijfspagina posts + analytics)
3. Wacht op goedkeuring (meestal binnen 24-48 uur)

## Stap 3: OAuth Credentials
1. Ga naar Auth tab
2. Noteer:
   - Client ID → `LINKEDIN_CLIENT_ID`
   - Client Secret → `LINKEDIN_CLIENT_SECRET`
3. Voeg Redirect URL toe:
   - `https://jouwdomein.nl/api/linkedin/callback`
   - `http://localhost:3000/api/linkedin/callback` (development)

## Stap 4: Scopes
De app heeft deze OAuth scopes nodig:
- `w_member_social` — Posts publiceren op persoonlijk profiel
- `w_organization_social` — Posts publiceren op bedrijfspagina
- `r_organization_social` — Analytics ophalen
- `rw_organization_admin` — Bedrijfspagina beheer

## Stap 5: Environment Variables
Voeg toe aan je .env.local:
```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://jouwdomein.nl/api/linkedin/callback
LINKEDIN_ORGANIZATION_ID=your_company_page_id
```

Het Organization ID vind je in de URL van je bedrijfspagina admin:
`https://www.linkedin.com/company/12345678/admin/` → ID = 12345678
```

---

## FASE 2: DATABASE SCHEMA

### Maak migratie `supabase/migrations/20260316_linkedin_integratie.sql`

```sql
-- ===========================================
-- LINKEDIN CONNECTIE
-- Slaat OAuth tokens op voor de bedrijfspagina
-- ===========================================
CREATE TABLE IF NOT EXISTS linkedin_connecties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  organization_naam TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_verloopt_op TIMESTAMPTZ NOT NULL,
  scopes TEXT[],
  verbonden_door TEXT NOT NULL,               -- Admin email
  verbonden_op TIMESTAMPTZ DEFAULT NOW(),
  laatst_gebruikt_op TIMESTAMPTZ,
  actief BOOLEAN NOT NULL DEFAULT true
);

-- ===========================================
-- LINKEDIN POST WACHTRIJ
-- Posts die klaarstaan om gepubliceerd te worden
-- ===========================================
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  tekst TEXT NOT NULL,                         -- Post tekst (max 3000 chars voor LinkedIn)
  media_urls TEXT[],                            -- Optionele afbeelding URLs
  link_url TEXT,                                -- Optionele link (bijv. naar blog post)
  link_titel TEXT,                              -- Link preview titel
  link_beschrijving TEXT,                       -- Link preview beschrijving

  -- Bron
  bron_type TEXT CHECK (bron_type IN ('handmatig', 'ai_gegenereerd', 'blog_conversie', 'editorial')),
  bron_id UUID,                                -- Optionele referentie naar content_posts of editorial_drafts

  -- Status & Planning
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN (
    'concept',            -- AI gegenereerd, wacht op review
    'goedgekeurd',        -- Admin heeft goedgekeurd
    'gepland',            -- Gepland voor publicatie op specifiek tijdstip
    'publiceren',         -- Klaar om gepubliceerd te worden (cron pakt op)
    'gepubliceerd',       -- Succesvol gepost op LinkedIn
    'mislukt',            -- Publicatie mislukt
    'geannuleerd'         -- Geannuleerd door admin
  )),
  gepland_op TIMESTAMPTZ,                      -- Wanneer moet het gepost worden
  gepubliceerd_op TIMESTAMPTZ,                 -- Wanneer is het daadwerkelijk gepost

  -- LinkedIn response
  linkedin_post_id TEXT,                       -- LinkedIn's post URN na publicatie
  linkedin_share_url TEXT,                     -- Directe URL naar de post

  -- Analytics (opgehaald via API)
  impressies INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  clicks INT DEFAULT 0,
  analytics_bijgewerkt_op TIMESTAMPTZ,

  -- Admin
  aangemaakt_door TEXT,                        -- Admin email of 'system'
  goedgekeurd_door TEXT,                       -- Admin email
  goedgekeurd_op TIMESTAMPTZ,

  -- Metadata
  tags TEXT[],                                 -- Categorieën/labels
  notities TEXT,                               -- Interne notities
  fout_melding TEXT,                            -- Error message bij mislukt

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- LINKEDIN POST TEMPLATES
-- Herbruikbare templates voor LinkedIn posts
-- ===========================================
CREATE TABLE IF NOT EXISTS linkedin_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN (
    'vacature',              -- Vacature/dienst delen (20%)
    'mijlpalen',             -- Bedrijfsmijlpalen & groei (15%)
    'sector_nieuws',         -- Sector nieuws & arbeidsmarkt trends (15%)
    'medewerker_spotlight',  -- Medewerker in het zonnetje (15%)
    'tips_kennis',           -- Tips & kennis delen (15%)
    'behind_the_scenes',     -- Behind the scenes / bedrijfscultuur (10%)
    'engagement',            -- Polls, vragen, interactie (10%)
    'blog_promotie',         -- Blog post promoten
    'algemeen'               -- Vrij template
  )),
  prompt_instructie TEXT NOT NULL,             -- Instructie voor OpenAI
  voorbeeld_tekst TEXT,                        -- Voorbeeld output
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_status ON linkedin_posts(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_gepland ON linkedin_posts(gepland_op) WHERE status = 'gepland';
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_bron ON linkedin_posts(bron_type, bron_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_connecties_actief ON linkedin_connecties(actief);

-- ===========================================
-- SEED: LinkedIn Templates
-- ===========================================
INSERT INTO linkedin_templates (naam, categorie, prompt_instructie, voorbeeld_tekst) VALUES

-- =============================================
-- 1. VACATURES & DIENSTEN (20% van content)
-- =============================================
(
  'Vacature Delen',
  'vacature',
  'Schrijf een LinkedIn post (max 200 woorden) voor een vacature/dienst bij TopTalent uitzendbureau. Maak het aantrekkelijk en energiek. Structuur: pakkende opening met emoji → functie + locatie + datum/tijd → 3 voordelen met checkmarks → call-to-action om aan te melden. Voeg 4-5 hashtags toe. Taal: Nederlands. Toon: enthousiast maar professioneel.',
  '🎯 Wij zoeken: Bediening voor een top restaurant in Utrecht!

📅 Wanneer: Zaterdag 22 maart
⏰ Tijd: 18:00 - 23:00
💰 Tarief: €14,50/uur

Wat maakt het leuk?
✅ Gezellig team
✅ Directe betaling
✅ Flexibel inplannen

Interesse? Meld je aan via de TopTalent app!

#Horeca #Bediening #Utrecht #Bijbaan #TopTalent'
),
(
  'Seizoensgebonden Oproep',
  'vacature',
  'Schrijf een LinkedIn post (max 200 woorden) voor seizoensgebonden werk (festivals, kerstperiode, zomer terrassen, evenementen). Creëer urgentie en enthousiasme. Benoem het seizoen/evenement, beschikbare functies, en hoe snel ze zich kunnen aanmelden. Gebruik seizoensgebonden emoji''s. Taal: Nederlands.',
  '☀️ Festivalseizoen komt eraan! Wij zoeken 50+ medewerkers!

Van Lowlands tot Mysteryland — wij leveren de crew. Ben jij erbij?

Beschikbare functies:
🎪 Barmedewerker
🎪 Sitecrew
🎪 Cateraar
🎪 Schoonmaak

Wat je krijgt:
💰 Goed tarief + toeslagen
🎶 Gratis toegang na je shift
👥 Een team vol energie

Meld je nu aan — plekken zijn beperkt!

#Festival #Bijbaan #Horeca #TopTalent #Zomer2026'
),

-- =============================================
-- 2. BEDRIJFSMIJLPALEN & GROEI (15% van content)
-- =============================================
(
  'Mijlpaal Vieren',
  'mijlpalen',
  'Schrijf een LinkedIn post (max 250 woorden) waarin TopTalent een bedrijfsmijlpaal viert. Structuur: opvallend cijfer of prestatie als opening → wat dit betekent → dankwoord aan klanten/medewerkers → vooruitblik. Maak het trots maar bescheiden. Gebruik 2-3 relevante emoji''s. Eindig met een positieve boodschap. Taal: Nederlands.',
  '🎉 1.000 shifts ingevuld deze maand!

Wat begon als een klein uitzendbureau in Utrecht groeit elke dag. Deze maand hebben we een mooie mijlpaal bereikt: meer dan 1.000 shifts succesvol ingevuld bij onze opdrachtgevers.

Dat zijn 1.000 keer dat een restaurant vol kon draaien. 1.000 keer dat een magazijn op volle kracht werkte. 1.000 keer dat een evenement soepel verliep.

Dit was niet mogelijk zonder:
👏 Onze geweldige medewerkers die elke dag hun beste beentje voorzetten
🤝 Onze opdrachtgevers die ons vertrouwen
💪 Ons team dat dag en nacht klaarstaat

Op naar de volgende 1.000!

#TopTalent #Mijlpaal #Uitzendbureau #Groei #Horeca'
),
(
  'Nieuwe Klant / Samenwerking',
  'mijlpalen',
  'Schrijf een LinkedIn post (max 200 woorden) over een nieuwe samenwerking of grote klant (zonder naam te noemen tenzij expliciet gegeven). Focus op de sector, het type dienstverlening, en wat TopTalent uniek maakt. Taal: Nederlands.',
  NULL
),
(
  'Groei Update',
  'mijlpalen',
  'Schrijf een LinkedIn post (max 200 woorden) over de groei van TopTalent. Gebruik concrete cijfers (nieuwe medewerkers, nieuwe regio, omzetgroei, etc.). Structuur: pakkend cijfer → context → dankwoord → vooruitblik op wat komt. Taal: Nederlands.',
  NULL
),

-- =============================================
-- 3. SECTOR NIEUWS & TRENDS (15% van content)
-- =============================================
(
  'Arbeidsmarkt Nieuws',
  'sector_nieuws',
  'Schrijf een LinkedIn post (max 250 woorden) over een actueel arbeidsmarkt-onderwerp. Begin met een opvallend feit of cijfer. Geef context en leg uit wat dit betekent voor horecaondernemers, uitzendkrachten, of de staffing sector. Eindig met een mening of vraag van TopTalent. Voeg een link naar het bronartikelen toe als die gegeven is. Taal: Nederlands. Toon: informatief, deskundig.',
  '📊 Het CBS meldt: de krapte op de arbeidsmarkt in horeca bereikt een nieuw record.

Er staan 47 vacatures open per 1.000 banen in de horeca — het hoogste aantal ooit gemeten.

Wat betekent dit?
→ Restaurants draaien onderbezet
→ Evenementen worden afgeschaald
→ Personeel heeft meer keuze dan ooit

Bij TopTalent zien we dit dagelijks. De oplossing? Flexibiliteit. Medewerkers willen zelf kiezen wanneer en waar ze werken. Bedrijven die dat bieden, trekken talent aan.

Hoe gaan jullie om met de personeelskrapte? 👇

#Arbeidsmarkt #Horeca #Personeel #CBS #TopTalent'
),
(
  'Wetgeving Update',
  'sector_nieuws',
  'Schrijf een LinkedIn post (max 250 woorden) over een wetswijziging of regelgeving die relevant is voor de uitzend/horeca sector. Maak het begrijpelijk voor niet-juristen. Leg uit wat er verandert, per wanneer, en wat de impact is. Eindig met een tip of advies. Taal: Nederlands.',
  NULL
),
(
  'Trend Analyse',
  'sector_nieuws',
  'Schrijf een LinkedIn post (max 250 woorden) over een trend in de staffing/horeca/flex sector. Gebruik data als die beschikbaar is. Geef de TopTalent visie op de trend. Eindig met een open vraag. Taal: Nederlands.',
  NULL
),

-- =============================================
-- 4. MEDEWERKER SPOTLIGHTS (15% van content)
-- =============================================
(
  'Medewerker van de Maand',
  'medewerker_spotlight',
  'Schrijf een LinkedIn post (max 200 woorden) die een medewerker van de maand in het zonnetje zet. Structuur: felicitatie opening → wat deze medewerker bijzonder maakt (betrouwbaarheid, attitude, klantfeedback) → een korte quote of feit → dankwoord. Maak het persoonlijk en warm. Gebruik de voornaam. Taal: Nederlands. BELANGRIJK: gebruik geen achternaam of foto zonder toestemming.',
  '⭐ Medewerker van de maand: Lisa!

Lisa is al 8 maanden actief via TopTalent en heeft in die tijd meer dan 60 shifts gedraaid — zonder één no-show.

Haar opdrachtgevers zijn lovend:
"Lisa is altijd vrolijk, punctueel, en pakt alles op. We vragen specifiek naar haar."

Wat maakt Lisa bijzonder?
✨ 5.0 gemiddelde beoordeling
✨ Altijd beschikbaar voor spoedshifts
✨ Helpt nieuwe collega''s wegwijs

Lisa, bedankt voor je inzet! Jij maakt het verschil 💪

#TopTalent #MedewerkerVanDeMaand #Horeca #Trots'
),
(
  'Succesverhaal',
  'medewerker_spotlight',
  'Schrijf een LinkedIn post (max 250 woorden) over een medewerker die via TopTalent is doorgegroeid of een bijzondere prestatie heeft geleverd. Vertel het als een kort verhaal. Begin met de startsituatie, beschrijf de groei, en eindig met waar ze nu staan. Inspirerend en authentiek. Taal: Nederlands.',
  NULL
),

-- =============================================
-- 5. TIPS & KENNIS DELEN (15% van content)
-- =============================================
(
  'Tips voor Werkgevers',
  'tips_kennis',
  'Schrijf een LinkedIn post (max 250 woorden) met 3-5 praktische tips voor horecaondernemers of werkgevers in de flex sector. Onderwerp gebaseerd op de gegeven context. Gebruik genummerde of emoji bullets. Eindig met een vraag om engagement te stimuleren. Taal: Nederlands. Toon: behulpzaam, deskundig.',
  '💡 5 tips om je horecapersoneel te behouden in 2026:

1️⃣ Flexibele roosters — laat medewerkers meedenken over hun planning
2️⃣ Snelle betaling — niemand wil weken wachten op zijn loon
3️⃣ Waardering tonen — een simpel "goed gedaan" doet wonderen
4️⃣ Doorgroeimogelijkheden — van afwas naar sous-chef, maak het pad zichtbaar
5️⃣ Goede werksfeer — investeer in teambuilding, ook voor flexkrachten

Bij TopTalent zien we dat bedrijven die deze 5 dingen goed doen, 3x minder verloop hebben.

Welke tip spreekt jullie het meest aan? 👇

#HRTips #Horeca #Personeel #Werkgever #TopTalent'
),
(
  'Tips voor Uitzendkrachten',
  'tips_kennis',
  'Schrijf een LinkedIn post (max 250 woorden) met 3-5 praktische tips voor uitzendkrachten of flexwerkers. Onderwerpen: eerste shift overleven, meer shifts krijgen, professioneel overkomen, carrière opbouwen via flex werk. Gebruik emoji bullets. Eindig met een aanmoedigende boodschap. Taal: Nederlands.',
  NULL
),
(
  'Kennisdeling',
  'tips_kennis',
  'Schrijf een LinkedIn post (max 250 woorden) waarin TopTalent expertise deelt over een relevant onderwerp (flex arbeidsmarkt, horeca operations, personeelsplanning, etc.). Structuur: inleidende vraag of stelling → uitleg met concrete voorbeelden → conclusie met actionable takeaway. Taal: Nederlands.',
  NULL
),

-- =============================================
-- 6. BEHIND THE SCENES (10% van content)
-- =============================================
(
  'Team & Cultuur',
  'behind_the_scenes',
  'Schrijf een LinkedIn post (max 200 woorden) die een kijkje achter de schermen geeft bij TopTalent. Dit kan gaan over: het team, het kantoor, hoe een shift tot stand komt, een teamuitje, of een grappig moment. Maak het persoonlijk en authentiek. Laat zien dat er echte mensen achter het bedrijf zitten. Taal: Nederlands. Toon: casual, warm, menselijk.',
  '📸 Een kijkje achter de schermen bij TopTalent!

Wist je dat er achter elke shift een heel team staat?

Vanochtend om 07:00 ging de telefoon al: een klant had last-minute 5 extra mensen nodig voor een groot evenement vanavond.

Wat volgde:
☎️ 23 telefoontjes
📱 47 WhatsApp berichten
☕ 4 koppen koffie
⏰ En binnen 2 uur: alle 5 plekken gevuld!

Dat is wat wij doen. Elke dag. Met een glimlach (en veel koffie).

Benieuwd hoe wij werken? Stuur ons een bericht!

#BehindTheScenes #TopTalent #Uitzendbureau #TeamWork'
),
(
  'Tech & Innovatie',
  'behind_the_scenes',
  'Schrijf een LinkedIn post (max 200 woorden) over hoe TopTalent technologie inzet om het uitzendproces te verbeteren. Denk aan: de app, AI matching, digitale contracten, automatische planning. Maak het begrijpelijk en niet te technisch. Laat zien dat TopTalent innovatief is. Taal: Nederlands.',
  NULL
),

-- =============================================
-- 7. ENGAGEMENT POSTS (10% van content)
-- =============================================
(
  'Poll / Vraag',
  'engagement',
  'Schrijf een LinkedIn post (max 150 woorden) die een vraag stelt of een poll voorstelt om engagement te stimuleren. Het onderwerp moet relevant zijn voor de uitzend/horeca/flex sector. Maak het luchtig en uitnodigend om te reageren. Gebruik 1-2 emoji''s. Eindig met duidelijke antwoordopties of een open vraag. Taal: Nederlands.',
  '🤔 Vraag aan alle horecaondernemers:

Wat is jullie GROOTSTE uitdaging op dit moment?

A) Personeel vinden
B) Personeel behouden
C) Stijgende kosten
D) Regelgeving

Laat het ons weten in de comments! 👇

We zijn benieuwd — en wie weet kunnen we helpen 😊

#Horeca #Poll #Ondernemer #TopTalent'
),
(
  'Feestdag / Seizoen',
  'engagement',
  'Schrijf een LinkedIn post (max 150 woorden) passend bij een feestdag, seizoen, of bijzonder moment (Koningsdag, kerst, nieuwjaar, begin zomer, etc.). Maak de connectie naar de uitzend/horeca sector. Houd het positief en luchtig. Taal: Nederlands.',
  NULL
),
(
  'Bedankje Post',
  'engagement',
  'Schrijf een LinkedIn post (max 150 woorden) waarin TopTalent klanten, medewerkers, of partners bedankt. Kan gekoppeld zijn aan een mijlpaal, einde van het jaar, of gewoon spontaan. Oprecht en niet overdreven. Taal: Nederlands.',
  NULL
),

-- =============================================
-- 8. BLOG PROMOTIE
-- =============================================
(
  'Blog Promotie',
  'blog_promotie',
  'Schrijf een LinkedIn post (max 250 woorden) die een blog artikel van TopTalent promoot. Structuur: pakkende opening met een feit of vraag → vat de kernboodschap samen in 2-3 zinnen (maar verklap niet alles — maak mensen nieuwsgierig) → call-to-action "Lees het volledige artikel" met link. Voeg 4-5 relevante hashtags toe. Taal: Nederlands.',
  '🔎 Wist je dat 73% van de horecaondernemers moeite heeft om personeel te vinden?

In ons laatste blog duiken we in de top 5 strategieën die wél werken voor het aantrekken van horeca talent in 2026.

Van flexibele roosters tot employer branding — ontdek wat het verschil maakt.

👉 Lees het volledige artikel: [link]

#Horeca #Recruitment #Personeel #TopTalent #HRTips'
)

ON CONFLICT DO NOTHING;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE linkedin_posts;
```

---

## FASE 3: TYPESCRIPT TYPES

### Maak `src/types/linkedin.ts`

```typescript
export interface LinkedInConnectie {
  id: string;
  organization_id: string;
  organization_naam: string | null;
  access_token: string;
  refresh_token: string | null;
  token_verloopt_op: string;
  scopes: string[];
  verbonden_door: string;
  verbonden_op: string;
  actief: boolean;
}

export interface LinkedInPost {
  id: string;
  tekst: string;
  media_urls: string[] | null;
  link_url: string | null;
  link_titel: string | null;
  link_beschrijving: string | null;
  bron_type: 'handmatig' | 'ai_gegenereerd' | 'blog_conversie' | 'editorial';
  bron_id: string | null;
  status: LinkedInPostStatus;
  gepland_op: string | null;
  gepubliceerd_op: string | null;
  linkedin_post_id: string | null;
  linkedin_share_url: string | null;
  impressies: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  aangemaakt_door: string | null;
  goedgekeurd_door: string | null;
  goedgekeurd_op: string | null;
  tags: string[] | null;
  notities: string | null;
  fout_melding: string | null;
  created_at: string;
}

export type LinkedInPostStatus =
  | 'concept'
  | 'goedgekeurd'
  | 'gepland'
  | 'publiceren'
  | 'gepubliceerd'
  | 'mislukt'
  | 'geannuleerd';

export interface LinkedInTemplate {
  id: string;
  naam: string;
  categorie: string;
  prompt_instructie: string;
  voorbeeld_tekst: string | null;
  actief: boolean;
}
```

---

## FASE 4: LINKEDIN API CLIENT

### Maak `src/lib/linkedin/client.ts`

Een typed LinkedIn API client die de officiële REST API aanspreekt.

```typescript
// Gebruik GEEN externe library. Gebruik native fetch() met de LinkedIn API v2.
// Alle requests moeten deze headers hebben:
// - Authorization: Bearer {access_token}
// - LinkedIn-Version: 202503  (YYYYMM format, gebruik huidige maand)
// - X-Restli-Protocol-Version: 2.0.0
// - Content-Type: application/json

export class LinkedInClient {
  private accessToken: string;
  private organizationId: string;
  private baseUrl = 'https://api.linkedin.com/v2';
  private restUrl = 'https://api.linkedin.com/rest';

  constructor(accessToken: string, organizationId: string) {
    this.accessToken = accessToken;
    this.organizationId = organizationId;
  }

  // === POST PUBLICEREN ===

  // Tekst-only post op bedrijfspagina
  async createTextPost(tekst: string): Promise<{ id: string; shareUrl: string }> {
    // POST naar /rest/posts
    // Body:
    // {
    //   "author": "urn:li:organization:{organizationId}",
    //   "commentary": tekst,
    //   "visibility": "PUBLIC",
    //   "distribution": {
    //     "feedDistribution": "MAIN_FEED",
    //     "targetEntities": [],
    //     "thirdPartyDistributionChannels": []
    //   },
    //   "lifecycleState": "PUBLISHED"
    // }
  }

  // Post met link preview (article share)
  async createLinkPost(tekst: string, linkUrl: string): Promise<{ id: string; shareUrl: string }> {
    // POST naar /rest/posts
    // Body bevat extra "content" object met:
    // {
    //   "content": {
    //     "article": {
    //       "source": linkUrl,
    //       "title": linkTitel,       // optioneel
    //       "description": linkBeschrijving  // optioneel
    //     }
    //   }
    // }
  }

  // Post met afbeelding
  async createImagePost(tekst: string, imageUrl: string): Promise<{ id: string; shareUrl: string }> {
    // Stap 1: Upload afbeelding registreren
    // POST /rest/images?action=initializeUpload
    // Body: { "initializeUploadRequest": { "owner": "urn:li:organization:{id}" } }
    // Response: uploadUrl + image URN

    // Stap 2: Upload afbeelding naar uploadUrl (PUT met binary data)

    // Stap 3: Maak post met image URN
    // POST /rest/posts met content.media[].id = image URN
  }

  // === ANALYTICS ===

  async getPostAnalytics(postUrn: string): Promise<{
    impressies: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  }> {
    // GET /rest/organizationalEntityShareStatistics
    // Query params: q=organizationalEntity&organizationalEntity=urn:li:organization:{id}&shares={postUrn}
  }

  // === TOKEN MANAGEMENT ===

  static async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    // POST https://www.linkedin.com/oauth/v2/accessToken
    // Body: grant_type=refresh_token&refresh_token=X&client_id=X&client_secret=X
  }

  // === HELPER ===

  private async request(method: string, url: string, body?: unknown) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'LinkedIn-Version': '202503',
      'X-Restli-Protocol-Version': '2.0.0',
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`LinkedIn API error ${res.status}: ${error}`);
    }

    // LinkedIn returns empty body for some endpoints (201 Created)
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
}
```

### Maak `src/lib/linkedin/token-manager.ts`

Beheert OAuth tokens met automatische refresh:

```typescript
// Haal de actieve connectie op uit de database
// Als het token bijna verlopen is (< 1 uur), refresh automatisch
// Sla nieuwe tokens op in database
// Return een werkende LinkedInClient instantie

export async function getLinkedInClient(): Promise<LinkedInClient | null> {
  // 1. Haal actieve connectie uit linkedin_connecties
  // 2. Check of token verlopen is
  // 3. Als verlopen: refresh via LinkedInClient.refreshAccessToken()
  // 4. Sla nieuwe token op
  // 5. Return new LinkedInClient(token, orgId)
  // 6. Return null als er geen actieve connectie is
}
```

---

## FASE 5: LINKEDIN AI CONTENT GENERATOR

### Maak `src/lib/linkedin/content-generator.ts`

Bouwt voort op het bestaande content systeem (`src/lib/agents/content-generator.ts`).

```typescript
// Functies:

// 1. generateLinkedInPost(template: LinkedInTemplate, context: object)
//    - Gebruikt OpenAI (gpt-4o-mini) met het template's prompt_instructie
//    - Context kan zijn: blog data, vacature data, statistieken, etc.
//    - Output: tekst (max 3000 chars), hashtags, link suggestie

// 2. convertBlogToLinkedIn(contentPost: ContentPost)
//    - Neemt een bestaande blog post uit content_posts
//    - Genereert een korte LinkedIn post die de blog promoot
//    - Voegt link naar blog toe
//    - Output: linkedin_posts record klaar voor review

// 3. convertEditorialToLinkedIn(editorialDraft: EditorialDraft)
//    - Neemt een editorial draft
//    - Zelfde aanpak als blog conversie

// 4. generateBatchPosts(count: number, categorie: string)
//    - Genereert meerdere posts tegelijk voor de week
//    - Haalt recente data op (nieuwe diensten, blog posts, bedrijfsnieuws)
//    - Maakt varied content (niet allemaal hetzelfde type)

// 5. generateWeeklyContentPlan(postsPerWeek: number = 4)
//    - Genereert een gebalanceerde week aan LinkedIn posts
//    - Volgt de content mix strategie:
//      * 20% vacatures/diensten (1 per week)
//      * 15% mijlpalen & groei (1 per 2 weken)
//      * 15% sector nieuws (1 per week — gebruik RSS/content pipeline data)
//      * 15% medewerker spotlights (1 per 2 weken)
//      * 15% tips & kennis (1 per week)
//      * 10% behind the scenes (1 per 2 weken)
//      * 10% engagement/polls (1 per 2 weken)
//    - Kiest automatisch het juiste template per categorie
//    - Haalt relevante data op uit de database:
//      * Recente diensten voor vacature posts
//      * Blog posts van deze week voor blog promotie
//      * RSS nieuws artikelen voor sector nieuws
//      * Medewerker statistieken voor spotlights
//      * Bedrijfsstatistieken voor mijlpalen
//    - Spreidt posts over de week (ma/wo/vr of di/do)
//    - Slaat alle posts op als concept in linkedin_posts
```

**OpenAI System Prompt voor LinkedIn posts:**

```
Je bent de social media manager van TopTalent, een uitzendbureau gespecialiseerd in horeca, logistiek, retail, facilitair, en bouw personeel in Nederland.

Schrijf LinkedIn posts voor de bedrijfspagina die:
- Professioneel maar toegankelijk zijn
- De Nederlandse taal gebruiken
- Relevante emoji's bevatten (niet overdreven, max 5-8 per post)
- Eindigen met 3-5 hashtags
- Max 250 woorden zijn (ideale LinkedIn lengte)
- Engagement stimuleren (vragen stellen, meningen vragen)
- De TopTalent brand versterken als betrouwbare uitzendpartner

Vermijd:
- Overdreven corporate taal
- Meer dan 8 emoji's
- Engelse woorden waar Nederlandse alternatieven bestaan
- Clickbait of misleidende claims
```

---

## FASE 6: OAUTH API ROUTES

### 6.1: `src/app/api/linkedin/authorize/route.ts`

Start OAuth flow:
```typescript
// GET: Redirect naar LinkedIn OAuth consent pagina
// URL: https://www.linkedin.com/oauth/v2/authorization
// Params: response_type=code, client_id, redirect_uri, scope, state (CSRF token)
```

### 6.2: `src/app/api/linkedin/callback/route.ts`

Verwerk OAuth callback:
```typescript
// GET: LinkedIn redirect terug met authorization code
// 1. Valideer state parameter (CSRF bescherming)
// 2. Exchange code voor access_token + refresh_token
//    POST https://www.linkedin.com/oauth/v2/accessToken
// 3. Haal organization info op via LinkedIn API
// 4. Sla connectie op in linkedin_connecties tabel
// 5. Redirect naar admin dashboard met success message
```

### 6.3: `src/app/api/linkedin/disconnect/route.ts`

Verbreek connectie:
```typescript
// POST: Deactiveer de LinkedIn connectie
// Zet actief=false in linkedin_connecties
// Verwijder GEEN data (audit trail behouden)
```

### 6.4: `src/app/api/linkedin/status/route.ts`

Check connectie status:
```typescript
// GET: Return of er een actieve LinkedIn connectie is
// Return: { connected: boolean, organization_naam, verbonden_op, token_verloopt_op }
```

---

## FASE 7: LINKEDIN POST API ROUTES

### 7.1: `src/app/api/admin/linkedin/route.ts`

Hoofd CRUD route voor LinkedIn posts:

**GET:** Haal posts op met filters
- Query params: status, categorie, bron_type, page, limit
- Return: posts array + totaal count + stats (concept/gepland/gepubliceerd counts)

**POST:** Acties op posts

Action: `generate`
- Input: template_id OF bron_type + bron_id (voor blog conversie)
- Genereer post met AI
- Sla op als concept
- Return: nieuwe post

Action: `create`
- Input: tekst, media_urls, link_url, tags
- Sla op als concept (handmatig aangemaakt)

Action: `update`
- Input: id, tekst, media_urls, link_url, tags, notities
- Update bestaande concept/goedgekeurde post

Action: `approve`
- Input: id
- Zet status naar "goedgekeurd", sla goedgekeurd_door en goedgekeurd_op op

Action: `schedule`
- Input: id, gepland_op (datetime)
- Zet status naar "gepland"
- Valideer dat gepland_op in de toekomst is

Action: `publish_now`
- Input: id
- Publiceer direct op LinkedIn via LinkedInClient
- Update status naar "gepubliceerd" of "mislukt"
- Sla linkedin_post_id en linkedin_share_url op

Action: `cancel`
- Input: id
- Zet status naar "geannuleerd" (alleen voor concept/goedgekeurd/gepland)

Action: `delete`
- Input: id
- Verwijder post (alleen concepten)

Action: `generate_batch`
- Input: count (1-10), categorie
- Genereer meerdere posts tegelijk
- Return: array van nieuwe concept posts

### 7.2: `src/app/api/admin/linkedin/templates/route.ts`

CRUD voor LinkedIn templates:
- GET: Alle templates
- POST: create/update/delete template

### 7.3: `src/app/api/admin/linkedin/analytics/route.ts`

Haal analytics op:
- GET: Haal analytics op voor gepubliceerde posts
- Kan ook batch update doen voor alle recente posts

---

## FASE 8: CRON JOB — AUTOMATISCH POSTEN

### Maak `src/app/api/cron/linkedin-publish/route.ts`

Draait elke 5-15 minuten:

```typescript
// 1. Verifieer CRON_SECRET
// 2. Zoek posts met status "gepland" en gepland_op <= nu
// 3. Voor elke post:
//    a. Haal LinkedInClient op via getLinkedInClient()
//    b. Publiceer de post (createTextPost, createLinkPost, of createImagePost)
//    c. Update status naar "gepubliceerd" + sla linkedin_post_id op
//    d. Bij fout: status "mislukt" + fout_melding opslaan
//    e. Stuur admin notificatie (Telegram) bij succes of fout
// 4. Return samenvatting
```

### Maak `src/app/api/cron/linkedin-analytics/route.ts`

Draait dagelijks (bijv. 06:00):

```typescript
// 1. Verifieer CRON_SECRET
// 2. Zoek alle gepubliceerde posts van de laatste 30 dagen
// 3. Haal analytics op via LinkedInClient
// 4. Update impressies, likes, comments, shares, clicks
// 5. Return samenvatting
```

### Maak `src/app/api/cron/linkedin-token-refresh/route.ts`

Draait dagelijks:

```typescript
// 1. Verifieer CRON_SECRET
// 2. Check of het access token binnen 7 dagen verloopt
// 3. Als ja: refresh token automatisch
// 4. Bij fout: stuur admin waarschuwing via email + Telegram
```

---

## FASE 9: ADMIN DASHBOARD — LINKEDIN TAB

### Maak `src/components/admin/tabs/LinkedInTab.tsx`

Nieuwe tab in het admin dashboard.

**Layout:**

```
┌────────────────────────────────────────────────────┐
│ LinkedIn                                     [🔗 Verbonden met TopTalent]  │
├──────┬──────┬─────────┬──────────┬─────────────────┤
│ Wachtrij │ Gepland │ Gepubliceerd │ Analytics │ Templates │ Instellingen │
├──────────────────────────────────────────────────────┤
```

**Subtab 1: Wachtrij (Concept posts)**
- Lijst van concept posts wachtend op review
- Per post:
  - Preview van de tekst (truncated)
  - Bron badge (AI / Blog / Handmatig)
  - Tags
  - Aangemaakt op
  - Acties: Bewerken | Goedkeuren | Verwijderen
- "Genereer Posts" knop → modal met:
  - Template selectie dropdown
  - Categorie keuze
  - Aantal (1-5)
  - "Genereer" knop
- "Nieuwe Post" knop → tekst editor voor handmatige post

**Subtab 2: Gepland**
- Kalender/tijdlijn weergave van geplande posts
- Drag & drop om tijdstip te wijzigen
- Per post: preview + geplande datum/tijd + annuleer knop

**Subtab 3: Gepubliceerd**
- Lijst van gepubliceerde posts
- Per post: tekst preview, gepubliceerd op, link naar LinkedIn
- Mini analytics: impressies, likes, comments inline

**Subtab 4: Analytics**
- Overzichtsgrafiek (Recharts — al geïnstalleerd):
  - Impressies over tijd (lijn grafiek)
  - Engagement rate per post (bar chart)
  - Top performing posts tabel
- Periode selectie: Laatste 7 dagen / 30 dagen / 90 dagen
- KPI cards: Totaal impressies, Gemiddeld engagement, Beste post

**Subtab 5: Templates**
- Lijst van templates per categorie
- Inline editor voor prompt instructie en voorbeeld tekst
- Activeer/deactiveer toggle
- Preview: "Test Genereer" knop die een voorbeeld post maakt

**Subtab 6: Instellingen**
- LinkedIn connectie status (verbonden/niet verbonden)
- "Verbind met LinkedIn" knop (start OAuth flow)
- "Verbreek verbinding" knop
- Token verloop datum
- Default post tijden (bijv. "Post altijd om 09:00 en 12:00")

**Post Editor Modal:**
Wanneer admin een post bewerkt of een nieuwe maakt:
```
┌─────────────────────────────────────────────┐
│ LinkedIn Post Bewerken                  [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Tekst:                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ [Textarea met character counter]        │ │
│ │ Max 3000 tekens                         │ │
│ └─────────────────────────────────────────┘ │
│ 247 / 3000 tekens                           │
│                                             │
│ Link (optioneel):                           │
│ [https://toptalent.nl/blog/...]             │
│                                             │
│ Media (optioneel):                          │
│ [Upload afbeelding]                         │
│                                             │
│ Tags: [vacature] [horeca] [+]               │
│                                             │
│ Planning:                                   │
│ ○ Concept opslaan                           │
│ ○ Direct publiceren                         │
│ ○ Inplannen op: [datum] [tijd]              │
│                                             │
│ ── PREVIEW ──────────────────────────────── │
│ ┌─────────────────────────────────────────┐ │
│ │ [TopTalent logo] TopTalent · 1u        │ │
│ │                                         │ │
│ │ [Gerenderde post tekst met             │ │
│ │  emoji's en formatting]                │ │
│ │                                         │ │
│ │ 👍 Vind ik leuk  💬 Reageren  ↗ Delen  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Annuleren]  [Opslaan]  [Goedkeuren & Plan] │
└─────────────────────────────────────────────┘
```

De preview moet eruitzien als een echte LinkedIn post (gesimuleerde UI).

---

## FASE 10: AUTO-GENERATIE VANUIT BLOG

### Update het bestaande content systeem

Wanneer een blog post gepubliceerd wordt (in ContentTab of via editorial workflow):

1. Voeg een optie toe "Ook delen op LinkedIn?" checkbox
2. Als aangevinkt: roep `convertBlogToLinkedIn()` aan
3. Maak automatisch een concept LinkedIn post aan
4. Admin krijgt notificatie dat er een nieuwe LinkedIn post klaarstaat

Bewerk hiervoor:
- `src/app/api/admin/content/route.ts` — bij action "publish", optioneel LinkedIn post genereren
- `src/app/api/admin/news/drafts/route.ts` — bij action "publish_now", optioneel LinkedIn post genereren

---

## FASE 11: EMAIL NOTIFICATIES

### Voeg toe aan `src/lib/email-templates.ts`:

**1. `buildLinkedInPostKlaarHtml(data)`**
- Onderwerp: "LinkedIn post klaar voor review"
- Body: Preview van de gegenereerde post + link naar admin dashboard

**2. `buildLinkedInPostGepubliceerdHtml(data)`**
- Onderwerp: "LinkedIn post gepubliceerd!"
- Body: Link naar de live post

**3. `buildLinkedInTokenVerlooptHtml(data)`**
- Onderwerp: "⚠️ LinkedIn connectie verloopt binnenkort"
- Body: Instructies om token te vernieuwen

---

## FASE 12: ZOD VALIDATIE

Voeg toe aan `src/lib/validations-admin.ts`:

Schemas voor:
- LinkedIn post create/update
- LinkedIn post schedule
- LinkedIn template CRUD
- LinkedIn OAuth callback params

---

## FASE 13: BUILD & RAPPORT

1. Run `npm run build` — moet zonder errors
2. Run `npx tsc --noEmit`
3. Run `npm run lint`

Maak rapport `LINKEDIN_INTEGRATIE_REPORT.md` met:
- Alle nieuwe bestanden
- Alle gewijzigde bestanden
- Setup instructies (LinkedIn Developer App + env vars)
- Database migratie instructies
- Cron job configuratie (welke URLs, welke intervallen)
- Bekende beperkingen

---

## WERKWIJZE

1. Fase 1: Setup docs
2. Fase 2-3: Database + types
3. Fase 4-5: LinkedIn client + AI generator
4. Run `npm run build`
5. Fase 6-7: OAuth routes + post API routes
6. Run `npm run build`
7. Fase 8: Cron jobs
8. Fase 9: Admin UI (meeste werk)
9. Run `npm run build`
10. Fase 10-12: Integraties + email + validatie
11. Fase 13: Final build + rapport

Begin NU en werk alles af zonder te stoppen.
```
