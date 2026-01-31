# Fix: Emails Not Sending on Vercel

## Problem
Emails are being skipped with the message:
```
[EMAIL] Skipping email to lucaslegatos123@gmail.com - only sending to test emails during testing
```

## Root Cause
The `EMAIL_TEST_MODE` environment variable defaults to `true` (for safety), which blocks all emails except those in the `EMAIL_TEST_ADDRESSES` list.

## Solution

### Option 1: Disable Test Mode (Recommended for Production)
Set this in Vercel Environment Variables:
```
EMAIL_TEST_MODE=false
```

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   - **Key:** `EMAIL_TEST_MODE`
   - **Value:** `false`
   - **Environment:** Production (and Preview if needed)
3. Redeploy your application

### Option 2: Add Your Email to Test Addresses
If you want to keep test mode enabled but allow specific emails:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   - **Key:** `EMAIL_TEST_ADDRESSES`
   - **Value:** `lucaslegatos123@gmail.com,your-other-email@example.com` (comma-separated)
   - **Environment:** Production (and Preview if needed)
3. Keep `EMAIL_TEST_MODE` as `true` (or don't set it, as it defaults to true)

## Verify Email Configuration

Also ensure these are set in Vercel:
- `EMAIL_PROVIDER=gmail` (or `resend` if using Resend)
- `GMAIL_REFRESH_TOKEN` (if using Gmail OAuth2)
- `EMAIL_FROM` (the "from" email address, e.g., `lucas@neptaai.com`)

## After Making Changes

1. **Redeploy** your application (or wait for auto-deploy if connected to Git)
2. **Check Vercel logs** for email sending attempts
3. **Test** by adding a new investor and checking if the email sequence sends

## Debugging

If emails still don't send after setting `EMAIL_TEST_MODE=false`:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for `[EMAIL]` or `[Gmail API]` messages
   - Check for error messages

2. **Verify OAuth Token:**
   - If using Gmail OAuth2, ensure `GMAIL_REFRESH_TOKEN` is valid
   - Check if token has expired (you may need to reconnect)

3. **Check Email Provider:**
   - Verify `EMAIL_PROVIDER` is set correctly
   - For Gmail: ensure `GMAIL_REFRESH_TOKEN` is set
   - For Resend: ensure `RESEND_API_KEY` is set

4. **Check Sequence Status:**
   - Ensure the sequence is set to "active" (not "draft")
   - Check if email nodes have valid content (subject and HTML)

## Quick Test

After setting `EMAIL_TEST_MODE=false`, you can test by:
1. Adding a new investor with status "New Lead"
2. Checking Vercel logs for `[Gmail API] Email sent` or `[Resend] Email sent`
3. Checking your inbox for the email

