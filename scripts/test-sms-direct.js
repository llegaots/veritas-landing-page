/**
 * Direct SMS test - bypasses sequence and sends directly
 * Run with: node scripts/test-sms-direct.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Import the SMS provider
async function testDirectSms() {
  console.log('🧪 Testing Direct SMS to +14385017336...\n');
  
  // Dynamic import of the SMS function
  const { sendSms } = await import('../lib/sms/provider.ts');
  
  const result = await sendSms({
    to: '+14385017336',
    body: 'Test SMS from Veritas - If you receive this, Twilio is working!',
    metadata: { test: true },
  });
  
  console.log('📤 SMS Send Result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n✅ SMS sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Status: ${result.status}`);
    console.log('\n📱 Check your phone (+14385017336) for the message!');
  } else {
    console.log('\n❌ SMS failed to send:');
    console.log(`   Error: ${result.error}`);
    console.log('\n💡 Check:');
    console.log('   1. Twilio credentials in .env.local');
    console.log('   2. Twilio phone number is correct');
    console.log('   3. Twilio account has sufficient balance');
  }
}

testDirectSms().catch(console.error);


