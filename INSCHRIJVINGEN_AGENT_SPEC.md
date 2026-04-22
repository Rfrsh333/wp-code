# Inschrijvingen-agent — Specificatie (SKILL.md-stijl)

Status: ontwerp v0.1
Project: toptalent (Next.js + Supabase + Resend)
Doel: nieuwe kandidaat-aanmeldingen automatisch triëren, documenteren en in beweging zetten, met menselijke fiat op alles wat naar buiten gaat.

---

## 1. Wat deze agent wel en niet doet

### Wel
- Detecteert nieuwe rijen in `inschrijvingen` (status = `nieuw`).
- Voert een volledigheidscheck uit op intake-velden.
- Doet een duplicate-check tegen bestaande kandidaten.
- Vult `onboarding_checklist` (JSONB) met de eerste set checks.
- Zet `onboarding_status` van `nieuw` → `in_beoordeling` (met audit-trail).
- Schrijft een korte triage-notitie naar `interne_notitie`.
- Maakt taken aan in `kandidaat_taken` voor de recruiter.
- Stelt een **conceptmail** op (nog niet verzonden) van het juiste type.
- Logt alle acties in `kandidaat_contactmomenten` (type `notitie`, `created_by = 'agent'`).
- Plaatst een samenvatting in `data/agent-runs/inschrijvingen-YYYY-MM-DD.md` (en eventueel in een Telegram/Signal-kanaal als dat later wordt toegevoegd).

### Niet
- Verzendt zelf geen e-mails. Concept staat klaar, jij of een recruiter drukt op verzenden.
- Raakt **niet** `facturen`, `contracten`, `betalingen`, of Mollie-data aan.
- Wijzigt **niet** `onboarding_status` naar `goedgekeurd`, `inzetbaar` of `afgewezen` — dat blijft een mens.
- Verwijdert nooit rijen.
- Heeft geen toegang tot `.env*`, `.vercel`, of de Supabase service-role key.
- Negeert standaard `is_test_candidate = false` rijen tijdens **test-modus**, en draait alléén op `is_test_candidate = true` totdat je groen licht geeft voor productie.

---

## 2. Trigger — drie opties van eenvoudig naar geavanceerd

| Optie | Hoe | Latency | Setup |
|------|-----|---------|-------|
| A. Polling (scheduled task) | Elk uur SELECT op `inschrijvingen` waar `created_at > last_run_at` en `onboarding_status = 'nieuw'`. | < 60 min | Nul setup buiten een Supabase read-only key. |
| B. Supabase webhook | Database webhook bij INSERT op `inschrijvingen` → POST naar deployed endpoint. | seconden | Endpoint hosten (Vercel API route of Edge Function). |
| C. Supabase Realtime | Subscribe op `inschrijvingen` channel. | seconden | Long-running proces nodig (VPS, Railway, of OpenClaw). |

**Aanbeveling:** start met A. Stap door naar B als de doorlooptijd van een uur te lang voelt.

---

## 3. Stap-voor-stap draaiboek per nieuwe inschrijving

### Stap 0 — Filter
```sql
SELECT * FROM inschrijvingen
WHERE onboarding_status = 'nieuw'
  AND is_test_candidate = TRUE          -- in productie verwijderen
  AND id NOT IN (
    SELECT inschrijving_id
    FROM kandidaat_contactmomenten
    WHERE created_by = 'agent'
      AND contact_type = 'notitie'
      AND summary LIKE 'agent_triage_done%'
  );
```
Idempotency: agent slaat een markering in `kandidaat_contactmomenten` zodat hij dezelfde rij niet twee keer triëert.

### Stap 1 — Volledigheidscheck
Verwachte velden: `naam`, `email`, `telefoon`, `geboortedatum`, `horeca_ervaring`, `gewenste_functies` (niet leeg), `talen` (niet leeg), `eigen_vervoer` (boolean expliciet gezet).

Output: `onboarding_checklist.intake_volledig = true/false` plus per veld een sub-flag.

### Stap 2 — Format-validatie
- E-mail: regex + DNS MX-check (optioneel via `dns.resolveMx`).
- Telefoon: NL-format normaliseren naar E.164.
- IBAN (indien aanwezig): mod-97 check.
- Geboortedatum: leeftijd ≥ 16 jaar (jouw beleid bevestigen).

### Stap 3 — Duplicate-check
```sql
SELECT id, naam, email, created_at
FROM inschrijvingen
WHERE id != $new_id
  AND (
    LOWER(email) = LOWER($new_email)
    OR REGEXP_REPLACE(telefoon, '[^0-9]', '', 'g') = $new_telefoon_normalized
  )
ORDER BY created_at DESC
LIMIT 5;
```
Bij hit: `onboarding_checklist.duplicate_match = [{id, naam, similarity}]` en taak voor recruiter ("verifieer mogelijk duplicaat").

### Stap 4 — Status-update
```sql
UPDATE inschrijvingen
SET onboarding_status = CASE
      WHEN $intake_volledig THEN 'in_beoordeling'
      ELSE 'documenten_opvragen'
    END,
    onboarding_checklist = $checklist_jsonb,
    interne_notitie = COALESCE(interne_notitie || E'\n', '') || $agent_note
WHERE id = $id;
```

### Stap 5 — Taak voor recruiter
```sql
INSERT INTO kandidaat_taken (inschrijving_id, title, note, due_at, created_by)
VALUES (
  $id,
  CASE
    WHEN $duplicate_hit THEN 'Verifieer mogelijk duplicaat'
    WHEN NOT $intake_volledig THEN 'Bel kandidaat: intake incompleet'
    ELSE 'Beoordeel intake en plan kennismaking'
  END,
  $human_readable_summary,
  NOW() + INTERVAL '24 hours',
  'agent'
);
```

### Stap 6 — Conceptmail klaarzetten (NIET verzenden)
Schrijf concept naar `data/agent-runs/concepts/<id>.md` met:
- Subject
- Bestemming (e-mail uit inschrijving)
- Body (gerenderd uit Resend-template), template gekozen op basis van:
  - Intake compleet + geen duplicate → template `bevestiging`
  - Intake incompleet → template `documenten_opvragen` (met portal-token-link, zelf gegenereerd via bestaande helper)
  - Duplicate verdacht → géén concept, alleen taak

### Stap 7 — Audit-log
```sql
INSERT INTO kandidaat_contactmomenten (inschrijving_id, contact_type, summary, created_by)
VALUES ($id, 'notitie', 'agent_triage_done: ' || $checklist_summary, 'agent');
```

### Stap 8 — Daily report
Append regel aan `data/agent-runs/inschrijvingen-YYYY-MM-DD.md`:
```
- 14:32 | Jan de Boer (id=…) | intake_volledig=true | duplicate=none
        | status: nieuw → in_beoordeling | concept: bevestiging.md
```

---

## 4. Veiligheidsgrenzen (hard)

- **Leesbaar**: `inschrijvingen`, `kandidaat_documenten`, `email_log`, `kandidaat_contactmomenten`, `kandidaat_taken`.
- **Schrijfbaar**: `inschrijvingen.onboarding_status` (alleen nieuw → in_beoordeling / documenten_opvragen), `inschrijvingen.onboarding_checklist`, `inschrijvingen.interne_notitie` (append-only), `kandidaat_taken` (insert), `kandidaat_contactmomenten` (insert).
- **Verboden**: alles in `facturen`, `contracten`, `klanten`, `medewerkers`, `betalingen`, `gebruikers`, `auth.*`, `storage.objects`. DELETE op welke tabel dan ook. Wijzigen van bestaande rijen in `kandidaat_taken` of `kandidaat_contactmomenten`.
- **DB-credentials**: agent gebruikt een aparte Postgres role `agent_inschrijvingen` met expliciete GRANTs. Géén service-role key. Voorbeeld:
  ```sql
  CREATE ROLE agent_inschrijvingen LOGIN PASSWORD '...';
  GRANT SELECT ON inschrijvingen, kandidaat_documenten, email_log,
                  kandidaat_contactmomenten, kandidaat_taken TO agent_inschrijvingen;
  GRANT UPDATE (onboarding_status, onboarding_checklist, interne_notitie)
        ON inschrijvingen TO agent_inschrijvingen;
  GRANT INSERT ON kandidaat_taken, kandidaat_contactmomenten TO agent_inschrijvingen;
  ```
- **Prompt-injection-bescherming**: input-velden uit `inschrijvingen` (vooral `interne_notitie`, vrije tekst) worden in de agent-prompt **niet** als instructie behandeld — de agent gebruikt een vaste systeemprompt en behandelt rijen als data, niet als commando's.

---

## 5. Test-modus → productie-overgang

1. **Week 1 — schaduw-modus, alleen test-rijen.** Filter `is_test_candidate = TRUE`. Maak 5–10 fake inschrijvingen via SQL of je formulier. Check de output in `data/agent-runs/`.
2. **Week 2 — schaduw-modus, alle rijen, geen DB-write.** Agent maakt rapport, maar `UPDATE`/`INSERT` worden vervangen door log-regels.
3. **Week 3 — semi-live op echte rijen.** Status-updates aan, taak-creatie aan, conceptmail klaarzetten — verzending blijft handmatig.
4. **Week 4+** — eventueel auto-verzending van `bevestiging`-mails (laagste risico template), na expliciete go.

---

## 6. Foutafhandeling

| Scenario | Reactie |
|----------|---------|
| Supabase onbereikbaar | Retry 3×, dan rapport in `data/agent-runs/errors-YYYY-MM-DD.md` en stoppen. |
| Onverwacht veld ontbreekt | Sla rij over, log waarschuwing, ga door met volgende. |
| Duplicate-check geeft >5 hits | Zet rij op `in_beoordeling` met taak "handmatige review nodig — veel matches". |
| `gewenste_functies` bevat onbekende waarde | Notitie toevoegen, geen blokkade. |
| Agent crasht halverwege | Idempotency via `kandidaat_contactmomenten`-marker zorgt dat herstart geen dubbele acties doet. |

---

## 7. Observability

- Elke run schrijft `data/agent-runs/inschrijvingen-YYYY-MM-DD.md` met: aantal nieuwe rijen, aantal getriaged, duplicate-hits, gemiddelde verwerkingstijd, fouten.
- Wekelijks (vrijdag) genereert agent een mini-rapport: hoeveel concept-mails verzonden vs. genegeerd vs. handmatig herschreven door recruiter. Helpt om template-kwaliteit te tunen.

---

## 8. Wat er nodig is om dit te kunnen draaien

| Onderdeel | Status nu | Actie |
|----------|-----------|------|
| Supabase Postgres role `agent_inschrijvingen` | ❌ | SQL toevoegen aan migraties |
| Read-only/scoped DB-credentials | ❌ | In secrets-manager (niet `.env.local`) |
| Agent-runner | Optie A: scheduled task in Cowork (geen extra hosting). Optie B: Vercel cron + API route. Optie C: VPS met Claude Agent SDK of OpenClaw. |
| Resend templates aanwezig | Vermoedelijk ✅ (zie `email_log.email_type`) | Verifiëren dat templates voor `bevestiging` en `documenten_opvragen` actueel zijn |
| Test-rijen | ❌ | Maken via SQL of formulier met `is_test_candidate = TRUE` |

---

## 9. Open vragen voor jou

1. Welke leeftijdsondergrens hanteer je voor kandidaten?
2. Mag de agent zelf `documenten_opvragen`-mails verzenden, of altijd alleen klaarzetten?
3. Zijn er functies in `gewenste_functies` die direct moeten leiden tot afwijzing (bijv. niet-aangeboden diensten)?
4. Wil je notificaties in een kanaal (Telegram/Signal/iMessage) of alleen het dagelijkse `.md`-rapport?
5. Wie is de "recruiter" die de taken in `kandidaat_taken` ziet — komt dat al ergens binnen in een dashboard?

---

## 10. Volgende concrete stap

Als je deze spec in grote lijnen oké vindt:
1. Ik schrijf een SQL-fragment voor de `agent_inschrijvingen`-role en GRANTs (apart bestand zodat jij 'm reviewt vóór uitvoering).
2. Ik genereer 5 test-inschrijvingen als seed-script (`is_test_candidate = TRUE`).
3. Ik bouw een dry-run versie als scheduled task die alleen rapport genereert, geen DB-writes.
4. Na een week dry-run kijken we of de output klopt en zetten dan de eerste echte schrijfactie aan.

Geen enkele stap raakt productiedata zonder dat jij eerst groen licht geeft.
