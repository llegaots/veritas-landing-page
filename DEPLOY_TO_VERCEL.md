# Deploy to Vercel - Quick Guide

## Step 1: Commit Your Changes

```bash
git add -A
git commit -m "Fix: Only trigger active sequences, add email node support, add sequence toggle"
git push
```

## Step 2: Deploy to Vercel

### Option A: Automatic (if connected to Git)
If your Vercel project is connected to GitHub/GitLab:
- Just push to your main branch
- Vercel will automatically deploy

### Option B: Manual Deploy
```bash
npx vercel --prod
```

## Step 3: Verify Deployment

1. **Check Vercel Dashboard**:
   - Go to https://vercel.com/dashboard
   - Check your project's latest deployment
   - Look for any build errors

2. **Check Environment Variables**:
   - Go to Settings → Environment Variables
   - Verify these are set:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI` (should be `https://veritas-landing-page.vercel.app/api/auth/google/callback`)
     - `NEXT_PUBLIC_BASE_URL` (should be `https://veritas-landing-page.vercel.app`)
     - `GMAIL_REFRESH_TOKEN`
     - `EMAIL_PROVIDER=gmail`
     - `EMAIL_FROM`
     - `EMAIL_TEST_MODE` (set to `false` for production, or `true` with test addresses)
     - `EMAIL_TEST_ADDRESSES` (if test mode is on)

3. **Test the Deployment**:
   - Visit: https://veritas-landing-page.vercel.app/admin/sequences/list?key=veritas2024admin
   - Verify toggle switches work
   - Add a test investor
   - Check Vercel function logs for errors

## Step 4: Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Look for:
   - `[lead.created]` - Sequence triggering
   - `[Compiler] Processing Email node` - Email jobs created
   - `[Cron] Sending job ... (type: email)` - Emails being sent
   - Any error messages

## Step 5: Test Email Sequence on Vercel

1. **Add a test investor** via the admin UI on Vercel
2. **Check Vercel logs** for sequence trigger
3. **Wait for cron** (runs every minute on Vercel)
4. **Check email inbox**

## Important Notes

- **Cron runs automatically on Vercel** (every minute)
- **No need to manually trigger** like on localhost
- **Check Vercel function logs** if emails aren't sending
- **Verify environment variables** are set correctly

## Troubleshooting

### "Build failed"
- Check the build logs in Vercel dashboard
- Fix any TypeScript errors
- Make sure all dependencies are in `package.json`

### "Emails not sending"
- Check Vercel function logs
- Verify `GMAIL_REFRESH_TOKEN` is set
- Verify `EMAIL_PROVIDER=gmail`
- Check if `EMAIL_TEST_MODE` is blocking emails

### "Sequence not triggering"
- Check Vercel function logs for `[lead.created]`
- Verify sequence status is "active" (not "draft")
- Check if sequence trigger matches

---

**Ready to deploy?** Run the git commands above, then check Vercel dashboard!

