# Debug: Email Not Sending

## Quick Checklist

### 1. Check if Email Jobs Were Created

Check your Supabase database:
- Go to Supabase Dashboard → Table Editor → `message_jobs`
- Look for jobs with `job_type = 'email'`
- Check if `scheduled_for` is in the past
- Check if `sent_at` is null (not sent yet)

### 2. Check Terminal Logs

When you add an investor, look for:
- `[Compiler] Processing Email node ...` - Email job being created
- `[Cron] Sending job ... (type: email)` - Email being sent
- Any error messages

### 3. Check Email Configuration

Verify in `.env.local`:
```bash
EMAIL_PROVIDER=gmail
GMAIL_REFRESH_TOKEN=your_token
EMAIL_FROM=your-email@gmail.com
EMAIL_TEST_MODE=true
EMAIL_TEST_ADDRESSES=your-test-email@gmail.com
```

### 4. Check Email Connection

Visit: http://localhost:3000/admin/email-setup
- Should show "✅ Email Account Connected"
- If not, connect your Google account

### 5. Check Sequence Has Email Node

1. Go to: http://localhost:3000/admin/sequences
2. Open your sequence
3. Verify there's an **Email Node** (not just SMS)
4. Click the email node and verify:
   - **Subject** is filled
   - **HTML Content** is filled
   - **Wait Time** is set (e.g., "1 minute")

### 6. Check Investor Has Email Address

The email node requires an email address. Check:
- Did you add an email when creating the investor?
- Is the email in `EMAIL_TEST_ADDRESSES` if test mode is on?

### 7. Manually Trigger Cron

Since cron doesn't run automatically on localhost:

```bash
# Trigger cron manually
curl http://localhost:3000/api/cron/send-due-messages \
  -H "Authorization: Bearer veritas2024admin"
```

Or run the cron simulator:
```bash
node scripts/dev-cron-poll.js
```

## Common Issues

### Issue 1: Email Job Not Created
**Symptom**: No email jobs in `message_jobs` table

**Possible Causes**:
- Email node not in sequence
- Investor doesn't have email address
- Sequence not triggered

**Fix**:
- Check terminal logs when adding investor
- Look for `[Compiler] Processing Email node` messages
- Verify investor has `email_address` field

### Issue 2: Email Job Created But Not Sent
**Symptom**: Email jobs exist but `sent_at` is null

**Possible Causes**:
- Cron job not running
- `scheduled_for` is in the future
- Email connection not working

**Fix**:
- Manually trigger cron (see step 7 above)
- Check `scheduled_for` time vs current time
- Verify email connection at `/admin/email-setup`

### Issue 3: Email Blocked by Test Mode
**Symptom**: Terminal shows "Email blocked: Only test email addresses allowed"

**Fix**:
- Add your test email to `EMAIL_TEST_ADDRESSES` in `.env.local`
- Or set `EMAIL_TEST_MODE=false` (not recommended for testing)

### Issue 4: Email Connection Failed
**Symptom**: Error in terminal about OAuth or email sending

**Fix**:
- Reconnect email at `/admin/email-setup`
- Check `GMAIL_REFRESH_TOKEN` is set
- Verify Google OAuth app is published

## Debug Commands

### Check Email Jobs in Database
```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  job_type,
  email_address,
  email_subject,
  scheduled_for,
  sent_at,
  error
FROM message_jobs
WHERE job_type = 'email'
ORDER BY scheduled_for DESC
LIMIT 10;
```

### Check Sequence Runs
```sql
SELECT 
  id,
  sequence_version_id,
  investor_id,
  status,
  started_at
FROM sequence_runs
ORDER BY started_at DESC
LIMIT 5;
```

## Step-by-Step Debug

1. **Add a test investor** with email address
2. **Check terminal logs** for:
   - `[lead.created]` - Sequence triggered
   - `[Compiler] Processing Email node` - Email job created
3. **Check Supabase** `message_jobs` table for email jobs
4. **Manually trigger cron** (see step 7 above)
5. **Check terminal logs** for:
   - `[Cron] Sending job ... (type: email)` - Email being sent
   - Any error messages
6. **Check email inbox** (and spam folder)

---

**Most Common Issue**: Cron not running on localhost - manually trigger it!


