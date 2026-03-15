/**
 * Debug aanmeldingen flow
 *
 * Check de complete flow van medewerker aanmelding tot klant weergave
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAanmeldingen() {
  console.log('🔍 Debugging Aanmeldingen Flow\n');
  console.log('='.repeat(60) + '\n');

  // 1. Check alle aanmeldingen
  const { data: alleAanmeldingen, error: e1 } = await supabase
    .from('dienst_aanmeldingen')
    .select('id, dienst_id, medewerker_id, status, aangemeld_at')
    .order('aangemeld_at', { ascending: false })
    .limit(10);

  if (e1) {
    console.error('❌ Error fetching aanmeldingen:', e1);
    return;
  }

  console.log(`📊 Total aanmeldingen (last 10):\n`);
  if (!alleAanmeldingen || alleAanmeldingen.length === 0) {
    console.log('   ⚠️  No aanmeldingen found in database!\n');
  } else {
    alleAanmeldingen.forEach((a, i) => {
      console.log(`   ${i + 1}. ID: ${a.id.slice(0, 8)}... | Status: ${a.status || 'NULL'} | Aangemeld: ${a.aangemeld_at || 'unknown'}`);
    });
    console.log('');
  }

  // 2. Count by status
  const { data: statusCount, error: e2 } = await supabase
    .from('dienst_aanmeldingen')
    .select('status');

  if (!e2 && statusCount) {
    const counts = statusCount.reduce((acc, a) => {
      const status = a.status || 'NULL';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Aanmeldingen by status:\n');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    console.log('');
  }

  // 3. Check recent diensten met hun aanmeldingen
  const { data: recentDiensten, error: e3 } = await supabase
    .from('diensten')
    .select('id, klant_naam, datum, functie, status, klant_id')
    .gte('datum', new Date().toISOString().split('T')[0])
    .order('datum', { ascending: true })
    .limit(5);

  if (!e3 && recentDiensten && recentDiensten.length > 0) {
    console.log('🗓️  Recent upcoming diensten:\n');

    for (const dienst of recentDiensten) {
      // Get aanmeldingen for this dienst
      const { data: dienstAanmeldingen } = await supabase
        .from('dienst_aanmeldingen')
        .select('id, status')
        .eq('dienst_id', dienst.id);

      const count = dienstAanmeldingen?.length || 0;
      const aangemeldCount = dienstAanmeldingen?.filter(a => a.status === 'aangemeld').length || 0;
      const geaccepteerdCount = dienstAanmeldingen?.filter(a => a.status === 'geaccepteerd').length || 0;

      console.log(`   📅 ${dienst.datum} | ${dienst.klant_naam} | ${dienst.functie}`);
      console.log(`      Klant ID: ${dienst.klant_id?.slice(0, 8) || 'none'}...`);
      console.log(`      Total aanmeldingen: ${count} (${aangemeldCount} aangemeld, ${geaccepteerdCount} geaccepteerd)`);
      console.log('');
    }
  }

  // 4. Test de API logic
  console.log('🧪 Testing count logic (mimicking /api/klant/diensten):\n');

  if (recentDiensten && recentDiensten.length > 0) {
    const testDienst = recentDiensten[0];
    const { data: aanmeldingen } = await supabase
      .from('dienst_aanmeldingen')
      .select('id, dienst_id, status')
      .in('dienst_id', [testDienst.id]);

    const countMap = { total: 0, aangemeld: 0, geaccepteerd: 0 };
    (aanmeldingen || []).forEach((a) => {
      countMap.total++;
      if (a.status === 'aangemeld') countMap.aangemeld++;
      if (a.status === 'geaccepteerd') countMap.geaccepteerd++;
    });

    console.log(`   Test dienst: ${testDienst.datum} | ${testDienst.functie}`);
    console.log(`   Count result:`);
    console.log(`      - aanmeldingen_count: ${countMap.total}`);
    console.log(`      - aanmeldingen_aangemeld: ${countMap.aangemeld}`);
    console.log(`      - aanmeldingen_geaccepteerd: ${countMap.geaccepteerd}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('✅ Debug complete\n');
}

debugAanmeldingen()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
