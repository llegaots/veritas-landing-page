# Email Configuration Summary

## Current Settings

### Test Mode: **ENABLED** (Default)
- Emails will **ONLY** be sent to: `lucaslegatos123@gmail.com`
- All other email addresses will be blocked
- To disable test mode, set `EMAIL_TEST_MODE=false` in Vercel

### Default Test Email
- `lucaslegatos123@gmail.com` (set as default)

### FROM Address
- Default: `alex@veritasequitypartners.com`
- Can be overridden with `EMAIL_FROM` environment variable

## Vercel Environment Variables (Optional)

You can override these defaults in Vercel:

1. **Test Mode:**
   - `EMAIL_TEST_MODE=false` - Disable test mode (send to all addresses)
   - `EMAIL_TEST_MODE=true` - Enable test mode (default, already enabled)

2. **Test Email Addresses:**
   - `EMAIL_TEST_ADDRESSES=lucaslegatos123@gmail.com,other@example.com` - Comma-separated list

3. **FROM Address:**
   - `EMAIL_FROM=alex@veritasequitypartners.com` - Override FROM address (already set as default)

## How It Works

1. **Test Mode ON (Default):**
   - Only emails to `lucaslegatos123@gmail.com` will be sent
   - All other recipients will be blocked with log: `[EMAIL] Skipping email to ...`

2. **Test Mode OFF:**
   - Set `EMAIL_TEST_MODE=false` in Vercel
   - All emails will be sent to any recipient

3. **FROM Address:**
   - Emails will come from `alex@veritasequitypartners.com` by default
   - Can be changed via `EMAIL_FROM` environment variable

## Verify

After deployment, check Vercel logs:
- ✅ Should see: `[Gmail API] Email sent` for emails to `lucaslegatos123@gmail.com`
- ❌ Should see: `[EMAIL] Skipping email` for any other addresses

