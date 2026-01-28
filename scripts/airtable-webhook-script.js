/**
 * Airtable Script to Trigger SMS Sequence via Webhook
 * 
 * Instructions:
 * 1. In Airtable, go to Extensions → Scripting
 * 2. Create a new script
 * 3. Copy and paste this entire script
 * 4. Update the WEBHOOK_URL and WEBHOOK_SECRET variables below
 * 5. Run the script and enter a recordId when prompted
 * 
 * Or use this in a Scripting action in Automations:
 * - Set input variable: recordId
 * - This script will fetch the record and send it to the webhook
 */

// ===== CONFIGURATION =====
// Update these with your actual values:
const WEBHOOK_URL = 'https://veritas-landing-page-24mj493an-lucas-projects-8fdc6422.vercel.app/api/webhooks/investor-created';
const WEBHOOK_SECRET = 'veritas2024admin';
const TABLE_NAME = 'Investors'; // Change this to your actual table name

// ===== SCRIPT =====
let table = base.getTable(TABLE_NAME);

// Get recordId from input (if running manually, will prompt)
let recordId = input.config({
    title: 'Trigger SMS Sequence',
    description: 'Enter the Record ID to trigger SMS sequence',
    items: [
        input.config.text('recordId', {
            label: 'Record ID',
            description: 'The Airtable Record ID (e.g., recXXXXXXXXXXXXXX)',
        }),
    ],
}).recordId;

// If no input provided, try to get from selected record
if (!recordId) {
    let selectedRecords = await input.recordAsync('Select a record to trigger SMS', table);
    if (selectedRecords) {
        recordId = selectedRecords.id;
    } else {
        output.text('No record selected. Exiting.');
        return;
    }
}

// Fetch the record
let record = await table.selectRecordAsync(recordId);

if (!record) {
    output.text(`Record ${recordId} not found.`);
    return;
}

// Get all field values from the record
let fields = {};
for (let fieldName in record.fields) {
    fields[fieldName] = record.fields[fieldName];
}

// Prepare webhook payload in Airtable format
let payload = {
    fields: fields
};

// Also include the record ID
payload.fields.id = recordId;
payload.fields.airtable_id = recordId;

output.text(`Sending webhook for record: ${recordId}`);
output.text(`Status: ${fields['Status'] || fields['status'] || 'Not set'}`);
output.text(`Phone: ${fields['Phone Number'] || fields['phone_number'] || fields['Phone'] || 'Not set'}`);

// Send webhook
let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
});

let result = await response.json();

if (response.ok) {
    if (result.skipped) {
        output.text(`⚠️ SMS sequence skipped: ${result.message}`);
    } else {
        output.text(`✅ Success! SMS sequence triggered.`);
        output.text(`Runs created: ${result.runs_created || 0}`);
        output.text(`Investor ID: ${result.investor_id}`);
    }
} else {
    output.text(`❌ Error: ${result.error || 'Unknown error'}`);
    if (result.details) {
        output.text(`Details: ${result.details}`);
    }
}

output.text(`\nResponse status: ${response.status}`);

