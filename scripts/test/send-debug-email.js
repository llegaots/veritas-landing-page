/**
 * Send a test email to debug line break issues
 * Usage: node scripts/test/send-debug-email.js
 */

require('dotenv').config({ path: '.env.local' });

async function sendDebugEmail() {
  // Use the same approach as test-email-send.js
  const nodemailer = require('nodemailer');
  
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || gmailUser;
  
  if (!gmailUser || !gmailPassword) {
    console.error('❌ Gmail credentials not configured!');
    process.exit(1);
  }
  
  // Temporarily disable test mode
  const originalTestMode = process.env.EMAIL_TEST_MODE;
  process.env.EMAIL_TEST_MODE = 'false';
  
  const testHtml = `Hi TEST,

Thanks for requesting more information on Horizon Park, a workforce-housing multifamily opportunity in Edmonds, Seattle. If helpful, the next step is a short 10-minute Zoom to see whether this opportunity aligns with your goals and risk tolerance. There's no obligation, the call is simply to walk through the structure, risks, and determine if it's a good fit.

You can schedule a time here: https://calendly.com/alex-veritasequitypartners/15-minute-intro-call

If now isn't the right time, that's completely fine as well.

Best,
Veritas Equity Partners`;

  console.log('📧 Sending debug email to lucaslegatos123@gmail.com...\n');
  console.log('HTML content (first 200 chars):', testHtml.substring(0, 200));
  console.log('Newline count:', (testHtml.match(/\n/g) || []).length);
  console.log('Has \\r\\n:', /\r\n/.test(testHtml));
  console.log('');

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
      service: 'gmail',
    });
    
    const info = await transporter.sendMail({
      from: emailFrom,
      to: 'lucaslegatos123@gmail.com',
      subject: 'TEST - Debug Email Line Breaks',
      html: testHtml,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 Check your inbox at: lucaslegatos123@gmail.com`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

sendDebugEmail();

