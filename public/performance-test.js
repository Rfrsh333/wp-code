/**
 * TopTalent Jobs - Live Performance Monitor
 *
 * Gebruik: Plak deze code in de browser console op productie
 * of voeg toe aan de pagina met: <script src="/performance-test.js"></script>
 */

(function() {
  console.log('%c📊 TopTalent Performance Monitor', 'font-size: 20px; font-weight: bold; color: #F97316');
  console.log('%cGeoptimaliseerd op: 28 december 2024', 'color: #666; font-style: italic');
  console.log('');

  // Helper functie
  function formatBytes(bytes) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }

  function formatMs(ms) {
    return ms.toFixed(0) + 'ms';
  }

  // 1. Check if SSG
  console.log('%c1. Rendering Mode', 'font-weight: bold; color: #F97316');
  const isSSG = window.__NEXT_DATA__?.props?.pageProps?.__N_SSG !== undefined;
  const isStatic = !window.__NEXT_DATA__?.props?.pageProps;
  const mode = isSSG ? '● SSG (Server-Side Generated)' : isStatic ? '○ Static' : '⚠️  Client-Only';
  console.log('   Mode:', mode);
  console.log('   Status:', isSSG || isStatic ? '✅ Optimized' : '❌ Needs optimization');
  console.log('');

  // 2. JavaScript Bundle Size
  console.log('%c2. JavaScript Bundle Size', 'font-weight: bold; color: #F97316');
  const jsResources = performance.getEntriesByType('resource')
    .filter(r => r.name.includes('.js') && r.initiatorType === 'script');

  const totalJS = jsResources.reduce((acc, r) => acc + (r.transferSize || 0), 0);
  console.log('   Total JS:', formatBytes(totalJS));
  console.log('   Files:', jsResources.length);
  console.log('   Target: < 420 KB', totalJS < 420 * 1024 ? '✅' : '⚠️');
  console.log('');

  // 3. Navigation Timing
  console.log('%c3. Page Load Metrics', 'font-weight: bold; color: #F97316');
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) {
    console.log('   DOM Content Loaded:', formatMs(nav.domContentLoadedEventEnd));
    console.log('   Full Page Load:', formatMs(nav.loadEventEnd));
    console.log('   Transfer Size:', formatBytes(nav.transferSize));
    console.log('   Target DCL: < 1800ms', nav.domContentLoadedEventEnd < 1800 ? '✅' : '⚠️');
  }
  console.log('');

  // 4. Largest Contentful Paint (LCP)
  console.log('%c4. Core Web Vitals', 'font-weight: bold; color: #F97316');

  // LCP Observer
  let lcpValue = 0;
  let lcpElement = null;
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    lcpValue = lastEntry.renderTime || lastEntry.loadTime;
    lcpElement = lastEntry.element;
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  setTimeout(() => {
    console.log('   LCP (Largest Contentful Paint):', formatMs(lcpValue));
    console.log('   Element:', lcpElement?.tagName || 'N/A');
    console.log('   Target: < 2500ms', lcpValue < 2500 ? '✅' : lcpValue < 4000 ? '⚠️  Needs improvement' : '❌ Poor');

    // Clean up
    lcpObserver.disconnect();
  }, 3000);

  // CLS Observer
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  setTimeout(() => {
    console.log('   CLS (Cumulative Layout Shift):', clsValue.toFixed(3));
    console.log('   Target: < 0.10', clsValue < 0.10 ? '✅' : clsValue < 0.25 ? '⚠️  Needs improvement' : '❌ Poor');
    console.log('');

    // Clean up
    clsObserver.disconnect();

    // 5. Summary
    console.log('%c5. Performance Summary', 'font-weight: bold; color: #F97316');
    const score = calculateScore(isSSG || isStatic, totalJS, nav, lcpValue, clsValue);
    console.log('   Estimated Score:', score.value + '/100', score.badge);
    console.log('   Status:', score.status);
    console.log('');

    // 6. Recommendations
    if (score.value < 85) {
      console.log('%c6. Recommendations', 'font-weight: bold; color: #EA580C');
      score.recommendations.forEach(rec => {
        console.log('   ⚠️ ', rec);
      });
    } else {
      console.log('%c✅ Excellent Performance!', 'font-weight: bold; color: #10b981');
      console.log('   No immediate optimizations needed.');
    }
    console.log('');
    console.log('%cFull report: Run Lighthouse in Chrome DevTools', 'color: #666; font-style: italic');
  }, 3500);

  // Score calculation
  function calculateScore(isOptimized, jsSize, navTiming, lcp, cls) {
    let score = 50; // Base score
    const recommendations = [];

    // SSG bonus
    if (isOptimized) {
      score += 15;
    } else {
      recommendations.push('Convert to SSG/Static rendering');
      score -= 10;
    }

    // JS size
    if (jsSize < 300 * 1024) score += 10;
    else if (jsSize < 420 * 1024) score += 5;
    else {
      recommendations.push('Reduce JavaScript bundle size');
      score -= 5;
    }

    // DCL
    if (navTiming && navTiming.domContentLoadedEventEnd < 1500) score += 10;
    else if (navTiming && navTiming.domContentLoadedEventEnd < 1800) score += 5;
    else recommendations.push('Optimize DOM Content Loaded time');

    // LCP
    if (lcp < 2000) score += 15;
    else if (lcp < 2500) score += 10;
    else if (lcp < 4000) score += 5;
    else {
      recommendations.push('Improve LCP (optimize images, fonts, critical CSS)');
      score -= 10;
    }

    // CLS
    if (cls < 0.05) score += 10;
    else if (cls < 0.10) score += 5;
    else if (cls < 0.25) score += 2;
    else {
      recommendations.push('Fix layout shifts (set image dimensions, reserve space)');
      score -= 10;
    }

    // Cap at 100
    score = Math.min(100, Math.max(0, score));

    return {
      value: score,
      badge: score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴',
      status: score >= 90 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work',
      recommendations
    };
  }

  // Export results function
  window.exportPerformanceReport = function() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      mode: isSSG ? 'SSG' : isStatic ? 'Static' : 'Client',
      metrics: {
        jsSize: totalJS,
        dcl: nav?.domContentLoadedEventEnd,
        load: nav?.loadEventEnd,
        transferSize: nav?.transferSize,
        lcp: lcpValue,
        cls: clsValue
      }
    };
    console.log('Performance Report:', JSON.stringify(report, null, 2));
    return report;
  };

  console.log('%cℹ️  Tip: Run exportPerformanceReport() to get JSON data', 'color: #666; font-style: italic');
})();
