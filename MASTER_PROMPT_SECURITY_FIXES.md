# Master Prompt — Security Fixes Fase 2

> Kopieer de prompt hieronder en plak in je terminal met `claude --dangerously-skip-permissions`

---

```
Je bent een senior security engineer. Je gaat de OVERGEBLEVEN security issues uit de eerste audit fixen in het TopTalent Jobs platform (Next.js 16, React 19, TypeScript 5, Supabase, Tailwind CSS 4).

BELANGRIJK:
- Fix ALLEEN wat hieronder beschreven staat
- Breek GEEN bestaande functionaliteit
- Run `npm run build` na elke grote wijziging om te verifiëren dat niets kapot is
- Als een fix de build breekt, REVERT onmiddellijk

---

## DEEL 1: ZOD VALIDATIE VOOR ALLE ADMIN ROUTES (17 routes)

Het project gebruikt al Zod (v4.3.6) en heeft bestaande schemas in `src/lib/validations.ts`. De admin login route (`src/app/api/admin/login/route.ts`) is het voorbeeld van hoe het correct gedaan wordt. Volg dat patroon.

### Stap 1: Maak een nieuw bestand `src/lib/validations-admin.ts`

Maak Zod schemas voor ELKE admin route hieronder. Gebruik z.object() met exacte velden. Gebruik z.string(), z.number(), z.boolean(), z.array(), z.enum(), z.optional() waar nodig. Kijk naar de bestaande code om te bepalen welke velden verplicht of optioneel zijn.

### Stap 2: Voeg validatie toe aan elke route

Voor elke route hieronder:
1. Importeer het juiste schema uit `@/lib/validations-admin`
2. Valideer de request body met `schema.safeParse(body)`
3. Return 400 met foutmelding als validatie faalt
4. Gebruik de gevalideerde data (niet de originele body) voor de rest van de handler

Hier zijn ALLE routes die gefixt moeten worden met hun verwachte velden:

#### 1. `src/app/api/admin/matching/route.ts` (POST)
Velden: dienst_id (string, UUID), medewerker_ids (array van strings)

#### 2. `src/app/api/admin/tickets/route.ts` (POST)
Velden: action (enum: 'create'|'update'|'delete'|'assign'), id (optioneel string), data (optioneel object met: titel, beschrijving, prioriteit, status, assigned_to)

#### 3. `src/app/api/admin/bulk-email/route.ts` (POST)
Velden: kandidaat_ids (array van strings, min 1), template (string), customSubject (optioneel string), customMessage (optioneel string)

#### 4. `src/app/api/admin/faq/route.ts` (POST)
Velden: action (enum: 'create'|'update'|'delete'|'reorder'), id (optioneel string), question (optioneel string), answer (optioneel string), category (optioneel string), subcategory (optioneel string), source (optioneel string), status (optioneel enum: 'published'|'draft'), slug (optioneel string), priority (optioneel number)

#### 5. `src/app/api/admin/acquisitie/campagnes/route.ts` (POST)
Velden: action (enum: 'create'|'update'|'delete'|'add_leads'|'remove_lead'), id (optioneel string), lead_ids (optioneel array van strings), naam (optioneel string), plus optionele campagne data velden (beschrijving, status, start_datum, eind_datum, type, kanaal)

#### 6. `src/app/api/admin/aanbiedingen/route.ts` (POST)
Velden: dienst_id (string), medewerker_ids (array van strings), notitie (optioneel string)

#### 7. `src/app/api/admin/medewerkers/route.ts` (POST)
Velden: action (enum: 'update_status'|'update'|'reset_password'|'create'), id (string voor update/status acties), data (optioneel object), wachtwoord (optioneel string, min 8), functie (optioneel string), email (optioneel string email format), status (optioneel enum: 'actief'|'inactief'|'geblokkeerd')

#### 8. `src/app/api/admin/diensten/route.ts` (POST)
Velden: action (enum: 'create'|'update'|'delete'|'duplicate'|'update_plekken'|'toggle_spoed'), id (optioneel string), dienst_id (optioneel string), data (optioneel object met dienst velden), aantal_nodig (optioneel number), plekken_totaal (optioneel number), is_spoeddienst (optioneel boolean), spoeddienst_token (optioneel string)

#### 9. `src/app/api/admin/boetes/route.ts` (POST)
Velden: action (enum: 'create'|'cancel'|'mark_paid'), medewerker_id (optioneel string), dienst_id (optioneel string), boete_id (optioneel string), reden (optioneel string), bedrag (optioneel number)

#### 10. `src/app/api/admin/kandidaat-documenten/route.ts` (POST)
Dit is een FormData route (file upload). Valideer de niet-file velden: inschrijvingId (string), type (string), notitie (optioneel string). Voor de PUT handler: id (string), status (enum: 'goedgekeurd'|'afgekeurd'|'in_review')

#### 11. `src/app/api/admin/berichten/route.ts` (POST)
Velden: action (enum: 'send'|'send_bulk'|'mark_read'), naam (optioneel string), onderwerp (optioneel string), inhoud (optioneel string), categorie (optioneel string), aan_ids (optioneel array van strings), aan_id (optioneel string)

#### 12. `src/app/api/admin/content/route.ts` (POST)
Velden: action (enum: 'create'|'update'|'delete'|'publish'|'unpublish'), type (optioneel string), subtype (optioneel string), id (optioneel string), titel (optioneel string), inhoud (optioneel string), meta_description (optioneel string), keywords (optioneel array van strings), status (optioneel string)

#### 13. `src/app/api/admin/data/route.ts` (POST)
Velden: action (enum: 'create'|'update'|'delete'|'bulk_delete'), table (string - maar valideer tegen een whitelist van toegestane tabellen), id (optioneel string), ids (optioneel array van strings), data (optioneel object)

#### 14. `src/app/api/admin/wachtwoord-reset/update/route.ts` (POST)
Velden: access_token (string, min 1), password (string, min 8, max 128)

#### 15. `src/app/api/admin/kandidaat-workflow/route.ts` (POST)
Velden: type (enum: 'contact'|'note'|'task'|'task_complete'), inschrijvingId (string), contactType (optioneel string), summary (optioneel string), title (optioneel string), note (optioneel string), dueAt (optioneel string datetime), taskId (optioneel string), completed (optioneel boolean)

#### 16. `src/app/api/admin/verify/route.ts` (POST)
Velden: Dit is een Supabase auth verificatie route. Check of het session object aanwezig is met access_token.

#### 17. `src/app/api/admin/reviews/route.ts` (POST als die bestaat)
Check of deze route POST accepteert en voeg validatie toe indien nodig.

### Stap 3: Voeg `formatZodErrors` helper toe als die nog niet bestaat
Er bestaat al een `formatZodErrors` functie in `src/lib/validations.ts`. Hergebruik deze.

---

## DEEL 2: WHATSAPP WEBHOOK SIGNATURE VERIFICATIE

### Bestand: `src/app/api/webhooks/whatsapp/route.ts`

Voeg HMAC-SHA256 signature verificatie toe aan de POST handler:

1. Lees de `X-Hub-Signature-256` header uit het request
2. Bereken de HMAC-SHA256 van de raw request body met het `WHATSAPP_APP_SECRET` environment variable
3. Vergelijk de berekende signature met de ontvangen signature (timing-safe comparison)
4. Return 401 als de signature niet klopt
5. Voeg het `WHATSAPP_APP_SECRET` toe aan de environment variable lijst (voeg een comment toe in de code)

Implementatie:
```typescript
import { createHmac, timingSafeEqual } from 'crypto';

// In de POST handler, VOOR het parsen van de body:
const rawBody = await request.text();
const signature = request.headers.get('x-hub-signature-256');

if (!signature) {
  return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
}

const appSecret = process.env.WHATSAPP_APP_SECRET;
if (!appSecret) {
  console.error('[WHATSAPP] WHATSAPP_APP_SECRET not configured');
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
}

const expectedSignature = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');

const sigBuffer = Buffer.from(signature);
const expectedBuffer = Buffer.from(expectedSignature);

if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
  console.warn('[WHATSAPP] Invalid webhook signature');
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}

// Parse the verified body
const body = JSON.parse(rawBody);
```

BELANGRIJK: Omdat je nu `request.text()` gebruikt in plaats van `request.json()`, moet je de body handmatig parsen met `JSON.parse()`.

---

## DEEL 3: KLANT LOGIN MIGRATIE NAAR REDIS RATE LIMITER

### Bestand: `src/app/api/klant/login/route.ts`

1. Vervang de import:
   - VAN: `import { checkRateLimit } from '@/lib/rate-limit'`
   - NAAR: `import { checkRedisRateLimit, loginRateLimit } from '@/lib/rate-limit-redis'`

2. Vervang de rate limit check:
   - VAN: `checkRateLimit(ip, 5, 15 * 60 * 1000)` (of vergelijkbaar)
   - NAAR: `await checkRedisRateLimit(ip, loginRateLimit)`

3. Update de error response om de Redis rate limit response format te gebruiken (check hoe andere login routes dit doen, bijv. `src/app/api/admin/login/route.ts`)

Doe hetzelfde voor:
- `src/app/api/klant/register/route.ts` (als die in-memory rate limiting gebruikt)
- `src/app/api/calculator/lead/route.ts` (als die in-memory rate limiting gebruikt)

---

## DEEL 4: SELECT('*') VERVANGEN DOOR EXPLICIETE KOLOMMEN

Vervang `.select('*')` door expliciete kolom selectie in de volgende bestanden. Bekijk per query welke kolommen daadwerkelijk GEBRUIKT worden in de code erna, en selecteer ALLEEN die kolommen.

WEES VOORZICHTIG: als een query data retourneert die door de frontend gebruikt wordt, moet je ALLE velden behouden die de frontend verwacht. Check de TypeScript types en de frontend componenten.

Bestanden (doe alleen de ADMIN routes, die zijn het belangrijkst):
1. `src/app/api/admin/faq/route.ts`
2. `src/app/api/admin/acquisitie/roi/route.ts`
3. `src/app/api/admin/acquisitie/campagnes/route.ts`
4. `src/app/api/admin/acquisitie/contactmomenten/route.ts`
5. `src/app/api/admin/acquisitie/competitive/route.ts`
6. `src/app/api/admin/acquisitie/segments/route.ts`
7. `src/app/api/admin/acquisitie/predictions/route.ts`
8. `src/app/api/admin/aanbiedingen/route.ts`
9. `src/app/api/admin/content/route.ts`
10. `src/app/api/admin/berichten/route.ts`
11. `src/app/api/admin/livechat/route.ts`
12. `src/app/api/admin/medewerkers/route.ts`
13. `src/app/api/admin/diensten/route.ts`
14. `src/app/api/admin/kandidaat-documenten/route.ts`
15. `src/app/api/admin/boetes/route.ts`
16. `src/app/api/admin/data/route.ts`
17. `src/app/api/admin/reviews/route.ts`
18. `src/app/api/admin/kandidaat-workflow/route.ts`

Voor queries met JOINs (bijv. `.select('*, klanten(bedrijfsnaam)')`) behoud de JOIN maar specificeer de kolommen van de hoofdtabel.

---

## DEEL 5: CSP VERBETERING

### Bestand: `next.config.ts`

Verbeter de Content Security Policy:
1. Verwijder `'unsafe-inline'` uit `script-src` ALLEEN als de app geen inline scripts gebruikt
2. ALS de app inline scripts gebruikt (bijv. Google Analytics, reCAPTCHA), behoud `'unsafe-inline'` maar voeg een TODO comment toe
3. Voeg `'unsafe-eval'` NIET toe
4. Zorg dat `frame-ancestors 'none'` aanwezig is (equivalent aan X-Frame-Options: DENY)

WEES VOORZICHTIG: het verwijderen van 'unsafe-inline' kan de app breken als er inline scripts zijn. Test grondig.

---

## DEEL 6: .ENV.LOCAL SECURITY

### Controleer en documenteer:
1. Verifieer dat `.env.local` in `.gitignore` staat
2. Zoek in de git history of `.env.local` ooit gecommit is: `git log --all --full-history -- .env.local`
3. Als het ooit gecommit is, maak een bestand `ENV_KEY_ROTATION_NEEDED.md` met:
   - Lijst van ALLE keys die geroteerd moeten worden
   - Instructies per service (Supabase, Resend, OpenAI, Mollie, Google, Sentry, Upstash, Telegram)
   - Links naar de relevante dashboards waar keys geroteerd worden
4. Maak een `.env.example` als die niet bestaat (of update hem) met ALLE benodigde variabelen en placeholder waarden

---

## DEEL 7: ADMIN WACHTWOORD-RESET JWT VERIFICATIE

### Bestand: `src/app/api/admin/wachtwoord-reset/update/route.ts`

Het huidige probleem: JWT wordt handmatig gedecodeert met `Buffer.from(parts[1], 'base64url')` zonder signature verificatie.

Fix:
1. Importeer `jwtVerify` uit `jose` (al geïnstalleerd)
2. Gebruik Supabase's JWT secret (SUPABASE_JWT_SECRET env var) of verifieer via `supabaseAdmin.auth.getUser(access_token)` om de token te valideren
3. De veiligste aanpak is `supabaseAdmin.auth.getUser(access_token)` omdat dit ook checkt of de user nog actief is

Vervang de handmatige JWT decode door:
```typescript
const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token);
if (error || !user) {
  return NextResponse.json({ error: 'Ongeldige of verlopen token' }, { status: 401 });
}
```

---

## DEEL 8: BUILD VERIFICATIE & RAPPORT

Na ALLE fixes:
1. Run `npm run build` — moet ZONDER errors slagen
2. Run `npm run lint` — fix eventuele lint errors
3. Run `npx tsc --noEmit` — fix TypeScript errors

Maak een update rapport als `SECURITY_FIXES_FASE2_REPORT.md` in de project root met:
- Lijst van alle gewijzigde bestanden
- Wat er per bestand gefixt is
- Eventuele items die niet gefixt konden worden met reden
- Build status na alle fixes

## WERKWIJZE
1. Begin met Deel 1 (Zod validatie) — dit is het meeste werk
2. Na Deel 1, run `npm run build` om te verifiëren
3. Werk door Deel 2-7
4. Na elk deel, run `npm run build`
5. Eindig met Deel 8
6. Als een fix de build breekt, REVERT en documenteer waarom

Begin NU en werk alles af zonder te stoppen.
```
