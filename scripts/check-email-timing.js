// Script to check email job timing
// Run: node scripts/check-email-timing.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmailTiming() {
  console.log('Checking email job timing...\n');
  
  // Get recent email jobs
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select(`
      *,
      sequence_runs(
        id,
        started_at,
        investor_id
      )
    `)
    .eq('job_type', 'email')
    .order('scheduled_for', { ascending: true })
    .limit(50);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!jobs || jobs.length === 0) {
    console.log('No email jobs found');
    return;
  }
  
  console.log(`Found ${jobs.length} email jobs:\n`);
  
  // Group by run_id
  const jobsByRun = new Map();
  jobs.forEach(job => {
    const runId = job.run_id;
    if (!jobsByRun.has(runId)) {
      jobsByRun.set(runId, []);
    }
    jobsByRun.get(runId).push(job);
  });
  
  // Display each run's jobs
  jobsByRun.forEach((runJobs, runId) => {
    const run = runJobs[0].sequence_runs;
    const startTime = run?.started_at ? new Date(run.started_at) : null;
    
    console.log(`\nRun ID: ${runId.substring(0, 8)}...`);
    if (startTime) {
      console.log(`Started at: ${startTime.toISOString()}`);
    }
    console.log(`Jobs (${runJobs.length}):`);
    
    runJobs.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    
    runJobs.forEach((job, idx) => {
      const scheduled = new Date(job.scheduled_for);
      const delay = startTime ? Math.round((scheduled.getTime() - startTime.getTime()) / 1000 / 60) : null;
      const sent = job.sent_at ? new Date(job.sent_at) : null;
      const sentDelay = sent && startTime ? Math.round((sent.getTime() - startTime.getTime()) / 1000 / 60) : null;
      
      console.log(`  ${idx + 1}. Node: ${job.node_id}`);
      console.log(`     Subject: ${(job.email_subject || '').substring(0, 50)}...`);
      console.log(`     Scheduled: ${scheduled.toISOString()} ${delay !== null ? `(${delay} min from start)` : ''}`);
      if (sent) {
        console.log(`     Sent: ${sent.toISOString()} ${sentDelay !== null ? `(${sentDelay} min from start)` : ''}`);
      } else {
        console.log(`     Status: Pending`);
      }
      if (idx > 0) {
        const prevScheduled = new Date(runJobs[idx - 1].scheduled_for);
        const timeDiff = Math.round((scheduled.getTime() - prevScheduled.getTime()) / 1000 / 60);
        console.log(`     Time diff from previous: ${timeDiff} minutes`);
      }
      console.log('');
    });
  });
}

checkEmailTiming().catch(console.error);

