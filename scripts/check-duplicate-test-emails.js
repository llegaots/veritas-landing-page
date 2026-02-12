require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicateTestEmails() {
  console.log('🔍 Checking for duplicate runs that might be sending to TEST email...\n');

  // Get all active runs
  const { data: activeRuns, error } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      archived_at,
      created_at,
      context_jsonb,
      sequence_version_id,
      sequence_versions(
        sequences(
          name
        )
      )
    `)
    .eq('status', 'active')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!activeRuns || activeRuns.length === 0) {
    console.log('✅ No active runs found.\n');
    return;
  }

  console.log(`📊 Found ${activeRuns.length} active run(s)\n`);

  // Group by email/phone to find duplicates
  const emailGroups = new Map();
  const phoneGroups = new Map();

  activeRuns.forEach(run => {
    const context = run.context_jsonb || {};
    const email = (context.email || context.Email || '').toLowerCase().trim();
    const phone = (context.phone || '').replace(/\D/g, '');
    const sequenceId = run.sequence_versions?.sequence_id;
    const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';

    if (email) {
      const key = `${email}-${sequenceId}`;
      if (!emailGroups.has(key)) {
        emailGroups.set(key, []);
      }
      emailGroups.get(key).push({
        runId: run.id,
        investorId: run.investor_id,
        leadId: run.lead_id,
        sequenceName,
        createdAt: run.created_at,
      });
    }

    if (phone) {
      const key = `${phone}-${sequenceId}`;
      if (!phoneGroups.has(key)) {
        phoneGroups.set(key, []);
      }
      phoneGroups.get(key).push({
        runId: run.id,
        investorId: run.investor_id,
        leadId: run.lead_id,
        sequenceName,
        createdAt: run.created_at,
      });
    }
  });

  // Check for duplicates by email
  console.log('📧 Checking for duplicate runs by email...\n');
  let emailDuplicates = 0;
  emailGroups.forEach((runs, key) => {
    if (runs.length > 1) {
      emailDuplicates++;
      const [email] = key.split('-');
      console.log(`⚠️  Email: ${email}`);
      console.log(`   Has ${runs.length} active run(s) for the same sequence:`);
      runs.forEach((run, i) => {
        console.log(`   ${i + 1}. Run ${run.runId.substring(0, 8)}... - Investor: ${run.investorId || 'N/A'}, Sequence: ${run.sequenceName}, Created: ${run.createdAt}`);
      });
      console.log('');
    }
  });

  if (emailDuplicates === 0) {
    console.log('✅ No duplicate runs found by email.\n');
  }

  // Check specifically for TEST email
  console.log('\n🔍 Checking specifically for "TEST" or test emails...\n');
  const testEmails = ['test', 'lucaslegatos123@gmail.com'];
  let foundTestDuplicates = false;

  testEmails.forEach(testEmail => {
    const normalizedTestEmail = testEmail.toLowerCase().trim();
    emailGroups.forEach((runs, key) => {
      const [email] = key.split('-');
      if (email.toLowerCase().includes(normalizedTestEmail) || normalizedTestEmail.includes(email.toLowerCase())) {
        if (runs.length > 1) {
          foundTestDuplicates = true;
          console.log(`⚠️  Found duplicate runs for email containing "${testEmail}":`);
          console.log(`   Email: ${email}`);
          console.log(`   Has ${runs.length} active run(s):`);
          runs.forEach((run, i) => {
            console.log(`   ${i + 1}. Run ${run.runId.substring(0, 8)}... - Investor: ${run.investorId || 'N/A'}, Sequence: ${run.sequenceName}, Created: ${run.createdAt}`);
          });
          console.log('');
        }
      }
    });
  });

  if (!foundTestDuplicates) {
    console.log('✅ No duplicate runs found for test emails.\n');
  }

  // Check for runs with "test" in lead_id
  console.log('\n🔍 Checking for runs with "test" in lead_id...\n');
  const testLeadRuns = activeRuns.filter(run => 
    run.lead_id && run.lead_id.toLowerCase().includes('test')
  );

  if (testLeadRuns.length > 0) {
    console.log(`📊 Found ${testLeadRuns.length} run(s) with "test" in lead_id:\n`);
    testLeadRuns.forEach((run, idx) => {
      const context = run.context_jsonb || {};
      const email = context.email || context.Email || 'no-email';
      const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';
      console.log(`${idx + 1}. Run ${run.id.substring(0, 8)}...`);
      console.log(`   Lead ID: ${run.lead_id}`);
      console.log(`   Email: ${email}`);
      console.log(`   Sequence: ${sequenceName}`);
      console.log(`   Created: ${run.created_at}`);
      console.log('');
    });
  } else {
    console.log('✅ No runs found with "test" in lead_id.\n');
  }
}

checkDuplicateTestEmails().catch(console.error);

