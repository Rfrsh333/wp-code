# Master Prompt — Pipeline Audit & End-to-End Test
## TopTalent | Personeel-aanvragen (klant) + Inschrijvingen (kandidaat)

Versie: 1.0
Doel: volledige pipeline-audit van het moment dat een klant personeel aanvraagt of een werknemer zich inschrijft, tot en met alle downstream-acties (DB, e-mail, Telegram, AI-screening, auto-offerte). Bedoeld als eenmalige diepteduik door Claude Code om bugs, regressies en ontbrekende foutafhandeling te vinden — geen codewijzigingen zonder expliciete groen licht.

---

## ROL & CONTEXT

Je bent een senior backend engineer + QA-specialist met ervaring in Next.js 14 App Router, Supabase/Postgres, Resend, Upstash Redis, en integratie-pipelines met externe diensten (reCAPTCHA, Telegram, OpenAI). Je werkt aan TopTalentJobs.nl — een horeca-uitzendbureau. De codebase is geïndexeerd met **gitnexus** (zie `CLAUDE.md` in repo-root) en bevat 4286 symbolen / 9641 relaties / 300 execution flows.

**Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres + Storage), Resend, Upstash Redis, reCAPTCHA v3, OpenAI, Telegram Bot API, Mollie, Vercel.

**Je moet deze regels uit `CLAUDE.md` volgen:**
- Voor elke functie/class/method die je potentieel aanraakt: draai `gitnexus_impact({target, direction: "upstream"})` en rapporteer blast-radius.
- Gebruik `gitnexus_query({query: "concept"})` in plaats van grep om execution flows te vinden.
- Gebruik `gitnexus_context({name: "symbolName"})` voor volledige 360-view van een symbool.
- Negeer nooit HIGH/CRITICAL risk-waarschuwingen.
- Als de index stale is: draai eerst `npx gitnexus analyze`.

---

## MISSIE

Lever een **pipeline-audit-rapport** op in `data/audits/pipeline-audit-YYYY-MM-DD.md` dat voor beide pipelines (personeel-aanvragen + inschrijvingen):

1. Elke stap van input tot eindresultaat expliciet bevestigt of weerlegt op werking.
2. Alle error-paden identificeert en test.
3. Bestaande bugs, race conditions, ontbrekende foutafhandeling en security-gaps documenteert.
4. Concrete fix-voorstellen geeft per bevinding, **zonder** ze zelf door te voeren tenzij ik dat per bevinding expliciet toesta.

Je schrijft géén productie-code zonder mijn go. Wel mag je: testdata-scripts, ad-hoc test-runners in `scripts/audit/`, en logs/rapporten maken.

---

## ABSOLUTE REGELS

- **Nooit** productie-e-mails verzenden. Als de audit een testmail triggert, gebruik een testmailbox (bijv. `audit+<uuid>@toptalentjobs.nl` of een door mij aangeleverd adres) én verifieer `RESEND_API_KEY` wijst naar test-environment.
- **Nooit** productie-Telegram-kanalen alerten. Gebruik een test-chat-ID of mock de `sendTelegramAlert` functie.
- **Nooit** de productie-Supabase-DB muteren. Gebruik `is_test_candidate = TRUE` voor kandidaten en een vergelijkbare markering of `deleted_at` cleanup voor `personeel_aanvragen` (voeg eventueel een `is_test = TRUE` kolom toe via migratie **als ik groen licht geef**).
- **Nooit** een commit of push doen zonder eerst `gitnexus_detect_changes()` te draaien en de scope aan mij te tonen.
- **Nooit** `.env*`, `.vercel/`, of `node_modules/` aanraken.
- Als je productie-credentials in de repo ziet staan (buiten `.env.example`): stop met werken, meld het in het rapport onder SECURITY, ga niet door.

---

## DE TWEE PIPELINES

### Pipeline A — Personeel-aanvragen (klant vraagt personeel)

**Entry point:**
- Frontend form: `src/app/personeel-aanvragen/page.tsx`
- API route: `src/app/api/personeel-aanvragen/route.ts` (POST)

**Wat er gebeurt (zoals nu gecodeerd):**
1. Rate limit per IP via `checkRedisRateLimit` (`@/lib/rate-limit-redis`, `formRateLimit`).
2. Zod validatie via `personeelAanvraagSchema` (`@/lib/validations`).
3. reCAPTCHA verificatie (in development overgeslagen) via `verifyRecaptcha` (`@/lib/recaptcha`).
4. Verplichte velden check (`bedrijfsnaam`, `contactpersoon`, `email`, `telefoon`).
5. Admin-mail naar `info@toptalentjobs.nl` via Resend.
6. Insert in `personeel_aanvragen` met `status = 'nieuw'`, inclusief lead-tracking velden (`lead_source`, `utm_*`, `referral_code`).
7. Achtergrond (`after()`):
   - Referral-tracking update in `referrals`-tabel.
   - Telegram-alert via `sendTelegramAlert` (`@/lib/telegram`).
   - Auto-reply check tegen `admin_settings.auto_reply_enabled` → indien aan: genereer tekst met `generateAutoReply` (`@/lib/inquiry-auto-reply`), bouw HTML met `buildAutoReplyEmailHtml` (`@/lib/email-templates`), verzend via Resend, update `personeel_aanvragen.replied_at` + `reply_email_id`.
   - Auto-offerte via `getOfferteAutoMode()` (`@/lib/agents/offerte-generator`) → POST naar `/api/admin/ai/offerte-generator` met `CRON_SECRET`, optioneel daarna `/api/offerte/send`.
8. Response: `{ success: true }` (of `warning` bij DB-error na succesvolle e-mail).

### Pipeline B — Inschrijvingen (kandidaat meldt zich aan)

**Entry point:**
- Frontend form: `src/app/inschrijven/page.tsx`
- API route: `src/app/api/inschrijven/route.ts` (POST)

**Wat er gebeurt (zoals nu gecodeerd):**
1. Rate limit per IP.
2. reCAPTCHA verificatie.
3. Zod validatie op kernvelden via `inschrijvenSchema`.
4. Verplichte velden check (incl. `functies`, `talen`, ZZP-specifieke `kvkNummer`).
5. Admin-mail met formatted intake naar `info@toptalentjobs.nl` via Resend.
6. Insert in `inschrijvingen` met `onboarding_status = 'nieuw'`.
7. Referral-tracking update indien `referralCode`.
8. Bevestigingsmail naar kandidaat via `sendIntakeBevestiging` (`@/lib/candidate-onboarding`) + `logEmail` in `email_log`.
9. Auto AI-screening (als OpenAI configured):
   - `screenKandidaat` (`@/lib/agents/kandidaat-screening`) → score + samenvatting + aanbeveling.
   - Update `inschrijvingen.ai_screening_score`, `ai_screening_notes`, `ai_screening_date`.
   - Telegram-alert met samenvatting.
10. Response: `{ success: true }`.

---

## TESTPLAN — PER PIPELINE

### Stap 1 — Statische analyse (eerst, geen externe calls)

Voor elke pipeline:
- `gitnexus_query({query: "personeel aanvraag submission"})` en `gitnexus_query({query: "inschrijving intake"})` — lijst alle betrokken execution flows.
- Voor elke betrokken functie: `gitnexus_context({name})` om callers/callees te zien.
- Checklist per route:
  - [ ] Alle error-paden geven een HTTP-respons (geen onbehandelde promise rejections).
  - [ ] Alle Supabase-calls controleren `error` expliciet.
  - [ ] Alle externe calls (Resend, reCAPTCHA, Redis, Telegram, OpenAI) hebben try/catch of bewust `fire-and-forget` met logging.
  - [ ] Gevoelige data (`email`, `telefoon`, `kvk_nummer`, `geboortedatum`) wordt niet naar logs gelogd buiten bewuste debug-blokken.
  - [ ] User-input wordt gesanitized waar het in HTML-emails belandt (check `escapeHtml` gebruik in Pipeline A — ontbreekt in Pipeline B voor bijv. `motivatie`, `hoe_gekomen`. Bevestig of dit een probleem is.).
  - [ ] Rate-limit keys botsen niet tussen routes.
  - [ ] reCAPTCHA-bypass in development is niet per ongeluk ook live in productie (`process.env.NODE_ENV`).

### Stap 2 — Happy-path test (end-to-end, in veilig environment)

**Voorbereiding:**
- Verifieer dat `.env.local` naar een **test-Supabase-project** wijst, niet naar productie. Als er twijfel is: stop en vraag mij.
- Start lokaal: `npm run dev`.
- Maak een test-submit-script in `scripts/audit/submit-personeel.ts` en `scripts/audit/submit-inschrijving.ts` die realistische, maar duidelijk herkenbare testdata stuurt (`bedrijfsnaam: 'AUDIT TEST - <uuid>'`).

**Te bevestigen happy path Pipeline A:**
- [ ] POST `/api/personeel-aanvragen` met geldige data retourneert `{ success: true }`.
- [ ] Rij verschijnt in `personeel_aanvragen` met correcte velden en `status = 'nieuw'`.
- [ ] Admin-mail komt binnen (test-inbox).
- [ ] Auto-reply-mail verschijnt als `admin_settings.auto_reply_enabled = 'true'`; anders niet.
- [ ] Telegram-alert bereikt test-chat.
- [ ] Als `OFFERTE_AUTO_MODE` aan staat: offerte wordt gegenereerd; als op `send`: ook verstuurd.
- [ ] Alles in `after()` voltooit zonder unhandled rejection — check via server logs.

**Te bevestigen happy path Pipeline B:**
- [ ] POST `/api/inschrijven` met geldige data retourneert `{ success: true }`.
- [ ] Rij verschijnt in `inschrijvingen` met `onboarding_status = 'nieuw'`.
- [ ] Admin-mail + kandidaat-bevestigingsmail zichtbaar.
- [ ] Rij in `email_log` met type `bevestiging` en `status = 'sent'`.
- [ ] Als OpenAI configured: `ai_screening_score`, `ai_screening_notes`, `ai_screening_date` zijn gevuld.
- [ ] Telegram-alert over AI-screening in test-chat.

### Stap 3 — Edge cases & error-paden

**Pipeline A — Personeel-aanvragen:**

| Scenario | Verwachte reactie | Te checken |
|----------|-------------------|-----------|
| Lege body | 400 + duidelijke Zod-fout | Response body leesbaar |
| Ongeldig e-mailadres | 400 | Zod-error message |
| Rate limit overschreden (6e request binnen minuut) | 429 + `Retry-After` header | Redis key consistency |
| reCAPTCHA ontbreekt in productie | 400 "reCAPTCHA verificatie vereist" | Niet bypass'en |
| Resend API-key ontbreekt | 200 + rij niet opgeslagen? of 500? | **VERIFIEER:** huidige code returnt `{success:true}` vóór DB-insert als geen RESEND_API_KEY — is dat gewenst? |
| Supabase insert faalt | 200 met `warning` + Telegram DB-ERROR alert | Checken of warning echt in response komt |
| Telegram onbereikbaar | Moet niet de hele request breken | Fout in logs, geen 5xx |
| Auto-offerte endpoint geeft 500 | `after()` mag niet crashen | Try/catch aanwezig |
| `CRON_SECRET` niet gezet | Auto-offerte overgeslagen, geen crash | |
| Referral-code bestaat niet | Update returnt 0 rows, geen error | |
| XSS-poging in `bedrijfsnaam`, `opmerkingen` | `escapeHtml` moet triggeren | Inspecteer outgoing HTML |

**Pipeline B — Inschrijvingen:**

| Scenario | Verwachte reactie | Te checken |
|----------|-------------------|-----------|
| Lege body | 400 | Zod errors |
| ZZP zonder KVK-nummer | 400 "KVK nummer is verplicht" | |
| `functies` of `talen` leeg | 400 | |
| Geboortedatum in toekomst | Gedrag? Niet gevalideerd in huidige code — **FLAG** | |
| Leeftijd < 16 | Gedrag? Niet gevalideerd — **FLAG** | |
| `geboortedatum` in verkeerd format | Supabase-error of Zod? Onduidelijk — **FLAG** | |
| Duplicate e-mail | Huidige code staat dubbele inschrijvingen toe — **FLAG** | Beleidsvraag |
| Resend faalt voor admin-mail | 500 "Fout bij verzenden e-mail" — geen rij in DB | Correct? |
| Resend faalt voor bevestigingsmail | Insert al gelukt, e-mail-error geswallowed | Correct: don't fail registration |
| OpenAI-screening faalt | Registration slaagt, fout gelogd | |
| XSS-poging in `motivatie`, `hoe_gekomen` | Huidige code heeft **geen `escapeHtml`** op deze velden in admin-mail HTML — **FLAG ALS BUG** | |
| reCAPTCHA ontbreekt | 400 | |

### Stap 4 — Cross-cutting checks

- **Idempotency / race:** Twee gelijktijdige submits van dezelfde klant/kandidaat — ontstaan er 2 rijen? Zo ja: acceptabel of bug?
- **Observability:** Sentry wordt via `instrumentation.ts` geladen — worden errors in de `after()`-block daadwerkelijk gerapporteerd of alleen naar console?
- **GDPR / AVG:** Komt persoonlijk identificeerbare data terecht in plaatsen waar die niet zou mogen? Admin-mail is acceptabel; Sentry-payloads mogen PII-redacted zijn.
- **Rate-limit-deling:** Delen `personeel` en `inschrijven` dezelfde Redis-limit-prefix? Zou niet moeten.
- **Schema drift:** Draait er een migratie die een kolom toevoegt die de code al verwacht maar nog niet heeft? Cross-check `supabase-migration-*.sql` tegen inserts in beide routes.
- **Type-safety:** Gebruikt de code velden die in Zod-schema staan maar niet in Supabase-kolom, of andersom? Lijst afwijkingen.

### Stap 5 — Integraties

- **Resend:** Wordt `resend_email_id` opgeslagen in `email_log` voor beide flows, zodat de Resend-webhook (`src/app/api/webhooks/resend/...`) bounce/delivery-updates kan matchen?
- **Mollie-webhook:** Niet direct in deze pipelines, maar verify dat `personeel_aanvragen` → offerte → factuur → Mollie-betaling goed is losgekoppeld van deze audit-scope.
- **OpenAI:** Heeft `screenKandidaat` een timeout? Wat gebeurt bij OpenAI 5xx?
- **Telegram:** Wordt de chat-ID uit env-var gelezen? Is er een fallback? Gaat er niks naar een hard-coded chat?

---

## DELIVERABLES

1. **`data/audits/pipeline-audit-YYYY-MM-DD.md`** — hoofdrapport met per sectie:
   - Samenvatting (top-5 bevindingen met severity: CRITICAL / HIGH / MEDIUM / LOW / INFO)
   - Per pipeline: happy-path resultaat (PASS/FAIL per checkbox)
   - Per pipeline: edge-case tabel ingevuld
   - Cross-cutting bevindingen
   - Voorgestelde fixes per bevinding (code-sketch of beschrijving, géén directe edits)
   - Voor elke voorgestelde fix: blast-radius via `gitnexus_impact`, zodat ik kan beslissen of ik het wil doorvoeren.

2. **`scripts/audit/`** — ad-hoc test-runners:
   - `submit-personeel.ts` — realistische happy-path submission
   - `submit-inschrijving.ts` — idem
   - `edge-cases.ts` — loopt alle edge-case rows langs
   - Elke script logt naar `data/audits/logs/<script>-<timestamp>.log`

3. **`data/audits/gitnexus-flows.md`** — output van de relevante `gitnexus_query`-calls, zodat ik zie welke execution flows daadwerkelijk bij deze pipelines horen volgens de graph.

4. **Géén PR, géén commits**. Zet een voorstel-branch klaar (`audit/pipeline-YYYY-MM-DD`), maar push niet.

---

## TOOLS & ENVIRONMENT

- `npm run dev` voor lokale server.
- Test-Supabase project gebruiken (controleer of `.env.local` daarnaar wijst).
- Test-Telegram-chat gebruiken (aparte `TELEGRAM_CHAT_ID`).
- Optional: `OPENAI_API_KEY` op sandbox-key, anders skip AI-screening expliciet via env-var.
- Gebruik `gitnexus_cypher` voor complexe graph-queries als je een patroon moet vinden dat de standaard tools niet opleveren.

---

## RAPPORTAGESTIJL

- Schrijf in het Nederlands.
- Gebruik severity-labels consistent: CRITICAL, HIGH, MEDIUM, LOW, INFO.
- Voor elke bevinding: 1 zin probleem, 1 zin impact, 1 blok reproduce-stappen, 1 blok voorgestelde fix, 1 blok gitnexus-impact.
- Geen ASCII-art, geen emojis in de rapport-content zelf. Emojis in section-headers zijn oké.

---

## AFSLUITING

Als je klaar bent met de audit:

1. Doe `gitnexus_detect_changes({scope: "all"})` om te bevestigen dat je alleen in `data/audits/`, `scripts/audit/`, en eventueel nieuwe test-files hebt geschreven — **niets in** `src/`, `supabase-migration-*.sql`, of configuratie.
2. Geef een one-pager samenvatting in je chat-respons met top-5 bevindingen en een ranking van wat als eerste opgelost moet worden.
3. Wacht op mijn go per fix. Voer niets door zonder akkoord.

---

## APPENDIX — BESTANDEN EN TABELLEN OM TE LEZEN

**Code (lezen, niet aanraken):**
- `src/app/api/personeel-aanvragen/route.ts`
- `src/app/api/inschrijven/route.ts`
- `src/lib/validations.ts` (Zod-schemas)
- `src/lib/rate-limit-redis.ts`
- `src/lib/recaptcha.ts`
- `src/lib/supabase.ts`
- `src/lib/telegram.ts`
- `src/lib/candidate-onboarding.ts`
- `src/lib/agents/kandidaat-screening.ts`
- `src/lib/agents/offerte-generator.ts`
- `src/lib/inquiry-auto-reply.ts`
- `src/lib/email-templates.ts`
- `src/lib/sanitize.ts`
- `src/lib/openai.ts`
- `instrumentation.ts`, `instrumentation-client.ts`, `sentry.*.config.ts`

**Migraties (voor schema-cross-check):**
- `supabase-migration-complete-onboarding.sql`
- `supabase-migration-inschrijvingen-onboarding.sql`
- `supabase-migration-inschrijvingen-intake-fields.sql`
- `supabase-migration-inschrijvingen-checklist.sql`
- `supabase-migration-kandidaat-email-flow.sql`
- `supabase-migration-kandidaat-workflow-tools.sql`
- `supabase-migration-lead-tracking-SAFE.sql` en `-lead-tracking.sql`
- `supabase-migration-referrals.sql`
- `supabase-migration-email-log.sql`

**Rapporten als context (niet wijzigen):**
- `SECURITY_AUDIT_REPORT.md`
- `SECURITY_FIXES_FASE2_REPORT.md`
- `LEAD-TRACKING-GUIDE.md`
- `LEADS-SYSTEM-SETUP.md`
- `PERFORMANCE_MONITORING.md`

**Tabellen (read-only in deze audit, writes alleen op test-markers):**
- `inschrijvingen`
- `personeel_aanvragen`
- `email_log`
- `kandidaat_documenten`
- `kandidaat_contactmomenten`
- `kandidaat_taken`
- `referrals`
- `admin_settings`

---

## BEGIN

Start met:
1. `npx gitnexus status` om te checken of de index fresh is.
2. `gitnexus_query({query: "personeel aanvraag"})` en `gitnexus_query({query: "inschrijving kandidaat"})`.
3. Leg het volledige testplan vast in `data/audits/pipeline-audit-YYYY-MM-DD.md` vóór je begint te testen, zodat ik de scope kan review'en.
4. Pauzeer na het testplan-voorstel en vraag mijn go voor de happy-path tests.
