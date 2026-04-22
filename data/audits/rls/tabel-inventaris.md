# Fase 1 — Tabel-inventaris & PII-classificatie

**Datum:** 2026-04-22
**Methode:** Alle Supabase migraties geanalyseerd (15 bestanden) + base tables via API routes

---

## Overzicht

| Categorie | Aantal tabellen | Met RLS | Zonder RLS |
|-----------|----------------|---------|------------|
| Extremely High PII | 6 | 4 | 2 |
| High PII | 7 | 3 | 4 |
| Medium PII | 8 | 5 | 3 |
| Low/Indirect PII | 6 | 4 | 2 |
| Geen PII | 28 | 17 | 11 |
| **Totaal** | **55** | **33** | **22** |

---

## Extremely High PII (BSN, identiteitsdocumenten, handtekeningen)

| Tabel | PII-velden | Owner-kolom | RLS? | Risico |
|-------|-----------|-------------|------|--------|
| `contracten` | contract_data (JSONB: BSN, naam, adres, salaris), onderteken_token | medewerker_id, klant_id | Ja (service-role only) | KRITIEK — JSONB bevat BSN |
| `contract_ondertekeningen` | ondertekenaar_naam, ondertekenaar_email, handtekening_data (Base64), ip_adres, user_agent | contract_id → medewerker/klant | Ja (service-role only) | KRITIEK — digitale handtekeningen |
| `contract_versies` | contract_data (JSONB: historisch), gewijzigd_door | contract_id | Ja (service-role only) | KRITIEK — historische BSN-data |
| `kandidaat_documenten` | file_path, file_url, document_type (ID, paspoort, CV), document_expires_at | inschrijving_id | **NEE** | KRITIEK — identiteitsdocumenten |
| `medewerkers` (base) | naam, email, telefoon, adres, BSN, geboortedatum, wachtwoord_hash, verificatie_token, profielfoto | id (PK) | **NEE** | KRITIEK — volledige werknemersdata |
| `chatbot_messages` | content (vrije tekst), sender_id | conversation_id | **NEE** | HOOG — kan alle PII bevatten |

## High PII (naam, email, telefoon, adres)

| Tabel | PII-velden | Owner-kolom | RLS? | Risico |
|-------|-----------|-------------|------|--------|
| `inschrijvingen` (base) | voornaam, achternaam, email, telefoon, stad, geboortedatum, motivatie, kvk_nummer | id (PK) | **NEE** | HOOG — kandidaat-registraties |
| `klanten` (base) | bedrijfsnaam, contactpersoon, email, telefoon, adres, kvk_nummer, wachtwoord_hash | id (PK) | **NEE** | HOOG — klantgegevens |
| `bookings` | client_name, client_email, client_phone, company_name, notes | inquiry_id → personeel_aanvragen | Ja (public insert/read!) | HOOG — openbaar leesbaar |
| `acquisitie_leads` | bedrijfsnaam, contactpersoon, email, telefoon, adres, stad, personalisatie_notities | id (PK) | **NEE** | HOOG — sales leads |
| `offertes` | bedrijfsnaam, contactpersoon, email, telefoon, locatie, accepted_naam, accepted_ip, token | aanvraag_id | Ja (service-role only) | HOOG — offerte + IP-data |
| `leads` | naam, email, telefoon, stad, regio, notities | aangemaakt_door (auth.users) | Ja (service-role only) | HOOG — lead-contactgegevens |
| `email_log` | recipient (email), kandidaat_id, subject | kandidaat_id → inschrijvingen | **NEE** | HOOG — email-tracking |

## Medium PII (gebruikers-ID, berichten, beperkte contactinfo)

| Tabel | PII-velden | Owner-kolom | RLS? | Risico |
|-------|-----------|-------------|------|--------|
| `linkedin_connections` | user_email, linkedin_person_id, profile_name, access_token, refresh_token | user_email | **NEE** | HOOG — OAuth tokens! |
| `berichten` | van_id, aan_id, inhoud | van_id / aan_id | Ja | MEDIUM |
| `referrals` | referrer_id, referred_naam, referred_email | referrer_id | Ja (service-role only) | MEDIUM |
| `audit_log` | actor_email, summary, metadata (JSONB) | actor_email | **NEE** | MEDIUM — audit trail |
| `tickets` | visitor_name, visitor_email, question | — | Ja | MEDIUM |
| `chatbot_conversations` | user_naam, user_email, assigned_admin_email | user_id | **NEE** | MEDIUM |
| `faq_items` | visitor_name, visitor_email | — | Ja | LAAG |
| `google_reviews` | reviewer_naam, tekst | — | Ja (service-role only) | LAAG |

## Low/Indirect PII

| Tabel | PII-velden | Owner-kolom | RLS? |
|-------|-----------|-------------|------|
| `lead_outreach` | bericht (tekst) | lead_id → leads | Ja |
| `push_subscriptions` | user_id, endpoint, auth | user_id | Ja |
| `certificeringen` | medewerker_id, document_url | medewerker_id | Ja |
| `dienst_aanbiedingen` | medewerker_id, notitie | medewerker_id | Ja |
| `dienst_annuleringen` | klant_id, geannuleerd_door, reden | klant_id | Ja |
| `acquisitie_contactmomenten` | inhoud (communicatie) | lead_id → acquisitie_leads | **NEE** |

## Geen/Minimale PII (referentie-/configuratietabellen)

| Tabel | RLS? |
|-------|------|
| `dienst_categorieen` | Nee |
| `dienst_functies` | Nee |
| `dienst_tags` | Nee |
| `diensten_tags` (junction) | Nee |
| `platform_options` | Nee |
| `outreach_templates` | Ja |
| `contract_templates` | Ja |
| `geo_content` | Ja |
| `geo_generation_log` | Nee |
| `geo_citations` | Ja |
| `geo_performance` | Ja |
| `geo_concurrenten` | Ja |
| `geo_content_gaps` | Ja |
| `geo_optimalisatie_log` | Ja |
| `content_posts` | Ja |
| `linkedin_posts` | Nee |
| `linkedin_templates` | Nee |
| `admin_settings` | Ja |
| `availability_slots` | Ja |
| `klant_annuleringsbeleid` | Ja |
| `factuur_regels` | Ja |
| `acquisitie_campagnes` | Nee |
| `acquisitie_campagne_leads` | Nee |
| `diensten` (base + modified) | Nee |
| `beoordelingen` (base + modified) | Nee |
| `medewerker_documenten` (base + modified) | Nee |
| `klant_favoriete_medewerkers` | Nee |

---

## Base Tables (niet in migraties — handmatig aangemaakt)

De volgende tabellen bestaan in de database maar zijn NIET aangemaakt via de migratie-bestanden.
Exacte schema is afgeleid uit API-routes die ernaar schrijven:

1. **`medewerkers`** — Volledige werknemerstabel (naam, email, telefoon, adres, geboortedatum, BSN, wachtwoord_hash, profielfoto, verificatie_token, etc.)
2. **`klanten`** — Klanttabel (bedrijfsnaam, contactpersoon, email, telefoon, adres, kvk_nummer, wachtwoord_hash)
3. **`inschrijvingen`** — Kandidaat-registraties (voornaam, achternaam, email, telefoon, stad, geboortedatum, motivatie, etc.)
4. **`diensten`** — Shifts/diensten (klant_id, datum, locatie, functies, uurtarief)
5. **`personeel_aanvragen`** — Personeelsaanvragen (bedrijfsnaam, contactpersoon, email, telefoon, type, etc.)
6. **`facturen`** — Facturen (klant_id, bedrag, status, pdf_pad)
7. **`uren_registraties`** — Urenregistratie (medewerker_id, dienst_id, uren, status)
8. **`dienst_aanmeldingen`** — Shift-aanmeldingen (dienst_id, medewerker_id, status)
9. **`beoordelingen`** — Reviews (klant_id, medewerker_id, scores, opmerking)
10. **`medewerker_documenten`** — Documenten (medewerker_id, type, file_path)
11. **`contact_berichten`** — Contactformulier berichten
12. **`boetes`** — Boetes voor medewerkers (medewerker_id, bedrag, mollie_payment_id)
