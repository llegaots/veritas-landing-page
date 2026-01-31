# Quick Email Debug Steps

## Most Likely Issues

### 1. Email Not in Context (Most Common)

The email node requires `context.email` to be set. Check:

**When adding investor via Admin UI:**
- Make sure you fill in the **Email** field
- The email must be in the investor record

**When adding via API:**
- Include `email_address` in the request body

### 2. Cron Not Running (Localhost)

On localhost, cron doesn't run automatically. You must:

```bash
# Option 1: Run cron simulator
node scripts/dev-cron-poll.js

# Option 2: Manually trigger once
curl http://localhost:3000/api/cron/send-due-messages \
  -H "Authorization: Bearer veritas2024admin"
```

### 3. Email Test Mode Blocking

If `EMAIL_TEST_MODE=true`:
- Only emails in `EMAIL_TEST_ADDRESSES` will be sent
- Check your `.env.local`:
  ```bash
  EMAIL_TEST_MODE=true
  EMAIL_TEST_ADDRESSES=your-test-email@gmail.com
  ```

### 4. Email Job Not Created

Check terminal logs when adding investor:
- Look for: `[Compiler] Processing Email node`
- If you see: `Email node ... requires email address, but none provided` → Email not in context

### 5. Email Job Created But Not Sent

Check Supabase `message_jobs` table:
- Find jobs with `job_type = 'email'`
- Check `scheduled_for` - is it in the past?
- Check `sent_at` - is it null? (means not sent yet)

## Quick Test

1. **Add investor with email**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/investors?key=veritas2024admin \
     -H "Content-Type: application/json" \
     -d '{
       "investor_name": "Email Test",
       "email_address": "your-test-email@gmail.com",
       "phone_number": "+15551234567",
       "status": "New Lead"
     }'
   ```

2. **Check terminal logs** for:
   - `[Compiler] Processing Email node` ✅
   - `Email node ... requires email address` ❌ (email missing)

3. **Check Supabase** `message_jobs` table for email jobs

4. **Trigger cron manually**:
   ```bash
   curl http://localhost:3000/api/cron/send-due-messages \
     -H "Authorization: Bearer veritas2024admin"
   ```

5. **Check terminal logs** for:
   - `[Cron] Sending job ... (type: email)` ✅
   - Any error messages ❌

6. **Check your email inbox** (and spam folder)

---

**Most likely**: Email not in context OR cron not running on localhost!

