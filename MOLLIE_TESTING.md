# 🧪 Mollie Payment Testing Guide

Complete gids voor het testen van Mollie betalingen in TopTalent.

---

## 📋 Quick Start (Simpelste Methode)

### Stap 1: Test API Key instellen

1. Ga naar [Mollie Dashboard](https://my.mollie.com/)
2. Schakel naar **Test modus** (toggle rechtsboven)
3. Ga naar **Developers** → **API keys**
4. Kopieer je **Test API key** (begint met `test_`)

### Stap 2: Update .env.local

```bash
# Wijzig van live naar test key
MOLLIE_API_KEY=test_jouwTestKey

# Voor lokaal testen (zie Webhook Setup verderop)
MOLLIE_WEBHOOK_BASE_URL=https://jouw-ngrok-url.ngrok.io
```

### Stap 3: Test met scripts

```bash
# Maak een test boete aan
npx tsx scripts/create-test-boete.ts

# Of test direct de Mollie API
npx tsx scripts/test-mollie.ts

# Check status van een betaling
npx tsx scripts/check-mollie-payment.ts tr_xxxxx
```

---

## 🔧 Complete Test Setup

### 1️⃣ Webhook Setup (voor lokaal testen)

Mollie moet je webhook kunnen bereiken. Gebruik **ngrok**:

```bash
# Installeer ngrok (eenmalig)
brew install ngrok

# Start dev server
npm run dev

# In nieuw terminal venster: start tunnel
ngrok http 3000
```

Je krijgt een URL zoals: `https://abc123.ngrok-free.app`

**Update .env.local:**
```bash
MOLLIE_WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
```

**Alternatief - localtunnel:**
```bash
npm install -g localtunnel
lt --port 3000
```

### 2️⃣ Volledige Flow Testen

**Optie A - Via UI (end-to-end test):**

1. **Maak test boete aan:**
   ```bash
   npx tsx scripts/create-test-boete.ts
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Login als medewerker:**
   - Ga naar: http://localhost:3000/medewerker/login
   - Login met de email uit het script

4. **Betaal de boete:**
   - Klik op "Betalen via Mollie"
   - Je wordt doorgestuurd naar Mollie checkout

5. **Test betaling afronden:**
   - Kies **Creditcard**
   - Gebruik test kaart: `5555 5555 5555 4444`
   - CVV: `123`
   - Vervaldatum: `12/2030`

6. **Verifieer:**
   - Je wordt teruggestuurd naar dashboard
   - Boete status is nu "betaald"
   - Check webhook logs in terminal

**Optie B - Direct API test:**

```bash
# Test Mollie connectie en maak test betaling
npx tsx scripts/test-mollie.ts

# Kopieer de checkout URL uit output
# Open in browser en rond betaling af

# Check status
npx tsx scripts/check-mollie-payment.ts tr_xxxxx
```

---

## 💳 Test Kaarten

### ✅ Succesvolle betalingen
- **Creditcard:** `5555 5555 5555 4444`
- **CVV:** `123`
- **Vervaldatum:** Elke datum in toekomst

### ❌ Mislukte betalingen
- **Creditcard:** `5555 5555 5555 5557`

### 📋 Andere test methoden
- **iDEAL:** Kies "ING" → kies "Paid"
- **Bancontact:** Vul willekeurige kaart in
- **PayPal:** Login met Mollie test account

Zie [Mollie Test Mode Guide](https://docs.mollie.com/overview/testing) voor alle opties.

---

## 🔍 Troubleshooting

### "MOLLIE_API_KEY is not configured"
✅ Check of `.env.local` bestaat en de key bevat

### Webhook wordt niet aangeroepen
✅ Check of `MOLLIE_WEBHOOK_BASE_URL` correct is
✅ Zorg dat ngrok/tunnel draait
✅ Check Mollie dashboard → Payments → klik op payment → Events tab

### "Payment not found"
✅ Gebruik je test API key? Check of payment ID begint met `tr_`
✅ Test en live payments zijn gescheiden

### Betaling blijft "open"
✅ Rond de checkout daadwerkelijk af in browser
✅ Check Mollie dashboard voor foutmeldingen

---

## 📊 Monitoring

### Database checks

```sql
-- Check boetes met Mollie payment
SELECT
  id,
  medewerker_id,
  bedrag,
  status,
  mollie_payment_id,
  mollie_checkout_url,
  afgehandeld_at
FROM boetes
WHERE mollie_payment_id IS NOT NULL
ORDER BY created_at DESC;

-- Check recente audit logs
SELECT * FROM audit_logs
WHERE action = 'mollie_payment_received'
ORDER BY created_at DESC
LIMIT 10;
```

### Mollie Dashboard

- Ga naar **Payments** om alle test betalingen te zien
- Klik op een payment voor details + events
- Check **Webhooks** tab voor webhook delivery logs

---

## 🚀 Production Checklist

Voordat je live gaat:

- [ ] Wijzig `MOLLIE_API_KEY` van `test_` naar `live_`
- [ ] Update `MOLLIE_WEBHOOK_BASE_URL` naar productie URL
- [ ] Test één live betaling met klein bedrag
- [ ] Verifieer webhook werkt in productie
- [ ] Check Mollie dashboard voor succesvolle webhooks
- [ ] Monitor eerste echte betalingen nauwlettend

---

## 📚 Scripts Uitleg

### `scripts/test-mollie.ts`
- Test Mollie API connectie
- Maakt een test betaling aan van €10
- Toont checkout URL
- Laat laatste 5 betalingen zien

### `scripts/check-mollie-payment.ts`
- Check status van specifieke betaling
- Toont alle payment details
- Handige voor debugging

### `scripts/create-test-boete.ts`
- Maakt test medewerker aan (indien nodig)
- Maakt test boete van €25
- Geeft login instructies voor UI test

---

## 🔗 Nuttige Links

- [Mollie Dashboard](https://my.mollie.com/)
- [Mollie Test Mode](https://docs.mollie.com/overview/testing)
- [Mollie API Docs](https://docs.mollie.com/reference/v2/payments-api)
- [Mollie Webhooks](https://docs.mollie.com/overview/webhooks)
- [ngrok Download](https://ngrok.com/download)

---

**Happy Testing! 🎉**
