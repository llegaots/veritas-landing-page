/**
 * Check what redirect URI is being used
 */

require('dotenv').config({ path: '.env.local' });

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
  `${baseUrl}/api/auth/google/callback`;

console.log('🔍 Checking Redirect URI Configuration\n');
console.log('='.repeat(60));
console.log(`Base URL: ${baseUrl}`);
console.log(`Redirect URI: ${redirectUri}`);
console.log('='.repeat(60));

console.log('\n📋 For Vercel, make sure:');
console.log('1. In Vercel Dashboard → Settings → Environment Variables:');
console.log(`   NEXT_PUBLIC_BASE_URL=https://veritas-landing-page.vercel.app`);
console.log(`   GOOGLE_REDIRECT_URI=https://veritas-landing-page.vercel.app/api/auth/google/callback`);
console.log('\n2. In Google Cloud Console → OAuth Client:');
console.log(`   Add this EXACT redirect URI: ${redirectUri}`);
console.log('\n3. Important:');
console.log('   - No trailing slash');
console.log('   - Must be https:// (not http://)');
console.log('   - Must match EXACTLY (case-sensitive)');
console.log('   - Wait 1-2 minutes after saving in Google Console');

