# End-to-End Testing Guide

## Test the Full Flow: Airtable → Database → SMS Sequence → Messages Sent

### Step 1: Add a Test Lead in Airtable

1. Go to your Airtable base
2. Add a new record with:
   - **Status:** `New Lead` (exactly this, case-sensitive)
   - **Phone Number:** `+14385017336` (your test number)
   - **Investor Name:** `Test End to End`
   - **Deal/Property:** Any test property name
   - **Email:** (optional)
   - **Source:** (optional)

3. **Save the record**

### Step 2: What Should Happen

1. **Database Trigger Fires** (within seconds)
   - Supabase trigger detects new investor with "New Lead" status
   - Calls `/api/events/lead.created` on your Vercel app

2. **Sequence Starts** (within seconds)
   - API finds active sequences with `trigger.type === 'lead.created'`
   - Creates a sequence run
   - Compiles messages with correct timing delays
   - Inserts message jobs into database

3. **Messages Scheduled** (immediately)
   - First message: scheduled for now
   - Second message: scheduled for now + 1 minute
   - (More messages follow the same pattern)

4. **Cron Job Sends** (within 1 minute)
   - Cron runs every minute
   - Sends all due messages
   - Updates `sent_at` timestamp

### Step 3: Verify It Worked

**Option A: Check Database**
```bash
# Check if sequence run was created
node scripts/check-message-jobs.js

# Or check specific run (get run_id from database)
node scripts/check-message-jobs.js <run_id>
```

**Option B: Check Your Phone**
- You should receive SMS messages at the scheduled times
- First message: immediately (or within 1 minute)
- Second message: 1 minute after first
- And so on...

**Option C: Check Vercel Logs**
1. Go to Vercel Dashboard → Your Project
2. Check `/api/events/lead.created` logs - should show `200` with `runs_created: 1`
3. Check `/api/cron/send-due-messages` logs - should show messages being sent

### Step 4: Troubleshooting

**If messages aren't scheduled:**
- Check `/api/events/lead.created` logs for errors
- Verify the database trigger is calling the correct URL
- Check if sequence is active (has `active_version_id`)

**If messages are scheduled but not sent:**
- Check `/api/cron/send-due-messages` logs
- Verify cron is running (should see `200` every minute)
- Check if SMS provider (Twilio) credentials are set in Vercel env vars

**If timing is wrong:**
- Check the sequence spec in database - verify `timing` property is set on SMS nodes
- Check compiler logs (if enabled)

### Quick Test Script

Run this after adding a lead to see what happened:
```bash
# Check recent message jobs
node scripts/test-cron-sending.js

# Check if any messages were sent in last 5 minutes
node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config({ path: '.env.local' }); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString(); supabase.from('message_jobs').select('*').gte('created_at', fiveMinutesAgo).order('created_at', { ascending: false }).then(({data, error}) => { if (error) { console.error('Error:', error); return; } console.log('Recent jobs:', data.length); data.forEach(job => { console.log(\`- \${job.message_text?.substring(0, 40)}... | Scheduled: \${job.scheduled_for} | Sent: \${job.sent_at || 'Not yet'}\`); }); });"
```

