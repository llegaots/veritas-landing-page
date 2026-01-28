/**
 * Airtable Automation -> Trigger: When record is created
 * Action: Run a script
 *
 * Script input variables:
 *   - recordId (text) -> map from trigger: Record ID
 *
 * Base: Leads page
 * Table: Investors
 * Sends: all fields for the created record
 * 
 * This triggers SMS sequences for investors with Status = "New Lead"
 */

// Production domain (no deployment protection)
const WEBHOOK_URL = "https://veritas-landing-page.vercel.app/api/webhooks/investor-created";
const WEBHOOK_SECRET = "veritas2024admin";
const TABLE_NAME = "Investors";

const { recordId } = input.config();
if (!recordId) throw new Error('Missing script input variable "recordId" (map it from the trigger Record ID).');

const table = base.getTable(TABLE_NAME);
const record = await table.selectRecordAsync(recordId);
if (!record) throw new Error(`Record not found in table "${TABLE_NAME}": ${recordId}`);

const fields = {};
for (const field of table.fields) {
  fields[field.name] = record.getCellValue(field);
}

// Debug: Log all field names to help identify the correct field name
console.log('Available fields:', Object.keys(fields).join(', '));

// Add record ID to fields for webhook processing
fields.id = recordId;
fields.airtable_id = recordId;

// Map common Airtable field name variations to expected webhook field names
// The webhook looks for: phone_number, phone, or "Phone Number"
const phoneFieldVariations = [
  'Phone Number', 'Phone', 'phone_number', 'phone', 
  'Phone #', 'Mobile', 'Mobile Number', 'Cell', 'Cell Phone',
  'Telephone', 'Tel', 'Contact Phone'
];

// Find and map phone number field (case-insensitive search)
// First try exact match for "Phone Number" (most common)
let phoneValue = fields['Phone Number'] || null;

// If not found, search case-insensitively
if (!phoneValue) {
  for (const fieldName of Object.keys(fields)) {
    const lowerFieldName = fieldName.toLowerCase();
    for (const phoneField of phoneFieldVariations) {
      if (lowerFieldName === phoneField.toLowerCase()) {
        const value = fields[fieldName];
        // Check if value exists and is not null/empty
        if (value !== null && value !== undefined && value !== '') {
          phoneValue = value;
          console.log(`Found phone field "${fieldName}" with value: ${phoneValue}`);
          break;
        }
      }
    }
    if (phoneValue) break;
  }
}

// Set phone number in all expected formats (webhook looks for these)
if (phoneValue && phoneValue !== null && phoneValue !== undefined && String(phoneValue).trim() !== '') {
  // Convert to string and trim whitespace
  const phoneStr = String(phoneValue).trim();
  fields.phone_number = phoneStr;
  fields['Phone Number'] = phoneStr;
  fields.phone = phoneStr;
  console.log(`✅ Phone number set: ${phoneStr}`);
} else {
  // Phone number is missing or empty - skip webhook since SMS can't be sent
  const investorName = fields['Investor Name'] || 'Unknown';
  console.log(`⚠️ WARNING: Phone Number field is empty for record: ${investorName} (${recordId})`);
  console.log('Skipping webhook - SMS cannot be sent without a phone number.');
  console.log('This is not an error - records without phone numbers are automatically skipped.');
  
  // Exit script gracefully - don't call webhook if no phone number
  // The webhook would return 400 anyway, so we skip it here
  output.text(`⚠️ Skipped: ${investorName} - Phone Number field is empty. SMS requires a phone number.`);
  return; // Exit script early
}

// Map status field variations (case-insensitive)
// Airtable select fields return objects with {id, name, color}, so extract the name
const statusFieldVariations = ['Status', 'status', 'Lead Status', 'Investor Status', 'Lead Status', 'Stage'];
let statusValue = null;
for (const fieldName of Object.keys(fields)) {
  const lowerFieldName = fieldName.toLowerCase();
  for (const statusField of statusFieldVariations) {
    if (lowerFieldName === statusField.toLowerCase() && fields[fieldName]) {
      const rawValue = fields[fieldName];
      // Handle Airtable select field objects: {id, name, color}
      if (typeof rawValue === 'object' && rawValue !== null && rawValue.name) {
        statusValue = rawValue.name;
      } else if (typeof rawValue === 'string') {
        statusValue = rawValue;
      } else {
        statusValue = String(rawValue);
      }
      break;
    }
  }
  if (statusValue) break;
}

if (statusValue) {
  fields.Status = statusValue;
  fields.status = statusValue;
  console.log(`✅ Found status: ${statusValue}`);
} else {
  console.log('⚠️ Warning: No status field found');
}

// Map name field variations (case-insensitive)
const nameFieldVariations = ['Investor Name', 'Name', 'investor_name', 'name', 'Full Name', 'Contact Name'];
let nameValue = null;
for (const fieldName of Object.keys(fields)) {
  const lowerFieldName = fieldName.toLowerCase();
  for (const nameField of nameFieldVariations) {
    if (lowerFieldName === nameField.toLowerCase() && fields[fieldName]) {
      const rawValue = fields[fieldName];
      // Handle Airtable select field objects or arrays
      if (Array.isArray(rawValue) && rawValue.length > 0) {
        nameValue = rawValue[0].name || rawValue[0];
      } else if (typeof rawValue === 'object' && rawValue !== null && rawValue.name) {
        nameValue = rawValue.name;
      } else {
        nameValue = rawValue;
      }
      break;
    }
  }
  if (nameValue) break;
}

if (nameValue) {
  fields['Investor Name'] = nameValue;
  fields.investor_name = nameValue;
  fields.name = nameValue;
}

// Prepare payload in format expected by investor-created webhook
const payload = {
  fields, // Webhook expects fields object with Airtable field names
};

const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-secret": WEBHOOK_SECRET,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
let result;
try {
  result = JSON.parse(text);
} catch (e) {
  result = { message: text };
}

if (!res.ok) {
  throw new Error(`Webhook failed: HTTP ${res.status}\n${result.error || text.slice(0, 2000)}`);
}

// Check if SMS was skipped (e.g., status not "New Lead")
if (result.skipped) {
  console.log(`⚠️ SMS sequence skipped: ${result.message}`);
} else {
  console.log(`✅ SMS sequence triggered successfully`);
  console.log(`Runs created: ${result.runs_created || 0}`);
  console.log(`Investor ID: ${result.investor_id}`);
}

console.log(`Webhook sent OK: HTTP ${res.status}`);
if (text) console.log(text.slice(0, 2000));

