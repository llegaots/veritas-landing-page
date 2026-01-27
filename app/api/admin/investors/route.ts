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
 * Admin API endpoint to fetch investors
 * Used by the admin dashboard investor list page
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '50');
  const offset = (page - 1) * pageSize;
  
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const readyForFollowUp = searchParams.get('ready_for_follow_up');

  try {
    // Build query
    let query = supabase
      .from('investors')
      .select('*', { count: 'exact' })
      .order('created_time', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (search) {
      query = query.or(`investor_name.ilike.%${search}%,email_address.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (readyForFollowUp) {
      query = query.eq('ready_for_follow_up', readyForFollowUp);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching investors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch investors' },
        { status: 500 }
      );
    }

    // Get unique statuses and sources for filters
    const { data: allInvestors } = await supabase
      .from('investors')
      .select('status, source');

    const statuses = [...new Set(allInvestors?.map(i => i.status).filter(Boolean) || [])];
    const sources = [...new Set(allInvestors?.map(i => i.source).filter(Boolean) || [])];

    return NextResponse.json({
      investors: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      filters: {
        statuses,
        sources,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

