# Duplicate Runs Issue - Root Cause & Fix

## What Happened

### Timeline:
1. **Day 1-2**: System working correctly
2. **Day 3+**: Jobs started getting skipped, then spam emails sent

### Root Cause Chain:

1. **Automatic Pausing Logic** (now removed):
   - When investor status changed to "Interested" → runs paused
   - When someone replied to SMS → runs paused  
   - When someone booked Calendly → runs paused
   - **Note**: STOP requests still pause runs (this is correct behavior)

2. **The Bug**:
   - Runs were being auto-paused (correctly)
   - Cron job was skipping paused runs (correctly)
   - **BUT**: The duplicate check in `lead.created` only looked for `status = 'active'`
   - If a run was paused, the check didn't find it
   - A new run could be created for the same lead_id
   - Result: **Duplicate runs** → both try to send → **spam**

3. **Why It Seemed to "Stop Working"**:
   - Runs were paused (so jobs were skipped)
   - But new duplicate runs were being created
   - Eventually both runs tried to send → spam

## Fixes Applied

### 1. Removed Automatic Pausing (except STOP)
- ✅ Removed auto-pause on "Interested" status
- ✅ Removed auto-pause on SMS replies
- ✅ Removed auto-pause on Calendly bookings
- ✅ **Kept** auto-pause on STOP requests (correct behavior)

### 2. Fixed Duplicate Prevention
- ✅ Updated `lead.created` to check for **ANY** run (active, paused, or pending)
- ✅ Prevents new runs if any run exists for the same lead + sequence

### 3. Database-Level Filtering
- ✅ Cron query filters paused runs at database level: `.eq('sequence_runs.status', 'active')`
- ✅ Prevents paused runs from being processed

### 4. Database Constraints (should be applied)
- ✅ Unique index on `(sequence_version_id, lead_id)` WHERE `status = 'active'`
- ✅ Unique index on `(run_id, node_id)` for message_jobs
- ⚠️ **TODO**: Verify these indexes exist in production

## Safeguards to Prevent Recurrence

### 1. Monitoring
- Log when duplicate runs are detected
- Alert if multiple active runs exist for same lead + sequence

### 2. Database Constraints
- Unique index prevents duplicate active runs at DB level
- Unique index prevents duplicate jobs at DB level

### 3. Code-Level Checks
- Check for ANY existing run (not just active) before creating new one
- Filter paused runs at query level in cron job

## How to Verify Fix

1. Check for duplicate runs:
   ```bash
   node scripts/check-duplicate-runs.js
   ```

2. Check for duplicate emails:
   ```bash
   node scripts/check-sam-emails.js
   ```

3. Verify database indexes:
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'sequence_runs' 
   AND indexname IN ('idx_sequence_runs_unique_active_lead', 'idx_message_jobs_unique_run_node');
   ```

## Prevention Checklist

- [x] Removed automatic pausing (except STOP)
- [x] Fixed duplicate check to look for ANY run
- [x] Added database-level filtering for paused runs
- [ ] Verify unique indexes exist in production
- [ ] Add monitoring/alerting for duplicate runs
- [ ] Add logging when duplicate prevention triggers

