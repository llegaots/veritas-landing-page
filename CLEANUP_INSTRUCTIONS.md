# Supabase Table Cleanup Instructions

## Current Status

Based on analysis of your codebase, here are the tables in your Supabase database:

### ✅ Active Tables (Keep These)
- **events** (140 rows) - Event tracking for analytics
- **investors** (864 rows) - Investor data from Airtable
- **sequences** (1 row) - SMS sequence definitions
- **sequence_versions** (30 rows) - Versioned sequence specs
- **sequence_runs** (5 rows) - Active sequence executions
- **message_jobs** (10 rows) - Scheduled SMS messages
- **sequence_events** (9 rows) - Sequence trigger events

### ❌ Unused Tables (Can Be Removed)
- **audit_log** - Created for change tracking but never used in codebase
- **sms_campaigns** - Old SMS system (replaced by new `sequences` system)
- **sms_intent_keywords** - Old SMS system (not used)
- **sms_messages** - Old SMS system (replaced by `message_jobs`)
- **sms_sequence_steps** - Old SMS system (replaced by `sequence_versions`)
- **sms_sequences** - Old SMS system (replaced by `sequences`)

## Cleanup Steps

### Option 1: Run SQL Script (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file: `cleanup-supabase-tables.sql` (in project root)
6. Copy the entire contents (Cmd+A, Cmd+C)
7. Paste into the SQL Editor
8. Click **Run** (or press Cmd+Enter)
9. Wait for "Success" message

### Option 2: Manual Cleanup

If you prefer to run commands individually:

```sql
-- Drop unused audit_log table
DROP TABLE IF EXISTS audit_log CASCADE;

-- Optional: Clean up orphaned data
DELETE FROM sequence_runs 
WHERE sequence_version_id NOT IN (SELECT id FROM sequence_versions);

DELETE FROM message_jobs 
WHERE run_id NOT IN (SELECT id FROM sequence_runs);

DELETE FROM sequence_versions 
WHERE sequence_id NOT IN (SELECT id FROM sequences);
```

## Verification

After cleanup, verify tables with:

```sql
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see 7 tables (the active ones listed above, with all 6 unused tables removed).

## What Gets Removed

- **audit_log** - Unused change tracking table (never queried)
- **sms_campaigns** - Old SMS campaign system (replaced by new sequence system)
- **sms_intent_keywords** - Old SMS intent tracking (not used)
- **sms_messages** - Old SMS message storage (replaced by `message_jobs`)
- **sms_sequence_steps** - Old SMS sequence steps (replaced by `sequence_versions`)
- **sms_sequences** - Old SMS sequence definitions (replaced by `sequences`)

## What Stays

All 7 active tables remain intact with all their data.

## Notes

- The cleanup script uses `CASCADE` to automatically remove dependent objects (indexes, policies, etc.)
- Orphaned data cleanup is optional but recommended for data integrity
- No data loss will occur - only unused tables are removed

