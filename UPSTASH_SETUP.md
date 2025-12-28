# Upstash Redis Rate Limiting Setup

## Waarom Upstash?

De huidige in-memory rate limiting werkt **niet** in productie omdat:
- Vercel gebruikt serverless functions (elke request = nieuwe instance)
- Rate limits worden gereset bij elke nieuwe instance
- Geen persistente state tussen requests

Upstash Redis lost dit op met:
- ✅ Serverless-first design
- ✅ Gratis tier (10,000 requests/dag)
- ✅ Automatische scaling
- ✅ Persist state tussen alle instances

## Setup (5 minuten)

### 1. Maak Gratis Upstash Account

1. Ga naar: https://console.upstash.com
2. Sign up met GitHub (gratis)
3. Verify je email

### 2. Maak Redis Database

1. Klik "Create Database"
2. **Settings:**
   - Name: `toptalent-ratelimit`
   - Region: `eu-west-1` (Amsterdam - laagste latency)
   - Type: **Kies "Free"** (10,000 requests/dag)
3. Klik "Create"

### 3. Kopieer Credentials

Na aanmaken zie je:
```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AY...
```

### 4. Voeg toe aan Vercel

#### Optie A: Via Vercel Dashboard (Aanbevolen)
1. Ga naar: https://vercel.com/dashboard
2. Selecteer je project
3. Ga naar **Settings → Environment Variables**
4. Voeg toe:
   ```
   UPSTASH_REDIS_REST_URL = https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN = AY...
   ```
5. **Belangrijk:** Selecteer "Production", "Preview", en "Development"
6. Klik "Save"
7. **Redeploy** je app via "Deployments" tab

#### Optie B: Via Vercel CLI
```bash
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

### 5. Lokale Development

Voeg toe aan `.env.local`:
```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AY...
```

**Let op:** `.env.local` staat al in `.gitignore` ✅

## Verificatie

### Test Rate Limiting

```bash
# In browser console:
for (let i = 0; i < 10; i++) {
  fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* test data */ })
  }).then(r => console.log(i, r.status));
}
```

**Verwacht:**
- Eerste 5 requests: Status 200
- Request 6+: Status 429 (Too Many Requests)

### Check Upstash Dashboard

1. Ga naar Upstash Console
2. Klik op je database
3. Zie "Commands Executed" teller stijgen bij elke request

## Monitoring

### Upstash Analytics
- **Dashboard:** https://console.upstash.com
- **Metrics:** Zie real-time command usage
- **Alerts:** Upstash waarschuwt bij 80% van limit

### Custom Monitoring (Optioneel)

Voeg toe aan `src/lib/rate-limit-redis.ts`:
```typescript
// Log rate limit hits
if (!result.success) {
  console.warn(`[RATE LIMIT] Blocked ${identifier}`, {
    limit: result.limit,
    reset: new Date(result.reset).toISOString()
  });

  // Optional: Send to analytics
  // await track('rate_limit_hit', { identifier, endpoint });
}
```

## Pricing & Limits

### Free Tier (Huidige)
- 10,000 commands/dag
- 256 MB storage
- ✅ Voldoende voor kleine sites

### Bij Groei
- **Pay As You Go:** $0.20 per 100K commands
- **Estimate voor 100K requests/dag:** ~$6/maand
- **Pro Plan ($10/maand):** 1M commands + analytics

## Troubleshooting

### Error: "Redis not configured"
**Oplossing:** Check of environment variables correct zijn in Vercel dashboard.

### Rate limit werkt niet
**Oplossing:**
1. Check Vercel logs: `vercel logs`
2. Verify credentials in Upstash dashboard
3. Redeploy: `git push origin main`

### Wil terug naar in-memory
**Temporary fix:**
```typescript
// In src/lib/rate-limit-redis.ts
const redis = null; // Force fallback
```

## Security Best Practices

✅ **Al geïmplementeerd:**
- Environment variables niet in git
- Token in Vercel secrets
- Fail-open bij errors (availability > denial)

⚠️ **Extra hardening (optioneel):**
- IP whitelist voor admin routes
- CAPTCHA na 3 mislukte pogingen
- Alert bij suspicious activity

## Links

- **Upstash Docs:** https://upstash.com/docs/redis
- **Rate Limit Library:** https://github.com/upstash/ratelimit
- **Vercel Integration:** https://vercel.com/integrations/upstash

---

**Laatste update:** 2025-12-28
**Geschatte setup tijd:** 5 minuten
**Support:** rachid.ouaalit@hotmail.com
