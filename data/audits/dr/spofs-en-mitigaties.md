# Fase 5: Single Points of Failure + Mitigaties

**Datum:** 2026-04-22
**Status:** `ACTION_REQUIRED`

---

## Overzicht

| # | SPOF | Impact | Huidige mitigatie | Voorgestelde mitigatie | Ernst |
|---|------|--------|-------------------|----------------------|-------|
| S-01 | Eén Supabase-project, één regio | Regio-outage = totale downtime | Geen | Read-replica of multi-project setup | HOOG |
| S-02 | Geen Storage backup | Onherstelbaar documentverlies | Geen | Wekelijkse sync naar R2/S3 | KRITIEK |
| S-03 | Geen off-site DB backup | Afhankelijk van Supabase retentie | Supabase daily backup (7-14d) | Dagelijks pg_dump naar extern | KRITIEK |
| S-04 | Eén Vercel-account, één owner | Account-lockout = site offline | Code in GitHub | Tweede team-member, 2FA | HOOG |
| S-05 | Eén GitHub-account | Account-lockout = geen deploys | Lokale Git clones | Mirror naar Gitea/GitLab, tweede collaborator | MIDDEL |
| S-06 | Eén Mollie-account | Suspensie = geen betalingen | Geen | Tweede PSP als fallback (Stripe) | MIDDEL |
| S-07 | Eén Resend-account | Suspensie = geen email | Geen | Fallback email provider config | MIDDEL |
| S-08 | Bus factor 1 (één persoon) | Enige persoon met root-toegang | Geen | Gedeelde kluis, nood-SOP document | KRITIEK |
| S-09 | Secrets alleen lokaal/Vercel | Vercel-verlies = secrets kwijt | .env.local lokaal | Wachtwoordmanager (1Password) | HOOG |
| S-10 | Geen statuspage | Klanten weten niet dat het down is | Geen | Upptime/Betterstack statuspage | LAAG |

---

## Detail per SPOF

### S-01: Eén Supabase-project, één regio

**Risico:** Supabase host in één AWS-regio. Bij regio-outage is de gehele database + storage onbereikbaar.

**Historisch:** Supabase heeft in 2024-2025 meerdere korte outages gehad (< 1 uur). Langere outages (> 4 uur) zijn zeldzaam maar niet uitgesloten.

**Mitigatie-opties:**
1. **Read-replica in andere regio** (Supabase Pro+ feature) — kost ~$50/maand
2. **Tweede Supabase-project als warm standby** — handmatig sync, complex
3. **Accepteer het risico** — voor een MKB-uitzendbureau is < 1u downtime/jaar acceptabel

**Aanbeveling:** Accepteer risico, maar zorg dat PITR actief is voor snelle recovery.

### S-02: Geen Storage Backup

**Risico:** Supabase Storage heeft GEEN automatische backup. Alle documenten (CV's, ID-bewijzen, contracten) staan op één plek zonder kopie.

**Impact bij verlies:**
- WID-overtreding (geen ID-kopieën meer)
- Contractuele problemen (geen ondertekende contracten meer)
- SNA-audit faalt direct

**Mitigatie:**
```bash
# Wekelijks backup-script naar Cloudflare R2 (gratis tot 10GB)
# Toevoegen aan GitHub Actions als wekelijkse cron
```

**Kosten:** ~$0-5/maand voor R2 storage
**Effort:** 2-4 uur implementatie

**Aanbeveling:** DIRECT implementeren. Dit is het grootste risico.

### S-03: Geen Off-site DB Backup

**Risico:** Supabase daily backups zijn gebonden aan het Supabase-project. Als het project verwijderd wordt, zijn ook de backups weg.

**Mitigatie:**
```bash
# Dagelijks pg_dump naar externe locatie
# GitHub Action + encrypted upload naar R2/S3
```

**Kosten:** ~$0-5/maand
**Effort:** 2-4 uur implementatie

### S-04: Eén Vercel-account

**Risico:** Als de eigenaar 2FA verliest of het account wordt gehacked.

**Mitigatie:**
1. Voeg tweede team-member toe (gratis op Hobby plan)
2. Activeer 2FA als nog niet actief
3. Bewaar backup-codes in wachtwoordmanager

### S-05: Eén GitHub-account

**Risico:** GitHub-account geblokkeerd of gehacked.

**Mitigatie:**
1. Voeg tweede collaborator toe aan repo
2. Optioneel: mirror naar Gitea/GitLab (automatisch via cron)
3. Lokale clone is al een backup

### S-06: Eén Mollie-account

**Risico:** Account-suspensie door Mollie (compliance-redenen) = geen betalingen.

**Mitigatie:**
1. Zorg dat Mollie KYC up-to-date is
2. Overweeg Stripe als backup-PSP (configureerbaar in code)

### S-07: Eén Resend-account

**Risico:** Account-suspensie = geen transactionele email meer (facturen, reminders, onboarding).

**Mitigatie:**
1. Monitor deliverability in Resend dashboard
2. Fallback: direct SMTP via andere provider (SendGrid, Postmark)

### S-08: Bus Factor 1

**Risico:** Als de enige persoon met root-toegang tot Supabase, Vercel, GitHub, Mollie, Resend onbereikbaar wordt.

**Dit is het meest onderschatte risico voor een eenmanszaak.**

**Mitigatie:**
1. **Gedeelde wachtwoordkluis** — deel een 1Password vault met een vertrouwde persoon (mede-eigenaar, boekhouder, IT-contact)
2. **Nood-SOP document** — fysiek document in kluis met:
   - Inloggegevens voor alle services (of 1Password master-wachtwoord)
   - Stap-voor-stap herstelplan (vereenvoudigd)
   - Contactgegevens Supabase support, Vercel support
3. **Testament-clausule** — bij bedrijfs-continuïteitsplan

### S-09: Secrets alleen lokaal

**Risico:** Bij diefstal/brand laptop + Vercel-verlies zijn alle secrets weg.

**Mitigatie:**
1. Exporteer alle env vars naar 1Password/Bitwarden
2. Update bij elke secrets-rotatie
3. `.env.local` kopie op versleutelde externe schijf

### S-10: Geen Statuspage

**Risico:** Klanten bellen/mailen als site down is — geen zelfbediening.

**Mitigatie:**
1. Gratis: Betterstack (betterstack.com) of Upptime (GitHub-gebaseerd)
2. Koppel aan Supabase + Vercel health checks
3. DNS naar statuspage als main site down is

---

## Prioritering

### DIRECT (deze week)

1. **S-02:** Storage backup opzetten → R2/S3
2. **S-03:** Dagelijks pg_dump → externe opslag
3. **S-09:** Alle secrets naar wachtwoordmanager
4. **S-08:** Nood-SOP document schrijven + delen met vertrouwd persoon

### BINNENKORT (deze maand)

5. **S-04:** Tweede Vercel team-member
6. **S-05:** Tweede GitHub collaborator
7. **S-10:** Statuspage opzetten

### LATER (dit kwartaal)

8. **S-01:** PITR activeren in Supabase
9. **S-06:** Stripe als backup-PSP evalueren
10. **S-07:** Fallback email provider configureren

---

`ACTION_REQUIRED`
