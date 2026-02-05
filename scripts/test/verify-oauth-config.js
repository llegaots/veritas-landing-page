/**
 * Verify OAuth2 Configuration
 * This script helps you verify which OAuth client is being used
 */

require('dotenv').config({ path: '.env.local' });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
  `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;

console.log('🔍 OAuth2 Configuration Check\n');
console.log('='.repeat(60));

if (!clientId) {
  console.error('❌ GOOGLE_CLIENT_ID is not set in .env.local');
  process.exit(1);
}

if (!clientSecret) {
  console.error('❌ GOOGLE_CLIENT_SECRET is not set in .env.local');
  process.exit(1);
}

console.log('✅ Client ID:', clientId);
console.log('✅ Client Secret:', clientSecret ? `${clientSecret.substring(0, 10)}...` : 'NOT SET');
console.log('✅ Redirect URI:', redirectUri);
console.log('✅ Base URL:', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

console.log('\n' + '='.repeat(60));
console.log('\n📋 Verification Steps:\n');

console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
console.log('2. Select your project');
console.log('3. Go to: APIs & Services → Credentials');
console.log('4. Find the OAuth 2.0 Client ID that matches:');
console.log(`   ${clientId.substring(0, 20)}...`);
console.log('\n5. Click on that OAuth client');
console.log('6. Check the "Authorized redirect URIs" section');
console.log(`7. Make sure this URI is listed: ${redirectUri}`);

console.log('\n' + '='.repeat(60));
console.log('\n⚠️  Common Issues:\n');

console.log('• If redirect URI doesn\'t match → Add it to the OAuth client');
console.log('• If using wrong client → Update GOOGLE_CLIENT_ID in .env.local');
console.log('• If multiple clients exist → Delete the old Drive one or use different redirect URI');
console.log('• If redirect URI is registered to Drive client → Create a new OAuth client for Gmail');

console.log('\n' + '='.repeat(60));
console.log('\n💡 Quick Fix:\n');

console.log('If the redirect URI is registered to your Drive OAuth client:');
console.log('1. Create a NEW OAuth 2.0 Client ID in Google Cloud Console');
console.log('2. Name it "Veritas Gmail" or similar');
console.log('3. Add redirect URI:', redirectUri);
console.log('4. Copy the NEW Client ID and Secret');
console.log('5. Update .env.local with the NEW credentials');
console.log('6. Restart your dev server\n');


