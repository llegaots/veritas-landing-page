/**
 * Test email sending directly (bypasses database) to debug <br> tag issue
 * Run with: node scripts/test/test-email-direct.js
 */

require('dotenv').config({ path: '.env.local' });

// Import the sendEmail function
async function testEmailDirect() {
  console.log('📧 Testing email sending directly with debugging...\n');
  
  // Test HTML content that simulates what the user types
  const testHtml = `Hi TEST,

Thanks for requesting more information on Horizon Park, a workforce-housing multifamily opportunity in Edmonds, Seattle. If helpful, the next step is a short 10-minute Zoom to see whether this opportunity aligns with your goals and risk tolerance. There's no obligation, the call is simply to walk through the structure, risks, and determine if it's a good fit.

You can schedule a time here:
https://calendly.com/alex-veritasequitypartners/15-minute-intro-call

If now isn't the right time, that's completely fine as well.

Best,
Veritas Equity Partners`;

  console.log('INPUT HTML:');
  console.log('Length:', testHtml.length);
  console.log('Has newlines:', testHtml.includes('\n'));
  console.log('Newline count:', (testHtml.match(/\n/g) || []).length);
  console.log('Preview (first 300 chars):', testHtml.substring(0, 300));
  console.log('');

  // Dynamically import the sendEmail function
  const { sendEmail } = await import('../lib/email/provider.ts');
  
  console.log('Sending email...\n');
  
  try {
    const result = await sendEmail({
      to: 'lucaslegatos123@gmail.com',
      subject: 'TEST - Debug Email (next steps for Horizon Park)',
      html: testHtml,
    });
    
    console.log('✅ Email sent!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('📬 Check your inbox at: lucaslegatos123@gmail.com');
    console.log('📋 Check server logs for debugging output showing:');
    console.log('   - [preserveLineBreaks] logs');
    console.log('   - [Gmail API] BEFORE/AFTER logs');
    console.log('   - [removeUnwantedBrTags] logs');
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Stack:', error.stack);
  }
}

testEmailDirect();

