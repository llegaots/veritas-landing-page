require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicateRuns() {
  console.log('🔍 Checking for duplicate runs and jobs...\n');

  // Find investors with multiple active runs for the same sequence
  const { data: runs, error: runsError } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      sequence_version_id,
      lead_id,
      investor_id,
      status,
      created_at,
      updated_at,
      sequence_versions!inner(
        id,
        sequence_id,
        sequences!inner(
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (runsError) {
    console.error('❌ Error fetching runs:', runsError);
    return;
  }

  console.log(`📊 Found ${runs?.length || 0} total runs\n`);

  // Group by investor_id and sequence_id to find duplicates
  const investorSequenceMap = new Map();
  
  runs?.forEach(run => {
    const investorId = run.investor_id;
    const sequenceId = run.sequence_versions?.sequences?.id;
    const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';
    const key = `${investorId}-${sequenceId}`;
    
    if (!investorSequenceMap.has(key)) {
      investorSequenceMap.set(key, []);
    }
    investorSequenceMap.get(key).push({
      runId: run.id,
      status: run.status,
      leadId: run.lead_id,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      sequenceName,
    });
  });

  // Find duplicates (more than 1 run for same investor + sequence)
  const duplicates = [];
  investorSequenceMap.forEach((runs, key) => {
    if (runs.length > 1) {
      const [investorId, sequenceId] = key.split('-');
      duplicates.push({
        investorId,
        sequenceId,
        sequenceName: runs[0].sequenceName,
        runCount: runs.length,
        runs: runs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      });
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} investor(s) with duplicate runs:\n`);
    
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. Investor ${dup.investorId} - ${dup.sequenceName}`);
      console.log(`   Has ${dup.runCount} runs for the same sequence:`);
      dup.runs.forEach((run, i) => {
        console.log(`   ${i + 1}. Run ${run.runId.substring(0, 8)}... - Status: ${run.status}, Created: ${run.createdAt}`);
      });
      console.log('');
    });

    // Check for duplicate jobs
    console.log('📨 Checking for duplicate message jobs...\n');
    
    for (const dup of duplicates) {
      const runIds = dup.runs.map(r => r.runId);
      const { data: jobs } = await supabase
        .from('message_jobs')
        .select('id, run_id, node_id, scheduled_for, sent_at, job_type, email_address, phone_number')
        .in('run_id', runIds)
        .order('scheduled_for', { ascending: false });

      if (jobs && jobs.length > 0) {
        console.log(`   Investor ${dup.investorId} - ${jobs.length} total jobs across ${dup.runCount} runs`);
        
        // Group by node_id to find duplicate jobs
        const jobsByNode = new Map();
        jobs.forEach(job => {
          const key = job.node_id;
          if (!jobsByNode.has(key)) {
            jobsByNode.set(key, []);
          }
          jobsByNode.get(key).push(job);
        });

        const duplicateJobs = [];
        jobsByNode.forEach((nodeJobs, nodeId) => {
          if (nodeJobs.length > 1) {
            duplicateJobs.push({ nodeId, jobs: nodeJobs });
          }
        });

        if (duplicateJobs.length > 0) {
          console.log(`   ⚠️  Found ${duplicateJobs.length} duplicate job(s) (same node_id across multiple runs):`);
          duplicateJobs.forEach(({ nodeId, jobs: nodeJobs }) => {
            console.log(`      Node: ${nodeId} - ${nodeJobs.length} jobs`);
            nodeJobs.forEach(job => {
              const sent = job.sent_at ? '✅ SENT' : '⏳ PENDING';
              const contact = job.email_address || job.phone_number || 'N/A';
              console.log(`         - Job ${job.id.substring(0, 8)}... (Run: ${job.run_id.substring(0, 8)}...) - ${sent} - ${contact}`);
            });
          });
        }
        console.log('');
      }
    }
  } else {
    console.log('✅ No duplicate runs found');
  }

  // Check for specific investor "SAM" or similar
  console.log('\n🔍 Searching for runs/jobs for "SAM"...\n');
  const { data: samRuns } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      status,
      created_at,
      updated_at,
      context_jsonb,
      sequence_versions!inner(
        sequences!inner(
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (samRuns) {
    // Filter runs where context might contain "SAM"
    const samMatches = samRuns.filter(run => {
      const context = run.context_jsonb || {};
      const firstName = (context.FirstName || context.name || '').toString().toUpperCase();
      return firstName.includes('SAM') || firstName === 'SAM';
    });

    if (samMatches.length > 0) {
      console.log(`Found ${samMatches.length} run(s) for SAM:\n`);
      for (const run of samMatches) {
        console.log(`Run ${run.id.substring(0, 8)}...`);
        console.log(`   Investor ID: ${run.investor_id}`);
        console.log(`   Status: ${run.status}`);
        console.log(`   Sequence: ${run.sequence_versions?.sequences?.name || 'Unknown'}`);
        console.log(`   Created: ${run.created_at}`);
        console.log(`   Updated: ${run.updated_at}`);
        
        // Get jobs for this run
        const { data: jobs } = await supabase
          .from('message_jobs')
          .select('id, node_id, scheduled_for, sent_at, job_type, email_address, email_subject')
          .eq('run_id', run.id)
          .order('scheduled_for', { ascending: false });

        if (jobs && jobs.length > 0) {
          console.log(`   Jobs: ${jobs.length} total`);
          const sentJobs = jobs.filter(j => j.sent_at);
          const pendingJobs = jobs.filter(j => !j.sent_at);
          console.log(`   - Sent: ${sentJobs.length}`);
          console.log(`   - Pending: ${pendingJobs.length}`);
          
          // Show recent sent jobs
          if (sentJobs.length > 0) {
            console.log(`   Recent sent jobs:`);
            sentJobs.slice(0, 5).forEach(job => {
              const subject = job.email_subject || 'No subject';
              console.log(`     - ${job.sent_at}: ${subject.substring(0, 50)}...`);
            });
          }
        }
        console.log('');
      }
    } else {
      console.log('No runs found for SAM');
    }
  }
}

checkDuplicateRuns().catch(console.error);

