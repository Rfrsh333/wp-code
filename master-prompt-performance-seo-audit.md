# Master Prompt — Performance + SEO Audit
## TopTalent | Core Web Vitals, Lighthouse, JobPosting schema, sitemap

Versie: 1.0
Doel: snellere site = meer conversie + betere ranking. Audit Core Web Vitals op de drie belangrijkste pagina's, scoor ze met Lighthouse, controleer SEO-fundamenten (meta, sitemap, robots), en kijk specifiek naar JobPosting structured data — voor een uitzendsite is gratis exposure in Google Jobs een directe lead-vector.

---

## ⚠️ RUN-MODE — READ-ONLY OP PRODUCTIE

- Performance-tests doen we tegen productie URL's (publieke pagina's, geen ingelogde sessie).
- Geen wijzigingen in code, sitemap, robots.txt, of meta-tags.
- Lighthouse CI mag, geen storingen veroorzaken.
- Test maximaal 5 keer per pagina per uur om geen rate-limits te raken.

---

## ROL & CONTEXT

Je bent een performance + SEO engineer met focus op Next.js 14 (App Router). Je kent Core Web Vitals (LCP, INP, CLS), de update naar INP per maart 2024, structured data per Schema.org, en de JobPosting-vereisten van Google Jobs.

**Stack:** Next.js 14 App Router, Vercel hosting (Edge Network), waarschijnlijk Tailwind, mogelijk dynamic imports.

---

## MISSIE

Lever op in `data/audits/perf-seo-audit-YYYY-MM-DD.md` antwoord op zes vragen:

1. **Hoe scoren de top-5 pagina's op Lighthouse?** (Performance, Accessibility, Best Practices, SEO)
2. **Halen we de Core Web Vitals drempelwaarden?** (LCP < 2.5s, INP < 200ms, CLS < 0.1)
3. **Is de SEO-basis op orde?** (meta-tags, OpenGraph, Twitter Card, canonical, hreflang, sitemap, robots)
4. **Is JobPosting structured data correct geïmplementeerd** voor elke openstaande dienst/vacature?
5. **Zijn er obvious performance-bottlenecks?** (zware images, unoptimized fonts, blocking JS, CSR-only kritieke pagina's)
6. **Hoe ziet onze indexering in Google Search Console eruit?** (gevraagd aan eigenaar)

---

## ABSOLUTE REGELS

- Geen wijzigingen in `next.config.js`, `app/sitemap.ts`, `app/robots.ts`, of meta-tags.
- Geen images vervangen of compressie uitvoeren zonder mijn go.
- Lighthouse-rapporten in `data/audits/perf/lighthouse/` opslaan, niet pushen.
- `gitnexus_impact` voor elke fix die meer dan 3 files raakt.

---

## TESTPLAN — VIJF FASES

### Fase 1 — Pagina-prioritering

Identificeer **top-5 pagina's** in volgorde van zakelijke waarde:

1. Homepage (`/`)
2. `/aanmelden` (kandidaat-flow start)
3. `/personeel-aanvragen` (klant-flow start)
4. Diensten/vacature-overzicht (`/vacatures` of `/diensten` — verifieer)
5. Detail-vacature (`/vacatures/[slug]` of equivalent)

Voor elke: noteer URL, type pagina (statisch / SSR / ISR / CSR), en ingeschat verkeer (eigenaar te bevragen).

Output: `perf/pagina-prioritering.md`.

### Fase 2 — Lighthouse-runs

Voor elke top-5 pagina:

1. Lighthouse CLI: `npx lighthouse <url> --form-factor=mobile --throttling-method=simulate --output=html --output=json --output-path=./perf/lighthouse/<slug>-mobile.html`
2. Idem desktop (`--form-factor=desktop`).
3. Per pagina rapporteren:
   - 4 scores (Performance / Accessibility / Best Practices / SEO)
   - LCP element + tijd
   - INP (uit veldgegevens als beschikbaar via PageSpeed Insights)
   - CLS bron (welk element schuift)
   - TBT
   - Speed Index
   - Total bundle size, individuele JS chunk groottes
4. **Drie hoofdadviezen** uit elk Lighthouse-rapport (niet de generieke, alleen de actionable).

Run ook **PageSpeed Insights** (https://pagespeed.web.dev) om **veldgegevens** (CrUX) te halen — die zeggen meer over real-user performance dan lab-runs.

Output: `perf/lighthouse-summary.md` + opgeslagen JSON+HTML reports.

### Fase 3 — Performance-bottleneck analyse

Op basis van Lighthouse-output + code:

1. **Images.** Worden ze geserveerd via `next/image`? In welke formaten (AVIF/WebP)? Lazy-loading actief? `priority` op LCP-image?
2. **Fonts.** `next/font` gebruikt voor consistente preload? `font-display: swap`?
3. **JavaScript.**
   - Welke routes zijn `'use client'` waar het ook server kan? Onnodige client-side JS.
   - Bundle-size per pagina via `next build` output of Vercel Analytics.
   - Are there third-party scripts (analytics, chat-widget, recaptcha) die main-thread blokkeren? Worden ze met `next/script strategy="lazyOnload"` ingeladen?
4. **CSS.** Tailwind output-size acceptabel? `purge` werkt?
5. **Database fetches.** SSR-pagina's met meerdere fetches in serie (waterval) versus parallel (`Promise.all`)?
6. **Hydration cost.** Grote client-componenten met veel props — zware hydration. Identificeer top-3 zwaarste.

Output: `perf/bottlenecks.md`.

### Fase 4 — SEO-fundamenten

Voor de site als geheel:

1. **`robots.txt`** (bekijk `/robots.txt` in browser of `app/robots.ts`):
   - Disallow correct voor `/admin/*`, `/api/*`, `/portal/*`?
   - Sitemap-URL benoemd?
2. **`sitemap.xml`** (bekijk `/sitemap.xml` of `app/sitemap.ts`):
   - Statische routes erin?
   - Dynamische vacatures erin (per slug)?
   - `lastmod` actueel?
3. **Per-pagina meta:**
   - `<title>` uniek per pagina, < 60 tekens, beschrijvend
   - `<meta name="description">` 140-160 tekens, klikwaardig
   - `<link rel="canonical">` correct
   - `<meta property="og:*">` voor sociale share
   - `<meta name="twitter:card">`
4. **hreflang** — alleen NL of ook andere talen? Als alleen NL: `lang="nl"` op `<html>` is voldoende.
5. **Internationale ranking** — is er een specifieke NL focus (`.nl` TLD ja, geo-targeting in Search Console).
6. **Structured data per pagina** (basis): `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage` waar van toepassing.

Output: `perf/seo-basis.md` met een per-pagina checklist.

### Fase 5 — JobPosting structured data (de grote winst voor uitzend-sites)

Google Jobs trekt `JobPosting`-schema rechtstreeks uit je vacaturepagina's. Gratis verkeer als je het correct doet.

Voor elke openstaande dienst:

1. **Bestaat er een publieke vacature-detailpagina?** Zo niet: dat is feature-gap nummer één.
2. **Bevat de pagina JSON-LD met `@type: JobPosting`?** Vereiste velden:
   - `title`
   - `description` (HTML, ≥100 tekens)
   - `datePosted` (ISO 8601)
   - `validThrough` (datum waarop vacature sluit)
   - `hiringOrganization` (`@type: Organization`, naam, URL, evt. logo)
   - `jobLocation` (`@type: Place`, `address: PostalAddress` met `addressCountry: NL`)
   - `employmentType` (FULL_TIME / PART_TIME / CONTRACTOR / TEMPORARY → uitzend = `TEMPORARY`)
3. **Aanbevolen velden** voor betere weergave:
   - `baseSalary` (uurloon-range)
   - `directApply: true`
   - `applicantLocationRequirements`
   - `industry`
4. **Verifieer met Google Rich Results Test:** https://search.google.com/test/rich-results — plak per voorbeeld-URL, kijk of het "Eligible for Google Jobs" toont.
5. **Indexed?** Vraag eigenaar Google Search Console "Job postings" rapport te checken — staat erin hoeveel vacatures wel/niet indexeerbaar zijn.

Output: `perf/jobposting-audit.md` met per voorbeeld-vacature een PASS/FAIL + ontbrekende velden.

---

## DELIVERABLES

1. `data/audits/perf-seo-audit-YYYY-MM-DD.md` — hoofdrapport met:
   - Executive summary (alle scores, JobPosting-status, top-5 quick wins)
   - Per-pagina Lighthouse-tabel
   - Bottleneck-analyse met fix-suggesties (code-snippets)
   - SEO-checklist score
   - JobPosting-readiness
2. `data/audits/perf/pagina-prioritering.md`
3. `data/audits/perf/lighthouse-summary.md` + onderliggende `lighthouse/*.html` + `.json` files
4. `data/audits/perf/bottlenecks.md`
5. `data/audits/perf/seo-basis.md`
6. `data/audits/perf/jobposting-audit.md`

---

## RAPPORTAGESTIJL

- Severity per finding: HIGH (Lighthouse < 50, of CWV "poor") / MEDIUM (Lighthouse 50-90) / LOW.
- Voor elke fix: ingeschatte impact (LCP -X seconden, JS -Y kb).
- Onderscheid tussen "lab-data" (Lighthouse) en "veldgegevens" (CrUX/PSI).

---

## AFSLUITING

- `gitnexus_detect_changes({scope: "all"})` — alleen `data/audits/`.
- One-pager: TOP-3 perf-quick-wins (LCP-impact), TOP-3 SEO-gaps, TOP-3 JobPosting-fixes.

---

## APPENDIX — BESTANDEN & TOOLS

**Code:**
- `app/layout.tsx`, `app/page.tsx`, `app/aanmelden/page.tsx`, `app/personeel-aanvragen/page.tsx`
- Vacature-detail-pagina (zoek)
- `app/sitemap.ts`, `app/robots.ts`
- `next.config.js`
- Image-componenten

**Tools:**
- `npx lighthouse` (CLI)
- https://pagespeed.web.dev (CrUX field data)
- https://search.google.com/test/rich-results
- https://validator.schema.org
- Vercel Analytics dashboard
- Google Search Console (eigenaar te delen)

---

## BEGIN

1. Pagina-prioritering (Fase 1) — confirmeer met mij welke 5 pagina's.
2. Lighthouse runs (Fase 2) — geeft instant beeld.
3. Bottleneck-analyse (Fase 3).
4. SEO + JobPosting (Fase 4-5) — JobPosting kan de grootste ROI van deze hele audit zijn.
