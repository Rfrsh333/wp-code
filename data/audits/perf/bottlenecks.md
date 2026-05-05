# Performance Bottleneck Analyse

**Datum:** 2026-04-22

## 1. Images

### Positief
- `next/image` wordt correct gebruikt via `PremiumImage` wrapper
- `next.config.ts` configureert AVIF + WebP formaten
- Hero component gebruikt `priority` prop op de barista afbeelding
- PremiumImage heeft IntersectionObserver lazy-loading
- Image cache TTL: 30 dagen
- Remote patterns geconfigureerd voor Supabase storage

### Problemen
- **Geen `priority` op LCP image voor diensten-pagina's** — PremiumImage standaard `priority=false`
- Powder splash achtergrond in Hero laadt eagerly zonder priority
- Locatie hero images (PNG formaat) — beter als WebP/AVIF source

### Aanbevelingen
| Fix | Impact | Moeite |
|-----|--------|--------|
| `priority` op LCP image per pagina | LCP -0.5-1s | Laag |
| Locatie images als WebP source leveren | FCP -0.2s | Medium |

---

## 2. Fonts

### Positief
- `next/font` correct gebruikt (Inter + Plus Jakarta Sans)
- `display: "swap"` actief — geen FOIT
- Specifieke gewichten geladen (400-800) — geen volledige font family
- Preconnect naar Google Fonts ✓

### Problemen
- **2 font families geladen** — Plus Jakarta Sans alleen voor headings (600-800)
- Geen `preload` op kritieke font-bestanden

### Aanbevelingen
| Fix | Impact | Moeite |
|-----|--------|--------|
| Evalueer of 1 font family volstaat | -10-20KB | Laag |
| Subset fonts tot NL karakterset | -5KB | Laag |

---

## 3. JavaScript

### KRITIEK: CSR Pagina's

**`/personeel-aanvragen/` en `/inschrijven/` zijn volledig `"use client"`.**

Dit betekent:
1. Server stuurt lege HTML shell (geen content)
2. Browser moet ALLE JS downloaden
3. JS moet parsen + uitvoeren
4. React hydrateerd en rendert content
5. Pas DAN ziet gebruiker iets → **LCP 9.7-9.8s**

**Oplossing:** Maak de pagina een Server Component, wrap alleen het formulier in `<Suspense>`:

```tsx
// VOOR (slecht):
"use client";
export default function Page() { return <Form /> }

// NA (goed):
export default function Page() {
  return (
    <>
      <h1>Personeel aanvragen</h1>  {/* SSR — instant zichtbaar */}
      <p>Trust indicators...</p>      {/* SSR */}
      <Suspense fallback={<FormSkeleton />}>
        <Form />  {/* Client component, lazy geladen */}
      </Suspense>
    </>
  );
}
```

### Bundle Analyse

**Zware dependencies:**
| Package | Geschatte grootte (gzip) | Gebruik |
|---------|--------------------------|---------|
| `framer-motion` | ~35KB | Animaties (homepage, diensten) |
| `recharts` | ~45KB | Admin dashboards |
| `@react-pdf/renderer` | ~80KB | PDF generatie |
| `react-day-picker` | ~12KB | Datum selectie |
| `@hello-pangea/dnd` | ~30KB | Drag & drop (admin) |
| `signature_pad` | ~8KB | Contract ondertekening |

**Mitigatie:**
- `optimizePackageImports` in next.config.ts dekt recharts, lucide-react, date-fns, framer-motion ✓
- `dynamic()` imports op homepage voor 7 zware componenten ✓
- **Maar:** `framer-motion` wordt in veel componenten geïmporteerd via `FadeIn` wrapper

### Third-party Scripts
| Script | Strategie | Impact |
|--------|-----------|--------|
| GTM | `afterInteractive` ✓ | Goed — blokkeert niet |
| Vercel Analytics | Consent-gated ✓ | Nul impact zonder consent |
| Vercel Speed Insights | Consent-gated ✓ | Nul impact zonder consent |
| Sentry | Via SDK, niet script | Normaal |

---

## 4. CSS

### Positief
- Tailwind CSS 4 met PostCSS
- `optimizeCss: true` in experimental config (Critters voor critical CSS)
- `tw-animate-css` voor animatie utilities

### Problemen
- Geen significante CSS bottlenecks gevonden
- Tailwind purge werkt correct (alleen gebruikte classes)

---

## 5. Database Fetches (SSR)

### Positief
- Homepage: geen database calls (statisch met ISR)
- Diensten: geen database calls (statisch)
- Blog: `generateStaticParams` + ISR

### Potentiële Watervallen
- Sitemap: 3 sequentiële Supabase queries (editorial_drafts, faq_items) — niet kritiek want build-time
- Locatie pagina's: `getLocation()` is lokale data lookup, geen DB ✓

---

## 6. Hydration Cost

### Top-3 Zwaarste Client Components

1. **InschrijfFormulier** (inschrijven pagina)
   - Multi-stap wizard met react-hook-form + zod validatie
   - ReferralBanner met modal + clipboard API
   - Geschatte hydration: ~50KB JS

2. **PersoneelAanvragenWizard** (personeel-aanvragen)
   - Multi-stap wizard formulier
   - Geschatte hydration: ~40KB JS

3. **Hero** (homepage)
   - `useInView`, `useCountUp`, `useScrollPosition` hooks
   - Staggered animaties met IntersectionObserver
   - 2 images + stats counter
   - Geschatte hydration: ~15KB JS

### Aanbeveling
- Hero animaties zijn acceptabel (homepage is SSR, content al zichtbaar)
- **Formulier-pagina's zijn het probleem** — niet de componenten zelf, maar dat de HELE pagina client-side is

---

## Impact Matrix

| Bottleneck | Severity | Pagina's | Verwachte LCP Impact |
|-----------|----------|----------|---------------------|
| CSR op personeel-aanvragen | **CRITICAL** | 1 | -7s (van 9.7 naar ~2.5s) |
| CSR op inschrijven | **CRITICAL** | 1 | -7s (van 9.8 naar ~2.5s) |
| LCP image priority ontbreekt | HIGH | 3 | -0.5-1s |
| Unused JavaScript | MEDIUM | 5 | -0.2-0.5s |
| Dubbele font family | LOW | Alle | -0.1s |
