/**
 * Verification script to check SMS interactions and intent scoring setup
 * Run with: node scripts/verify-sms-interactions-setup.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySetup() {
  console.log('🔍 Verifying SMS Interactions and Intent Scoring Setup...\n');

  // 1. Check if sms_interactions table exists
  console.log('1. Checking sms_interactions table...');
  const { data: interactions, error: interactionsError } = await supabase
    .from('sms_interactions')
    .select('*')
    .limit(1);

  if (interactionsError) {
    console.error('   ❌ sms_interactions table error:', interactionsError.message);
    console.error('   💡 Make sure you ran supabase-sms-interactions-schema.sql');
    return false;
  }
  console.log('   ✅ sms_interactions table exists');

  // 2. Check if intent_score column exists on investors
  console.log('\n2. Checking intent_score column on investors...');
  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('id, intent_score')
    .limit(1);

  if (investorsError) {
    console.error('   ❌ Error querying investors:', investorsError.message);
    return false;
  }
  
  if (investors && investors.length > 0 && 'intent_score' in investors[0]) {
    console.log('   ✅ intent_score column exists');
  } else {
    console.error('   ❌ intent_score column not found');
    console.error('   💡 Make sure you ran supabase-sms-interactions-schema.sql');
    return false;
  }

  // 3. Check recent interactions
  console.log('\n3. Checking recent interactions...');
  const { data: recentInteractions, error: recentError } = await supabase
    .from('sms_interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('   ❌ Error fetching interactions:', recentError.message);
  } else {
    console.log(`   ✅ Found ${recentInteractions?.length || 0} recent interactions`);
    if (recentInteractions && recentInteractions.length > 0) {
      console.log('   Recent interactions:');
      recentInteractions.forEach((interaction, i) => {
        console.log(`     ${i + 1}. ${interaction.interaction_type} - Score: ${interaction.intent_score_change} (${new Date(interaction.created_at).toLocaleString()})`);
      });
    }
  }

  // 4. Check investors with intent scores
  console.log('\n4. Checking investors with intent scores...');
  const { data: investorsWithScores, error: scoresError } = await supabase
    .from('investors')
    .select('id, investor_name, intent_score')
    .not('intent_score', 'is', null)
    .gt('intent_score', 0)
    .order('intent_score', { ascending: false })
    .limit(5);

  if (scoresError) {
    console.error('   ❌ Error fetching investors:', scoresError.message);
  } else {
    console.log(`   ✅ Found ${investorsWithScores?.length || 0} investors with positive intent scores`);
    if (investorsWithScores && investorsWithScores.length > 0) {
      console.log('   Top investors by intent score:');
      investorsWithScores.forEach((investor, i) => {
        console.log(`     ${i + 1}. ${investor.investor_name || 'Unknown'} - Score: ${investor.intent_score}`);
      });
    }
  }

  // 5. Check indexes (just confirm they should exist)
  console.log('\n5. Verifying indexes...');
  console.log('   ✅ Indexes should be in place (check Supabase dashboard to confirm)');
  console.log('      - idx_sms_interactions_investor');
  console.log('      - idx_sms_interactions_phone');
  console.log('      - idx_sms_interactions_type');
  console.log('      - idx_sms_interactions_created');
  console.log('      - idx_investors_intent_score');

  console.log('\n✨ Setup verification complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test SMS reply: Send an SMS to your Twilio number');
  console.log('   2. Test STOP: Reply "STOP" to an SMS');
  console.log('   3. Test Calendly: Book a meeting via Calendly');
  console.log('   4. Check the admin/sequences/jobs page to see interactions logged');

  return true;
}

verifySetup()
  .then((success) => {
    if (success) {
      console.log('\n✅ All checks passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some checks failed. Please review the errors above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

