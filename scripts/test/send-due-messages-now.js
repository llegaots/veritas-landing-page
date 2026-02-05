/**
 * Manually trigger the cron job to send due messages
 * Usage: node scripts/send-due-messages-now.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

async function sendDueMessages() {
  console.log('⏰ Triggering cron job to send due messages...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/cron/send-due-messages?key=${encodeURIComponent(ADMIN_PASSWORD)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Cron job executed successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');
    
    if (result.processed > 0) {
      console.log(`📤 Processed ${result.processed} message(s)`);
      console.log(`   ✅ Sent: ${result.sent || 0}`);
      console.log(`   ❌ Failed: ${result.failed || 0}`);
      if (result.errors && result.errors.length > 0) {
        console.log('   Errors:', result.errors);
      }
    } else {
      console.log('ℹ️  No due messages to send');
    }
  } catch (error) {
    console.error('❌ Failed to trigger cron job:', error);
  }
}

sendDueMessages();



