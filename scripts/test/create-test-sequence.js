/**
 * Create a test sequence with both SMS and Email nodes
 * Run with: node scripts/create-test-sequence.js
 */

require('dotenv').config({ path: '.env.local' });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function createTestSequence() {
  console.log('🧪 Creating test sequence with SMS and Email nodes...\n');

  try {
    // Step 1: Create the sequence
    console.log('1. Creating sequence...');
    const createResponse = await fetch(`${BASE_URL}/api/sequences?key=${encodeURIComponent(ADMIN_PASSWORD)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test SMS + Email Sequence',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create sequence: ${errorText}`);
    }

    const { sequence } = await createResponse.json();
    console.log(`✅ Sequence created: ${sequence.id}\n`);

    // Step 2: Create the spec with SMS and Email nodes
    console.log('2. Creating sequence spec with SMS and Email nodes...');
    
    const now = new Date().toISOString();
    const spec = {
      trigger: {
        type: 'lead.created',
        filters: {},
      },
      variables: {
        FirstName: '{{FirstName}}',
        PropertyName: '{{PropertyName}}',
      },
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
        },
        {
          id: 'send_sms_1',
          type: 'send_sms',
          content: 'Hi {{FirstName}}! 👋 Welcome to {{PropertyName}}. This is your first SMS from our automated sequence!',
          timing: '1 minute',
        },
        {
          id: 'send_email_1',
          type: 'send_email',
          subject: 'Welcome {{FirstName}}! 🎉',
          html_content: `
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <h2 style="color: #7c3aed; margin-top: 0;">Welcome {{FirstName}}! 🎉</h2>
                  <p>Thanks for your interest in <strong>{{PropertyName}}</strong>!</p>
                  <p>This is your first email from our automated sequence. You should have also received an SMS message.</p>
                  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="color: #666; font-size: 12px;">
                    This is a test sequence that sends both SMS and Email messages.
                  </p>
                </div>
              </body>
            </html>
          `,
          text_content: 'Welcome {{FirstName}}! Thanks for your interest in {{PropertyName}}! This is your first email from our automated sequence.',
          timing: '2 minutes',
        },
        {
          id: 'end',
          type: 'end',
        },
      ],
      edges: [
        {
          from: 'trigger',
          to: 'send_sms_1',
        },
        {
          from: 'send_sms_1',
          to: 'send_email_1',
        },
        {
          from: 'send_email_1',
          to: 'end',
        },
      ],
      ui: {
        positions: {
          trigger: { x: 100, y: 200 },
          send_sms_1: { x: 400, y: 200 },
          send_email_1: { x: 700, y: 200 },
          end: { x: 1000, y: 200 },
        },
        zoom: 1,
      },
      metadata: {
        name: 'Test SMS + Email Sequence',
        status: 'active',
        version: 1,
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
      },
    };

    // Step 3: Create version with the spec
    const versionResponse = await fetch(
      `${BASE_URL}/api/sequences/${sequence.id}/versions?key=${encodeURIComponent(ADMIN_PASSWORD)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: spec,
          created_by: 'system',
        }),
      }
    );

    if (!versionResponse.ok) {
      const errorText = await versionResponse.text();
      throw new Error(`Failed to create version: ${errorText}`);
    }

    const versionData = await versionResponse.json();
    console.log(`✅ Version created: ${versionData.id}`);
    console.log(`   Version number: ${versionData.version_number}\n`);

    console.log('🎉 Test sequence created successfully!\n');
    console.log('Sequence Details:');
    console.log(`  ID: ${sequence.id}`);
    console.log(`  Name: ${spec.metadata.name}`);
    console.log(`  Status: ${spec.metadata.status}`);
    console.log(`  Nodes: ${spec.nodes.length} (Trigger, SMS, Email, End)`);
    console.log(`  Edges: ${spec.edges.length}\n`);

    console.log('Sequence Flow:');
    console.log('  Trigger (New Lead Created)');
    console.log('    ↓');
    console.log('  Send SMS (1 minute delay)');
    console.log('    ↓');
    console.log('  Send Email (2 minutes after SMS)');
    console.log('    ↓');
    console.log('  End\n');

    console.log('📋 Next Steps:');
    console.log(`1. View sequence: ${BASE_URL}/admin/sequences?key=${encodeURIComponent(ADMIN_PASSWORD)}&id=${sequence.id}`);
    console.log(`2. Test it by creating a lead with:`);
    console.log(`   - Phone: 438-501-7336 (test number)`);
    console.log(`   - Email: lucaslegatos123@gmail.com (test email)`);
    console.log(`   - Status: "New Lead"`);
    console.log(`3. Check logs: ${BASE_URL}/admin/sequences/jobs?key=${encodeURIComponent(ADMIN_PASSWORD)}\n`);

    return { sequence, version: versionData };
  } catch (error) {
    console.error('❌ Error creating test sequence:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createTestSequence();


