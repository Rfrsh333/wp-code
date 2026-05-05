# Lighthouse Summary — Performance + SEO Audit

**Datum:** 2026-04-22
**Tool:** Lighthouse 13.1.0, mobile simulated throttling
**PSI Field Data:** Niet beschikbaar (API quota exceeded)

## Scores Overzicht (Mobile)

| Pagina | Perf | A11y | Best Practices | SEO | LCP | FCP | TBT | CLS | SI |
|--------|------|------|----------------|-----|-----|-----|-----|-----|-----|
| **Homepage** `/` | **87** | 97 | 92 | 100 | 3.8s | 1.6s | 70ms | 0 | 3.4s |
| **Personeel Aanvragen** `/personeel-aanvragen/` | **56** | 96 | 96 | 100 | **9.7s** | **9.0s** | 0ms | 0 | **9.0s** |
| **Inschrijven** `/inschrijven/` | **56** | 90 | 96 | 100 | **9.8s** | **8.9s** | 0ms | 0 | **9.3s** |
| **Diensten** `/diensten/` | **80** | 96 | 96 | 100 | 4.1s | 2.6s | 60ms | 0 | 4.9s |
| **Uitzenden** `/diensten/uitzenden/` | **85** | 96 | 96 | 100 | 3.5s | 2.5s | 60ms | 0 | 4.7s |

## Core Web Vitals Assessment

| Metric | Drempel | Homepage | Personeel | Inschrijven | Diensten | Uitzenden |
|--------|---------|----------|-----------|-------------|----------|-----------|
| LCP | < 2.5s | NEEDS IMPROVEMENT (3.8s) | **POOR (9.7s)** | **POOR (9.8s)** | NEEDS IMPROVEMENT (4.1s) | NEEDS IMPROVEMENT (3.5s) |
| INP | < 200ms | N/A (lab) | N/A (lab) | N/A (lab) | N/A (lab) | N/A (lab) |
| CLS | < 0.1 | GOOD (0) | GOOD (0) | GOOD (0) | GOOD (0) | GOOD (0) |

**Samenvatting:**
- CLS is excellent op alle pagina's (0)
- TBT is laag op alle pagina's (0-70ms) — goed voor INP
- **LCP is het grote probleem**: geen enkele pagina haalt de 2.5s drempel
- Personeel-aanvragen en Inschrijven zijn **catastrofaal** (9.7-9.8s LCP) door volledige CSR

## Top Opportunities per Pagina

### Homepage (87)
1. `unused-javascript`: 210ms savings (75 KiB)

### Personeel Aanvragen (56) — KRITIEK
1. `unused-javascript`: **2,270ms savings** (252 KiB)
- Oorzaak: Hele pagina is `"use client"` — alle JS moet laden + uitvoeren voor *enige* content

### Inschrijven (56) — KRITIEK
1. `unused-javascript`: **2,060ms savings** (252 KiB)
- Zelfde probleem als personeel-aanvragen: volledige CSR

### Diensten (80)
1. `unused-javascript`: 450ms savings (75 KiB)

### Uitzenden (85)
1. `unused-javascript`: 300ms savings (76 KiB)

## Drie Hoofdadviezen

1. **CRITICAL: Personeel-aanvragen en Inschrijven omzetten van CSR naar SSR**
   - Huidige status: `"use client"` op page level = 0 content in initial HTML
   - Impact: LCP gaat van 9.7s naar ~2-3s (verwacht ~70% verbetering)
   - Oplossing: Server component met static shell + `<Suspense>` rond form

2. **HIGH: LCP verbeteren op homepage en diensten**
   - LCP element is waarschijnlijk een heading of hero image
   - `priority` prop op hero image verifiëren
   - Font preload optimaliseren

3. **MEDIUM: Unused JavaScript reduceren (75-252 KiB)**
   - Tree-shaking verbeteren voor framer-motion, recharts, lucide-react
   - Dynamic imports gebruiken waar mogelijk
