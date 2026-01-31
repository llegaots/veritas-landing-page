# Checking Events Table in Supabase

The analytics dashboard shows 0% because it's reading from the `events` table in Supabase. Let's verify:

## Quick Check

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Table Editor** (left sidebar)
4. **Look for `events` table**

## If the table doesn't exist:

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  properties JSONB NOT NULL,
  anonymous_id TEXT NOT NULL,
  name TEXT,
  url TEXT,
  referrer TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
```

## If the table exists but is empty:

The analytics data comes from visitor tracking. Events are created when:
- Someone visits your landing page
- They scroll, click CTAs, book demos, etc.

If you had data before, it might be in a different Supabase project or database.

## Check Browser Console

1. Open your analytics page: http://localhost:3000/admin?key=veritas2024admin
2. Open DevTools (F12)
3. Go to Console tab
4. Look for any errors related to `/api/admin/stats`
5. Go to Network tab
6. Click on the `/api/admin/stats` request
7. Check the Response tab for error messages

## Common Issues

1. **Wrong Supabase project**: Make sure `.env.local` points to the same Supabase project as Vercel
2. **Missing table**: The `events` table needs to exist
3. **No data**: If the table is empty, you need visitor activity to generate analytics



