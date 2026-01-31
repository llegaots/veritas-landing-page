/**
 * Compare expected vs actual SMS messages
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('📊 Comparing Expected vs Actual SMS Messages\n');
  console.log('='.repeat(70));

  // Get the sequence spec
  const { data: sequences } = await supabase
    .from('sequences')
    .select('id, active_version_id')
    .eq('name', 'Veritas SMS Sequence')
    .single();

  if (!sequences) {
    console.log('❌ Sequence not found');
    return;
  }

  const { data: version } = await supabase
    .from('sequence_versions')
    .select('spec_jsonb')
    .eq('id', sequences.active_version_id)
    .single();

  if (!version) {
    console.log('❌ Version not found');
    return;
  }

  const spec = version.spec_jsonb;
  const smsNodes = spec.nodes.filter(n => n.type === 'send_sms');

  // Get sent messages
  const { data: jobs } = await supabase
    .from('message_jobs')
    .select('node_id, message_text, sent_at')
    .eq('phone_number', '+14385017336')
    .not('sent_at', 'is', null)
    .order('scheduled_for', { ascending: true });

  console.log(`\n📋 Sequence has ${smsNodes.length} SMS nodes defined\n`);

  smsNodes.forEach((node, index) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`SMS #${index + 1} - Node: ${node.id}`);
    console.log('='.repeat(70));
    
    // Expected (with variable substitution)
    const expected = node.content
      .replace(/\{\{FirstName\}\}/g, 'Lucas')
      .replace(/\{\{PropertyName\}\}/g, 'Test Property');
    
    console.log(`\n📝 Expected Message (${expected.length} chars):`);
    console.log(`"${expected}"`);
    
    // Find actual messages for this node
    const actualJobs = jobs?.filter(j => j.node_id === node.id) || [];
    
    if (actualJobs.length > 0) {
      console.log(`\n✅ Found ${actualJobs.length} actual message(s) for this node:`);
      actualJobs.forEach((job, i) => {
        console.log(`\n   Actual Message #${i + 1} (${job.message_text.length} chars):`);
        console.log(`   "${job.message_text}"`);
        
        const matches = job.message_text.trim() === expected.trim();
        if (matches) {
          console.log(`   ✅ MATCHES expected`);
        } else {
          console.log(`   ❌ DIFFERS from expected`);
          if (job.message_text.length < expected.length) {
            console.log(`   ⚠️  Message is TRUNCATED (${expected.length - job.message_text.length} chars missing)`);
          }
        }
      });
    } else {
      console.log(`\n⚠️  No messages sent for this node yet`);
    }
  });

  console.log(`\n\n${'='.repeat(70)}`);
  console.log('Summary:');
  console.log('='.repeat(70));
  console.log(`Total SMS nodes in sequence: ${smsNodes.length}`);
  console.log(`Total messages sent: ${jobs?.length || 0}`);
  
  const uniqueNodes = new Set(jobs?.map(j => j.node_id) || []);
  console.log(`Unique nodes with messages: ${uniqueNodes.size}`);
  console.log(`Nodes with messages: ${Array.from(uniqueNodes).join(', ')}`);
}

main().catch(console.error);



