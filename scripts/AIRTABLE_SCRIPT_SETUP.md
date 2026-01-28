# Airtable Script Setup Guide

## Option 1: Manual Script (Copy & Paste with Record ID)

Use this script when you want to manually trigger SMS for a specific record.

### Setup Steps:

1. **Open Airtable Scripting:**
   - Go to your base
   - Click "Extensions" → "Scripting"
   - Click "New script"

2. **Copy the script:**
   - Open `scripts/airtable-webhook-script.js`
   - Copy the entire contents

3. **Update configuration:**
   - Change `WEBHOOK_URL` to your actual domain
   - Change `WEBHOOK_SECRET` if you've set a custom one
   - Change `TABLE_NAME` to your actual table name

4. **Run the script:**
   - Click "Run"
   - Enter a Record ID when prompted (e.g., `recXXXXXXXXXXXXXX`)
   - The script will fetch the record and trigger the SMS sequence

## Option 2: Automation Script (Automatic Trigger)

Use this script in an Airtable Automation to automatically trigger SMS when records are created/updated.

### Setup Steps:

1. **Create Automation:**
   - Go to your base → "Automations"
   - Click "Create automation"
   - Name it: "Trigger SMS for New Leads"

2. **Add Trigger:**
   - Click "Add trigger"
   - Select "When record is created" (or "When record is updated")
   - Select your Investors table
   - (Optional) Add condition: `Status` = "New Lead"

3. **Add Script Action:**
   - Click "Add action" → "Run a script"
   - Click "Edit script"

4. **Paste the script:**
   - Open `scripts/airtable-automation-script.js`
   - Copy the entire contents
   - Paste into the script editor

5. **Update configuration:**
   - Change `WEBHOOK_URL` to your actual domain
   - Change `WEBHOOK_SECRET` if you've set a custom one

6. **Test and activate:**
   - Click "Test action" to verify it works
   - Click "Turn on" to activate the automation

## Quick Copy Script (Simplest Version)

If you just want a simple script to paste:

```javascript
// Quick SMS Trigger Script
const WEBHOOK_URL = 'https://veritas-landing-page-24mj493an-lucas-projects-8fdc6422.vercel.app/api/webhooks/investor-created';
const WEBHOOK_SECRET = 'veritas2024admin';

let recordId = input.config({
    title: 'Trigger SMS',
    items: [input.config.text('recordId', { label: 'Record ID' })],
}).recordId;

let record = await base.getTable('Investors').selectRecordAsync(recordId);
let payload = { fields: record.fields };
payload.fields.id = recordId;

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
});

let result = await response.json();
output.text(response.ok ? `✅ ${result.message}` : `❌ ${result.error}`);
```

## Field Mapping

The webhook automatically maps these field names:
- `Investor Name` / `investor_name` / `name`
- `Phone Number` / `phone_number` / `phone`
- `Status` / `status`
- `Email Address` / `email_address` / `email`
- `Property Name` / `property_name` / `deal`

## Troubleshooting

- **"Record not found"**: Check that the Record ID is correct (starts with `rec`)
- **"Unauthorized"**: Verify `WEBHOOK_SECRET` matches your environment variable
- **"SMS skipped"**: Check that Status = "New Lead" (case-insensitive)
- **"Missing phone_number"**: Ensure the Phone Number field is filled

