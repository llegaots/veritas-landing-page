/**
 * Script to check email jobs for the active sequence run
 * Run with: npx tsx scripts/check-active-run-emails.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActiveRunEmails() {
  console.log('Checking email jobs for active sequence runs...\n');

  // Find active sequence runs for the test email
  const { data: runs, error: runsError } = await supabase
    .from('sequence_runs')
    .select('id, status, context_jsonb')
    .eq('status', 'active')
    .limit(10);

  if (runsError) {
    console.error('Error fetching runs:', runsError);
    return;
  }

  if (!runs || runs.length === 0) {
    console.log('No active sequence runs found');
    return;
  }

  console.log(`Found ${runs.length} active sequence run(s)\n`);

  for (const run of runs) {
    const email = run.context_jsonb?.email || run.context_jsonb?.email_address;
    
    console.log(`\n=== Run ID: ${run.id.substring(0, 8)}... ===`);
    console.log(`Status: ${run.status}`);
    console.log(`Email: ${email || 'N/A'}`);

    // Get all email jobs for this run
    const { data: emailJobs, error: jobsError } = await supabase
      .from('message_jobs')
      .select('*')
      .eq('run_id', run.id)
      .eq('job_type', 'email')
      .order('scheduled_for', { ascending: true });

    if (jobsError) {
      console.error('Error fetching email jobs:', jobsError);
      continue;
    }

    if (!emailJobs || emailJobs.length === 0) {
      console.log('No email jobs found for this run');
      continue;
    }

    console.log(`\nFound ${emailJobs.length} email job(s):\n`);

    const now = new Date();
    for (const job of emailJobs) {
      const scheduled = new Date(job.scheduled_for);
      const diff = scheduled.getTime() - now.getTime();
      const diffMinutes = Math.round(diff / 1000 / 60);
      const diffHours = Math.round(diff / 1000 / 60 / 60);
      
      const status = job.sent_at ? '✅ SENT' : diff > 0 ? '⏳ PENDING' : '⚠️  OVERDUE';
      
      console.log(`${status} - Job ${job.id.substring(0, 8)}...`);
      console.log(`  Subject: ${job.email_subject}`);
      console.log(`  Scheduled: ${job.scheduled_for}`);
      console.log(`  ${diff > 0 ? `Due in ${diffHours}h ${diffMinutes % 60}m` : `${Math.abs(diffMinutes)} minutes ago`}`);
      console.log(`  Sent: ${job.sent_at || 'Not yet'}`);
      console.log('');
    }
  }
}

checkActiveRunEmails().catch(console.error);

