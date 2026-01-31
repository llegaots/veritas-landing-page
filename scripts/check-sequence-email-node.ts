/**
 * Script to check the original email HTML content in the sequence node
 * Run with: npx tsx scripts/check-sequence-email-node.ts
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

async function checkSequenceEmailNode() {
  console.log('Checking email node content in sequence...\n');

  // Get the most recent sent email job
  const { data: jobData, error: jobError } = await supabase
    .from('message_jobs')
    .select('node_id, run_id')
    .eq('job_type', 'email')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();

  if (jobError || !jobData) {
    console.log('No sent email job found:', jobError);
    return;
  }

  console.log(`Node ID: ${jobData.node_id}`);
  console.log(`Run ID: ${jobData.run_id}`);
  console.log(`\nFetching sequence run...\n`);

  // Get the sequence run
  const { data: runData, error: runError } = await supabase
    .from('sequence_runs')
    .select('sequence_version_id')
    .eq('id', jobData.run_id)
    .single();

  if (runError || !runData) {
    console.error('Error fetching run:', runError);
    return;
  }

  console.log(`Version ID: ${runData.sequence_version_id}`);
  console.log(`\nFetching sequence version...\n`);

  // Get the sequence version spec
  const { data: versionData, error } = await supabase
    .from('sequence_versions')
    .select('spec_jsonb')
    .eq('id', runData.sequence_version_id)
    .single();

  if (error) {
    console.error('Error fetching version:', error);
    return;
  }

  const spec = versionData.spec_jsonb;
  const emailNode = spec.nodes?.find((n: any) => n.id === jobData.node_id);

  if (!emailNode) {
    console.log('Email node not found in spec');
    return;
  }

  console.log(`Email Node Type: ${emailNode.type}`);
  console.log(`Subject: ${emailNode.subject}`);
  
  const htmlContent = emailNode.html_content || '';
  console.log(`\nOriginal HTML Content Length: ${htmlContent.length} chars`);
  console.log(`\nFirst 500 chars of original HTML:`);
  console.log(htmlContent.substring(0, 500));
  console.log(`\nLast 500 chars of original HTML:`);
  console.log(htmlContent.substring(Math.max(0, htmlContent.length - 500)));
  
  // Compare with what's in the database
  const { data: dbJob } = await supabase
    .from('message_jobs')
    .select('email_html')
    .eq('run_id', jobData.run_id)
    .eq('node_id', jobData.node_id)
    .eq('job_type', 'email')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();
  
  if (dbJob) {
    console.log(`\n\nDatabase HTML Length: ${dbJob.email_html?.length || 0} chars`);
    console.log(`Difference: ${htmlContent.length - (dbJob.email_html?.length || 0)} chars`);
    
    if (htmlContent.length !== (dbJob.email_html?.length || 0)) {
      console.log(`\n⚠️  WARNING: HTML length mismatch!`);
      console.log(`Original: ${htmlContent.length} chars`);
      console.log(`Database: ${dbJob.email_html?.length || 0} chars`);
    }
  }
}

checkSequenceEmailNode().catch(console.error);

