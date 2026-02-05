// Sequence versions API
import { NextRequest } from 'next/server';
import { getSequenceVersion, createSequenceVersion, getSequence, getActiveVersion } from '@/lib/db';
import { SequenceSpec } from '@/lib/sequences/spec';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

function checkAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-password') || new URL(request.url).searchParams.get('key');
  return password === ADMIN_PASSWORD;
}

// GET /api/sequences/[id]/versions - Get all versions for a sequence
export async function GET(
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
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    if (versionId) {
      // Get specific version
      const version = await getSequenceVersion(versionId);
      if (!version) {
        return new Response(JSON.stringify({ error: 'Version not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          id: version.id,
          sequence_id: version.sequence_id,
          version_number: version.version_number,
          spec: version.spec_jsonb,
          created_at: version.created_at,
          created_by: version.created_by,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      } else {
      // Get active version for sequence
      const version = await getActiveVersion(id);
      return new Response(
        JSON.stringify({
          versions: version ? [{ ...version, spec: version.spec_jsonb }] : [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/sequences/[id]/versions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// POST /api/sequences/[id]/versions - Create new version
export async function POST(
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
    const body = await request.json();
    const { spec, created_by } = body;

    if (!spec) {
      return new Response(JSON.stringify({ error: 'Spec is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[API] Saving version for sequence:', id);
    console.log('[API] Spec has', spec.nodes?.length || 0, 'nodes,', spec.edges?.length || 0, 'edges');
    console.log('[API] Node IDs:', spec.nodes?.map((n: any) => `${n.type}:${n.id}`));

    // Verify sequence exists
    const sequence = await getSequence(id);
    if (!sequence) {
      return new Response(JSON.stringify({ error: 'Sequence not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const version = await createSequenceVersion(id, spec as SequenceSpec, created_by);
    
    console.log('[API] Version created:', version.id);
    console.log('[API] Saved spec has', version.spec_jsonb?.nodes?.length || 0, 'nodes');
    console.log('[API] Saved node IDs:', version.spec_jsonb?.nodes?.map((n: any) => `${n.type}:${n.id}`));
    
    return new Response(
      JSON.stringify({
        id: version.id,
        sequence_id: version.sequence_id,
        version_number: version.version_number,
        spec: version.spec_jsonb,
        created_at: version.created_at,
        created_by: version.created_by,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in POST /api/sequences/[id]/versions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

