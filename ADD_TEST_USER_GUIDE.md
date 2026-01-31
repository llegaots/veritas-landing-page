# How to Add Test Users to Google OAuth App

## Quick Fix: Add Client Email as Test User

Your Google OAuth app is in "Testing" mode, which means only approved test users can sign in. Here's how to add your client's email:

## Step-by-Step Instructions

### 1. Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (the one you created for Veritas Email)

### 2. Navigate to OAuth Consent Screen
1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. You should see your app configuration

### 3. Add Test Users
1. Scroll down to the **"Test users"** section
2. Click **"+ ADD USERS"** button
3. Enter the email address: `alex@veritasequitypartners.com`
4. Click **"ADD"**
5. Click **"SAVE"** at the bottom of the page

### 4. Wait a Few Minutes
- Google may take 1-2 minutes to propagate the changes
- The client can now try connecting again

## Alternative: Publish Your App (For Production)

If you want anyone to be able to connect (not just test users), you can publish your app:

### Option A: Publish Without Verification (Limited)
1. Go to **OAuth consent screen**
2. Click **"PUBLISH APP"** button
3. **Warning**: This will show a warning screen to users saying the app isn't verified
4. Users can still click "Advanced" → "Go to [app name] (unsafe)" to proceed
5. **Not recommended for production** - shows security warnings

### Option B: Request Verification (Recommended for Production)
1. Go to **OAuth consent screen**
2. Click **"PUBLISH APP"** → **"REQUEST VERIFICATION"**
3. Fill out the verification form:
   - App information
   - Privacy policy URL (required)
   - Terms of service URL (required)
   - Scopes justification (explain why you need Gmail send access)
4. Submit for Google review (takes 1-2 weeks)
5. Once approved, anyone can use your app without warnings

## Quick Test

After adding the test user:
1. Have your client visit: `https://veritas-landing-page.vercel.app/admin/email-setup`
2. Click "Connect Google Account"
3. They should now be able to sign in with `alex@veritasequitypartners.com`

## Current Scopes Being Requested

Your app is requesting these scopes:
- `https://www.googleapis.com/auth/gmail.send` - To send emails
- `https://www.googleapis.com/auth/userinfo.email` - To get the user's email address

These are considered "sensitive" scopes, which is why Google requires verification for public apps.

## Troubleshooting

**"Still getting access denied"**
- Make sure you clicked "SAVE" after adding the test user
- Wait 2-3 minutes for changes to propagate
- Have the client try again

**"Can't find Test users section"**
- Make sure your app is set to "External" user type (not Internal)
- If it's Internal, only users in your Google Workspace can access it

**"Want to add multiple users"**
- You can add up to 100 test users in Testing mode
- Just click "+ ADD USERS" multiple times

## For Production Use

If you need multiple clients to connect:
1. **Best option**: Request verification (Option B above)
2. **Quick option**: Add each client as a test user (up to 100)
3. **Not recommended**: Publish without verification (shows warnings)

---

**Need help?** The test user approach is the fastest way to get your client connected right now!

