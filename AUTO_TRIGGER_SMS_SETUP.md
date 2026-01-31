# Automatic SMS Triggering Setup

This guide explains how to automatically trigger SMS sequences when new investors are created in the database.

## Solution Overview

We've implemented **two methods** to automatically trigger SMS sequences:

1. **API Endpoint** - When investors are created via the API
2. **Database Trigger** - When investors are inserted directly into Supabase

## Method 1: API Endpoint (Already Implemented)

The `/api/admin/investors` endpoint now automatically triggers SMS sequences when creating investors:

```typescript
POST /api/admin/investors?key=veritas2024admin
Content-Type: application/json

{
  "investor_name": "John Doe",
  "phone_number": "+14385017336",
  "email_address": "john@example.com",
  "status": "New Lead",
  "source": "Website"
}
```

**This will:**
- Create the investor in the database
- Automatically trigger SMS sequence if status is "New Lead"
- Return the created investor with SMS trigger status

## Method 2: Database Trigger (For Direct Inserts) ⭐ RECOMMENDED

If investors are created directly in Supabase (via SQL, admin UI, or external tools), you need to set up a database trigger.

**This is the recommended approach** because it automatically triggers **all active sequences** with `trigger.type === 'lead.created'`, regardless of how the investor was created.

### Setup Instructions

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Enable pg_net Extension** (if not already enabled)
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

3. **Run the Trigger SQL**
   - Copy the contents of `supabase-auto-trigger-sms-simple.sql`
   - Paste into SQL Editor
   - Click "Run"

4. **Test the Trigger**
   ```sql
   INSERT INTO investors (investor_name, phone_number, status, source)
   VALUES ('Test Investor', '+14385017336', 'New Lead', 'Test');
   ```

   This should automatically trigger **all active sequences** with `trigger.type === 'lead.created'`!

### How It Works

The database trigger:
- Monitors the `investors` table for new inserts
- Checks if status is "New Lead" and phone number exists
- Calls `/api/events/lead.created` endpoint (not the webhook)
- The endpoint automatically finds **all active sequences** with `trigger.type === 'lead.created'`
- Starts sequence runs for each matching sequence
- Schedules SMS messages according to each sequence's timing

**Key Advantage**: If you have multiple sequences with `trigger.type === 'lead.created'`, they will ALL automatically trigger when a new lead is created!

### Important Notes

- **Production URL**: The trigger uses `https://veritas-landing-page.vercel.app/api/webhooks/investor-created`
- **Local Development**: For local testing, you'll need to update the URL in the trigger function
- **Security**: The trigger includes the webhook secret for authentication

## Verification

After setting up, test by:

1. Creating a new investor with status "New Lead" and phone number `+14385017336`
2. Check the Supabase logs for the trigger execution
3. Verify SMS sequence runs were created:
   ```bash
   node scripts/check-message-jobs.js
   ```
4. Check that messages were sent:
   ```bash
   node scripts/send-due-messages-now.js
   ```

## Troubleshooting

### Trigger Not Firing

1. Check if `pg_net` extension is enabled
2. Verify the trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'investor_created_sms_trigger';
   ```
3. Check Supabase logs for errors

### SMS Not Sending

1. Verify the sequence is active:
   ```bash
   node scripts/deactivate-veritas-sequence.js
   ```
2. Check message jobs were created
3. Verify cron job is running (or manually trigger it)

### Webhook Authentication Errors

- Ensure `WEBHOOK_SECRET` or `ADMIN_PASSWORD` is set correctly
- Check the trigger function includes the correct secret

## Next Steps

Once set up, **all new investors** with status "New Lead" will automatically trigger SMS sequences, regardless of how they're created:
- ✅ Via API endpoint
- ✅ Direct SQL insert
- ✅ Supabase admin UI
- ✅ External tools
- ✅ Airtable webhooks

