# LinkedIn API Integratie — Setup Handleiding

## 1. LinkedIn Developer App aanmaken

1. Ga naar [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Klik "Create App"
3. Vul in:
   - **App name**: TopTalent Jobs
   - **LinkedIn Page**: Koppel aan de TopTalent Jobs company page
   - **App logo**: Upload het TopTalent logo
4. Ga naar het **Auth** tab
5. Voeg **Redirect URLs** toe:
   - Production: `https://toptalentjobs.nl/api/linkedin/callback`
   - Development: `http://localhost:3000/api/linkedin/callback`

## 2. Products aanvragen

Ga naar het **Products** tab en vraag aan:
- **Share on LinkedIn** — voor het posten van content
- **Sign In with LinkedIn using OpenID Connect** — voor OAuth
- **Marketing Developer Platform** (optioneel) — voor analytics

## 3. Scopes

De volgende scopes worden gebruikt:
- `openid` — OpenID Connect login
- `profile` — Profiel info ophalen
- `w_member_social` — Posts plaatsen namens de gebruiker
- `r_organization_social` (optioneel) — Company page analytics

## 4. Environment Variables

Voeg toe aan `.env.local` (development) en Vercel (production):

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=je_client_id
LINKEDIN_CLIENT_SECRET=je_client_secret
LINKEDIN_REDIRECT_URI=https://toptalentjobs.nl/api/linkedin/callback

# Wordt automatisch ingevuld na OAuth flow:
# Tokens worden opgeslagen in de linkedin_connections tabel
```

## 5. Database migratie

Voer de migratie uit in Supabase SQL Editor:
```bash
# Bestand: supabase-migration-linkedin-integratie.sql
# Bevat: linkedin_connections, linkedin_posts, linkedin_templates tabellen
# Plus: 20 seed templates
```

## 6. Cron Jobs (Vercel)

Voeg toe aan `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/linkedin-publish",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/linkedin-analytics",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/linkedin-token-refresh",
      "schedule": "0 3 * * *"
    }
  ]
}
```

## 7. Verificatie

1. Ga naar Admin > Content > LinkedIn tab
2. Klik "Verbinden met LinkedIn" in Instellingen
3. Doorloop de OAuth flow
4. Genereer een test post (draft)
5. Controleer of templates laden

## Rate Limits

LinkedIn API rate limits:
- **Posts**: max 150 per dag per organisatie
- **Analytics**: max 100 requests per dag
- **OAuth**: standaard rate limits

De cron job publiceert maximaal 1 post per 15 minuten.
