require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function archiveTestRuns() {
  console.log('🔍 Finding runs for test phone/email...\n');

  const targetPhone = '+14385017336';
  const targetEmail = 'lucaslegatos123@gmail.com';
  const phoneDigits = targetPhone.replace(/\D/g, ''); // Remove non-digits for matching

  // Get all runs
  const { data: allRuns, error } = await supabase
    .from('sequence_runs')
    .select(`
      id,
      investor_id,
      lead_id,
      status,
      archived_at,
      created_at,
      context_jsonb,
      sequence_versions(
        sequences(
          name
        )
      )
    `)
    .is('archived_at', null) // Only get unarchived runs
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // Filter for matching phone or email
  const matchingRuns = allRuns.filter(run => {
    const context = run.context_jsonb || {};
    const email = (context.email || context.Email || '').toLowerCase().trim();
    const phone = (context.phone || '').replace(/\D/g, ''); // Remove non-digits
    
    const emailMatch = email === targetEmail.toLowerCase();
    const phoneMatch = phone === phoneDigits;
    
    return emailMatch || phoneMatch;
  });

  if (matchingRuns.length === 0) {
    console.log('✅ No unarchived runs found matching the criteria.\n');
    return;
  }

  console.log(`📊 Found ${matchingRuns.length} unarchived run(s) to archive:\n`);

  matchingRuns.forEach((run, idx) => {
    const context = run.context_jsonb || {};
    const email = context.email || context.Email || 'no-email';
    const phone = context.phone || 'no-phone';
    const sequenceName = run.sequence_versions?.sequences?.name || 'Unknown';
    
    console.log(`${idx + 1}. Run ${run.id.substring(0, 8)}...`);
    console.log(`   Investor ID: ${run.investor_id || 'N/A'}`);
    console.log(`   Lead ID: ${run.lead_id || 'N/A'}`);
    console.log(`   Sequence: ${sequenceName}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Created: ${run.created_at}`);
    console.log('');
  });

  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n⚠️  Archive all ${matchingRuns.length} run(s)? (yes/no): `, async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled. No runs were archived.');
      rl.close();
      return;
    }

    console.log('\n🔄 Archiving runs...\n');

    const runIds = matchingRuns.map(r => r.id);
    const now = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from('sequence_runs')
      .update({
        archived_at: now,
        updated_at: now,
      })
      .in('id', runIds)
      .is('archived_at', null) // Only update if still unarchived
      .select('id, archived_at');

    if (updateError) {
      console.error('❌ Error archiving runs:', updateError.message);
      rl.close();
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Successfully archived ${data.length} run(s):\n`);
      data.forEach((run, idx) => {
        console.log(`${idx + 1}. Run ${run.id.substring(0, 8)}... - Archived at: ${run.archived_at}`);
      });
    } else {
      console.log('⚠️  No runs were updated (they may have been archived already).');
    }

    rl.close();
  });
}

archiveTestRuns().catch(console.error);

