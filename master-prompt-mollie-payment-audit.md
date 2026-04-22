# Master Prompt — Mollie Payment Integrity Audit
## TopTalent | Webhook security, idempotency, refunds, reconciliation

Versie: 1.0
Doel: verifieer dat de Mollie-integratie geld-veilig is. Geen dubbele betalingen, geen verloren transacties, geen webhook-fraude, geen race conditions bij gelijktijdige updates. Deliverable: bevindings-rapport + reconciliatie-script + voorgestelde fixes.

---

## ⚠️ RUN-MODE — STRIKT READ-ONLY OP PRODUCTIE

- Geen test-betalingen in productie. Mollie test-mode of staging is OK.
- Geen webhook-replay tegen productie endpoint zonder mijn expliciete go.
- Geen Mollie API-key roteren of payment-status muteren via API.
- Geen e-mails of notificaties triggeren door payment-events na te bootsen.

---

## ROL & CONTEXT

Je bent een payments engineer met ervaring in PSD2-flows, webhook-design en eventueel-consistente systemen. Je kent de Mollie API (v2), HMAC/signature-verificatie van webhooks, idempotency-key patronen, en de bekende valkuilen (status-flapping van `pending` → `paid` → `expired`, partial refunds, chargebacks).

**Stack:**
- Mollie Node SDK of directe REST-calls
- Webhook endpoint waarschijnlijk in `src/app/api/mollie/webhook/route.ts` of `src/app/api/payments/webhook/route.ts`
- Database-tabellen: `facturen`, mogelijk `betalingen` of `payments`, mogelijk `mollie_events` (verifieer)

---

## MISSIE

Lever op in `data/audits/mollie-audit-YYYY-MM-DD.md` antwoord op acht vragen:

1. **Worden webhooks geauthenticeerd?** (signature check, IP-allowlist, of polling-fetch na elke webhook)
2. **Is de webhook idempotent?** (duplicate webhook = geen dubbele update)
3. **Wordt status-update transactioneel afgehandeld?** (geen race condition tussen webhook + frontend-redirect)
4. **Is er een reconciliation-mechanisme?** (dagelijkse vergelijking Mollie ↔ DB)
5. **Worden refunds correct verwerkt?** (status, bookkeeping, klantcommunicatie)
6. **Worden chargebacks gedetecteerd?** (Mollie status `chargeback`)
7. **Falen webhooks safely?** (retry-tolerantie, dead-letter, alerting)
8. **Worden bedragen, BTW en valuta consistent opgeslagen?** (eurocenten vs. euros, ronding)

---

## ABSOLUTE REGELS

- Geen test-payments in productie Mollie account.
- Webhook-replay alleen tegen lokale of staging endpoint.
- Geen wijzigingen in `facturen` of `betalingen` tabellen.
- API-key niet loggen.
- `gitnexus_impact` voor elk fix-voorstel.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Code-walkthrough

1. Vind het webhook-endpoint (`gitnexus_query({query: "mollie webhook"})` + grep `mollie.com`).
2. Lees de **volledige route handler** + alle helpers.
3. Map de flow:
   - Klant rondt betaling af bij Mollie
   - Mollie POST'st webhook naar `/api/mollie/webhook` met **alleen** een `id` (Mollie design)
   - Onze code haalt op met `mollie.payments.get(id)`
   - We updaten lokale staat op basis van `payment.status`
4. Documenteer **elke status-transitie** die de code afhandelt: `open` → `pending` → `paid` / `expired` / `failed` / `canceled` / `chargeback`.
5. Lees ook de **payment-creation** flow: waar wordt een Mollie payment aangemaakt, met welke metadata, welke `redirectUrl` en `webhookUrl`?

Output: `mollie/code-walkthrough.md`.

### Fase 2 — Webhook-security audit

Mollie's webhooks bevatten **geen HMAC-signature**. Mollie's officiële advies: gebruik de webhook alleen als trigger, en haal de status zelf op met de `payment.id` via een geauthenticeerde API-call. Dit is veiliger dan signature-verificatie.

**Checks:**
1. **Doet onze webhook een `GET payments/{id}` voordat we vertrouwen op de body?** Cruciale check. Als we body letterlijk vertrouwen → spoofbaar door iedereen die `id` raadt of vindt.
2. **Heeft het endpoint andere bescherming?** (IP allowlist, secret in URL-pad, etc.) Niet vereist als (1) klopt, maar fijn als extra laag.
3. **Logt webhook-misbruik?** Onbekende payment-id's, malformed bodies, te hoge frequentie → alert?
4. **Rate-limit?** Upstash op het webhook endpoint? Zo ja: zorg dat Mollie's retry-IP's niet ten onrechte 429 krijgen → endpoint is dan stuk.

Output: `mollie/webhook-security.md`.

### Fase 3 — Idempotency & race condition checks

Mollie kan **dezelfde webhook meermaals afleveren** (bij timeout, retry). Twee identieke webhooks moeten niet leiden tot:
- Dubbele DB-rij in `betalingen`
- Dubbele factuur-status update
- Dubbele bevestigingsmail naar klant
- Dubbele aanmaak van vervolg-trigger (bijv. "betaling ontvangen" → "kandidaat boeken")

**Checks:**
1. Wordt elke `payment.id` met `UNIQUE` constraint opgeslagen in een `payments`-tabel?
2. Of wordt voor elke status-update gekeken `IF status != new_status THEN UPDATE`?
3. Is er een `ON CONFLICT DO NOTHING` bij insert?
4. Wordt mail-verzending **na** succesvolle DB-commit gedaan, en met een `email_sent_at` timestamp die voorkomt dat een tweede webhook dezelfde mail triggert?

**Race scenario:**
- Klant rondt betaling af, browser redirect naar success-pagina
- Tegelijk arriveert webhook
- Beide pogen `factuur.status = 'betaald'` te zetten
- Wat als success-pagina de status uit Mollie ophaalt en sneller bij DB is dan de webhook-flow? Dubbele update, mogelijke dubbele e-mail.

Documenteer hoe de code dit aanpakt: rij-locks, advisory locks, idempotency-key tabel, of "first writer wins" met version-check?

Output: `mollie/idempotency-races.md`.

### Fase 4 — Refunds, partial-refunds, chargebacks

1. **Refund-flow:** is er admin-UI voor refunds? Roept die `mollie.payments_refunds.create` aan? Wordt het terug-gehevelde bedrag in DB bijgehouden (`refunded_amount`)?
2. **Partial refunds:** wordt het ondersteund? Wat als 2× partial refund tot meer dan oorspronkelijk bedrag leidt? Is er een sanity check `refund_total <= payment_amount`?
3. **Chargebacks:** Mollie kan een payment-status naar `chargeback` zetten weken later. Wordt deze status verwerkt? Wordt de bijbehorende factuur dan `omgekeerd`/`betwist`? Krijgt admin een alert?
4. **Bookkeeping**: refunds → BTW-correctie? Creditfactuur aangemaakt? Wordt het in `facturen` als aparte regel zichtbaar?

Output: `mollie/refunds-chargebacks.md`.

### Fase 5 — Reconciliation script

Bouw (in `scripts/audit/mollie-reconcile.ts`) een **read-only** script dat:

1. Haalt **alle Mollie payments** op van laatste 30 dagen (paginated).
2. Haalt **alle DB-records** in `betalingen` / `facturen` van zelfde periode.
3. Vergelijkt:
   - Mollie payments zonder bijbehorende DB-rij → MISSING_LOCAL
   - DB-rijen zonder Mollie-id → MISSING_REMOTE (ouder dan kort uitstel)
   - Status-mismatch (Mollie `paid` maar lokaal `open`) → STATUS_DRIFT
   - Bedrag-mismatch → AMOUNT_MISMATCH
4. Print een rapportje, schrijft niets weg.

Run het script tegen productie (alleen-lezen) en lever in `mollie/reconciliation-results-YYYY-MM-DD.md` een samenvatting (counts, niet bedragen letterlijk).

Eventueel: voeg toe als optionele `npm run mollie:reconcile` script en stel voor om dit dagelijks via cron te draaien (separate scheduled task).

Output: `scripts/audit/mollie-reconcile.ts` + `mollie/reconciliation-results-YYYY-MM-DD.md`.

---

## DELIVERABLES

1. `data/audits/mollie-audit-YYYY-MM-DD.md` — hoofdrapport met executive summary, severity per bevinding, voorgestelde fixes (code-snippets, niet uitgevoerd).
2. `data/audits/mollie/code-walkthrough.md`
3. `data/audits/mollie/webhook-security.md`
4. `data/audits/mollie/idempotency-races.md`
5. `data/audits/mollie/refunds-chargebacks.md`
6. `data/audits/mollie/reconciliation-results-YYYY-MM-DD.md`
7. `scripts/audit/mollie-reconcile.ts` — read-only reconciliation script

---

## RAPPORTAGESTIJL

- Severity: CRITICAL (geld kan verloren of dubbel) / HIGH / MEDIUM / LOW.
- Per bevinding: probleem (1 zin), failure-mode-scenario (1 paragraaf), fix-voorstel (code-skelet + gitnexus_impact).
- Eindig met: "Geen test-payments uitgevoerd in productie. Reconciliatie-script alleen-lezen gerund."

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/` en `scripts/audit/`.
- One-pager: TOP-3 payment-bugs/risico's, TOP-3 quick wins, TOP-3 vragen voor jou (bijv. "wil je dat refunds vrijwillig BTW corrigeren?").

---

## APPENDIX — BESTANDEN & BRONNEN

**Code:**
- `src/app/api/mollie/*` of `src/app/api/payments/*`
- `src/app/api/webhook*`
- `src/lib/mollie.ts` of equivalent
- `src/components/admin/FacturenTab.tsx`
- `src/lib/agents/*` zoek "betaling" of "payment"

**Database:**
- `facturen`, `betalingen`/`payments`, `mollie_events` (verifieer welke bestaan)

**Mollie docs:**
- Webhooks: https://docs.mollie.com/overview/webhooks
- Payments API: https://docs.mollie.com/reference/v2/payments-api/get-payment
- Refunds: https://docs.mollie.com/reference/v2/refunds-api/create-payment-refund
- Chargebacks: https://docs.mollie.com/reference/v2/chargebacks-api/list-chargebacks

---

## BEGIN

1. Code-walkthrough eerst (Fase 1). Pauzeer met de flow-map.
2. Webhook-security check (Fase 2). Pauzeer met bevindingen.
3. Race + idempotency analyse (Fase 3).
4. Bouw reconciliation-script (Fase 5) en rapporteer resultaten — dit is vaak het eerste signaal van bestaande issues.
5. Refunds/chargebacks tot slot.
