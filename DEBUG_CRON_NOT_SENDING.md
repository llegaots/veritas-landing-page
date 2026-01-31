# Debugging: Cron Job Not Sending Messages

## Issue
Messages are scheduled correctly (with 1-minute delay) but not being sent.

## Possible Causes

### 1. Vercel Cron Not Running
- Check Vercel Dashboard → Your Project → Cron Jobs
- Verify the cron job is enabled and shows execution history
- Look for any errors in the cron execution logs

### 2. Authentication Failure
The cron job requires `VERCEL_CRON_SECRET` to be set in Vercel environment variables.

**To fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `VERCEL_CRON_SECRET` with a random secret value (e.g., generate with `openssl rand -hex 32`)
3. Redeploy the project

### 3. Check Cron Execution Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Find `/api/cron/send-due-messages`
5. Check the execution logs for errors

### 4. Manual Test
Run the manual trigger script to test:
```bash
node scripts/manually-trigger-cron.js
```

But first, you need to set `CRON_SECRET` in your `.env.local` to match what's in Vercel.

## Quick Fix: Temporarily Disable Auth for Testing

If you want to test without auth, you can temporarily modify the cron route to allow requests without auth in production (NOT RECOMMENDED FOR PRODUCTION, only for debugging).

## Check Message Jobs Status

Run this to see pending messages:
```bash
node scripts/check-message-jobs.js
```

This will show:
- Which messages are due
- When they were scheduled
- Why they might not be sending

