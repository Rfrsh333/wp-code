/**
 * Debug specific uren registratie - 15 maart Utrecht
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

async function debugSpecificUren() {
  console.log('🔍 Debugging Uren voor 15 maart Utrecht\n');
  console.log('='.repeat(60) + '\n');

  // 1. Find the dienst for 15 maart Utrecht
  const { data: dienst } = await supabaseAdmin
    .from('diensten')
    .select('*')
    .eq('datum', '2026-03-15')
    .eq('locatie', 'Utrecht')
    .single();

  if (!dienst) {
    console.log('❌ Dienst not found!');
    return;
  }

  console.log('📅 Dienst gevonden:');
  console.log('   ID:', dienst.id);
  console.log('   Datum:', dienst.datum);
  console.log('   Tijd:', `${dienst.start_tijd} - ${dienst.eind_tijd}`);
  console.log('   Locatie:', dienst.locatie);
  console.log('   Functie:', dienst.functie);
  console.log('   Klant:', dienst.klant_naam);
  console.log('   Klant ID:', dienst.klant_id);
  console.log('');

  // 2. Find aanmeldingen for this dienst
  const { data: aanmeldingen } = await supabaseAdmin
    .from('dienst_aanmeldingen')
    .select('*')
    .eq('dienst_id', dienst.id);

  console.log(`📋 Aanmeldingen voor deze dienst: ${aanmeldingen?.length || 0}`);
  aanmeldingen?.forEach((a, i) => {
    console.log(`   ${i + 1}. Aanmelding ID: ${a.id}`);
    console.log(`      Medewerker ID: ${a.medewerker_id}`);
    console.log(`      Status: ${a.status}`);
  });
  console.log('');

  // 3. Find uren_registraties for these aanmeldingen
  if (aanmeldingen && aanmeldingen.length > 0) {
    const aanmeldingIds = aanmeldingen.map(a => a.id);

    const { data: urenRegs } = await supabaseAdmin
      .from('uren_registraties')
      .select('*')
      .in('aanmelding_id', aanmeldingIds);

    console.log(`⏱️  Uren registraties: ${urenRegs?.length || 0}`);
    if (urenRegs && urenRegs.length > 0) {
      urenRegs.forEach((u, i) => {
        console.log(`\n   ${i + 1}. Uren ID: ${u.id}`);
        console.log(`      Aanmelding ID: ${u.aanmelding_id}`);
        console.log(`      Status: ${u.status}`);
        console.log(`      Start: ${u.start_tijd}`);
        console.log(`      Eind: ${u.eind_tijd}`);
        console.log(`      Pauze: ${u.pauze_minuten} min`);
        console.log(`      Gewerkte uren: ${u.gewerkte_uren}`);
        console.log(`      Reiskosten: ${u.reiskosten_km} km`);
        console.log(`      Created: ${u.created_at}`);
      });
    } else {
      console.log('   ⚠️  NO UREN FOUND! Uren zijn niet opgeslagen in database!');
    }
    console.log('');

    // 4. Test the API query
    console.log('🔗 Testing API query for this klant:\n');

    const { data: klantDiensten } = await supabaseAdmin
      .from('diensten')
      .select('id')
      .eq('klant_id', dienst.klant_id);

    console.log(`   Klant heeft ${klantDiensten?.length || 0} diensten`);

    const { data: apiResult, error } = await supabaseAdmin
      .from('uren_registraties')
      .select(`
        id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag, status, created_at,
        aanmelding:dienst_aanmeldingen(
          medewerker:medewerkers(naam),
          dienst:diensten(datum, locatie, uurtarief)
        )
      `)
      .in('aanmelding.dienst_id', klantDiensten?.map(d => d.id) || [])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.log('   ❌ API query error:', error.message);
      console.log('   Details:', error);
    } else {
      console.log(`   ✓ API query returned ${apiResult?.length || 0} uren registraties`);

      if (apiResult && apiResult.length > 0) {
        apiResult.forEach((u, i) => {
          const medewerkerNaam = u.aanmelding?.medewerker?.naam || 'MISSING';
          const dienstDatum = u.aanmelding?.dienst?.datum || 'MISSING';

          console.log(`\n   ${i + 1}. ID: ${u.id.slice(0, 8)}...`);
          console.log(`      Status: ${u.status}`);
          console.log(`      Medewerker: ${medewerkerNaam}`);
          console.log(`      Dienst: ${dienstDatum}`);
          console.log(`      Tijd: ${u.start_tijd} - ${u.eind_tijd}`);
        });
      } else {
        console.log('   ⚠️  API returns 0 results - This is why klant sees nothing!');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

debugSpecificUren()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
