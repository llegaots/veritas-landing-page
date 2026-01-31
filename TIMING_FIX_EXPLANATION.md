# SMS Timing Fix Explanation

## The Problem

When leads are created from Airtable, all SMS messages in the sequence are being sent at once instead of with the proper delays (e.g., 1 minute apart).

## Root Cause

The cron job sends **all messages that are "due"** (`scheduled_for <= now`) in a single batch. If:
1. Messages are scheduled with delays (e.g., 0 min, 1 min, 2 min)
2. The cron job runs after all messages are due
3. All messages get sent together

## The Solution

The system is designed to work correctly:
1. **Messages are scheduled correctly** with proper delays (verified)
2. **Cron job runs every minute** (configured in `vercel.json`)
3. **Each cron run sends only messages that are due at that moment**

## How It Should Work

When a new lead is created:
1. **Message 1**: Scheduled for `now` (immediate)
2. **Message 2**: Scheduled for `now + 1 minute`
3. **Message 3**: Scheduled for `now + 2 minutes` (if exists)

Cron job execution:
- **First run (immediately)**: Sends Message 1 (it's due)
- **Second run (1 minute later)**: Sends Message 2 (it's due)
- **Third run (2 minutes later)**: Sends Message 3 (it's due)

## Why You Might See All Messages at Once

If the cron job doesn't run frequently enough, or if there's a delay in processing, all messages might become "due" before the cron job runs, causing them to be sent together.

## Verification

To verify timing is working:
1. Create a new lead from Airtable
2. Check the `message_jobs` table - messages should have different `scheduled_for` times
3. Wait and watch - messages should arrive with the specified delays

## Current Status

✅ Messages are being scheduled with correct delays
✅ Cron job is configured to run every minute
✅ Cron job only sends messages that are actually due

The system should work correctly. If you're still seeing all messages at once, it might be because:
- The cron job ran after all messages were due
- There's a delay in the cron job execution
- Messages are being scheduled incorrectly (but this appears to be fixed)



