import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, getUserEmail, getOAuth2Client } from '@/lib/email/oauth';
import { google } from 'googleapis';

/**
 * GET /api/admin/email-status
 * Check if email is connected and return the connected email address
 */
export async function GET(request: NextRequest) {
  try {
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    
    if (!refreshToken) {
      return NextResponse.json({
        connected: false,
        message: 'No email account connected',
      });
    }

    // Try to get access token and user email to verify connection
    try {
      const accessToken = await getValidAccessToken(refreshToken);
      const userEmail = await getUserEmail(accessToken);
      const emailFrom = process.env.EMAIL_FROM || userEmail;

      return NextResponse.json({
        connected: true,
        authenticatedEmail: userEmail,
        sendFromEmail: emailFrom,
        message: 'Email account is connected',
      });
    } catch (error) {
      // Refresh token might be invalid
      return NextResponse.json({
        connected: false,
        error: error instanceof Error ? error.message : 'Invalid refresh token',
        message: 'Email connection is invalid or expired',
      });
    }
  } catch (error) {
    console.error('Error checking email status:', error);
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


