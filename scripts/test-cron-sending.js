// Test if cron job is sending messages
// Checks pending messages and shows if they're being sent

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCronSending() {
  console.log('🔍 Checking if cron job is sending messages...\n');
  
  const now = new Date();
  
  // Get all pending messages that are due
  const { data: pendingJobs, error } = await supabase
    .from('message_jobs')
    .select('*')
    .is('sent_at', null)
    .lte('scheduled_for', now.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(20);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!pendingJobs || pendingJobs.length === 0) {
    console.log('✅ No pending messages - all caught up!');
    return;
  }
  
  console.log(`⏰ Found ${pendingJobs.length} pending message(s) that are due:\n`);
  
  pendingJobs.forEach((job, idx) => {
    const scheduled = new Date(job.scheduled_for);
    const diffMs = now.getTime() - scheduled.getTime();
    const diffMins = Math.round(diffMs / 1000 / 60);
    
    console.log(`${idx + 1}. ${job.message_text?.substring(0, 40)}...`);
    console.log(`   Phone: ${job.phone_number}`);
    console.log(`   Scheduled: ${job.scheduled_for}`);
    console.log(`   Overdue by: ${diffMins} minute${diffMins !== 1 ? 's' : ''}`);
    console.log('');
  });
  
  console.log('💡 If these messages are still pending after 1-2 minutes,');
  console.log('   the cron job may not be running or there may be an error.');
  console.log('   Check Vercel logs for the cron job execution.');
}

testCronSending();


