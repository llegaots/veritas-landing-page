require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Monitor for duplicate runs and alert if found
 * Run this periodically (e.g., via cron) to catch issues early
 */
async function monitorDuplicateRuns() {
  console.log('🔍 Monitoring for duplicate sequence runs...\n');

  // Find runs with same lead_id + sequence_version_id
  const { data: runs, error } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      status,
      lead_id,
      created_at,
      updated_at,
      sequence_version_id,
      sequence_versions(
        sequences(
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching runs:', error.message);
    return;
  }

  if (!runs || runs.length === 0) {
    console.log('✅ No runs found');
    return;
  }

  // Group by lead_id + sequence_version_id
  const runGroups = new Map();
  runs.forEach(run => {
    const key = `${run.lead_id || 'null'}-${run.sequence_version_id}`;
    if (!runGroups.has(key)) {
      runGroups.set(key, []);
    }
    runGroups.get(key).push(run);
  });

  // Find duplicates
  const duplicates = [];
  runGroups.forEach((runsForGroup, key) => {
    if (runsForGroup.length > 1) {
      const [leadId, sequenceVersionId] = key.split('-');
      duplicates.push({
        leadId,
        sequenceVersionId,
        sequenceName: runsForGroup[0].sequence_versions?.sequences?.name || 'Unknown',
        runCount: runsForGroup.length,
        runs: runsForGroup.map(r => ({
          id: r.id.substring(0, 8),
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      });
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  FOUND ${duplicates.length} DUPLICATE RUN GROUP(S):\n`);
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. Lead ID: ${dup.leadId || 'null'}, Sequence: ${dup.sequenceName}`);
      console.log(`   Has ${dup.runCount} runs:`);
      dup.runs.forEach((run, i) => {
        const statusIcon = run.status === 'active' ? '🟢' : run.status === 'paused' ? '⏸️' : '⚪';
        console.log(`   ${i + 1}. ${statusIcon} Run ${run.id}... - Status: ${run.status}, Created: ${run.createdAt}`);
      });
      console.log('');
    });
    console.log('❌ ACTION REQUIRED: Review and pause duplicate runs manually');
  } else {
    console.log('✅ No duplicate runs found');
  }

  // Check for multiple ACTIVE runs (most critical)
  const activeDuplicates = duplicates.filter(dup => 
    dup.runs.some(r => r.status === 'active')
  );

  if (activeDuplicates.length > 0) {
    console.log(`\n🚨 CRITICAL: ${activeDuplicates.length} duplicate group(s) with ACTIVE runs:`);
    activeDuplicates.forEach((dup, idx) => {
      const activeCount = dup.runs.filter(r => r.status === 'active').length;
      if (activeCount > 1) {
        console.log(`   ${idx + 1}. Lead ${dup.leadId} - ${activeCount} ACTIVE runs (RISK OF SPAM)`);
      }
    });
  } else {
    console.log('\n✅ No duplicate active runs found');
  }
}

monitorDuplicateRuns();

