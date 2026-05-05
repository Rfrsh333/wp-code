# Runbook A: Database Wiped / Corrupted

**Laatst bijgewerkt:** 2026-04-22
**RTO doel:** < 2 uur
**RPO doel:** < 24 uur (daily backup) of < 5 min (PITR)

---

## Detectie

- Sentry errors spiking ("relation does not exist", "connection refused")
- Vercel cron-jobs falen massaal
- Klant/medewerker-portaal toont lege pagina's of 500-errors
- Telegram-alerts stoppen (geen DB = geen data om te melden)

---

## Stap-voor-stap

### T+0 tot T+5 min: Constatering + Communicatie

1. **Bevestig het incident**
   - Open Supabase Dashboard → Project → Database → SQL Editor
   - Run: `SELECT count(*) FROM klanten;`
   - Als error of 0: bevestigd

2. **Communiceer**
   - Stuur via Telegram (handmatig als bot niet werkt): "DATABASE INCIDENT — TopTalent offline"
   - Zet statusmelding op website (als nog bereikbaar): maintenance page via Vercel redirect
   - Informeer key stakeholders per telefoon

3. **Stop alle schrijf-operaties**
   - Vercel → Project → Settings → Pause project (voorkomt inconsistente state)

### T+5 tot T+15 min: Diagnose

4. **Bepaal de oorzaak**
   - Supabase status: https://status.supabase.com/
   - Als Supabase outage: wacht op hun herstel
   - Als eigen fout (verkeerde migratie, DROP TABLE): ga naar restore

5. **Bepaal restore-methode**
   - **PITR beschikbaar?** → Ga naar stap 6A
   - **Alleen daily backup?** → Ga naar stap 6B

### T+15 tot T+60 min: Restore

#### 6A. PITR Restore (als ingeschakeld)

```
Supabase Dashboard → Project → Database → Backups → Point-in-Time Recovery
→ Kies tijdstip: 5 minuten VOOR het incident
→ Start restore
→ Wacht (5-15 minuten)
```

- De restore maakt een NIEUW project aan of herstelt in-place (plan-afhankelijk)
- Als nieuw project: nieuwe connection strings nodig → stap 7

#### 6B. Daily Backup Restore

```
Supabase Dashboard → Project → Database → Backups
→ Download meest recente backup (.sql.gz)
→ Als zelfde project nog bestaat: restore via Supabase support
→ Als project weg: maak nieuw project, restore via psql:

gunzip backup.sql.gz
psql "postgresql://postgres.[ref]:[ww]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f backup.sql
```

**Let op:** Daily backup = max 24 uur dataverlies. Alle facturen, uren, aanmeldingen van die dag zijn verloren.

### T+60 tot T+90 min: App herstellen

7. **Connection string updaten (als nieuw project)**
   ```
   Vercel → Project → Settings → Environment Variables
   → Update:
     NEXT_PUBLIC_SUPABASE_URL = https://[nieuw-ref].supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY = [nieuw]
     SUPABASE_SERVICE_ROLE_KEY = [nieuw]
   → Redeploy (Vercel → Deployments → Redeploy)
   ```

8. **Data-integriteit verifiëren**
   ```sql
   -- Factuur-nummers doorlopend?
   SELECT factuur_nummer FROM facturen ORDER BY created_at DESC LIMIT 10;

   -- Actieve contracten intact?
   SELECT count(*) FROM contracten WHERE status = 'actief';

   -- Medewerkers aanwezig?
   SELECT count(*) FROM medewerkers WHERE status = 'actief';

   -- Uren van vandaag verloren?
   SELECT count(*) FROM uren_registraties
   WHERE created_at::date = CURRENT_DATE;
   ```

9. **RLS-policies verifiëren**
   ```sql
   SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
   -- Vergelijk met migration: 20260422_rls_security_hardening.sql
   ```

### T+90 min: Terug online

10. **Unpause Vercel project**
11. **Test critical paths:**
    - Admin login → dashboard laadt
    - Medewerker portaal → uren zichtbaar
    - Klant portaal → facturen zichtbaar
    - Nieuwe inschrijving → werkt
12. **Communiceer "terug online"**

### T+24 uur: Post-mortem

13. **Schrijf post-mortem**
    - Timeline van incident
    - Root cause
    - Impact (hoeveel data verloren, hoelang offline)
    - Preventieve maatregelen
14. **Herstel verloren data**
    - Check Mollie voor betalingen die niet in DB staan
    - Check Resend logs voor gemiste inschrijvingen
    - Vraag medewerkers om uren opnieuw in te dienen

---

## Benodigde toegang

| Systeem | Wie heeft toegang | URL |
|---------|-------------------|-----|
| Supabase Dashboard | Owner | https://supabase.com/dashboard |
| Vercel Dashboard | Owner | https://vercel.com/dashboard |
| GitHub | Owner | https://github.com/Rfrsh333/wp-code |
| Mollie Dashboard | Owner | https://my.mollie.com/ |

---

## Checklist bij restore

- [ ] Database bereikbaar
- [ ] RLS policies actief
- [ ] Factuur-nummering doorlopend
- [ ] Admin login werkt
- [ ] Medewerker portaal werkt
- [ ] Klant portaal werkt
- [ ] Cron jobs draaien
- [ ] Sentry ontvangt weer events
- [ ] Telegram alerts werken
