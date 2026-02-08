import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/provider';

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, html } = body;

    // Test HTML content that simulates what the user types
    const testHtml = html || `Hi TEST,

Thanks for requesting more information on Horizon Park, a workforce-housing multifamily opportunity in Edmonds, Seattle. If helpful, the next step is a short 10-minute Zoom to see whether this opportunity aligns with your goals and risk tolerance. There's no obligation, the call is simply to walk through the structure, risks, and determine if it's a good fit.

You can schedule a time here:
https://calendly.com/alex-veritasequitypartners/15-minute-intro-call

If now isn't the right time, that's completely fine as well.

Best,
Veritas Equity Partners`;

    console.log('[Test Email] INPUT HTML:');
    console.log('[Test Email] Length:', testHtml.length);
    console.log('[Test Email] Has newlines:', testHtml.includes('\n'));
    console.log('[Test Email] Newline count:', (testHtml.match(/\n/g) || []).length);
    console.log('[Test Email] Has <br> tags:', /<br\s*\/?>/i.test(testHtml));
    console.log('[Test Email] Has <p> tags:', /<p[\s>]/i.test(testHtml));
    console.log('[Test Email] Preview (first 500 chars):', testHtml.substring(0, 500));
    console.log('');

    const result = await sendEmail({
      to: to || 'lucaslegatos123@gmail.com',
      subject: 'TEST - Debug Email (next steps for Horizon Park)',
      html: testHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      result,
    });
  } catch (error) {
    console.error('[Test Email] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

