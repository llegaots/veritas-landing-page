require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSamRuns() {
  console.log('🔍 Checking for SAM (lucaslegatos123@gmail.com) runs...\n');

  // Get all runs and check context_jsonb for SAM's email
  const { data: allRuns, error } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      archived_at,
      created_at,
      updated_at,
      context_jsonb,
      sequence_version_id,
      sequence_versions(
        sequences(
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // Filter for SAM's email
  const samEmail = 'lucaslegatos123@gmail.com';
  const samRuns = allRuns.filter(run => {
    const context = run.context_jsonb || {};
    const email = (context.email || context.Email || '').toLowerCase().trim();
    return email === samEmail.toLowerCase();
  });

  if (samRuns.length === 0) {
    console.log('❌ No runs found for SAM email.\n');
    return;
  }

  console.log(`📊 Found ${samRuns.length} run(s) for SAM:\n`);

  samRuns.forEach((run, idx) => {
    const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';
    const archived = run.archived_at ? '✅ ARCHIVED' : '❌ NOT ARCHIVED';
    const archivedTime = run.archived_at ? ` (archived at: ${run.archived_at})` : '';
    
    console.log(`${idx + 1}. Run ${run.id.substring(0, 8)}...`);
    console.log(`   Investor ID: ${run.investor_id || 'N/A'}`);
    console.log(`   Lead ID: ${run.lead_id || 'N/A'}`);
    console.log(`   Sequence: ${sequenceName}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   ${archived}${archivedTime}`);
    console.log(`   Created: ${run.created_at}`);
    console.log(`   Updated: ${run.updated_at}`);
    console.log('');

    // Check for jobs from this run
    if (!run.archived_at) {
      console.log(`   ⚠️  This run is NOT archived - checking for pending jobs...`);
    }
  });

  // Check for pending jobs from non-archived runs
  console.log('\n🔍 Checking for pending message jobs from non-archived SAM runs...\n');
  
  const nonArchivedRunIds = samRuns.filter(r => !r.archived_at).map(r => r.id);
  
  if (nonArchivedRunIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from('message_jobs')
      .select('id, run_id, node_id, scheduled_for, sent_at, job_type, email_address, email_subject')
      .in('run_id', nonArchivedRunIds)
      .is('sent_at', null)
      .order('scheduled_for', { ascending: true });

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError.message);
    } else if (jobs && jobs.length > 0) {
      console.log(`⚠️  Found ${jobs.length} pending job(s) from non-archived runs:\n`);
      jobs.forEach((job, idx) => {
        console.log(`${idx + 1}. Job ${job.id.substring(0, 8)}...`);
        console.log(`   Type: ${job.job_type || 'sms'}`);
        console.log(`   Email: ${job.email_address || 'N/A'}`);
        console.log(`   Subject: ${job.email_subject || 'N/A'}`);
        console.log(`   Scheduled: ${job.scheduled_for}`);
        console.log('');
      });
    } else {
      console.log('✅ No pending jobs found from non-archived runs.\n');
    }
  } else {
    console.log('✅ All SAM runs are archived.\n');
  }
}

checkSamRuns().catch(console.error);

