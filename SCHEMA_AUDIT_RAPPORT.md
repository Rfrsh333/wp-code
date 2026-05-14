# Schema Markup Audit Rapport — TopTalent Jobs

**Datum:** 14 mei 2026
**Website:** https://www.toptalentjobs.nl
**Project:** toptalent-wordpress-html (Next.js)

---

## 1. Samenvatting

| Categorie | Status |
|-----------|--------|
| Organization schema | Aanwezig, goed |
| WebSite schema | Aanwezig, verbeterpunten |
| LocalBusiness/EmploymentAgency | Aanwezig per stad |
| BreadcrumbList schema | Aanwezig op de meeste pagina's |
| FAQPage schema | Aanwezig op homepage, diensten, locaties |
| BlogPosting schema | Aanwezig |
| Article schema | Aanwezig (GEO content) |
| Service schema | Aanwezig per dienst |
| ContactPage schema | **ONTBREEKT** |
| AboutPage schema | **ONTBREEKT** |
| Review/AggregateRating | **ONTBREEKT** |
| SearchAction (sitelinks) | **ONTBREEKT** |
| JobPosting schema | **ONTBREEKT** |

**Totaalscore: 7/10** — Goede basis, maar er zijn gemiste kansen en een aantal fouten.

---

## 2. Bestaande Schema Markup — Analyse per bestand

### 2.1 Globaal: Organization + WebSite (`src/components/StructuredData.tsx`)

**Organization schema:**
- Type: `["Organization", "EmploymentAgency"]` — correct multi-type
- `@id` identifier: aanwezig
- Naam, logo, beschrijving, adres: volledig
- ContactPoint met telefoon/email: goed
- AreaServed met steden: goed
- OfferCatalog met 3 diensten: goed
- `sameAs`: alleen WhatsApp — **onvolledig**

**Fouten/risico's:**
1. **Openingstijden 00:00-23:59** — Misleidend. Jullie kantoor is niet 24/7 open. Dit kan een spam-signaal zijn. Gebruik de daadwerkelijke kantooruren, of verwijder dit en gebruik alleen `"contactType": "customer service"` met de beschikbaarheid.
2. **`knowsAbout` array** — Bevat zoekwoorden. Google negeert dit grotendeels, maar het kan als keyword stuffing worden gezien. Verwijder of beperk tot 3-4 kernonderwerpen.
3. **`sameAs` ontbreekt** — Geen LinkedIn, Facebook, Google Business profiel. Voeg alle sociale profielen en bedrijfsvermeldingen toe.
4. **Logo URL**: `logo.png` — Controleer of dit bestand daadwerkelijk bestaat op die URL.

**WebSite schema:**
- Basis is correct met `@id` referentie naar Organization
- **ONTBREEKT: `potentialAction` met SearchAction** — Dit is nodig voor Google Sitelinks Search Box.

### 2.2 Homepage (`src/app/page.tsx`)

**FAQPage schema:** Aanwezig met 3 vragen. Technisch correct.

**Fouten/risico's:**
- Typo in antwoord: "zelfs" moet "zelfs" zijn (correct Nederlands is "zelfs" of "zelfs" — controleer).
- Homepage mist een specifiek `WebPage` schema met `speakable` property voor voice search.

### 2.3 Blog (`src/app/blog/`)

**BlogPosting schema** (`blog/[slug]/page.tsx`): Dynamisch gegenereerd. Bevat headline, author, publisher, dates, mainEntityOfPage. Goed.

**Editorial BlogPosting** (`blog/editorial/[slug]/page.tsx`): Bevat BlogPosting + FAQPage + BreadcrumbList. Uitgebreid.

**Blog layout** (`blog/layout.tsx`): BreadcrumbList aanwezig.

**Fouten/risico's:**
- Blog index pagina (`blog/page.tsx`) mist een `CollectionPage` of `Blog` schema.
- Geen `wordCount` of `articleSection` properties — niet kritiek maar nuttig.

### 2.4 FAQ Pagina's (`src/app/veelgestelde-vragen/`)

**FAQPage schema** in layout: Dynamisch uit Supabase. Correct opgebouwd.

**Fouten/risico's:**
- Individuele FAQ pagina (`veelgestelde-vragen/[slug]/page.tsx`) heeft OpenGraph type "article" maar **geen JSON-LD schema**. Elke individuele FAQ pagina zou ook een `FAQPage` schema moeten hebben (met die ene vraag).

### 2.5 Diensten (`src/app/diensten/`)

**Service schema's aanwezig voor:**
- Uitzenden: Service + FAQPage + BreadcrumbList — **uitgebreid en goed**
- Detachering: Service + BreadcrumbList
- Recruitment: Service + BreadcrumbList

**Fouten/risico's:**
- Diensten hoofdpagina (`diensten/layout.tsx`) heeft alleen BreadcrumbList — mist een overkoepelend `Service` of `ItemList` schema.
- Detachering en Recruitment missen FAQPage schema's (Uitzenden heeft er wel een).

### 2.6 Locaties (`src/app/locaties/` + `src/lib/schema-helpers.ts`)

**EmploymentAgency schema** per stad: goed met dynamische data.
**LocationFAQ schema**: 5 vragen per stad, dynamisch met stadsnaam.
**BreadcrumbList**: aanwezig per stad en stad/dienst-combinatie.

**Fouten/risico's:**
1. **Openingstijden weer 00:00-23:59** — Zelfde probleem als globaal.
2. Locaties zonder fysiek adres (Amsterdam, Rotterdam, etc.) hebben geen `address` — Google kan dit als onvolledig markeren.
3. **Typo** in `schema-helpers.ts` regel 112: "zelfs" — controleer.

### 2.7 GEO Content (`src/lib/geo/structured-data.ts`)

**Article + FAQ + LocalBusiness + Breadcrumb**: dynamisch gecombineerd.

**Fouten/risico's:**
1. **Inconsistente URL's**: Dit bestand gebruikt `https://toptalentjobs.nl` (zonder `www.`), terwijl alle andere bestanden `https://www.toptalentjobs.nl` gebruiken. **Dit is een probleem** — Google ziet dit als verschillende entiteiten.
2. **Logo URL verschilt**: `https://toptalentjobs.nl/images/logo.png` vs. `https://www.toptalentjobs.nl/logo.png` in StructuredData.tsx. Welke is correct?
3. `sameAs` bevat LinkedIn link die in het globale Organization schema ontbreekt — **inconsistent**.
4. `serviceType` als plain array — niet ongeldig maar minder specifiek dan OfferCatalog.

### 2.8 Pagina's ZONDER schema markup

| Pagina | Schema nodig | Status |
|--------|-------------|--------|
| `/contact` | ContactPage + LocalBusiness | **ONTBREEKT** |
| `/over-ons` | AboutPage + Organization | **ONTBREEKT** (alleen breadcrumb) |
| `/testimonials` | Review + AggregateRating | **ONTBREEKT** |
| `/inschrijven` | WebPage | **ONTBREEKT** |
| `/personeel-aanvragen` | WebPage | **ONTBREEKT** |
| `/kosten-calculator` | WebPage + FAQPage | **ONTBREEKT** |
| `/privacy` | WebPage | Niet kritiek |
| `/voorwaarden` | WebPage | Niet kritiek |

---

## 3. Kritieke Fouten & Risico's

### HOOG RISICO

| # | Fout | Locatie | Impact |
|---|------|---------|--------|
| 1 | **Inconsistente domeinnamen** (`www.` vs zonder) | `geo/structured-data.ts` | Google ziet twee verschillende entiteiten. Kan rich snippets blokkeren. |
| 2 | **Inconsistente logo URL's** (`/logo.png` vs `/images/logo.png`) | Meerdere bestanden | Validatie-errors in Google Search Console. |
| 3 | **24/7 openingstijden** terwijl kantoor dat niet is | StructuredData.tsx, schema-helpers.ts | Potentieel spam-signaal, misleidend voor gebruikers. |

### GEMIDDELD RISICO

| # | Fout | Locatie | Impact |
|---|------|---------|--------|
| 4 | Geen SearchAction in WebSite schema | StructuredData.tsx | Gemiste kans op Sitelinks Search Box. |
| 5 | Ontbrekende `sameAs` links (LinkedIn, Google Business) | StructuredData.tsx | Minder authority signalen naar Google. |
| 6 | Contact pagina zonder ContactPage schema | contact/layout.tsx | Gemiste rich snippet kansen. |
| 7 | Testimonials pagina zonder Review schema | testimonials/layout.tsx | Gemiste kans op review stars in SERP. |
| 8 | `knowsAbout` keyword stuffing | StructuredData.tsx | Kan als spam gezien worden. |

### LAAG RISICO

| # | Fout | Locatie | Impact |
|---|------|---------|--------|
| 9 | Geen JobPosting schema | N.v.t. | Gemiste kans voor Google for Jobs. |
| 10 | Blog index mist CollectionPage schema | blog/layout.tsx | Minor SEO impact. |
| 11 | Individuele FAQ pagina's missen JSON-LD | veelgestelde-vragen/[slug] | Minor SEO impact. |

---

## 4. Aanbevolen JSON-LD Code

### 4.1 Fix: WebSite schema met SearchAction

Vervang het huidige WebSite schema in `src/components/StructuredData.tsx`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.toptalentjobs.nl/#website",
  "name": "TopTalent Jobs",
  "url": "https://www.toptalentjobs.nl",
  "publisher": {
    "@id": "https://www.toptalentjobs.nl/#organization"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.toptalentjobs.nl/zoeken?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  },
  "inLanguage": "nl-NL"
}
```

> **Let op:** Voeg SearchAction alleen toe als er daadwerkelijk een zoekpagina bestaat op `/zoeken`. Zo niet, maak die eerst of laat SearchAction weg.

### 4.2 Nieuw: ContactPage schema

Toevoegen aan `src/app/contact/layout.tsx`:

```json
{
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://www.toptalentjobs.nl/contact#webpage",
  "name": "Contact - TopTalent Jobs",
  "description": "Neem contact op met TopTalent Jobs voor horeca uitzendwerk.",
  "url": "https://www.toptalentjobs.nl/contact",
  "mainEntity": {
    "@id": "https://www.toptalentjobs.nl/#organization"
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.toptalentjobs.nl"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Contact",
        "item": "https://www.toptalentjobs.nl/contact"
      }
    ]
  }
}
```

### 4.3 Nieuw: AboutPage schema

Toevoegen aan `src/app/over-ons/layout.tsx`:

```json
{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://www.toptalentjobs.nl/over-ons#webpage",
  "name": "Over TopTalent Jobs",
  "description": "Leer TopTalent Jobs kennen: een horeca uitzendbureau in Utrecht.",
  "url": "https://www.toptalentjobs.nl/over-ons",
  "mainEntity": {
    "@id": "https://www.toptalentjobs.nl/#organization"
  }
}
```

### 4.4 Nieuw: AggregateRating + Review schema

Toevoegen aan `src/app/testimonials/layout.tsx`:

```json
{
  "@context": "https://schema.org",
  "@type": "EmploymentAgency",
  "@id": "https://www.toptalentjobs.nl/#organization",
  "name": "TopTalent Jobs",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "45",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Martijn de Vries"
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "reviewBody": "Binnen 24 uur extra bediening op de vloer. Uitstekende service.",
      "datePublished": "2025-01-15"
    }
  ]
}
```

> **Belangrijk:** Gebruik ALLEEN echte reviews met echte cijfers. Verzonnen reviews zijn in strijd met Google-richtlijnen en kunnen tot een penalty leiden.

### 4.5 Fix: GEO structured-data.ts — Consistente URL's

In `src/lib/geo/structured-data.ts`, wijzig:

```typescript
const TOPTALENT = {
  name: "TopTalent Jobs",
  url: "https://www.toptalentjobs.nl",       // was: https://toptalentjobs.nl
  logo: "https://www.toptalentjobs.nl/logo.png", // was: /images/logo.png
  telephone: "+31617177939",
  email: "info@toptalentjobs.nl",
  address: {
    streetAddress: "Kanaalstraat 15",
    addressLocality: "Utrecht",
    postalCode: "3531 CJ",
    addressCountry: "NL",
  },
};
```

### 4.6 Fix: Realistische openingstijden

In zowel `StructuredData.tsx` als `schema-helpers.ts`, wijzig:

```json
{
  "@type": "OpeningHoursSpecification",
  "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "opens": "08:00",
  "closes": "18:00"
}
```

Of als het telefonisch 24/7 is, maak twee specificaties:
```json
[
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "00:00",
    "closes": "23:59",
    "description": "Telefonische spoedlijn"
  }
]
```

### 4.7 Fix: sameAs uitbreiden

In `StructuredData.tsx`, voeg toe:

```json
"sameAs": [
  "https://wa.me/31617177939",
  "https://www.linkedin.com/company/toptalentjobs",
  "https://www.facebook.com/toptalentjobs",
  "https://g.co/kgs/JOUW_GOOGLE_BUSINESS_ID"
]
```

> Vul hier de daadwerkelijke URL's van jullie profielen in.

### 4.8 Optioneel: JobPosting schema (voor vacature-pagina's)

Als jullie vacatures publiceren, voeg per vacature toe:

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Barkeeper - Utrecht",
  "description": "TopTalent Jobs zoekt een ervaren barkeeper voor restaurants in Utrecht.",
  "datePosted": "2026-05-01",
  "validThrough": "2026-06-01",
  "employmentType": "TEMPORARY",
  "hiringOrganization": {
    "@id": "https://www.toptalentjobs.nl/#organization"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Utrecht",
      "addressCountry": "NL"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "EUR",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 13.00,
      "maxValue": 18.00,
      "unitText": "HOUR"
    }
  }
}
```

---

## 5. Implementatie-instructies per paginatype

| Paginatype | Benodigde Schema's | Prioriteit |
|------------|-------------------|------------|
| **Alle pagina's** (layout.tsx root) | Organization + WebSite (met SearchAction) | Al aanwezig, fix SearchAction |
| **Homepage** | FAQPage | Al aanwezig |
| **Contact** | ContactPage + BreadcrumbList | **HOOG — toevoegen** |
| **Over Ons** | AboutPage + BreadcrumbList | GEMIDDELD — toevoegen |
| **Testimonials** | AggregateRating + Review | **HOOG — toevoegen** |
| **Diensten overzicht** | ItemList of Service | LAAG |
| **Diensten detail** | Service + FAQPage + BreadcrumbList | Al aanwezig |
| **Locaties** | EmploymentAgency + FAQPage + BreadcrumbList | Al aanwezig, fix openingstijden |
| **Blog overzicht** | CollectionPage + BreadcrumbList | LAAG |
| **Blog artikel** | BlogPosting + BreadcrumbList | Al aanwezig |
| **FAQ overzicht** | FAQPage | Al aanwezig |
| **FAQ individueel** | FAQPage (1 vraag) + BreadcrumbList | GEMIDDELD — toevoegen |
| **Vacatures** (indien aanwezig) | JobPosting | **HOOG als relevant** |
| **Kosten Calculator** | WebPage + FAQPage | LAAG |

---

## 6. Prioriteiten Actieplan

### Fase 1 — Kritieke fixes (direct)
1. Fix inconsistente URL's in `geo/structured-data.ts` (www vs niet-www)
2. Fix inconsistente logo-URL's
3. Corrigeer openingstijden of voeg context toe

### Fase 2 — Hoge impact toevoegingen
4. Voeg SearchAction toe aan WebSite schema
5. Voeg ContactPage schema toe
6. Voeg AggregateRating/Review toe aan testimonials (alleen met echte data)
7. Vul `sameAs` aan met alle sociale profielen

### Fase 3 — Verbetering
8. Voeg AboutPage schema toe
9. Voeg BreadcrumbList toe aan pagina's die het missen
10. Verwijder `knowsAbout` keyword stuffing of beperk tot 3 items
11. Voeg CollectionPage toe aan blog index

### Fase 4 — Uitbreiding
12. Implementeer JobPosting schema als vacatures worden gepubliceerd
13. Overweeg `speakable` property voor voice search optimalisatie

---

## 7. Validatie Checklist

Na implementatie, test alle schema's met:
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Schema Markup Validator**: https://validator.schema.org/
- **Google Search Console**: Controleer "Verbeteringen" sectie voor structured data fouten

Test minimaal deze URL's:
- [ ] Homepage
- [ ] Contact pagina
- [ ] Over Ons
- [ ] Testimonials
- [ ] Een diensten pagina (bijv. /diensten/uitzenden)
- [ ] Een locatie pagina (bijv. /locaties/utrecht)
- [ ] Een blog artikel
- [ ] Een FAQ pagina
- [ ] Een GEO pagina

---

*Rapport gegenereerd op 14 mei 2026*
