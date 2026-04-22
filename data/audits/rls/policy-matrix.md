# Fase 2 — RLS Policy Matrix

**Datum:** 2026-04-22
**Conclusie:** ALLE beveiliging is applicatie-laag. Geen enkele tabel heeft effectieve RLS voor eindgebruikers.

---

## Kernbevindingen

### KRITIEK 1: `admin_2fa` GRANT TO anon

```sql
GRANT SELECT, INSERT, UPDATE ON admin_2fa TO anon;
```

De `admin_2fa` tabel (TOTP secrets, backup codes) is volledig toegankelijk voor de `anon` role.
**Impact:** Iedereen met de Supabase anon key kan TOTP secrets lezen, backup codes stelen, en 2FA voor elke admin uitschakelen.

### KRITIEK 2: RLS policies met `USING (true)` — schijnbeveiliging

Veel tabellen hebben RLS enabled, maar hun policies gebruiken `FOR ALL USING (true)` of `WITH CHECK (true)`.
Dit betekent: **iedereen met de anon key heeft volledige lees/schrijf/verwijder toegang**, ongeacht de policy-naam.

Getroffen tabellen:
- `medewerker_werkervaring` — SELECT/INSERT/DELETE `USING (true)`
- `medewerker_vaardigheden` — SELECT/INSERT/DELETE `USING (true)`
- `medewerker_documenten` — SELECT/INSERT/UPDATE/DELETE `USING (true)`
- `berichten` — SELECT/INSERT/UPDATE `USING (true)` → **alle interne berichten leesbaar**
- `dienst_aanbiedingen` — SELECT/INSERT/UPDATE `USING (true)`
- `certificeringen` — SELECT/INSERT/UPDATE/DELETE `USING (true)`
- `spoeddienst_responses` — INSERT/SELECT/UPDATE `USING (true)`
- `bookings` — public INSERT + SELECT `USING (true)` → **PII leesbaar**
- `referrals` — `FOR ALL USING (true)` (policy zegt "service role" maar checkt niet)
- `offertes` — `FOR ALL USING (true)`
- `pricing_rules` — `FOR ALL USING (true)`
- `google_reviews` — `FOR ALL USING (true)`
- `content_posts` — `FOR ALL USING (true)`
- `factuur_regels` — `FOR ALL USING (true)`
- `bericht_templates` — `FOR ALL USING (true)`
- `push_subscriptions` — `FOR ALL USING (true)`

### Conclusie

- **0% van de tabellen heeft effectieve RLS voor eindgebruikers**
- **0% filtert op `auth.uid()`, `auth.jwt()`, of gebruikers-claims**
- De `anon` Supabase client wordt door geen enkele API-route gebruikt, MAAR de anon key + PostgREST is direct bruikbaar
- Zelfs de service-role key is niet nodig — de anon key is voldoende om alle data te lezen/schrijven via PostgREST

---

## Policy Overzicht per Tabel

### Tabellen MET RLS enabled — maar alleen service-role policies

| Tabel | RLS enabled? | Policy naam | Policy type | Effectief? |
|-------|-------------|-------------|-------------|-----------|
| `leads` | Ja | service_role_full_access_leads | ALL for service_role | Nee — geen user-filtering |
| `lead_outreach` | Ja | service_role_full_access_outreach | ALL for service_role | Nee |
| `outreach_templates` | Ja | service_role_full_access_templates | ALL for service_role | Nee |
| `contract_templates` | Ja | service_role_templates | ALL for service_role | Nee |
| `contracten` | Ja | service_role_contracten | ALL for service_role | Nee |
| `contract_ondertekeningen` | Ja | service_role_ondertekeningen | ALL for service_role | Nee |
| `contract_versies` | Ja | service_role_versies | ALL for service_role | Nee |
| `push_subscriptions` | Ja | service_role_full_access | ALL for service_role | Nee |
| `referrals` | Ja | service_role_full_access_referrals | ALL for service_role | Nee |
| `offertes` | Ja | service_role_full_access_offertes | ALL for service_role | Nee |
| `google_reviews` | Ja | service_role_full_access_google_reviews | ALL for service_role | Nee |
| `content_posts` | Ja | service_role_full_access_content_posts | ALL for service_role | Nee |
| `factuur_regels` | Ja | service_role_volledige_toegang | ALL for service_role | Nee |

### Tabellen MET RLS enabled — met public read/insert policies

| Tabel | Policies | Risico |
|-------|----------|--------|
| `geo_content` | Public read WHERE status='published' | OK — alleen gepubliceerde content |
| `geo_citations` | Service-role + select | OK — geen PII |
| `geo_performance` | Service-role + select | OK — geen PII |
| `geo_concurrenten` | Service-role + select | OK — geen PII |
| `geo_content_gaps` | Service-role + select | OK — geen PII |
| `geo_optimalisatie_log` | Service-role + select | OK — geen PII |
| `availability_slots` | Public read + service-role all | LAAG — geen PII |
| `bookings` | **Public insert + public read** + service-role all | **HOOG** — PII (naam, email, telefoon) publiek leesbaar! |
| `admin_settings` | Public read + service-role all | LAAG — configuratie |
| `faq_items` | Public read (published) + visitor insert | OK — beperkt |
| `tickets` | Service-role + visitor insert | OK |
| `berichten` | Select/insert/update (geen filter op user!) | **HOOG** — alle berichten leesbaar als anon client gebruikt zou worden |
| `dienst_aanbiedingen` | Select/insert/update (geen filter op user!) | HOOG |
| `certificeringen` | Select/insert/update/delete (geen filter!) | HOOG |
| `klant_annuleringsbeleid` | klant_eigen_beleid_read (maar geen auth.uid filter) | MEDIUM |
| `dienst_annuleringen` | klant_eigen_annuleringen_read (maar geen auth.uid filter) | MEDIUM |

### Tabellen ZONDER RLS (22 tabellen)

#### KRITIEK (bevatten PII)
| Tabel | PII-niveau | Impact zonder RLS |
|-------|-----------|-------------------|
| `medewerkers` | EXTREMELY HIGH | BSN, adres, wachtwoord_hash, telefoon — alle data |
| `klanten` | HIGH | Bedrijfsdata, contactgegevens, wachtwoord_hash |
| `inschrijvingen` | HIGH | Kandidaat-registraties met persoonsgegevens |
| `kandidaat_documenten` | EXTREMELY HIGH | Paden naar ID-documenten, paspoorten |
| `chatbot_conversations` | MEDIUM | User namen, emails |
| `chatbot_messages` | HIGH | Vrije tekst — kan alle PII bevatten |
| `linkedin_connections` | HIGH | OAuth tokens (access_token, refresh_token!) |
| `email_log` | HIGH | Email-adressen, tracking-data |
| `audit_log` | MEDIUM | Admin-emails, actie-summaries |
| `acquisitie_leads` | HIGH | Bedrijfs- en contactgegevens |
| `acquisitie_contactmomenten` | MEDIUM | Communicatie-inhoud |
| `acquisitie_campagnes` | LAAG | Template-data |
| `acquisitie_campagne_leads` | LAAG | Junction-tabel |

#### LAAG RISICO (geen/minimale PII)
| Tabel |
|-------|
| `dienst_categorieen` |
| `dienst_functies` |
| `dienst_tags` |
| `diensten_tags` |
| `platform_options` |
| `linkedin_posts` |
| `linkedin_templates` |
| `diensten` |
| `beoordelingen` |

---

## Applicatie-laag Beveiliging (huidige situatie)

Omdat RLS niet effectief is, vertrouwt de hele applicatie op auth-checks in de API-routes:

| Auth-mechanisme | Gebruikt door | Sterkte |
|----------------|---------------|---------|
| `verifyAdmin` (JWT + email whitelist + optioneel 2FA) | ~80 admin routes | Sterk |
| `verifyKlantSession` (signed JWT cookie, 7d) | ~25 klant routes | Sterk |
| `verifyMedewerkerSession` (signed JWT cookie, 7d) | ~35 medewerker routes | Sterk |
| `CRON_SECRET` (Bearer token) | ~25 cron routes | Sterk |
| HMAC-SHA256 handtekeningen | 4 webhook routes | Sterk |
| Token-based (32+ char) | ~5 routes (offerte, verify) | Goed |
| reCAPTCHA + rate limiting | ~5 publieke form routes | Goed (anti-spam) |
| **Geen auth** | ~20 publieke routes | **Risico verschilt** |

### Rij-filtering in applicatie-code

| Route-categorie | Filter-methode | Effectief? |
|----------------|----------------|-----------|
| Klant routes | `.eq("klant_id", session.klant.id)` | Ja — eigen data |
| Medewerker routes | `.eq("medewerker_id", session.medewerker.id)` | Ja — eigen data |
| Admin routes | Geen filter (full access by design) | N.v.t. |
| Cron routes | Query-specifiek | Ja |
| Publieke routes | Geen of minimal | **Probleem bij sommige** |

---

## Risico-analyse

### Scenario 1: Service-role key lekt
**Impact:** CATASTROFAAL — Volledige database-toegang tot alle tabellen inclusief BSN, wachtwoord-hashes, identiteitsdocumenten, OAuth tokens, handtekeningen.
**Huidige mitigatie:** Env var in Vercel, niet in code.
**Aanbeveling:** RLS policies toevoegen als defense-in-depth.

### Scenario 2: Bug in applicatie-auth
**Impact:** Route-specifiek — als een auth-check ontbreekt of faalt, is er GEEN database-niveau fallback.
**Huidige gevallen:** Zie service-role-usage.md voor routes zonder auth.

### Scenario 3: Supabase anon key misbruik
**Impact:** LAAG in huidige situatie — alle routes gebruiken supabaseAdmin. Maar als iemand de anon key + URL combineert met directe PostgREST calls:
- Tabellen MET RLS: geblokkeerd door service-role-only policies
- Tabellen ZONDER RLS: **VOLLEDIG TOEGANKELIJK** via PostgREST API!

**Dit is het grootste risico:** De 22 tabellen zonder RLS zijn rechtstreeks toegankelijk via de Supabase PostgREST API met alleen de anon key (die in de client-side JavaScript kan staan).

---

## Top-10 Prioriteiten voor RLS

1. **`medewerkers`** — ENABLE RLS + service-role policy (BSN, wachtwoord-hashes)
2. **`klanten`** — ENABLE RLS + service-role policy (wachtwoord-hashes)
3. **`inschrijvingen`** — ENABLE RLS + service-role policy
4. **`kandidaat_documenten`** — ENABLE RLS + service-role policy (identiteitsdocumenten)
5. **`linkedin_connections`** — ENABLE RLS + service-role policy (OAuth tokens!)
6. **`chatbot_messages`** — ENABLE RLS + service-role policy
7. **`email_log`** — ENABLE RLS + service-role policy
8. **`acquisitie_leads`** — ENABLE RLS + service-role policy
9. **`audit_log`** — ENABLE RLS + service-role policy
10. **`bookings`** — Verwijder public read policy, vervang door service-role only
