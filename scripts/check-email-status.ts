/**
 * Script to check email sending status and errors
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkEmailStatus() {
  const { data: jobs } = await supabase
    .from('message_jobs')
    .select('*')
    .eq('job_type', 'email')
    .eq('email_address', 'lucaslegatos123@gmail.com')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(5);

  console.log('📧 Recent sent emails - checking status:\n');
  
  jobs?.forEach(job => {
    console.log(`Subject: ${job.email_subject}`);
    console.log(`Sent at: ${job.sent_at}`);
    console.log(`Provider status: ${job.provider_status || '❌ NOT SET'}`);
    console.log(`Error: ${job.error || 'None'}`);
    console.log(`Has messageId: ${job.provider_status ? '✅ Yes' : '❌ No'}`);
    if (job.provider_status) {
      console.log(`Message ID: ${job.provider_status}`);
    }
    console.log('');
  });
  
  // Check if messageId is being saved
  console.log('\n=== Checking if messageId is saved correctly ===\n');
  const { data: jobsWithStatus } = await supabase
    .from('message_jobs')
    .select('id, email_subject, provider_status, error')
    .eq('job_type', 'email')
    .eq('email_address', 'lucaslegatos123@gmail.com')
    .not('sent_at', 'is', null)
    .limit(10);
    
  const withMessageId = jobsWithStatus?.filter(j => j.provider_status && j.provider_status.startsWith('19c')) || [];
  const withoutMessageId = jobsWithStatus?.filter(j => !j.provider_status || !j.provider_status.startsWith('19c')) || [];
  
  console.log(`✅ Emails with Gmail messageId: ${withMessageId.length}`);
  console.log(`❌ Emails without Gmail messageId: ${withoutMessageId.length}`);
  
  if (withoutMessageId.length > 0) {
    console.log('\n⚠️  Emails without messageId (might not have been sent):');
    withoutMessageId.forEach(job => {
      console.log(`  - ${job.email_subject}: status="${job.provider_status}", error="${job.error || 'none'}"`);
    });
  }
}

checkEmailStatus().catch(console.error);

