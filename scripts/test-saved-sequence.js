/**
 * Test script to trigger a saved SMS sequence
 * Only sends SMS to the test phone number: 438-501-7336
 * 
 * Usage: node scripts/test-saved-sequence.js
 */

const TEST_PHONE = '4385017336'; // Test phone number
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

async function testSequence() {
  console.log('🧪 Testing SMS Sequence');
  console.log('📱 Test phone number:', TEST_PHONE);
  console.log('🌐 Base URL:', BASE_URL);
  console.log('');

  // Create a test lead with the test phone number
  const leadData = {
    lead_id: `test_${Date.now()}`,
    phone: `+1${TEST_PHONE}`, // Format as +14385017336
    attributes: {
      FirstName: 'Lucas',
      FullName: 'Lucas Legatos',
      PropertyName: 'Test Property',
      CalendarLink: 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call',
      Email: 'lucas@test.com',
      Phone: `+1${TEST_PHONE}`,
    },
  };

  console.log('📤 Sending lead.created event...');
  console.log('Lead data:', JSON.stringify(leadData, null, 2));
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}/api/events/lead.created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_PASSWORD}`,
      },
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Lead created event sent successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Runs created: ${result.runs_created || 0}`);
    console.log(`   - Run IDs: ${result.run_ids?.join(', ') || 'None'}`);
    console.log(`   - Jobs created: ${result.jobs_created || 0}`);
    console.log('');
    console.log('⏰ SMS messages will be sent according to the sequence timing.');
    console.log('📱 All messages will be sent to:', TEST_PHONE);
    console.log('');
    console.log('💡 To check sent messages, run: node scripts/check-sent-sms.js');
  } catch (error) {
    console.error('❌ Failed to send lead.created event:', error);
  }
}

testSequence();


