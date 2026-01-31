# Twilio SMS Setup Guide

## Environment Variables

Add these to your **Vercel Environment Variables** (Settings → Environment Variables):

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
SMS_PROVIDER=twilio
```

## How to Get Twilio Credentials

1. **Sign up/Login to Twilio**: https://www.twilio.com/
2. **Get Account SID and Auth Token**:
   - Go to Twilio Console Dashboard
   - Your **Account SID** is shown on the dashboard
   - Click "Show" next to Auth Token to reveal your **Auth Token**
3. **Get a Phone Number**:
   - Go to Phone Numbers → Manage → Buy a number
   - Purchase a phone number (or use a trial number for testing)
   - Copy the phone number (format: +1234567890)

## Testing Mode

Currently configured for testing with phone number: **4385017336**

- ✅ SMS will only be sent to numbers containing `4385017336`
- ✅ All hours/days in sequences are converted to **minutes** for faster testing
- ❌ All other phone numbers will be blocked

## Remove Testing Restrictions

When ready for production, remove the test phone number check in:
- `lib/sms/provider.ts` (remove the phone number validation)
- `lib/sequences/compiler.ts` (remove the test mode duration conversion)


