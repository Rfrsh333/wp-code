# Fase 4 — Storage Bucket Audit

**Datum:** 2026-04-22

---

## Gevonden Storage Buckets (6 totaal)

| # | Bucket | Public? | Data-gevoeligheid | Migratie |
|---|--------|---------|-------------------|----------|
| 1 | `kandidaat-documenten` | false (private) | **KRITIEK** — ID-docs, CV, KVK | `supabase-storage-kandidaat-documenten.sql` |
| 2 | `medewerker-documenten` | false (private) | **HOOG** — werknemers-documenten | `supabase-migration-portaal-redesign.sql` |
| 3 | `medewerker-photos` | true (public) | LAAG — profielfoto's | `supabase-migration-medewerker-features.sql` |
| 4 | `dienst-afbeeldingen` | true (public) | LAAG — dienst-afbeeldingen | `20260317_dienst_afbeelding.sql` |
| 5 | `editorial-images` | true (public) | LAAG — CMS hero images | `20260317_create_editorial_images_bucket.sql` |
| 6 | `contracten` | false (gepland) | **KRITIEK** — arbeidscontracten | Alleen als comment, niet aangemaakt |

---

## KRITIEKE BEVINDING: `getPublicUrl()` op private buckets

**Ernst:** KRITIEK

Code op meerdere plekken roept `getPublicUrl()` aan op private buckets. Dit genereert URLs die ofwel:
- **Niet werken** (403 error als bucket echt private is) — waardoor `file_url` in de DB nutteloos is
- **Alle documenten blootstellen** als iemand per ongeluk de bucket public heeft gemaakt in het dashboard

**Getroffen bestanden:**

| Bestand | Regel | Bucket | Gevolg |
|---------|-------|--------|--------|
| `src/app/api/kandidaat/documenten/route.ts` | 146 | kandidaat-documenten | ID-docs publiek URL opgeslagen |
| `src/lib/cv-upload.ts` | 44 | kandidaat-documenten | CV publiek URL opgeslagen |
| `src/app/api/cv-upload/route.ts` | 58 | kandidaat-documenten | CV publiek URL opgeslagen |
| `src/app/api/medewerker/documenten/route.ts` | 65 | medewerker-documenten | Werknemersdocs publiek URL opgeslagen |

**Fix (P0):** Vervang ALLE `getPublicUrl()` op private buckets door `createSignedUrl()` met korte expiry (5-15 min). Verwijder opgeslagen public URLs uit de database.

---

## Bucket-specifieke Analyse

### 1. `kandidaat-documenten` (KRITIEK)

**Gebruik:** ID-bewijs, paspoort, CV, KVK-uittreksels, werkvergunningen
**Geüpload via:**

| Endpoint | Auth | Probleem |
|----------|------|----------|
| `/api/kandidaat/documenten` | Onboarding portal token (form field) | Token niet IP-gebonden, geen device fingerprint |
| `/api/cv-upload` | **GEEN** (alleen rate limit) | Iedereen kan uploaden |
| `/api/admin/kandidaat-documenten` | Admin JWT | OK |

**Storage-level RLS:** Onbekend — geen policies gevonden in code/migraties. Moet in dashboard gecontroleerd worden.

**Risico's:**
| Risico | Ernst | Detail |
|--------|-------|--------|
| `getPublicUrl()` op private bucket | KRITIEK | File URLs in DB zijn ofwel broken of lekken data |
| `/api/cv-upload` geen auth | HOOG | Iedereen kan bestanden uploaden (rate limit = 7200/dag per IP) |
| Signed URL duur 1 uur | MEDIUM | Te lang voor identiteitsdocumenten — 5-15 min is beter |
| Geen virus scanning | MEDIUM | Malware in storage bucket |

**Aanbevelingen:**
1. **P0:** Vervang `getPublicUrl()` door `createSignedUrl(path, 300)` (5 min)
2. **P0:** Voeg reCAPTCHA toe aan `/api/cv-upload`
3. **P1:** Verkort signed URL duur van 3600s → 300-900s voor admin downloads
4. **P2:** Overweeg virus scanning

### 2. `medewerker-documenten` (HOOG)

**Gebruik:** Persoonlijke documenten van werknemers
**Geüpload via:** `/api/medewerker/documenten` — Medewerker sessie (OK)

**Storage-level RLS:** **GEEN policies gevonden.** Bucket is aangemaakt als private, maar er zijn nul `storage.objects` RLS policies voor deze bucket in de codebase.

**Risico's:**
| Risico | Ernst | Detail |
|--------|-------|--------|
| `getPublicUrl()` op private bucket | HOOG | Zelfde probleem als kandidaat-documenten |
| Geen storage RLS policies | HOOG | Geen defense-in-depth als service key lekt |

**Aanbevelingen:**
1. **P0:** Vervang `getPublicUrl()` door `createSignedUrl()`
2. **P1:** Voeg storage RLS policies toe (minimaal service-role only)

### 3. `medewerker-photos` (LAAG)

**Public:** Ja — by design voor profielfoto's.
**Geüpload via:** `/api/medewerker/profile` — Medewerker sessie (OK)
**Beoordeling:** Acceptabel — profielfoto's zijn bedoeld als publiek.

### 4. `dienst-afbeeldingen` (MEDIUM)

**Public:** Ja — dienst-listings.
**Geüpload via:** `/api/klant/dienst-afbeelding` — Klant sessie (OK)

**Probleem:** De INSERT RLS policy mist een `TO` clause:
```sql
CREATE POLICY "Service role kan dienst afbeeldingen uploaden"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dienst-afbeeldingen');
-- ⚠️ Geen 'TO service_role' — anon kan ook uploaden!
```

Daarnaast: runtime `createBucket` fallback in de route als de bucket niet bestaat — dit omzeilt migratie-policies.

**Aanbevelingen:**
1. **P1:** Fix INSERT policy: voeg `TO authenticated` of `TO service_role` toe
2. **P1:** Verwijder runtime `createBucket` fallback

### 5. `editorial-images` (LAAG)

**Public:** Ja — CMS content images.
**Beoordeling:** OK — publieke content, correct geconfigureerd.

### 6. `contracten` (NIET AANGEMAAKT)

**Status:** Alleen als comment in migratie — bucket bestaat niet.
**Aanbeveling:** Bij implementatie: private bucket + service-role only RLS + korte signed URLs.

---

## Upload Endpoints Overzicht

| Endpoint | Auth | Bucket | reCAPTCHA | Rate Limit | File Validatie |
|----------|------|--------|-----------|------------|---------------|
| `POST /api/cv-upload` | **GEEN** | kandidaat-documenten | **NEE** | Ja (5/min) | Onbekend |
| `POST /api/kandidaat/documenten` | Token (form field) | kandidaat-documenten | Nee | Nee | Onbekend |
| `POST /api/admin/kandidaat-documenten` | Admin JWT | kandidaat-documenten | N.v.t. | Nee | Onbekend |
| `POST /api/medewerker/documenten` | Medewerker sessie | medewerker-documenten | N.v.t. | Nee | Onbekend |
| `POST /api/medewerker/profile` | Medewerker sessie | medewerker-photos | N.v.t. | Nee | Onbekend |
| `POST /api/klant/dienst-afbeelding` | Klant sessie | dienst-afbeeldingen | N.v.t. | Nee | Ja (MIME + size) |

---

## Signed URL Overzicht

| Locatie in code | Bucket | Duur | Auth voor URL | Ernst |
|----------------|--------|------|---------------|-------|
| `admin/kandidaat-documenten/route.ts:46` | kandidaat-documenten | 3600s (1u) | Admin | MEDIUM — te lang voor ID-docs |
| `admin/kandidaat-documenten/download/route.ts:38` | kandidaat-documenten | 3600s (1u) | Admin | MEDIUM — te lang |
| `candidate-onboarding.ts` | kandidaat-documenten | 3600s (1u) | Server-side | MEDIUM |
| `medewerker/profile` | medewerker-photos | 3600s (1u) | Medewerker | OK — profielfoto's |

Signed URLs zijn niet herroepbaar na generatie. Bij een lek blijft de URL de volledige duur geldig.

---

## Dashboard-verificatie Checklist

Controleer handmatig in het Supabase dashboard:

- [ ] `kandidaat-documenten` bucket is NIET public
- [ ] `medewerker-documenten` bucket is NIET public
- [ ] `storage.objects` RLS is enabled
- [ ] `kandidaat-documenten` heeft storage-level policies (INSERT/SELECT beperkt tot service_role)
- [ ] `medewerker-documenten` heeft storage-level policies
- [ ] Directe URL `{SUPABASE_URL}/storage/v1/object/public/kandidaat-documenten/...` retourneert 403
- [ ] Directe URL `{SUPABASE_URL}/storage/v1/object/public/medewerker-documenten/...` retourneert 403
