# Master Prompt — RLS & Data-Toegang Audit
## TopTalent | Supabase Row Level Security + Storage + API-access

Versie: 1.0
Doel: verifieer dat geen enkele ingelogde kandidaat, klant of anonieme bezoeker andermans data kan lezen of muteren via Supabase of via `/api/*`. Elk lek = direct AVG-incident. Deliverable is een RLS-matrix per tabel + een gedocumenteerde leak-test per rol + fix-lijst.

---

## ⚠️ RUN-MODE — STRIKT READ-ONLY IN PRODUCTIE

- Geen policies wijzigen, geen tabellen muteren, geen storage-buckets aanpassen.
- Leak-tests doe je tegen een **lokale of staging-omgeving** als die er is; anders alleen statisch (SQL-policy review + code-inspectie). Bij twijfel: NEEDS_TEST_ENVIRONMENT markeren.
- Gebruik **service-role key** uitsluitend voor read-only schema-introspectie (`pg_policies`, `information_schema`). Nooit data-writes.
- Productie-data die je leest tijdens audit: alleen counts/patronen in rapport, geen PII letterlijk citeren.

---

## ROL & CONTEXT

Je bent een principal security engineer gespecialiseerd in Postgres + Supabase RLS, met achtergrond in multi-tenant SaaS. Je kent de valkuilen: `USING (true)`-policies, ontbrekende policies op nieuwe kolommen, `SECURITY DEFINER` functies die RLS bypassen, storage-buckets zonder policies, en `SELECT`-policies die vergeten worden op `INSERT`/`UPDATE`/`DELETE`.

**Stack:** Supabase (Postgres 15+), auth via `auth.users`, applicatie-rollen via JWT claims. Frontend: Next.js 14 met `@supabase/ssr` + `@supabase/supabase-js`. Service-role key alleen server-side.

**Rollen in het systeem (verifieer tegen code):**
- `anon` — niet-ingelogde bezoeker (public site)
- `authenticated` — ingelogd, subtypes: `kandidaat`, `klant`, `admin` (via app_metadata of custom claim)
- `service_role` — backend, bypasst RLS by design

**Codebase-index:** gitnexus, volg `CLAUDE.md` regels.

---

## MISSIE

Lever op in `data/audits/rls-audit-YYYY-MM-DD.md` een antwoord op zeven vragen:

1. **Welke tabellen bestaan er en welke bevatten PII?** Inventarisatie compleet.
2. **Heeft elke tabel RLS aan staan (`ENABLE ROW LEVEL SECURITY`)?** Zo nee: CRITICAL.
3. **Heeft elke tabel policies voor alle vier de operaties (SELECT/INSERT/UPDATE/DELETE)?** Missing = open deur.
4. **Zijn de policies daadwerkelijk restrictief?** `USING (true)` of `USING (auth.role() = 'authenticated')` zonder owner-check = te breed.
5. **Kan kandidaat A de data van kandidaat B lezen?** Praktijk-test met twee accounts.
6. **Zijn Storage-buckets correct beveiligd?** Kandidaat-documenten, CV's, ID-kopieën.
7. **Zijn er API-routes die RLS omzeilen door service-role te gebruiken zonder eigen auth-check?** Grote leak-vector.

---

## ABSOLUTE REGELS

- Geen policies wijzigen, geen `ALTER TABLE`, geen `CREATE POLICY`, geen `DROP POLICY`.
- Geen `INSERT`/`UPDATE`/`DELETE` in productie — ook niet "voor de test".
- Leak-tests alleen in staging of lokaal. Als die ontbreken: statisch audit + `NEEDS_TEST_ENVIRONMENT` markering.
- Geen productie-PII letterlijk in het rapport. Gebruik geanonimiseerde voorbeelden.
- `gitnexus_impact` vóór elk fix-voorstel dat code raakt.
- Geen commits. Output in `data/audits/rls/`.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Tabel-inventarisatie

1. Query `information_schema.tables` + alle `supabase-migration-*.sql` bestanden in repo-root.
2. Bouw een lijst van **alle tabellen in schema `public`** (en eventueel `auth` als custom tabellen daar staan).
3. Classificeer elke tabel per PII-niveau:
   - **KRITIEK**: bevat BSN/ID-doc/geboortedatum/financiële data → kandidaat_documenten, inschrijvingen, medewerkers, facturen, betalingen
   - **HOOG**: namen + contactgegevens → klanten, contactmomenten, berichten
   - **MIDDEL**: bedrijfsdata → diensten, offertes, contracten
   - **LAAG**: content/config → faq, pricing, platform_options

Output: tabel `rls/tabel-inventaris.md` met kolommen `tabel | PII-niveau | # rijen (count, niet data) | eigenaars-kolom (user_id, kandidaat_id, etc.)`.

### Fase 2 — RLS-policy review (statisch)

Voor elke tabel uit Fase 1:

1. **RLS aan?** `SELECT relrowsecurity FROM pg_class WHERE relname = '<tabel>'`. Als `false` → CRITICAL.
2. **Policies aanwezig?** `SELECT * FROM pg_policies WHERE tablename = '<tabel>'`. Lijst alle policies met `cmd` (SELECT/INSERT/UPDATE/DELETE/ALL), `roles`, `qual` (USING), `with_check`.
3. **Policy-kwaliteit per policy:**
   - `USING (true)` → CRITICAL, behalve voor publieke leestabellen (bijv. faq, publieke content)
   - `USING (auth.role() = 'authenticated')` zonder owner-filter → HIGH, want elke ingelogde gebruiker ziet alles
   - `USING (auth.uid() = user_id)` → OK voor per-user tabellen
   - Ontbreekt policy voor UPDATE of DELETE terwijl SELECT wel gedefinieerd is → HIGH (standaard denied, maar check of dat echt wenselijk is)
4. **`SECURITY DEFINER` functies.** Query `pg_proc` voor functies met `prosecdef = true`. Elk stuk SECURITY DEFINER code is een RLS-bypass: documenteer wie de functie kan aanroepen (`GRANT EXECUTE`) en wat de functie doet.
5. **`GRANT` inspectie.** Welke rollen hebben wat op welke tabel? `\dp` equivalent via `information_schema.table_privileges`.

Output: `rls/policy-matrix.md` met een grote tabel waarin per tabel de policies worden opgesomd met kwaliteitsoordeel.

### Fase 3 — Praktijk-leak-test (alleen in staging/lokaal)

Als staging beschikbaar is (anders → NEEDS_TEST_ENVIRONMENT):

1. **Maak 2 test-kandidaten** (A en B) in staging. Laat elk wat data genereren: inschrijving, documenten, contactmomenten.
2. **Test met Kandidaat A's JWT:**
   - `SELECT * FROM inschrijvingen` → moet alleen A's eigen rijen teruggeven, niet B's
   - `SELECT * FROM kandidaat_documenten` → idem
   - `SELECT * FROM kandidaat_contactmomenten` → idem
   - `SELECT * FROM kandidaat_taken` → idem
   - Directe fetch naar `/api/kandidaat/<B-id>` → moet 403 of 404 geven, nooit 200 met B's data
3. **Test met anonieme sessie:**
   - Alle hierboven → 401 of lege resultaten
4. **Test met test-klant:**
   - Kan klant kandidaat-persoonsgegevens zien? Zou NEE moeten zijn tenzij gematcht + gecontracteerd, en dan alleen strikt nodige velden (naam, functie, beschikbaarheid — geen geboortedatum, adres, BSN).
5. **IDOR-tests op API:**
   - `GET /api/kandidaat/:id` met andermans ID → 403/404
   - `GET /api/klant/:id` idem
   - `GET /api/facturen/:id` idem
   - Probeer ID's op te hogen (`/api/kandidaat/1`, `/2`, `/3`) — catch any 200 dat het niet zou moeten zijn
6. **Documenteer per test** in `rls/leak-tests.md`: test-scenario, verwachte uitkomst, werkelijke uitkomst, PASS/FAIL.

### Fase 4 — Storage-bucket audit

Kandidaat-documenten zijn waarschijnlijk de grootste PII-blootstelling (ID-kopie, CV, VOG).

1. Lijst alle buckets: `SELECT * FROM storage.buckets`.
2. Voor elke bucket: `public` kolom. `true` = iedereen met URL kan downloaden. Voor kandidaat-docs moet dit `false` zijn.
3. Storage-policies: `SELECT * FROM storage.objects_policies` (of equivalent in `pg_policies` voor schema `storage`). Checken per operatie.
4. **Signed URL levensduur.** Zoek in code waar `createSignedUrl` wordt aangeroepen — hoe lang blijft de URL geldig? Meer dan 1 uur voor gevoelige docs = HIGH.
5. **Lek-test (staging):** upload doc als kandidaat A, probeer als B via directe object-URL te downloaden. Moet 403.

Output: `rls/storage-audit.md`.

### Fase 5 — Code-level bypass audit

Elke API-route die `supabase` met `service_role` key gebruikt, bypasst RLS. Dat is **soms nodig** (admin-routes, achtergrond-jobs) maar moet expliciet zijn en gepaard gaan met **eigen** auth-check.

1. `gitnexus_query({query: "service role"})` en grep op `SUPABASE_SERVICE_ROLE_KEY` en `createClient` met service-role.
2. Voor elke hit: documenteer
   - Waar wordt de client gemaakt?
   - Welke routes gebruiken hem?
   - Is er vóór het gebruik een admin-check (`verifyAdmin`, `requireAdmin`)?
   - Valt die check om als de request van een gewone kandidaat komt?
3. Flag: routes die service-role gebruiken zonder zichtbare auth-check → CRITICAL.

Output: `rls/service-role-usage.md`.

---

## DELIVERABLES

1. `data/audits/rls-audit-YYYY-MM-DD.md` — hoofdrapport:
   - Executive summary (5 belangrijkste bevindingen met severity).
   - Risicomatrix: tabel × operatie × status (OK/SWAK/KAPOT).
   - Top-10 te fixen, op (impact × kans).
   - Per fix: voorstel-SQL (als `CREATE POLICY ...` statement) — niet uitgevoerd, alleen voorgesteld.
2. `data/audits/rls/tabel-inventaris.md`
3. `data/audits/rls/policy-matrix.md`
4. `data/audits/rls/leak-tests.md` (of `NEEDS_TEST_ENVIRONMENT.md` als staging ontbreekt)
5. `data/audits/rls/storage-audit.md`
6. `data/audits/rls/service-role-usage.md`

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/` aangeraakt.
- Expliciete zin in chat: **"Geen policies gewijzigd. Geen writes in productie. Leak-tests uitgevoerd in: {staging / lokaal / NIET UITGEVOERD — staging ontbrak}."**
- One-pager met TOP-3 RLS-CRITICALS, TOP-3 RLS-HIGH, TOP-3 RLS-MEDIUM.

---

## APPENDIX — BESTANDEN & QUERIES

**Migraties (volledig lezen, elk):**
- `supabase-migration-complete-onboarding.sql`
- `supabase-migration-inschrijvingen-checklist.sql`
- `supabase-migration-inschrijvingen-intake-fields.sql`
- `supabase-migration-inschrijvingen-onboarding.sql`
- `supabase-migration-kandidaat-email-flow.sql`
- `supabase-migration-kandidaat-workflow-tools.sql`
- Alle overige `supabase-migration-*.sql`

**Code:**
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts` (of equivalenten)
- `src/lib/admin-auth.ts`
- Alle `src/app/api/**/route.ts`

**Introspectie-queries (read-only):**
```sql
-- Tabellen + RLS-status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Policies per tabel
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename, cmd;

-- SECURITY DEFINER functies
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true;

-- Rechten per rol
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY table_name, grantee;

-- Storage buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets;
```

---

## BEGIN

1. Inventariseer tabellen + RLS-status (Fase 1 + start van Fase 2).
2. Pauzeer met eerste bevindingen en vraag mij of staging beschikbaar is.
3. Pas dan Fase 3 leak-tests uit (of markeer NEEDS_TEST_ENVIRONMENT).
