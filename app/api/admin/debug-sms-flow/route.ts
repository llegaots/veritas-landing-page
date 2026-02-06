import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

/**
 * GET /api/admin/debug-sms-flow?key=...
 * Returns comprehensive diagnostic data for SMS flow debugging
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      ok: false,
      error: 'Missing Supabase env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)',
      tables: null,
      sequences: null,
      flow: { triggerUrl: `${baseUrl}/api/events/lead.created` },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Table counts
    const tables = ['sequences', 'sequence_versions', 'sequence_runs', 'message_jobs', 'sequence_events', 'investors'];
    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      tableCounts[table] = error ? -1 : (count ?? 0);
    }

    // 2. Sequences with active versions
    const { data: sequences } = await supabase
      .from('sequences')
      .select('id, name, active_version_id, created_at');
    const seqList = sequences || [];

    // 3. Active sequences detail (with spec status)
    const activeSeqs: Array<{
      id: string;
      name: string;
      active_version_id: string;
      status: string;
      triggerType: string;
      nodes: number;
      filters?: Record<string, unknown>;
    }> = [];
    for (const seq of seqList) {
      if (!seq.active_version_id) continue;
      const { data: version } = await supabase
        .from('sequence_versions')
        .select('id, spec_jsonb')
        .eq('id', seq.active_version_id)
        .single();
      const spec = (version as any)?.spec_jsonb;
      activeSeqs.push({
        id: seq.id,
        name: seq.name,
        active_version_id: seq.active_version_id,
        status: spec?.metadata?.status || 'unknown',
        triggerType: spec?.trigger?.type || 'unknown',
        nodes: spec?.nodes?.length ?? 0,
        filters: spec?.trigger?.filters,
      });
    }

    // 4. Recent sequence_events (last 10)
    const { data: recentEvents } = await supabase
      .from('sequence_events')
      .select('id, type, payload, created_at, processing_status')
      .order('created_at', { ascending: false })
      .limit(10);

    // 5. Recent sequence_runs
    const { data: recentRuns } = await supabase
      .from('sequence_runs')
      .select('id, lead_id, investor_id, status, started_at, created_at, sequence_version_id')
      .order('created_at', { ascending: false })
      .limit(10);

    // 6. Recent message_jobs
    const { data: recentJobs } = await supabase
      .from('message_jobs')
      .select('id, run_id, job_type, phone_number, scheduled_for, sent_at, error, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // 7. Recent investors (last 5)
    const { data: recentInvestors } = await supabase
      .from('investors')
      .select('id, investor_name, phone_number, status, source, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 8. Flow checklist
    const hasActiveSequence = activeSeqs.some((s) => s.status === 'active' && s.triggerType === 'lead.created');
    const hasRuns = (recentRuns?.length ?? 0) > 0;
    const hasJobs = (recentJobs?.length ?? 0) > 0;

    return NextResponse.json({
      ok: true,
      supabaseUrl: supabaseUrl.replace(/\/\/[^@]+@/, '//***@'),
      flow: {
        triggerUrl: `${baseUrl}/api/events/lead.created`,
        webhookUrl: `${baseUrl}/api/webhooks/investor-created`,
        expectedFlow: [
          '1. Investor inserted into Supabase (via webhook or Airtable sync)',
          '2. DB trigger on investors INSERT calls lead.created',
          '3. lead.created creates sequence_run + message_jobs for active sequences',
          '4. Cron sends due message_jobs (9 AM–7 PM EST)',
        ],
      },
      tables: tableCounts,
      sequences: seqList,
      activeSequences: activeSeqs,
      recentEvents: recentEvents || [],
      recentRuns: recentRuns || [],
      recentJobs: recentJobs || [],
      recentInvestors: recentInvestors || [],
      checklist: {
        sequencesExist: seqList.length > 0,
        hasActiveSequence,
        hasRuns,
        hasJobs,
        hasRecentEvents: (recentEvents?.length ?? 0) > 0,
        hasRecentInvestors: (recentInvestors?.length ?? 0) > 0,
      },
    });
  } catch (err) {
    console.error('debug-sms-flow error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
