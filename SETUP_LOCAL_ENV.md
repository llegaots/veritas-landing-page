# Quick Fix: Set Up Local Environment Variables

## The Problem
Your investors list works on Vercel but not on localhost because:
- **Vercel**: Has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured
- **Localhost**: Missing these environment variables

## Quick Solution (2 minutes)

### Step 1: Get Your Supabase Credentials from Vercel

**Option A: Copy from Vercel Dashboard (Easiest)**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find these variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY` (also useful)
5. Copy their values

**Option B: Get from Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
   - **anon public** key → `SUPABASE_ANON_KEY`

### Step 2: Create `.env.local` File

Create a file called `.env.local` in your project root:

```bash
# In your project root directory
touch .env.local
```

Then add your credentials:

```env
# Supabase Configuration (REQUIRED for investors list)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Admin Password (optional)
ADMIN_PASSWORD=veritas2024admin
```

**Important**: Replace the placeholder values with your actual credentials!

### Step 3: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test

Open: http://localhost:3000/admin/investors?key=veritas2024admin

You should now see your investors list! 🎉

## Why This Works

- **Before**: Localhost had no database connection → empty list
- **After**: Localhost uses same Supabase database as Vercel → same data!

## Security Note

The `.env.local` file is already in `.gitignore`, so it won't be committed to git. Your credentials stay local and secure.

## Troubleshooting

### Still seeing empty list?

1. **Check environment variables are loaded**:
   ```bash
   # Restart dev server and check terminal output
   # You should see: [DB INIT] Environment check: { hasSupabaseUrl: true, ... }
   ```

2. **Verify Supabase connection**:
   - Go to Supabase Dashboard → Table Editor
   - Check if `investors` table exists and has data

3. **Check browser console**:
   - Open DevTools (F12)
   - Check Network tab for `/api/admin/investors` request
   - Look for error messages

4. **Verify credentials**:
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key (not anon key)
   - The service_role key has admin permissions needed for the investors API



