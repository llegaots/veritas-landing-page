# Test Mode Explanation

## What Happens When You Set `EMAIL_TEST_MODE=false` and `SMS_TEST_MODE=false`

### ✅ **YES - Everything works the same:**
- Same formatting
- Same timing/delays
- Same sequence logic
- Same HTML conversion
- **ONLY difference:** Removes the email/phone number filter

### ✅ **NO - It won't spam people:**

**How it works:**
1. **One message per job**: Each `message_jobs` record = 1 message to 1 recipient
   - Example: If you have 10 leads, you get 10 separate jobs (one per lead)

2. **Scheduled with delays**: Messages are scheduled based on your sequence timing
   - Email 1: Immediate
   - Email 2: After 2 hours (or whatever timing you set)
   - Email 3: After 1 day, etc.

3. **Only sends due messages**: The cron job only sends messages where `scheduled_for <= now`
   - Messages scheduled for tomorrow won't send today
   - Messages with delays wait until their scheduled time

4. **One-time send**: Each job is marked as `sent_at` after sending
   - Once sent, it can NEVER be sent again
   - Prevents duplicate sends

5. **Batch limit of 100**: The cron processes up to 100 jobs per run
   - This is 100 DIFFERENT recipients, not 100 messages to one person
   - If you have 200 due messages, it processes 100 now, 100 on next cron run

6. **Sending window**: Only sends between 9 AM - 7 PM Eastern
   - Messages scheduled outside this window wait until the next window

7. **Auto-pause on "Interested"**: If an investor status becomes "Interested", their sequence pauses
   - No more messages sent to that person

### Example Scenario:

**You have 5 new leads:**
- Lead 1: john@example.com
- Lead 2: jane@example.com  
- Lead 3: bob@example.com
- Lead 4: alice@example.com
- Lead 5: charlie@example.com

**Your sequence has 3 emails:**
- Email 1: Immediate
- Email 2: After 2 hours
- Email 3: After 1 day

**What happens:**
1. **Immediately**: 5 jobs created (Email 1 to all 5 leads) → Sent right away
2. **After 2 hours**: 5 jobs created (Email 2 to all 5 leads) → Sent 2 hours later
3. **After 1 day**: 5 jobs created (Email 3 to all 5 leads) → Sent 1 day later

**Total: 15 messages sent over 1 day (3 per lead, spaced out)**

### Safety Features:

✅ **No duplicate sends**: `sent_at` timestamp prevents re-sending
✅ **Scheduled timing**: Messages wait for their scheduled time
✅ **Sending window**: Only 9 AM - 7 PM Eastern
✅ **Status checks**: Pauses if investor becomes "Interested"
✅ **One recipient per job**: Each job is for one person only

### What the "limit 100" means:

The cron job processes up to 100 jobs per run. This means:
- If you have 50 due messages → All 50 are sent
- If you have 150 due messages → 100 are sent now, 50 wait for next cron run (usually 1 minute later)
- Each job is for a DIFFERENT recipient

**It does NOT mean:**
- ❌ Sending 100 messages to one person
- ❌ Sending all messages at once
- ❌ Ignoring scheduled times

### Summary:

**Setting test mode to false:**
- ✅ Removes email/phone filtering
- ✅ Sends to real leads coming through
- ✅ Respects all timing and delays
- ✅ One message per recipient per job
- ✅ Won't spam (scheduled, one-time, windowed)

**It's safe to turn off test mode!** 🚀

