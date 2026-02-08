/**
 * Test email sending with debugging to diagnose <br> tag issue
 * Run with: node scripts/test/test-email-debug.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendTestEmail() {
  console.log('📧 Creating test email job for debugging...\n');
  
  // Test HTML content that might have the <br> issue
  const testHtml = `Hi TEST,

Thanks for requesting more information on Horizon Park, a workforce-housing multifamily opportunity in Edmonds, Seattle. If helpful, the next step is a short 10-minute Zoom to see whether this opportunity aligns with your goals and risk tolerance. There's no obligation, the call is simply to walk through the structure, risks, and determine if it's a good fit.

You can schedule a time here:
https://calendly.com/alex-veritasequitypartners/15-minute-intro-call

If now isn't the right time, that's completely fine as well.

Best,
Veritas Equity Partners`;

  // Create a test run_id (UUID format)
  // Generate a UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  const runId = generateUUID();
  
  // First, create a sequence_run (required foreign key)
  console.log('Creating sequence_run...');
  const { data: run, error: runError } = await supabase
    .from('sequence_runs')
    .insert({
      id: runId,
      sequence_version_id: null, // Can be null for test
      lead_id: 'test_lead',
      investor_id: null, // Can be null for test
      started_at: new Date().toISOString(),
      status: 'active',
      current_node_id: 'trigger',
      context_jsonb: {},
    })
    .select()
    .single();
  
  if (runError) {
    console.error('❌ Error creating sequence_run:', runError);
    process.exit(1);
  }
  
  console.log(`✅ Sequence run created: ${runId}\n`);
  
  // Create test email job scheduled for immediate sending
  const { data: job, error } = await supabase
    .from('message_jobs')
    .insert({
      run_id: runId,
      node_id: 'test_email_node',
      job_type: 'email',
      email_address: 'lucaslegatos123@gmail.com',
      email_subject: 'TEST - Debug Email (next steps for Horizon Park)',
      email_html: testHtml,
      scheduled_for: new Date().toISOString(), // Schedule immediately
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating test email job:', error);
    process.exit(1);
  }

  console.log('✅ Test email job created:');
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Run ID: ${runId}`);
  console.log(`   Email: ${job.email_address}`);
  console.log(`   Subject: ${job.email_subject}`);
  console.log(`   HTML length: ${job.email_html?.length || 0} chars`);
  console.log(`   Scheduled for: ${job.scheduled_for}`);
  console.log('');

  // Now trigger the cron job to send it
  console.log('⏰ Triggering cron job to send the email...\n');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  
  try {
    const response = await fetch(`${baseUrl}/api/cron/send-due-messages?key=${encodeURIComponent(adminPassword)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error triggering cron:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Cron job executed!');
    console.log(`   Processed: ${result.processed || 0}`);
    console.log(`   Sent: ${result.sent || 0}`);
    console.log(`   Failed: ${result.failed || 0}`);
    console.log('');
    
    if (result.errors && result.errors.length > 0) {
      console.log('❌ Errors:', result.errors);
    }
    
    console.log('📬 Check your inbox at: lucaslegatos123@gmail.com');
    console.log('📋 Check server logs for debugging output showing:');
    console.log('   - [Compiler] HTML has X <br> tags BEFORE sending');
    console.log('   - [Cron] HTML has X <br> tags');
    console.log('   - [preserveLineBreaks] logs');
    console.log('   - [Gmail API] BEFORE/AFTER logs');
    
  } catch (error) {
    console.error('❌ Failed to trigger cron job:', error.message);
    console.log('');
    console.log('💡 You can manually trigger it by:');
    console.log(`   curl "${baseUrl}/api/cron/send-due-messages?key=${adminPassword}"`);
  }
}

sendTestEmail();

