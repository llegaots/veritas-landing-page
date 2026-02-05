-- Prevent duplicate SMS: add constraints to avoid duplicate runs and jobs
-- Run this in Supabase SQL Editor
--
-- If you have existing duplicates, clean them first:
-- DELETE FROM message_jobs a USING message_jobs b
-- WHERE a.id > b.id AND a.run_id = b.run_id AND a.node_id = b.node_id;

-- 1. Prevent duplicate active runs for same lead + sequence
-- (Catches race conditions if lead.created is called concurrently)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_runs_unique_active_lead
  ON sequence_runs (sequence_version_id, lead_id)
  WHERE status = 'active';

-- 2. Prevent duplicate jobs for same run + node
-- (One job per node per run - safety net)
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_jobs_unique_run_node
  ON message_jobs (run_id, node_id);
