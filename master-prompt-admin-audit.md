# Master Prompt — Admin Dashboard Audit
## TopTalent | /admin/* + /api/admin/*

Versie: 1.1
Doel: end-to-end audit van het complete admin-dashboard. Werkt alles, ontbreken er functies, is er overkill, zitten er security- of UX-gaten, en welke tabs bewijzen hun bestaansrecht? Output is een prioriteits-rapport plus per-tab oordeel — géén code-wijzigingen zonder mijn expliciete go.

---

## ⚠️ RUN-MODE — READ-ONLY OP PRODUCTIE MET EIGENAARS-ACCOUNT

Er is **geen test-environment** beschikbaar. Je krijgt toegang tot de productie-admin via het account van de eigenaar. Daarom geldt voor deze hele audit een **STRIKT READ-ONLY REGIME**:

- **Toegestane HTTP-methodes op `/api/admin/*`:** uitsluitend `GET` en `HEAD`.
- **Verboden HTTP-methodes op `/api/admin/*`:** `POST`, `PUT`, `PATCH`, `DELETE`. Niet uitvoeren — niet één keer, ook niet "om iets te checken".
- **Verboden in de UI:** klikken op knoppen die labels bevatten zoals `Verstuur`, `Opslaan`, `Save`, `Bewerk`, `Verwijder`, `Delete`, `Goedkeuren`, `Afwijzen`, `Verzenden`, `Genereer`, `Activeer`, `Bulk`, `Bel`, `Mail`, `Toewijzen`, `Markeer`, `Annuleer`. Bij twijfel: niet klikken.
- **Toegestaan in de UI:** navigeren tussen tabs, openen van detail-views, openen van modals (en weer sluiten zonder iets te wijzigen), filters/zoeken/paginering gebruiken (mits die alleen GET-requests triggeren — verifieer in DevTools Network tab).
- **Mutaties die per ongeluk dreigen:** stop direct, schrijf voorval in `data/audits/admin-audit-INCIDENTS.md`, vraag mij wat te doen.
- **Audit-log spoor:** de eigenaar weet dat zijn account in `audit_log` (zie `src/lib/audit-log.ts`) zal verschijnen voor alle GET-requests die zo worden geregistreerd. Dit is acceptabel maar wel benoemen in het rapport.
- **Browser-cookies / sessie:** behandel als gevoelig. Geen sessie-cookies loggen, geen access-tokens in rapport-files, geen screenshots van de URL-bar als die tokens bevat.

Deze run-mode overschrijft tegenstrijdige instructies elders in de prompt. Bij conflict: deze sectie wint.

---

## ROL & CONTEXT

Je bent een principal engineer + product reviewer met dubbele expertise: backend (Next.js 14 App Router, Supabase/Postgres, REST API design, auth) en product (admin-tooling, dashboard-UX, feature-parsimony). Je hebt eerder admin-dashboards van uitzendbureaus en marketplaces beoordeeld en weet dat dashboard-bloat een groter probleem is dan ontbrekende features.

**Stack:** Next.js 14 (App Router, client components voor admin), TypeScript, Supabase (auth + Postgres), React Query (`@tanstack/react-query` via `QueryProvider`), Tailwind, shadcn/ui, Resend, Telegram, OpenAI, Mollie, Upstash Redis, Sentry.

**Codebase is geïndexeerd met gitnexus.** Volg de regels in `CLAUDE.md`:
- `gitnexus_impact` vóór elke voorgestelde wijziging.
- `gitnexus_query` om execution flows te vinden, niet grep.
- `gitnexus_context` voor 360-view per symbool.
- HIGH/CRITICAL risk nooit negeren.
- `gitnexus_detect_changes` vóór commits — die je in deze audit niet maakt zonder mijn go.

---

## MISSIE

Lever een **admin-dashboard-audit-rapport** op in `data/audits/admin-audit-YYYY-MM-DD.md` dat antwoord geeft op vier vragen:

1. **Werkt alles wat er staat?** — Per tab + per admin-API-route: status (werkend / kapot / onbekend) met bewijs.
2. **Ontbreken er dingen?** — Functies waarvan de afwezigheid duidelijk een dagelijks-werk-blocker is.
3. **Wat is overkill?** — Tabs of features die zelden gebruikt worden, dubbel werk doen, of meer onderhoudslast opleveren dan waarde.
4. **Waar zitten de security- en data-integriteitsrisico's?** — Auth-bypass paden, ontbrekende RLS-checks, leak-vectors via API, race conditions.

Lever drie deliverables (zie sectie DELIVERABLES verderop). Géén code-wijzigingen tenzij ik per bevinding groen licht geef.

---

## ABSOLUTE REGELS

- **Nooit** acties triggeren die productiedata muteren (geen e-mails verzenden, facturen aanmaken, contracten genereren, kandidaat-statussen veranderen, betalingen initiëren).
- **Nooit** bulk-mail of bulk-delete API's aanroepen — zelfs niet met "leeg" payload om "alleen te checken of 't bestaat".
- **Nooit** een write-API-call in productie doen, óók niet met testdata. Alleen GET/HEAD op `/api/admin/*`.
- Gebruik de **productie-admin-sessie van de eigenaar** zoals afgesproken — geen extra admin-accounts aanmaken of rechten escaleren.
- Bij elke click in de admin-UI: eerst in DevTools Network tab controleren dat de daaropvolgende request een GET is. Als het een POST/PUT/PATCH/DELETE wordt: niet klikken.
- `.env*`, `.vercel/`, `node_modules/`: niet aanraken.
- Geen commits, geen pushes. Eindresultaat in `data/audits/`, `scripts/audit/`, en optioneel een lokale branch `audit/admin-YYYY-MM-DD` — maar niet pushen.
- Als je productie-secrets in tracked files vindt: stop, rapporteer onder SECURITY/CRITICAL.
- Als je per ongeluk een write-actie triggert: stop direct, leg vast in `data/audits/admin-audit-INCIDENTS.md` (wat, wanneer, welke endpoint, welke DB-rij geraakt), meld dit in je chat-respons, wacht op instructies.

---

## SCOPE — WAT WORDT GEAUDIT

### Pages onder `src/app/admin/`
- `page.tsx` (login-gate + AdminDashboard loader)
- `layout.tsx`
- `error.tsx`, `loading.tsx`
- `login/`, `wachtwoord-vergeten/`, `wachtwoord-reset/`
- `leads/`, `news/`, `settings/`

### Centrale component
- `src/components/admin/AdminDashboard.tsx` (~2700 regels — flag op zichzelf, zie sectie CODE QUALITY)

### Tabs in `AdminDashboard.tsx` (~30 stuks)
overzicht, aanvragen, inschrijvingen, contact, medewerkers, diensten, uren, facturen, stats, matching, ai, acquisitie, klanten, referrals, offertes, faq, tickets, pricing, content, agenda, berichten, planning, leads, boetes, livechat, contracten, filters (dienst-filters), linkedin, platform-options, geo, calculator.

Bijbehorende component-bestanden onder `src/components/admin/*.tsx` en sub-mappen `acquisitie/`, `agenda/`, `dashboard/`, `onboarding/`, `tabs/`.

### API-routes onder `src/app/api/admin/`
40+ routes: `2fa`, `aanbiedingen`, `acquisitie`, `ai`, `berichten`, `boetes`, `bulk-email`, `content`, `contract-templates`, `contracten`, `dashboard-extended`, `data`, `dienst-filters`, `diensten`, `facturen`, `faq`, `geo`, `inschrijvingen`, `kandidaat-documenten`, `kandidaat-template-email`, `kandidaat-workflow`, `klanten`, `linkedin`, `livechat`, `login`, `logout`, `matching`, `medewerkers`, `news`, `ops`, `pricing`, `referrals`, `reviews`, `stats`, `tickets`, `uren`, `verify`, `wachtwoord-reset`, `zoeken`.

### Auth-stack
- `/api/admin/login`, `/api/admin/logout`, `/api/admin/verify`, `/api/admin/2fa`
- Supabase auth session check in `admin/page.tsx`
- `src/lib/admin-auth.ts`

---

## TESTPLAN — VIJF FASES

### Fase 1 — Statische analyse (code-only, geen runtime)

Voor elke tab + bijbehorende API-route(s):

1. **Tab → API-mapping.** Welke API-routes roept deze tab daadwerkelijk aan? (Gebruik `gitnexus_query({query: "<tabnaam>"})` en `gitnexus_context` per component.)
2. **Dood codepaad?** Bestaat het component, zit het in de routing, maar wordt het nooit getoond? (Bijv. tab niet in sidebar-config.)
3. **Verweesde API-routes.** Welke `/api/admin/*` routes worden nergens vanuit `src/components/admin/` gecalled? Kandidaten voor opruimen.
4. **Auth-check.** Heeft elke admin-API-route een serverside admin-verificatie (geen alleen-Supabase-session)? Zoek naar `verifyAdmin`, `requireAdmin`, of equivalent in `src/lib/admin-auth.ts`. Lijst routes zonder zo'n check.
5. **RLS-cross-check.** Voor elke tabel die admin-routes raken: bestaat een RLS-policy die niet-admin reads/writes blokkeert? Lijst tabellen zonder RLS of met `USING (true)` policies.
6. **N+1 patronen.** Component-bestanden die in een loop fetches doen — flag met file:line.
7. **Bundle-impact.** Welke tabs zijn echt zwaar (groot component, veel deps)? Helpt om te bepalen of dynamic import-strategie consistent is.

Output van deze fase: `data/audits/admin-static-analysis.md` met een tabel per tab + per API-route.

### Fase 2 — Per-tab functionele check (read-only click-through op productie)

Werkwijze: log in op productie met het account van de eigenaar, open DevTools (Network + Console). Voor élke tab: navigeer ernaartoe en doe **alleen de read-only acties** uit de tabel hieronder. Geen save, geen delete, geen verstuur, geen bulk-acties.

| Te beantwoorden | Hoe (read-only) |
|----------------|-----|
| Laadt de tab zonder console-errors? | Klik op de tab, kijk Console + Network. |
| Laadt de hoofdtabel/lijst data? | Verify GET-response 200 + niet-leeg in Network tab (NIET de data zelf in het rapport plakken — alleen counts en patronen). |
| Werken filters/zoeken/paginering? | Klik één van elk; eerst in Network tab controleren dat het volgende request een GET is. Als de filter-actie een POST triggert: niet uitvoeren, flag als "filter via POST" — ongebruikelijk patroon. |
| Werken row-acties (edit, status-update)? | **Niet klikken.** Inspecteer alleen of de knoppen er zijn en welk endpoint ze zouden aanroepen (kijk in `onClick` via DevTools Sources of in code). |
| Modals openen | Open een detail-modal (alleen als die met GET data laadt), kijk naar form-velden, sluit met Escape of "Annuleer" — nooit op "Opslaan". |
| Zijn empty states fatsoenlijk? | Filter op iets dat niets oplevert. |
| Zijn loading states zichtbaar? | Slow network in DevTools (Slow 3G). |
| Mobile-werking? | Resize naar 375px, check sidebar-collapse en tabel-scroll. |
| Toetsenbord-toegankelijkheid? | Tab door pagina, check focus-rings. |

Per tab: `OK / DEFECT / NIET TESTBAAR / OVERKILL` + 1-3 zin toelichting.

**Niet alle 30 tabs hoeven een diepe test te krijgen.** Stel een prioriteitsranking op basis van Fase 1 (welke tabs zijn dagelijks-bediend vs. nice-to-have) en behandel top-15 grondig, rest oppervlakkig.

**PII-bescherming in het rapport:** als je tijdens click-through productiedata ziet (kandidaat-namen, e-mails, factuurbedragen), schrijf dan **patronen en counts** op in het rapport — geen letterlijke data. Bijvoorbeeld: "5 facturen met `status = open`, oudste 47 dagen", niet "factuur #1234 voor klant Café De Beuk €450 open sinds 7 maart".

### Fase 3 — API-routes diepteduik (top 10, STATISCH + GET-only)

Selecteer de 10 meest kritieke admin-API-routes (op basis van: muteert klant- of kandidaatdata, raakt geld/facturen/contracten, bulk-acties). In read-only modus is de aanpak primair statisch — geen mutatie-requests in productie.

Voor elk:

1. **Lees route-handler volledig.**
2. **Check statisch:** auth, rate-limit, input-validatie (Zod), error-handling, idempotency, return-shape.
3. **Cross-check met DB-schema** (zijn de gebruikte kolommen er, en met juiste types?).
4. **Auth-test (GET-only):** test met `curl` of test-script in `scripts/audit/admin-api/<route>.ts` of:
   - GET zonder auth geeft 401.
   - GET met niet-admin (ingelogd als gewone user indien mogelijk) geeft 403.
   - GET met admin-auth geeft verwachte response-shape.
5. **POST/PUT/DELETE NIET uitvoeren tegen productie.** Beschrijf in plaats daarvan het verwachte contract per methode (wat zou er gebeuren, welke DB-rijen worden geraakt, welke externe calls worden getriggerd) op basis van code-inspectie. Dit wordt pas daadwerkelijk getest zodra er een test-environment is.
6. **Documenteer** in `scripts/audit/admin-api/<route>.md` met: bevindingen, voorgestelde tests-voor-later, risico-inschatting.

Te starten met deze 10 (pas aan obv Fase 1):
1. `bulk-email/`
2. `facturen/` (mutaties)
3. `contracten/` + `contract-templates/`
4. `boetes/`
5. `kandidaat-workflow/`
6. `kandidaat-documenten/`
7. `medewerkers/` (mutaties)
8. `klanten/` (mutaties)
9. `2fa/`
10. `login/` + `verify/` + `logout/`

### Fase 4 — Cross-cutting & UX-vragen

- **Auth-cohesie.** Zit alles achter dezelfde gate of zijn er verschillende verificatie-paden naast elkaar?
- **Sidebar/navigatie.** Komt `sidebar-config.ts` overeen met de tabs in `AdminDashboard.tsx`? Mismatches = dood UI.
- **Settings-page vs. inline settings.** Worden settings consistent op één plek beheerd of versnipperd?
- **Realtime updates.** `useAdminRealtime` is geladen — voor welke tabs echt nuttig en voor welke pure overhead?
- **React Query keys.** Conflicteren ze tussen tabs? Refetch-storms bij tab-switch?
- **Toast-meldingen.** Zijn success/error toasts consistent (taal, plaatsing, duur)?
- **Locale.** Is alles consistent NL? Engelse strings in UI = flag.
- **`AdminDashboard.tsx` is ~2700 regels.** Beoordeel splitsing-kandidaten. Welke logica hoort beter in een hook/util?
- **Mockup vs. realiteit.** Vergelijk `admin-dashboard-mockup.jsx` (root) met de huidige implementatie. Wat is uit de mockup niet gerealiseerd, en moet dat alsnog?

### Fase 5 — Overkill-detectie

Voor elke tab specifiek antwoord op: **"Als deze tab morgen weg is, wat breekt?"**

Indicatoren voor overkill:
- Geen schrijf-acties, alleen lezen, en data is elders ook beschikbaar.
- Tabel-met-één-knop die ook in een andere tab voorkomt.
- Feature die ooit "voor het geval dat" gebouwd is en geen actief gebruik heeft (controleer in logs of analytics als beschikbaar).
- Twee tabs die hetzelfde doen onder een andere naam.
- Form met 30+ velden waar alleen 5 daadwerkelijk gebruikt worden.

Voorgestelde categorieën per tab:
- `KEEP` — actief gebruikt, doet uniek werk
- `MERGE` — overlapt met andere tab, samenvoegen voorstellen
- `SIMPLIFY` — feature blijft, maar 50%+ kan weg
- `RETIRE` — geen aantoonbare waarde, verwijderen na review

---

## DELIVERABLES

1. **`data/audits/admin-audit-YYYY-MM-DD.md`** — hoofdrapport met:
   - Executive summary (½ pagina, 5 grootste bevindingen + go/no-go advies per categorie)
   - Per-tab tabel met status + categorie (KEEP/MERGE/SIMPLIFY/RETIRE) + reden
   - Per-API-route tabel uit Fase 3 met PASS/FAIL per check
   - Cross-cutting bevindingen
   - Top-10 te fixen problemen, gerangschikt op (impact × kans) / inspanning
   - Top-5 voorgestelde verwijderingen met motivatie
   - Voor elke voorgestelde wijziging: blast-radius via `gitnexus_impact`

2. **`data/audits/admin-static-analysis.md`** — output van Fase 1 (mapping tab→API, verweesde routes, missing auth-checks, RLS-gaps).

3. **`scripts/audit/admin-api/`** — read-only testscripts (GET/HEAD) en `.md` notities per route uit Fase 3. Geen mutatie-scripts; voor POST/PUT/DELETE alleen het beoogde contract beschreven, niet uitgevoerd.

4. **`data/audits/admin-tab-matrix.md`** — bondige matrix:
   ```
   | Tab | Werkt | Categorie | Hoofdprobleem | Aanbeveling |
   |-----|-------|-----------|---------------|-------------|
   | overzicht | OK | KEEP | - | - |
   | medewerkers | DEFECT | KEEP | filter X breekt bij empty result | fix in TabSkeleton render |
   | ...
   ```

5. **Geen PR. Geen commits.** Lokale branch `audit/admin-YYYY-MM-DD` is OK, maar niet pushen.

---

## RAPPORTAGESTIJL

- Schrijf in het Nederlands.
- Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO.
- Per bevinding: probleem (1 zin), impact (1 zin), reproduce (kort), voorgestelde fix (kort), gitnexus blast-radius.
- Per tab-oordeel: KEEP / MERGE / SIMPLIFY / RETIRE met onderbouwing.
- Geen ASCII-art, geen emojis in rapport-content (oké in section-headers).
- Wees scherp en feitelijk. "Onduidelijk" is een geldige conclusie als bewijs ontbreekt — markeer dan als `NEEDS_CLARIFICATION` met de concrete vraag voor mij.

---

## VEILIGHEIDSGRENZEN VOOR TESTEN (READ-ONLY OP PRODUCTIE)

| Actie | Toegestaan in audit |
|-------|---------------------|
| Code lezen in `src/` | JA |
| Login op productie-admin met eigenaar-account | JA, eenmalig |
| Click-through tabs in UI | JA, alleen navigatie + filters/zoeken/paginering |
| Modals openen en sluiten zonder opslaan | JA |
| Klikken op save/delete/verstuur/bulk-knoppen | NEE |
| GET-requests op `/api/admin/*` met admin-cookie | JA |
| POST/PUT/PATCH/DELETE op `/api/admin/*` | NEE — ook niet "even kort om te checken" |
| Mailen, factuur-genereren, contract-versturen | NEE |
| Bulk-email of bulk-delete | NEE — alleen statische code-analyse |
| Productie-Supabase muteren via wat-dan-ook | NEE |
| Productie-Telegram-chat alerten | NEE |
| Productie-Mollie-API aanroepen | NEE |
| OpenAI-calls die door admin-acties getriggerd worden | NEE — alleen statisch beoordelen |
| Lokale dev-server starten | JA, maar NIET met productie-`.env.local` (skip als alleen prod-env beschikbaar is) |
| `gitnexus` graph-queries | JA |
| Browser DevTools (Network, Console, Lighthouse) | JA |

---

## TOOLS & ENVIRONMENT

- **Geen test-environment beschikbaar.** Alle runtime-observaties komen van productie via het admin-account van de eigenaar — strikt read-only (zie RUN-MODE boven).
- `npm run dev` is **optioneel** en alleen zinvol als er een aparte dev-`.env.local` bestaat die naar een apart (niet-productie) Supabase-project wijst. Als alleen productie-env beschikbaar is: **geen lokale dev-server starten** — zeker geen POST/PUT/DELETE experimenten ertegenaan.
- Browser DevTools (Network, Console, Lighthouse, Performance) voor click-through-tests. Network tab is de waakhond: elk click in de admin moet als GET terugkomen.
- `gitnexus_*` MCP-tools volgens `CLAUDE.md`.
- `curl` of een klein TS-script in `scripts/audit/admin-api/` is toegestaan, **maar alleen met `-X GET` / `-I`**. Geen `-X POST`, `-X PUT`, `-X PATCH`, `-X DELETE` tegen productie.
- `npx playwright test` mag voor read-only UI-scripts die navigeren en assertions doen op GET-responses — niet voor flows die formulieren submitten.
- Sentry / Vercel-logs alleen lezen, niet wijzigen.
- Als je op enig moment denkt "ik heb een test-omgeving nodig om dit écht te testen": schrijf dat op in het rapport onder `NEEDS_TEST_ENVIRONMENT` en laat de test over aan een latere ronde waarin we een staging opzetten.

---

## AFSLUITING

Als de audit klaar is:

1. Draai `gitnexus_detect_changes({scope: "all"})` en bevestig dat alleen `data/audits/`, `scripts/audit/admin-api/` en eventueel een lokale branch zijn aangeraakt — **niets** in `src/`, geen migraties, geen configs.
2. Bevestig expliciet in je chat-respons: **"Geen write-requests uitgevoerd tegen `/api/admin/*`. Geen mutaties in productie-Supabase. Geen e-mails / Telegrams / Mollie-calls getriggerd."** Als deze zin niet waar is: meld het incident apart en uitgebreid.
3. Schrijf in je chat-respons een **one-pager**: 3 bullets onder elk van: TOP-3 BUGS, TOP-3 OVERKILL, TOP-3 ONTBREKEND. Plus 1 sectie `NEEDS_TEST_ENVIRONMENT` met 3-5 dingen die alleen in een test-omgeving écht te valideren zijn.
4. Wacht op mijn go per voorgestelde wijziging. Niets pushen, niets in `src/` wijzigen zonder akkoord.

---

## APPENDIX A — BESTANDEN OM TE LEZEN

**Pages & layout:**
- `src/app/admin/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/login/`, `src/app/admin/leads/`, `src/app/admin/news/`, `src/app/admin/settings/`
- `src/app/admin/wachtwoord-vergeten/`, `src/app/admin/wachtwoord-reset/`

**Hoofd-component (~2700 regels):**
- `src/components/admin/AdminDashboard.tsx`

**Tab-componenten (selectie — alle in `src/components/admin/`):**
- `MedewerkersTab.tsx`, `DienstenTab.tsx`, `UrenTab.tsx`, `FacturenTab.tsx`, `StatsTab.tsx`
- `MatchingTab.tsx`, `AITab.tsx`, `AcquisitieTab.tsx`, `KlantenTab.tsx`, `ReferralsTab.tsx`
- `OffertesTab.tsx`, `FAQTab.tsx`, `TicketsTab.tsx`, `PricingTab.tsx`, `ContentTab.tsx`
- `AgendaTab.tsx`, `BerichtenTab.tsx`, `PlanningTab.tsx`, `LeadsTab.tsx`, `BoetesTab.tsx`
- `LiveChatTab.tsx`, `ContractenTab.tsx`, `LinkedInTab.tsx`, `PlatformOptionsTab.tsx`, `GeoTab.tsx`
- `tabs/DienstFiltersTab.tsx`
- Sub-mappen: `acquisitie/`, `agenda/`, `dashboard/`, `onboarding/`

**Panels & utilities:**
- `KandidaatWorkflowPanel.tsx`, `KandidaatDocumentenModal.tsx`
- `OnboardingAnalytics.tsx`, `PipelineHealthPanel.tsx`, `SourceManagementPanel.tsx`
- `LiveChatNotification.tsx`, `MedewerkerDetailView.tsx`
- `dashboard/DashboardOverzicht.tsx`, `dashboard/StatCard.tsx`
- `onboarding/PipelineView.tsx`

**Hooks & libs:**
- `src/hooks/queries/useAdminQueries.ts`
- `src/hooks/queries/useAdminRealtime.ts`
- `src/lib/admin-auth.ts`
- `src/lib/navigation/sidebar-config.ts`, `sidebar-types.ts`
- `src/lib/audit-log.ts`

**API-routes (40+):**
Alle directories onder `src/app/api/admin/`:
`2fa, aanbiedingen, acquisitie, ai, berichten, boetes, bulk-email, content, contract-templates, contracten, dashboard-extended, data, dienst-filters, diensten, facturen, faq, geo, inschrijvingen, kandidaat-documenten, kandidaat-template-email, kandidaat-workflow, klanten, linkedin, livechat, login, logout, matching, medewerkers, news, ops, pricing, referrals, reviews, stats, tickets, uren, verify, wachtwoord-reset, zoeken`

**Mockup voor "intent" vergelijking:**
- `admin-dashboard-mockup.jsx` (in repo-root)

**Context-rapporten (lezen, niet wijzigen):**
- `SECURITY_AUDIT_REPORT.md`
- `SECURITY_FIXES_FASE2_REPORT.md`
- `master-prompt-dashboard-ux-redesign.md`
- `master-prompt-medewerker-portaal-redesign.md`
- `TopTalent_Audit_Rapport.docx`

**Tabellen die admin-API's raken (alleen schema-lezen in audit, geen writes — ook niet "kleine"):**
- Alle tabellen in `supabase-migration-*.sql` files

---

## APPENDIX B — PRIORITEITSRANKING (suggestie, mag je herzien)

**Top-prioriteit tabs voor diepte-audit (geld + dagelijks bediend):**
1. facturen
2. contracten
3. medewerkers
4. klanten
5. uren
6. diensten
7. inschrijvingen
8. aanvragen (personeel-aanvragen)
9. matching
10. boetes

**Middel-prioriteit:**
11. offertes, 12. planning, 13. agenda, 14. ai, 15. acquisitie, 16. leads, 17. tickets, 18. berichten, 19. livechat, 20. referrals

**Laag-prioriteit (snelle scan):**
21. content, 22. faq, 23. pricing, 24. filters, 25. linkedin, 26. platform-options, 27. geo, 28. calculator, 29. news, 30. settings

---

## BEGIN

Start met:
1. `npx gitnexus status` — index fresh? Zo nee: `npx gitnexus analyze`.
2. `gitnexus_query({query: "admin dashboard"})` en `gitnexus_query({query: "admin authentication"})`.
3. Schrijf het bevestigde testplan + scope in `data/audits/admin-audit-YYYY-MM-DD.md` vóór je begint te testen.
4. Pauzeer na het testplan en vraag mij om go voor Fase 1.
