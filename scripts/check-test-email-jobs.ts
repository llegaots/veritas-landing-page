/**
 * Script to check email jobs for the test email address
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTestEmailJobs() {
  // Get ALL email jobs (sent and unsent)
  const { data: allJobs } = await supabase
    .from('message_jobs')
    .select('*, sequence_runs!inner(id, status)')
    .eq('job_type', 'email')
    .eq('email_address', 'lucaslegatos123@gmail.com')
    .order('scheduled_for', { ascending: true })
    .limit(20);

  console.log('📧 ALL Email jobs for lucaslegatos123@gmail.com:\n');
  
  const now = new Date();
  const sent = allJobs?.filter(j => j.sent_at) || [];
  const pending = allJobs?.filter(j => !j.sent_at) || [];
  
  console.log(`✅ Sent: ${sent.length}`);
  console.log(`⏳ Pending: ${pending.length}\n`);
  
  if (pending.length > 0) {
    console.log('=== PENDING EMAILS (Not sent yet) ===\n');
    pending.forEach(job => {
      const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
      const scheduled = new Date(job.scheduled_for);
      const diff = scheduled.getTime() - now.getTime();
      const diffHours = Math.round(diff / 1000 / 60 / 60);
      const diffMinutes = Math.round(diff / 1000 / 60);
      const status = run?.status === 'active' ? '⏳ PENDING (active)' : '⏸️  PENDING (PAUSED)';
      console.log(`${status} - ${job.email_subject}`);
      console.log(`  Run: ${run?.id.substring(0, 8)}... Status: ${run?.status}`);
      console.log(`  Scheduled: ${job.scheduled_for}`);
      if (diff > 0) {
        console.log(`  Due in: ${diffHours}h ${diffMinutes % 60}m`);
      } else {
        console.log(`  ⚠️  OVERDUE by ${Math.abs(diffMinutes)} minutes!`);
      }
      console.log('');
    });
  }
  
  if (sent.length > 0) {
    console.log(`\n=== SENT EMAILS (Last ${Math.min(5, sent.length)}) ===\n`);
    sent.slice(-5).forEach(job => {
      const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
      console.log(`✅ SENT - ${job.email_subject}`);
      console.log(`  Run: ${run?.id.substring(0, 8)}... Status: ${run?.status}`);
      console.log(`  Sent at: ${job.sent_at}`);
      console.log('');
    });
  }
}

checkTestEmailJobs().catch(console.error);

