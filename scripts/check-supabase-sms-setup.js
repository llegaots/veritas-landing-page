/**
 * Check Supabase SMS setup
 * This script verifies:
 * 1. Required tables exist
 * 2. Sequences are configured
 * 3. Jobs are being created
 * 4. Recent activity
 * 
 * Run with: node scripts/check-supabase-sms-setup.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      return { exists: false, error: 'Table does not exist' };
    }
    return { exists: false, error: error.message };
  }
  return { exists: true, count: data?.length || 0 };
}

async function main() {
  console.log('🔍 Checking Supabase SMS Setup...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  // 1. Check required tables
  console.log('📊 Checking Tables:');
  const tables = [
    'sequences',
    'sequence_versions',
    'sequence_runs',
    'message_jobs',
    'sequence_events',
  ];

  for (const table of tables) {
    const result = await checkTable(table);
    if (result.exists) {
      // Get count
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      console.log(`  ✅ ${table}: EXISTS (${count || 0} records)`);
    } else {
      console.log(`  ❌ ${table}: ${result.error}`);
    }
  }

  // 2. Check sequences
  console.log('\n📋 Checking Sequences:');
  const { data: sequences, error: seqError } = await supabase
    .from('sequences')
    .select('id, name, active_version_id, created_at');

  if (seqError) {
    console.log(`  ❌ Error: ${seqError.message}`);
  } else {
    console.log(`  ✅ Found ${sequences?.length || 0} sequence(s)`);
    sequences?.forEach(seq => {
      console.log(`     - ${seq.name}`);
      console.log(`       ID: ${seq.id}`);
      console.log(`       Active Version: ${seq.active_version_id || 'NONE'}`);
    });
  }

  // 3. Check active sequence with trigger
  console.log('\n🎯 Checking Active Sequences:');
  const { data: activeSeqs } = await supabase
    .from('sequences')
    .select('id, name, active_version_id')
    .not('active_version_id', 'is', null);

  if (activeSeqs && activeSeqs.length > 0) {
    for (const seq of activeSeqs) {
      const { data: version } = await supabase
        .from('sequence_versions')
        .select('id, spec_jsonb, version_number')
        .eq('id', seq.active_version_id)
        .single();

      if (version) {
        const spec = version.spec_jsonb;
        const triggerType = spec?.trigger?.type || 'unknown';
        console.log(`  ✅ ${seq.name}:`);
        console.log(`     Trigger: ${triggerType}`);
        console.log(`     Version: ${version.version_number}`);
        console.log(`     Nodes: ${spec?.nodes?.length || 0}`);
      }
    }
  } else {
    console.log('  ⚠️  No active sequences found');
  }

  // 4. Check recent runs
  console.log('\n🏃 Checking Recent Runs:');
  const { data: runs, error: runsError } = await supabase
    .from('sequence_runs')
    .select('id, lead_id, status, started_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.log(`  ❌ Error: ${runsError.message}`);
  } else {
    console.log(`  ✅ Found ${runs?.length || 0} recent run(s)`);
    runs?.forEach(run => {
      console.log(`     - Run ${run.id.substring(0, 8)}...`);
      console.log(`       Lead: ${run.lead_id}`);
      console.log(`       Status: ${run.status}`);
      console.log(`       Started: ${run.started_at || 'N/A'}`);
    });
  }

  // 5. Check message jobs
  console.log('\n📨 Checking Message Jobs:');
  const { data: jobs, error: jobsError } = await supabase
    .from('message_jobs')
    .select('id, run_id, phone_number, scheduled_for, sent_at, provider_status')
    .order('scheduled_for', { ascending: false })
    .limit(10);

  if (jobsError) {
    console.log(`  ❌ Error: ${jobsError.message}`);
    console.log(`     This usually means the message_jobs table doesn't exist.`);
    console.log(`     Run the SQL from supabase-sequences-schema.sql in Supabase SQL Editor.`);
  } else {
    console.log(`  ✅ Found ${jobs?.length || 0} recent job(s)`);
    
    const dueJobs = jobs?.filter(j => !j.sent_at && new Date(j.scheduled_for) <= new Date()) || [];
    const sentJobs = jobs?.filter(j => j.sent_at) || [];
    
    console.log(`     - Due/Unsent: ${dueJobs.length}`);
    console.log(`     - Sent: ${sentJobs.length}`);
    
    if (jobs && jobs.length > 0) {
      jobs.slice(0, 3).forEach(job => {
        console.log(`     - Job ${job.id.substring(0, 8)}...`);
        console.log(`       Phone: ${job.phone_number}`);
        console.log(`       Scheduled: ${job.scheduled_for}`);
        console.log(`       Sent: ${job.sent_at || 'NOT SENT'}`);
        console.log(`       Status: ${job.provider_status || 'N/A'}`);
      });
    }
  }

  // 6. Check for test phone number
  console.log('\n📱 Checking for Test Phone (4385017336):');
  if (jobs && jobs.length > 0) {
    const testJobs = jobs.filter(j => 
      j.phone_number?.includes('4385017336') || 
      j.phone_number?.replace(/\D/g, '').includes('4385017336')
    );
    console.log(`  ✅ Found ${testJobs.length} job(s) for test number`);
  } else {
    console.log('  ⚠️  No jobs found to check');
  }

  console.log('\n✅ Check complete!\n');
}

main().catch(console.error);



