# Email Deliverability & Reputation Audit

**Organisatie:** TopTalent Jobs
**Domein:** toptalentjobs.nl
**Datum:** 2026-04-22
**Versie:** 1.0

---

## Executive Summary

**Deliverability Score: 4/10 — ONVOLDOENDE**

TopTalent verstuurt e-mails via Resend (transactioneel + acquisitie/marketing), maar de DNS-configuratie is incompleet: **SPF mist de Resend include**, waardoor alle via Resend verzonden mails SPF-authenticatie falen. DKIM is correct geconfigureerd. DMARC staat op `p=none` zonder rapportage, wat geen bescherming biedt tegen spoofing.

In de codebase zijn **49 email-verzendlocaties** gevonden. Geen enkele mail bevat een plain-text alternatief of List-Unsubscribe header. De bulk-email route checkt niet of een adres eerder gebounced is. De webhook-handler voor bounces/complaints werkt goed, maar de suppression-check voor het daadwerkelijk verzenden ontbreekt op cruciale plekken.

**Geschatte impact:** E-mails belanden waarschijnlijk regelmatig in spam bij Gmail, Outlook en Yahoo. Dit schaadt de kandidaat-ervaring (gemiste inschrijfbevestigingen), klantrelaties (gemiste offertes/facturen) en acquisitie-conversie.

---

## Scorecard

| Categorie | Score | Status |
|-----------|-------|--------|
| SPF | 2/10 | KRITIEK — Resend niet in SPF |
| DKIM | 9/10 | GOED — correct geconfigureerd |
| DMARC | 3/10 | ZWAK — p=none, geen rapportage |
| Sender-domein | 5/10 | MATIG — root-domein, geen subdomein |
| Bounce-handling | 6/10 | REDELIJK — webhook werkt, maar geen pre-send check |
| Code-kwaliteit | 3/10 | SLECHT — geen text-versie, geen unsubscribe, geen retry |
| Gmail/Yahoo compliance | 2/10 | KRITIEK — niet compliant |
| Template-kwaliteit | 5/10 | MATIG — hardcoded HTML, geen text |
| **Totaal** | **4/10** | **ONVOLDOENDE** |

---

## Beantwoording van de Zeven Vragen

### 1. Zijn SPF, DKIM, DMARC correct geconfigureerd?

**Deels.** DKIM is correct. SPF mist `include:_spf.resend.com` — alle Resend-mails falen SPF. DMARC is minimaal (`p=none`) zonder rapportage.

→ Zie: [email/dns-audit.md](email/dns-audit.md)

### 2. Welk sender-domein wordt gebruikt en is dat verstandig?

**Root-domein `toptalentjobs.nl`.** Adressen: `info@`, `noreply@`, `facturen@`. Dit is **niet optimaal** — reputatieschade op transactionele mail treft ook het hoofddomein. Aanbeveling: subdomein `mail.toptalentjobs.nl` voor transactioneel, `news.toptalentjobs.nl` voor marketing.

### 3. Zijn bounces & complaints actief verwerkt?

**Gedeeltelijk.** Resend webhook handler verwerkt bounces en complaints correct, zet flags, stopt campagnes en alerteert via Telegram. **Maar:** de bulk-email route en sommige andere send-locaties checken de suppression-flags niet voor verzending. Er wordt dus potentieel doorgemailed naar dode adressen.

→ Zie: [email/bounce-complaint-stats.md](email/bounce-complaint-stats.md)

### 4. Welke types e-mails verstuurt het systeem?

| Type | Aantal locaties | Voorbeelden |
|------|----------------|-------------|
| Transactioneel | ~38 | Inschrijfbevestiging, wachtwoord reset, facturen, offertes, contracten |
| Notificatie | ~6 | Shift-aanbiedingen, uren goedgekeurd, document review |
| Marketing/Acquisitie | ~5 | Outreach, drip campagnes, bulk-email, AI-generated outreach |

→ Zie: [email/code-flow.md](email/code-flow.md)

### 5. Voldoen we aan Gmail/Yahoo bulk-sender vereisten?

**Nee.** Vereisten (feb 2024, >5000 mails/dag):

| Vereiste | Status |
|----------|--------|
| SPF pass | FAIL |
| DKIM pass | PASS |
| DMARC record | PASS (minimaal) |
| One-click unsubscribe | FAIL — nergens geïmplementeerd |
| Spam rate < 0.3% | ONBEKEND — geen monitoring |
| Valid forward/reverse DNS | PASS (Resend beheert) |

### 6. Zijn de e-mail-templates spam-vriendelijk?

**Risico's:**
- Geen plain-text alternatief (spam-filter trigger)
- Hardcoded HTML in ~30 locaties (moeilijk consistent te houden)
- Geen `text/plain` MIME-part (sommige filters vereisen dit)
- Geen preheader-tekst
- Template-kwaliteit niet getest op spam-trigger-woorden

### 7. Hoe scoren we op mail-tester.com?

**Niet getest** (conform RUN-MODE regels). Verwachte score: **5-7/10** op basis van DNS-analyse. SPF-fail alleen al kost 2-3 punten.

→ Zie: [email/deliverability-test-results.md](email/deliverability-test-results.md) (testplan + template)

---

## TOP-3 Deliverability Risico's

| # | Risico | Severity | Impact |
|---|--------|----------|--------|
| 1 | **SPF-record mist Resend** — alle via Resend verzonden mails falen SPF-authenticatie | CRITICAL | Mails belanden in spam bij Gmail/Outlook/Yahoo |
| 2 | **Geen List-Unsubscribe op marketing-mails** — niet compliant met Gmail/Yahoo bulk-sender vereisten | HIGH | Marketing-mails worden geblokkeerd of als spam geclassificeerd |
| 3 | **Bulk-email route negeert suppression-flags** — gebounced adressen ontvangen opnieuw mail | HIGH | Bounce-rate stijgt, ESP kan account opschorten |

---

## TOP-3 Quick Wins

| # | Actie | Effort | Impact |
|---|-------|--------|--------|
| 1 | **SPF fix: voeg `include:_spf.resend.com` toe** | 5 minuten (DNS) | SPF pass voor alle Resend-mails → uit spam |
| 2 | **DMARC: voeg `rua=mailto:dmarc-reports@toptalentjobs.nl` toe** | 5 minuten (DNS) | Zicht op wie mailt namens domein |
| 3 | **Bulk-email: voeg `.eq("email_bounced", false)` toe** | 5 minuten (code) | Voorkomt herhaalzending naar dode adressen |

---

## Alle Bevindingen (geordend op severity)

### CRITICAL

| # | Bevinding | Locatie | Fix |
|---|----------|---------|-----|
| C1 | SPF-record mist `include:_spf.resend.com` | DNS TXT `toptalentjobs.nl` | Wijzig naar: `v=spf1 mx include:op-email.eu include:_spf.resend.com ~all` |
| C2 | Geen List-Unsubscribe header op marketing-mails | 5 send-locaties (acquisitie, bulk, drip) | Voeg `List-Unsubscribe` en `List-Unsubscribe-Post` headers toe |

### HIGH

| # | Bevinding | Locatie | Fix |
|---|----------|---------|-----|
| H1 | Bulk-email negeert `email_bounced` flag | `src/app/api/admin/bulk-email/route.ts` | Voeg `.eq("email_bounced", false)` toe aan query |
| H2 | Geen plain-text versie bij mails | Alle 49 send-locaties | Maak `stripHtml()` utility, voeg `text:` parameter toe |
| H3 | Geen centrale email-service (duplicatie) | 49 losse send-calls | Centraliseer in `src/lib/email-service.ts` |
| H4 | Acquisitie-campagne route filtert bounced leads niet expliciet | `src/app/api/admin/acquisitie/campagnes/route.ts` | Voeg tag-filter toe voor `email-bounced` |

### MEDIUM

| # | Bevinding | Locatie | Fix |
|---|----------|---------|-----|
| M1 | DMARC `p=none` zonder `rua` rapportage | DNS TXT `_dmarc.toptalentjobs.nl` | Voeg `rua=mailto:...` toe, plan upgrade naar `p=quarantine` |
| M2 | Root-domein als sender (geen isolatie) | Resend config | Migreer naar `mail.toptalentjobs.nl` subdomein |
| M3 | Geen retry-logica bij send-failures | 48/49 send-locaties | Implementeer in centrale email-service |
| M4 | `email_log` logt niet alle mail-types | Email log systeem | Breid uit naar alle send-locaties |
| M5 | Geen soft/hard bounce onderscheid | Webhook handler | Voeg bounce-type parsing toe |
| M6 | Dynamische from-adressen niet gevalideerd | Booking/reminder routes | Valideer tegen Resend-verified domeinen |
| M7 | Geen bounce-rate monitoring/alerting | Monitoring | Stel dagelijkse cron in die bounce-rate berekent en alert bij >2% |

### LOW

| # | Bevinding | Locatie | Fix |
|---|----------|---------|-----|
| L1 | MTA-STS niet geconfigureerd | DNS | Optioneel: configureer voor betere TLS |
| L2 | TLS-RPT niet geconfigureerd | DNS | Optioneel: configureer voor foutrapportage |
| L3 | BIMI niet mogelijk (DMARC te zwak) | DNS | Na DMARC enforcement: BIMI + VMC certificaat |
| L4 | Geen preheader-tekst in templates | HTML templates | Voeg `<span style="display:none">` preheader toe |
| L5 | DKIM key is 1024-bit (minimaal) | Resend | Controleer of Resend upgrade naar 2048-bit |

---

## Implementatie Roadmap

### Week 1 — DNS Fixes (geen code nodig)
1. SPF: voeg `include:_spf.resend.com` toe
2. DMARC: voeg `rua=mailto:dmarc-reports@toptalentjobs.nl` toe
3. Verifieer in Resend dashboard dat domein "Verified" is

### Week 2 — Kritieke Code Fixes
4. Bulk-email: voeg `email_bounced` check toe
5. Acquisitie: voeg `email-bounced` tag filter toe
6. Voer mail-tester.com test uit (verwacht nu 8-9/10 na SPF fix)

### Week 3-4 — Structurele Verbeteringen
7. Maak centrale `sendEmail()` service met:
   - Suppression-check
   - Plain-text generatie
   - List-Unsubscribe (voor marketing)
   - Error logging naar `email_log`
   - Retry met exponential backoff
8. Migreer alle 49 send-locaties naar centrale service

### Maand 2 — Reputatie Opbouwen
9. Monitor DMARC-rapporten (30 dagen)
10. Verhoog DMARC naar `p=quarantine` (pct=25)
11. Plan subdomein-migratie (`mail.toptalentjobs.nl`)

### Maand 3 — Volledige Bescherming
12. Verhoog DMARC naar `p=reject`
13. Overweeg BIMI-implementatie
14. Implementeer bounce-rate alerting

---

## Deelrapporten

1. [DNS Audit](email/dns-audit.md)
2. [Resend Configuratie](email/resend-config.md)
3. [Code-Flow Audit](email/code-flow.md)
4. [Bounce & Complaint Statistieken](email/bounce-complaint-stats.md)
5. [Deliverability Test Resultaten](email/deliverability-test-results.md)

---

## Bevestiging

- Geen DNS-records gewijzigd
- Geen Resend-configuratie gewijzigd
- Geen test-mails verzonden
- Geen code gewijzigd
- Alleen leesacties uitgevoerd (DNS lookups + code-analyse)
