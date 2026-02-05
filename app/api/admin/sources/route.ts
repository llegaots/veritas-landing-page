import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

/**
 * Returns unique source values from investors (for audience filters)
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data } = await supabase
      .from('investors')
      .select('source')
      .not('source', 'is', null);

    const sources = [...new Set((data || []).map((r: { source: string }) => r.source).filter(Boolean))].sort();

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
