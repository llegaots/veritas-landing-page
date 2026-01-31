# Fix: Vercel Environment Variables for OAuth

## The Problem

The error shows your app is sending:
```
http://localhost:3000/api/auth/google/callback
```

But you're on Vercel, so it should be sending:
```
https://veritas-landing-page.vercel.app/api/auth/google/callback
```

This means your Vercel environment variables aren't set correctly!

## The Fix

### Step 1: Set Environment Variables in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project: **veritas-landing-page**
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables for **Production** (and Preview/Development if needed):

```
NEXT_PUBLIC_BASE_URL=https://veritas-landing-page.vercel.app
GOOGLE_REDIRECT_URI=https://veritas-landing-page.vercel.app/api/auth/google/callback
GOOGLE_CLIENT_ID=90502316218-5rhjtglndd7th3j0q9m9f0oqqueaifq1.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-ixu...
```

**Important:**
- Make sure `NEXT_PUBLIC_BASE_URL` has **no trailing slash**
- Make sure `GOOGLE_REDIRECT_URI` has **no trailing slash**
- Set for **Production** environment (or All environments)

### Step 2: Redeploy After Setting Variables

After setting environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger auto-deploy

**Environment variables only take effect after redeployment!**

### Step 3: Verify in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth Client: `90502316218-5rhjtgln...` (or the one matching your CLIENT_ID)
3. Click **Edit**
4. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://veritas-landing-page.vercel.app/api/auth/google/callback
   ```
5. Click **Save**
6. Wait 2-3 minutes

### Step 4: Test Again

1. Wait for Vercel redeploy to complete
2. Go to: https://veritas-landing-page.vercel.app/admin/email-setup?key=your-password
3. Click "Connect Google Account"
4. It should now work!

## Why This Happened

The code uses this logic:
```typescript
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
  `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;
```

If `NEXT_PUBLIC_BASE_URL` isn't set in Vercel, it defaults to `http://localhost:3000`, which causes the mismatch!

## Quick Checklist

- [ ] `NEXT_PUBLIC_BASE_URL` set in Vercel → `https://veritas-landing-page.vercel.app`
- [ ] `GOOGLE_REDIRECT_URI` set in Vercel → `https://veritas-landing-page.vercel.app/api/auth/google/callback`
- [ ] Variables set for **Production** environment
- [ ] **Redeployed** after setting variables
- [ ] Redirect URI added to Google Cloud Console
- [ ] Waited 2-3 minutes after Google Console save

After all this, it should work! 🎉

