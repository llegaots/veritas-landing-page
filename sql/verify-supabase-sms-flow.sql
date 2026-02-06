-- Verify Supabase SMS / sequence flow
-- Run this in Supabase SQL Editor to confirm trigger, base_url, and constraints.
-- No data is changed unless you uncomment the "Fix" section at the end.

-- 1. Check that the investor → lead.created trigger exists
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  CASE WHEN t.tgenabled = 'O' THEN 'enabled' ELSE 'disabled' END AS trigger_enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'investor_created_sms_trigger'
  AND NOT t.tgisinternal;

-- 2. Check base_url used by the trigger (must be your app URL in production)
-- If this shows NULL or localhost, the trigger will call the wrong host when new investors are inserted outside the Airtable webhook.
SELECT current_setting('app.settings.base_url', true) AS base_url_setting;
-- Expected in production: https://veritas-landing-page.vercel.app (or your real domain)

-- 3. Unique indexes (from prevent-duplicate-runs-and-jobs.sql)
-- These are FINE and prevent duplicate runs/jobs. The app was updated to dedupe jobs before insert.
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('sequence_runs', 'message_jobs')
  AND indexname IN ('idx_sequence_runs_unique_active_lead', 'idx_message_jobs_unique_run_node');

-- 4. pg_net extension (required for trigger to call your API)
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';

-- 5. Quick sanity: do you have any active sequences with lead.created?
SELECT s.id AS sequence_id, sv.id AS version_id, sv.version_number
FROM sequences s
JOIN sequence_versions sv ON sv.id = s.active_version_id
WHERE s.active_version_id IS NOT NULL
  AND (sv.spec_jsonb->'trigger'->>'type') = 'lead.created';

-- ---------- FIX (run only if needed) ----------
-- If base_url_setting above is NULL or localhost and you want the DB trigger to call production when new investors are inserted (e.g. from Supabase UI or another source), run:
-- ALTER DATABASE postgres SET app.settings.base_url = 'https://veritas-landing-page.vercel.app';
-- Then re-run the "Check base_url" query to confirm.
