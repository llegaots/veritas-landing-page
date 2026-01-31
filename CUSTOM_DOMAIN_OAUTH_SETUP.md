# Sending from Custom Domain with OAuth2 (Like N8N)

This guide explains how to send emails from a custom domain (like `lucas@neptaai.com`) using Google OAuth2 - just like N8N!

## How It Works

With Google OAuth2, you can send from **any email address** your Google account has permission to send from, including:
- Your Gmail address
- Custom domain emails (if set up in Google Workspace)
- Emails configured as "Send mail as" in Gmail

## Option 1: Google Workspace (Best for Custom Domains)

If `lucas@neptaai.com` is a Google Workspace email:

1. **Sign in with your Google Workspace account** (lucas@neptaai.com)
2. **Grant OAuth2 permissions**
3. **Set `EMAIL_FROM=lucas@neptaai.com`**
4. **Done!** You can now send from your custom domain

### Setup Steps:

1. Go to `/admin/email-setup`
2. Click "Connect Google Account"
3. Sign in with `lucas@neptaai.com` (your Google Workspace account)
4. After connecting, set the "Send From Email Address" to `lucas@neptaai.com`
5. Add to `.env.local`:
   ```bash
   GMAIL_REFRESH_TOKEN=your-refresh-token
   EMAIL_PROVIDER=gmail
   EMAIL_FROM=lucas@neptaai.com
   ```

## Option 2: Gmail "Send Mail As" (For Personal Gmail)

If you have a personal Gmail account but want to send from `lucas@neptaai.com`:

1. **Set up "Send mail as" in Gmail**:
   - Go to Gmail Settings → Accounts and Import
   - Click "Add another email address" under "Send mail as"
   - Enter `lucas@neptaai.com`
   - Verify the email address (Gmail will send a verification code)
   - Complete the setup

2. **Connect with OAuth2**:
   - Go to `/admin/email-setup`
   - Click "Connect Google Account"
   - Sign in with your Gmail account
   - Set "Send From Email Address" to `lucas@neptaai.com`

3. **Configure**:
   ```bash
   GMAIL_REFRESH_TOKEN=your-refresh-token
   EMAIL_PROVIDER=gmail
   EMAIL_FROM=lucas@neptaai.com
   ```

**Note**: Gmail may add "via gmail.com" to the email headers when using "Send mail as" with a personal account.

## Option 3: Domain Email Hosting (Not Google)

If `lucas@neptaai.com` is hosted elsewhere (not Google):

You have two options:

### A. Use Your Domain's SMTP Server

```bash
EMAIL_PROVIDER=smtp
SMTP_USER=lucas@neptaai.com
SMTP_PASSWORD=your-email-password
SMTP_HOST=mail.neptaai.com  # Or your provider's SMTP server
SMTP_PORT=587
EMAIL_FROM=lucas@neptaai.com
```

### B. Forward to Gmail + Use "Send Mail As"

1. Forward emails from `lucas@neptaai.com` to your Gmail
2. Set up "Send mail as" in Gmail (see Option 2)
3. Use OAuth2 as described above

## Testing

After setup, test with:

```bash
node scripts/test-email-send.js
```

Make sure `EMAIL_FROM` in your `.env.local` is set to `lucas@neptaai.com`.

## Important Notes

✅ **OAuth2 works with any authorized email** - Once you sign in with Google, you can send from any email address your account has permission to use

✅ **Custom domains work automatically** - If your Google account has access to `lucas@neptaai.com`, just set `EMAIL_FROM=lucas@neptaai.com` and it will work

✅ **No additional configuration needed** - Unlike SMTP passwords, OAuth2 handles everything automatically

⚠️ **Domain verification** - For best deliverability, make sure your domain has SPF/DKIM records set up (especially for Google Workspace)

## Troubleshooting

### "Sender address rejected" error
- Make sure the email address is verified in your Google account
- For Google Workspace: Check that the domain is properly configured
- For "Send mail as": Make sure you completed the verification process

### Emails show "via gmail.com"
- This happens with personal Gmail accounts using "Send mail as"
- To avoid this, use Google Workspace or your domain's SMTP server

### Can't send from custom domain
- Verify the email is set up in Google Workspace
- Or set it up as "Send mail as" in Gmail first
- Check that you're signed in with the correct Google account

## Summary

**For `lucas@neptaai.com`:**

1. If it's Google Workspace: Sign in with that account → Set `EMAIL_FROM=lucas@neptaai.com` → Done!
2. If it's personal Gmail: Set up "Send mail as" → Sign in with Gmail → Set `EMAIL_FROM=lucas@neptaai.com` → Done!
3. If it's other hosting: Use SMTP with that provider's settings

The OAuth2 method (Option 1 or 2) is the easiest - just like N8N! 🎉

