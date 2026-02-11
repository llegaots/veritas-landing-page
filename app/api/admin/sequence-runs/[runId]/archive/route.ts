// Archive a sequence run for a specific investor (per-investor archiving)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

function checkAuth(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('key') || request.headers.get('x-password');
  return password === ADMIN_PASSWORD;
}

// PATCH /api/admin/sequence-runs/[runId]/archive - Archive sequence run for this investor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { runId } = await params;

  try {
    // Get the run first to verify it exists
    const { data: run, error: fetchError } = await supabase
      .from('sequence_runs')
      .select('id, investor_id, status')
      .eq('id', runId)
      .single();

    if (fetchError || !run) {
      return NextResponse.json(
        { error: 'Sequence run not found' },
        { status: 404 }
      );
    }

    // Set archived_at timestamp (this archives the sequence for this specific investor)
    const { data, error } = await supabase
      .from('sequence_runs')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .select()
      .single();

    if (error) {
      console.error('Error archiving sequence run:', error);
      return NextResponse.json(
        { error: 'Failed to archive sequence run', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[Archive] Sequence run ${runId} archived for investor ${run.investor_id} (NOT deleted from database)`);

    return NextResponse.json({
      success: true,
      run: data,
      message: 'Sequence run archived successfully for this investor. Data preserved in database.',
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/sequence-runs/[runId]/archive:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

