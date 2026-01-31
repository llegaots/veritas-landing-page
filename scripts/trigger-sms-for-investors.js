/**
 * Trigger SMS sequence for investors with test phone number
 * Usage: node scripts/trigger-sms-for-investors.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerSmsForInvestors() {
  console.log('🔍 Finding investors with test phone number (4385017336)...\n');
  
  // Find investors with the test phone number (various formats)
  const { data: investors, error } = await supabase
    .from('investors')
    .select('*')
    .or('phone_number.ilike.%4385017336%,phone_number.ilike.%438-501-7336%,phone_number.ilike.%+14385017336%')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching investors:', error);
    return;
  }
  
  if (!investors || investors.length === 0) {
    console.log('ℹ️  No investors found with test phone number');
    console.log('\n💡 To create a test investor, you can:');
    console.log('   1. Use the Airtable webhook: POST /api/webhooks/investor-created');
    console.log('   2. Manually insert into Supabase investors table');
    console.log('   3. Then run this script again\n');
    return;
  }
  
  console.log(`Found ${investors.length} investor(s) with test phone number:\n`);
  investors.forEach((inv, i) => {
    console.log(`${i + 1}. ${inv.investor_name || 'No name'}`);
    console.log(`   Phone: ${inv.phone_number}`);
    console.log(`   Status: ${inv.status || 'No status'}`);
    console.log(`   ID: ${inv.id}`);
    console.log('');
  });
  
  console.log('📤 Triggering SMS sequences...\n');
  
  for (const investor of investors) {
    // Only trigger for "New Lead" status
    if (investor.status?.toLowerCase().trim() !== 'new lead') {
      console.log(`⏭️  Skipping ${investor.investor_name || investor.id} - Status is "${investor.status}", not "New Lead"`);
      continue;
    }
    
    if (!investor.phone_number) {
      console.log(`⏭️  Skipping ${investor.investor_name || investor.id} - No phone number`);
      continue;
    }
    
    console.log(`📱 Triggering SMS for: ${investor.investor_name || investor.id} (${investor.phone_number})`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/events/lead.created`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_PASSWORD}`,
        },
        body: JSON.stringify({
          lead_id: `investor_${investor.id}`,
          phone: investor.phone_number,
          attributes: {
            FirstName: investor.investor_name?.split(' ')[0] || 'Investor',
            FullName: investor.investor_name || 'Investor',
            PropertyName: investor.deal || 'Test Property',
            CalendarLink: 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call',
            Email: investor.email_address || '',
            Phone: investor.phone_number,
            investor_id: investor.id.toString(),
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error: ${response.status} ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      console.log(`✅ Success! Created ${result.runs_created || 0} sequence run(s)`);
      if (result.run_ids) {
        console.log(`   Run IDs: ${result.run_ids.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to trigger SMS for ${investor.investor_name || investor.id}:`, error.message);
      console.log('');
    }
  }
  
  console.log('✅ Done! Check your phone for messages.');
  console.log('💡 To send due messages immediately, run: node scripts/send-due-messages-now.js');
}

triggerSmsForInvestors().catch(console.error);



