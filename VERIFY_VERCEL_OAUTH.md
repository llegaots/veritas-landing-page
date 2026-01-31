# Verify Vercel OAuth Redirect URI

## The Redirect URI You Need

**Exact redirect URI (copy this exactly):**
```
https://veritas-landing-page.vercel.app/api/auth/google/callback
```

## Step-by-Step Fix

### Environment Variables (Set in Vercel)

```
GMAIL_REFRESH_TOKEN=your_refresh_token_here
EMAIL_PROVIDER=gmail
EMAIL_FROM=lucas@neptaai.com
```

### 1. Verify in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select project: **90502316218**
3. Find OAuth Client: `90502316218-5rhjtgln...`
4. Click **Edit** (pencil icon)
5. Scroll to **Authorized redirect URIs**
6. **Delete any existing entries** (to avoid confusion)
7. Click **+ ADD URI**
8. Paste EXACTLY (no spaces, no trailing slash):
   ```
   https://veritas-landing-page.vercel.app/api/auth/google/callback
   ```
9. Click **SAVE**
10. **Wait 2-3 minutes** for Google to propagate changes

### 2. Verify Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Make sure these are set (for Production):

```
NEXT_PUBLIC_BASE_URL=https://veritas-landing-page.vercel.app
GOOGLE_REDIRECT_URI=https://veritas-landing-page.vercel.app/api/auth/google/callback
GOOGLE_CLIENT_ID=90502316218-5rhjtglndd7th3j0q9m9f0oqqueaifq1.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-ixu...
```

### 3. Common Mistakes to Avoid

❌ **WRONG:**
- `https://veritas-landing-page.vercel.app/api/auth/google/callback/` (trailing slash)
- `http://veritas-landing-page.vercel.app/api/auth/google/callback` (http instead of https)
- `https://veritas-landing-page.vercel.app/api/auth/google/callback ` (trailing space)
- `https://veritas-landing-page.vercel.app/api/auth/google/callback` (missing in Google Console)

✅ **CORRECT:**
- `https://veritas-landing-page.vercel.app/api/auth/google/callback` (exact match)

### 4. Test Again

1. Wait 2-3 minutes after saving in Google Cloud Console
2. Go to: https://veritas-landing-page.vercel.app/admin/email-setup?key=your-password
3. Click "Connect Google Account"
4. You should now be able to select your Google account

## If Still Not Working

1. **Check the exact error** - Google will show which redirect URI it received
2. **Copy that exact URI** from the error message
3. **Add it to Google Cloud Console** (even if it looks the same)
4. **Clear browser cache** and try again
5. **Try in incognito mode** to rule out browser issues

## Debug: Check What URI Is Being Sent

The redirect URI is constructed from:
- `GOOGLE_REDIRECT_URI` (if set), OR
- `NEXT_PUBLIC_BASE_URL + /api/auth/google/callback`

Make sure both are set correctly in Vercel!

