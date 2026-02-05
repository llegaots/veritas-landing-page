/**
 * Airtable Scripting Action for Automations
 * 
 * Use this in an Airtable Automation as a "Run a script" action
 * This version works automatically when triggered by an automation
 * 
 * Setup:
 * 1. Create an automation in Airtable
 * 2. Add trigger (e.g., "When record is created")
 * 3. Add action: "Run a script"
 * 4. Paste this script
 * 5. Update WEBHOOK_URL and WEBHOOK_SECRET below
 */

// ===== CONFIGURATION =====
const WEBHOOK_URL = 'https://veritas-landing-page-24mj493an-lucas-projects-8fdc6422.vercel.app/api/webhooks/investor-created';
const WEBHOOK_SECRET = 'veritas2024admin';

// ===== SCRIPT =====
// Get the input record from the automation trigger
let inputRecord = input.config();

// The record is passed as inputRecord.recordId or inputRecord.record
let record = inputRecord.recordId 
    ? await base.getTable(inputRecord.tableId).selectRecordAsync(inputRecord.recordId)
    : inputRecord.record;

if (!record) {
    console.error('No record provided');
    return;
}

// Get all field values
let fields = {};
for (let fieldName in record.fields) {
    fields[fieldName] = record.fields[fieldName];
}

// Add record ID
fields.id = record.id;
fields.airtable_id = record.id;

// Prepare payload
let payload = {
    fields: fields
};

console.log(`Triggering SMS for record: ${record.id}`);
console.log(`Status: ${fields['Status'] || fields['status'] || 'Not set'}`);

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
        console.log(`SMS skipped: ${result.message}`);
    } else {
        console.log(`✅ SMS sequence triggered successfully`);
        console.log(`Runs created: ${result.runs_created || 0}`);
    }
} else {
    console.error(`Error: ${result.error || 'Unknown error'}`);
    throw new Error(result.error || 'Webhook failed');
}

