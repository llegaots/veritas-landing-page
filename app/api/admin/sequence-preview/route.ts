import { NextRequest, NextResponse } from 'next/server';
import { getSequence, getActiveVersion } from '@/lib/db';
import { compileSequenceToJobs } from '@/lib/sequences/compiler';

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

/**
 * GET /api/admin/sequence-preview?sequenceId=...&simulateAt=...&phone=...&email=...
 * Preview what message jobs would be created for a sequence (dry run, no DB writes)
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const sequenceId = searchParams.get('sequenceId');
  const simulateAt = searchParams.get('simulateAt'); // ISO string, default: now
  const phone = searchParams.get('phone') || '+15551234567';
  const email = searchParams.get('email') || 'test@example.com';

  if (!sequenceId) {
    return NextResponse.json({ error: 'sequenceId is required' }, { status: 400 });
  }

  try {
    const sequence = await getSequence(sequenceId);
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    const version = await getActiveVersion(sequenceId);
    const spec = version?.spec_jsonb;
    if (!spec) {
      return NextResponse.json({ error: 'Sequence has no active version/spec' }, { status: 400 });
    }

    const startTime = simulateAt ? new Date(simulateAt) : new Date();
    if (isNaN(startTime.getTime())) {
      return NextResponse.json({ error: 'Invalid simulateAt date' }, { status: 400 });
    }

    const context = {
      lead_id: 'preview_test',
      phone,
      email,
      FirstName: 'Test',
      PropertyName: 'Horizon Park',
    };

    const jobs = compileSequenceToJobs(
      spec,
      'preview-run-id',
      context,
      { startTime }
    );

    return NextResponse.json({
      sequenceName: sequence.name,
      specMetadata: spec.metadata,
      simulateAt: startTime.toISOString(),
      context: { phone, email },
      jobs,
      summary: {
        total: jobs.length,
        sms: jobs.filter((j) => j.job_type === 'sms').length,
        email: jobs.filter((j) => j.job_type === 'email').length,
      },
    });
  } catch (error) {
    console.error('Error in sequence-preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
