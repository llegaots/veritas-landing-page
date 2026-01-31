# Fix: redirect_uri_mismatch Error

## The Problem

You're getting `Error 400: redirect_uri_mismatch` when trying to connect your Google account. This means the redirect URI in your OAuth request doesn't match what's configured in Google Cloud Console.

## Quick Fix

### Step 1: Check What Redirect URI Your App Is Using

**If testing on localhost:**
- Redirect URI should be: `http://localhost:3000/api/auth/google/callback`

**If testing on Vercel:**
- Redirect URI should be: `https://veritas-landing-page.vercel.app/api/auth/google/callback`

### Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (ID: 90502316218)
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID: `90502316218-5rhjtgln...`
5. Click **Edit** (pencil icon)
6. Under **Authorized redirect URIs**, add BOTH:
   - `http://localhost:3000/api/auth/google/callback` (for localhost)
   - `https://veritas-landing-page.vercel.app/api/auth/google/callback` (for Vercel)
7. Click **Save**

### Step 3: Verify Environment Variables

**For localhost (.env.local):**
```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**For Vercel (Environment Variables):**
```bash
NEXT_PUBLIC_BASE_URL=https://veritas-landing-page.vercel.app
GOOGLE_REDIRECT_URI=https://veritas-landing-page.vercel.app/api/auth/google/callback
```

### Step 4: Important Notes

⚠️ **Exact Match Required:**
- Must match EXACTLY (including `http://` vs `https://`)
- No trailing slashes
- Case-sensitive
- Must include the full path: `/api/auth/google/callback`

⚠️ **Common Mistakes:**
- ❌ `http://localhost:3000/api/auth/google/callback/` (trailing slash)
- ❌ `https://localhost:3000/api/auth/google/callback` (wrong protocol)
- ❌ `http://localhost:3000/api/auth/google/callback` (missing in Google Console)
- ✅ `http://localhost:3000/api/auth/google/callback` (correct)

## After Fixing

1. **Restart your dev server** (if on localhost)
2. **Redeploy to Vercel** (if on Vercel)
3. **Try connecting again** at `/admin/email-setup`

## Still Not Working?

1. **Check the exact error** - Google will show which redirect URI it received
2. **Copy that exact URI** and add it to Google Cloud Console
3. **Wait 1-2 minutes** after saving (Google needs time to propagate)
4. **Try again**

The redirect URI must match EXACTLY what Google expects!

