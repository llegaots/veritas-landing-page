# Plain Text Email Flow - Technical Documentation

## Overview
This document explains how plain text emails work in the sequence scheduler system, from sequence definition to email delivery.

## Flow Diagram

```
1. User Creates Email Node
   └─> Sets email_type: 'text'
   └─> Enters text_content: "Hello world"
   └─> html_content: undefined (not set)

2. Sequence Compilation (lib/sequences/compiler.ts)
   └─> Compiler checks: emailType === 'text'
   └─> Sets renderedText = renderContent(emailNode.text_content, context)
   └─> Sets renderedHtml = undefined (NOT set for text emails)
   └─> Creates MessageJob:
       {
         job_type: 'email',
         email_address: 'user@example.com',
         email_subject: 'Subject',
         email_html: undefined,  // ← KEY: undefined for text-only
         email_text: 'Hello world',
         scheduled_for: '2024-01-01T10:00:00Z'
       }

3. Job Storage (Supabase Database)
   └─> Job saved to message_jobs table
   └─> email_html column: NULL or empty string
   └─> email_text column: Contains the plain text content

4. Cron Job Execution (app/api/cron/send-due-messages/route.ts)
   └─> Reads job from database
   └─> Checks: isTextOnly = !job.email_html || job.email_html.trim().length === 0
   └─> If isTextOnly === true:
       └─> Calls sendEmail({
             to: job.email_address,
             subject: job.email_subject,
             text: job.email_text,  // ← Only text, NO html parameter
             // html: NOT PASSED (undefined)
           })

5. Email Provider (lib/email/provider.ts - sendEmail function)
   └─> Receives: { to, subject, text, html: undefined }
   └─> Checks: isTextOnly = !options.html || options.html.trim().length === 0
   └─> If isTextOnly === true:
       └─> Skips ALL HTML processing
       └─> Goes to "else" branch (text-only path)
       └─> Calls MailComposer with:
           {
             from: 'sender@example.com',
             to: 'user@example.com',
             subject: 'Subject',
             html: undefined,  // ← Explicitly undefined
             text: 'Hello world'
           }

6. MailComposer (Nodemailer)
   └─> Sees: html is undefined, text is provided
   └─> Creates multipart/alternative MIME message:
       └─> Content-Type: multipart/alternative
       └─> Part 1: text/plain (the text content)
       └─> Part 2: NOT INCLUDED (no HTML part)

7. Gmail API / SMTP
   └─> Sends message with only text/plain part
   └─> Email client receives plain text email

## Critical Code Points

### 1. Compiler (lib/sequences/compiler.ts:249-259)
```typescript
if (emailType === 'text') {
  renderedText = renderContent(emailNode.text_content, context);
  renderedHtml = undefined; // ← Explicitly undefined
  // ...
  jobs.push({
    email_html: renderedHtml, // undefined for text emails
    email_text: renderedText,
  });
}
```

### 2. Cron Job (app/api/cron/send-due-messages/route.ts:211-233)
```typescript
const isTextOnly = !job.email_html || job.email_html.trim().length === 0;

if (isTextOnly) {
  sendResult = await sendEmail({
    to: job.email_address,
    subject: job.email_subject,
    text: job.email_text!,  // ← Only text
    // html: NOT PASSED
  });
}
```

### 3. Email Provider (lib/email/provider.ts:593-610)
```typescript
const isTextOnly = !options.html || options.html.trim().length === 0;

if (isTextOnly && !hasText) {
  throw new Error('Email must have either HTML or text content');
}

if (!isTextOnly && options.html) {
  // HTML processing path - SKIPPED for text-only
} else {
  // Text-only path - NO HTML processing
  console.log('[SendEmail] Text-only email - skipping HTML processing');
}
```

### 4. MailComposer (lib/email/provider.ts:614-621)
```typescript
const mailOptions = {
  from: fromEmail,
  to: options.to,
  subject: encodeSubject(options.subject),
  html: isTextOnly ? undefined : htmlContent,  // ← undefined for text-only
  text: options.text || undefined,
  replyTo: options.replyTo || undefined,
};
```

## Potential Issues

### Issue 1: Database NULL vs Empty String
- If `email_html` is stored as empty string `""` instead of `NULL`, the check `!job.email_html` might fail
- Fix: Use `!job.email_html || job.email_html.trim().length === 0` (already done)

### Issue 2: HTML Processing Still Running
- If `options.html` is an empty string `""` instead of `undefined`, `isTextOnly` check might fail
- Fix: Check `!options.html || options.html.trim().length === 0` (already done)

### Issue 3: MailComposer Default Behavior
- MailComposer might convert plain text to HTML if only text is provided
- Fix: Explicitly set `html: undefined` (already done)

### Issue 4: Gmail API Wrapping
- Gmail API might wrap plain text in HTML automatically
- Fix: Use MailComposer which creates proper multipart/alternative message

## Debugging Checklist

1. ✅ Check compiler logs: `[Compiler] Email type: text`
2. ✅ Check database: `email_html` should be NULL or empty
3. ✅ Check cron logs: `[Cron] Email job X is text-only`
4. ✅ Check email provider logs: `[SendEmail] Text-only email - skipping HTML processing`
5. ✅ Check MailComposer options: `html: undefined` in logs
6. ✅ Check Gmail "Show original": Should see `Content-Type: text/plain` or `multipart/alternative` with only text part

## Test Command

```bash
# Send test plain text email
curl -X POST http://localhost:3000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "lucaslegatos123@gmail.com",
    "subject": "TEST - Plain Text Email",
    "text": "This is a plain text email test.\n\nThis should be sent as plain text only."
  }'
```

