# Supabase SMS / sequence flow verification

## What was going wrong

1. **Unique index on `message_jobs`**  
   `prevent-duplicate-runs-and-jobs.sql` added `idx_message_jobs_unique_run_node` on `(run_id, node_id)`.  
   The sequence compiler can emit the **same node_id more than once** when the graph has parallel branches that converge (e.g. two paths that both reach the same node).  
   Inserting those jobs in one batch caused a **unique violation**, so the whole insert failed. Result: new leads created runs but **no message jobs** (or the run was created and jobs failed silently).

2. **Trigger `base_url`**  
   The DB trigger that calls `/api/events/lead.created` uses `current_setting('app.settings.base_url', true)` and defaults to `http://localhost:3000`.  
   If that setting is not set in production, the trigger calls localhost (from Supabase’s perspective), so the request never hits your app. That only affects inserts that **don’t** go through the Airtable webhook (e.g. manual insert in Supabase). Leads coming from the **Airtable webhook** use `processLeadCreated` in-app, so they don’t depend on the trigger.

## What was fixed in code

- **`lib/sequences/process-lead-created.ts`**  
  Before inserting into `message_jobs`, jobs are **deduped by `(run_id, node_id)`** (first occurrence kept). That keeps the compiler output valid while satisfying the unique index.

## What you should do in Supabase

1. **Run the verification script**  
   In Supabase SQL Editor, run `sql/verify-supabase-sms-flow.sql`.  
   It checks:
   - Trigger `investor_created_sms_trigger` exists and is enabled
   - `app.settings.base_url` (should be your production URL if you rely on the trigger for non-Airtable inserts)
   - Unique indexes on `sequence_runs` and `message_jobs`
   - `pg_net` extension
   - Active sequences with `lead.created` trigger

2. **Set production base_url (if you use the trigger for non-Airtable inserts)**  
   If the script shows `base_url` as NULL or localhost and you need the trigger to fire when rows are inserted outside the Airtable webhook, run:
   ```sql
   ALTER DATABASE postgres SET app.settings.base_url = 'https://veritas-landing-page.vercel.app';
   ```
   Replace with your real app URL if different.

3. **Confirm API auth**  
   The trigger sends `Authorization: Bearer veritas2024admin`. Your app must accept that (e.g. `ADMIN_PASSWORD` or `WEBHOOK_SECRET` = `veritas2024admin` in production).

## Summary

- **Cause:** The prevent-duplicate script did not break the trigger; it added a unique index that made **message_jobs** inserts fail when the compiler produced duplicate `(run_id, node_id)` (e.g. from parallel branches).
- **Fix:** Dedupe jobs by `(run_id, node_id)` before insert. Optionally set `app.settings.base_url` in Supabase and ensure webhook/API auth matches the trigger.
