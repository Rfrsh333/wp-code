# Runbook C: Vercel-project Verwijderd / Account Gecompromitteerd

**Laatst bijgewerkt:** 2026-04-22
**RTO doel:** < 2 uur
**RPO doel:** 0 (code in GitHub, data in Supabase)

---

## Detectie

- Website geeft 404 of Vercel "project not found"
- Cron-jobs stoppen (Supabase data stopt met updaten)
- DNS CNAME wijst naar niet-bestaand Vercel-project
- Onbekende login in Vercel audit-log

---

## Stap-voor-stap

### T+0 tot T+5 min: Constatering

1. **Bevestig het incident**
   - Open https://www.toptalentjobs.nl — laadt niet
   - Open Vercel dashboard — project weg of account locked

2. **Bepaal de oorzaak**
   - Account gehacked? → Stap 3A (beveilig account)
   - Project per ongeluk verwijderd? → Stap 3B (herstel)
   - Vercel outage? → Check https://www.vercelstatus.com/, wacht

### Scenario A: Account gecompromitteerd

3A. **Beveilig het account**
   - Reset wachtwoord via Vercel
   - Activeer/roteer 2FA
   - Revoke alle API tokens
   - Check of env vars gelekt zijn → als ja, roteer ALLE secrets (zie stap 8)

### Scenario B: Project verwijderd

3B. **Maak nieuw Vercel-project aan**
   ```
   1. Login op vercel.com
   2. "Import Project" → GitHub → Rfrsh333/wp-code
   3. Framework: Next.js (auto-detect)
   4. Root directory: ./  (of toptalent-wordpress-html als monorepo)
   5. Node.js versie: 20.x
   6. Build command: next build
   7. Output directory: .next
   ```

### T+5 tot T+30 min: Environment Variables herstellen

4. **Voeg alle env vars toe**

   **Bron 1: `.env.local` op lokale machine**
   - Als beschikbaar: kopieer alle variabelen naar Vercel

   **Bron 2: `.env.example` in repo (variabelen-namen)**
   - Gebruik als checklist, vul waarden in vanuit externe dashboards

   **Bron 3: Externe dashboards**
   | Variabele | Waar te vinden |
   |-----------|---------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
   | `RESEND_API_KEY` | Resend Dashboard → API Keys (nieuw genereren) |
   | `MOLLIE_API_KEY` | Mollie Dashboard → Developers → API Keys |
   | `OPENAI_API_KEY` | OpenAI Platform → API Keys (nieuw genereren) |
   | `UPSTASH_REDIS_REST_URL` | Upstash Console → Database → REST API |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Database → REST API |
   | `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens (nieuw) |

   **Zelf te genereren:**
   | Variabele | Actie |
   |-----------|-------|
   | `JWT_SECRET` | `openssl rand -base64 64` — LET OP: bestaande sessies breken |
   | `CRON_SECRET` | `openssl rand -hex 32` — update ook in GitHub Actions |
   | `KANDIDAAT_TOKEN_SECRET` | `openssl rand -hex 32` — uitstaande onboarding-links breken |
   | `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` — push subs breken |

   **Risico-variabelen (mogelijk verloren):**
   | Variabele | Impact als verloren |
   |-----------|---------------------|
   | `TELEGRAM_BOT_TOKEN` | Alerts stoppen — nieuw aanmaken via @BotFather |
   | `TELEGRAM_CHAT_ID` | Moet opnieuw opgezocht worden |
   | `ADMIN_EMAILS` | Moet uit geheugen/documentatie |
   | `ADMIN_ROLE_MAP` | Moet uit geheugen/documentatie |
   | `GOOGLE_REFRESH_TOKEN` | Opnieuw OAuth flow doorlopen |

### T+30 tot T+60 min: Deploy + DNS

5. **Deploy**
   ```
   Vercel → Project → Deployments → Trigger Deploy
   ```
   Of via CLI:
   ```bash
   cd toptalent-wordpress-html
   npx vercel --prod
   ```

6. **DNS herstellen**
   - Als domein bij Vercel: automatisch gekoppeld
   - Als domein elders (Cloudflare, TransIP): CNAME updaten naar nieuwe Vercel URL
   ```
   www.toptalentjobs.nl → CNAME → cname.vercel-dns.com
   toptalentjobs.nl → A → 76.76.21.21
   ```

7. **Vercel regio-instelling controleren**
   - `vercel.json` zit in de repo → regio `arn1` wordt automatisch toegepast
   - Controleer: Vercel → Project → Settings → Functions → Region = Stockholm

### T+60 tot T+90 min: Verificatie

8. **Als secrets mogelijk gelekt zijn: roteer ALLES**
   ```bash
   # Nieuwe JWT_SECRET → alle bestaande sessies invalid
   # Nieuwe SUPABASE_SERVICE_ROLE_KEY → via Supabase dashboard genereren
   # Nieuwe RESEND_API_KEY → via Resend dashboard
   # Nieuwe MOLLIE_API_KEY → via Mollie dashboard
   # etc.
   ```

9. **Test critical paths**
   - [ ] Homepage laadt
   - [ ] Admin login werkt
   - [ ] Medewerker portaal werkt
   - [ ] Klant portaal werkt
   - [ ] Inschrijfformulier werkt
   - [ ] Factuur-PDF generatie werkt
   - [ ] Cron-jobs lopen (check na volgende scheduled time)

10. **Controleer cron-jobs**
    - `vercel.json` bevat 16 crons → worden automatisch meegedeployed
    - Verifieer: Vercel → Project → Settings → Cron Jobs

### T+90 min: Terug online

11. **Communiceer "terug online"**
12. **Monitor Sentry voor nieuwe errors**
13. **Check Telegram voor alerts**

---

## Waarom dit scenario het minst erg is

- **Code:** 100% in GitHub — geen dataverlies
- **Data:** 100% in Supabase — geen dataverlies
- **Env vars:** Herstelbaar vanuit dashboards + `.env.local`
- **Deployment:** Nieuw Vercel-project in minuten opgezet

**Enige risico:** Als `.env.local` niet beschikbaar is EN wachtwoordmanager niet up-to-date is, zijn zelf-gegenereerde secrets (JWT_SECRET, CRON_SECRET, VAPID_PRIVATE_KEY) verloren. Dit breekt bestaande sessies en push-subscriptions.

---

## Preventieve maatregelen

1. Kopieer alle env vars naar wachtwoordmanager (1Password/Bitwarden)
2. Voeg tweede Vercel team-member toe
3. Activeer 2FA op Vercel
4. Bewaar `.env.local` kopie op versleutelde USB of in kluis
