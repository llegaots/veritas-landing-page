require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArchivedRuns() {
  console.log('🔍 Checking for archived sequence runs...\n');

  // Check for runs with archived_at set
  const { data: archivedRuns, error: archivedError } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      archived_at,
      created_at,
      updated_at,
      sequence_versions(
        sequences(
          name
        )
      )
    `)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (archivedError) {
    console.error('❌ Error fetching archived runs:', archivedError.message);
    return;
  }

  if (!archivedRuns || archivedRuns.length === 0) {
    console.log('✅ No archived runs found.\n');
  } else {
    console.log(`📊 Found ${archivedRuns.length} archived run(s):\n`);
    archivedRuns.forEach((run, idx) => {
      const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';
      console.log(`${idx + 1}. Run ${run.id.substring(0, 8)}...`);
      console.log(`   Investor ID: ${run.investor_id || 'N/A'}`);
      console.log(`   Lead ID: ${run.lead_id || 'N/A'}`);
      console.log(`   Sequence: ${sequenceName}`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Archived at: ${run.archived_at}`);
      console.log(`   Created: ${run.created_at}`);
      console.log('');
    });
  }

  // Check for duplicate runs (same investor + sequence, different runs)
  console.log('\n🔍 Checking for duplicate runs (same investor + sequence)...\n');
  
  const { data: allRuns, error: allRunsError } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      archived_at,
      created_at,
      sequence_version_id,
      sequence_versions(
        sequence_id,
        sequences(
          name
        )
      )
    `)
    .order('created_at', { ascending: true });

  if (allRunsError) {
    console.error('❌ Error fetching all runs:', allRunsError.message);
    return;
  }

  // Group by investor_id + sequence_id
  const runGroups = new Map();
  allRuns.forEach(run => {
    const investorId = run.investor_id;
    const sequenceId = run.sequence_versions?.sequence_id;
    
    if (investorId && sequenceId) {
      const key = `${investorId}-${sequenceId}`;
      if (!runGroups.has(key)) {
        runGroups.set(key, []);
      }
      runGroups.get(key).push({
        runId: run.id,
        leadId: run.lead_id,
        status: run.status,
        archivedAt: run.archived_at,
        createdAt: run.created_at,
        sequenceName: run.sequence_versions?.sequences?.name || 'Unknown',
      });
    }
  });

  const duplicates = [];
  runGroups.forEach((runs, key) => {
    if (runs.length > 1) {
      const [investorId, sequenceId] = key.split('-');
      duplicates.push({
        investorId,
        sequenceId,
        sequenceName: runs[0].sequenceName,
        runs,
      });
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} investor(s) with duplicate runs:\n`);
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. Investor ${dup.investorId} - ${dup.sequenceName}`);
      console.log(`   Has ${dup.runs.length} runs for the same sequence:`);
      dup.runs.forEach((run, i) => {
        const archived = run.archivedAt ? ' (ARCHIVED)' : '';
        console.log(`   ${i + 1}. Run ${run.runId.substring(0, 8)}... - Status: ${run.status}${archived}, Created: ${run.createdAt}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No duplicate runs found.\n');
  }

  // Check for test leads specifically
  console.log('\n🔍 Checking for test leads (lead_id starting with "test_")...\n');
  
  const { data: testRuns, error: testError } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      archived_at,
      created_at,
      context_jsonb,
      sequence_versions(
        sequences(
          name
        )
      )
    `)
    .like('lead_id', 'test_%')
    .order('created_at', { ascending: false });

  if (testError) {
    console.error('❌ Error fetching test runs:', testError.message);
    return;
  }

  if (!testRuns || testRuns.length === 0) {
    console.log('✅ No test runs found.\n');
  } else {
    console.log(`📊 Found ${testRuns.length} test run(s):\n`);
    
    // Group by email/phone
    const testGroups = new Map();
    testRuns.forEach(run => {
      const context = run.context_jsonb || {};
      const email = context.email || context.Email || 'no-email';
      const phone = context.phone || 'no-phone';
      const key = `${email}-${phone}`;
      
      if (!testGroups.has(key)) {
        testGroups.set(key, []);
      }
      testGroups.get(key).push(run);
    });

    testGroups.forEach((runs, key) => {
      const [email, phone] = key.split('-');
      console.log(`Contact: ${email !== 'no-email' ? email : phone}`);
      console.log(`  Has ${runs.length} run(s):`);
      runs.forEach((run, i) => {
        const archived = run.archived_at ? ' (ARCHIVED)' : '';
        const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';
        console.log(`  ${i + 1}. Run ${run.id.substring(0, 8)}... - ${sequenceName} - Status: ${run.status}${archived}, Created: ${run.created_at}`);
      });
      console.log('');
    });
  }
}

checkArchivedRuns().catch(console.error);

