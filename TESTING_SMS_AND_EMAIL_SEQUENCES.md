# Testing SMS and Email Sequences

This guide shows you how to build and test sequences that include both SMS and Email nodes.

## ✅ What's Already Set Up

- **SMS Nodes**: Already working
- **Email Nodes**: Fully integrated
- **Mixed Sequences**: SMS and Email nodes work together seamlessly
- **Timing**: Both respect the same timing logic (delays work correctly)
- **Variable Substitution**: Both support `{{variable}}` syntax

## 🧪 How to Test

### Step 1: Create a Test Sequence

1. Go to `/admin/sequences?key=your-password`
2. Click "Add Node" → "Send SMS"
3. Add your SMS message (e.g., "Hi {{FirstName}}, welcome!")
4. Set timing (e.g., "1 minute" for testing)
5. Click "Add Node" → "Send Email"
6. Add your email:
   - Subject: "Welcome {{FirstName}}!"
   - HTML Content: `<p>Hi {{FirstName}},</p><p>Thanks for joining!</p>`
7. Set timing (e.g., "2 minutes" for testing)
8. Connect the nodes: Trigger → SMS → Email
9. Save the sequence

### Step 2: Test the Sequence

**Option A: Manual Test (Recommended for First Test)**

1. Go to `/admin/investors?key=your-password`
2. Find or create a test investor with:
   - Phone: `438-501-7336` (test number)
   - Email: `lucaslegatos123@gmail.com` (your test email)
   - Name: "Test User"
3. Make sure the investor has `status = 'New Lead'`
4. The sequence should trigger automatically

**Option B: API Test**

```bash
curl -X POST http://localhost:3000/api/events/lead.created \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-password" \
  -d '{
    "lead_id": "test-123",
    "phone": "438-501-7336",
    "email": "lucaslegatos123@gmail.com",
    "attributes": {
      "FirstName": "Test",
      "investor_id": "123"
    }
  }'
```

### Step 3: Verify Timing

The sequence should send:
- **SMS**: Immediately (or after first node's timing)
- **Email**: After the specified delay (e.g., 2 minutes after SMS)

Check the logs:
- `/admin/sequences/jobs?key=your-password` - See all scheduled messages
- Terminal logs - See compiler output showing scheduled times

### Step 4: Check Results

1. **SMS**: Check your phone (`438-501-7336`)
2. **Email**: Check `lucaslegatos123@gmail.com`
3. **Logs**: Check `/admin/sequences/jobs` to see both jobs

## 📋 Example Sequence Structure

```
Trigger (New Lead Created)
  ↓
Send SMS (1 minute delay)
  Message: "Hi {{FirstName}}, welcome to Veritas!"
  ↓
Send Email (2 minutes after SMS)
  Subject: "Welcome {{FirstName}}!"
  HTML: "<p>Hi {{FirstName}},</p><p>Thanks for joining!</p>"
```

**Timeline:**
- T+0: Sequence triggered
- T+1 min: SMS sent
- T+3 min: Email sent (1 min SMS delay + 2 min Email delay)

## 🔍 Troubleshooting

### Email Not Sending

1. **Check Email Connection**: Go to `/admin/email-setup` and verify email is connected
2. **Check Email Address**: Make sure the lead has an email address
3. **Check Logs**: Look for compiler warnings about missing email
4. **Check Test Mode**: Make sure `EMAIL_TEST_MODE` allows your test email

### SMS Not Sending

1. **Check Phone Number**: Must be `438-501-7336` or `438-882-8831` in test mode
2. **Check Twilio**: Verify Twilio credentials are set
3. **Check Logs**: Look for SMS sending errors

### Timing Issues

1. **Check Compiler Logs**: Should show scheduled times for each node
2. **Check Cron Job**: Make sure cron is running (every minute)
3. **Check Database**: Verify `scheduled_for` times in `message_jobs` table

### Both Not Working

1. **Check Sequence Status**: Must be "active"
2. **Check Trigger**: Must match "New Lead Created"
3. **Check Run Status**: Go to `/admin/sequences/jobs` and check run status

## 🎯 Key Points

- ✅ SMS and Email nodes can be mixed in any order
- ✅ Each node respects its own timing delay
- ✅ Timing is cumulative (each node delays after the previous)
- ✅ Variables work in both SMS and Email content
- ✅ Both require the lead to have phone/email respectively
- ✅ Test mode restricts SMS to test numbers and emails to test addresses

## 📝 Environment Variables Needed

```bash
# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-number
SMS_TEST_MODE=true

# Email
EMAIL_PROVIDER=gmail
GMAIL_REFRESH_TOKEN=your-refresh-token
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
EMAIL_FROM=lucas@neptaai.com
EMAIL_TEST_MODE=true
EMAIL_TEST_ADDRESSES=lucaslegatos123@gmail.com
```

That's it! Your sequences can now send both SMS and Email at the correct times! 🎉


