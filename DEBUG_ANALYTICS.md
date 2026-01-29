# Debugging Analytics Dashboard

## The Problem
- ✅ `events` table exists with 93 rows
- ❌ Analytics dashboard shows 0% / empty

## Most Likely Cause: Row Level Security (RLS)

The `events` table has RLS enabled, which might be blocking queries. Let's fix it:

### Quick Fix: Disable RLS (if using service_role key)

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Disable RLS on events table
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
```

### Or Fix the RLS Policy (more secure)

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Allow all operations for service role" ON events;

-- Create new policy that allows service_role to read
CREATE POLICY "Allow service role full access" ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Check Browser Console

1. Open: http://localhost:3000/admin?key=veritas2024admin
2. Press F12 → Console tab
3. Look for errors mentioning:
   - `/api/admin/stats`
   - `Supabase query error`
   - `Row Level Security`
   - `permission denied`

4. Go to Network tab → Find `/api/admin/stats` request → Check Response

## Check Server Logs

Look at your terminal where `npm run dev` is running. You should see:
- `[DB INIT] Environment check:` - confirms Supabase connection
- Any error messages from the API

## Verify Environment Variables

Make sure `.env.local` has:
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅ (not just ANON_KEY)
- `ADMIN_PASSWORD` ✅

The service_role key bypasses RLS, so if RLS is the issue, using service_role should fix it.

