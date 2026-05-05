# Pagina-prioritering — Performance + SEO Audit

**Datum:** 2026-04-22

## Top-5 Pagina's (zakelijke waarde)

| # | Pagina | URL | Type | Rendering | Revalidate | Zakelijke waarde |
|---|--------|-----|------|-----------|------------|-----------------|
| 1 | Homepage | `https://www.toptalentjobs.nl/` | Landing | SSG (ISR) | 3600s (1u) | Eerste indruk, SEO-landingspagina, hoogste verkeer |
| 2 | Personeel Aanvragen | `https://www.toptalentjobs.nl/personeel-aanvragen/` | Conversie (klant) | CSR (`"use client"`) | N/A (static shell) | Primaire klant-conversie flow |
| 3 | Inschrijven | `https://www.toptalentjobs.nl/inschrijven/` | Conversie (kandidaat) | CSR (`"use client"`) | N/A (static shell) | Primaire kandidaat-conversie flow |
| 4 | Diensten Overzicht | `https://www.toptalentjobs.nl/diensten/` | Informatie | SSG (ISR) | 86400s (1d) | SEO hub voor diensten, interne linking |
| 5 | Diensten/Uitzenden | `https://www.toptalentjobs.nl/diensten/uitzenden/` | Informatie/SEO | SSG (ISR) | 3600s (1u) | Belangrijkste dienstenpagina, long-tail SEO |

## Rendering-strategie per pagina

### 1. Homepage (`/`)
- **Server Component** met `export const revalidate = 3600`
- Gebruikt `dynamic()` imports voor 7 zware componenten (MarqueeBanner, HowWeWorkCarousel, WhyTopTalent, ServicesSection, TestimonialCarousel, FAQObjections, DynamicCTA)
- Heeft FAQPage structured data (JSON-LD)
- Canonical: `https://www.toptalentjobs.nl/`

### 2. Personeel Aanvragen (`/personeel-aanvragen/`)
- **Client Component** (`"use client"`) — hele pagina is CSR
- Bevat `<Suspense>` wrapper voor PersoneelAanvragenWizard
- Geen eigen metadata export (erft van layout)
- Geen structured data

### 3. Inschrijven (`/inschrijven/`)
- **Client Component** (`"use client"`) — hele pagina is CSR
- Bevat `<Suspense>` wrapper voor InschrijfFormulier
- Bevat floating ReferralBanner (fixed positioned)
- Geen eigen metadata export

### 4. Diensten (`/diensten/`)
- **Server Component** met `revalidate = 86400`
- Metadata: title="Onze Diensten", goede description
- Gebruikt PremiumImage + ClientAnimationWrapper

### 5. Diensten/Uitzenden (`/diensten/uitzenden/`)
- **Server Component** met `revalidate = 3600`
- Metadata: title="Uitzenden", goede description
- Bevat FAQ component met structured data potentieel

## Opmerkingen

- **Geen `/vacatures` pagina** — er zijn geen individuele vacature/dienst-detailpagina's voor kandidaten
- **Geen JobPosting structured data** in de hele codebase (0 matches)
- Personeel-aanvragen en Inschrijven zijn volledig CSR — dit heeft impact op SEO en LCP
- Homepage gebruikt slim `dynamic()` imports voor code-splitting
- `trailingSlash: true` in next.config — alle URL's eindigen op `/`

## Verkeer (te bevragen bij eigenaar)
- Google Search Console data nodig voor exacte traffic-verdeling
- Verwachting: Homepage > Diensten > Locatie-pagina's > Inschrijven > Personeel-aanvragen
