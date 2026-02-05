// Verify end-to-end SMS sequence flow
// Run this after adding a lead from Airtable

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyEndToEnd() {
  console.log('🔍 Checking end-to-end SMS sequence flow...\n');
  
  // Get recent sequence runs (last 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: runs, error: runsError } = await supabase
    .from('sequence_runs')
    .select('id, created_at, status, lead_id, context_jsonb')
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (runsError) {
    console.error('❌ Error fetching runs:', runsError);
    return;
  }
  
  if (!runs || runs.length === 0) {
    console.log('⚠️  No sequence runs found in the last 10 minutes.');
    console.log('   Make sure you added a lead from Airtable with status "New Lead"\n');
    return;
  }
  
  console.log(`✅ Found ${runs.length} recent sequence run(s):\n`);
  
  for (const run of runs) {
    console.log(`📋 Run ID: ${run.id}`);
    console.log(`   Created: ${run.created_at}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Lead ID: ${run.lead_id}`);
    
    // Get messages for this run
    const { data: jobs, error: jobsError } = await supabase
      .from('message_jobs')
      .select('*')
      .eq('run_id', run.id)
      .order('scheduled_for', { ascending: true });
    
    if (jobsError) {
      console.log(`   ❌ Error fetching jobs: ${jobsError.message}`);
    } else if (!jobs || jobs.length === 0) {
      console.log(`   ⚠️  No messages scheduled for this run`);
    } else {
      console.log(`   📨 Messages: ${jobs.length}`);
      jobs.forEach((job, idx) => {
        const scheduled = new Date(job.scheduled_for);
        const sent = job.sent_at ? new Date(job.sent_at) : null;
        const status = sent ? '✅ SENT' : (scheduled <= new Date() ? '⏰ DUE' : '⏳ PENDING');
        
        console.log(`      ${idx + 1}. ${status} - "${job.message_text?.substring(0, 30)}..."`);
        console.log(`         Scheduled: ${scheduled.toLocaleString()}`);
        if (sent) {
          console.log(`         Sent: ${sent.toLocaleString()}`);
        }
        if (job.error) {
          console.log(`         ❌ Error: ${job.error}`);
        }
      });
    }
    console.log('');
  }
  
  // Summary
  const { data: allRecentJobs } = await supabase
    .from('message_jobs')
    .select('id, sent_at')
    .gte('created_at', tenMinutesAgo);
  
  const total = allRecentJobs?.length || 0;
  const sent = allRecentJobs?.filter(j => j.sent_at).length || 0;
  const pending = total - sent;
  
  console.log('📊 Summary:');
  console.log(`   Total messages: ${total}`);
  console.log(`   ✅ Sent: ${sent}`);
  console.log(`   ⏳ Pending: ${pending}`);
  
  if (pending > 0) {
    console.log('\n💡 Pending messages will be sent by the cron job within the next minute.');
  }
}

verifyEndToEnd();


