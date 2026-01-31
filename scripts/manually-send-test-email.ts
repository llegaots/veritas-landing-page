/**
 * Script to manually trigger sending a test email
 * Run with: npx tsx scripts/manually-send-test-email.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { sendEmail } from '../lib/email/provider';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function manuallySendTestEmail() {
  console.log('Finding a test email job to send...\n');

  // Get the most recent unsent email job
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select('*')
    .eq('job_type', 'email')
    .is('sent_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('No unsent email jobs found');
    return;
  }

  const job = jobs[0];
  console.log(`Found email job: ${job.id}`);
  console.log(`Subject: ${job.email_subject}`);
  console.log(`To: ${job.email_address}`);
  console.log(`Scheduled for: ${job.scheduled_for}`);
  console.log(`\nSending email now...\n`);

  const result = await sendEmail({
    to: job.email_address,
    subject: job.email_subject,
    html: job.email_html,
    text: job.email_text || undefined,
    metadata: {
      job_id: job.id,
      run_id: job.run_id,
      node_id: job.node_id,
    },
  });

  console.log('Send result:', result);

  if (result.success) {
    // Update job as sent
    await supabase
      .from('message_jobs')
      .update({
        sent_at: new Date().toISOString(),
        provider_status: result.status,
      })
      .eq('id', job.id);
    
    console.log('\n✅ Email sent successfully!');
  } else {
    console.error('\n❌ Email failed:', result.error);
  }
}

manuallySendTestEmail().catch(console.error);

