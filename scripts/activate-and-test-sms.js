/**
 * Activate Veritas sequence and test SMS
 * Run with: node scripts/activate-and-test-sms.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

async function activateSequence() {
  console.log('🔧 Activating Veritas SMS sequence...\n');

  try {
    // Get all sequences
    const listResponse = await fetch(
      `${BASE_URL}/api/sequences?key=${encodeURIComponent(ADMIN_PASSWORD)}`
    );

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch sequences: ${listResponse.statusText}`);
    }

    const data = await listResponse.json();
    const sequences = Array.isArray(data) ? data : (data.sequences || []);
    const veritasSeq = sequences.find(s => s.name === 'Veritas SMS Sequence' || s.name?.includes('Veritas'));

    if (!veritasSeq) {
      console.log('❌ Veritas sequence not found. Please create it first at /admin/sms-veritas');
      return null;
    }

    console.log(`✅ Found sequence: ${veritasSeq.id}`);
    console.log(`   Name: ${veritasSeq.name}`);
    console.log(`   Active Version: ${veritasSeq.active_version_id || 'NONE'}\n`);

    // Get versions for this sequence
    const versionsResponse = await fetch(
      `${BASE_URL}/api/sequences/${veritasSeq.id}/versions?key=${encodeURIComponent(ADMIN_PASSWORD)}`
    );

    if (!versionsResponse.ok) {
      throw new Error(`Failed to fetch versions: ${versionsResponse.statusText}`);
    }

    const versionsData = await versionsResponse.json();
    const versions = Array.isArray(versionsData) ? versionsData : (versionsData.versions || []);

    if (versions.length === 0) {
      console.log('❌ No versions found. Please save the sequence at /admin/sms-veritas');
      return null;
    }

    // Get the latest version
    const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0];
    console.log(`✅ Latest version: ${latestVersion.id} (v${latestVersion.version_number})`);

    // Check if it's already active
    if (veritasSeq.active_version_id === latestVersion.id) {
      console.log('✅ Sequence is already active!\n');
      return veritasSeq.id;
    }

    // Activate the latest version
    console.log('📝 Activating latest version...');
    const updateResponse = await fetch(
      `${BASE_URL}/api/sequences/${veritasSeq.id}?key=${encodeURIComponent(ADMIN_PASSWORD)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_version_id: latestVersion.id,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to activate sequence: ${errorText}`);
    }

    console.log('✅ Sequence activated!\n');
    return veritasSeq.id;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testSmsSequence() {
  console.log('🧪 Testing SMS sequence for Lucas PAUL Legatos...\n');
  console.log(`📱 Phone: +14385017336`);
  console.log(`👤 Name: Lucas PAUL Legatos\n`);

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
    const response = await fetch(`${BASE_URL}/api/events/lead.created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_PASSWORD}`,
      },
      body: JSON.stringify(testData),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { message: responseText };
    }

    console.log(`📥 Response: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(result, null, 2));

    if (result.runs_created > 0) {
      console.log(`\n✅ Success! Created ${result.runs_created} SMS sequence run(s)`);
      console.log(`🆔 Run IDs: ${result.run_ids?.join(', ')}`);
      console.log('\n⏱️  SMS messages will be sent with minutes instead of hours/days (test mode)');
      console.log('📱 Check your phone (+14385017336) for messages!');
      console.log('\n💡 Messages are sent by the cron job. You can manually trigger it:');
      console.log(`   curl ${BASE_URL}/api/cron/send-due-messages`);
    } else {
      console.log('\n⚠️  No runs created. Check if:');
      console.log('   1. Sequence has trigger type "lead.created"');
      console.log('   2. Sequence is active (has active_version_id)');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function main() {
  const sequenceId = await activateSequence();
  if (sequenceId) {
    await testSmsSequence();
  } else {
    console.log('\n⚠️  Please create and save the Veritas sequence first:');
    console.log(`   ${BASE_URL}/admin/sms-veritas?key=${ADMIN_PASSWORD}`);
  }
}

main();


