# Performance + SEO Audit — TopTalent Jobs

**Datum:** 2026-04-22
**Auditor:** Claude (geautomatiseerd)
**Site:** https://www.toptalentjobs.nl
**Stack:** Next.js 16.1.7, Vercel, Tailwind CSS 4, Supabase

---

## Executive Summary

| Categorie | Score | Status |
|-----------|-------|--------|
| Lighthouse Performance (gemiddeld mobile) | **73/100** | NEEDS IMPROVEMENT |
| Lighthouse Accessibility | **95/100** | GOOD |
| Lighthouse Best Practices | **95/100** | GOOD |
| Lighthouse SEO | **100/100** | PERFECT |
| Core Web Vitals: LCP | **FAIL** | Geen pagina haalt <2.5s drempel |
| Core Web Vitals: CLS | **PASS** | 0 op alle pagina's |
| Core Web Vitals: TBT/INP | **PASS** | 0-70ms op alle pagina's |
| SEO-basis | **71%** (57/80) | NEEDS IMPROVEMENT |
| JobPosting structured data | **NIET AANWEZIG** | CRITICAL GAP |

### Drie Kernbevindingen

1. **CRITICAL:** Personeel-aanvragen en Inschrijven pagina's scoren 56/100 performance door volledige CSR (LCP 9.7-9.8s)
2. **HIGH:** Geen JobPosting structured data = 0 visibility in Google Jobs. Dit is gratis verkeer dat je mist.
3. **MEDIUM:** Sitemap lastmod hardcoded op 2024-12-19, inschrijven-pagina mist title/description

---

## 1. Lighthouse Scores (Mobile)

| Pagina | Perf | A11y | BP | SEO | LCP | FCP | TBT | CLS | SI |
|--------|------|------|-----|-----|-----|-----|-----|-----|-----|
| `/` Homepage | **87** | 97 | 92 | 100 | 3.8s | 1.6s | 70ms | 0 | 3.4s |
| `/personeel-aanvragen/` | **56** | 96 | 96 | 100 | **9.7s** | **9.0s** | 0ms | 0 | **9.0s** |
| `/inschrijven/` | **56** | 90 | 96 | 100 | **9.8s** | **8.9s** | 0ms | 0 | **9.3s** |
| `/diensten/` | **80** | 96 | 96 | 100 | 4.1s | 2.6s | 60ms | 0 | 4.9s |
| `/diensten/uitzenden/` | **85** | 96 | 96 | 100 | 3.5s | 2.5s | 60ms | 0 | 4.7s |

**Opmerking:** PSI field data (CrUX) was niet beschikbaar door API quota.

---

## 2. Core Web Vitals

| Metric | Drempel | Best | Worst | Oordeel |
|--------|---------|------|-------|---------|
| LCP | < 2.5s (good) | 3.5s (uitzenden) | **9.8s** (inschrijven) | **FAIL op alle pagina's** |
| CLS | < 0.1 (good) | 0 | 0 | **PASS** |
| TBT (proxy INP) | < 200ms | 0ms | 70ms | **PASS** |

### LCP Root Causes

**Pagina's met 9+ seconden LCP (personeel-aanvragen, inschrijven):**
- Hele pagina is `"use client"` → server stuurt lege HTML shell
- Browser moet ~252 KiB JS downloaden + parsen + uitvoeren
- Pas na React render is er content → catastrofale LCP

**Pagina's met 3-4s LCP (homepage, diensten):**
- Server-side rendered ✓, maar LCP image niet optimaal gepreload
- `unused-javascript` tot 450ms savings

---

## 3. Performance Bottlenecks

### CRITICAL: CSR Conversie-pagina's

| Pagina | Probleem | Fix | Verwachte Impact |
|--------|----------|-----|-----------------|
| `/personeel-aanvragen/` | `"use client"` op page level | SSR page + `<Suspense>` om form | LCP 9.7s → ~2.5s |
| `/inschrijven/` | `"use client"` op page level | SSR page + `<Suspense>` om form | LCP 9.8s → ~2.5s |

### HIGH: Images & LCP

| Pagina | Probleem | Fix |
|--------|----------|-----|
| Diensten | PremiumImage zonder `priority` | Voeg `priority` toe aan hero image |
| Locaties | PNG hero images | Converteer naar WebP source |

### MEDIUM: JavaScript

| Issue | Savings | Fix |
|-------|---------|-----|
| Unused JS (homepage) | 75 KiB (210ms) | Tree-shake framer-motion |
| Unused JS (diensten) | 75 KiB (450ms) | Dynamic import animatie-componenten |
| Dubbele font family | ~15 KiB | Evalueer of Plus Jakarta Sans nodig is |

### Positief
- `dynamic()` imports op homepage (7 componenten) ✓
- `optimizePackageImports` voor zware libs ✓
- GTM met `afterInteractive` strategie ✓
- Analytics consent-gated (0 impact zonder consent) ✓
- Images via `next/image` met AVIF/WebP ✓
- `compress: true` + security headers ✓

---

## 4. SEO Fundamenten

### robots.txt — PASS (10/10)
Correct geconfigureerd met disallow voor admin/api/portal paths en sitemap referentie.

### sitemap.xml — 7/10
- 127 URL's aanwezig ✓
- **Probleem:** Alle `lastmod` hardcoded op `2024-12-19` — geeft stale-content signaal aan Google
- **Ontbreekt:** Vacature-pagina's (bestaan niet)

### Per-pagina Meta Tags

| Pagina | Title | Description | Canonical | OG | JSON-LD | Score |
|--------|-------|-------------|-----------|-----|---------|-------|
| Homepage | PASS (65 tekens) | PASS | PASS | PASS | PASS (3 schemas) | 10/10 |
| Personeel aanvragen | PASS | PASS | **FAIL** | **FAIL** (default) | **FAIL** | 4/10 |
| Inschrijven | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** | 2/10 |
| Diensten | PASS | PASS | PASS | PASS | PASS | 9/10 |
| Uitzenden | PASS | PASS | PASS | PASS | PASS | 9/10 |
| Locaties/Utrecht | **WARN** (dubbel) | PASS | PASS | PASS | PASS | 8/10 |

### Structured Data Status

| Schema | Aanwezig | Pagina's |
|--------|----------|----------|
| Organization + EmploymentAgency | PASS | Globaal |
| WebSite | PASS | Globaal |
| FAQPage | PASS | Homepage |
| BreadcrumbList | PASS | Diensten, locaties |
| LocalBusiness | PASS | Locatie-pagina's |
| Article | **ONTBREEKT** | Blog |
| **JobPosting** | **ONTBREEKT** | Geen vacature-pagina's |

---

## 5. JobPosting — BIGGEST OPPORTUNITY

**Status: NIET GEIMPLEMENTEERD**

- 0 `JobPosting` structured data in codebase
- 0 publieke vacature-detailpagina's
- 0 visibility in Google Jobs

### Wat dit kost
- Implementatie: ~2-3 dagen
- Google Jobs listing: gratis

### Wat dit oplevert
- +15-30% organisch verkeer op vacature-zoekwoorden
- +20-40% CTR door rich snippets (salaris, "Solliciteer direct")
- Directe concurrentievoordeel in Google Jobs

### Benodigde stappen
1. Nieuwe `vacatures` tabel in Supabase
2. `/vacatures/` overzichtspagina + `/vacatures/[slug]` detail
3. JSON-LD `JobPosting` met alle vereiste velden
4. Vacatures in sitemap.xml
5. Verifieer via Google Rich Results Test

Zie: `perf/jobposting-audit.md` voor volledige specificatie.

---

## 6. Google Search Console

**Status:** Te bevragen bij eigenaar.

Verzoek aan eigenaar:
- [ ] Job postings rapport delen
- [ ] Core Web Vitals rapport delen (echte field data)
- [ ] Indexeringsstatus (hoeveel pagina's geïndexeerd vs. niet)
- [ ] Crawl-fouten overzicht

---

## TOP-3 Quick Wins

### Performance Quick Wins (LCP impact)

| # | Fix | Pagina's | Verwachte LCP Impact | Moeite |
|---|-----|----------|---------------------|--------|
| 1 | **SSR voor personeel-aanvragen + inschrijven** | 2 | **-7 seconden** (9.7→2.5s) | Medium (1 dag) |
| 2 | `priority` op LCP images | 3 | -0.5-1s | Laag (30 min) |
| 3 | Dynamic import animatie-componenten op diensten | 2 | -0.3-0.5s | Laag (1 uur) |

### SEO Quick Wins

| # | Fix | Impact | Moeite |
|---|-----|--------|--------|
| 1 | **Metadata voor inschrijven-pagina** (title, description, canonical, OG) | Indexering + CTR | Laag (30 min) |
| 2 | **Dynamische `lastmod` in sitemap** | Crawl-frequentie | Laag (1 uur) |
| 3 | **Fix dubbele title op locatie-pagina's** | CTR in SERP | Laag (15 min) |

### JobPosting Quick Wins

| # | Fix | Impact | Moeite |
|---|-----|--------|--------|
| 1 | **Maak vacature-detailpagina's** | Google Jobs visibility | Medium (2 dagen) |
| 2 | **Voeg JobPosting JSON-LD toe** | Rich snippets | Laag (mits pagina's bestaan) |
| 3 | **Voeg `directApply: true` + salaris toe** | +CTR in Google Jobs | Laag |

---

## Deliverables

| Bestand | Beschrijving |
|---------|-------------|
| `perf/pagina-prioritering.md` | Top-5 pagina's met rendering strategie |
| `perf/lighthouse-summary.md` | Lighthouse scores + CWV assessment |
| `perf/lighthouse/homepage-mobile.*` | Lighthouse rapport (HTML + JSON) |
| `perf/lighthouse/*-mobile` | Lighthouse JSON voor 4 overige pagina's |
| `perf/bottlenecks.md` | Performance bottleneck analyse |
| `perf/seo-basis.md` | SEO fundamenten checklist |
| `perf/jobposting-audit.md` | JobPosting implementatie-specificatie |

---

## Niet in Scope

- DNS/CDN configuratie (Vercel managed)
- Google Search Console analyse (toegang eigenaar vereist)
- A/B testing van meta descriptions
- Content-optimalisatie (keyword research)
- Backlink analyse
- Code wijzigingen (read-only audit)
