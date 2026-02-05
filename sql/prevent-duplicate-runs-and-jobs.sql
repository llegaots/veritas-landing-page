-- Prevent duplicate SMS: add unique constraints
-- Run this in Supabase SQL Editor
--
-- SAFE: This script ONLY adds indexes. It does NOT delete any data.
-- If the CREATE INDEX fails (e.g. "duplicate key value violates unique constraint"),
-- that means you have existing duplicates. Do NOT run DELETE scripts - manually
-- review and clean duplicates in Supabase Table Editor if needed.
--
-- RECOVERY: If you lost data from a previous run, check Supabase Dashboard:
-- Project Settings > Database > Point-in-time Recovery (paid plans) to restore.

-- 1. Prevent duplicate active runs for same lead + sequence
CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_runs_unique_active_lead
  ON sequence_runs (sequence_version_id, lead_id)
  WHERE status = 'active';

-- 2. Prevent duplicate jobs for same run + node
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_jobs_unique_run_node
  ON message_jobs (run_id, node_id);
