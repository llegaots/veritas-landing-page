import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/provider';

/**
 * POST /api/admin/test-email
 * Test endpoint to send a plain text email directly
 * 
 * Body: { to, subject, text, html? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html } = body;

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, text' },
        { status: 400 }
      );
    }

    console.log('[TestEmail] Sending plain text email:', {
      to,
      subject,
      textLength: text.length,
      hasHtml: !!html,
      htmlLength: html?.length || 0,
    });

    const result = await sendEmail({
      to,
      subject,
      text,
      html: html || undefined, // Explicitly undefined if not provided
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    console.error('[TestEmail] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

