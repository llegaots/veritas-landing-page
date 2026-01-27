# Setup Instructions for SMS Sequences

## ⚠️ REQUIRED: Create Database Tables

The SMS sequence feature requires database tables in Supabase. Follow these steps:

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project

### Step 2: Open SQL Editor
1. Click "SQL Editor" in the left sidebar
2. Click "New Query"

### Step 3: Run the Schema
1. Open the file `supabase-sequences-schema.sql` in this project
2. Copy **ALL** the contents (Cmd+A, Cmd+C)
3. Paste into the Supabase SQL Editor
4. Click "Run" button (or press Cmd+Enter / Ctrl+Enter)
5. Wait for "Success" message

### Step 4: Verify Tables Created
In Supabase, go to "Table Editor" and verify these tables exist:
- ✅ `sequences`
- ✅ `sequence_versions`
- ✅ `sequence_runs`
- ✅ `message_jobs`
- ✅ `events`
- ✅ `audit_log`

### Step 5: Refresh Your App
1. Refresh your browser page
2. Try saving a sequence again

## Environment Variables Required

Make sure your `.env.local` has:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional but recommended)
```

## Troubleshooting

**Error: "Could not find the table 'public.sequences'"**
- The tables don't exist yet → Run the SQL schema (see Step 3 above)
- Tables exist but error persists → Check your Supabase URL and keys are correct
- Still not working → Check Supabase logs for SQL errors

**Error: "Supabase client not initialized"**
- Missing `SUPABASE_URL` or `SUPABASE_ANON_KEY` in `.env.local`
- Restart your dev server after adding env vars

