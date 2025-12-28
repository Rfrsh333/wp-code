# API Key Rotatie Handleiding

**Laatste update:** 2025-12-28
**Status:** Huidige keys zijn veilig (niet publiek gedeeld)

## Waarom API Key Rotatie?

API keys roteren is een security best practice:
- ✅ Vermindert impact bij eventuele key lekkage
- ✅ Voldoet aan compliance vereisten
- ✅ Beperkt window voor misbruik
- ✅ Best practice: elke 90 dagen roteren

## Huidige API Keys

### 1. Resend Email API
**Locatie:** `RESEND_API_KEY` in .env.local en Vercel
**Gebruik:** Email verzending (contact formulieren, facturen, herinneringen)
**Huidige key:** `re_XzaNKi2A_*****` (begint met `re_`)

### 2. Google reCAPTCHA v3
**Locatie:** `RECAPTCHA_SECRET_KEY` en `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
**Gebruik:** Spam bescherming op formulieren
**Huidige site key:** `6LfnkCssAAAA*****`

---

## 🔄 Stap-voor-Stap Rotatie

### Resend API Key Roteren

**Voorbereiding:**
1. Zorg dat je toegang hebt tot https://resend.com/api-keys
2. Plan een moment waarop weinig traffic is (aanbevolen: 02:00-04:00)
3. Test eerst in development

**Stappen:**

**1. Maak nieuwe key aan in Resend**
```bash
# 1. Ga naar: https://resend.com/api-keys
# 2. Klik "Create API Key"
# 3. Name: "toptalent-production-2025-Q2" (gebruik kwartaal in naam)
# 4. Permissions: "Full Access" (of specifiek: Sending Access)
# 5. Klik "Create"
# 6. ⚠️ KOPIEER DE KEY NU! (wordt niet meer getoond)
```

**2. Test nieuwe key lokaal**
```bash
# Update .env.local met nieuwe key
echo "RESEND_API_KEY=re_NEW_KEY_HERE" >> .env.local.test

# Test email verzending
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_NEW_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "info@toptalentjobs.nl",
    "to": "rachid.ouaalit@hotmail.com",
    "subject": "Test nieuwe Resend API key",
    "html": "<p>Als je dit ontvangt werkt de nieuwe key!</p>"
  }'

# Verwacht: Status 200 + email ontvangen
```

**3. Update production (Vercel)**
```bash
# Via Vercel Dashboard:
# 1. Ga naar: https://vercel.com/dashboard
# 2. Selecteer project → Settings → Environment Variables
# 3. Find "RESEND_API_KEY"
# 4. Klik Edit → Update value → Save
# 5. Selecteer: Production + Preview + Development
# 6. Redeploy app (Deployments tab → Redeploy)

# Of via CLI:
vercel env rm RESEND_API_KEY production
echo "re_NEW_KEY_HERE" | vercel env add RESEND_API_KEY production
vercel --prod
```

**4. Verifieer in productie**
```bash
# Test contact formulier op live site
# Check Vercel logs voor errors:
vercel logs --follow

# Test deze endpoints:
# - https://toptalentjobs.nl/contact (stuur test bericht)
# - Check admin panel: facturen verzenden
```

**5. Revoke oude key**
```bash
# Pas na 24 uur verificatie:
# 1. Ga naar https://resend.com/api-keys
# 2. Find oude key (toptalent-production-2024-Q4)
# 3. Klik ••• → Delete
# 4. Bevestig

# Update .env.local met nieuwe key
```

---

### Google reCAPTCHA Keys Roteren

**Voorbereiding:**
1. Toegang tot: https://www.google.com/recaptcha/admin
2. Noteer huidige site key (frontend zal tijdelijk niet werken tijdens switch)

**Stappen:**

**1. Maak nieuwe reCAPTCHA v3 site**
```bash
# 1. Ga naar: https://www.google.com/recaptcha/admin/create
# 2. Label: "toptalentjobs.nl - Production 2025 Q2"
# 3. reCAPTCHA type: "Score based (v3)"
# 4. Domains:
#    - toptalentjobs.nl
#    - www.toptalentjobs.nl
#    - vercel.app (voor previews)
# 5. Accept Terms → Submit
# 6. Kopieer BEIDE keys:
#    - Site Key (begint met 6L...)
#    - Secret Key
```

**2. Update lokale environment**
```bash
# Update .env.local
cat >> .env.local << 'EOF'
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LxxxxxxxxxxxxxxxxxxxNEW
RECAPTCHA_SECRET_KEY=6LxxxxxxxxxxxxxxxxxxxNEW_SECRET
EOF
```

**3. Test lokaal**
```bash
# Start development server
npm run dev

# Test alle formulieren:
# - http://localhost:3000/contact
# - http://localhost:3000/personeel-aanvragen
# - http://localhost:3000/inschrijven

# Check browser console voor reCAPTCHA errors
# Verwacht: Score tussen 0.0-1.0 in network tab
```

**4. Update Vercel environment**
```bash
# Via Dashboard (aanbevolen):
# 1. Vercel Dashboard → Project → Settings → Env Vars
# 2. Update "NEXT_PUBLIC_RECAPTCHA_SITE_KEY" (alle environments)
# 3. Update "RECAPTCHA_SECRET_KEY" (alle environments)
# 4. Redeploy

# Of via CLI:
vercel env rm NEXT_PUBLIC_RECAPTCHA_SITE_KEY production
vercel env rm RECAPTCHA_SECRET_KEY production

echo "6LxxxNEW" | vercel env add NEXT_PUBLIC_RECAPTCHA_SITE_KEY production
echo "6LxxxNEW_SECRET" | vercel env add RECAPTCHA_SECRET_KEY production

# BELANGRIJK: Ook voor Preview en Development!
```

**5. Verifieer productie**
```bash
# 1. Wacht tot deployment klaar is
# 2. Test elk formulier op live site
# 3. Check reCAPTCHA admin: https://www.google.com/recaptcha/admin
#    → Zie je nieuwe traffic?
# 4. Check Vercel logs voor reCAPTCHA errors

# Als alles werkt na 48 uur:
# Verwijder oude reCAPTCHA site uit Google admin
```

---

## 🗓️ Rotatie Schema

**Aanbevolen frequentie:**
- **Resend API:** Elke 90 dagen (Q1, Q2, Q3, Q4)
- **reCAPTCHA:** Elke 180 dagen (of bij security incident)

**Volgende rotatie data:**
```
Resend API Key:
- Huidig:  2024-Q4 (geroteerd: 2024-12-01)
- Volgend: 2025-Q1 (roteren op: 2025-03-01)

reCAPTCHA Keys:
- Huidig:  2024-H2 (geroteerd: 2024-07-01)
- Volgend: 2025-H1 (roteren op: 2025-07-01)
```

**Herinneringen instellen:**
```bash
# Voeg toe aan calendar:
# - 2025-03-01: "Resend API key roteren (Q1 2025)"
# - 2025-07-01: "reCAPTCHA keys roteren (H1 2025)"
```

---

## 🚨 Incident Response

**Als een key is gelekt (GitHub commit, logs, etc.):**

**Direct (binnen 5 minuten):**
```bash
# 1. REVOKE gelekte key onmiddellijk
#    - Resend: https://resend.com/api-keys → Delete
#    - reCAPTCHA: https://www.google.com/recaptcha/admin → Disable

# 2. Maak nieuwe key (volg stappen hierboven)

# 3. Update productie ASAP (accepteer downtime als nodig)
```

**Binnen 1 uur:**
```bash
# 1. Check usage logs voor ongeautoriseerd gebruik:
#    - Resend: Email history voor vreemde verzendingen
#    - Vercel logs: Onbekende IP's in rate limiting

# 2. Notificeer belanghebbenden als er misbruik was

# 3. Analyseer hoe lekkage gebeurde:
#    - Git history check
#    - Verwijder uit commit history (git filter-branch)
#    - Update .gitignore
```

**Binnen 24 uur:**
```bash
# 1. Documenteer incident
# 2. Update security procedures
# 3. Overweeg 2FA voor services
```

---

## ✅ Checklist Na Rotatie

```
□ Nieuwe key getest in development
□ Oude key nog 24u actief gehouden (rollback mogelijkheid)
□ Productie deployment succesvol
□ Alle formulieren getest op live site
□ Geen errors in Vercel logs (24u monitoring)
□ Oude key gerevoked
□ .env.local updated
□ Team geïnformeerd (als relevant)
□ Volgende rotatie datum in calendar
```

---

## 📚 Referenties

- **Resend Docs:** https://resend.com/docs/dashboard/api-keys
- **reCAPTCHA Admin:** https://www.google.com/recaptcha/admin
- **Vercel Env Vars:** https://vercel.com/docs/projects/environment-variables

---

**Support:** rachid.ouaalit@hotmail.com
