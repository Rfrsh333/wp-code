# DNS Audit — toptalentjobs.nl

**Datum:** 2026-04-22
**Auditor:** Email Deliverability Audit (geautomatiseerd)

---

## Samenvatting

| Record | Status | Severity |
|--------|--------|----------|
| SPF | PROBLEEM — Resend niet opgenomen | HIGH |
| DKIM (Resend) | OK | - |
| DMARC | ZWAK — `p=none`, geen `rua` | MEDIUM |
| MX | OK | - |
| MTA-STS | Ontbreekt | LOW |
| TLS-RPT | Ontbreekt | LOW |
| BIMI | Niet mogelijk (DMARC te zwak) | LOW |

**Totaalscore DNS: 4/10 — Onvoldoende**

---

## Gedetailleerde Bevindingen

### 1. SPF Record

**Huidig record:**
```
v=spf1 mx include:op-email.eu ~all
```

**Bevindingen:**
- `include:op-email.eu` — dit is de mailserver-provider (MX = `mail.op-email.eu`), correct voor uitgaande mail via dat platform.
- **KRITIEK: `include:_spf.resend.com` ONTBREEKT.** Resend verstuurt e-mails namens `toptalentjobs.nl`, maar hun IP's staan niet in het SPF-record. Dit betekent dat SPF zal **FAILEN** voor alle e-mails verstuurd via Resend.
- `~all` (softfail) — acceptabel, maar bij volwassen configuratie is `-all` (hardfail) beter.
- DNS-lookup count: 2 (mx + include:op-email.eu) — ruim binnen de 10-lookup limiet.

**Severity: HIGH**

**Voorgestelde fix:**
```
v=spf1 mx include:op-email.eu include:_spf.resend.com ~all
```

> Later, wanneer DMARC op `quarantine`/`reject` staat:
> ```
> v=spf1 mx include:op-email.eu include:_spf.resend.com -all
> ```

---

### 2. DKIM Record (Resend)

**Record: `resend._domainkey.toptalentjobs.nl`**
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC+x36HCXxaDTAPddkfu0r7iqxuQzqOZOXGSLWjO54l7kBiPHjlli/RWufrqQjYagdfdRXdlLnv8tgeBRiGD3Dckj/IS1dpn20a03pl6cfVT5tjEL0YbJWsiYzy1r6sJADxzuMsFDMP+JAZke2QWOnAmGtmOWGTanhAts2ktH50LwIDAQAB
```

**Bevindingen:**
- DKIM-record aanwezig met RSA 1024-bit key.
- Selector `resend` is standaard Resend-selector — correct.
- Key is geldig en volledig.
- **Opmerking:** 1024-bit RSA is minimaal acceptabel. 2048-bit is aanbevolen voor toekomstbestendigheid. Dit wordt door Resend beheerd; controleer of ze upgraden.

**Severity: OK (geen actie vereist)**

---

### 3. DMARC Record

**Huidig record:**
```
v=DMARC1; p=none;
```

**Bevindingen:**
- `p=none` — DMARC staat in monitoring-modus. E-mails die falen worden **niet** geweigerd of in quarantaine geplaatst. Dit beschermt NIET tegen spoofing.
- **KRITIEK: Geen `rua=` tag.** Zonder `rua` ontvangt TopTalent geen DMARC-rapporten. Er is dus geen zicht op wie e-mails verstuurt namens het domein.
- Geen `ruf=` (forensic reports) — optioneel maar nuttig.
- Geen `adkim=` of `aspf=` alignment-modus gespecificeerd (default = relaxed, wat OK is).
- **Gmail/Yahoo vereiste (feb 2024):** Bij >5000 mails/dag is DMARC verplicht. `p=none` voldoet technisch, maar `p=quarantine` of `p=reject` is het doel.

**Severity: MEDIUM** (HIGH als >5000 mails/dag)

**Voorgestelde fix (fase 1 — monitoring met rapportage):**
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@toptalentjobs.nl; ruf=mailto:dmarc-forensic@toptalentjobs.nl; adkim=r; aspf=r; pct=100;
```

**Voorgestelde fix (fase 2 — na 30 dagen monitoring en SPF-fix):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@toptalentjobs.nl; adkim=r; aspf=r; pct=25;
```

**Voorgestelde fix (fase 3 — volledige bescherming):**
```
v=DMARC1; p=reject; rua=mailto:dmarc-reports@toptalentjobs.nl; adkim=r; aspf=r; pct=100;
```

---

### 4. MX Record

**Huidig record:**
```
5 mail.op-email.eu.
```

**Bevindingen:**
- Eén MX-record, priority 5.
- `mail.op-email.eu` is de inkomende mailserver.
- Geen redundantie (één MX). Bij uitval geen fallback.
- Relevant voor email: inkomende replies en bounce-notificaties komen hier aan.

**Severity: OK** (redundantie is nice-to-have)

---

### 5. MTA-STS (RFC 8461)

**Status:** Niet geconfigureerd (geen `_mta-sts.toptalentjobs.nl` TXT-record)

**Impact:** Zonder MTA-STS kunnen aanvallers TLS-verbindingen downgraden bij inkomende mail (man-in-the-middle). Optioneel maar goed voor reputatie bij Gmail.

**Severity: LOW**

---

### 6. TLS-RPT

**Status:** Niet geconfigureerd (geen `_smtp._tls.toptalentjobs.nl` TXT-record)

**Impact:** Geen TLS-foutrapportages ontvangen. Optioneel.

**Severity: LOW**

---

### 7. Reverse DNS / PTR

Resend beheert hun eigen verzendende IP's en PTR-records. Zolang het domein correct geverifieerd is in Resend, is dit geen probleem. **Verifieer in Resend dashboard dat domein-status "Verified" is.**

---

### 8. BIMI

**Status:** Niet mogelijk. BIMI vereist DMARC met `p=quarantine` of `p=reject`. Huidige policy is `p=none`.

**Roadmap:** Pas implementeren na DMARC enforcement (fase 3).

---

## Actieplan (prioriteit)

| # | Actie | Impact | Effort |
|---|-------|--------|--------|
| 1 | **SPF: voeg `include:_spf.resend.com` toe** | Alle Resend-mails passen nu SPF | 5 min DNS-wijziging |
| 2 | **DMARC: voeg `rua=mailto:...` toe** | Zicht op wie mailt namens domein | 5 min DNS-wijziging |
| 3 | **DMARC: verhoog naar `p=quarantine`** (na 30 dagen monitoring) | Bescherming tegen spoofing | 5 min DNS-wijziging |
| 4 | **DMARC: verhoog naar `p=reject`** (na 60 dagen) | Volledige bescherming | 5 min DNS-wijziging |
| 5 | MTA-STS configureren | Betere TLS-afdwinging | 30 min |
| 6 | BIMI opzetten | Logo in Gmail inbox | 1-2 uur + VMC certificaat |
