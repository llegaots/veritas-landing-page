require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyIndexes() {
  console.log('🔍 Verifying database indexes for duplicate prevention...\n');

  // Check for unique index on sequence_runs
  const { data: runsIndexes, error: runsError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'sequence_runs' 
      AND indexname = 'idx_sequence_runs_unique_active_lead';
    `
  }).catch(() => ({ data: null, error: 'RPC not available' }));

  // Check for unique index on message_jobs
  const { data: jobsIndexes, error: jobsError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'message_jobs' 
      AND indexname = 'idx_message_jobs_unique_run_node';
    `
  }).catch(() => ({ data: null, error: 'RPC not available' }));

  // Alternative: Query directly using raw SQL (if RPC not available)
  console.log('⚠️  Note: Direct SQL queries require Supabase SQL Editor');
  console.log('   Run these queries in Supabase SQL Editor:\n');
  console.log('1. Check sequence_runs unique index:');
  console.log(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'sequence_runs' 
    AND indexname = 'idx_sequence_runs_unique_active_lead';
  `);
  console.log('\n2. Check message_jobs unique index:');
  console.log(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'message_jobs' 
    AND indexname = 'idx_message_jobs_unique_run_node';
  `);
  console.log('\n3. If indexes are missing, run:');
  console.log(`
    -- Prevent duplicate active runs
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_runs_unique_active_lead
      ON sequence_runs (sequence_version_id, lead_id)
      WHERE status = 'active';

    -- Prevent duplicate jobs
    CREATE UNIQUE INDEX IF NOT EXISTS idx_message_jobs_unique_run_node
      ON message_jobs (run_id, node_id);
  `);
}

verifyIndexes();

