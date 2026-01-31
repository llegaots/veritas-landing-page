# Custom Domain Email Setup Guide

This guide explains how to send emails from a custom domain like `lucas@neptaai.com`.

## Option 1: Use Your Domain's SMTP Server (Recommended)

If you have email hosting for `neptaai.com` (through your hosting provider, Google Workspace, Microsoft 365, etc.), you can use that SMTP server directly.

### Setup Steps:

1. **Find your domain's SMTP settings** (varies by provider):
   - **Google Workspace**: `smtp.gmail.com` (port 587)
   - **Microsoft 365/Outlook**: `smtp.office365.com` (port 587)
   - **cPanel/Shared Hosting**: Usually `mail.neptaai.com` or `smtp.neptaai.com` (port 587 or 465)
   - **Other providers**: Check your email provider's documentation

2. **Get your email credentials**:
   - Username: `lucas@neptaai.com` (your full email address)
   - Password: Your email account password (or App Password if 2FA is enabled)

3. **Update `.env.local`**:

```bash
# Use SMTP provider
EMAIL_PROVIDER=smtp

# Your custom domain email credentials
SMTP_USER=lucas@neptaai.com
SMTP_PASSWORD=your-email-password

# SMTP server settings (adjust based on your provider)
SMTP_HOST=smtp.gmail.com  # For Google Workspace
# OR
# SMTP_HOST=smtp.office365.com  # For Microsoft 365
# OR
# SMTP_HOST=mail.neptaai.com  # For cPanel/shared hosting

SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for port 587

# From address (your custom domain email)
EMAIL_FROM=lucas@neptaai.com

# Test mode
EMAIL_TEST_MODE=true
EMAIL_TEST_ADDRESSES=your-test-email@example.com
```

## Option 2: Use Gmail "Send Mail As" Feature

If you want to use Gmail's SMTP but send FROM your custom domain:

1. **Set up "Send mail as" in Gmail**:
   - Go to Gmail Settings → Accounts and Import
   - Click "Add another email address" under "Send mail as"
   - Enter `lucas@neptaai.com`
   - Follow the verification steps

2. **Use Gmail SMTP with custom FROM address**:

```bash
EMAIL_PROVIDER=gmail
GMAIL_USER=your-gmail@gmail.com  # Your Gmail account
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=lucas@neptaai.com  # Your custom domain email
```

**Note**: This requires setting up the custom domain in Gmail first, and Gmail will add "via gmail.com" to the email headers.

## Option 3: Use Resend with Domain Verification (Best for Production)

Resend allows you to send from your custom domain after verifying it. This gives you:
- Professional email delivery
- Better deliverability
- No "via" labels
- Higher sending limits

### Setup Steps:

1. **Sign up for Resend**: https://resend.com
2. **Add and verify your domain**:
   - Go to Domains in Resend dashboard
   - Add `neptaai.com`
   - Add the DNS records (SPF, DKIM, DMARC) to your domain
3. **Configure environment variables**:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=lucas@neptaai.com  # Your verified domain email
```

## Testing Your Custom Domain Setup

Run the test script to verify:

```bash
node scripts/test-email-send.js
```

Make sure to update `EMAIL_FROM` in your `.env.local` to `lucas@neptaai.com` before testing.

## Which Option Should You Choose?

- **Option 1 (Domain SMTP)**: Best if you already have email hosting for your domain
- **Option 2 (Gmail Send As)**: Quick setup, but shows "via gmail.com"
- **Option 3 (Resend)**: Best for production, professional setup, but requires domain verification

## Important Notes

⚠️ **SPF/DKIM Records**: For best deliverability (avoiding spam), you should set up SPF and DKIM records for your domain. This is especially important for Option 1 and required for Option 3.

⚠️ **Sending Limits**: Check your email provider's sending limits:
- Gmail: 500/day (free), 2,000/day (Workspace)
- Microsoft 365: 10,000/day
- Resend: 10,000/month (free tier)

