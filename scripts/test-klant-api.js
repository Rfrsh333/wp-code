/**
 * Test exact API response voor klant dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testKlantAPI() {
  console.log('🔍 Testing Klant API Response\n');
  console.log('='.repeat(60) + '\n');

  // Get all klanten
  const { data: klanten, error: e1 } = await supabaseAdmin
    .from('klanten')
    .select('id, bedrijfsnaam, email')
    .limit(5);

  if (e1 || !klanten || klanten.length === 0) {
    console.error('❌ No klanten found');
    return;
  }

  console.log('👥 Available klanten:\n');
  klanten.forEach((k, i) => {
    console.log(`   ${i + 1}. ${k.bedrijfsnaam} (${k.email})`);
    console.log(`      ID: ${k.id}\n`);
  });

  // Test for EACH klant
  for (const klant of klanten) {
    console.log('─'.repeat(60));
    console.log(`\n🏢 Testing for klant: ${klant.bedrijfsnaam}\n`);

    const today = new Date().toISOString().split('T')[0];

    // Exact same query as /api/klant/diensten GET
    const { data: diensten } = await supabaseAdmin
      .from('diensten')
      .select('id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, status')
      .eq('klant_id', klant.id)
      .gte('datum', today)
      .neq('status', 'geannuleerd')
      .order('datum', { ascending: true })
      .limit(100);

    if (!diensten || diensten.length === 0) {
      console.log('   ℹ️  No diensten found for this klant\n');
      continue;
    }

    console.log(`   📅 Found ${diensten.length} diensten:\n`);

    const dienstIds = diensten.map(d => d.id);

    // Exact same query as API
    const { data: aanmeldingen } = await supabaseAdmin
      .from('dienst_aanmeldingen')
      .select('id, dienst_id, status')
      .in('dienst_id', dienstIds);

    console.log(`   👤 Found ${aanmeldingen?.length || 0} total aanmeldingen\n`);

    // Exact same count logic as API
    const countMap = {};
    (aanmeldingen || []).forEach((a) => {
      if (!countMap[a.dienst_id]) {
        countMap[a.dienst_id] = { total: 0, aangemeld: 0, geaccepteerd: 0 };
      }
      countMap[a.dienst_id].total++;
      if (a.status === 'aangemeld') countMap[a.dienst_id].aangemeld++;
      if (a.status === 'geaccepteerd') countMap[a.dienst_id].geaccepteerd++;
    });

    // Map result exactly as API
    const result = diensten.map(d => ({
      ...d,
      aanmeldingen_count: countMap[d.id]?.total || 0,
      aanmeldingen_aangemeld: countMap[d.id]?.aangemeld || 0,
      aanmeldingen_geaccepteerd: countMap[d.id]?.geaccepteerd || 0,
    }));

    // Show results
    result.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.datum} | ${d.functie} | ${d.locatie}`);
      console.log(`      Status: ${d.status}`);
      console.log(`      Aanmeldingen: ${d.aanmeldingen_count} total`);
      console.log(`         └─ ${d.aanmeldingen_aangemeld} aangemeld`);
      console.log(`         └─ ${d.aanmeldingen_geaccepteerd} geaccepteerd`);

      if (d.aanmeldingen_count > 0) {
        console.log(`      🎯 SHOULD SHOW BADGE!`);
      } else {
        console.log(`      ⚠️  No aanmeldingen - badge will NOT show`);
      }
      console.log('');
    });
  }

  console.log('='.repeat(60));
  console.log('✅ Test complete\n');
}

testKlantAPI()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
