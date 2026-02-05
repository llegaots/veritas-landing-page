// Manually trigger the cron job to send due messages
// This helps debug why messages aren't being sent

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://veritas-landing-page.vercel.app';
const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

const url = new URL(`${baseUrl}/api/cron/send-due-messages`);

const headers = {};
if (cronSecret) {
  headers['Authorization'] = `Bearer ${cronSecret}`;
}

const options = {
  method: 'GET',
  headers: headers,
};

console.log('🔧 Manually triggering cron job...');
console.log(`📍 URL: ${url.toString()}`);
console.log(`🔐 Auth: ${cronSecret ? 'Using CRON_SECRET' : 'No secret (may fail in production)'}`);
console.log('');

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('');
    
    try {
      const result = JSON.parse(data);
      console.log('📦 Response:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('');
        console.log(`✅ Success! Processed: ${result.processed || 0}, Sent: ${result.sent || 0}, Failed: ${result.failed || 0}`);
        if (result.errors && result.errors.length > 0) {
          console.log('❌ Errors:');
          result.errors.forEach(err => console.log(`   - ${err}`));
        }
      } else {
        console.log('');
        console.log(`❌ Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.log('📄 Raw response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();

