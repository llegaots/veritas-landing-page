# Testing Email Sequences on Localhost

## Quick Setup Checklist

### 1. Environment Variables (`.env.local`)

Make sure you have these set up:

```bash
# Supabase (Required for sequences)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Email Provider Configuration
EMAIL_PROVIDER=gmail  # or 'resend', 'smtp', 'mock' for testing
EMAIL_FROM=your-email@gmail.com  # or lucas@neptaai.com

# Google OAuth (if using Gmail)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GMAIL_REFRESH_TOKEN=your_refresh_token

# OR Resend (alternative)
# RESEND_API_KEY=your_resend_api_key

# Test Mode (Recommended for localhost)
EMAIL_TEST_MODE=true
EMAIL_TEST_ADDRESSES=your-test-email@gmail.com,another-test@example.com

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin
ADMIN_PASSWORD=veritas2024admin
```

### 2. Start Your Dev Server

```bash
npm run dev
```

### 3. Test Email Connection

Visit: http://localhost:3000/admin/email-setup

- If using Gmail OAuth: Click "Connect Google Account"
- Verify connection status shows "✅ Email Account Connected"

## Testing Email Sequences

### Step 1: Create a Test Sequence

1. Go to: http://localhost:3000/admin/sequences
2. Click "+ New" or select an existing sequence
3. Add nodes:
   - **Trigger** (already there)
   - **Send Email** node (click "Send Email" in the palette)
   - **End** (already there)

### Step 2: Configure Email Node

1. Click on the **Send Email** node
2. Fill in:
   - **Subject**: `Test Email - {{investor_name}}`
   - **HTML Content**: 
     ```html
     <h1>Hello {{investor_name}}!</h1>
     <p>This is a test email from Veritas.</p>
     <p>Your phone: {{phone_number}}</p>
     ```
   - **Wait Time**: `1 minute` (for testing)
3. Click **"Save Changes"**

### Step 3: Connect the Nodes

1. Drag from **Trigger** → **Send Email** node
2. Drag from **Send Email** → **End** node
3. Make sure connections are visible (blue lines)

### Step 4: Save the Sequence

1. Click **"Save"** button (top right)
2. Verify no validation errors appear

### Step 5: Test the Sequence

#### Option A: Manual Trigger (Easiest)

1. Go to: http://localhost:3000/admin/investors
2. Find or create a test investor with:
   - Name
   - Email (must be in `EMAIL_TEST_ADDRESSES` if test mode is on)
   - Phone
   - Status: "New Lead"
3. The sequence should trigger automatically when status is "New Lead"

#### Option B: Use Test Script

Create a test investor via API:

```bash
curl -X POST http://localhost:3000/api/events/lead.created \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer veritas2024admin" \
  -d '{
    "lead_id": "test-123",
    "phone": "+15551234567",
    "email": "your-test-email@gmail.com",
    "attributes": {
      "investor_name": "Test User",
      "phone_number": "+15551234567"
    }
  }'
```

### Step 6: Monitor Email Sending

1. **Check Logs**: Look at your terminal/console for email sending logs
2. **Check Database**: 
   - Go to Supabase Dashboard
   - Check `message_jobs` table for scheduled emails
3. **Check Email**: Check your test email inbox

### Step 7: Simulate Cron Job (Local Testing)

Since Vercel Cron doesn't run locally, simulate it:

```bash
# Run the cron simulation script
node scripts/dev-cron-poll.js
```

Or manually trigger:

```bash
curl http://localhost:3000/api/cron/send-due-messages \
  -H "Authorization: Bearer veritas2024admin"
```

## Testing with Mock Provider (No Real Emails)

For quick testing without sending real emails:

```bash
# In .env.local
EMAIL_PROVIDER=mock
EMAIL_TEST_MODE=true
```

This will:
- ✅ Log emails to console
- ✅ Not send real emails
- ✅ Test sequence logic
- ✅ Verify timing works

## Common Issues

### "Email not sending"
- ✅ Check `EMAIL_TEST_MODE` - emails only go to addresses in `EMAIL_TEST_ADDRESSES`
- ✅ Check email connection status at `/admin/email-setup`
- ✅ Check terminal logs for errors
- ✅ Verify `message_jobs` table has entries

### "Sequence not triggering"
- ✅ Check investor status is "New Lead"
- ✅ Check sequence trigger is set to "New Lead Created"
- ✅ Check sequence is "Active" (not "Draft")
- ✅ Check database trigger is set up (see Supabase)

### "Emails scheduled but not sending"
- ✅ Run cron simulation: `node scripts/dev-cron-poll.js`
- ✅ Or manually trigger: `curl http://localhost:3000/api/cron/send-due-messages`
- ✅ Check `message_jobs.scheduled_for` is in the past

### "Validation errors"
- ✅ Make sure email nodes have subject and HTML content
- ✅ Make sure all nodes are connected (no unreachable nodes)
- ✅ Check sequence is in "Draft" mode if testing

## Quick Test Sequence

Here's a minimal test sequence:

1. **Trigger**: "New Lead Created"
2. **Send Email** (1 min delay):
   - Subject: `Welcome {{investor_name}}!`
   - HTML: `<p>Hello {{investor_name}}, welcome to Veritas!</p>`
3. **End**

Save it, activate it, and trigger with a test investor!

## Next Steps

Once localhost testing works:
1. ✅ Test with real email addresses (add to `EMAIL_TEST_ADDRESSES`)
2. ✅ Test timing delays (1 min, 5 min, etc.)
3. ✅ Test multiple email nodes in sequence
4. ✅ Test variable substitution (`{{investor_name}}`, etc.)
5. ✅ Deploy to Vercel and test there

---

**Ready to test?** Start with the mock provider to verify everything works, then switch to real email sending!


