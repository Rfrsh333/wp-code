# TopTalent Jobs — Directie-Auditrapport
**Datum:** 12 juli 2026
**Uitgevoerd door:** Lead-auditor (adversarieel geverifieerde multi-agent audit)
**Scope:** Volledige codebase `toptalentjobs.nl` — admin-portaal (intern beheer), medewerker-PWA "TopTalent Hub" (`/medewerker`), klant-PWA "TT Business" (`/klant`), publieke marketing/onboarding
**Vergelijkingsbasis:** vorig rapport 3 juli 2026 (28-agent audit, commit `9d2586f`)

---

## Samenvatting directie

Het technische fundament van TopTalent Jobs is degelijk: geen gecommitte secrets, service-role-sleutel server-only, restrictieve CORS, kern-securityheaders globaal actief, `strict` TypeScript en 256-bit tokens voor de meeste flows (geverifieerd schoon, `src/lib/supabase.ts:72`). Tegelijk legt deze ronde **structurele, geld- en compliance-rakende gaten** bloot die de vorige audit deels miste en deels als "gefixt" markeerde terwijl ze open of teruggevallen zijn. Na deduplicatie staan er **10 HIGH-, ~29 MEDIUM- en ~50 LOW/INFO-bevindingen** open. De ernstigste clusters zijn: **beide betaalstromen werken niet end-to-end** (Mollie-boetewebhook wijst élke oproep af; klantfacturen worden nooit op 'betaald' gezet; toeslagen worden nooit gefactureerd of uitbetaald), de **klant-PWA is bij lancering onbruikbaar** (service worker installeert nooit + `start_url` is een 404), **uitloggen in de medewerker-PWA werkt niet** (405), en er is **geen enkele afgedwongen bewaartermijn** terwijl IBAN/BSN plaintext in de database staan. Verzwarend: **de CI-pijplijn is permanent rood** en er zijn feitelijk **geen geautomatiseerde tests** voor een platform dat loon, facturen, BSN/IBAN en Mollie-betalingen verwerkt — elke regressie glipt er ongemerkt doorheen. Meerdere HIGH/MEDIUM-punten zijn **regressies of niet-opgevolgde punten** uit het 3-juli-rapport (admin-2FA-lockout, toeslagen, retentie, IBAN/BSN, CSP, migratie-consolidatie). De boodschap is dus tweeledig: de architectuur is gezond, maar de **operationele geldketen en de PWA-lancering zijn op dit moment aantoonbaar kapot** en vereisen directe actie vóór verdere groei.

---

## Risicomatrix (na deduplicatie)

### Per severity × portaal

| Portaal | HIGH | MEDIUM | LOW/INFO |
|---|---|---|---|
| Cross (raakt meerdere portalen) | 4 | 11 | ~18 |
| Medewerker (Hub) | 2 | 7 | ~12 |
| Klant (TT Business) | 2 | 4 | ~8 |
| Admin | 1 | 3 | ~9 |
| Publiek/onboarding | 1 | 4 | ~7 |
| **Totaal** | **10** | **~29** | **~54** |

### Per dimensie (HIGH+MEDIUM zwaartepunt)

| Dimensie | HIGH | MEDIUM |
|---|---|---|
| Broken Access Control / IDOR / BOLA | 1 | 3 |
| Authenticatie / sessie / OTP | 2 | 3 |
| Mollie / facturen / financieel | 1 | 8 |
| Injectie / XSS / file-upload | 0 | 3 |
| Secrets / config / headers / CSP / rate-limit | 0 | 2 |
| PWA-kwaliteit (medewerker + klant) | 3 | 2 |
| Correctheid medewerker/klant-portaal | 1 | 6 |
| AVG / NL-compliance | 2 | 3 |
| Performance / SEO / WCAG | 0 | 2 |
| Architectuur / tests / CI / observability | 1 | 3 |

*(Sommige bevindingen tellen in meerdere dimensies; het zwaartepunt is hierboven weergegeven.)*

---

## P0 — Direct handelen (alle HIGH)

### P0-1. BOLA: elke klant kan willekeurige medewerkers beoordelen en hun publieke score/badge manipuleren — **NIEUW**
- **Probleem:** De POST doet geen eigenaars-/relatiecontrole tussen `(dienst_id, medewerker_id)` en de ingelogde klant, en er is geen unieke constraint op beoordelingen.
- **Bewijs:** `src/app/api/klant/beoordelingen/route.ts:80`. Klant-registratie is open self-service (`src/app/api/klant/register/route.ts`), dus bereikbaar voor iedereen die een account aanmaakt. Medewerker-id's lekken via `checkin`, `favorieten`, `rooster`.
- **Impact:** Direct na de insert worden de **publieke** reputatievelden (`gemiddelde_score`, badge `toptalent/star/rising`, `aantal_beoordelingen`, zelfs `totaal_diensten`) herberekend uit álle beoordelingen. Een aanvaller kan de rating/badge van willekeurige uitzendkrachten kelderen of oppompen — reputatieschade en sabotage van concurrenten/onwelgevallige krachten.
- **Aanbeveling:** Verifieer vóór de insert dat er een `dienst_aanmelding` bestaat met `dienst.klant_id === klant.id` én matchende `medewerker_id`/`dienst_id` met gewerkte/afgeronde status (zoals de GET al filtert). Voeg `UNIQUE(dienst_id, medewerker_id, klant_id)` toe en herbereken de score pas ná de eigenaarscontrole.

### P0-2. Activatie-`magic_token` is óók een wachtwoordloze 7-daagse login → account takeover bij link-interceptie — **NIEUW**
- **Probleem:** De activatielink (7 dagen geldig) mint via GET direct een volledige medewerkerssessie zonder dat ooit een wachtwoord is gezet/gekend.
- **Bewijs:** `src/app/api/medewerker/verify/route.ts:16`. Token reist in de URL-query; plaintext opgeslagen (zie P1).
- **Impact:** Wie de link bemachtigt (gedeelde mailbox, Referer, proxy-logs) heeft 7 dagen toegang tot uren, loon/IBAN, documenten. Ondermijnt het 'stel eerst je wachtwoord in'-doel.
- **Aanbeveling:** Ontkoppel de flows — laat `verify` geen sessie meer minten op de activatie-token, of gebruik gescheiden kortlevende tokens per doel. Verkort expiry naar 24-48u, hash de token at rest, verstuur in POST-body i.p.v. URL.

### P0-3. Admin die 2FA inschakelt raakt permanent buitengesloten — **REGRESSIE (was M1, 3 juli — niet opgevolgd)**
- **Probleem:** De login-UI toont nooit een 2FA-codeveld en behandelt de `requires2FA`-respons verkeerd (komt als 200 binnen → client denkt dat login slaagde → geen sessie → bounce-loop naar `/admin/login`).
- **Bewijs:** `src/app/admin/login/AdminLoginClient.tsx:27` (en `:30`). Backend `/api/admin/2fa/enable` werkt volledig.
- **Impact:** De enige sterke tweede factor voor het admin-portaal is onbruikbaar/self-DoS. Herstel vereist handmatige DB-ingreep (`admin_2fa.enabled=false`). Admin blijft in praktijk beschermd door wachtwoord + e-mail-allowlist.
- **Aanbeveling:** Implementeer de 2FA-stap in `AdminLoginClient`: bij `requires2FA===true` een tweede scherm dat opnieuw post met `{email, password, twoFactorCode, isBackupCode}`. Laat de server bij ontbrekende code een niet-2xx (401) geven. Blokkeer 2FA-enable tijdelijk tot de UI live is. Voeg e2e-test toe.

### P0-4. Mollie-boetewebhook wijst élke oproep af → boetebetalingen worden nooit verwerkt — **REGRESSIE (neveneffect van de 3-juli "fix" 2.6)**
- **Probleem:** De webhook eist een `MOLLIE_WEBHOOK_SECRET` + `mollie-signature`-header. Mollie's standaard Payments-webhook tekent géén HMAC (body bevat enkel `id=tr_xxx`); het secret staat bovendien niet in `.env.example`. `verifyMollieSignature` geeft dus altijd `false` → 401 op alle webhooks.
- **Bewijs:** `src/app/api/webhooks/mollie/route.ts:24`. Geen fallback-cron polt de status; de redirect toont enkel een toast.
- **Impact:** Medewerker betaalt €50 via Mollie, krijgt 'succes'-melding, maar de boete blijft 'openstaand' en het account blijft 'gepauzeerd'. **Structureel: geen enkele boetebetaling wordt gereconcilieerd.** (Let op: het 3-juli-rapport prees de webhook-HMAC als sterk punt — die aanname klopt niet voor Mollie's Payments-webhook.)
- **Aanbeveling:** Verwijder de voor Mollie inhoudsloze handtekeningcheck; vertrouw op het bestaande veilige patroon (alleen id uit body, status server-side ophalen via `mollie.payments.get()` — gebeurt al). Voeg een reconciliatie-cron toe die openstaande boetes met `mollie_payment_id` natrekt. Verifieer end-to-end met een `test_`-betaling.

### P0-5. Uitloggen werkt niet in de medewerker-PWA: logout-route bestaat alleen als GET, UI post → 405 → sessiecookie blijft leven — **NIEUW**
- **Probleem:** In Next.js App Router geeft een POST naar een route die alleen GET exporteert een 405; de handler draait niet, `cookieStore.delete("medewerker_session")` wordt nooit uitgevoerd. De httpOnly-cookie kan client-side niet gewist worden.
- **Bewijs:** `src/app/api/medewerker/logout/route.ts:4`. Dashboard doet toch `router.push("/medewerker/login")` (logout lijkt te lukken); accountpagina checkt `res.ok` (=false) en toont 'Uitloggen mislukt'.
- **Impact:** Op gedeelde horeca-tablets 'logt' medewerker A uit maar de 7-daagse JWT (zonder revocatie, zie P1) blijft geldig; medewerker B navigeert naar `/medewerker/dashboard` en is nog volledig ingelogd als A (loon/IBAN/BSN-status/diensten, incl. muteren).
- **Aanbeveling:** Voeg `export async function POST()` toe die `medewerker_session` verwijdert (of laat één handler GET+POST doen). Bevestig end-to-end dat `Set-Cookie` met verlopen datum meekomt. Overweeg server-side sessie-invalidatie.

### P0-6. Klant-PWA "TT Business" is bij lancering onbruikbaar — service worker installeert nooit + `start_url` is een 404 — **NIEUW** *(twee root-causes, samengevoegd)*
- **Probleem A — SW installeert nooit:** `cache.addAll` is atomair; het precache-pad `/klant/` levert 404 (er is geen `src/app/klant/page.tsx`), en de install-handler heeft — anders dan `sw.js` — géén `.catch()`. De `waitUntil` rejectet → SW bereikt nooit 'activated'.
- **Probleem B — start_url 404:** Het manifest opent `/klant/?source=pwa`, een pad zonder page/redirect → de geïnstalleerde app landt direct op de Next.js not-found.
- **Bewijs:** `public/sw-business.js:6` (precache `/klant/`), `public/manifest-klant.json:6` (`start_url`).
- **Impact:** De klant-PWA heeft feitelijk **geen werkende service worker** (geen offline-fallback, geen caching, geen update-flow) én opent bij launch op een 404. `navigator.serviceWorker.ready` resolvet niet, waardoor push-subscriptions blijven hangen. Stuk voor elke gebruiker.
- **Aanbeveling:** Zet precache-entry en `start_url` op de bestaande `/klant/dashboard/`, of maak een `src/app/klant/page.tsx` die naar het dashboard redirect. Voeg `.catch()` rond `addAll` toe (zoals `sw.js`). Verifieer met build + DevTools > Application > Service Workers.

### P0-7. Toeslagen (avond/nacht/weekend/feestdag) worden berekend en opgeslagen maar nooit gefactureerd of uitbetaald — **REGRESSIE (was M9, 3 juli — niet opgevolgd)** *(drie bevindingen samengevoegd)*
- **Probleem:** In de normale (QR-)indienflow roept de medewerker-route `berekenToeslag` nooit aan; en géén enkel geld-pad (klantfactuur = uren×tarief + reiskosten; medewerkerloon = uren×(tarief-4)) gebruikt `toeslag_type`/`toeslag_percentage`. Er wordt ook nooit een `toeslag_bedrag` berekend.
- **Bewijs:** `src/app/api/medewerker/diensten/route.ts:659` (indienflow), `src/app/api/facturen/generate/route.ts:69` (factuur), `src/app/api/admin/uren/route.ts:179` (opgeslagen maar dood).
- **Impact:** Diensten met wettelijk/contractueel verschuldigde toeslag worden op het kale uurtarief gefactureerd én uitbetaald. De klant betaalt te weinig én de medewerker ontvangt te weinig; opgeslagen toeslagdata is misleidend/dood.
- **Aanbeveling:** Beslis expliciet of toeslagen gelden. Zo ja: pas toe in beide factuurpaden (klant) én in verdiensten/loon (medewerker), en bereken/bewaar een concreet `toeslag_bedrag`; roep `berekenToeslag` ook aan in de medewerker-indienflow. Zo nee: verwijder de berekening om schijnnauwkeurigheid te voorkomen.

### P0-8. Bewaartermijnen worden niet technisch afgedwongen — onbeperkte opslag van (bijzondere) PII — **REGRESSIE (was open in sectie 9, 3 juli)**
- **Probleem:** De privacyverklaring belooft concrete termijnen (sollicitatie 4 weken, kandidatenpool 2 jaar, ID-kopie 5 jaar, loon/facturen 7 jaar), maar geen code verwijdert/anonimiseert records of storage-objecten na afloop. De `bewaar_tot`-kolommen worden nooit uitgelezen.
- **Bewijs:** `supabase-migration-nl-compliance.sql:77`.
- **Impact:** Data van afgewezen kandidaten en ex-medewerkers (incl. ID-scans, CV's onder `cv/`) blijft feitelijk onbeperkt staan. Schending opslagbeperking (art. 5 lid 1 sub e AVG); de gepubliceerde termijnen zijn aantoonbaar onwaar. Bij AP-controle of datalek is de blootgestelde dataset veel groter dan toegestaan.
- **Aanbeveling:** Bouw een retentie-cron die op `bewaar_tot`/`datum_uit_dienst`/afwijzingsdatum records én storage-objecten hard verwijdert of anonimiseert per termijn. Vul `bewaar_tot` bij insert/onboarding. Log elke verwijdering in de audit-log. Test dat CV's en ID-scans meelopen.

### P0-9. IBAN, BTW-nummer en (vermoedelijk) BSN staan onversleuteld in de database — **REGRESSIE (was M19, 3 juli — niet opgevolgd)**
- **Probleem:** Bankrekeningnummers en waarschijnlijk BSN's staan zonder kolom-encryptie in Postgres; beveiliging leunt uitsluitend op app-laag-JWT + service_role.
- **Bewijs:** `src/app/api/medewerker/profile/route.ts:109`. Privacyverklaring §11 claimt 'versleuteling van gevoelige gegevens in opslag' — voor deze velden onwaar.
- **Impact:** BSN valt onder art. 46 UAVG (alleen bij wettelijke noodzaak + passende beveiliging). Een DB-/backup-lek of over-geprivilegieerde admin (geen finance-rolgate op de meeste routes, zie P1) levert direct alle IBAN's/BSN's op. Backups (`scripts/backup-storage.sh`) bevatten de plaintext.
- **Aanbeveling:** Versleutel BSN/IBAN op kolomniveau (pgcrypto of application-level envelope-encryptie met KMS), of sla BSN alleen op bij bewezen wettelijke noodzaak. Maak de privacy-claim waar of pas hem aan. Beperk lees-/schrijftoegang tot finance/owner.

### P0-10. Vrijwel geen geautomatiseerde tests + CI-pijplijn permanent rood — **REGRESSIE/uitbreiding (lint-breuk gemeld 3 juli, nu verergerd)**
- **Probleem A — geen tests:** 2 Playwright-specs (alleen publieke marketingpagina's) voor 853 bronbestanden en 230 API-routes; CI draait ze niet eens. De recente security-fixes (klant-uren IDOR, medewerker-uren IDOR, annuleringsboete, per-account rate-limit) hebben **nul** regressiebescherming.
- **Probleem B — CI kapot:** `next lint` bestaat niet meer in Next 16 → lint-job faalt permanent (exit 1). Omdat de build-job `needs: [typecheck, lint]` heeft, draait de build in CI **nooit**. Alleen `tsc --noEmit` draait nog; een permanent rode pijplijn maskeert echte regressies.
- **Bewijs:** `tests/onboarding-smoke.spec.ts:3`, `.github/workflows/ci.yml:34`.
- **Impact:** Voor een platform met loon, facturen, BSN/IBAN en Mollie is dit een groot structureel kwaliteitsrisico — elke refactor kan een security-fix stil terugdraaien; build-brekende fouten worden pas op productie ontdekt.
- **Aanbeveling:** Vervang `next lint` door `eslint .` (`npx eslint . --max-warnings 150`) en ontkoppel de build van de lint-job (`if: always()`). Voeg vitest toe en dek eerst de hoogste-risico pure functies (`session.ts`, `admin-auth.ts`, loon-/fee-berekeningen, IDOR-eigenaarschecks) + minstens één e2e-test per geld-/auth-route, als merge-blokkerende CI-job.

---

## P1 — Belangrijk (MEDIUM)

*(Genummerd; regressie-status t.o.v. 3 juli tussen haakjes.)*

**Access control / IDOR**
1. **IDOR in vervangings-flows** — `accept_vervanging` en de `vervanging` PATCH zetten een willekeurige aanmelding-id op 'geaccepteerd'/'afgewezen' zonder te verifiëren dat die bij de juiste dienst hoort. `src/app/api/medewerker/diensten/route.ts:512` + `src/app/api/medewerker/vervanging/route.ts:107`. **Fix:** verifieer `aanmelding.dienst_id === vervanging.dienst_id` én status 'aangemeld' vóór de mutatie (identiek aan `afwijs_vervanging`). *(nieuw)*
2. **Broken function-level authz op geld-/account-routes** — boetes, tarieven, account-status, facturen missen `hasRequiredAdminRole`; elke admin (ook recruiter) kan factureren/boetes kwijtschelden/account pauzeren. `src/app/api/admin/boetes/route.ts:35` + `src/app/api/facturen/generate/route.ts:36`. Verzwarend: `getAdminRole()` geeft niet-gemapte accounts default 'operations'. **Fix:** `hasRequiredAdminRole(role,['owner','finance'])` op geld-routes, `['owner','operations']` op account-status. *(deels M17, 3 juli)*

**Authenticatie / sessie**
3. **`magic_token`/`reset_token` plaintext opgeslagen én bevraagd** — DB-lees = direct bruikbaar voor reset/takeover. `src/lib/medewerker-password-reset.ts:34`. **Fix:** sla SHA-256-hash op, vergelijk server-side. *(was M2, 3 juli — niet opgevolgd)*
4. **Admin Supabase access+refresh token in localStorage → XSS-exfiltratie** — meest geprivilegieerde portaal heeft de meest XSS-exposeerbare tokenopslag (i.t.t. httpOnly-cookies bij klant/medewerker). `src/app/api/admin/login/route.ts:143`. **Fix:** server-side httpOnly-cookie (of `@supabase/ssr` cookie-storage) + strak CSP. *(gerelateerd M11)*
5. **Geen sessie-revocatie** — gestolen session-cookie blijft 7 dagen (factuur-PDF 30 dagen) geldig, óók na logout/wachtwoord-reset. `src/lib/session.ts:33`. **Fix:** `token_version`/`password_changed_at` in de JWT metekenen en bij verify vergelijken; bump bij logout-all/reset.

**Injectie / XSS**
6. **HTML-injectie in interne staf-e-mail via publiek `tickets/analyze`** — geen escaping, geen reCAPTCHA (alleen IP-limit) terwijl het per call de LLM aanroept. `src/app/api/tickets/analyze/route.ts:172`. **Fix:** `escapeHtml()` op alle user-/AI-velden, reCAPTCHA toevoegen, `visitor_email` valideren. *(nieuw)*
7. **HTML-injectie via publieke calculator-lead** — `lead.naam`/`lead.bedrijfsnaam` rauw in interne én lead-e-mail. `src/app/api/calculator/lead/route.ts:201`. **Fix:** `escapeHtml()` in beide generators. *(nieuw)*
8. **CSV-formule-injectie + gebrekkige quoting in CRM-export** — onvertrouwde velden (Instantly-webhook, bookmarklet) breken CSV-structuur en voeren formules uit in Excel/Sheets. `src/app/api/admin/crm/export/route.ts:42`. **Fix:** prefix `= + - @`-cellen, escape ingesloten quotes, quote velden met `" , \n \r`; gebruik een geteste serializer.

**Config / headers / rate-limit**
9. **CSP staat `unsafe-inline` in `script-src`** — de als XSS-vangnet bedoelde CSP blokkeert inline/reflected scripts niet; combineert met admin-token in localStorage. `next.config.ts:41`. **Fix:** nonce-gebaseerde CSP, `strict-dynamic` als tussenstap. *(was M12, 3 juli — niet opgevolgd)*
10. **Rate-limiting degradeert naar per-instance in-memory fallback** — bij Upstash-storing/misconfig zakt de login-/reset-limiet op serverless ver onder 5/15min per IP. `src/lib/rate-limit-redis.ts:249`. **Fix:** auth-endpoints fail-closed bij afwezig/onbereikbaar Redis + alert. *(was M15, 3 juli — niet opgevolgd)*

**Mollie / facturen / financieel**
11. **Facturen worden nergens op 'betaald' gezet** — geen bankreconciliatie en geen admin-actie; `cron/herinneringen` blijft betalende klanten aanmanen (dag 14/28/42) en het klant-dashboard toont elke factuur eeuwig 'open'. `src/app/api/cron/herinneringen/route.ts:34`. **Fix:** 'markeer betaald'-adminactie (finance-gate) + reconciliatiestap.
12. **Drie onverenigbare factuurnummer-schema's + race** — admin `YYYYNNNN`, klant `YYYYMMNNNN`, annulering `ANN-<timestamp>`; count-query `ilike '2026%'` telt klantfacturen mee; twee gelijktijdige klantfacturen → duplicaat of 500. `src/app/api/facturen/generate/route.ts:105` + `src/app/api/klant/facturen/route.ts:121`. **Fix:** één atomaire nummerbron (DB-sequence/RPC), één formaat, unieke constraint + retry. *(NL-factuurwetgeving: doorlopende nummering)*
13. **Klant-zelffactuur rekent reiskosten @0,21 (medewerkertarief) i.p.v. @0,23 (klanttarief)** — structureel margeverlies + twee bedragen voor identieke uren. `src/app/api/klant/facturen/route.ts:88`. **Fix:** `calculateKlantReiskosten()` in beide paden.
14. **Verdiensten-inconsistentie over 4 routes** — Financieel telt alleen 'goedgekeurd', Dashboard/Uren tellen 'klant_goedgekeurd'/'gefactureerd'; bedrag springt heen en weer per goedkeuringsfase. `src/app/api/medewerker/financieel/route.ts:49` + `src/app/api/medewerker/dashboard/route.ts:56`. **Fix:** één canonieke set 'betaalbare' statussen in een gedeelde helper.
15. **'Verdiensten deze maand' — PostgREST-datumfilter op verkeerde embed-alias** — filter gebruikt `aanmelding.diensten.datum` i.p.v. de alias `dienst`; maandfilter wordt genegeerd → alle maanden opgeteld (overschatting). Idem de `aankomende_diensten`-count. `src/app/api/medewerker/dashboard/route.ts:35` + `:57`. **Fix:** alias-pad + `!inner`-embed; verifieer met echte data.
16. **Gewerkte uren zijn end-to-end client-vertrouwd** — medewerker kan 24u indienen voor een 4u-dienst; bij rubber-stamp vloeit dit door naar factuur/loon. `src/app/api/medewerker/diensten/route.ts:659`/`:664`. **Fix:** herbereken server-side uit start/eind/pauze (zoals `admin/uren:148-153`).
17. **'aanmelden' mist duplicate-/vol-check en verlaagt plekken ook bij mislukte insert** — dubbel aanmelden, aanmelden op volle dienst, plekken-leak. `src/app/api/medewerker/diensten/route.ts:370`. **Fix:** checks zoals `shifts/aanmelden` + lees insert-error vóór plekken-update; `UNIQUE(dienst_id, medewerker_id)`.
18. **Annuleringsboete-factuur: insert-fout stil ingeslikt → annulering 'slaagt' zonder boete** — kolommen `type/beschrijving/annulering_id` staan niet in de migraties; `ANN-${Date.now()}` kan botsen. `src/app/api/klant/annuleren/route.ts:79`. **Fix:** rol de annulering terug (of markeer 'boete pending') bij insert-fout; bevestig het factuurschema; centrale nummerbron. *(3-juli-fix 2.3 was onvolledig)*
19. **Twee parallelle, niet-samenwerkende vervangingssystemen** — de UI gebruikt de aanmeldingen-flow; `dienst_vervangingen`/`vervanging/route.ts` is dode/divergente code. `src/app/api/medewerker/vervanging/route.ts:52`. **Fix:** kies één model, verwijder/herbedraad de andere.

**PWA cross-user datalek**
20. **Klant-dashboard-HTML (met klant-identiteit) wordt gecached en offline geserveerd zonder sessiecheck** — cache wordt alleen bij expliciete logout gewist; op gedeelde tablet ziet B offline A's bedrijfsnaam/contact. `public/sw-business.js:75`. **Fix:** geauthenticeerde `/klant/*`-navigatie niet cachen, of PII client-side laden.
21. **Medewerker-SW cachet PII (loon/diensten) op schijf; wissen alleen bij expliciete logout** — offline krijgt de volgende gebruiker de vorige medewerker's financieel/diensten-JSON. `public/sw.js:99`. **Fix:** wis `API_CACHE` ook bij 401/403 en namespace de cache per medewerker-id.

**AVG**
22. **Recht op verwijdering onvolledig** — delete wist alleen de DB-rij; ID-scans/foto's/contract-PDF's blijven als verweesde storage-objecten; geen self-service DSAR/export. `src/app/api/admin/medewerkers/route.ts:220`. **Fix:** erasure-flow die storage opruimt, fiscaal-verplichte records anonimiseert, alles logt; minimale inzage/export (art. 15/20).
23. **Toestemming server-side hardcoded op `true`** — consent wordt geregistreerd ook zonder aangevinkte checkbox; opgeslagen 'bewijs' is niet accountability-proof (art. 7 lid 1). `src/app/api/inschrijven/route.ts:230`. **Fix:** lees de checkbox uit formData, weiger bij ontbreken, sla werkelijke waarde + `consent_version` op; granulaire toestemming voor kandidatenpool.
24. **Sentry Session Replay + tracing laden onvoorwaardelijk zonder consent** — legt DOM van geauthenticeerde portalen vast (IBAN/loon-context) vóór/zonder toestemming; privacyverklaring stelt onjuist dat Sentry 'geen persoonsgegevens' krijgt (art. 13). `instrumentation-client.ts:15`. **Fix:** gate Replay achter consent, corrigeer de verklaring, benoem VS-doorgifte.

**Architectuur / observability**
25. **Twee overlappende cron-schedulers (Vercel Cron + GitHub Actions) triggeren dezelfde jobs dubbel** — klant krijgt betalingsherinneringen meermaals per dag; `herinneringen` heeft geen persistente dedup. `.github/workflows/daily-maintenance.yml:19`. **Fix:** één scheduler; `laatste_herinnering_at`/`herinnering_count` op de factuur.
26. **Schema niet reproduceerbaar + migratie-drift** — twee parallelle migratiesystemen, kern-PII/financiële tabellen in géén migratie, duplicaat- en volgorde-loze migraties. `supabase/migrations/20260316000000_linkedin_integratie.sql:1`. **Fix:** `supabase db pull` naar één baseline, dedupliceer de ~52 root-SQL's, commit een `schema.sql`. *(was open in sectie 8, 3 juli)*

**WCAG**
27. **Merkoranje (#F97316/#F27501) zakt door WCAG AA-contrast (~2.8:1)** — pervasief op tekst én primaire CTA-knoppen in beide PWA's. `src/app/klant/login/page.tsx:142`. **Fix:** donkerder token (~#C2410C, ~4.6:1) voor tekst/knoppen; huidig oranje alleen decoratief.
28. **Portaal-formuliervelden missen `htmlFor`/`id`-koppeling** — screenreaders kondigen geen label aan; raakt login + alle beheerformulieren. `src/app/klant/login/page.tsx:111`. **Fix:** hergebruik het correcte patroon uit `src/components/forms/InschrijfFormulier.tsx`. *(was open in sectie 6, 3 juli)*

---

## P2 — Technische schuld (LOW/INFO)

**Auth / tokens**
- Onboarding-statuslink zonder expiry, full-table-scan, plaintext + token in URL → lekt kandidaat-PII. `src/app/api/kandidaat/status/route.ts:38`, `src/app/api/kandidaat/documenten/route.ts:31`.
- `contract/ondertekenen` POST hercontroleert contractstatus niet (statusbypass op ingetrokken contract). `src/app/api/contract/ondertekenen/route.ts:117`.
- Dead & misbruikbaar `/api/admin/2fa/verify` (2FA-enumeratie + online backup-code brute force, alleen per-IP gethrottled). `src/app/api/admin/2fa/verify/route.ts:36`. **Verwijderen.**
- Admin wachtwoord-reset omzeilt `validatePasswordSecurity()`/HIBP. `src/app/api/admin/wachtwoord-reset/update/route.ts:28`.
- Reset-/activatie-/verify-tokens in URL-query. `src/lib/medewerker-activation.ts:54`.
- bcrypt cost 10 < OWASP-aanbeveling (12). `src/app/api/klant/register/route.ts:53`.
- GET-based logout is CSRF-baar (klant/medewerker). `src/app/api/klant/logout/route.ts:4`.
- Geen TOTP-replaybescherming; verify-window niet gepind. `src/lib/two-factor.ts:29`.
- JWT_SECRET alleen op aanwezigheid gecheckt; `jwtVerify` pint algorithms niet. `src/lib/session.ts:4`.
- Geen self-service klant-wachtwoord-reset. `src/app/api/klant/register/route.ts:1`.
- `sb-access-token` dode marker-cookie met misleidend commentaar over niet-bestaande proxy/middleware. `src/app/api/admin/login/route.ts:150`, `src/lib/admin-auth.ts:65`.
- Admin-login mist per-account rate-limiting. `src/app/api/admin/login/route.ts:13`. *(was M14, 3 juli)*

**Injectie / validatie / file-upload**
- PostgREST `.or()`-filterinjectie + crash op komma's/haakjes in `/api/leads` en `/api/admin/crm/leads`. `src/app/api/leads/route.ts:172`.
- Onveilige file-upload kandidaat/documenten: ongesanitiseerd `document_type` in storage-key (path-injectie) + MIME-only. `src/app/api/kandidaat/documenten/route.ts:130`.
- cv-upload valideert alleen client-MIME (geen magic-byte). `src/app/api/cv-upload/route.ts:41`.
- Path-prefixcontrole `discover` omzeilbaar (`startsWith` zonder separator) + lokale-FS-import. `src/app/api/admin/acquisitie/discover/route.ts:55`.
- Ongevalideerde sorteerkolom in `acquisitie/leads`. `src/app/api/admin/acquisitie/leads/route.ts:119`.
- `markdownToHtml`/regex-sanitizer laten rauwe HTML door in `dangerouslySetInnerHTML` (latente stored-XSS bij AI/prompt-injectie). `src/app/geo/[slug]/page.tsx:646`. **Gebruik DOMPurify/sanitize-html.**
- Mass-assignment `acquisitie/segments update_segment`. `src/app/api/admin/acquisitie/segments/route.ts:319`.
- CSV-import mapt vrije kolommen naar willekeurige DB-kolommen zonder allowlist + geen rij-limiet. `src/app/api/admin/acquisitie/import/route.ts:37`. Dedup-checks met `.single()`. `:71`.

**Config / headers / rate-limit / spoeddienst**
- `next.config.ts` refereert niet-bestaande `middleware.ts` (dode config, versterkt fantoom-middleware-aanname). `next.config.ts:57`. **Verwijderen + documenteren dat auth per-route is.**
- CSP mist `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. `next.config.ts:39`.
- Token-flow-endpoints (activeren/offerte-accept/spoeddienst/kandidaat-documenten) missen rate-limiting. `src/app/api/medewerker/activeren/route.ts:1`.
- `spoeddienst_token` = 16 hex (~64 bit), lossere validatie (min. 10 tekens) dan generatie; claim-route zonder rate-limit. `src/app/api/admin/diensten/route.ts:72`, `src/app/api/spoeddienst/[token]/route.ts:12`.
- ADMIN_ROLE_MAP: code parseert CSV, `.env.example` documenteert JSON → alle admins vallen stil terug op default-rol. `src/lib/admin-auth.ts:14`/`:19`. **Fail-closed + validatie bij startup; verifieer de Vercel-prod-waarde.**

**Financieel (overig)**
- Inconsistente/ontbrekende BTW-afronding tussen factuurpaden. `src/app/api/klant/facturen/route.ts:104`.
- Klant kan zelf facturen aanmaken in de bedrijfsadministratie (afwijkende nummering/status, geen retry). `src/app/api/klant/facturen/route.ts:130`.
- Medewerker-verdiensten hardgecodeerde marge `uurtarief - 4` zonder ondergrens (negatief loon mogelijk); negeert `bruto_uurloon`. `src/app/api/medewerker/financieel/route.ts:55`, `src/app/api/medewerker/dashboard/route.ts:70`.
- Mollie-webhook verifieert bedrag/metadata niet tegen de boete (defense-in-depth). `src/app/api/webhooks/mollie/route.ts:93`.
- `cron/invoice-reminders` zoekt op status 'verstuurd' terwijl facturen 'verzonden'/'open' krijgen → dode code die 0 facturen vindt (duplicaat van `cron/herinneringen`). `src/app/api/cron/invoice-reminders/route.ts:23`. Plus 5 orphaned cron-routes (waaronder `metrics-report`). `:15`.

**Correctheid medewerker/klant**
- Race op `plekken_beschikbaar` (niet-atomaire read-then-write). `src/app/api/medewerker/diensten/route.ts:377`.
- Naïeve datum/tijd-parsing zonder tijdzone verschuift de 48u-annuleringsgrens (tot 2u in CEST). `src/app/api/medewerker/diensten/route.ts:455`.
- Override-GET filtert de override van de lopende week weg. `src/app/api/medewerker/beschikbaarheid/route.ts:74`.
- Badges/gamification-pagina toont hardcoded neppe data. `src/app/medewerker/badges/BadgesClient.tsx:68`.
- Klant-goedkeuring van 'klant_aangepast' negeert de aanpassing (factuur op oorspronkelijke uren). `src/app/api/klant/uren/route.ts:95`.
- `klant/uren` POST 'adjust' crasht (500) zonder null-guard. `:112`.
- `klant_aangepast`-uren onzichtbaar in het klantportaal. `src/app/klant/uren/KlantUrenClient.tsx:430`.
- Lead→klant-conversie zonder wachtwoord/status en zonder duplicaatcheck. `src/app/api/admin/acquisitie/leads/route.ts:223`.
- `news/operations` reset-acties buiten try/catch → onafgevangen 500. `src/app/api/admin/news/operations/route.ts:104`.
- Klant-dashboard 'goedgekeurd deze maand' zonder middernacht-reset + telt op indien-datum i.p.v. dienstdatum. `src/app/api/klant/dashboard/route.ts:21`.
- Klant-zelffactuur zet `periode_start/eind` uit ongesorteerde regels. `src/app/api/klant/facturen/route.ts:137`.

**PWA (overig)**
- Manifests verwijzen naar 3 niet-bestaande screenshots (medewerker + klant). `public/manifest.json:40`, `public/manifest-klant.json:31`. *(was open 3 juli)*
- SW cacheable-whitelist typefout `/api/medewerker/profiel` (route heet `/profile`) → dode config. `public/sw.js:22`.
- `isCacheableApi` `startsWith` overmatch (`dashboard` matcht `dashboard-summary`). `public/sw.js:110`.
- `API_CACHE` hardcoded v1 terwijl STATIC/DYNAMIC v5 → nooit geïnvalideerd bij bump. `public/sw.js:4`.
- Geen `Cache-Control: no-store` op `/sw.js` en `/sw-business.js`. `next.config.ts:116`.
- Dode code: ongebruikte `CACHE_NAME`-constante + dode `MedewerkerDienstenClient.tsx` (maskeert dat live logout kapot is). `src/app/medewerker/diensten/MedewerkerDienstenClient.tsx:201`.
- `clearSwCacheOnLogout` fire-and-forget (geen ack vóór redirect). `src/lib/sw-utils.ts:16`.
- Dubbele PWA-install-prompt op klant-dashboard met twee dismiss-keys. `src/app/klant/layout.tsx:51`. *(medewerker was gefixt, klant nog open)*
- Klant-manifest mist maskable icon. `public/manifest-klant.json:17`.
- `self.clients.claim()` buiten `event.waitUntil()`. `public/sw-business.js:30`.
- Klant kan push wél aanzetten maar niet uitschakelen in de UI; misleidend SW-commentaar. `src/app/klant/components/PushNotificationBanner.tsx:8`.

**AVG (overig)**
- Privacyverklaring komt niet overeen met de tracking-stack (claimt GA; code gebruikt GTM + Vercel Analytics; Telegram niet vermeld). `src/app/privacy/page.tsx:427`.
- CV-upload slaat volledige-PII CV's op zonder consent-registratie/eigenaar-koppeling → verweesd, onvindbaar bij DSAR. `src/app/api/cv-upload/route.ts:51`.
- reCAPTCHA (VS) zonder benoemde doorgifte-waarborg. `src/hooks/useRecaptcha.ts:46`.
- AI-kandidaatscreening = waarschijnlijk high-risk AI (EU AI-Act Annex III); DPIA, kandidaat-notice, AI-geletterdheid open. `src/app/api/admin/ai/screening/route.ts:50`.
- VS-doorgifte OpenAI: vrije-tekst 'motivatie' kan identifiers bevatten ondanks anonimisatie-claim. `src/lib/agents/kandidaat-screening.ts:74`.

**Performance / SEO / WCAG (overig)**
- `recharts` eager geïmporteerd in het klantportaal (~90-100kb in hoofdchunk). `src/app/klant/uren/KlantUrenClient.tsx:10`. **Lazy-load via `next/dynamic`.**
- N+1 in `klant/favorieten` (2·N queries). `src/app/api/klant/favorieten/route.ts:39`.
- Canonical-URLs inconsistent met `trailingSlash:true` (wijzen naar 301-varianten). `src/app/locaties/[city]/layout.tsx:35`. *(was open 3 juli)*
- `medewerker/diensten` GET = ~8 sequentiële round-trips. `src/app/api/medewerker/diensten/route.ts:138`. *(was M20, 3 juli)*
- Login-/formulierfouten niet in live region (WCAG 4.1.3). `src/app/klant/login/page.tsx:109`. *(was open 3 juli)*
- framer-motion breed in de medewerker-PWA (14 componenten). `src/app/medewerker/dashboard/DashboardHomeClient.tsx:1`.
- Zwakke focus-indicator (ring /20 opacity). `src/app/klant/login/page.tsx:115`.
- Bottom-nav actieve tab mist `aria-current="page"`. `src/components/medewerker/YoungOnesBottomNav.tsx:48`.
- SEO-contentroutes zonder `generateStaticParams`/ISR (geo/[slug], locatie-detail). `src/app/geo/[slug]/page.tsx:1`.

**Repo-hygiene / architectuur (overig)**
- Divergente rol-enums (`recruitment` vs `recruiter`); `useUserRole()` retourneert hardcoded 'owner'. `src/lib/dashboard-roles.ts:156`. **Consolideer tot één `AdminRole`.**
- Dode-code modules (`src/lib/rate-limit.ts` met top-level side-effects, 28KB mockup, ongebruikte PWAInstallPrompt, getrackte log/debug). `src/lib/rate-limit.ts:1`.
- ~62 losse `.md`-prompts + ~52 root-SQL's + zuster-backupmap met secrets op schijf + `.env.local.save` (git-secrets zelf schoon). `.gitignore:39`. **Archiveer, verwijder lokale secret-sprawl.**

**Positieve controles (INFO — geen actie):**
- Geen gecommitte secrets, service_role server-only, geen wildcard-CORS, kern-headers globaal. `src/lib/supabase.ts:72`.
- Beide service workers coëxisteren correct op niet-overlappende scopes. `src/app/klant/components/RegisterSW.tsx:7`.

---

## PWA-specifiek oordeel

### Medewerker-PWA "TopTalent Hub" (`sw.js` + `manifest.json`)
- **Installeerbaarheid:** grotendeels werkend; manifest is compleet op de 3 ontbrekende screenshots na (`manifest.json:40`) — Chrome/Android tonen de rijke install-UI niet.
- **Offline:** werkt, maar met **twee reële datalek-/kwaliteitsrisico's** — PII (loon/diensten) wordt op schijf gecachet en pas bij expliciete logout gewist (`sw.js:99`), en de logout is zelf **kapot** (P0-5) waardoor op gedeelde tablets de volgende gebruiker offline de PII van de vorige krijgt. Bijkomende dode config: typefout `/api/medewerker/profiel` (`sw.js:22`), prefix-overmatch (`sw.js:110`), `API_CACHE` v1 nooit geïnvalideerd (`sw.js:4`).
- **Push:** functioneel.
- **Update-flow:** aanwezig, maar trager door hardcoded cache-versionering en ontbrekende `Cache-Control: no-store` op `/sw.js` (`next.config.ts:116`).
- **Oordeel:** **functioneel maar onveilig op gedeelde toestellen.** De combinatie kapotte logout + stale PII-cache + 7-daagse niet-revoceerbare JWT is de grootste zorg. Prioriteit: P0-5 (logout) + cache wissen bij 401/403.

### Klant-PWA "TT Business" (`sw-business.js` + `manifest-klant.json`)
- **Installeerbaarheid:** de app **kan geïnstalleerd worden maar is direct stuk** — `start_url` `/klant/?source=pwa` is een 404 (`manifest-klant.json:6`) en de service worker **installeert nooit** doordat het precache-pad `/klant/` 404't en `addAll` zonder `.catch()` de hele install laat falen (`sw-business.js:6`).
- **Offline:** feitelijk **niet aanwezig** (SW activeert nooit); daarnaast, mocht de SW ooit activeren, wordt geauthenticeerde dashboard-HTML met klant-identiteit gecached en offline zonder sessiecheck geserveerd (`sw-business.js:75`).
- **Push:** **hangt** — `navigator.serviceWorker.ready` resolvet niet zolang de SW niet activeert; klant kan bovendien niet uitschakelen (`PushNotificationBanner.tsx:8`).
- **Update-flow:** niet functioneel zolang de SW niet installeert.
- **Overig:** dubbele install-prompt (`klant/layout.tsx:51`), geen maskable icon, ontbrekende screenshots.
- **Oordeel:** **de klant-PWA is op dit moment niet productiewaardig.** P0-6 (SW-precache + `start_url`) is randvoorwaardelijk vóór élke andere klant-PWA-verbetering.

**Kernboodschap PWA:** de medewerker-PWA draait maar lekt PII op gedeelde toestellen; de klant-PWA is bij lancering kapot. Beide moeten in P0.

---

## AVG/compliance-oordeel

De compliance-basis (cookie-consent, bewerkersovereenkomst-template, art. 22/menselijke beslissing bij AI-screening) is aanwezig, maar er zijn **vier materiële tekortkomingen** waarvan twee HIGH:

1. **Geen afgedwongen bewaartermijnen** (P0-8) — schending opslagbeperking (art. 5 lid 1 sub e); de gepubliceerde termijnen zijn aantoonbaar onwaar. **Grootste juridische blootstelling.**
2. **IBAN/BSN plaintext** (P0-9) — art. 32 AVG / art. 46 UAVG; de privacyverklaring claimt onterecht opslagversleuteling.
3. **Recht op verwijdering onvolledig** (P1-22) — storage-objecten blijven achter; geen self-service DSAR/export (art. 15/17/20).
4. **Onbetrouwbaar toestemmingsbewijs** (P1-23, hardcoded `true`) + **Sentry Replay zonder consent en onjuiste privacyverklaring** (P1-24, art. 7/13).

Aanvullend LOW: privacyverklaring-mismatch met de werkelijke tracking-stack, verweesde CV's zonder retentie, reCAPTCHA/OpenAI-doorgifte-onderbouwing, en de AI-Act-DPIA/kandidaat-notice (deadline aug 2026). **Advies:** behandel P0-8 en P0-9 als de twee juridisch dringendste punten; de rest hoort in een gestructureerde AVG-remediatie met bijgewerkt verwerkingsregister en privacyverklaring.

---

## Aanbevolen 30/60/90-dagen actieplan

### 0-30 dagen — "de geldketen en de portalen werken weer" (alle P0)
1. **Mollie-boetewebhook repareren** (P0-4): handtekeningcheck verwijderen, status server-side ophalen, end-to-end testen met `test_`-betaling. *(betalingen komen nu nooit binnen)*
2. **Medewerker-logout POST toevoegen** (P0-5) + cache wissen bij 401/403 (P1-21). *(sessie-lek op gedeelde tablets)*
3. **Klant-PWA repareren** (P0-6): `start_url` + precache naar `/klant/dashboard/`, `.catch()` rond `addAll`, verifiëren in DevTools.
4. **Admin-2FA login-UI aansluiten** (P0-3) + 2FA-enable tijdelijk blokkeren tot live.
5. **BOLA beoordelingen dichtzetten** (P0-1): eigenaarscontrole + unieke constraint.
6. **Activatie-token ontkoppelen van login** (P0-2).
7. **CI repareren** (P0-10-B): `eslint .`, build ontkoppelen van lint — zodat de rest van dit plan een groen vangnet krijgt.
8. **Toeslag-beslissing forceren** (P0-7): wel of niet doorbelasten, en consistent doorvoeren of verwijderen.

### 30-60 dagen — "geld klopt, tests dekken, PII beschermd"
9. **Factuur-reconciliatie**: 'markeer betaald'-adminactie + één atomaire nummerbron/format (P1-11, P1-12); klant reiskosten @0,23 (P1-13); één canonieke verdienste-status + embed-alias-fix (P1-14, P1-15).
10. **Server-herberekening gewerkte uren** (P1-16) + aanmeld-checks/plekken-atomiciteit (P1-17, P2-race).
11. **IBAN/BSN kolom-encryptie** (P0-9) + finance-rolgate op alle geld-routes (P1-2).
12. **Vitest + eerste e2e-tests** op geld-/auth-routes en IDOR-checks (P0-10-A).
13. **Token-hashing** (P1-3) + **sessie-revocatie** (P1-5) + rate-limit fail-closed op auth (P1-10).
14. **HTML-escaping** in `tickets/analyze` en `calculator/lead` + reCAPTCHA (P1-6, P1-7); CSV-injectie-guard (P1-8).
15. **IDOR vervangings-flows** dichtzetten + één vervangingsmodel kiezen (P1-1, P1-19).

### 60-90 dagen — "compliance, hardening, hygiëne"
16. **Retentie-cron** (P0-8) + **erasure-flow met storage-opruiming + DSAR/export** (P1-22).
17. **Consent fixen** (P1-23) + **Sentry Replay achter consent** + privacyverklaring bijwerken (P1-24); AI-Act-DPIA starten.
18. **CSP naar nonce-based** + admin-token naar httpOnly-cookie (P1-9, P1-4); CSP-hardening-directives.
19. **Cron-schedulers consolideren** + dedup herinneringen (P1-25); dode cron-routes opruimen.
20. **Migratie-consolidatie** + reproduceerbaar `schema.sql` (P1-26); repo-hygiene, dode code, divergente rol-enums.
21. **WCAG**: contrast-token, `htmlFor`/`id`, live-regions, focus, `aria-current` (P1-27, P1-28 + P2-a11y).
22. **Performance**: recharts lazy-load, N+1 favorieten, medewerker-diensten parallelliseren, canonical trailing-slash, `generateStaticParams`.

**Rode draad:** stap 7 (CI) en stap 12 (tests) zijn de multiplier — zonder een groen vangnet draaien alle overige fixes het risico stil teruggedraaid te worden, exact zoals meerdere 3-juli-punten (2FA, toeslagen, retentie, IBAN/BSN, CSP) deze ronde open of teruggevallen bleken.