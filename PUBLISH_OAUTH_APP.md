# How to Publish Your Google OAuth App (Remove Test Mode)

## Why It's in Test Mode

Google OAuth apps **always start in "Testing" mode** by default. This is a security feature. You need to explicitly publish your app to make it available to all users.

## Quick Fix: Publish Your App

### Step 1: Go to OAuth Consent Screen
1. Visit: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**

### Step 2: Publish Your App
1. At the top of the page, you'll see **"Publishing status: Testing"**
2. Click the **"PUBLISH APP"** button
3. You'll see a confirmation dialog
4. Click **"CONFIRM"**

### Step 3: Handle the Warning (If It Appears)

If you see a warning about verification:
- **For now**: Click **"Continue"** or **"Publish anyway"**
- Your app will be published but will show a warning screen to users
- Users can still click **"Advanced"** → **"Go to [app name] (unsafe)"** to proceed
- This is fine for internal/client use

### Step 4: Update Vercel Environment Variables

Make sure your Vercel environment variables are set:
- `GOOGLE_CLIENT_ID` - Your Client ID (from the OAuth client page)
- `GOOGLE_CLIENT_SECRET` - Your Client Secret (click "Show" to reveal it)
- `GOOGLE_REDIRECT_URI` - `https://veritas-landing-page.vercel.app/api/auth/google/callback`
- `NEXT_PUBLIC_BASE_URL` - `https://veritas-landing-page.vercel.app`

### Step 5: Test It

1. Visit: `https://veritas-landing-page.vercel.app/admin/email-setup`
2. Click "Connect Google Account"
3. Any Google account should now be able to connect!

## Why You Didn't Have This Before

If you were testing locally:
- **Localhost** might have been working because you were the only user
- **Production** requires the app to be published for external users
- Google treats localhost differently than production domains

## If You Want to Avoid Warning Screens (Optional)

For a fully verified app (no warnings), you need to:

1. **Request Verification**:
   - Go to OAuth consent screen
   - Click "PUBLISH APP" → "REQUEST VERIFICATION"
   - Fill out the form:
     - Privacy Policy URL (required)
     - Terms of Service URL (required)
     - Scopes justification
   - Submit for Google review (takes 1-2 weeks)

2. **Required Documents**:
   - Privacy Policy (can be a simple page on your site)
   - Terms of Service (can be a simple page)
   - Explain why you need Gmail send access

**For most use cases, publishing without verification is fine** - users just see one extra click.

## Current Status

After publishing:
- ✅ Any Google account can connect
- ✅ No need to add test users
- ⚠️ Users may see a warning screen (one extra click)
- ✅ Works immediately (no waiting for verification)

---

**Quick Action**: Just click "PUBLISH APP" in the OAuth consent screen and you're done!

