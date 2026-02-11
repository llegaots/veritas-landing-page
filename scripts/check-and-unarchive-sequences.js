require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndUnarchiveSequences() {
  console.log('🔍 Checking for archived sequences...\n');

  // Get all sequences with their active versions
  const { data: sequences, error: seqError } = await supabase
    .from('sequences')
    .select('id, name, active_version_id')
    .not('active_version_id', 'is', null);

  if (seqError) {
    console.error('❌ Error fetching sequences:', seqError.message);
    return;
  }

  if (!sequences || sequences.length === 0) {
    console.log('✅ No sequences found');
    return;
  }

  console.log(`📊 Found ${sequences.length} sequences\n`);

  const archivedSequences = [];

  // Check each sequence's status
  for (const seq of sequences) {
    const { data: version, error: versionError } = await supabase
      .from('sequence_versions')
      .select('id, spec_jsonb')
      .eq('id', seq.active_version_id)
      .single();

    if (versionError) {
      console.warn(`⚠️  Could not fetch version for sequence ${seq.id}: ${versionError.message}`);
      continue;
    }

    const status = version.spec_jsonb?.metadata?.status;
    if (status === 'archived') {
      archivedSequences.push({
        id: seq.id,
        name: seq.name,
        versionId: version.id,
      });
    }
  }

  if (archivedSequences.length === 0) {
    console.log('✅ No archived sequences found in database\n');
    console.log('💡 The issue was likely localStorage filtering, not actual archiving.');
    console.log('   Clear localStorage in your browser: localStorage.removeItem("archivedSequences")');
    return;
  }

  console.log(`⚠️  Found ${archivedSequences.length} archived sequence(s):\n`);
  archivedSequences.forEach((seq, idx) => {
    console.log(`${idx + 1}. ${seq.name} (ID: ${seq.id.substring(0, 8)}...)`);
  });

  console.log('\n❓ Do you want to unarchive these sequences?');
  console.log('   They will be set back to "active" status.');
  console.log('   Run this script with --unarchive flag to proceed.\n');

  // Check for --unarchive flag
  if (process.argv.includes('--unarchive')) {
    console.log('🔄 Unarchiving sequences...\n');
    
    for (const seq of archivedSequences) {
      const { data: version } = await supabase
        .from('sequence_versions')
        .select('spec_jsonb')
        .eq('id', seq.versionId)
        .single();

      if (!version) continue;

      const updatedSpec = {
        ...version.spec_jsonb,
        metadata: {
          ...version.spec_jsonb.metadata,
          status: 'active', // Change from 'archived' to 'active'
          updatedAt: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from('sequence_versions')
        .update({ spec_jsonb: updatedSpec })
        .eq('id', seq.versionId);

      if (updateError) {
        console.error(`❌ Failed to unarchive ${seq.name}: ${updateError.message}`);
      } else {
        console.log(`✅ Unarchived: ${seq.name}`);
      }
    }

    console.log('\n✅ Done! All sequences have been unarchived.');
  }
}

checkAndUnarchiveSequences();

