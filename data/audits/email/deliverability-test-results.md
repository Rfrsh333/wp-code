# Deliverability Test Resultaten

**Datum:** 2026-04-22
**Auditor:** Email Deliverability Audit

---

## Status: NIET UITGEVOERD — Handmatige Actie Vereist

> Fase 5 (externe deliverability tests) vereist het daadwerkelijk verzenden van test-mails. Dit is bewust niet geautomatiseerd uitgevoerd conform de RUN-MODE regels.

---

## Testplan (uit te voeren door eigenaar)

### Stap 1: mail-tester.com

1. Ga naar https://www.mail-tester.com
2. Kopieer het tijdelijke e-mailadres (bijv. `test-abc123@mail-tester.com`)
3. Trigger vanuit het systeem de volgende e-mails naar dat adres:
   - **Inschrijfbevestiging** — via `/api/inschrijven` (maak testinschrijving)
   - **Offerte** — via admin dashboard → offerte versturen
   - **Factuur** — via admin dashboard → factuur e-mailen
4. Check de score op mail-tester.com (doel: 9+/10)

**Let op per test:**

| Check | Verwachting | Risico op basis van audit |
|-------|-------------|--------------------------|
| SPF | FAIL (Resend niet in SPF) | **HOOG** — SPF record mist `include:_spf.resend.com` |
| DKIM | PASS (key aanwezig) | Laag |
| DMARC | PASS (p=none) | Score aftrek voor `p=none` |
| Plain-text versie | FAIL (niet aanwezig) | **HOOG** — geen enkele mail heeft text-versie |
| List-Unsubscribe | FAIL (niet gezet) | **HOOG** voor marketing mails |
| HTML kwaliteit | Onbekend | Te testen |
| Spam-woorden | Onbekend | Te testen |
| Broken links | Onbekend | Te testen |

**Verwachte score: 5-7/10** (vanwege SPF-fail en ontbrekende text-versie)

### Stap 2: Gmail test

1. Stuur test-mail naar eigen Gmail-adres
2. Open de mail → klik op drie puntjes → "Origineel weergeven"
3. Check `Authentication-Results` header:

```
Authentication-Results: mx.google.com;
  dkim=pass header.d=toptalentjobs.nl;
  spf=fail (google.com: ...);          <-- VERWACHT: fail vanwege ontbrekende Resend SPF
  dmarc=fail (p=NONE sp=NONE);         <-- VERWACHT: fail als SPF faalt en DKIM alignment mist
```

4. Noteer waar de mail belandt:
   - [ ] Inbox (primair)
   - [ ] Promoties
   - [ ] Spam

### Stap 3: Outlook/Hotmail test

1. Stuur test-mail naar eigen Outlook/Hotmail-adres
2. Check of mail in inbox of spam belandt
3. Noteer eventuele waarschuwingsbanners

### Stap 4: Yahoo test (optioneel)

1. Stuur test-mail naar Yahoo-adres
2. Yahoo is streng op DMARC — verwacht mogelijk spam-classificatie

---

## Verwachte Resultaten (predictie op basis van DNS-audit)

| Provider | Verwacht resultaat | Reden |
|----------|-------------------|-------|
| Gmail | Promoties of Spam | SPF fail, DMARC `p=none`, geen text-versie |
| Outlook | Mogelijk Spam | SPF fail, strenge Outlook-filters |
| Yahoo | Waarschijnlijk Spam | Yahoo vereist SPF+DKIM+DMARC pass |
| mail-tester.com | Score 5-7/10 | SPF fail, geen text, geen unsubscribe |

---

## Na SPF-fix: Verwachte Verbetering

| Provider | Na fix verwacht | Verschil |
|----------|----------------|----------|
| Gmail | Inbox (primair) | SPF pass → DMARC pass |
| Outlook | Inbox | SPF pass |
| Yahoo | Inbox | Volledige authenticatie |
| mail-tester.com | Score 8-9/10 | +2 punten door SPF pass |

---

## Template voor Resultaten (invullen na test)

### Test 1: Inschrijfbevestiging

| Veld | Resultaat |
|------|-----------|
| Verzonden op | |
| mail-tester score | /10 |
| Gmail: inbox/promoties/spam | |
| Gmail: SPF result | |
| Gmail: DKIM result | |
| Gmail: DMARC result | |
| Outlook: inbox/spam | |
| Yahoo: inbox/spam | |
| Spam-triggers gevonden | |

### Test 2: Offerte

| Veld | Resultaat |
|------|-----------|
| Verzonden op | |
| mail-tester score | /10 |
| Gmail locatie | |
| Outlook locatie | |
| Opmerkingen | |

### Test 3: Factuur

| Veld | Resultaat |
|------|-----------|
| Verzonden op | |
| mail-tester score | /10 |
| Gmail locatie | |
| Outlook locatie | |
| Opmerkingen | |
