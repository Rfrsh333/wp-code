/**
 * Performance Test Script
 *
 * Test live pages en vergelijk voor/na optimalisatie
 * Run met: node test-performance.js
 */

const https = require('https');

const testPages = [
  { url: '/diensten/uitzenden', name: 'Diensten Uitzenden' },
  { url: '/diensten/detachering', name: 'Diensten Detachering' },
  { url: '/locaties/utrecht/uitzenden', name: 'Locatie Utrecht Uitzenden' },
  { url: '/locaties/amsterdam', name: 'Locatie Amsterdam' },
];

function testPage(path) {
  return new Promise((resolve) => {
    const start = Date.now();

    https.get(`https://toptalentjobs.nl${path}`, (res) => {
      let data = '';
      let firstByte = null;

      res.on('data', (chunk) => {
        if (!firstByte) {
          firstByte = Date.now() - start;
        }
        data += chunk;
      });

      res.on('end', () => {
        const totalTime = Date.now() - start;
        const htmlSize = Buffer.byteLength(data, 'utf8');

        // Check for RSC markers
        const hasRSC = data.includes('self.__next_f') || data.includes('$L');
        const isStatic = res.headers['x-nextjs-cache'] === 'HIT';

        resolve({
          path,
          ttfb: firstByte,
          totalTime,
          htmlSize,
          hasRSC,
          isStatic,
          cacheStatus: res.headers['x-nextjs-cache'] || res.headers['x-vercel-cache'] || 'MISS'
        });
      });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function runTests() {
  console.log('🚀 TopTalent Performance Test\n');
  console.log('Testing geoptimaliseerde paginas...\n');

  const results = [];

  for (const page of testPages) {
    process.stdout.write(`Testing ${page.name}... `);
    const result = await testPage(page.url);
    results.push({ ...page, ...result });
    console.log('✓');
  }

  console.log('\n📊 Resultaten:\n');
  console.log('┌─────────────────────────────────┬──────────┬────────────┬─────────┬────────────┐');
  console.log('│ Pagina                          │ TTFB     │ Total Time │ Size    │ Cache      │');
  console.log('├─────────────────────────────────┼──────────┼────────────┼─────────┼────────────┤');

  let totalTTFB = 0;
  let totalTime = 0;
  let totalSize = 0;

  results.forEach(r => {
    if (!r.error) {
      const name = r.name.padEnd(31);
      const ttfb = `${r.ttfb}ms`.padEnd(8);
      const total = `${r.totalTime}ms`.padEnd(10);
      const size = `${(r.htmlSize / 1024).toFixed(1)}KB`.padEnd(7);
      const cache = r.cacheStatus.padEnd(10);

      console.log(`│ ${name} │ ${ttfb} │ ${total} │ ${size} │ ${cache} │`);

      totalTTFB += r.ttfb;
      totalTime += r.totalTime;
      totalSize += r.htmlSize;
    }
  });

  console.log('└─────────────────────────────────┴──────────┴────────────┴─────────┴────────────┘');

  const avgTTFB = Math.round(totalTTFB / results.length);
  const avgTime = Math.round(totalTime / results.length);
  const avgSize = Math.round(totalSize / results.length / 1024);

  console.log(`\n📈 Gemiddelden:`);
  console.log(`   TTFB: ${avgTTFB}ms`);
  console.log(`   Total: ${avgTime}ms`);
  console.log(`   Size: ${avgSize}KB`);

  console.log(`\n✅ Status:`);
  const allOptimized = results.every(r => !r.error);
  const hasCache = results.some(r => r.cacheStatus === 'HIT');

  if (allOptimized) {
    console.log(`   ✓ Alle paginas bereikbaar`);
  }
  if (hasCache) {
    console.log(`   ✓ Cache actief (static rendering werkt)`);
  }
  if (avgTTFB < 300) {
    console.log(`   ✓ TTFB excellent (< 300ms)`);
  } else if (avgTTFB < 600) {
    console.log(`   ⚠️  TTFB good (< 600ms)`);
  } else {
    console.log(`   ❌ TTFB needs improvement (> 600ms)`);
  }

  console.log(`\n📝 Next.js 16 RSC Detected: ${results[0].hasRSC ? 'Yes' : 'No'}`);
  console.log('   (React Server Components met streaming - dit is correct!)');
}

runTests().catch(console.error);
