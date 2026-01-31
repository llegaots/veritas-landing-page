/**
 * Script to check email HTML content in the database
 * Run with: npx tsx scripts/check-email-html.ts
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

async function checkEmailJobs() {
  console.log('Checking email jobs in database...\n');

  // Get the most recent SENT email job (the first one that was actually sent)
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select('*')
    .eq('job_type', 'email')
    .not('sent_at', 'is', null) // Only sent emails
    .order('sent_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('No email jobs found');
    return;
  }

  console.log(`Found ${jobs.length} email job(s):\n`);

  for (const job of jobs) {
    console.log(`Job ID: ${job.id}`);
    console.log(`Created: ${job.created_at}`);
    console.log(`Scheduled: ${job.scheduled_for}`);
    console.log(`Sent: ${job.sent_at || 'Not sent yet'}`);
    console.log(`Subject: ${job.email_subject}`);
    console.log(`Email: ${job.email_address}`);
    
    const htmlLength = job.email_html?.length || 0;
    console.log(`HTML Length: ${htmlLength} chars`);
    
    // Check HTML structure
    const hasOpeningTable = job.email_html?.includes('<table');
    const hasClosingTable = job.email_html?.includes('</table>');
    const tableCount = (job.email_html?.match(/<table/g) || []).length;
    const closingTableCount = (job.email_html?.match(/<\/table>/g) || []).length;
    
    console.log(`HTML Structure Check:`);
    console.log(`  - Has opening <table>: ${hasOpeningTable}`);
    console.log(`  - Has closing </table>: ${hasClosingTable}`);
    console.log(`  - Opening <table> count: ${tableCount}`);
    console.log(`  - Closing </table> count: ${closingTableCount}`);
    
    if (tableCount !== closingTableCount) {
      console.log(`  ⚠️  WARNING: Mismatch in table tags!`);
    }
    
    // Show first and last 300 chars
    if (job.email_html) {
      console.log(`\nFirst 300 chars:`);
      console.log(job.email_html.substring(0, 300));
      console.log(`\nLast 300 chars:`);
      console.log(job.email_html.substring(Math.max(0, htmlLength - 300)));
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

checkEmailJobs().catch(console.error);

