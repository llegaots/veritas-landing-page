import { NextRequest, NextResponse } from 'next/server';

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
    const { lead_id, phone, attributes = {} } = body;

    // Call the lead.created endpoint
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/events/lead.created?key=${encodeURIComponent(request.nextUrl.searchParams.get('key') || 'veritas2024admin')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.nextUrl.searchParams.get('key') || 'veritas2024admin'}`,
      },
      body: JSON.stringify({
        lead_id: lead_id || `test_${Date.now()}`,
        phone: phone || '+15551234567',
        attributes: {
          FirstName: attributes.FirstName || 'Test',
          PropertyName: attributes.PropertyName || 'Test Property',
          ...attributes,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to create test lead' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test lead created successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error creating test lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

