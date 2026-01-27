// Test script for SMS Sequences functionality
// Run with: node test-sequences.js

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

async function testSequencesAPI() {
  console.log('🧪 Testing SMS Sequences API\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Password: ${PASSWORD}\n`);

  // Test 1: Create a sequence
  console.log('Test 1: Creating a new sequence...');
  try {
    const createResponse = await fetch(
      `${BASE_URL}/api/sequences?key=${encodeURIComponent(PASSWORD)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Welcome Sequence',
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create sequence: ${error}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Sequence created:', createData.sequence.id);
    const sequenceId = createData.sequence.id;

    // Test 2: Get the sequence
    console.log('\nTest 2: Getting the sequence...');
    const getResponse = await fetch(
      `${BASE_URL}/api/sequences?key=${encodeURIComponent(PASSWORD)}&id=${sequenceId}`
    );

    if (!getResponse.ok) {
      throw new Error('Failed to get sequence');
    }

    const getData = await getResponse.json();
    console.log('✅ Sequence retrieved:', getData.sequence.name);

    // Test 3: Create a version with a spec
    console.log('\nTest 3: Creating a sequence version...');
    const spec = {
      trigger: { type: 'lead.created' },
      variables: {},
      nodes: [
        { id: 'trigger', type: 'trigger' },
        {
          id: 'msg1',
          type: 'send_sms',
          content: 'Welcome {{lead.first_name}}! Thanks for your interest.',
        },
        { id: 'end', type: 'end' },
      ],
      edges: [
        { from: 'trigger', to: 'msg1' },
        { from: 'msg1', to: 'end' },
      ],
      ui: {
        positions: {
          trigger: { x: 100, y: 100 },
          msg1: { x: 100, y: 200 },
          end: { x: 100, y: 300 },
        },
        zoom: 1,
      },
      metadata: {
        name: 'Test Welcome Sequence',
        status: 'draft',
        version: 1,
        createdBy: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const versionResponse = await fetch(
      `${BASE_URL}/api/sequences/${sequenceId}/versions?key=${encodeURIComponent(PASSWORD)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec,
          created_by: 'test',
        }),
      }
    );

    if (!versionResponse.ok) {
      const error = await versionResponse.text();
      throw new Error(`Failed to create version: ${error}`);
    }

    const versionData = await versionResponse.json();
    console.log('✅ Version created:', versionData.version_number);

    // Test 4: Test copilot API (simplified - just check it responds)
    console.log('\nTest 4: Testing copilot API...');
    const copilotResponse = await fetch(
      `${BASE_URL}/api/copilot?key=${encodeURIComponent(PASSWORD)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Create a welcome sequence for new leads',
        }),
      }
    );

    if (!copilotResponse.ok) {
      const error = await copilotResponse.text();
      console.log('⚠️  Copilot API error (might be expected if OpenAI key not set):', error);
    } else {
      console.log('✅ Copilot API responded');
      // Read stream
      const reader = copilotResponse.body.getReader();
      const decoder = new TextDecoder();
      let chunks = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks++;
        const text = decoder.decode(value);
        if (chunks <= 3) {
          console.log('   Chunk:', text.substring(0, 100));
        }
      }
      console.log(`✅ Received ${chunks} chunks from stream`);
    }

    // Test 5: List all sequences
    console.log('\nTest 5: Listing all sequences...');
    const listResponse = await fetch(
      `${BASE_URL}/api/sequences?key=${encodeURIComponent(PASSWORD)}`
    );

    if (!listResponse.ok) {
      throw new Error('Failed to list sequences');
    }

    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.sequences.length} sequences`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testSequencesAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

