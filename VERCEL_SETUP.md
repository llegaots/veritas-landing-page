# Vercel Deployment Setup

## Database Configuration

The tracking system supports two database backends:

### Option 1: Local SQLite (Development)
- Works automatically in development
- Data stored in `./data/events.db`
- **Does NOT work on Vercel** (read-only filesystem)

### Option 2: Supabase (Production - Recommended for Vercel)
- PostgreSQL database hosted on Supabase
- Free tier available (500MB database, 2GB bandwidth)
- Persistent data storage
- Built-in dashboard and SQL editor

## Setting Up Supabase for Vercel

1. **Create a Supabase account and project:**
   - Go to https://supabase.com/
   - Sign up and create a new project
   - Wait for the project to be provisioned (takes ~2 minutes)

2. **Create the database schema:**
   - Go to your Supabase project dashboard
   - Navigate to "SQL Editor"
   - Run the SQL from `supabase-schema.sql` file (or copy it from below)
   - This creates the `events` table and indexes

3. **Get your API credentials:**
   - Go to "Settings" → "API"
   - Copy your "Project URL" (this is your `SUPABASE_URL`)
   - Copy your "anon public" key (this is your `SUPABASE_ANON_KEY`)

4. **Add environment variables to Vercel:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add the following:
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_ANON_KEY` - Your Supabase anon/public key

5. **Redeploy your application:**
   - After adding environment variables, redeploy your app
   - The system will automatically use Supabase instead of local SQLite

## Database Schema

Run this SQL in your Supabase SQL Editor:

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

## Current Behavior on Vercel

**Without Supabase configured:**
- The system will attempt to use `/tmp` directory
- ⚠️ **Data will NOT persist** between function invocations
- API endpoints will work but data will be lost
- This is a temporary fallback

**With Supabase configured:**
- Full persistence and reliability
- All tracking data will be saved permanently
- Recommended for production use
- Access your data via Supabase dashboard

## Testing Locally

To test with Supabase locally, add these to your `.env.local`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

The system will automatically detect and use Supabase when these variables are set.

## Viewing Your Data

Once Supabase is set up, you can:
- View events in the Supabase dashboard under "Table Editor" → "events"
- Run SQL queries in the "SQL Editor"
- Set up additional analytics or exports as needed

