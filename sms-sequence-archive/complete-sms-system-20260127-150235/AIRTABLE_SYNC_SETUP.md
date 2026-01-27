# Airtable to Investor List Sync Setup

## Overview

This system automatically syncs investor data from Airtable to your Supabase database, which powers the investor list on your landing page and admin dashboard.

## How It Works

1. **Airtable Webhook** → Triggers when records are created/updated/deleted
2. **Sync Endpoint** → `/api/webhooks/airtable-sync` processes the changes
3. **Supabase Update** → Investor list is automatically updated
4. **SMS Trigger** → If status is "New Lead", SMS sequence is triggered

## Setup Instructions

### Step 1: Create Airtable Webhook

1. Go to your Airtable base
2. Navigate to **Automations** (top right)
3. Click **Create a new automation**
4. Name it: "Sync to Supabase"

#### Trigger Setup:
- **Trigger**: "When record is created or updated"
- **Table**: Select your Investors table
- **Conditions**: (Optional) You can filter by specific fields

#### Action Setup:
- **Action**: "Send webhook"
- **Webhook URL**: `https://veritas-landing-page.vercel.app/api/webhooks/airtable-sync`
- **Method**: POST
- **Headers**:
  ```
  Content-Type: application/json
  x-webhook-secret: veritas2024admin
  ```
- **Body**: Select "Send all record data"

### Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
WEBHOOK_SECRET=veritas2024admin
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Test the Webhook

#### Test with cURL:

```bash
curl -X POST "https://veritas-landing-page.vercel.app/api/webhooks/airtable-sync" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: veritas2024admin" \
  -d '{
    "event": "records.create",
    "records": [{
      "id": "recTest123",
      "fields": {
        "Investor Name": "John Doe",
        "Email Address": "john@example.com",
        "Phone Number": "+15551234567",
        "Status": "New Lead",
        "Investor Type": "Accredited",
        "Amount ($)": "50000",
        "Source": "Website"
      }
    }]
  }'
```

### Step 4: Verify Sync

1. Create a test record in Airtable
2. Check Supabase `investors` table - record should appear
3. Check admin dashboard - investor should be visible
4. If status is "New Lead", check message jobs - SMS should be scheduled

## Field Mapping

The system automatically maps Airtable fields to Supabase columns:

| Airtable Field | Supabase Column |
|---------------|----------------|
| Investor Name | investor_name |
| Email Address | email_address |
| Phone Number | phone_number |
| Status | status |
| Investor Type | investor_type |
| Liquid Ready | liquid_ready |
| Ready for Follow Up | ready_for_follow_up |
| Amount ($) | amount_dollars |
| Deal | deal |
| Source | source |
| Investor Notes | investor_notes |
| Created Time | created_time |
| Property Name | property_name |

## Supported Events

- ✅ **records.create** - New investor added → Creates in Supabase + Triggers SMS if "New Lead"
- ✅ **records.update** - Investor updated → Updates in Supabase + Triggers SMS if status changed to "New Lead"
- ✅ **records.delete** - Investor deleted → Removes from Supabase

## Automatic SMS Triggering

When an investor is synced with status **"New Lead"**, the system automatically:
1. Triggers the SMS sequence
2. Creates message jobs
3. Schedules SMS messages

This happens automatically - no manual intervention needed!

## Manual Sync (Alternative)

If you prefer manual syncing instead of webhooks, you can run:

```bash
node scripts/import-airtable-to-supabase.js
```

This will:
- Fetch all records from Airtable
- Sync to Supabase
- Trigger SMS for "New Lead" investors

## Troubleshooting

### Records Not Syncing?

1. **Check Webhook Secret**: Ensure `x-webhook-secret` header matches `WEBHOOK_SECRET` env var
2. **Check Airtable Webhook**: Verify webhook is active and triggering
3. **Check Logs**: Look for errors in server logs
4. **Check Supabase**: Verify table exists and has correct schema

### SMS Not Triggering?

1. **Check Status**: Ensure status is exactly "New Lead" (case-insensitive)
2. **Check Phone**: Ensure phone number is provided
3. **Check Sequence**: Ensure you have an active SMS sequence with trigger "lead.created"

### Field Mapping Issues?

1. **Check Field Names**: Ensure Airtable field names match exactly (case-sensitive)
2. **Update Mapping**: Edit `fieldMappings` in `/api/webhooks/airtable-sync/route.ts`

## Security

- Webhook endpoint requires `x-webhook-secret` header
- Uses Supabase service role key for admin operations
- Public investor API uses anon key (read-only)

## API Endpoints

- **Webhook**: `POST /api/webhooks/airtable-sync` - Receives Airtable updates
- **Public API**: `GET /api/investors` - Fetches investors for landing page
- **Admin API**: `GET /api/admin/investors?key=...` - Fetches investors for admin dashboard

