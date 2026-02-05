import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/email/oauth';

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth2 consent screen
 */
export async function GET(request: NextRequest) {
  try {
    // Preserve the key parameter if provided
    const key = request.nextUrl.searchParams.get('key');
    
    // Log which client ID is being used
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    
    console.log('[OAuth] Starting OAuth flow:', {
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET',
      redirectUri,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    });
    
    const authUrl = getAuthUrl();
    
    // Add key to state or callback URL (we'll add it to callback URL)
    const urlWithState = new URL(authUrl);
    if (key) {
      urlWithState.searchParams.set('state', key);
    }
    
    console.log('[OAuth] Generated auth URL:', urlWithState.toString().substring(0, 100) + '...');
    
    return NextResponse.redirect(urlWithState.toString());
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

