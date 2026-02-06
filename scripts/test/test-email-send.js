/**
 * Test script to verify email sending works
 * Run with: node scripts/test-email-send.js
 */

require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('📧 Testing email sending...\n');
  
  // Check configuration
  const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM;
  const testEmails = process.env.EMAIL_TEST_ADDRESSES ? process.env.EMAIL_TEST_ADDRESSES.split(',').map(e => e.trim()) : [];
  const testEmail = testEmails[0] || 'test@example.com';
  
  // Temporarily disable test mode for this test (we're explicitly testing)
  const originalTestMode = process.env.EMAIL_TEST_MODE;
  process.env.EMAIL_TEST_MODE = 'false';
  
  console.log('Configuration:');
  console.log(`  Provider: ${emailProvider}`);
  console.log(`  From: ${emailFrom || 'Not set'}`);
  console.log(`  To: ${testEmail}`);
  console.log(`  Gmail User: ${gmailUser ? '✅ Set' : '❌ Not set'}`);
  console.log(`  Gmail Password: ${gmailPassword ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  
  if (!gmailUser || !gmailPassword) {
    console.error('❌ Gmail credentials not configured!');
    console.error('Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
    process.exit(1);
  }
  
  try {
    if (emailProvider === 'gmail' || emailProvider === 'smtp') {
      // Use nodemailer directly for Gmail/SMTP
      const nodemailer = require('nodemailer');
      
      console.log('Creating SMTP transporter...\n');
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || false, // Use TLS for port 587
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
        ...(process.env.SMTP_HOST?.includes('gmail.com') && {
          service: 'gmail',
        }),
      });
      
      console.log('Sending test email...\n');
      
      const info = await transporter.sendMail({
        from: emailFrom || gmailUser,
        to: testEmail,
        subject: '🧪 Test Email from Veritas System',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #7c3aed;">Email System Test</h2>
              <p>This is a test email from your Veritas email system!</p>
              <p>If you received this, your email configuration is working correctly. ✅</p>
              <hr>
              <p style="color: #666; font-size: 12px;">
                Sent at: ${new Date().toISOString()}<br>
                Provider: ${emailProvider}<br>
                From: ${emailFrom || gmailUser}
              </p>
            </body>
          </html>
        `,
        text: 'This is a test email from your Veritas email system! If you received this, your email configuration is working correctly.',
      });
      
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response: ${info.response || 'N/A'}`);
      console.log(`\n📬 Check your inbox at: ${testEmail}`);
      console.log('   (Check spam folder if you don\'t see it)');
    } else {
      console.error(`❌ Provider "${emailProvider}" not supported in this test script.`);
      console.error('   Please use EMAIL_PROVIDER=gmail for Gmail');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing email:');
    console.error(`   ${error.message}`);
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   - Is your Gmail App Password correct?');
      console.error('   - Is 2-Step Verification enabled?');
      console.error('   - Did you use an App Password (not your regular password)?');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n💡 Connection failed. Check:');
      console.error('   - Is your internet connection working?');
      console.error('   - Are you behind a firewall?');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testEmail();

