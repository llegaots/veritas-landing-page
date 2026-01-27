// Sequences CRUD API
import { NextRequest } from 'next/server';
import {
  getSequences,
  getSequence,
  createSequence,
  updateSequence,
  deleteSequence,
  getActiveVersion,
} from '@/lib/db';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

function checkAuth(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('key') || request.headers.get('x-password');
  return password === ADMIN_PASSWORD;
}

// GET /api/sequences - List all sequences
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get single sequence with active version
      const sequence = await getSequence(id);
      if (!sequence) {
        return new Response(JSON.stringify({ error: 'Sequence not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const version = await getActiveVersion(id);
      return new Response(
        JSON.stringify({
          sequence,
          version: version
            ? {
                id: version.id,
                version_number: version.version_number,
                spec: version.spec_jsonb,
                created_at: version.created_at,
                created_by: version.created_by,
              }
            : null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // List all sequences
      const sequences = await getSequences();
      return new Response(JSON.stringify({ sequences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in GET /api/sequences:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// POST /api/sequences - Create new sequence
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { name, org_id } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sequence = await createSequence(name, org_id);
    return new Response(JSON.stringify({ sequence }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/sequences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Full error details:', { errorMessage, errorStack, error });
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack,
        type: error instanceof Error ? error.constructor.name : typeof error
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// PUT /api/sequences?id=... - Update sequence
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Sequence ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const sequence = await updateSequence(id, body);
    return new Response(JSON.stringify({ sequence }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in PUT /api/sequences:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE /api/sequences?id=... - Delete sequence
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Sequence ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deleteSequence(id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in DELETE /api/sequences:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

