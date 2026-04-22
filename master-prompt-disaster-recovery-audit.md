# Master Prompt — Disaster Recovery Audit
## TopTalent | Backups, Point-in-Time Recovery, Runbook, RTO/RPO

Versie: 1.0
Doel: weet wat er gebeurt als de hele Supabase-database vannacht wegvalt, de Storage-bucket corrupt raakt, of Vercel een region-outage heeft. Het antwoord mag niet "dat weet ik niet" zijn. Audit = inventarisatie + gap-analyse + een werkbaar runbook.

---

## ⚠️ RUN-MODE

- Read-only op productie.
- Geen restore-test **in productie**. Restore-test alleen in een apart project of lokaal (gesimuleerd met dump).
- Geen backup verwijderen of overschrijven.
- Geen volumes wijzigen.

---

## ROL & CONTEXT

Je bent een site-reliability engineer met ervaring in Supabase/Postgres backup-strategieën, PITR, en disaster recovery voor kleine SaaS. Je kent RTO (Recovery Time Objective — hoe snel terug), RPO (Recovery Point Objective — hoeveel data mag verloren gaan), en het verschil tussen "we hebben backups" en "backups die daadwerkelijk teruggezet kunnen worden".

**Stack:** Supabase (Postgres + Storage + Auth + Edge Functions), Vercel (Next.js hosting + logs), GitHub (code), mogelijk Resend/Mollie/Telegram/Upstash voor externe state.

---

## MISSIE

Lever op in `data/audits/dr-audit-YYYY-MM-DD.md` antwoord op zes vragen:

1. **Waar zit alle productie-state?** Per systeem: database, storage, auth, queues, logs.
2. **Heeft elk systeem een backup?** Hoe oud, hoe vaak, hoe lang bewaard?
3. **Is de backup ooit gerestored?** (Als het antwoord "nee" is — de backup is theoretisch.)
4. **Wat is de RTO en RPO per systeem?** Expliciet opgeschreven.
5. **Wat is het runbook bij verlies?** Stap-voor-stap, voor elk van de top-3 rampscenario's.
6. **Welke single-points-of-failure** hebben geen mitigatie?

Output = actueel runbook + gap-analyse + voorstel voor jaarlijkse DR-drill.

---

## ABSOLUTE REGELS

- Geen restore in productie.
- Geen backup-retention aanpassen.
- Geen kandidaat-docs downloaden tenzij in een geïsoleerde map, en alles direct deleten na test.
- `gitnexus_impact` voor code-fix voorstellen (bijv. extra backup-scripts).

---

## TESTPLAN — VIJF FASES

### Fase 1 — State-inventarisatie

Lijst **elk systeem dat productie-state houdt** en categoriseer:

| Systeem | Wat erin | Recoverability bij verlies | Vervangend (bij nood) |
|---------|----------|-----------------------------|-----------------------|
| Supabase DB | Alle business-data | ? (PITR ja/nee) | - |
| Supabase Storage | Kandidaat-docs, CV's, contracten | ? | Onvervangbaar (PII!) |
| Supabase Auth | User-accounts | Gekoppeld aan DB | - |
| Vercel | Hosting, env vars | Redeploy vanuit Git | - |
| GitHub | Code | Distributed, low-risk | - |
| Resend | Mail-log, suppression list | Per account niet backupbaar | Kan opnieuw opbouwen |
| Mollie | Payment-records | Permanent bij Mollie | Van Mollie ophalen |
| Upstash | Rate-limit keys | Korte TTL, low-risk | - |
| Telegram | Alerts (forward-only) | - | - |
| Sentry | Error-history | 30-90 dagen retentie | - |

Output: `dr/state-inventaris.md`.

### Fase 2 — Backup-status per systeem

**Supabase:**
1. **Daily backups** — welke retentie (Free=7 dagen, Pro=7 dagen, ScaleUp=14 dagen, Enterprise=30 dagen)?
2. **Point-in-Time Recovery (PITR)** — aan? Retentie (7-35 dagen Pro+)?
3. **Storage backup** — Supabase biedt GÉÉN automatische Storage-backup. Dit is een gat. Is er een eigen script dat periodiek objects kopieert naar S3/Backblaze/Cloudflare R2?
4. **Auth backup** — onderdeel van DB, maar verifieer.
5. **Export-mogelijkheden** — `pg_dump` periodiek gestart naar off-Supabase? Waar bewaard?

**Vercel:**
- Deployments-historie altijd beschikbaar (rollback).
- Env-vars: **niet** automatisch geback-upt. Als Vercel-project verwijderd wordt, zijn secrets weg. Heb je een kluis (1Password, Vault) met copie?

**GitHub:**
- Branche-protection? Kun je de main-branch niet per ongeluk force-pushen naar leeg?
- Mirror van repo elders?

**Externe services:**
- Mollie: payment-historie blijft staan. Klant-details per payment? Ja.
- Resend: suppression list + templates. Templates staan in code, dus OK.
- Sentry: history weg bij verlopen retentie.

Output: `dr/backup-status.md`.

### Fase 3 — Restore-drill (gesimuleerd, geïsoleerd)

**Database restore test (in apart Supabase-project of lokale Docker Postgres):**

1. Download laatste `pg_dump` (als handmatig) of maak er een.
2. Restore naar leeg Supabase-project of `docker run postgres`.
3. Meet hoelang het duurt (RTO-component).
4. Verifieer:
   - Alle tabellen aanwezig
   - Row counts ~matchen productie
   - RLS-policies mee-gerestored
   - Functies + triggers mee-gerestored
   - Migrations-state consistent
5. Laat zien hoe je vervolgens de app tegen deze database zou laten draaien (env-var switch).

**Storage restore test (gesimuleerd):**
1. Download een handvol random objects naar lokale map.
2. Upload ze naar een test-bucket in een ander project.
3. Verifieer metadata (content-type, size) behouden.

**Secret restore test:**
1. Kun je alle env-vars reconstrueren uit je wachtwoordmanager / notities? Maak een lijst, check gaten.

Output: `dr/restore-drill-results.md` met tijden, hiaten, lessen.

### Fase 4 — Runbooks voor top-3 rampscenario's

Schrijf een **stap-voor-stap runbook** in `dr/runbook-<scenario>.md` voor:

**Scenario A: DB wiped / corrupted**
- 0-5 min: constatering, communicatie naar klanten (statuspagina?)
- 5-15 min: Supabase dashboard PITR restore initiëren naar `<X>` minuten voor incident
- 15-60 min: app-verbinding met hersteld project herstellen (connection string update)
- 60-90 min: data-integriteit verifieren (factuurnummers doorlopend, facturen ↔ Mollie match)
- Post-mortem template

**Scenario B: Supabase Storage bucket weg**
- Dit is de pijnlijke: er is **geen officiële Supabase Storage backup**.
- Hebben we rsync / scripted backups? Zo nee: welke kandidaat-docs kunnen we opnieuw vragen?
- E-mail-template voor "helaas ben je doc verloren, graag opnieuw uploaden" klaar hebben.

**Scenario C: Vercel-project verwijderd / account compromised**
- Code is in GitHub: re-deploy in nieuwe Vercel of zelfs andere host (Netlify, Railway).
- Env-vars weg — heb je ze in kluis?
- Domein DNS nog intact: switchen naar nieuwe host.

Output: per scenario een `.md` runbook.

### Fase 5 — SPOFs en mitigaties

Lijst **single points of failure** die geen mitigatie hebben:

- Eén Supabase-project in één regio: regio-outage = down tot Supabase terug is (meestal < 1u, soms langer).
- Eén Vercel-account met één owner: verloren 2FA = project-lock-out.
- Eén Mollie-account: als gesuspenheden, zijn nieuwe payments niet te initiëren.
- Eén Resend-account: zelfde.
- Eén GitHub-repo zonder mirror: onwaarschijnlijk te falen, maar account-lockout = lock-out.
- Eén persoon (jij) met root-toegang: bus factor 1.

Per SPOF: mitigatie-voorstel (tweede owner toevoegen, secrets kluis delen met vertrouwde persoon, etc.).

Output: `dr/spofs-en-mitigaties.md`.

---

## DELIVERABLES

1. `data/audits/dr-audit-YYYY-MM-DD.md` — hoofdrapport met:
   - Executive summary (RTO/RPO per systeem, in minuten/uren)
   - Gap-matrix (welk systeem heeft welk DR-niveau)
   - Top-5 aanbevelingen (bijv. "activeer PITR", "zet Storage-backup op R2")
2. `data/audits/dr/state-inventaris.md`
3. `data/audits/dr/backup-status.md`
4. `data/audits/dr/restore-drill-results.md`
5. `data/audits/dr/runbook-db-wiped.md`
6. `data/audits/dr/runbook-storage-weg.md`
7. `data/audits/dr/runbook-vercel-weg.md`
8. `data/audits/dr/spofs-en-mitigaties.md`

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- Bevestig: "Geen restore uitgevoerd in productie. Geen backups gewijzigd. Geen secrets gewijzigd."
- One-pager: TOP-3 DR-gaps (CRITICAL), TOP-3 runbooks die mist, TOP-3 quick wins.

---

## APPENDIX — BESTANDEN & BRONNEN

**Code (als relevant):**
- `scripts/backup*` (bestaan er al?)
- `.github/workflows/*` voor evt. geautomatiseerde dumps
- Supabase config files

**Externe:**
- Supabase backup docs: https://supabase.com/docs/guides/platform/backups
- Supabase PITR: https://supabase.com/docs/guides/platform/backups#point-in-time-recovery
- Vercel deployments: https://vercel.com/docs/deployments
- Mollie API: https://docs.mollie.com/reference/v2/payments-api/list-payments

---

## BEGIN

1. State-inventarisatie (Fase 1) — snel beeld.
2. Backup-status check (Fase 2) — veelal in dashboard te zien.
3. Pauzeer en vraag of ik een staging-project wil opzetten voor Fase 3 drill.
4. Schrijf runbooks (Fase 4) ook al zonder drill — ze zijn geld waard.
5. Tot slot SPOFs.
