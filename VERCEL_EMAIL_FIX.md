# Quick Fix: Enable Email Sending on Vercel

## The Problem
Emails are being blocked because `EMAIL_TEST_MODE` defaults to `true` for safety.

## The Fix (2 Steps)

### Step 1: Set Environment Variable in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project: **veritas-landing-page**
3. Go to: **Settings** → **Environment Variables**
4. Add/Update this variable:
   - **Key:** `EMAIL_TEST_MODE`
   - **Value:** `false`
   - **Environment:** Select **Production** (and **Preview** if you want)
5. Click **Save**

### Step 2: Redeploy

After saving the environment variable:
- If your project is connected to Git, push a new commit to trigger auto-deploy
- OR manually redeploy: Go to **Deployments** → Click **⋯** → **Redeploy**

## Verify It's Working

After redeploy, check Vercel logs:
1. Go to **Deployments** → Latest deployment → **Logs**
2. Look for: `[Gmail API] Email sent` or `[Resend] Email sent`
3. You should **NOT** see `[EMAIL] Skipping email` anymore

## Alternative: Add Your Email to Test List

If you want to keep test mode ON but allow your email:

1. Set `EMAIL_TEST_ADDRESSES` to: `lucaslegatos123@gmail.com,your-other-email@example.com`
2. Keep `EMAIL_TEST_MODE` as `true` (or don't set it)

## Other Required Environment Variables

Make sure these are also set in Vercel:
- ✅ `EMAIL_PROVIDER=gmail` (or `resend`)
- ✅ `GMAIL_REFRESH_TOKEN` (if using Gmail)
- ✅ `EMAIL_FROM` (e.g., `lucas@neptaai.com`)

---

**That's it!** After setting `EMAIL_TEST_MODE=false` and redeploying, emails should start sending.

