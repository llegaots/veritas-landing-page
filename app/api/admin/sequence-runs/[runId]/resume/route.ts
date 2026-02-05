import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { runId } = await params;

  try {
    // Update sequence run status to 'active'
    const { data, error } = await supabase
      .from('sequence_runs')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .select()
      .single();

    if (error) {
      console.error('Error resuming sequence run:', error);
      return NextResponse.json(
        { error: 'Failed to resume sequence run', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Sequence run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      run: data,
      message: 'Sequence run resumed successfully',
    });
  } catch (error) {
    console.error('Error in resume sequence run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

