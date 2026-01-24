-- Migration script to update existing investors table to match Airtable structure
-- Run this in your Supabase SQL Editor

-- Step 1: Rename existing columns that need to change
ALTER TABLE investors 
  RENAME COLUMN name TO investor_name;

ALTER TABLE investors 
  RENAME COLUMN email TO email_address;

ALTER TABLE investors 
  RENAME COLUMN phone TO phone_number;

ALTER TABLE investors 
  RENAME COLUMN notes TO investor_notes;

-- Step 2: Add new columns that don't exist
ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS investor_type TEXT;

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS liquid_ready TEXT;

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS ready_for_follow_up TEXT;

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS amount_dollars NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS deal TEXT;

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS created_time TIMESTAMP;

-- Step 3: Drop columns that are no longer needed (optional - only if you don't need them)
-- Uncomment these if you want to remove the old tracking columns:
-- ALTER TABLE investors DROP COLUMN IF EXISTS company;
-- ALTER TABLE investors DROP COLUMN IF EXISTS title;
-- ALTER TABLE investors DROP COLUMN IF EXISTS intent_score;
-- ALTER TABLE investors DROP COLUMN IF EXISTS engagement_level;
-- ALTER TABLE investors DROP COLUMN IF EXISTS demo_booked;
-- ALTER TABLE investors DROP COLUMN IF EXISTS page_views;
-- ALTER TABLE investors DROP COLUMN IF EXISTS return_visits;
-- ALTER TABLE investors DROP COLUMN IF EXISTS max_scroll_depth;
-- ALTER TABLE investors DROP COLUMN IF EXISTS cta_clicks;
-- ALTER TABLE investors DROP COLUMN IF EXISTS avg_time_on_page;
-- ALTER TABLE investors DROP COLUMN IF EXISTS quick_exits;
-- ALTER TABLE investors DROP COLUMN IF EXISTS first_visit;
-- ALTER TABLE investors DROP COLUMN IF EXISTS last_visit;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_investors_email;
CREATE INDEX IF NOT EXISTS idx_investors_email ON investors(email_address);

DROP INDEX IF EXISTS idx_investors_name;
-- investor_name index will be created below if needed

CREATE INDEX IF NOT EXISTS idx_investors_source ON investors(source);
CREATE INDEX IF NOT EXISTS idx_investors_ready_for_follow_up ON investors(ready_for_follow_up);
CREATE INDEX IF NOT EXISTS idx_investors_created_time ON investors(created_time);

-- Step 5: Verify the table structure
-- You can run this to see the final structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'investors'
-- ORDER BY ordinal_position;

