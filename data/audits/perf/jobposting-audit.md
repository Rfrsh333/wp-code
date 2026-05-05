# JobPosting Structured Data Audit

**Datum:** 2026-04-22

## Executive Summary

**Status: NIET GEIMPLEMENTEERD**

Er is **geen JobPosting structured data** aanwezig in de hele codebase. Er zijn ook **geen publieke vacature-detailpagina's** waar JobPosting schema op toegepast zou kunnen worden.

Dit is de **grootste gemiste SEO-kans** voor een uitzendbureau.

---

## Huidige Situatie

### Codebase Scan
```
grep -r "JobPosting" src/ → 0 resultaten
```

### Publieke Vacature-pagina's
- `/diensten/` — beschrijft diensten (uitzenden/detachering/recruitment), **geen individuele vacatures**
- `/diensten/uitzenden/` — informatiepagina, geen vacaturelijst
- Geen `/vacatures/` route
- Geen `/vacatures/[slug]` detail route
- Geen dynamische vacature-pagina's vanuit database

### Database (Supabase)
De database bevat wel `diensten` en `dienst_aanmeldingen` tabellen — dit zijn interne shift-/opdrachtdata, niet publieke vacatures.

---

## Wat Ontbreekt: Google Jobs Vereisten

### Verplichte velden voor `@type: JobPosting`

| Veld | Status | Beschrijving |
|------|--------|-------------|
| `title` | ONTBREEKT | Functietitel (bijv. "Horecamedewerker Bediening") |
| `description` | ONTBREEKT | Functiebeschrijving (HTML, min. 100 tekens) |
| `datePosted` | ONTBREEKT | Datum publicatie (ISO 8601) |
| `validThrough` | ONTBREEKT | Sluitingsdatum |
| `hiringOrganization` | BESCHIKBAAR | TopTalent Jobs Organization schema bestaat al |
| `jobLocation` | DEELS | Locatie-data per stad bestaat, maar niet als PostalAddress in JobPosting |
| `employmentType` | ONTBREEKT | Moet `TEMPORARY` zijn voor uitzendwerk |

### Aanbevolen velden

| Veld | Impact | Beschrijving |
|------|--------|-------------|
| `baseSalary` | HOOG | Uurloon-range trekt clicks |
| `directApply: true` | HOOG | Laat "Solliciteer direct" zien in Google Jobs |
| `applicantLocationRequirements` | MEDIUM | Welke locatie vereist |
| `industry` | LAAG | "Food Service" |

---

## Aanbevolen Implementatie

### Stap 1: Maak publieke vacature-pagina's

**Route:** `/vacatures/` (overzicht) + `/vacatures/[slug]` (detail)

**Data bron:** Nieuwe Supabase tabel `vacatures` met:
```sql
CREATE TABLE vacatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titel TEXT NOT NULL,
  beschrijving TEXT NOT NULL,
  locatie TEXT NOT NULL,      -- "Utrecht", "Amsterdam"
  type TEXT DEFAULT 'TEMPORARY',
  uurloon_min NUMERIC,
  uurloon_max NUMERIC,
  datum_gepost TIMESTAMPTZ DEFAULT now(),
  geldig_tot TIMESTAMPTZ,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Stap 2: Voeg JobPosting JSON-LD toe aan detail-pagina

```tsx
// /vacatures/[slug]/page.tsx
const jobPostingSchema = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: vacature.titel,
  description: vacature.beschrijving,
  datePosted: vacature.datum_gepost,
  validThrough: vacature.geldig_tot,
  employmentType: "TEMPORARY",
  hiringOrganization: {
    "@type": "Organization",
    name: "TopTalent Jobs",
    sameAs: "https://www.toptalentjobs.nl",
    logo: "https://www.toptalentjobs.nl/logo.png"
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: vacature.locatie,
      addressCountry: "NL"
    }
  },
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "EUR",
    value: {
      "@type": "QuantitativeValue",
      minValue: vacature.uurloon_min,
      maxValue: vacature.uurloon_max,
      unitText: "HOUR"
    }
  },
  directApply: true,
  industry: "Food Service"
};
```

### Stap 3: Voeg vacatures toe aan sitemap

```typescript
// In sitemap.ts
const { data: vacatures } = await supabaseAdmin
  .from('vacatures')
  .select('slug, datum_gepost')
  .eq('actief', true);

const vacaturePages = (vacatures || []).map(v => ({
  url: `${baseUrl}/vacatures/${v.slug}`,
  lastModified: new Date(v.datum_gepost),
  changeFrequency: 'daily' as const,
  priority: 0.8,
}));
```

### Stap 4: Verifieer met Google Rich Results Test
- Per vacature-URL testen op https://search.google.com/test/rich-results
- Doel: "Eligible for Google Jobs" status

---

## Geschatte Impact

| Metric | Verwachting |
|--------|------------|
| Google Jobs visibility | Van 0 naar alle actieve vacatures |
| Organisch verkeer | +15-30% op vacature-gerelateerde zoekopdrachten |
| Click-through rate | +20-40% door rich snippets (salaris, locatie, "Solliciteer direct") |
| Kosten | €0 (Google Jobs is gratis, enkel structured data nodig) |
| Implementatietijd | ~2-3 dagen (database + pagina's + schema + sitemap) |

---

## Verificatie Checklist

- [ ] Publieke vacature-overzichtspagina (`/vacatures/`)
- [ ] Vacature-detailpagina's (`/vacatures/[slug]`)
- [ ] JSON-LD `JobPosting` schema op elke detail-pagina
- [ ] Alle vereiste velden aanwezig (title, description, datePosted, etc.)
- [ ] `employmentType: "TEMPORARY"` voor uitzendbanen
- [ ] `baseSalary` met uurloon-range
- [ ] `directApply: true` met link naar sollicitatieformulier
- [ ] Vacatures in sitemap.xml
- [ ] Google Rich Results Test: "Eligible for Google Jobs"
- [ ] Google Search Console: Job postings rapport controleren
