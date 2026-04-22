# Master Prompt — Document & Contract Expiry Audit
## TopTalent | ID-kopie, VOG, contracten, certificeringen, retentietermijnen

Versie: 1.0
Doel: bouw een gat-analyse op alle vervaldatum- en retentietermijn-mechanismen in TopTalent. Voorkom dat (a) je iemand uitstuurt zonder geldige papieren — directe boete bij controle — en (b) je documenten langer bewaart dan AVG-conform.

---

## ⚠️ RUN-MODE — READ-ONLY OP PRODUCTIE

- Geen documenten verwijderen.
- Geen statussen of vervaldatums wijzigen.
- Geen automatische notificaties triggeren.
- Lees-only queries op `kandidaat_documenten`, `medewerkers`, `contracten`.

---

## ROL & CONTEXT

Je bent een operations + compliance engineer voor uitzend-platforms. Je kent de drie pijnpunten:
1. **Operationele expiry**: documenten verlopen, kandidaat mag niet werken (ID, VOG, certificaten zoals SVH, BHV).
2. **Contractuele expiry**: uitzendcontract loopt af, klantcontract loopt af.
3. **AVG-retentie**: documenten mogen niet langer dan strikt nodig bewaard worden.

**Stack:** Next.js + Supabase. Tabellen: `kandidaat_documenten`, `medewerkers`, `contracten`, mogelijk `certificeringen` (verifieer).

---

## MISSIE

Lever op in `data/audits/expiry-audit-YYYY-MM-DD.md` antwoord op zes vragen:

1. **Welke documenten/data hebben een vervaldatum?** Inventariseer.
2. **Heeft elk daarvan een `expires_at`-veld in DB?** Zo niet → blinde vlek.
3. **Bestaat er een proces dat tijdig waarschuwt voor verloop?** (Cron, agent, admin-notificatie?)
4. **Wordt verlopen status correct gehandhaafd?** (Bijv. medewerker met verlopen ID kan niet ingeplant worden.)
5. **Worden documenten conform AVG-retentietermijn verwijderd na einde dienstverband?**
6. **Welke automatisering kan helpen?** (Voorstellen voor expiry-agent.)

---

## ABSOLUTE REGELS

- Geen documenten muteren of verwijderen.
- Geen statussen wijzigen.
- Geen test-notificaties versturen.
- `gitnexus_impact` voor elke voorgestelde code-fix.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Inventarisatie van alles met een vervaldatum

| Categorie | Voorbeeld | Wettelijke / praktische vervaldatum | Reden bewaren / verwijderen |
|-----------|-----------|---|---|
| ID-kopie kandidaat | Paspoort/ID-kaart | Geldigheid v/h document zelf (5-10j) | Wet ID-plicht: bewaren tot 5j na einde dienstverband |
| VOG | Verklaring Omtrent Gedrag | Veelal advies "max 12 maanden geldig", afhankelijk van inlener | Inlener-eis |
| BHV-certificaat | Bedrijfshulpverlening | 1 jaar na uitgifte | Operationeel |
| SVH-verklaring | Sociale Hygiëne (horeca) | Geen vervaldatum, maar eens per X jaar verfrissing | Operationeel |
| Verklaring Goed Gedrag horeca | Drank- en horecawet, leidinggevende | Geldig tot wijzigingen | Operationeel |
| Diploma's | Koksdiploma etc. | Geen vervaldatum | Bewijs |
| Allergielijst-training | Alergiekaart-cursus | 1-3 jaar | Praktisch |
| Werkvergunning (indien niet-EU kandidaat) | TWV / GVVA | Variabel, vaak 1-3j | Wettelijk: niet werken zonder geldige vergunning = boete tot €8k per persoon |
| Uitzendcontract | Fase A/B/C-overeenkomst | Per fase variabel | Wettelijke fase-overgangen |
| Klantcontract / SLA | Mantelovereenkomst | Per overeenkomst | Commercieel |
| Bankgegevens | IBAN | Geen | Bewaren tijdens dienstverband |
| BSN | - | Mag alleen tijdens arbeidsrelatie + 5j fiscaal | AVG + fiscale wet |

Output: `expiry/inventaris.md`.

### Fase 2 — Database-veld check per categorie

Voor elke categorie uit Fase 1, zoek in DB-schema:

1. Bestaat een veld `expires_at` / `valid_until` / `geldig_tot` / `vervaldatum` op de relevante tabel?
2. Wordt dat veld **gevuld** bij upload/registratie? Of staat 't vaak `NULL`?
3. Heeft het een index voor snelle "expires within N days" queries?

```sql
-- Voorbeeld read-only query
SELECT
  document_type,
  COUNT(*) AS totaal,
  COUNT(expires_at) AS met_vervaldatum,
  COUNT(*) - COUNT(expires_at) AS zonder_vervaldatum
FROM kandidaat_documenten
GROUP BY document_type
ORDER BY totaal DESC;
```

Output: `expiry/db-veld-coverage.md` — matrix met per type: heeft veld, % gevuld.

### Fase 3 — Notificatie-/agent-flow check

1. Bestaat er een **scheduled task** of cronjob die dagelijks/wekelijks naar verlopende documenten zoekt? (`gitnexus_query({query: "expiring documents"})`, `cron`, `scheduled`, `pg_cron` queries.)
2. Welke admin-tab toont expirende docs? (LikelyOnboardingAnalytics, PipelineHealthPanel, of speciale view?)
3. Worden kandidaten zelf **vooraf** gemaild ("je VOG verloopt over 30 dagen, vernieuw")?
4. Worden klanten gewaarschuwd als hun mantelovereenkomst verloopt?

Als geen automatisering: dat is een **expiry-agent feature gap**.

Output: `expiry/automatisering-status.md`.

### Fase 4 — Inplanning-blocker check

Cruciale operationele check: kan een medewerker met verlopen documenten **toch** worden ingepland?

1. In de `MatchingTab` / `PlanningTab` / `DienstenTab`: bij selectie van medewerker voor dienst — wordt zijn `expires_at` van ID/VOG gecontroleerd?
2. Bestaat er een DB-constraint of trigger die `INSERT INTO uren` blokkeert als ID verlopen is?
3. Of leunt het op admin-discipline ("Jan moet er zelf op letten")?

**Specifiek voor horeca:** als kandidaat 16/17 is en wordt ingepland voor dienst met alcohol-bediening of na 23:00 — wordt dat geblokkeerd? (Overlapt met `master-prompt-nl-compliance-audit.md`, kruisverwijzing OK.)

Output: `expiry/inplanning-blockers.md`.

### Fase 5 — Retentie en verwijdering

AVG: documenten niet langer bewaren dan nodig. Praktisch:

| Document | Bewaartermijn na einde dienstverband | Wie bepaalt |
|----------|---------------------------------------|-------------|
| ID-kopie | 5 jaar | Wet op de Identificatieplicht / fiscale wet |
| Loonadministratie | 7 jaar | Fiscale wet |
| BSN | 7 jaar (fiscaal), anders korter | Fiscale wet |
| VOG | Geen wettelijk minimum, vernietigen na 12 maanden goede praktijk | Best practice |
| CV | Tot 4 weken na sollicitatie tenzij toestemming voor langere periode (max 1 jaar) | AVG + AP-richtlijn |
| Inschrijving zonder follow-up | Max 4 weken (Autoriteit Persoonsgegevens-richtlijn) | AVG |

Check:
1. Bestaat er een script/agent die periodiek **automatisch** documenten + records verwijdert na hun retentietermijn?
2. Zo niet: is er minstens een dashboard dat overdue retentie toont?
3. Wordt bij "recht op vergeten"-verzoek alles direct gewist (incl. Storage-objects, OpenAI-logs, e-mail-archief)?

Output: `expiry/retentie-status.md`.

### Fase 6 — Voorstel: expiry-agent

Op basis van Fases 1-5, ontwerp een expiry-agent (in stijl van je andere agents in `src/lib/agents/`):

- **Trigger:** dagelijks 06:00 via scheduled task.
- **Stap 1:** zoek docs met `expires_at` binnen 60/30/7 dagen.
- **Stap 2:** stuur kandidaat + admin notificatie via Resend (template per dringendheid).
- **Stap 3:** als verlopen + nog niet gemarkeerd: zet `documenten_compleet = false`, sluit beschikbaarheid voor inplanning.
- **Stap 4:** zoek docs voorbij retentietermijn → markeer voor verwijdering (admin moet handmatig akkoord geven of auto-purge).
- **Stap 5:** rapport in admin dashboard ("Pipeline Health — Document Expiry").

Lever een SKILL.md-stijl spec voor deze agent in `expiry/expiry-agent-spec.md`.

---

## DELIVERABLES

1. `data/audits/expiry-audit-YYYY-MM-DD.md` — hoofdrapport met:
   - Executive summary (top-5 expiry/retentie-gaps)
   - Per-categorie status
   - Voorgestelde fixes (met DB-migratie-snippets, niet uitgevoerd)
   - Voorstel expiry-agent
2. `data/audits/expiry/inventaris.md`
3. `data/audits/expiry/db-veld-coverage.md`
4. `data/audits/expiry/automatisering-status.md`
5. `data/audits/expiry/inplanning-blockers.md`
6. `data/audits/expiry/retentie-status.md`
7. `data/audits/expiry/expiry-agent-spec.md`

---

## RAPPORTAGESTIJL

- Severity: CRITICAL (boetekans of werknemer zonder papieren) / HIGH (AVG-overtreding) / MEDIUM / LOW.
- Per gap: probleem, scenario, fix-voorstel, gitnexus_impact.

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- One-pager: TOP-3 expiry-risico's, TOP-3 retentie-AVG-gaps, voorstel expiry-agent in 1 alinea.

---

## APPENDIX — BESTANDEN & BRONNEN

**Code:**
- `src/components/admin/onboarding/*`
- `src/components/admin/PipelineHealthPanel.tsx`
- `src/components/admin/OnboardingAnalytics.tsx`
- `src/lib/agents/*` (zoek bestaande expiry-handlers)
- API: `src/app/api/admin/kandidaat-documenten/*`, `kandidaat-workflow/*`, `medewerkers/*`, `contracten/*`

**DB:**
- `kandidaat_documenten`, `medewerkers`, `contracten` migraties

**Externe:**
- AP-richtlijn sollicitanten: https://autoriteitpersoonsgegevens.nl/themas/werk-en-uitkering/sollicitatie-en-werving
- Wet op Identificatieplicht: https://wetten.overheid.nl/BWBR0006297
- Belastingdienst bewaarplicht: https://www.belastingdienst.nl (zoek "bewaarplicht")

---

## BEGIN

1. Inventarisatie (Fase 1).
2. DB-veld coverage (Fase 2) — query-driven.
3. Automatisering check (Fase 3).
4. Inplanning blocker check (Fase 4).
5. Retentie (Fase 5).
6. Voorstel expiry-agent (Fase 6) — pas na bovenstaande fases om gericht ontwerp te kunnen leveren.
