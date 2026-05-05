# Admin Dashboard Audit — TopTalent 2.0
**Datum:** 2026-04-22
**Auditor:** Claude Code (Opus 4.6)
**Status:** FASE 1-3 COMPLEET

---

## Scope

### Dashboard
- **Component:** `src/components/admin/AdminDashboard.tsx` — **2.681 regels**
- **Tabs:** 31 AdminTab values
- **Dynamic imports:** 27 lazy-loaded tab componenten (alle `ssr: false`)
- **Shell:** `AdminShell.tsx` + Sidebar + CommandPalette + MobileBottomNav
- **Data layer:** React Query (`useAdminOverzicht`) + Supabase Realtime (`useAdminRealtime`)

### API Routes
- **Admin:** 77 routes | **Medewerker:** 24 | **Klant:** 19 | **Kandidaat:** 3 | **Marketing:** 13 | **Utility/cron:** 28 | **LinkedIn:** 4
- **Totaal:** ~168 API routes

---

## FASE 1: STATISCHE ANALYSE — RESULTATEN

### Tab Matrix

| # | Tab | Component | Regels | Data Loading | useState | Error Handling | Loading UI | Prio Issues |
|---|-----|-----------|--------|-------------|----------|---------------|-----------|-------------|
| 1 | overzicht | DashboardOverzicht | 628 | React Query (useAdminOverzicht + useAdminDashboardExtended) | 2 | ✅ Goed | ✅ Skeleton | Geen |
| 2 | stats | StatsTab | ~400 | `/api/admin/stats` via fetch | 5 | ✅ try/catch + toast | ✅ Spinner | useMemo nodig |
| 3 | aanvragen | inline (AdminDashboard) | ~200 | Via overzichtData (React Query) | Gedeeld | ✅ Via parent | ✅ EmptyState | Inline type casts |
| 4 | inschrijvingen | inline + OnboardingPipelineView | ~400 | Via overzichtData + pipeline component | Gedeeld | ✅ Via parent | ✅ EmptyState + Pipeline | calculateOnboardingMetrics() niet gememoized |
| 5 | medewerkers | MedewerkersTab | ~800 | `/api/admin/medewerkers` + `/api/admin/medewerkers/[id]` | 12+ | ✅ try/catch + toast | ✅ Spinner + Empty | Groot component |
| 6 | klanten | KlantenTab | ~600 | `/api/admin/klanten` via React Query | 8 | ✅ try/catch | ✅ Spinner + Empty | useMemo nodig voor filtering |
| 7 | diensten | DienstenTab | ~650 | `/api/admin/diensten` via React Query | 10 | ✅ try/catch + toast | ✅ Spinner + Empty | - |
| 8 | filters | DienstFiltersTab | ~300 | `/api/admin/dienst-filters` | 6 | ✅ try/catch | ✅ Spinner | - |
| 9 | planning | PlanningTab | 368 | `/api/admin/diensten?week=` + `/api/admin/medewerkers` | 8 | ✅ try/catch + toast | ✅ Spinner | useMemo nodig (beschikbareMedewerkers) |
| 10 | contracten | ContractenTab | 588 | `/api/admin/contracten` + templates + medewerkers | 9 | ⚠️ GEEN try/catch | ✅ Spinner + Empty | **GEEN error handling!** |
| 11 | uren | UrenTab | ~500 | `/api/admin/uren` via React Query | 7 | ✅ try/catch + toast | ✅ Spinner | - |
| 12 | facturen | FacturenTab | ~550 | `/api/admin/facturen` via React Query | 8 | ✅ try/catch | ✅ Spinner + Empty | - |
| 13 | offertes | OffertesTab | ~500 | `/api/admin/data?table=offertes` | 7 | ✅ try/catch + toast | ✅ Spinner + Empty | - |
| 14 | boetes | BoetesTab | 310 | `/api/admin/boetes` + vervangingen | 6 | ✅ try/catch + toast | ✅ Spinner | useMemo nodig (filteredBoetes) |
| 15 | contact | inline (AdminDashboard) | ~100 | Via overzichtData (React Query) | Gedeeld | ✅ Via parent | ✅ EmptyState | Geen paginatie! |
| 16 | livechat | LiveChatTab | 416 | `/api/admin/livechat` + Supabase Realtime | 7 | ✅ try/catch + sonner toast | ✅ Spinner | **4 console.logs**, useMemo nodig |
| 17 | calculator | inline (AdminDashboard) | ~100 | Via overzichtData (React Query) | Gedeeld | ✅ Via parent | ✅ EmptyState | Geen paginatie! |
| 18 | leads | LeadsTab (wrapper) | 72 | Delegeert naar sub-componenten | 1 | Delegeert | Delegeert | Clean wrapper |
| 19 | content | ContentTab | ~400 | Dynamic sub-tabs (NewsDashboard etc.) | 2 | Delegeert | ✅ Skeleton | Clean wrapper |
| 20 | linkedin | LinkedInTab | **1.325** | 6 API routes (posts/templates/analytics/status/auth) | **14+** | ✅ 7 try/catch | ✅ Spinner + Empty | **MOET GESPLITST**, 5 console.logs |
| 21 | geo | GeoTab | ~350 | `/api/admin/geo` | 6 | ✅ try/catch | ✅ Spinner | - |
| 22 | matching | MatchingTab | ~500 | `/api/admin/matching` + diensten + medewerkers | 9 | ✅ try/catch + toast | ✅ Spinner | - |
| 23 | ai | AITab | 547 | `/api/admin/ai/lead-response` + screening | 11 | ✅ try/catch + messages | ✅ Spinner | Eigen state ipv React Query |
| 24 | acquisitie | AcquisitieTab (wrapper) | 142 | Delegeert naar 12 sub-componenten | 3 | Delegeert | ✅ Skeleton | Clean wrapper, goed gesplitst |
| 25 | referrals | ReferralsTab | ~300 | `/api/admin/referrals` | 5 | ✅ try/catch | ✅ Spinner + Empty | - |
| 26 | faq | FAQTab | ~350 | `/api/admin/faq` | 6 | ✅ try/catch | ✅ Spinner | - |
| 27 | tickets | TicketsTab | ~400 | `/api/admin/tickets` | 7 | ✅ try/catch + toast | ✅ Spinner + Empty | - |
| 28 | pricing | PricingTab | ~350 | `/api/admin/pricing` | 6 | ✅ try/catch | ✅ Spinner | - |
| 29 | agenda | AgendaTab | **673** | Zustand store + meerdere API calls (bookings/slots/schedules) | Via store | ✅ try/catch + toast | ✅ Spinner + Empty | Groot maar goed georganiseerd met store |
| 30 | berichten | BerichtenTab | 556 | `/api/admin/berichten` + medewerkers + templates | 11 | ✅ 7 try/catch + toast | ✅ Spinner + Empty | useMemo nodig (gesprekken grouping) |
| 31 | platform-options | PlatformOptionsTab | 237 | `/api/platform-options` | 6 | ⚠️ GEEN try/catch | ✅ Spinner + Empty | **GEEN error handling!** |

---

### Kritieke Bevindingen (Prioriteit: HOOG)

#### 1. AdminDashboard.tsx is een God Component (2.681 regels)
**Impact:** Onderhoudbaar, traag bij wijzigingen, moeilijk te testen
- 4 inline tabs (overzicht, aanvragen, contact, calculator) met hun complete UI
- ~20 useState hooks in het hoofdcomponent
- Alle detail modals inline gerenderd
- Type casts overal: `(selectedItem as PersoneelAanvraag).bedrijfsnaam`
- `calculateOnboardingMetrics()` wordt elke render opnieuw berekend
- `fetchData` is een no-op callback (`// React Query handles refetching automatically`)

**Aanbeveling:** Splits inline tabs naar eigen componenten. Extraheer detail modal naar `DetailModal.tsx`.

#### 2. LinkedInTab.tsx: 1.325 regels — moet gesplitst
**Impact:** Onhoudbaar, performance risico
- 14+ useState hooks
- 6 API routes
- 5 console.error statements in productie code
- Sub-tabs (wachtrij, gepland, gepubliceerd, analytics, templates, instellingen) allemaal inline
- Magic numbers: `charCount > 3000`, `charCount > 2500`

**Aanbeveling:** Split naar 6 sub-componenten per sub-tab (net als AcquisitieTab al goed doet).

#### 3. Twee tabs zonder error handling
- **ContractenTab** (588 regels): Geen try/catch, geen toast errors. API failures zijn onzichtbaar.
- **PlatformOptionsTab** (237 regels): Geen try/catch. `apiAction()` swallowed alle fouten.

**Aanbeveling:** Voeg minimaal try/catch + toast.error() toe aan alle API calls.

#### 4. Console.logs in productie code
| Bestand | Aantal | Regels |
|---------|--------|--------|
| LiveChatTab.tsx | 4 | console.log/error voor debugging |
| LinkedInTab.tsx | 5 | console.error voor API failures |
| AdminDashboard.tsx | 1 | `console.error("Auto-email trigger error:", emailError)` (lijn 529) |

**Totaal:** 10 console statements die in productie terechtkomen.

---

### Bevindingen per Categorie

#### Data Loading Patterns
| Pattern | Tabs | Beoordeling |
|---------|------|-------------|
| React Query (useAdminOverzicht) | overzicht, aanvragen, inschrijvingen, contact, calculator | ✅ Best practice — centraal, cached, real-time invalidation |
| React Query (eigen query) | diensten, uren, facturen, klanten | ✅ Goed |
| Direct fetch + useState | AI, berichten, planning, boetes, contracten, linkedin, livechat, platform-options | ⚠️ Inconsistent — geen caching, geen automatic refetch |
| Zustand store | agenda | ✅ Goed voor complex state |
| Wrapper met dynamic imports | acquisitie, leads, content | ✅ Uitstekend — clean code splitting |

**Observatie:** ~40% van de tabs gebruikt nog direct `fetch` + `useState` in plaats van React Query. Dit betekent geen automatische cache invalidation, geen refetch on focus, en geen optimistic updates.

#### State Management
- **Hoofdcomponent:** ~20 useState hooks — veel te veel voor 1 component
- **Gedeelde state:** `selectedIds`, `selectedItem`, `detailType`, `globalSearch` etc. worden gedeeld over inline tabs via parent state
- **URL sync:** Alleen `activeTab` wordt gesynchroniseerd met URL params (`?tab=`)
- **Geen URL state voor filters:** Als je naar een andere tab gaat en terugkomt, zijn filters gereset

#### Error Handling Scorecard
| Score | Tabs | Betekenis |
|-------|------|-----------|
| ✅ Uitstekend | overzicht, diensten, medewerkers, matching, tickets | try/catch + toast + fallback UI |
| ✅ Goed | aanvragen, inschrijvingen, uren, facturen, offertes, boetes, faq, pricing, referrals, planning, berichten, agenda, geo | try/catch + toast |
| ⚠️ Matig | stats, klanten, livechat, ai, linkedin | try/catch maar met console.logs of incomplete feedback |
| ❌ Slecht | contracten, platform-options | Geen error handling |

#### Performance Issues
1. **Missing useMemo** (herberekend elke render):
   - `calculateOnboardingMetrics()` in AdminDashboard
   - `filteredBoetes` in BoetesTab
   - `filteredContracten` + `stats` in ContractenTab
   - `filteredPosts` in LinkedInTab
   - `gesprekken` grouping in BerichtenTab
   - `beschikbareMedewerkers` in PlanningTab
   - `filtered` conversations in LiveChatTab

2. **Geen virtualisatie** voor lange lijsten (aanvragen, inschrijvingen, medewerkers etc.)

3. **`useAdminOverzicht` laadt 6 parallel API calls** bij elke mount:
   - personeel_aanvragen, inschrijvingen, contact_berichten, calculator_leads, ops, offertes
   - Dit is veel data voor de initiële load. Niet alle tabs hebben al deze data nodig.

#### TypeScript Quality
- **Goed:** Interfaces zijn gedefinieerd voor alle data types
- **Slecht:** Veel type casts in AdminDashboard.tsx: `(selectedItem as PersoneelAanvraag)` herhaald 20+ keer
- **Ontbrekend:** Sommige API response types zijn niet strict gedefinieerd

#### Realtime Subscriptions
`useAdminRealtime` abonneert op 11 Supabase tabellen:
- medewerkers, diensten, dienst_aanmeldingen, uren_registraties, chatbot_conversations, chatbot_messages, facturen, boetes, klanten, inschrijvingen, berichten

Dit is goed opgezet met automatische query invalidation via React Query.

---

### Architectuur Samenvatting

```
AdminDashboard.tsx (2.681 regels — GOD COMPONENT)
├── useAdminOverzicht() → 6 parallel API calls
├── useAdminRealtime() → 11 Supabase subscriptions
├── Inline tabs:
│   ├── overzicht → DashboardOverzicht (628 regels)
│   ├── aanvragen → inline tabel + detail modal
│   ├── inschrijvingen → inline tabel + pipeline toggle + detail modal
│   ├── contact → inline tabel + detail modal
│   └── calculator → inline tabel + detail modal
├── Dynamic tabs (27):
│   ├── Wrappers met sub-tabs:
│   │   ├── AcquisitieTab → 12 sub-componenten (GOED)
│   │   ├── LeadsTab → 4 sub-componenten
│   │   └── ContentTab → sub-componenten
│   ├── Grote mono-componenten:
│   │   ├── LinkedInTab (1.325 regels — SPLITS!)
│   │   ├── MedewerkersTab (~800 regels)
│   │   ├── AgendaTab (673 regels — maar goed met Zustand)
│   │   ├── DienstenTab (~650 regels)
│   │   └── KlantenTab (~600 regels)
│   └── Compacte tabs:
│       ├── LeadsTab (72 regels — wrapper)
│       ├── PlatformOptionsTab (237 regels)
│       └── BoetesTab (310 regels)
└── Detail Modal (inline, ~800 regels JSX)
```

---

### Top 10 Actiepunten (gesorteerd op impact)

| # | Actie | Impact | Effort | Tabs |
|---|-------|--------|--------|------|
| 1 | Split AdminDashboard.tsx inline tabs naar eigen componenten | 🔴 Hoog | Medium | overzicht, aanvragen, contact, calculator + detail modal |
| 2 | Split LinkedInTab.tsx in sub-componenten | 🔴 Hoog | Medium | linkedin |
| 3 | Voeg error handling toe aan ContractenTab + PlatformOptionsTab | 🔴 Hoog | Klein | contracten, platform-options |
| 4 | Verwijder console.log/error statements (10 stuks) | 🟡 Medium | Klein | livechat, linkedin, AdminDashboard |
| 5 | Voeg useMemo toe voor dure berekeningen (7 locaties) | 🟡 Medium | Klein | meerdere tabs |
| 6 | Migreer direct-fetch tabs naar React Query | 🟡 Medium | Medium | ai, berichten, planning, boetes, contracten, linkedin, livechat, platform-options |
| 7 | Voeg paginatie toe aan contact + calculator tabs | 🟡 Medium | Klein | contact, calculator |
| 8 | Vervang type casts door discriminated union of generics | 🟢 Laag | Medium | AdminDashboard detail modal |
| 9 | Voeg rate limiting toe aan AI/bulk API routes (server-side) | 🔴 Hoog | Medium | API routes |
| 10 | Overweeg virtualisatie voor lange lijsten | 🟢 Laag | Medium | aanvragen, inschrijvingen, medewerkers |

---

## Security Samenvatting (pre-Fase 3)

| Aspect | Status | Detail |
|--------|--------|--------|
| Auth coverage | ✅ 91% | 70/77 admin routes met `verifyAdmin()` |
| Unprotected routes | ⚠️ 7 | By design (login, logout, 2fa verify, password reset) |
| Rate limiting | ⚠️ Beperkt | Alleen auth-routes, NIET op AI/bulk operaties |
| 2FA | ✅ Compleet | TOTP + backup codes + bcrypt |
| Audit logging | ⚠️ Alleen writes | GET requests niet gelogd |
| Input validatie | ✅ Gedeeltelijk | Zod schemas op sommige routes |
| SQL injection | ✅ Beschermd | Table whitelist + Supabase parameterized queries |
| CORS | ✅ Geconfigureerd | Via Next.js middleware |
| Role-based access | ⚠️ Gedefinieerd maar niet afgedwongen | Rollen bestaan (owner/operations/recruiter/finance) maar routes checken alleen isAdmin, niet specifieke rollen |

---

## FASE 2: PER-TAB FUNCTIONELE CHECK — RESULTATEN

### Kritieke & Hoge Bugs

| ID | Tab | Ernst | Beschrijving |
|----|-----|-------|-------------|
| BUG-F2-001 | PlanningTab | **CRITICAL** | Medewerkers laden NOOIT. `data.medewerkers` bestaat niet — API retourneert `{ data: [...] }`. Planning board is onbruikbaar (regel 109). |
| BUG-F2-002 | BerichtenTab | **CRITICAL** | Zelfde probleem — `data.medewerkers` is altijd `undefined`. Gesprekken tonen UUIDs ipv namen, nieuw bericht kan niet verstuurd worden (regel 144). |
| BUG-F2-003 | AdminDashboard | **HIGH** | `fetchData()` is een no-op (regel 440-442), maar wordt aangeroepen na `updateInschrijvingOnboardingStatus` (529), `updateInschrijvingFields` (554), `bulkUpdateOnboardingStatus` (704), `deleteItem` (780). Data ververst NIET na write-operaties. |
| BUG-F2-004 | AdminDashboard | **HIGH** | Gedeelde `selectedIds` tussen tabs. Bij URL-navigatie worden IDs niet gereset — cross-tab deletions mogelijk (regel 372). |
| BUG-F2-005 | LinkedInTab | **HIGH** | Gedeelde `scheduleDate` state over ALLE posts (regel 161). Verkeerde post wordt ingepland. |
| BUG-F2-006 | DienstenTab | **HIGH** | Race condition in `updateAanmeldingStatus` (regel 280-284). Stale `aanmeldingen` closure na async fetch — "vol" status check werkt met oude data. |
| BUG-F2-007 | UrenTab | **HIGH** | Inconsistente reiskostentarieven: 0.21 EUR/km voor medewerker (regel 109) vs 0.23 EUR/km voor klant display (regel 274). Opgeslagen bedrag is altijd 0.21. |
| BUG-F2-008 | FacturenTab | **HIGH** | Event propagation bug: PDF/Versturen knoppen triggeren OOK `openDetail()` op de tabel-rij (regel 170-177 mist `e.stopPropagation()`). |
| BUG-F2-009 | KlantenTab | **HIGH** | ALLE API calls missen Authorization headers (regels 101, 119, 129, 267). Inconsistent met rest van dashboard. |
| BUG-F2-010 | ReferralsTab | **HIGH** | Geen Authorization headers op GET én POST calls naar `/api/admin/referrals` (regels 47, 64). |
| BUG-F2-011 | BerichtenTab | **HIGH** | Auth via cookies comment maar API vereist Bearer token. Medewerkers fetch retourneert 403 (regel 53-56). |
| BUG-F2-012 | GeoTab | **HIGH** | Gebruikt `credentials: "include"` (cookie-auth) ipv Bearer tokens. Inconsistent met alle andere tabs (regel 119-130). |
| BUG-F2-013 | StatsTab | **HIGH** | `setStats(await res.json())` zonder `res.ok` check (regel 36). Bij API error crasht component op `stats.totalen.medewerkers`. |

### Medium Bugs

| ID | Tab | Beschrijving |
|----|-----|-------------|
| BUG-F2-014 | AdminDashboard | Contact/calculator tabs hebben geen paginatie of zoekfilter (regels 1518, 1677) |
| BUG-F2-015 | AdminDashboard | Geen confirmatie-dialog bij onboarding statuswijziging die automatische emails triggert |
| BUG-F2-016 | AdminDashboard | CSV export kwetsbaar voor formula injection (=, +, -, @ niet gesanitized) |
| BUG-F2-017 | ContractenTab | Elke toetsaanslag in zoekbalk triggert direct API call — geen debounce (regel 112) |
| BUG-F2-018 | ContractenTab | Geen error feedback bij gefaalde API calls (create/verzend/delete) |
| BUG-F2-019 | PlatformOptionsTab | Delete actie zonder confirmatie-dialog (regel 76) |
| BUG-F2-020 | LinkedInTab | LinkedIn hostname validatie te permissief: `endsWith("linkedin.com")` matcht ook `evil-linkedin.com` |
| BUG-F2-021 | LiveChatTab | Bearer token gelogd naar browser console (regel 28) |
| BUG-F2-022 | MedewerkersTab | Admin scores worden niet opgeslagen als slechts 1 score > 0 is — `&&` moet `||` zijn (regel 147) |
| BUG-F2-023 | MedewerkersTab | Delete success feedback getoond zonder API response check (regel 168) |
| BUG-F2-024 | DienstenTab | `console.log` in productie lekt request payloads (regel 220) |
| BUG-F2-025 | UrenTab | Overnight shifts geven negatieve uren in `submitAdjustment` (regel 107) |
| BUG-F2-026 | FacturenTab | Geen validatie dat `periode_start`/`periode_eind` ingevuld zijn voor factuur generatie |
| BUG-F2-027 | FacturenTab | Geen confirmatie voor factuur versturen per email |
| BUG-F2-028 | KlantenTab | Optimistic update zonder rollback bij QR toggle fout (regel 263-271) |
| BUG-F2-029 | BoetesTab | Geen confirmatie voor "Betaald"/"Kwijtschelden"/"Account vrijgeven" — financiële acties |
| BUG-F2-030 | OffertesTab | `rejectOfferte` bypassed admin API en gebruikt direct Supabase client (regel 126-127) |
| BUG-F2-031 | OffertesTab | Geen error feedback bij gefaalde `generateOfferte`/`approveAndSend` |
| BUG-F2-032 | MatchingTab | `data.errors.length` zonder null-check — crasht als API geen `errors` array retourneert (regel 133) |
| BUG-F2-033 | AgendaTab | Division by zero in no-show rate berekening (regel 161 agendaUtils.ts) |
| BUG-F2-034 | AgendaTab | Modal sluit voordat async status change compleet is — errors worden verborgen |
| BUG-F2-035 | AgendaTab | Schedule time inputs vuren API call bij elke toetsaanslag (onChange ipv onBlur) |
| BUG-F2-036 | PricingTab | API responses niet gechecked op `res.ok` — errors worden genegeerd (regel 67) |
| BUG-F2-037 | GeoTab | "Alle reviewen publiceren" publiceert alleen gefilterde items, niet alle review items |
| BUG-F2-038 | GeoTab | `analyseResult` state lekt tussen content items — verkeerde analyse getoond |

### Ontbrekende Bevestigingsdialogen (UX)

De volgende destructieve/belangrijke acties missen een confirmatie-dialog:

| Tab | Actie | Impact |
|-----|-------|--------|
| AdminDashboard | Onboarding statuswijziging | Triggert automatische emails |
| ContractenTab | Contract aanmaken/verwijderen | — |
| PlatformOptionsTab | Optie verwijderen | — |
| LiveChatTab | Gesprek sluiten | Permanent |
| FacturenTab | Factuur versturen per email | Extern zichtbaar |
| BoetesTab | Betaald/Kwijtschelden markeren | Financieel |
| OffertesTab | Goedkeuren & Versturen / Afwijzen | Extern zichtbaar / Irreversibel |
| MatchingTab | Uitnodigingen versturen | Extern zichtbaar |
| AITab | Email versturen naar lead | Extern zichtbaar |
| AgendaTab | Boeking annuleren / Event type verwijderen | Cascade effect |
| GeoTab | Alle reviewen bulk publiceren | Bulk actie |
| ReferralsTab | Markeer uitbetaald | Financieel |

### Auth Pattern Inconsistenties

| Tab | Pattern | Verwacht |
|-----|---------|----------|
| KlantenTab | Geen headers | Bearer token |
| ReferralsTab | Geen headers | Bearer token |
| BerichtenTab | Cookies (`getAuthHeaders` zonder token) | Bearer token |
| GeoTab | `credentials: "include"` (cookies) | Bearer token |
| Alle andere tabs | `Bearer ${token}` header | ✅ Correct |

---

## FASE 3: API ROUTES SECURITY AUDIT — RESULTATEN

### Overzicht
- **Totaal routes:** 77 API route bestanden
- **Auth coverage:** 73/77 met `verifyAdmin()` (95%)
- **Routes zonder auth:** login, logout, 2fa/verify, wachtwoord-reset (by design)
- **Role checks:** Slechts 1 route (`/api/admin/data/` — alleen voor delete)
- **Rate limiting:** Slechts 4 routes (login, 2fa/verify, wachtwoord-reset)
- **Zod validatie:** ~20 routes met Zod schemas
- **Audit logging:** ~5 routes

### Top 10 Riskantste Routes — Gedetailleerd

#### 1. `/api/admin/data/` — Generic Data Endpoint
**Ernst: HOOG**
- Geen role check voor `insert`, `update`, `bulk_update` — elke admin kan 30+ tabellen muteren
- `data` field accepteert `z.record(z.string(), z.unknown())` — willekeurige kolommen instelbaar
- GET retourneert `select("*")` — kan gevoelige kolommen lekken
- Geen rate limiting

#### 2. `/api/admin/medewerkers/` — PII Endpoint
**Ernst: HOOG**
- Geen role check voor employee deletion of password reset
- Password reset retourneert plaintext tijdelijk wachtwoord in response
- GET selecteert `wachtwoord` kolom (wordt daarna op `undefined` gezet, maar beter is niet selecteren)
- `.passthrough()` op Zod schemas staat willekeurige extra velden toe

#### 3. `/api/admin/contracten/` — Filter Injection
**Ernst: HOOG**
- `zoekterm` query param direct geïnterpoleerd in PostgREST `.or()` filter zonder sanitisatie
- Geen role check voor contract deletion of admin signing
- Signing token retourneerd in response bij `verzend` actie
- Geen audit logging

#### 4. `/api/admin/bulk-email/` — Onbeperkt Bulk Email
**Ernst: HOOG**
- Comment zegt "max 3 requests per hour" maar **NIET geïmplementeerd** in code
- `customMessage` direct in HTML geïnjecteerd (stored XSS in emails)
- Geen role check — elke admin kan bulk emails sturen
- Geen audit logging

#### 5. `/api/admin/ai/offerte-generator/` — Dual Auth + Kosten
**Ernst: HOOG**
- Accepteert `verifyAdmin()` OF statische `CRON_SECRET` — als secret lekt, volledige toegang
- Geen rate limiting op AI endpoint — kostenamplificatie risico
- Geen input validatie (alleen `aanvraag_id` presence check)

#### 6. `/api/admin/linkedin/` — Extern Publiceren
**Ernst: HOOG**
- Geen role check — elke admin kan publiceren op bedrijfs-LinkedIn
- `generate_batch` triggert AI zonder limiet
- Geen audit logging

#### 7. `/api/admin/acquisitie/import/` — DoS Risk
**Ernst: HOOG**
- Geen limiet op aantal rijen — duizenden rijen in één request mogelijk
- N+1 query loop per rij — kan database overbelasten
- `column_mapping` zonder whitelist — willekeurige kolommen instelbaar
- Geen Zod validatie

#### 8. `/api/admin/login/` — Token Exposure
**Ernst: MEDIUM**
- Volledige Supabase session (access_token + refresh_token) in response body
- Bij failed 2FA wordt user uitgelogd — kan misbruikt worden om admin sessie te forceren

#### 9. `/api/admin/facturen/` — Financiële Data
**Ernst: MEDIUM**
- Geen role check — elke admin ziet alle factuurdata incl. klant emails
- Mutaties via `/api/admin/data/` (zwakkere validatie)

#### 10. `/api/admin/logout/` — Session Invalidatie
**Ernst: MEDIUM**
- Geen server-side Supabase session invalidatie — access token blijft geldig tot expiry

### Systemische Bevindingen

#### 1. Role-Based Access Control is AFWEZIG
Van 77 routes controleert **slechts 1 route** (data/) rollen, en alleen voor delete/delete_many.
De functie `hasRequiredAdminRole` bestaat maar wordt nauwelijks gebruikt.
**Alle 4 rollen (owner, operations, recruiter, finance) hebben identieke privileges.**

#### 2. Rate Limiting Bijna Afwezig
Slechts 4 van 77 routes hebben rate limiting (alle auth-gerelateerd).
Geen rate limiting op:
- AI endpoints (kostenamplificatie)
- Bulk operaties (email, import, delete_many)
- Data mutation endpoints

#### 3. Audit Logging Inconsistent
`logAuditEvent` wordt in ~5 routes gebruikt.
Niet aanwezig op: contracten, facturen, bulk-email, LinkedIn, AI, import, content.

#### 4. PostgREST Filter Injection
`.or()` filter met ongesanitizeerde user input in: contracten (zoekterm), acquisitie/leads (search).
Alleen `/api/admin/zoeken/` sanitiseert correct.

#### 5. Zod `.passthrough()` Risico
Medewerkers en diensten schemas gebruiken `.passthrough()` — extra velden worden doorgestuurd naar Supabase.

### Positieve Bevindingen
- `verifyAdmin()` consistent aangeroepen op alle beschermde routes
- JWT validatie via `supabase.auth.getUser()` (niet handmatige decoding)
- Admin email whitelist als extra laag
- SQL injection beschermd door Supabase client library (parameterized queries)
- `/api/admin/data/` heeft strikte tabel-whitelist
- Wachtwoord hashing met bcrypt (salt rounds 10)
- Login rate limiting met Redis + Retry-After headers
- Password reset constant-time response (lekt niet of email bestaat)

---

## GECOMBINEERDE PRIORITEITENLIJST (Fase 1 + 2 + 3)

### P0 — KRITIEK (Direct fixen)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | PlanningTab + BerichtenTab: `data.medewerkers` → `data.data` | Planning onbruikbaar, berichten tonen UUIDs | 5 min |
| 2 | AdminDashboard: `fetchData()` no-op — vervang door `queryClient.invalidateQueries()` | Data ververst niet na write-operaties | 30 min |
| 3 | ReferralsTab + KlantenTab: Auth headers ontbreken | API calls falen of zijn onbeschermd | 15 min |
| 4 | ContractenTab: PostgREST filter injection sanitiseren | Security kwetsbaarheid | 15 min |

### P1 — HOOG (Deze sprint)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 5 | Role-based access toevoegen aan top 10 routes (data, medewerkers, contracten, bulk-email, linkedin, ai) | Elke admin kan alles | 2-4 uur |
| 6 | Rate limiting op AI + bulk endpoints | Kostenamplificatie risico | 1-2 uur |
| 7 | Error handling ContractenTab + PlatformOptionsTab | Stille failures | 30 min |
| 8 | `selectedIds` reset bij URL-navigatie in AdminDashboard | Cross-tab deletions mogelijk | 15 min |
| 9 | LinkedInTab: `scheduleDate` per-post maken | Verkeerde post wordt ingepland | 30 min |
| 10 | FacturenTab: `e.stopPropagation()` op PDF/Versturen knoppen | Dubbele actie bij klik | 5 min |
| 11 | UrenTab: Reiskostentarieven consistent maken (0.21 vs 0.23) | Financiële discrepantie | 15 min |
| 12 | BerichtenTab + GeoTab: Auth pattern fixen naar Bearer token | Inconsistente auth | 30 min |
| 13 | LiveChatTab: Bearer token uit console.log verwijderen | Security info leak | 5 min |
| 14 | Bulk-email: Rate limiting implementeren (niet alleen comment) | Onbeperkt emails | 30 min |
| 15 | Bulk-email: `customMessage` HTML sanitiseren | Stored XSS in emails | 15 min |

### P2 — MEDIUM (Volgende sprint)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 16 | Console.log statements verwijderen (10+ stuks) | Info leak in productie | 15 min |
| 17 | useMemo toevoegen op 7+ locaties | Performance | 30 min |
| 18 | Bevestigingsdialogen toevoegen (12 locaties) | Onbedoelde acties | 1-2 uur |
| 19 | Audit logging uitbreiden naar alle write-routes | Compliance | 2-4 uur |
| 20 | AdminDashboard splitsen (God Component → sub-componenten) | Onderhoud | 4-8 uur |
| 21 | LinkedInTab splitsen in 6 sub-componenten | Onderhoud | 2-4 uur |
| 22 | ~40% tabs migreren van direct fetch naar React Query | Consistency, caching | 4-8 uur |
| 23 | CSV export formula injection sanitisatie | Security | 15 min |
| 24 | Zod `.passthrough()` verwijderen van medewerkers/diensten schemas | Security | 30 min |
| 25 | DienstenTab race condition in "vol" check fixen | Incorrect status | 30 min |

---

## Status
**Fase 1:** ✅ Compleet — Statische analyse
**Fase 2:** ✅ Compleet — Per-tab functionele check
**Fase 3:** ✅ Compleet — API routes security audit
**Fase 4:** Nog te doen — Cross-cutting & UX
**Fase 5:** Nog te doen — Overkill detectie
