/**
 * Script to check if there are any due email jobs waiting to be sent
 * Run with: npx tsx scripts/check-due-email-jobs.ts
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

async function checkDueEmailJobs() {
  console.log('Checking for due email jobs...\n');

  const now = new Date();
  const bufferMs = 5000; // 5 seconds buffer
  const dueTime = new Date(now.getTime() + bufferMs).toISOString();

  console.log(`Current time: ${now.toISOString()}`);
  console.log(`Due time (with buffer): ${dueTime}\n`);

  // Get due email jobs
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select(`
      *,
      sequence_runs!inner(
        id,
        status,
        investor_id
      )
    `)
    .eq('job_type', 'email')
    .is('sent_at', null) // Not yet sent
    .lte('scheduled_for', dueTime) // Due now or past
    .order('scheduled_for', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('❌ No due email jobs found');
    
    // Check if there are any unsent email jobs at all
    const { data: allJobs, error: allError } = await supabase
      .from('message_jobs')
      .select('id, scheduled_for, sent_at, job_type')
      .eq('job_type', 'email')
      .is('sent_at', null)
      .order('scheduled_for', { ascending: true })
      .limit(5);
    
    if (allError) {
      console.error('Error fetching all jobs:', allError);
      return;
    }
    
    if (allJobs && allJobs.length > 0) {
      console.log(`\n📅 Found ${allJobs.length} unsent email job(s) scheduled for the future:`);
      allJobs.forEach(job => {
        const scheduled = new Date(job.scheduled_for);
        const diff = scheduled.getTime() - now.getTime();
        const diffMinutes = Math.round(diff / 1000 / 60);
        console.log(`  - Job ${job.id}: scheduled for ${job.scheduled_for} (${diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`})`);
      });
    } else {
      console.log('No unsent email jobs found at all');
    }
    
    return;
  }

  console.log(`✅ Found ${jobs.length} due email job(s):\n`);

  for (const job of jobs) {
    const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
    const scheduled = new Date(job.scheduled_for);
    const diff = scheduled.getTime() - now.getTime();
    
    console.log(`Job ID: ${job.id}`);
    console.log(`Scheduled: ${job.scheduled_for} (${Math.round(diff / 1000)}s ${diff > 0 ? 'ahead' : 'ago'})`);
    console.log(`Subject: ${job.email_subject}`);
    console.log(`To: ${job.email_address}`);
    console.log(`Run Status: ${run?.status || 'unknown'}`);
    console.log(`HTML Length: ${job.email_html?.length || 0} chars`);
    
    if (run && run.status !== 'active') {
      console.log(`⚠️  WARNING: Sequence run is ${run.status}, not active - email won't be sent!`);
    }
    
    console.log('');
  }
}

checkDueEmailJobs().catch(console.error);

