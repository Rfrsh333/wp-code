/**
 * Fix bestaande aanmeldingen zonder status
 *
 * Dit script update alle dienst_aanmeldingen die geen status hebben
 * naar status "aangemeld" zodat ze zichtbaar worden in het klant dashboard.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
config({ path: join(__dirname, '..', '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAanmeldingenStatus() {
  console.log('🔍 Checking for aanmeldingen without status...\n');

  // 1. Check hoeveel aanmeldingen geen status hebben
  const { data: aanmeldingenZonderStatus, error: checkError } = await supabase
    .from('dienst_aanmeldingen')
    .select('id, dienst_id, medewerker_id, aangemeld_at')
    .is('status', null);

  if (checkError) {
    console.error('❌ Error checking aanmeldingen:', checkError);
    process.exit(1);
  }

  if (!aanmeldingenZonderStatus || aanmeldingenZonderStatus.length === 0) {
    console.log('✅ No aanmeldingen found without status. Everything is good!');
    return;
  }

  console.log(`⚠️  Found ${aanmeldingenZonderStatus.length} aanmeldingen without status:\n`);
  aanmeldingenZonderStatus.slice(0, 5).forEach(a => {
    console.log(`   - ID: ${a.id.slice(0, 8)}... | Dienst: ${a.dienst_id.slice(0, 8)}... | Aangemeld: ${a.aangemeld_at || 'unknown'}`);
  });

  if (aanmeldingenZonderStatus.length > 5) {
    console.log(`   ... and ${aanmeldingenZonderStatus.length - 5} more`);
  }

  console.log('\n🔧 Updating all aanmeldingen to status "aangemeld"...\n');

  // 2. Update alle aanmeldingen zonder status naar "aangemeld"
  const { data: updated, error: updateError } = await supabase
    .from('dienst_aanmeldingen')
    .update({ status: 'aangemeld' })
    .is('status', null)
    .select('id');

  if (updateError) {
    console.error('❌ Error updating aanmeldingen:', updateError);
    process.exit(1);
  }

  console.log(`✅ Successfully updated ${updated?.length || 0} aanmeldingen to status "aangemeld"\n`);

  // 3. Verify the update
  const { data: remainingNull, error: verifyError } = await supabase
    .from('dienst_aanmeldingen')
    .select('id', { count: 'exact', head: true })
    .is('status', null);

  if (verifyError) {
    console.error('❌ Error verifying update:', verifyError);
    process.exit(1);
  }

  console.log('🔍 Verification:');
  console.log(`   - Remaining aanmeldingen without status: ${remainingNull?.length || 0}`);
  console.log('\n✅ Database fix complete! Aanmeldingen should now appear in klant dashboard.\n');
}

// Run the fix
fixAanmeldingenStatus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
