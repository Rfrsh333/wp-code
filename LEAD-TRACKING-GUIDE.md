# Lead Source Tracking Systeem - Handleiding

## 📋 Overzicht

Je lead source tracking systeem is **gedeeltelijk geïmplementeerd**. Dit systeem helpt je om te zien welke leads van cold outreach komen en welke van je website.

### ✅ Wat is AF:
1. **Personeel Aanvragen formulier** - volledig tracking systeem
2. **Admin Dashboard** - filtering op lead source en campagne
3. **Database SQL** - ready to run migration
4. **URL parameter tracking** - automatisch capturing

### ⏳ Wat NOG MOET:
1. **Database migratie uitvoeren** (zie stap 1 hieronder)
2. **Contact formulier** tracking toevoegen
3. **Inschrijven formulier** tracking toevoegen

---

## 🚀 Stap 1: Database Setup (BELANGRIJK!)

Voordat het tracking systeem werkt, moet je de SQL migratie uitvoeren in Supabase:

### Hoe te doen:
1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project
3. Klik op "SQL Editor" in de linker sidebar
4. Klik op "New Query"
5. Open het bestand `supabase-migration-lead-tracking.sql` (in je project root)
6. Kopieer de hele inhoud
7. Plak in de SQL Editor
8. Klik op "Run"

### Wat doet de migratie:
- Voegt `lead_source`, `campaign_name`, `utm_source`, `utm_medium`, `utm_campaign` kolommen toe
- Aan `personeel_aanvragen` tabel
- Aan `contact_berichten` tabel
- Aan `inschrijvingen` tabel
- Maakt indexes voor snelle filtering
- Zet bestaande records op 'website' als default

⚠️ **ZONDER DEZE STAP WERKT HET TRACKING NIET!**

---

## 📊 Hoe het Werkt

### URL Parameters voor Cold Outreach

Wanneer je cold outreach emails verstuurt, gebruik je speciale URL's met tracking parameters:

#### Basis Formaat:
```
https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=jan2025
```

#### Alle Mogelijke Parameters:
| Parameter | Betekenis | Voorbeeld |
|-----------|-----------|-----------|
| `source` | Lead bron | `outreach`, `google`, `linkedin` |
| `campaign` | Campagne naam | `jan2025`, `zomercampagne` |
| `utm_source` | UTM source | `email`, `coldmail` |
| `utm_medium` | UTM medium | `email`, `social` |
| `utm_campaign` | UTM campaign | `restaurant_outreach` |

#### Praktijk Voorbeelden:

**Voorbeeld 1: Simpele cold outreach**
```
https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=jan2025
```

**Voorbeeld 2: Restaurant campagne**
```
https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=restaurant_q1&utm_source=email&utm_medium=coldmail
```

**Voorbeeld 3: LinkedIn campagne**
```
https://toptalentjobs.nl/personeel-aanvragen?source=linkedin&campaign=linkedin_ads_feb&utm_medium=social
```

**Voorbeeld 4: Google Ads**
```
https://toptalentjobs.nl/personeel-aanvragen?source=google&campaign=google_search_horeca&utm_source=google&utm_medium=cpc
```

### Wat er Gebeurt:

1. **Gebruiker klikt op je link** met parameters
2. **Formulier laadt** en leest automatisch de URL parameters
3. **Parameters worden verborgen opgeslagen** in het formulier
4. **Bij verzenden** worden ze meegestuurd naar de database
5. **In admin dashboard** kun je filteren op bron en campagne

---

## 🎯 Cold Outreach Template

### Email Template met Tracking Link:

```
Onderwerp: [BEDRIJFSNAAM] - Personeelstekort oplossen in 24 uur?

Hoi [NAAM],

Ik zag dat [BEDRIJFSNAAM] vaak kampt met personeelstekort...

Wil je eens vrijblijvend kijken hoeveel personeel we voor je kunnen regelen?

👉 [Vul je behoefte in (2 min)](https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=jan2025)

Groet,
[JOUW NAAM]
```

### Link Shortener (Optioneel):

Je kunt je lange tracking links inkorten met:
- Bitly: https://bitly.com
- TinyURL: https://tinyurl.com

**Let op:** Sommige link shorteners bewaren de URL parameters automatisch!

---

## 📈 Admin Dashboard Gebruiken

### Leads Filteren:

1. **Ga naar admin dashboard** (`/admin`)
2. **Klik op "Personeel Aanvragen" tab**
3. **Gebruik de filters:**
   - **"Alle bronnen"** dropdown - filter op website/outreach/google/etc
   - **"Alle campagnes"** dropdown - filter op specifieke campagne

### Filter Opties:

**Lead Source Filter:**
- Alle bronnen
- Website (organisch verkeer)
- Cold Outreach (jouw emails)
- Google Ads
- LinkedIn
- Facebook
- Overig

**Campaign Filter:**
- Toont ALLEEN campagnes waar daadwerkelijk leads van zijn
- Automatisch gegenereerd uit je data

### Export Gefilterde Data:

1. Selecteer filters
2. Klik op "Exporteer CSV"
3. CSV bevat ALLEEN de gefilterde leads

---

## 💡 Best Practices

### 1. Consistent Naming voor Campagnes:

✅ **GOED:**
- `jan2025` (maand + jaar)
- `restaurant_q1` (doelgroep + periode)
- `linkedin_ads_feb` (kanaal + maand)

❌ **FOUT:**
- `test`
- `campagne1`
- `nieuwe_campagne`

### 2. Lead Source Conventions:

Gebruik deze vaste waardes voor `source`:
- `outreach` - voor cold email
- `google` - voor Google Ads
- `linkedin` - voor LinkedIn (organic of ads)
- `facebook` - voor Facebook/Instagram
- `website` - automatic voor organische traffic

### 3. Track ROI per Campagne:

Voorbeeld: Je doet cold outreach met 2 campagnes:

**Campagne A:**
```
https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=restaurant_jan
```

**Campagne B:**
```
https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=hotel_jan
```

Nu kun je in de admin dashboard zien:
- Hoeveel leads "restaurant_jan" opleverde
- Hoeveel leads "hotel_jan" opleverde
- Welke campagne beter performed

---

## 🔧 Wat NOG Geïmplementeerd Moet Worden

### Contact Formulier (`/contact`)

**Status:** Nog niet geïmplementeerd

**Wat er moet gebeuren:**
1. URL parameter tracking toevoegen aan contact form component
2. API route updaten om tracking velden op te slaan
3. Dezelfde filter functionaliteit toevoegen aan admin dashboard

**Voorbeeld URL:**
```
https://toptalentjobs.nl/contact?source=outreach&campaign=jan2025
```

### Inschrijven Formulier (`/inschrijven`)

**Status:** Nog niet geïmplementeerd

**Wat er moet gebeuren:**
1. URL parameter tracking toevoegen aan inschrijven form component
2. API route updaten om tracking velden op te slaan
3. Dezelfde filter functionaliteit toevoegen aan admin dashboard

**Voorbeeld URL:**
```
https://toptalentjobs.nl/inschrijven?source=linkedin&campaign=werknemers_feb
```

---

## 📊 Analytics & Rapportage

### Handmatige Queries (Supabase SQL Editor):

#### 1. Leads per Bron:
```sql
SELECT
  lead_source,
  COUNT(*) as aantal_leads,
  COUNT(*) FILTER (WHERE status = 'nieuw') as nieuw,
  COUNT(*) FILTER (WHERE status = 'in_behandeling') as in_behandeling,
  COUNT(*) FILTER (WHERE status = 'afgehandeld') as afgehandeld
FROM personeel_aanvragen
GROUP BY lead_source
ORDER BY aantal_leads DESC;
```

#### 2. Leads per Campagne:
```sql
SELECT
  campaign_name,
  lead_source,
  COUNT(*) as aantal_leads,
  MIN(created_at) as eerste_lead,
  MAX(created_at) as laatste_lead
FROM personeel_aanvragen
WHERE campaign_name IS NOT NULL
GROUP BY campaign_name, lead_source
ORDER BY aantal_leads DESC;
```

#### 3. Cold Outreach Performance:
```sql
SELECT
  campaign_name,
  COUNT(*) as totaal_leads,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as leads_laatste_week,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as leads_laatste_maand
FROM personeel_aanvragen
WHERE lead_source = 'outreach'
GROUP BY campaign_name
ORDER BY totaal_leads DESC;
```

#### 4. Conversion Rate per Bron:
```sql
SELECT
  lead_source,
  COUNT(*) as totaal,
  COUNT(*) FILTER (WHERE status = 'afgehandeld') as afgehandeld,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'afgehandeld') / COUNT(*),
    2
  ) as conversion_rate_percentage
FROM personeel_aanvragen
GROUP BY lead_source
ORDER BY conversion_rate_percentage DESC;
```

---

## 🎓 Gebruik Scenario's

### Scenario 1: Restaurant Cold Outreach Campagne

**Doel:** 50 restaurants benaderen voor personeel

**Opzet:**
1. Maak een lijst van 50 restaurant emails
2. Schrijf cold email met tracking link:
   ```
   https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=restaurant_feb2025
   ```
3. Verstuur emails (handmatig of met tool zoals Mailchimp)
4. Track in admin dashboard hoeveel leads binnenkomen van "restaurant_feb2025"

**Verwacht:**
- 50 emails verzonden
- ~5-10% response rate = 3-5 leads
- Zie in dashboard EXACT welke leads van deze campagne komen

### Scenario 2: A/B Testing

**Test:** Welke doelgroep reageert beter?

**Opzet:**
- **Groep A (Hotels):**
  ```
  https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=hotel_test
  ```

- **Groep B (Restaurants):**
  ```
  https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=restaurant_test
  ```

**Resultaat:**
- Filter in dashboard op "hotel_test" → zie aantal leads
- Filter op "restaurant_test" → zie aantal leads
- Vergelijk en focus op beste performing groep

---

## ❓ Veelgestelde Vragen

### Q: Wat als iemand de URL parameters verwijdert?

**A:** Geen probleem. Als de parameters er niet zijn, wordt `lead_source` automatisch op `website` gezet. Je kunt dus onderscheid maken tussen:
- Organisch verkeer (geen parameters) = `website`
- Cold outreach (met parameters) = `outreach`

### Q: Kan ik meerdere campagnes tegelijk runnen?

**A:** Ja! Gebruik gewoon verschillende `campaign` namen:
- `jan2025_restaurant`
- `jan2025_hotel`
- `jan2025_catering`

### Q: Hoe zie ik welke campagne het beste werkt?

**A:**
1. Ga naar admin dashboard
2. Filter op "Cold Outreach" als bron
3. Gebruik de campagne filter om per campagne te zien
4. Exporteer CSV voor verdere analyse in Excel

### Q: Werkt dit ook voor Google Ads / LinkedIn Ads?

**A:** Ja! Gebruik gewoon andere `source` waardes:
```
Google Ads:
https://toptalentjobs.nl/personeel-aanvragen?source=google&campaign=search_horeca

LinkedIn Ads:
https://toptalentjobs.nl/personeel-aanvragen?source=linkedin&campaign=sponsored_content
```

### Q: Kan ik automatisch emails versturen met tracking?

**A:** Ja, gebruik tools zoals:
- Mailchimp (merge tags voor dynamische URLs)
- SendGrid
- Lemlist (voor cold outreach)
- Hunter.io (voor email finding + outreach)

---

## 🚀 Volgende Stappen

### Direct Actie (binnen 1 uur):

1. ✅ **Run database migratie** (zie Stap 1 bovenaan)
2. ✅ **Test het systeem:**
   - Ga naar: `https://toptalentjobs.nl/personeel-aanvragen?source=outreach&campaign=test2025`
   - Vul formulier in
   - Check admin dashboard → filter op "Cold Outreach"
   - Zie je test lead verschijnen!

### Deze Week:

3. ⏳ **Contact + Inschrijven formulieren** tracking toevoegen
4. ⏳ **Eerste cold outreach campagne** opzetten
5. ⏳ **Email templates** maken met tracking links

### Volgende Maand:

6. 📊 **Analytics dashboard** bouwen (grafieken, trends)
7. 🔔 **Email alerts** voor nieuwe outreach leads
8. 🤖 **Auto-response** emails op basis van lead source

---

## 📞 Need Help?

Als je vragen hebt of problemen tegenkomt:

1. Check eerst deze guide
2. Check de SQL migration file voor database fouten
3. Check browser console voor JavaScript errors
4. Vraag mij via chat!

---

**Laatste update:** 29 december 2025
**Status:** Personeel Aanvragen ✅ | Contact ⏳ | Inschrijven ⏳
