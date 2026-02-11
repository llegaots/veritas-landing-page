// Archive sequence (set status to archived - does NOT delete from database)
import { NextRequest } from 'next/server';
import { getSequence, getActiveVersion, getSequenceVersion } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function checkAuth(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('key') || request.headers.get('x-password');
  return password === ADMIN_PASSWORD;
}

// PATCH /api/sequences/[id]/archive - Archive sequence (set status to archived)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sequence = await getSequence(id);
    if (!sequence) {
      return new Response(JSON.stringify({ error: 'Sequence not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!sequence.active_version_id) {
      return new Response(JSON.stringify({ error: 'No active version found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the active version
    const version = await getSequenceVersion(sequence.active_version_id);
    if (!version) {
      return new Response(JSON.stringify({ error: 'Version not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set status to archived (preserves all data, just hides from active views)
    const updatedSpec = {
      ...version.spec_jsonb,
      metadata: {
        ...version.spec_jsonb.metadata,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      },
    };

    // Update in database (NO DELETE - just update status)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('sequence_versions')
      .update({ spec_jsonb: updatedSpec })
      .eq('id', sequence.active_version_id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving sequence:', error);
      throw error;
    }

    console.log(`[Archive] Sequence ${id} archived (status set to 'archived', NOT deleted from database)`);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'archived',
        sequence_id: id,
        version_id: sequence.active_version_id,
        message: 'Sequence archived successfully. Data preserved in database.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in PATCH /api/sequences/[id]/archive:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

