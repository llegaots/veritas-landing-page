/**
 * Check status of sent SMS messages
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('📨 Checking sent SMS messages...\n');
  
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select('id, phone_number, message_text, scheduled_for, sent_at, provider_status, error')
    .eq('phone_number', '+14385017336')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${jobs?.length || 0} sent messages:\n`);
  
  jobs?.forEach((job, i) => {
    console.log(`${i + 1}. Job ${job.id.substring(0, 8)}...`);
    console.log(`   Phone: ${job.phone_number}`);
    console.log(`   Sent At: ${job.sent_at}`);
    console.log(`   Provider Status: ${job.provider_status || 'N/A'}`);
    console.log(`   Error: ${job.error || 'None'}`);
    console.log(`   Message: ${job.message_text.substring(0, 60)}...`);
    console.log('');
  });
}

main().catch(console.error);



