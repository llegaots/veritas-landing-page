# How to Test Email Sequence by Adding a New Investor

## Quick Test Methods

### Method 1: Add Investor via Admin UI (Easiest)

1. **Go to Investors Page**:
   - Visit: http://localhost:3000/admin/investors?key=veritas2024admin

2. **Add New Investor**:
   - The investor list should be editable
   - You can add a new row or edit an existing one
   - **Important**: Set the **Status** to **"New Lead"** (this triggers the sequence)

3. **Required Fields**:
   - **Name**: Any name (e.g., "Test Investor")
   - **Email**: Your test email (must be in `EMAIL_TEST_ADDRESSES` if test mode is on)
   - **Phone**: Any phone number (e.g., "+15551234567")
   - **Status**: **"New Lead"** ← This is critical!

4. **Save**: The investor will be created and the sequence should trigger automatically

### Method 2: Add Investor via API (For Testing)

Use curl or any HTTP client:

```bash
curl -X POST http://localhost:3000/api/admin/investors?key=veritas2024admin \
  -H "Content-Type: application/json" \
  -d '{
    "investor_name": "Test Investor",
    "email_address": "your-test-email@gmail.com",
    "phone_number": "+15551234567",
    "status": "New Lead",
    "source": "Manual Test"
  }'
```

### Method 3: Use the Lead Created Event API (Direct Trigger)

This directly triggers the sequence:

```bash
curl -X POST http://localhost:3000/api/events/lead.created?key=veritas2024admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer veritas2024admin" \
  -d '{
    "lead_id": "test-123",
    "phone": "+15551234567",
    "email": "your-test-email@gmail.com",
    "attributes": {
      "investor_name": "Test Investor",
      "phone_number": "+15551234567"
    }
  }'
```

## What Happens Next

1. **Investor Created**: New investor is added to the database
2. **Sequence Triggered**: If status is "New Lead", the active sequence triggers
3. **Jobs Scheduled**: Email jobs are created in the `message_jobs` table
4. **Emails Sent**: Cron job sends emails at scheduled times

## Monitor the Process

### 1. Check Terminal Logs
Look for:
- `[lead.created]` - Sequence triggered
- `[Compiler]` - Jobs created
- `[Cron]` - Emails being sent

### 2. Check Database
- **Supabase Dashboard** → `message_jobs` table
- Look for jobs with `scheduled_for` times
- Check `sent_at` to see when emails were sent

### 3. Check Email Logs Page
- Visit: http://localhost:3000/admin/sequences/jobs?key=veritas2024admin
- See all scheduled and sent emails

### 4. Check Your Email
- Check the inbox for the test email address
- Check spam folder if needed

## Important Notes

### Test Mode
If `EMAIL_TEST_MODE=true` in your `.env.local`:
- ✅ Emails **only** go to addresses in `EMAIL_TEST_ADDRESSES`
- ✅ Other emails are blocked
- ✅ This prevents sending to real clients during testing

### Sequence Must Be Active
- ✅ Sequence status must be **"Active"** (not "Draft")
- ✅ Check the toggle switch on the sequences list page

### Status Must Be "New Lead"
- ✅ Investor status must be exactly **"New Lead"**
- ✅ Other statuses won't trigger the sequence

## Troubleshooting

### "Sequence not triggering"
- ✅ Check sequence is **Active** (toggle switch)
- ✅ Check investor status is **"New Lead"**
- ✅ Check sequence trigger is set to **"New Lead Created"**
- ✅ Check terminal logs for errors

### "Emails not sending"
- ✅ Run cron simulator: `node scripts/dev-cron-poll.js`
- ✅ Or manually trigger: `curl http://localhost:3000/api/cron/send-due-messages -H "Authorization: Bearer veritas2024admin"`
- ✅ Check `message_jobs` table for scheduled jobs
- ✅ Check `EMAIL_TEST_MODE` and `EMAIL_TEST_ADDRESSES`

### "Email blocked"
- ✅ Check `EMAIL_TEST_ADDRESSES` includes your test email
- ✅ Or set `EMAIL_TEST_MODE=false` (not recommended for testing)

## Quick Test Script

Save this as `test-add-investor.sh`:

```bash
#!/bin/bash

# Test adding an investor and triggering sequence
curl -X POST http://localhost:3000/api/admin/investors?key=veritas2024admin \
  -H "Content-Type: application/json" \
  -d '{
    "investor_name": "Test Investor '$(date +%s)'",
    "email_address": "your-test-email@gmail.com",
    "phone_number": "+15551234567",
    "status": "New Lead",
    "source": "Manual Test"
  }'

echo ""
echo "✅ Investor created! Check:"
echo "   - Terminal logs for sequence trigger"
echo "   - http://localhost:3000/admin/sequences/jobs?key=veritas2024admin"
echo "   - Your email inbox"
```

Make it executable: `chmod +x test-add-investor.sh`
Run it: `./test-add-investor.sh`

---

**Ready to test?** Use Method 1 (Admin UI) for the easiest way, or Method 3 (Direct API) for quick testing!

