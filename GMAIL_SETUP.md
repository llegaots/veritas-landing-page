# Gmail Email Setup Guide

This guide explains how to configure the email system to send emails directly from your Gmail account.

## Option 1: Using Gmail App Password (Recommended)

### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password
1. Still in Security settings, find **2-Step Verification**
2. Click on **App passwords** (you may need to search for it)
3. Select **Mail** as the app and **Other (Custom name)** as the device
4. Enter "Veritas Email System" as the name
5. Click **Generate**
6. **Copy the 16-character password** (you won't see it again!)

### Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Use Gmail/SMTP provider
EMAIL_PROVIDER=gmail

# Gmail credentials
GMAIL_USER=lucaslegatos123@gmail.com
GMAIL_APP_PASSWORD=acfbdwgifqxgdltg

# Or use generic SMTP variables (works the same)
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-16-character-app-password

# Default "From" email address
EMAIL_FROM=lucaslegatos123@gmail.com

# Test mode (set to 'false' in production)
EMAIL_TEST_MODE=true

# Test email addresses (comma-separated)
EMAIL_TEST_ADDRESSES=llegatos@hotmail.com
```

### Step 4: For Vercel Production

Add the same environment variables in Vercel:
1. Go to your project in Vercel
2. Settings → Environment Variables
3. Add all the variables above
4. Redeploy

## Option 2: Using OAuth2 (Advanced)

If you prefer OAuth2 instead of App Passwords, you'll need to:
1. Create a Google Cloud Project
2. Enable Gmail API
3. Create OAuth2 credentials
4. Implement OAuth2 flow

This is more complex but more secure for production use.

## Gmail Sending Limits

⚠️ **Important**: Gmail has sending limits:
- **Free Gmail accounts**: 500 emails per day
- **Google Workspace**: 2,000 emails per day (can be increased)

If you need to send more emails, consider:
- Using Resend (10,000 emails/month free)
- Using SendGrid or other email services
- Upgrading to Google Workspace

## Troubleshooting

### "Invalid login" error
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the App Password is correct (16 characters, no spaces)

### "Connection timeout" error
- Check your firewall/network settings
- Try using port 465 with `SMTP_SECURE=true`
- Verify `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587` (or 465)

### Emails going to spam
- This is common with Gmail SMTP
- Consider using a custom domain with SPF/DKIM records
- Or use a dedicated email service like Resend

## Testing

1. Set `EMAIL_TEST_MODE=true`
2. Add your test email to `EMAIL_TEST_ADDRESSES`
3. Create a test sequence with an email node
4. Trigger the sequence and check your inbox!

