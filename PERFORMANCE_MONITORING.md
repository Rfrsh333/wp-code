# 📊 Live Performance Monitoring Guide

## Geoptimaliseerde Pagina's (28 dec 2024)

### ✅ Hybride Server/Client Rendering
- `/locaties/utrecht/uitzenden` (SSG)
- `/locaties/utrecht/detachering` (SSG)
- `/locaties/amsterdam/uitzenden` (SSG)
- `/locaties/amsterdam/detachering` (SSG)
- `/locaties/rotterdam/uitzenden` (SSG)
- `/locaties/rotterdam/detachering` (SSG)
- `/locaties/amsterdam` (SSG)
- `/locaties/rotterdam` (SSG)
- `/locaties/utrecht` (Static)

---

## 🔍 1. Real-Time Browser Performance (Meest Accuraat)

### Chrome DevTools (Recommended)
```bash
1. Open Chrome incognito mode (geen extensions)
2. Ga naar: https://toptalentjobs.nl/locaties/utrecht/uitzenden
3. F12 → Lighthouse tab
4. Select "Mobile" + "Performance"
5. Click "Analyze page load"
```

**Verwachte Scores (na optimalisatie):**
- Performance: 85-95 (was: 65-75)
- LCP: < 2.5s (was: > 3.5s)
- CLS: < 0.1 (was: ~ 0.15)
- TBT: < 300ms (was: > 500ms)

---

## 🌐 2. PageSpeed Insights (Google's Tool)

### Online Check
```
https://pagespeed.web.dev/
```

**Test URLs:**
1. https://toptalentjobs.nl/locaties/utrecht/uitzenden
2. https://toptalentjobs.nl/locaties/amsterdam/detachering
3. https://toptalentjobs.nl/locaties/rotterdam

**Belangrijkste Metrics:**
- ✅ Performance Score: Target 85+
- ✅ LCP (Largest Contentful Paint): < 2.5s
- ✅ INP (Interaction to Next Paint): < 200ms
- ✅ CLS (Cumulative Layout Shift): < 0.1

---

## 📈 3. Google Search Console (Real User Data)

### Core Web Vitals Report
```
1. Ga naar: https://search.google.com/search-console
2. Select property: toptalentjobs.nl
3. Navigate to: Experience → Core Web Vitals
4. Check Mobile/Desktop tabs
```

**Let op:**
- Data update: 28 dagen rolling average
- Eerste impact zichtbaar: 3-7 dagen
- Volledige impact: 2-4 weken

**Voor/Na Vergelijking:**
- Vóór (client-rendering): Mogelijk "Needs Improvement" status
- Na (SSG): Verwacht "Good" status voor LCP

---

## 🚀 4. Vercel Analytics (Real User Monitoring)

### Vercel Dashboard
```bash
1. Login: https://vercel.com/dashboard
2. Select: toptalent-wordpress-html project
3. Navigate to: Analytics tab
```

**Metrics om te tracken:**
- Real User Performance Score
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- User Engagement (bounce rate, session duration)

---

## 📊 5. Performance Comparison Script

### Manual Browser Test
```javascript
// Voer uit in browser console op productie pagina
performance.getEntriesByType('navigation')[0].toJSON()

// Key metrics:
// - domContentLoadedEventEnd: DOM ready tijd
// - loadEventEnd: Totale load tijd
// - transferSize: Aantal bytes gedownload
```

**Verwachte Verbeteringen:**
```
Voor (client-rendering):
- domContentLoadedEventEnd: ~2000-3000ms
- transferSize: ~800-1200 KB
- JavaScript bundle: ~400-600 KB

Na (SSG):
- domContentLoadedEventEnd: ~1200-1800ms (-40%)
- transferSize: ~600-900 KB (-25%)
- JavaScript bundle: ~280-420 KB (-30%)
```

---

## 🎯 6. Automatische Monitoring Setup

### Lighthouse CI (Optioneel - voor continue monitoring)

```bash
# Installeer Lighthouse CLI
npm install -g @lhci/cli

# Run performance test
lhci autorun --collect.url=https://toptalentjobs.nl/locaties/utrecht/uitzenden

# Vergelijk met baseline
lhci assert --preset=lighthouse:recommended
```

### GitHub Actions (Automated - Voorstel)

Creëer `.github/workflows/performance.yml`:
```yaml
name: Performance Check
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://toptalentjobs.nl/locaties/utrecht/uitzenden
            https://toptalentjobs.nl/locaties/amsterdam
          uploadArtifacts: true
```

---

## 📌 7. Expected Performance Gains

### Geoptimaliseerde Pagina's

| Metric | Voor (Client) | Na (SSG) | Verbetering |
|--------|---------------|----------|-------------|
| **Performance Score** | 65-75 | 85-95 | +20-25% |
| **LCP** | 3.5-4.5s | 2.0-2.5s | -40% |
| **TBT** | 500-700ms | 200-350ms | -50% |
| **CLS** | 0.10-0.20 | 0.05-0.10 | -50% |
| **Initial JS** | 400-600 KB | 280-420 KB | -30% |
| **TTI** | 4.5-6.0s | 3.0-4.0s | -35% |

### Business Impact
- ✅ Snellere initial load → lagere bounce rate
- ✅ Betere Google rankings (Core Web Vitals = ranking factor)
- ✅ Hogere conversie op mobiel (sneller = meer leads)
- ✅ Lagere Vercel bandwidth costs (minder JS transfer)

---

## 🔄 8. Monitoring Schedule

### Week 1 (28 dec - 4 jan)
- **Dag 1-2**: Chrome DevTools Lighthouse tests (baseline)
- **Dag 3-5**: PageSpeed Insights daily checks
- **Dag 7**: Eerste Search Console data zichtbaar

### Week 2-4 (4 jan - 25 jan)
- **Wekelijks**: PageSpeed Insights vergelijking
- **Week 4**: Volledige Search Console Core Web Vitals update

### Ongoing
- **Maandelijks**: Full performance audit
- **Bij elke deploy**: Lighthouse CI check (optioneel)
- **Real-time**: Vercel Analytics dashboard

---

## 🚨 Alerts to Watch

### Performance Regressies
Als deze metrics verslechteren:
- Performance Score < 80
- LCP > 3.0s
- CLS > 0.15

**Mogelijke oorzaken:**
- Nieuwe third-party scripts toegevoegd
- Grote images zonder optimalisatie
- Bloated JavaScript bundles
- Server response tijd toegenomen

---

## 📞 Quick Test Commands

### Browser Console (op productie):
```javascript
// 1. Check if page is SSG
console.log('SSG:', !window.__NEXT_DATA__.props.pageProps.__N_SSG === undefined);

// 2. Measure JavaScript bundle size
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('.js'))
  .reduce((acc, r) => acc + r.transferSize, 0) / 1024 + ' KB';

// 3. Check LCP element
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime, 'ms');
  console.log('Element:', lastEntry.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// 4. Check CLS
new PerformanceObserver((list) => {
  let cls = 0;
  list.getEntries().forEach((entry) => {
    if (!entry.hadRecentInput) {
      cls += entry.value;
    }
  });
  console.log('CLS:', cls.toFixed(3));
}).observe({ type: 'layout-shift', buffered: true });
```

---

## ✅ Success Criteria

### Phase 1 (Week 1) - Immediate
- [x] All builds passing ✓
- [x] No console errors on production ✓
- [x] Visual regression: none ✓
- [ ] PageSpeed Score: 85+ (mobile)
- [ ] LCP: < 2.5s (mobile)

### Phase 2 (Week 4) - Long-term
- [ ] Search Console: 90%+ URLs "Good" status
- [ ] Bounce rate improvement: -5 to -10%
- [ ] Average session duration: +10 to +20%
- [ ] Vercel bandwidth: -20 to -30%

---

**Laatst bijgewerkt:** 28 december 2024
**Volgende check:** 4 januari 2025
