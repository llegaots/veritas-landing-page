/**
 * Setup and test SMS sequence for Lucas
 * This script will:
 * 1. Create/activate the Veritas SMS sequence
 * 2. Trigger a test SMS for Lucas
 * 
 * Run with: node scripts/setup-and-test-sms.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

// Import the sequence spec
async function getVeritasSequenceSpec() {
  // We'll need to load it from the page or create it inline
  // For now, let's fetch it from the admin page or create a minimal version
  return {
    name: 'Veritas SMS Sequence',
    trigger: {
      type: 'lead.created',
    },
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
      },
      {
        id: 'sms_1',
        type: 'send_sms',
        content: 'Hi {{FirstName}}, this is Alex with Veritas Equity Partners. You just requested info on the {{PropertyName}} multifamily investment opportunity.',
      },
      {
        id: 'wait_1',
        type: 'wait',
        duration: '2 hours', // Will be converted to 2 minutes in test mode
      },
      {
        id: 'sms_2',
        type: 'send_sms',
        content: 'For context, our strategy focuses on workforce-housing multifamily. Returns are driven by cash flow and operational improvements.',
      },
    ],
    edges: [
      { from: 'trigger', to: 'sms_1' },
      { from: 'sms_1', to: 'wait_1' },
      { from: 'wait_1', to: 'sms_2' },
    ],
    ui: {
      positions: {},
    },
  };
}

async function setupSequence() {
  console.log('🔧 Setting up Veritas SMS sequence...\n');

  try {
    // Check if sequence exists
    const listResponse = await fetch(
      `${BASE_URL}/api/sequences?key=${encodeURIComponent(ADMIN_PASSWORD)}`
    );

    let sequenceId = null;
    if (listResponse.ok) {
      const data = await listResponse.json();
      const sequences = Array.isArray(data) ? data : (data.sequences || []);
      const veritasSeq = sequences.find(s => s.name === 'Veritas SMS Sequence');
      if (veritasSeq) {
        sequenceId = veritasSeq.id;
        console.log(`✅ Found existing sequence: ${sequenceId}`);
      }
    }

    // If no sequence, create it
    if (!sequenceId) {
      console.log('📝 Creating new sequence...');
      const createResponse = await fetch(
        `${BASE_URL}/api/sequences?key=${encodeURIComponent(ADMIN_PASSWORD)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Veritas SMS Sequence',
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create sequence: ${errorText}`);
      }

      const createData = await createResponse.json();
      sequenceId = createData.sequence?.id;
      console.log(`✅ Created sequence: ${sequenceId}`);
    }

    // Get the full Veritas sequence spec (you'll need to load this properly)
    // For now, let's just create a version with a basic spec
    const spec = await getVeritasSequenceSpec();
    
    console.log('📝 Creating sequence version...');
    const versionResponse = await fetch(
      `${BASE_URL}/api/sequences/${sequenceId}/versions?key=${encodeURIComponent(ADMIN_PASSWORD)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: spec,
          created_by: 'test-script',
        }),
      }
    );

    if (!versionResponse.ok) {
      const errorText = await versionResponse.text();
      throw new Error(`Failed to create version: ${errorText}`);
    }

    const versionData = await versionResponse.json();
    console.log(`✅ Created version: ${versionData.version?.id || 'N/A'}`);
    console.log('✅ Sequence is now active!\n');

    return sequenceId;
  } catch (error) {
    console.error('❌ Error setting up sequence:', error.message);
    throw error;
  }
}

async function testSmsSequence() {
  console.log('🧪 Testing SMS sequence for Lucas PAUL Legatos...\n');

  const testData = {
    lead_id: 'test_lucas_' + Date.now(),
    phone: '+14385017336',
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
      console.log('\n💡 Note: Messages are sent by the cron job. Check /api/cron/send-due-messages');
    } else {
      console.log('\n⚠️  No runs created. The sequence may not be active or configured correctly.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    await setupSequence();
    await testSmsSequence();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();



