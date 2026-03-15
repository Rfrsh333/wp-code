# Security Fixes Fase 2 — Rapport

**Datum:** 2026-03-15
**Platform:** TopTalent Jobs (Next.js 16, React 19, TypeScript 5, Supabase)
**Build status:** SUCCESVOL (`npm run build` passed)

---

## Deel 1: Zod Validatie voor Admin Routes

**Nieuw bestand:** `src/lib/validations-admin.ts`

Zod schemas aangemaakt en geintegreerd in **16 admin routes**:

| Route | Schema | Type |
|-------|--------|------|
| `admin/diensten` | `dienstenPostSchema` | discriminatedUnion op `action` (8 acties) |
| `admin/medewerkers` | `medewerkersPostSchema` | discriminatedUnion op `action` (6 acties) |
| `admin/matching` | `matchingPostSchema` | object (dienst_id + medewerker_ids) |
| `admin/tickets` | `ticketsPostSchema` | discriminatedUnion op `action` (4 acties) |
| `admin/bulk-email` | `bulkEmailPostSchema` | object met template enum |
| `admin/faq` | `faqPostSchema` | discriminatedUnion op `action` (4 acties) |
| `admin/aanbiedingen` | `aanbiedingenPostSchema` | object |
| `admin/boetes` | `boetesPostSchema` | discriminatedUnion op `action` (5 acties) |
| `admin/berichten` | `berichtenPostSchema` | union (3 varianten) |
| `admin/content` | `contentPostSchema` | discriminatedUnion op `action` (4 acties) |
| `admin/data` | `dataPostSchema` | object met table whitelist enum |
| `admin/kandidaat-workflow` | `kandidaatWorkflowPostSchema` + `PatchSchema` | discriminatedUnion op `type` |
| `admin/reviews` | `reviewsPostSchema` | discriminatedUnion op `action` (5 acties) |
| `admin/kandidaat-documenten` | `kandidaatDocumentenPatchSchema` | object (PATCH only, POST = FormData) |
| `admin/acquisitie/campagnes` | `campagnesPostSchema` | union (6 varianten) |
| `admin/verify` | `verifyPostSchema` | object (session.access_token) |

**Validatie pattern per route:**
```typescript
const rawBody = await request.json();
const validation = validateAdminBody(schema, rawBody);
if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}
```

---

## Deel 2: WhatsApp Webhook Signature Verificatie

**Bestand:** `src/app/api/webhooks/whatsapp/route.ts`

**Wijzigingen:**
- HMAC-SHA256 signature verificatie toegevoegd met `X-Hub-Signature-256` header
- `request.json()` vervangen door `request.text()` + `JSON.parse()` (signature moet over raw body berekend worden)
- Timing-safe comparison via `crypto.timingSafeEqual()`
- Env variabele: `WHATSAPP_APP_SECRET`
- Fail-open in development (met console warning), fail-closed als secret geconfigureerd is maar signature niet klopt

---

## Deel 3: Redis Rate Limiting Migratie

**Van:** in-memory `checkRateLimit` uit `@/lib/rate-limit`
**Naar:** Redis `checkRedisRateLimit` uit `@/lib/rate-limit-redis`

| Route | Limiter | Limiet |
|-------|---------|--------|
| `klant/login` | `klantLoginRateLimit` | 5 per 15 min |
| `klant/register` | `klantRegisterRateLimit` | 3 per 15 min |
| `calculator/lead` | `calculatorLeadRateLimit` | 10 per uur |

**Nieuwe rate limiters** toegevoegd aan `src/lib/rate-limit-redis.ts`:
- `klantLoginRateLimit` (sliding window, 5/15m)
- `klantRegisterRateLimit` (sliding window, 3/15m)
- `calculatorLeadRateLimit` (sliding window, 10/1h)

---

## Deel 4: select('*') Vervangen

`select("*")` vervangen met expliciete kolommen in de volgende routes:

| Route | Tabel | Kolommen |
|-------|-------|----------|
| `admin/diensten` GET | `diensten` | id, klant_id, klant_naam, functie, datum, start_tijd, eind_tijd, etc. |
| `admin/diensten` spoeddienst | `spoeddienst_responses` | id, dienst_id, medewerker_id, naam, telefoon, status, created_at |
| `admin/medewerkers` GET | `medewerkers` | id, naam, voornaam, achternaam, email, telefoon, status, functie, etc. |
| `admin/berichten` templates | `bericht_templates` | id, naam, onderwerp, inhoud, categorie, created_at |
| `admin/berichten` GET | `berichten` | id, van_type, van_id, aan_type, aan_id, onderwerp, inhoud, created_at |
| `admin/aanbiedingen` GET | `dienst_aanbiedingen` | id, dienst_id, medewerker_id, status, notitie, verlopen_at, aangeboden_at |
| `admin/faq` GET | `faq_items` | id, question, answer, category, subcategory, source, status, slug, priority, created_at |
| `admin/content` GET | `content_posts` | id, type, status, titel, inhoud, meta_description, keywords, slug, etc. |
| `admin/reviews` GET | `google_reviews` | id, reviewer_naam, score, tekst, review_datum, antwoord, etc. |
| `admin/kandidaat-documenten` | `kandidaat_documenten` | id, inschrijving_id, type, bestandsnaam, bestand_pad, etc. |
| `admin/kandidaat-workflow` | `kandidaat_contactmomenten`, `kandidaat_taken` | specifieke kolommen per tabel |
| `admin/acquisitie/campagnes` GET | `acquisitie_campagnes` | id, naam, status, type, onderwerp_template, etc. |

**Bewust NIET gewijzigd:**
- `admin/data/route.ts` — Dynamische tabel selectie, `select("*")` noodzakelijk
- Diverse acquisitie sub-routes (predictions, segments, competitive, roi) — Complexe data-analyse die alle kolommen nodig heeft

---

## Deel 5: CSP Verbetering

**Status:** Geen wijziging nodig

`'unsafe-inline'` in `script-src` en `style-src` is vereist voor:
- **script-src:** Next.js inline scripts, Google Tag Manager
- **style-src:** Tailwind CSS, inline styles

Nonce-gebaseerde CSP vereist middleware-integratie die buiten scope van deze audit valt. Huidige CSP is adequaat met alle andere protecties.

---

## Deel 6: .env.local Security

**Status:** Veilig

- `.env*` staat in `.gitignore` (regel 34)
- Geen `.env.local` in git history gevonden
- Geen key rotation nodig

---

## Deel 7: Admin Wachtwoord-Reset JWT Fix

**Bestand:** `src/app/api/admin/wachtwoord-reset/update/route.ts`

**Was:** Handmatige JWT decode zonder signature verificatie
```typescript
// ONVEILIG: Token wordt niet geverifieerd, alleen gedecoded
const parts = access_token.split(".");
payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
```

**Nu:** Server-side JWT verificatie via Supabase
```typescript
// VEILIG: Supabase verifieert de JWT signature
const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token);
```

---

## Deel 8: Build Verificatie

```
npm run build — SUCCESVOL
TypeScript — Geen fouten
```

### Bonus fixes (pre-bestaande TS fouten):
- `src/hooks/useSupabaseRealtime.ts` — Supabase realtime channel type fix + readonly queryKeys

---

## Samenvatting

| Deel | Status | Impact |
|------|--------|--------|
| 1. Zod validatie | ✅ Voltooid | 16 admin routes beschermd tegen malformed input |
| 2. WhatsApp webhook | ✅ Voltooid | HMAC-SHA256 signature verificatie |
| 3. Redis rate limiting | ✅ Voltooid | 3 routes gemigreerd van in-memory naar Redis |
| 4. select('*') | ✅ Voltooid | 12+ routes met expliciete kolom selectie |
| 5. CSP | ⚠️ Ongewijzigd | unsafe-inline vereist voor Next.js + Tailwind |
| 6. .env security | ✅ Veilig | Geen issues gevonden |
| 7. JWT fix | ✅ Voltooid | Signature verificatie via supabaseAdmin.auth.getUser() |
| 8. Build | ✅ Succesvol | Geen TypeScript fouten |
