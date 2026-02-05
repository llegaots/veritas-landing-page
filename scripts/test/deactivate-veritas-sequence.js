/**
 * Deactivate the Veritas sequence so only the test sequence is active
 * Usage: node scripts/deactivate-veritas-sequence.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deactivateVeritasSequence() {
  console.log('🔍 Finding Veritas sequence...\n');
  
  // Find sequences with "veritas" in the name (case-insensitive)
  const { data: sequences, error: fetchError } = await supabase
    .from('sequences')
    .select('id, name, active_version_id')
    .ilike('name', '%veritas%');
  
  if (fetchError) {
    console.error('❌ Error fetching sequences:', fetchError);
    return;
  }
  
  if (!sequences || sequences.length === 0) {
    console.log('ℹ️  No Veritas sequence found');
    return;
  }
  
  console.log(`Found ${sequences.length} Veritas sequence(s):\n`);
  sequences.forEach((seq, i) => {
    console.log(`${i + 1}. ID: ${seq.id}`);
    console.log(`   Name: ${seq.name}`);
    console.log(`   Active Version: ${seq.active_version_id || 'None'}`);
    console.log('');
  });
  
  // Deactivate all Veritas sequences
  for (const seq of sequences) {
    if (seq.active_version_id) {
      console.log(`🛑 Deactivating sequence: ${seq.name} (${seq.id})...`);
      
      const { error: updateError } = await supabase
        .from('sequences')
        .update({ active_version_id: null })
        .eq('id', seq.id);
      
      if (updateError) {
        console.error(`❌ Error deactivating sequence ${seq.id}:`, updateError);
      } else {
        console.log(`✅ Deactivated: ${seq.name}\n`);
      }
    } else {
      console.log(`ℹ️  Sequence "${seq.name}" is already inactive\n`);
    }
  }
  
  // Show all active sequences
  console.log('📋 Checking all active sequences...\n');
  const { data: activeSequences, error: activeError } = await supabase
    .from('sequences')
    .select('id, name, active_version_id')
    .not('active_version_id', 'is', null);
  
  if (activeError) {
    console.error('❌ Error fetching active sequences:', activeError);
    return;
  }
  
  if (!activeSequences || activeSequences.length === 0) {
    console.log('ℹ️  No active sequences found');
  } else {
    console.log(`Active sequences (${activeSequences.length}):\n`);
    activeSequences.forEach((seq, i) => {
      console.log(`${i + 1}. ${seq.name} (${seq.id})`);
      console.log(`   Active Version: ${seq.active_version_id}`);
      console.log('');
    });
  }
}

deactivateVeritasSequence().catch(console.error);



