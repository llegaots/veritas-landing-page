require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSamEmails() {
  console.log('🔍 Checking SAM emails and runs...\n');

  // Get all runs for investors 938 and 939
  const { data: runs } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      created_at,
      updated_at,
      context_jsonb
    `)
    .in('investor_id', [938, 939])
    .order('created_at', { ascending: false });

  console.log(`Found ${runs?.length || 0} runs for investors 938 and 939:\n`);

  for (const run of runs || []) {
    console.log(`Run ${run.id.substring(0, 8)}...`);
    console.log(`   Investor ID: ${run.investor_id}`);
    console.log(`   Lead ID: ${run.lead_id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Created: ${run.created_at}`);
    
    const context = run.context_jsonb || {};
    console.log(`   Context: FirstName=${context.FirstName}, Email=${context.email || context.Email}`);
    
    // Get all jobs for this run
    const { data: jobs } = await supabase
      .from('message_jobs')
      .select('id, node_id, scheduled_for, sent_at, job_type, email_address, email_subject')
      .eq('run_id', run.id)
      .order('sent_at', { ascending: false });

    if (jobs && jobs.length > 0) {
      const sentJobs = jobs.filter(j => j.sent_at);
      console.log(`   Total jobs: ${jobs.length}, Sent: ${sentJobs.length}`);
      
      // Check for duplicate emails sent
      const emailCounts = new Map();
      sentJobs.forEach(job => {
        if (job.email_address) {
          emailCounts.set(job.email_address, (emailCounts.get(job.email_address) || 0) + 1);
        }
      });
      
      const duplicates = Array.from(emailCounts.entries()).filter(([email, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log(`   ⚠️  DUPLICATE EMAILS SENT:`);
        duplicates.forEach(([email, count]) => {
          console.log(`      ${email}: ${count} times`);
        });
      }
      
      // Show recent sent emails
      console.log(`   Recent sent emails:`);
      sentJobs.slice(0, 10).forEach(job => {
        if (job.job_type === 'email' && job.sent_at) {
          const subject = job.email_subject || 'No subject';
          console.log(`     - ${job.sent_at}: To ${job.email_address} - "${subject.substring(0, 60)}..."`);
        }
      });
    }
    console.log('');
  }

  // Check investors table
  console.log('\n👤 Checking investors table...\n');
  const { data: investors } = await supabase
    .from('investors')
    .select('id, email, phone_number, first_name, last_name, source')
    .in('id', [938, 939]);

  investors?.forEach(inv => {
    console.log(`Investor ${inv.id}:`);
    console.log(`   Name: ${inv.first_name} ${inv.last_name}`);
    console.log(`   Email: ${inv.email}`);
    console.log(`   Phone: ${inv.phone_number}`);
    console.log(`   Source: ${inv.source}`);
    console.log('');
  });
}

checkSamEmails().catch(console.error);

