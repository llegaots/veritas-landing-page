import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const filter = request.nextUrl.searchParams.get('filter') || 'all';

  try {
    let query = supabase.from('message_jobs').select('*').order('scheduled_for', { ascending: false });

    if (filter === 'pending') {
      query = query.is('sent_at', null);
    } else if (filter === 'sent') {
      query = query.not('sent_at', 'is', null).is('error', null);
    } else if (filter === 'failed') {
      query = query.not('error', 'is', null);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('Error fetching message jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch message jobs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobs: data || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/message-jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

