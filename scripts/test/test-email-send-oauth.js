/**
 * Test script to verify email sending works with OAuth2
 * Run with: node scripts/test-email-send-oauth.js
 */

require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('📧 Testing email sending with OAuth2...\n');
  
  // Check configuration
  const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const emailFrom = process.env.EMAIL_FROM || 'test@example.com';
  const testEmails = process.env.EMAIL_TEST_ADDRESSES ? process.env.EMAIL_TEST_ADDRESSES.split(',').map(e => e.trim()) : ['lucaslegatos123@gmail.com'];
  const testEmail = testEmails[0];
  
  console.log('Configuration:');
  console.log(`  Provider: ${emailProvider}`);
  console.log(`  From: ${emailFrom}`);
  console.log(`  To: ${testEmail}`);
  console.log(`  Client ID: ${clientId ? '✅ Set (' + clientId.substring(0, 20) + '...)' : '❌ Not set'}`);
  console.log(`  Client Secret: ${clientSecret ? '✅ Set' : '❌ Not set'}`);
  console.log(`  Refresh Token: ${refreshToken ? '✅ Set (' + refreshToken.substring(0, 20) + '...)' : '❌ Not set'}`);
  console.log('');
  
  if (!refreshToken) {
    console.error('❌ GMAIL_REFRESH_TOKEN not configured!');
    console.error('Please:');
    console.error('1. Go to /admin/email-setup');
    console.error('2. Click "Connect Google Account"');
    console.error('3. Sign in and copy the refresh token');
    console.error('4. Add GMAIL_REFRESH_TOKEN to .env.local');
    process.exit(1);
  }
  
  if (!clientId || !clientSecret) {
    console.error('❌ Google OAuth2 credentials not configured!');
    console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local');
    process.exit(1);
  }
  
  try {
    // Use nodemailer directly with OAuth2 (same as the provider does)
    const nodemailer = require('nodemailer');
    const { google } = require('googleapis');
    
    console.log('Getting OAuth2 access token...\n');
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`
    );
    
    // Set refresh token and get access token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    const accessToken = credentials.access_token;
    
    // Get user email for the 'user' field
    oauth2Client.setCredentials({
      access_token: accessToken,
    });
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });
    const { data } = await oauth2.userinfo.get();
    const userEmail = data.email;
    
    console.log(`✅ Authenticated as: ${userEmail}`);
    console.log('Using Gmail API to send email...\n');
    
    // Use Gmail API directly (more reliable than SMTP with OAuth2)
    const gmail = google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });
    
    // Create email message in RFC 2822 format
    const emailContent = [
      `From: ${emailFrom}`,
      `To: ${testEmail}`,
      `Subject: 🧪 Test Email from Veritas System (OAuth2)`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      `<html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <div style="background: white; color: #333; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #7c3aed; margin-top: 0;">✅ Email System Test (OAuth2)</h2>
            <p>This is a test email from your Veritas email system using <strong>Google OAuth2</strong>!</p>
            <p>If you received this, your OAuth2 configuration is working correctly. 🎉</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              <strong>Sent at:</strong> ${new Date().toLocaleString()}<br>
              <strong>Provider:</strong> ${emailProvider} (OAuth2 via Gmail API)<br>
              <strong>From:</strong> ${emailFrom}<br>
              <strong>To:</strong> ${testEmail}
            </p>
          </div>
        </body>
      </html>`,
    ].join('\n');
    
    // Encode message in base64url format (Gmail API requirement)
    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log('Sending test email via Gmail API...\n');
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    
    console.log('✅ Email sent successfully via Gmail API!');
    console.log(`   Message ID: ${response.data.id || 'N/A'}`);
    console.log(`   Thread ID: ${response.data.threadId || 'N/A'}`);
    console.log(`\n📬 Check your inbox at: ${testEmail}`);
    console.log('   (Check spam folder if you don\'t see it)');
    console.log(`\n✨ OAuth2 authentication is working!`);
    console.log(`   Sending from: ${emailFrom}`);
    console.log(`   Authenticated as: ${userEmail}`);
  } catch (error) {
    console.error('❌ Error testing email:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('OAuth2')) {
      console.error('\n💡 OAuth2 authentication failed. Check:');
      console.error('   - Is your GMAIL_REFRESH_TOKEN valid?');
      console.error('   - Did you complete the OAuth flow at /admin/email-setup?');
      console.error('   - Are GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET correct?');
    } else if (error.message.includes('refresh token')) {
      console.error('\n💡 Refresh token issue. Try:');
      console.error('   1. Go to /admin/email-setup');
      console.error('   2. Click "Connect Google Account" again');
      console.error('   3. Get a new refresh token');
    }
    
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testEmail();

