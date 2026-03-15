/**
 * Debug klant uren overzicht
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

async function debugUren() {
  console.log('🔍 Debugging Klant Uren Overzicht\n');
  console.log('='.repeat(60) + '\n');

  // Get klant "Tester"
  const { data: klanten } = await supabaseAdmin
    .from('klanten')
    .select('id, bedrijfsnaam')
    .limit(5);

  console.log('👥 Available klanten:');
  klanten?.forEach((k, i) => {
    console.log(`   ${i + 1}. ${k.bedrijfsnaam} (${k.id.slice(0, 8)}...)`);
  });
  console.log('');

  // Test for first klant with bedrijfsnaam "Tester"
  const testKlant = klanten?.find(k => k.bedrijfsnaam === 'Tester') || klanten?.[0];

  if (!testKlant) {
    console.log('❌ No klant found');
    return;
  }

  console.log(`🏢 Testing for klant: ${testKlant.bedrijfsnaam}\n`);

  // 1. Get diensten for this klant
  const { data: diensten } = await supabaseAdmin
    .from('diensten')
    .select('id, datum, functie')
    .eq('klant_id', testKlant.id)
    .limit(500);

  console.log(`📅 Diensten for this klant: ${diensten?.length || 0}`);
  diensten?.slice(0, 3).forEach((d, i) => {
    console.log(`   ${i + 1}. ${d.datum} | ${d.functie} | ID: ${d.id.slice(0, 8)}...`);
  });
  console.log('');

  if (!diensten?.length) {
    console.log('⚠️  No diensten found for this klant');
    return;
  }

  // 2. Check uren_registraties directly
  const { data: allUren, error: e1 } = await supabaseAdmin
    .from('uren_registraties')
    .select('id, aanmelding_id, status, created_at')
    .limit(10);

  console.log(`📊 Total uren_registraties in database: ${allUren?.length || 0}`);
  if (e1) {
    console.log('   ❌ Error:', e1.message);
  } else {
    allUren?.forEach((u, i) => {
      console.log(`   ${i + 1}. ID: ${u.id.slice(0, 8)}... | Status: ${u.status} | Aanmelding: ${u.aanmelding_id?.slice(0, 8)}...`);
    });
  }
  console.log('');

  // 3. Try the actual query from the API (simplified)
  console.log('🔗 Testing API query (simplified):\n');

  const { data: simpleData, error: e2 } = await supabaseAdmin
    .from('uren_registraties')
    .select(`
      id, status, created_at, aanmelding_id,
      aanmelding:dienst_aanmeldingen(
        medewerker_id,
        dienst_id
      )
    `)
    .limit(10);

  if (e2) {
    console.log('   ❌ Simple query error:', e2.message);
    console.log('   Details:', e2);
  } else {
    console.log(`   ✓ Simple query returned ${simpleData?.length || 0} records`);
    simpleData?.forEach((u, i) => {
      console.log(`   ${i + 1}. ID: ${u.id.slice(0, 8)}... | Aanmelding:`, u.aanmelding ? 'PRESENT' : 'NULL');
    });
  }
  console.log('');

  // 4. Try the full query from the API
  console.log('🔗 Testing full API query:\n');

  const { data: fullData, error: e3 } = await supabaseAdmin
    .from('uren_registraties')
    .select(`
      id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag, status, created_at,
      aanmelding:dienst_aanmeldingen(
        medewerker:medewerkers(naam),
        dienst:diensten(datum, locatie, uurtarief)
      )
    `)
    .limit(10);

  if (e3) {
    console.log('   ❌ Full query error:', e3.message);
    console.log('   Code:', e3.code);
    console.log('   Details:', e3.details);
    console.log('   Hint:', e3.hint);
  } else {
    console.log(`   ✓ Full query returned ${fullData?.length || 0} records`);
    fullData?.forEach((u, i) => {
      console.log(`\n   ${i + 1}. Uren ID: ${u.id.slice(0, 8)}...`);
      console.log(`      Status: ${u.status}`);
      console.log(`      Aanmelding:`, u.aanmelding ? 'PRESENT' : 'NULL');
      if (u.aanmelding) {
        const a = u.aanmelding;
        console.log(`      Medewerker:`, a.medewerker?.naam || 'NULL');
        console.log(`      Dienst:`, a.dienst ? `${a.dienst.datum}` : 'NULL');
      }
    });
  }
  console.log('');

  // 5. Test with the filter
  if (diensten?.length > 0) {
    console.log('🔗 Testing query WITH filter:\n');

    const dienstIds = diensten.map(d => d.id);
    console.log(`   Filtering by ${dienstIds.length} dienst IDs...`);

    const { data: filteredData, error: e4 } = await supabaseAdmin
      .from('uren_registraties')
      .select(`
        id, status,
        aanmelding:dienst_aanmeldingen!inner(
          dienst_id,
          medewerker:medewerkers(naam)
        )
      `)
      .in('aanmelding.dienst_id', dienstIds)
      .limit(10);

    if (e4) {
      console.log('   ❌ Filtered query error:', e4.message);
      console.log('   Details:', e4);
    } else {
      console.log(`   ✓ Filtered query returned ${filteredData?.length || 0} records`);
      filteredData?.forEach((u, i) => {
        console.log(`   ${i + 1}. ID: ${u.id.slice(0, 8)}... | Status: ${u.status}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
}

debugUren()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
