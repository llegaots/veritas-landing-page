/**
 * Check message jobs for a specific run
 * Usage: node scripts/check-message-jobs.js [run_id]
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

async function checkJobs() {
  const runId = process.argv[2];
  
  if (runId) {
    // Check jobs for specific run
    console.log(`📋 Checking message jobs for run: ${runId}\n`);
    const { data: jobs, error } = await supabase
      .from('message_jobs')
      .select('*')
      .eq('run_id', runId)
      .order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`Found ${jobs.length} jobs:\n`);
    const now = new Date();
    jobs.forEach((job, idx) => {
      const scheduled = new Date(job.scheduled_for);
      const diffMs = scheduled.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 1000 / 60);
      const isDue = scheduled <= now;
      
      console.log(`${idx + 1}. Job ID: ${job.id}`);
      console.log(`   Phone: ${job.phone_number}`);
      console.log(`   Message: ${job.message_text?.substring(0, 50)}...`);
      console.log(`   Scheduled: ${job.scheduled_for}`);
      console.log(`   Status: ${job.sent_at ? '✅ SENT' : isDue ? '⏰ DUE (not sent)' : `⏳ Future (${diffMins} min${Math.abs(diffMins) !== 1 ? 's' : ''} away)`}`);
      if (job.sent_at) {
        console.log(`   Sent at: ${job.sent_at}`);
      } else if (isDue) {
        console.log(`   ⚠️  This message is overdue by ${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''}`);
      }
      if (job.error) {
        console.log(`   ❌ Error: ${job.error}`);
      }
      console.log('');
    });
  } else {
    // Check recent jobs
    console.log('📋 Checking recent message jobs (last 10)\n');
    const { data: jobs, error } = await supabase
      .from('message_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`Found ${jobs.length} recent jobs:\n`);
    jobs.forEach((job, idx) => {
      console.log(`${idx + 1}. Job ID: ${job.id}`);
      console.log(`   Run ID: ${job.run_id}`);
      console.log(`   Phone: ${job.phone_number}`);
      console.log(`   Message: ${job.message_text?.substring(0, 50)}...`);
      console.log(`   Scheduled: ${job.scheduled_for}`);
      console.log(`   Sent: ${job.sent_at || 'Not sent yet'}`);
      console.log('');
    });
  }
}

checkJobs();


