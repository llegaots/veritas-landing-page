/**
 * Test script to trigger SMS sequence for Lucas PAUL Legatos
 * Run with: node scripts/test-sms-lucas.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

async function testSmsSequence() {
  console.log('🧪 Testing SMS sequence for Lucas PAUL Legatos...\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📱 Phone: +14385017336 (4385017336)`);
  console.log(`👤 Name: Lucas PAUL Legatos\n`);

  const testData = {
    lead_id: 'test_lucas_' + Date.now(),
    phone: '+14385017336', // Format: +1 country code + number
    attributes: {
      FirstName: 'Lucas',
      PropertyName: 'Test Property',
      investor_id: 'test_123',
    },
  };

  try {
    console.log('📤 Sending request to /api/events/lead.created...');
    const response = await fetch(`${BASE_URL}/api/events/lead.created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_PASSWORD}`,
      },
      body: JSON.stringify(testData),
    });

    const responseText = await response.text();
    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('📥 Response Body:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('📥 Response Text:', responseText);
    }

    if (!response.ok) {
      console.error('\n❌ Request failed!');
      process.exit(1);
    }

    if (result.runs_created > 0) {
      console.log(`\n✅ Success! Created ${result.runs_created} SMS sequence run(s)`);
      console.log(`🆔 Run IDs: ${result.run_ids?.join(', ') || 'N/A'}`);
      console.log('\n⏱️  SMS messages will be sent with minutes instead of hours/days (test mode)');
      console.log('📱 Check your phone (+14385017336) for messages!');
    } else {
      console.log('\n⚠️  No runs created. Check the response above for details.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testSmsSequence();


