# Vercel Deployment Setup

## Database Configuration

The tracking system supports two database backends:

### Option 1: Local SQLite (Development)
- Works automatically in development
- Data stored in `./data/events.db`
- **Does NOT work on Vercel** (read-only filesystem)

### Option 2: Turso (Production - Recommended for Vercel)
- Serverless-compatible SQLite database
- Free tier available
- Persistent data storage

## Setting Up Turso for Vercel

1. **Create a Turso account and database:**
   - Go to https://turso.tech/
   - Sign up and create a new database
   - Create an authentication token

2. **Add environment variables to Vercel:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add the following:
     - `TURSO_DATABASE_URL` - Your Turso database URL (e.g., `libsql://your-db.turso.io`)
     - `TURSO_AUTH_TOKEN` - Your Turso authentication token

3. **Redeploy your application:**
   - After adding environment variables, redeploy your app
   - The system will automatically use Turso instead of local SQLite

## Current Behavior on Vercel

**Without Turso configured:**
- The system will attempt to use `/tmp` directory
- ⚠️ **Data will NOT persist** between function invocations
- API endpoints will work but data will be lost
- This is a temporary fallback

**With Turso configured:**
- Full persistence and reliability
- All tracking data will be saved permanently
- Recommended for production use

## Testing Locally

To test with Turso locally, add these to your `.env.local`:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token-here
```

The system will automatically detect and use Turso when these variables are set.

