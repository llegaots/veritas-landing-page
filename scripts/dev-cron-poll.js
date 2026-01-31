/**
 * Development cron poller - runs the cron job every minute
 * Usage: node scripts/dev-cron-poll.js
 * 
 * This script runs in the background and automatically sends due messages
 * every minute, simulating Vercel's cron job in development.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';
const POLL_INTERVAL = 60 * 1000; // 1 minute

let isRunning = false;
let pollCount = 0;

async function pollCron() {
  if (isRunning) {
    console.log('⏸️  Previous poll still running, skipping...');
    return;
  }

  isRunning = true;
  pollCount++;

  try {
    const response = await fetch(`${BASE_URL}/api/cron/send-due-messages?key=${encodeURIComponent(ADMIN_PASSWORD)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Poll #${pollCount}] Error:`, response.status, errorText);
      return;
    }

    const result = await response.json();
    
    if (result.processed > 0) {
      console.log(`✅ [Poll #${pollCount}] Processed ${result.processed} message(s) - Sent: ${result.sent || 0}, Failed: ${result.failed || 0}`);
      if (result.errors && result.errors.length > 0) {
        console.log('   Errors:', result.errors);
      }
    } else {
      // Only log when there are messages to avoid spam
      if (pollCount % 10 === 0) {
        console.log(`ℹ️  [Poll #${pollCount}] No due messages`);
      }
    }
  } catch (error) {
    console.error(`❌ [Poll #${pollCount}] Failed to poll cron:`, error.message);
  } finally {
    isRunning = false;
  }
}

console.log('🚀 Starting development cron poller...');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`⏰ Poll interval: ${POLL_INTERVAL / 1000} seconds`);
console.log('💡 Press Ctrl+C to stop\n');

// Run immediately, then every minute
pollCron();
setInterval(pollCron, POLL_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping cron poller...');
  process.exit(0);
});


