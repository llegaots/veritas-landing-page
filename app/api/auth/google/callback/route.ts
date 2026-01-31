import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserEmail } from '@/lib/email/oauth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/auth/google/callback
 * Handles OAuth2 callback from Google
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state'); // Key passed via state parameter

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const key = state || request.nextUrl.searchParams.get('key') || 'veritas2024admin';

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/admin/email-setup?key=${encodeURIComponent(key)}&oauth_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/email-setup?key=${encodeURIComponent(key)}&oauth_error=no_code`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    // Get user email
    const userEmail = await getUserEmail(tokens.access_token);

    // Store tokens in database (or you could use environment variables)
    // For now, we'll store them in a simple table or return them to be saved
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store in a simple key-value table (or use your existing config table)
    // For this example, we'll create a simple storage mechanism
    // In production, you'd want to encrypt these tokens
    
    // Return success page with instructions to save tokens
    const successUrl = `${baseUrl}/admin/email-setup?key=${encodeURIComponent(key)}&oauth_success=1&email=${encodeURIComponent(userEmail)}&refresh_token=${encodeURIComponent(tokens.refresh_token)}`;
    
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${baseUrl}/admin/email-setup?key=${encodeURIComponent(key)}&oauth_error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`
    );
  }
}

