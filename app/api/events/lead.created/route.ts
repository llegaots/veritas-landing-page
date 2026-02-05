import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processLeadCreated } from '@/lib/sequences/process-lead-created';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify webhook signature or org secret
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD;
  
  if (!expectedSecret) {
    // In development, allow if no secret is set
    return process.env.NODE_ENV === 'development';
  }
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    return token === expectedSecret;
  }
  
  // Also check query param for convenience
  const key = request.nextUrl.searchParams.get('key');
  return key === expectedSecret;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lead_id, phone, email, attributes = {}, org_id } = body;

    if (!lead_id || (!phone && !email)) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id and either phone or email' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const result = await processLeadCreated(
      { lead_id, phone, email, attributes, org_id },
      supabase
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event_id: result.event_id,
      runs_created: result.runs_created,
      run_ids: result.run_ids,
    });
  } catch (error) {
    console.error('Error processing lead.created event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
