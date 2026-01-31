# Google OAuth2 Setup Guide (Like N8N)

This guide shows you how to set up Google OAuth2 authentication so you can just "Sign in with Google" and everything works automatically - just like N8N!

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Veritas Email" (or whatever you want)
4. Click "Create"

## Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and click **Enable**

## Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (unless you have Google Workspace)
   - App name: "Veritas Email System"
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Click **Add or Remove Scopes**
     - Add: `https://www.googleapis.com/auth/gmail.send`
     - Add: `https://www.googleapis.com/auth/userinfo.email`
   - Click **Save and Continue**
   - Test users: Add your Gmail address
   - Click **Save and Continue**
4. Back to creating OAuth client:
   - Application type: **Web application**
   - Name: "Veritas Email"
   - Authorized redirect URIs:
     - For local: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`
   - Click **Create**
5. **Copy the Client ID and Client Secret** (you'll need these!)

## Step 4: Configure Environment Variables

Add to your `.env.local`:

```bash
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=90502316218-irg6oc09ultlh9huqpu34o33bpd4o87v.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
# Redirect URI (should match what you set in Google Cloud)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback


# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# For production:
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Step 5: Authorize Your Account

1. Start your dev server: `npm run dev`
2. Visit: `http://localhost:3000/api/auth/google`
3. Sign in with your Google account
4. Grant permissions
5. You'll be redirected back with a refresh token
6. **Copy the refresh token from the URL** (or it will be shown on the page)

## Step 6: Add Refresh Token to Environment

Add to your `.env.local`:

```bash
# Gmail OAuth2 Refresh Token (from Step 5)
GMAIL_REFRESH_TOKEN=your-refresh-token-here

# Email provider
EMAIL_PROVIDER=gmail

# From address (will use the email from your Google account)
EMAIL_FROM=your-email@gmail.com
```

## Step 7: Test It!

Run the test script:

```bash
node scripts/test-email-send.js
```

## How It Works

1. **First time**: You visit `/api/auth/google` → Sign in → Get refresh token
2. **Every email send**: System uses refresh token to get a new access token automatically
3. **No passwords needed**: Everything is handled by OAuth2 tokens
4. **Secure**: Tokens are stored securely, no passwords in your code

## Benefits Over App Passwords

✅ **More secure** - No passwords stored  
✅ **Easier setup** - Just sign in once  
✅ **Works with any Google account** - Personal or Workspace  
✅ **Automatic token refresh** - Never expires  
✅ **Just like N8N** - Same user experience  

## Troubleshooting

### "Redirect URI mismatch"
- Make sure the redirect URI in Google Cloud Console matches exactly what's in your `.env.local`
- Include the full path: `/api/auth/google/callback`

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in OAuth consent screen
- Or publish your app (for production use)

### "Invalid grant" error
- Refresh token might have expired or been revoked
- Re-authorize by visiting `/api/auth/google` again

### Token not refreshing
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Check that the refresh token is valid

## Production Setup

For production:
1. Publish your OAuth app in Google Cloud Console (or add all users as test users)
2. Update `GOOGLE_REDIRECT_URI` to your production domain
3. Update `NEXT_PUBLIC_BASE_URL` to your production domain
4. Add all environment variables to Vercel

That's it! Now you can send emails just by signing in with Google - no passwords needed! 🎉

