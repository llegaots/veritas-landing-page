require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function pauseDuplicateRun() {
  console.log('🔍 Finding duplicate runs for SAM...\n');

  // Get both runs
  const { data: runs } = await supabase
    .from('sequence_runs')
    .select('id, investor_id, lead_id, status, created_at')
    .in('investor_id', [938, 939])
    .order('created_at', { ascending: true });

  if (!runs || runs.length < 2) {
    console.log('❌ Expected 2 runs, found:', runs?.length || 0);
    return;
  }

  // Pause the older run (keep the newer one active)
  const olderRun = runs[0];
  const newerRun = runs[1];

  console.log(`Found 2 runs:`);
  console.log(`  1. Run ${olderRun.id.substring(0, 8)}... (Investor ${olderRun.investor_id}, Created: ${olderRun.created_at})`);
  console.log(`  2. Run ${newerRun.id.substring(0, 8)}... (Investor ${newerRun.investor_id}, Created: ${newerRun.created_at})`);
  console.log(`\nPausing the older run (${olderRun.id.substring(0, 8)}...) to prevent duplicate emails...\n`);

  const { error } = await supabase
    .from('sequence_runs')
    .update({ 
      status: 'paused',
      updated_at: new Date().toISOString()
    })
    .eq('id', olderRun.id);

  if (error) {
    console.error('❌ Error pausing run:', error);
  } else {
    console.log('✅ Successfully paused duplicate run');
    console.log(`   Run ${olderRun.id.substring(0, 8)}... is now paused`);
    console.log(`   Run ${newerRun.id.substring(0, 8)}... remains active`);
  }
}

pauseDuplicateRun().catch(console.error);

