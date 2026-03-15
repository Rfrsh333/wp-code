/**
 * Debug specific dienst aanmeldingen
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

const DIENST_ID = '79d27f0e-e3e9-422c-be07-e1d137e1471d'; // From the logs

async function debugDienst() {
  console.log('🔍 Debugging Dienst:', DIENST_ID);
  console.log('='.repeat(60) + '\n');

  // 1. Check if dienst exists
  const { data: dienst, error: e1 } = await supabaseAdmin
    .from('diensten')
    .select('*')
    .eq('id', DIENST_ID)
    .single();

  console.log('📅 Dienst info:');
  if (e1) {
    console.log('   ❌ Error:', e1.message);
    return;
  }
  console.log('   ID:', dienst.id);
  console.log('   Klant:', dienst.klant_naam);
  console.log('   Klant ID:', dienst.klant_id);
  console.log('   Datum:', dienst.datum);
  console.log('   Functie:', dienst.functie);
  console.log('');

  // 2. Get aanmeldingen - simple query (what the count uses)
  const { data: simpleAanmeldingen, error: e2 } = await supabaseAdmin
    .from('dienst_aanmeldingen')
    .select('id, dienst_id, status')
    .eq('dienst_id', DIENST_ID);

  console.log('📊 Simple query (for count):');
  console.log('   Total:', simpleAanmeldingen?.length || 0);
  simpleAanmeldingen?.forEach((a, i) => {
    console.log(`   ${i + 1}. ID: ${a.id.slice(0, 8)}... | Status: ${a.status}`);
  });
  console.log('');

  // 3. Get aanmeldingen - with join (what get_aanmeldingen uses)
  const { data: joinedAanmeldingen, error: e3 } = await supabaseAdmin
    .from('dienst_aanmeldingen')
    .select('*, medewerker:medewerkers(naam, functie, profile_photo_url, gemiddelde_score, aantal_beoordelingen, badge, admin_score_aanwezigheid, admin_score_vaardigheden)')
    .eq('dienst_id', DIENST_ID)
    .order('aangemeld_at', { ascending: true });

  console.log('🔗 Joined query (for details):');
  if (e3) {
    console.log('   ❌ Error:', e3.message);
    console.log('   Details:', e3);
  } else {
    console.log('   Total:', joinedAanmeldingen?.length || 0);
    joinedAanmeldingen?.forEach((a, i) => {
      console.log(`   ${i + 1}. ID: ${a.id.slice(0, 8)}...`);
      console.log(`       Status: ${a.status}`);
      console.log(`       Medewerker ID: ${a.medewerker_id?.slice(0, 8)}...`);
      console.log(`       Medewerker data:`, a.medewerker ? 'PRESENT ✓' : 'NULL ✗');
      if (a.medewerker) {
        console.log(`       Medewerker naam: ${a.medewerker.naam}`);
      }
    });
  }
  console.log('');

  // 4. Check if medewerker exists
  if (simpleAanmeldingen && simpleAanmeldingen.length > 0) {
    const aanmelding = simpleAanmeldingen[0];
    const { data: fullAanmelding } = await supabaseAdmin
      .from('dienst_aanmeldingen')
      .select('medewerker_id')
      .eq('id', aanmelding.id)
      .single();

    if (fullAanmelding?.medewerker_id) {
      console.log('👤 Checking medewerker:');
      console.log('   ID:', fullAanmelding.medewerker_id);

      const { data: medewerker, error: e4 } = await supabaseAdmin
        .from('medewerkers')
        .select('*')
        .eq('id', fullAanmelding.medewerker_id)
        .single();

      if (e4) {
        console.log('   ❌ Medewerker NOT FOUND in database!');
        console.log('   Error:', e4.message);
      } else {
        console.log('   ✓ Medewerker exists:');
        console.log('   Naam:', medewerker.naam);
        console.log('   Email:', medewerker.email);
        console.log('   Functie:', medewerker.functie);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

debugDienst()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
