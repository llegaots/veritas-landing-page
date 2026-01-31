# Localhost vs Vercel: How Sequences Work

## ✅ **It Works on Localhost!**

You can test sequences on localhost. Here's how:

### Localhost Setup

1. **Cron Job**: On localhost, you need to run the dev cron script manually:
   ```bash
   node scripts/dev-cron-poll.js
   ```
   This script polls the cron endpoint every minute (simulating Vercel's cron).

2. **Keep it running**: Leave this script running in a separate terminal while testing.

3. **Your dev server**: Keep `npm run dev` running in another terminal.

### How It Works

**On Localhost:**
- ✅ Sequences can be created and saved
- ✅ Sequences trigger when leads are created
- ✅ Jobs are compiled and scheduled
- ⚠️ **Cron job must be running** (`node scripts/dev-cron-poll.js`) to send messages

**On Vercel:**
- ✅ Everything works automatically
- ✅ Vercel Cron runs every minute automatically
- ✅ No manual setup needed

## 🧪 Testing the Test Sequence

I've created a test sequence for you! Here's how to test it:

### Step 1: Start the Dev Cron (Localhost Only)

```bash
# In a separate terminal
node scripts/dev-cron-poll.js
```

You should see:
```
🔄 Polling cron endpoint every 60 seconds...
✅ Cron job executed successfully
```

### Step 2: Test the Sequence

**Option A: Via Admin Panel**
1. Go to `/admin/investors?key=your-password`
2. Create or update an investor with:
   - Phone: `438-501-7336` (test number)
   - Email: `lucaslegatos123@gmail.com` (test email)
   - Status: `New Lead`
3. The sequence will trigger automatically

**Option B: Via API**
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
      "PropertyName": "Horizontal Parks",
      "investor_id": "123"
    }
  }'
```

### Step 3: Check Results

1. **SMS**: Check your phone (`438-501-7336`)
2. **Email**: Check `lucaslegatos123@gmail.com`
3. **Logs**: Go to `/admin/sequences/jobs?key=your-password`

## 📋 Test Sequence Details

**Sequence ID**: `272ed53d-e35e-4b55-8c1f-a8b81be035f3`

**Flow:**
- Trigger (New Lead Created)
  - ↓
- Send SMS (1 minute delay)
  - Message: "Hi {{FirstName}}! 👋 Welcome to {{PropertyName}}..."
  - ↓
- Send Email (2 minutes after SMS)
  - Subject: "Welcome {{FirstName}}! 🎉"
  - HTML content with welcome message
  - ↓
- End

**Timeline:**
- T+0: Sequence triggered
- T+1 min: SMS sent
- T+3 min: Email sent (1 min SMS + 2 min Email delay)

## 🔍 Troubleshooting

### Messages Not Sending on Localhost

1. **Check if dev cron is running**:
   ```bash
   # Should be running in a separate terminal
   node scripts/dev-cron-poll.js
   ```

2. **Check cron logs**: The dev cron script will show if jobs are being processed

3. **Check sequence status**: Make sure sequence is "active"

4. **Check test mode**: 
   - SMS: Only sends to `438-501-7336` or `438-882-8831`
   - Email: Only sends to addresses in `EMAIL_TEST_ADDRESSES`

### Messages Not Sending on Vercel

1. **Check Vercel Cron**: Go to Vercel Dashboard → Cron Jobs
2. **Check environment variables**: Make sure all env vars are set
3. **Check logs**: Vercel Dashboard → Functions → Logs

## 🚀 Deployment to Vercel

When you're ready to deploy:

1. **Push to GitHub** (if connected to Vercel)
2. **Or deploy manually**:
   ```bash
   vercel --prod
   ```

3. **Set environment variables** in Vercel Dashboard:
   - All the same variables from `.env.local`
   - Make sure `EMAIL_TEST_MODE` and `SMS_TEST_MODE` are set correctly

4. **Vercel Cron will run automatically** - no setup needed!

## Summary

- ✅ **Localhost**: Works, but you need to run `node scripts/dev-cron-poll.js` manually
- ✅ **Vercel**: Works automatically, cron runs every minute
- ✅ **Test Sequence**: Already created and ready to test!
- ✅ **Both SMS and Email**: Fully integrated and working

Happy testing! 🎉

