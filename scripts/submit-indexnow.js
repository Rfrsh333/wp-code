#!/usr/bin/env node

/**
 * IndexNow URL Submission Script
 *
 * Submits URLs directly to search engines using IndexNow protocol
 * Supported by: Bing, Yandex, Naver, Seznam
 * Google indexeert via sitemap + Search Console
 */

const https = require('https');

const SITE_URL = 'www.toptalentjobs.nl';

// URLs die je wilt laten indexeren
const urlsToSubmit = [
  'https://www.toptalentjobs.nl/locaties/utrecht/',
  'https://www.toptalentjobs.nl/locaties/utrecht/uitzenden/',
  'https://www.toptalentjobs.nl/locaties/utrecht/detachering/',
  'https://www.toptalentjobs.nl/locaties/den-haag/',
  'https://www.toptalentjobs.nl/locaties/den-haag/uitzenden/',
  'https://www.toptalentjobs.nl/locaties/den-haag/detachering/',
  'https://www.toptalentjobs.nl/locaties/eindhoven/',
  'https://www.toptalentjobs.nl/locaties/eindhoven/uitzenden/',
  'https://www.toptalentjobs.nl/locaties/eindhoven/detachering/',
];

/**
 * Submit URLs to IndexNow
 */
async function submitToIndexNow() {
  const data = JSON.stringify({
    host: SITE_URL,
    urlList: urlsToSubmit,
  });

  const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`StatusCode: ${res.statusCode}`);

      if (res.statusCode === 200) {
        console.log('✅ URLs succesvol ingediend bij IndexNow!');
        console.log(`📊 ${urlsToSubmit.length} URLs verzonden naar:`);
        console.log('   - Bing');
        console.log('   - Yandex');
        console.log('   - Naver');
        console.log('   - Seznam');
      } else if (res.statusCode === 202) {
        console.log('✅ URLs geaccepteerd en worden verwerkt');
      } else {
        console.log('⚠️  Unexpected status code:', res.statusCode);
      }

      res.on('data', (d) => {
        if (d.toString().trim()) {
          console.log('Response:', d.toString());
        }
      });

      resolve();
    });

    req.on('error', (error) => {
      console.error('❌ Error submitting to IndexNow:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Print Google Search Console instructions
 */
function printGoogleInstructions() {
  console.log('\n📋 Voor Google Search Console:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Ga naar: https://search.google.com/search-console');
  console.log('2. Selecteer je property: www.toptalentjobs.nl');
  console.log('3. Klik linksboven op het vergrootglas (URL Inspection)');
  console.log('4. Plak deze URLs één voor één en klik "Request Indexing":');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  urlsToSubmit.forEach((url) => {
    console.log(`   ${url}`);
  });

  console.log('\n💡 Tips:');
  console.log('   - Google mag max 10 URLs per dag handmatig');
  console.log('   - Doe eerst de belangrijkste steden (Utrecht, Den Haag)');
  console.log('   - Automatische indexering via sitemap kan 1-7 dagen duren');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main execution
(async () => {
  console.log('🚀 Starting IndexNow submission...\n');
  console.log(`📍 Site: ${SITE_URL}`);
  console.log(`📄 URLs to submit: ${urlsToSubmit.length}\n`);

  try {
    await submitToIndexNow();
    printGoogleInstructions();
  } catch (error) {
    console.error('Failed to submit URLs:', error);
    process.exit(1);
  }
})();
