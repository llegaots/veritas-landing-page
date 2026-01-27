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

  try {
    const { data, error } = await supabase
      .from('sequence_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching sequence runs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sequence runs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ runs: data || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/sequence-runs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

