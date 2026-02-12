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
    const { lead_id, phone, email, attributes = {} } = body;

    // Generate consistent lead_id based on email/phone to prevent duplicate runs
    // This ensures test leads with the same contact info reuse the same lead_id
    let consistentLeadId = lead_id;
    if (!consistentLeadId) {
      const contactKey = email || phone || 'test';
      // Create a consistent hash-like ID from email/phone
      // This ensures same email/phone = same lead_id = no duplicates
      const hash = contactKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      consistentLeadId = `test_${hash}`;
    }

    // Call the lead.created endpoint
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/events/lead.created?key=${encodeURIComponent(request.nextUrl.searchParams.get('key') || 'veritas2024admin')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.nextUrl.searchParams.get('key') || 'veritas2024admin'}`,
      },
      body: JSON.stringify({
        lead_id: consistentLeadId,
        phone: phone || '+15551234567',
        email: email,
        attributes: {
          FirstName: attributes.FirstName || 'Test',
          PropertyName: attributes.PropertyName || 'Horizon Park',
          Email: email, // Also include in attributes for consistency
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

