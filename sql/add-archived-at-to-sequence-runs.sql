-- Add archived_at field to sequence_runs to support per-investor archiving
-- Run this in Supabase SQL Editor

ALTER TABLE sequence_runs 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL;

-- Add index for filtering archived runs
CREATE INDEX IF NOT EXISTS idx_sequence_runs_archived_at 
ON sequence_runs(archived_at) 
WHERE archived_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN sequence_runs.archived_at IS 'Timestamp when this sequence run was archived for this investor. NULL means not archived.';

