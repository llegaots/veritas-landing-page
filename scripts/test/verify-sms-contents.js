/**
 * Verify SMS message contents
 * Shows full message text for each SMS sent
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('📱 Verifying SMS Message Contents\n');
  console.log('=' .repeat(60));
  
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select('id, node_id, phone_number, message_text, scheduled_for, sent_at, provider_status')
    .eq('phone_number', '+14385017336')
    .not('sent_at', 'is', null)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nFound ${jobs?.length || 0} sent messages:\n`);

  jobs?.forEach((job, index) => {
    console.log(`\n📨 SMS #${index + 1}`);
    console.log('-'.repeat(60));
    console.log(`Node ID: ${job.node_id}`);
    console.log(`Scheduled: ${new Date(job.scheduled_for).toLocaleString()}`);
    console.log(`Sent: ${new Date(job.sent_at).toLocaleString()}`);
    console.log(`Status: ${job.provider_status || 'N/A'}`);
    console.log(`\nMessage Content:`);
    console.log(`"${job.message_text}"`);
    console.log(`\nCharacter Count: ${job.message_text.length}`);
  });

  // Expected messages from sequence
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 Expected Sequence Messages:');
  console.log('='.repeat(60));
  
  const expectedMessages = [
    {
      node: 'sms_1',
      content: 'Hi Lucas, this is Alex with Veritas Equity Partners. You just requested info on the Test Property multifamily investment opportunity. I\'d love to walk you through the deal and see if it aligns with your investment goals. Are you available for a quick 15-min call this week?'
    },
    {
      node: 'sms_2',
      content: 'For context, our strategy focuses on workforce-housing multifamily. Returns are driven by cash flow and operational improvements. If you\'re interested in learning more, I can send you the deal memo and we can schedule a call.'
    },
    {
      node: 'sms_3',
      content: 'Quick note here, the Zoom isn\'t a pitch. It\'s just to walkthrough the deal, risks and see if it aligns with what you\'re looking for. If it\'s not a fit, no worries at all. Would a quick call work?'
    },
    {
      node: 'sms_4',
      content: 'Most people book the call just to confirm whether this makes sense before spending time reviewing docs. If you want clarity first, happy to jump on a quick call. Does that work?'
    },
    {
      node: 'sms_5',
      content: 'I want to be honest, there are real risks with this deal. If you want to understand each specifically and how I mitigate them, just book a call. No pressure, just transparency.'
    }
  ];

  expectedMessages.forEach((expected, index) => {
    const actual = jobs?.find(j => j.node_id === expected.node);
    console.log(`\n${index + 1}. ${expected.node}:`);
    if (actual) {
      const matches = actual.message_text.trim() === expected.content.trim();
      console.log(`   ✅ Found - ${matches ? 'MATCHES' : 'DIFFERS'}`);
      if (!matches) {
        console.log(`   Expected: "${expected.content}"`);
        console.log(`   Actual:   "${actual.message_text}"`);
      }
    } else {
      console.log(`   ⚠️  Not found in sent messages`);
    }
  });

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);



