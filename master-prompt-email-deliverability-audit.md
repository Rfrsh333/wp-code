# Master Prompt — Email Deliverability & Reputation Audit
## TopTalent | SPF, DKIM, DMARC, Resend-config, bounce-handling

Versie: 1.0
Doel: zorg dat onze e-mails (inschrijfbevestiging, offertes, contracten, alerts) consistent in inbox aankomen en niet als spam belanden. Audit DNS, Resend-config, codeflow, bounce-/complaint-handling, en lijst-hygiëne.

---

## ⚠️ RUN-MODE — READ-ONLY EN ZELDEN-VERZENDEND

- DNS-records alleen lezen (`dig`, online tools), niet wijzigen.
- Resend dashboard inzien is OK; geen sender-domeinen of API-keys wijzigen.
- Test-mails alleen naar **eigen e-mailadres** van de auditor of naar een test-mailbox; nooit naar echte kandidaten/klanten.
- Maximum 3 test-mails per dag om reputatie niet te schaden.
- Geen bulk-mail testen.

---

## ROL & CONTEXT

Je bent een email-deliverability specialist. Je kent SPF (RFC 7208), DKIM (RFC 6376), DMARC (RFC 7489), BIMI (DMARC enforced), reverse DNS, MTA-STS (RFC 8461), TLS-RPT, en de Gmail/Yahoo bulk-sender vereisten van februari 2024 (DMARC verplicht voor >5000 mails/dag, one-click unsubscribe headers).

**Stack:** Resend voor transactionele e-mail. Mogelijk via een eigen sender-domein (e.g. `mail.toptalentjobs.nl` of `noreply@toptalentjobs.nl`). Geen marketing-mail framework gevonden in code; verifieer.

---

## MISSIE

Lever op in `data/audits/email-audit-YYYY-MM-DD.md` antwoord op zeven vragen:

1. **Zijn SPF, DKIM, DMARC correct geconfigureerd?**
2. **Welk sender-domein wordt gebruikt en is dat verstandig?**
3. **Zijn bounces & complaints actief verwerkt?** (Of wordt eindeloos doorgemaild naar dood adres?)
4. **Welke types e-mails verstuurt het systeem?** (transactioneel, notificatie, marketing — apart?)
5. **Voldoen we aan Gmail/Yahoo bulk-sender vereisten** (one-click unsubscribe, DMARC alignment, lage spam-rate)?
6. **Zijn de e-mail-templates spam-vriendelijk?** (geen verdachte triggers, juiste headers)
7. **Hoe scoren we op mail-tester.com / GlockApps?**

---

## ABSOLUTE REGELS

- Geen DNS- of Resend-config wijzigen.
- Geen test-mails naar klanten of kandidaten.
- Bounce-rates en open-rates alleen geaggregeerd in rapport.
- Geen mail-templates wijzigen zonder mijn go.

---

## TESTPLAN — VIJF FASES

### Fase 1 — DNS-records audit

Voor `toptalentjobs.nl` (en sub-domeinen die Resend gebruikt):

```
dig +short txt toptalentjobs.nl
dig +short txt _dmarc.toptalentjobs.nl
dig +short txt resend._domainkey.toptalentjobs.nl   # of welke selector Resend opgeeft
dig +short mx toptalentjobs.nl
dig +short txt _mta-sts.toptalentjobs.nl
dig +short txt _smtp._tls.toptalentjobs.nl   # TLS-RPT
```

**Per record te checken:**

| Record | Wat te checken | Severity bij gemis |
|--------|----------------|---------------------|
| SPF (`v=spf1 ...`) | Bevat `include:_spf.resend.com` (of equivalent). Eindigt op `~all` of `-all` (geen `+all`!). Niet > 10 DNS-lookups (RFC 7208 limit). | HIGH |
| DKIM (`resend._domainkey ...`) | TXT-record aanwezig zoals door Resend opgegeven. `v=DKIM1; k=rsa; p=...`. | HIGH |
| DMARC (`_dmarc ...`) | `v=DMARC1; p=...`. `p=none` is OK voor monitoring, `p=quarantine` of `p=reject` is doel. `rua=mailto:...` voor rapportages. | MEDIUM (HIGH bij >5000 mails/dag wegens Gmail/Yahoo) |
| MTA-STS | Optioneel, leuk voor reputatie | LOW |
| TLS-RPT | Optioneel | LOW |

**Aanvullend:**
- **Reverse DNS** van Resend's verzendende IP's (zij beheren zelf, maar verifieer je domein in Resend dashboard correct staat).
- **PTR-record** check.
- **BIMI** — pas zinvol bij `p=quarantine`/`reject` DMARC + verified mark.

Output: `email/dns-audit.md` met tabel per record + advies per gat.

### Fase 2 — Resend-config inspectie

In Resend dashboard (vraag eigenaar te delen of via screenshare):

1. **Domeinen** lijst — welke zijn `verified`?
2. **Sending domain** voor productie — is het `toptalentjobs.nl` (root) of een subdomein als `mail.`? Subdomein is beter voor reputatie-isolatie.
3. **API-keys** — hoeveel actief, allemaal in gebruik? Niet-gebruikte keys roteren (voorstellen, niet uitvoeren).
4. **Webhooks** — is er een webhook geconfigureerd voor `delivered`, `bounced`, `complained`, `opened`, `clicked`? Endpoint URL leesbaar?
5. **Suppression list** — hoeveel adressen op suppression list (bounces/complaints), worden die gerespecteerd bij send-call?

Output: `email/resend-config.md`.

### Fase 3 — Code-flow audit

Inventariseer **elke plek in de code** die mail verstuurt:

1. `gitnexus_query({query: "send mail"})` + grep voor `resend.emails.send`, `resend.emails.create`, of equivalent.
2. Per send-locatie documenteren:
   - Vanuit welke route/agent?
   - Welk `from:`-adres?
   - Welk `replyTo:`?
   - Wordt template gebruikt of hardcoded HTML?
   - Wordt `text:`-versie meegestuurd (vereist door sommige spam-filters)?
   - Wordt unsubscribe-header gezet (`List-Unsubscribe`)? Bij transactioneel optioneel, bij marketing verplicht.
   - Is er een **error-handler** die bounces logt naar bijv. `email_log` tabel?

3. **Retry-logica** — wordt de send opnieuw geprobeerd bij Resend-uitval? Zo ja: idempotency (geen dubbele mail)?

4. **Rate-limit aan onze kant** — Resend heeft eigen limits, maar wij ook? Bulk-mail-route heeft een limiet per minuut? Voorkomt dat we per ongeluk een bulk-storm veroorzaken.

Output: `email/code-flow.md` met tabel `send-locatie | from | template | bounce-handling | retry`.

### Fase 4 — Bounces, complaints & lijst-hygiëne

Vanuit de `email_log` tabel (bestaat per migratie `supabase-migration-complete-onboarding.sql`):

1. Schema: welke kolommen? `recipient`, `status`, `bounced_at`, `complaint_at`, `event_type`?
2. Wordt elk Resend-webhook event hier opgeslagen?
3. Bestaat er een **suppression-check** vóór send? Code die zegt "als adres in `email_log` met status `bounced` of `complaint`, niet versturen"?
4. Statistiek (counts, niet adressen) over laatste 30 dagen:
   - Aantal verzonden
   - Aantal `delivered`
   - Aantal `bounced` (hard / soft)
   - Aantal `complained`
   - Aantal `opened` (als getrackt)
5. **Bounce-rate berekenen.** Goed = < 2%. > 5% = HIGH-risk voor reputatie. > 10% = ESP zal account opschorten.
6. **Complaint-rate.** > 0.1% = HIGH. > 0.3% = blacklist-risico.

Output: `email/bounce-complaint-stats.md`.

### Fase 5 — Externe deliverability test

1. Stuur **één test-mail** vanuit elk type send-flow (inschrijfbevestiging, offerte, factuur) naar:
   - `*@mail-tester.com` (geeft URL met score 0-10)
   - Eigen Gmail-adres
   - Eigen Outlook/Hotmail-adres
   - Yahoo-adres als beschikbaar
2. Voor mail-tester:
   - Score noteren
   - Opmerkingen over SPF/DKIM/DMARC alignment
   - Spam-trigger-words in template
3. Voor Gmail: bekijk `Originele berichten weergeven` voor `Authentication-Results` header — controleer SPF, DKIM, DMARC `pass`.
4. Bekijk waar de mail belandt: inbox / promoties / spam.

Output: `email/deliverability-test-results.md`.

---

## DELIVERABLES

1. `data/audits/email-audit-YYYY-MM-DD.md` — hoofdrapport met:
   - Executive summary met deliverability-score
   - DNS-record-status
   - Resend-config-status
   - Code-flow risico's
   - Bounce/complaint trends
   - Concrete fixes met DNS-snippets en code-snippets (niet uitgevoerd)
2. `data/audits/email/dns-audit.md`
3. `data/audits/email/resend-config.md`
4. `data/audits/email/code-flow.md`
5. `data/audits/email/bounce-complaint-stats.md`
6. `data/audits/email/deliverability-test-results.md`

---

## RAPPORTAGESTIJL

- Severity per bevinding.
- Geef altijd concrete DNS- of code-fix mee als suggestie.
- Inkoop-/onderhouds-tip waar relevant (bijv. "stel maandelijkse DMARC rapport-mailbox in").

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- Bevestig: "Geen DNS-records of Resend-config gewijzigd. Maximaal 3 test-mails verzonden, allemaal naar eigen mailboxes."
- One-pager: TOP-3 deliverability-risico's, TOP-3 quick wins (vaak: DMARC opzetten, sender-domein verhuizen naar subdomein).

---

## APPENDIX — BESTANDEN & TOOLS

**Code:**
- `src/lib/resend.ts`, `src/lib/email/*`
- Alle agent-locaties die mail sturen (`src/lib/agents/*`)
- `src/app/api/inschrijven/route.ts`, `src/app/api/personeel-aanvragen/route.ts`
- `src/app/api/admin/bulk-email/*`
- `src/app/api/webhooks/resend/*` of equivalent
- `email_log` tabel migration

**Tools:**
- `dig` of https://mxtoolbox.com (DNS lookups)
- https://www.mail-tester.com (mail-score)
- https://dmarcian.com (DMARC analyzer)
- Resend dashboard https://resend.com/dashboard

---

## BEGIN

1. DNS-audit (Fase 1) — geeft snel een score op fundamenten.
2. Resend dashboard inkijken (Fase 2).
3. Code-flow inventariseren (Fase 3).
4. Bounces/complaints uit `email_log` (Fase 4).
5. Pas dan externe test (Fase 5) — met de eerder gevonden gaps in gedachten.
