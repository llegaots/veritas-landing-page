/**
 * Test script to send a plain text email directly
 * Tests the plain text email flow without going through sequences
 * 
 * Usage: node scripts/test/send-plain-text-email.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function sendTestPlainTextEmail() {
  console.log('🧪 Sending test plain text email to lucaslegatos123@gmail.com\n');

  try {
    // Call the sendEmail function directly via an API endpoint
    // Or we can use the cron job endpoint with a test job
    
    // First, let's check if there's a direct email send endpoint
    // If not, we'll create a test job in the database
    
    const response = await fetch(`${BASE_URL}/api/cron/send-due-messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
      },
    });

    const responseText = await response.text();
    console.log('Response:', response.status, response.statusText);
    console.log('Response body:', responseText.substring(0, 500));
    
    // For a direct test, let's create a simple API call
    // Actually, let's just use the email provider directly via a test endpoint
    
    console.log('\n📧 Attempting to send plain text email directly...');
    
    // We need to import and use the sendEmail function
    // But since this is a Node script, we'll make an API call instead
    
    const emailResponse = await fetch(`${BASE_URL}/api/admin/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'lucaslegatos123@gmail.com',
        subject: 'TEST - Plain Text Email Test',
        text: 'This is a plain text email test.\n\nThis should be sent as plain text only, no HTML.\n\nIf you see this, the plain text email is working!',
        html: undefined, // Explicitly no HTML
      }),
    });
    
    if (emailResponse.ok) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Failed to send email:', await emailResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendTestPlainTextEmail();

