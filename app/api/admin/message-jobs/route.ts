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
  const filter = request.nextUrl.searchParams.get('filter') || 'all';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '1000', 10);
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate = request.nextUrl.searchParams.get('endDate');
  const sourceFilter = request.nextUrl.searchParams.get('source');
  const repliedFilter = request.nextUrl.searchParams.get('replied') === 'true';

  try {
    // Enhanced query with joins to get sequence names
    let query = supabase
      .from('message_jobs')
      .select(`
        *,
        sequence_runs(
          id,
          lead_id,
          investor_id,
          status,
          started_at,
          context_jsonb,
          sequence_versions(
            id,
            version_number,
            sequences(
              id,
              name
            )
          )
        )
      `)
      .order('scheduled_for', { ascending: false });

    if (filter === 'pending') {
      query = query.is('sent_at', null);
    } else if (filter === 'sent') {
      query = query.not('sent_at', 'is', null).is('error', null);
    } else if (filter === 'failed') {
      query = query.not('error', 'is', null);
    } else if (filter === 'replied') {
      query = query.not('replied_at', 'is', null);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte('scheduled_for', startDate);
    }
    if (endDate) {
      // Add one day to include the entire end date
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      query = query.lte('scheduled_for', endDateObj.toISOString());
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching message jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch message jobs', details: error.message },
        { status: 500 }
      );
    }

    // Get unique sources for filter dropdown (before filtering)
    const { data: allSourcesData } = await supabase
      .from('investors')
      .select('source')
      .not('source', 'is', null);
    
    const uniqueSources = Array.from(new Set(
      (allSourcesData || []).map((inv: any) => inv.source).filter(Boolean)
    )).sort();

    // If source filter is applied, get matching investor IDs first
    let matchingInvestorIds: Set<number> | null = null;
    if (sourceFilter) {
      const { data: sourceInvestors } = await supabase
        .from('investors')
        .select('id')
        .eq('source', sourceFilter);
      
      if (sourceInvestors) {
        matchingInvestorIds = new Set(sourceInvestors.map((inv: any) => inv.id));
      }
    }

    // Fetch investor data separately
    const investorIds = new Set<number>();
    (data || []).forEach((job: any) => {
      const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
      if (run?.investor_id) {
        investorIds.add(run.investor_id);
      }
    });

    let investorsMap = new Map<number, any>();
    if (investorIds.size > 0) {
      const { data: investorsData, error: investorsError } = await supabase
        .from('investors')
        .select('id, investor_name, phone_number, email_address, source, intent_score')
        .in('id', Array.from(investorIds));

      if (!investorsError && investorsData) {
        investorsData.forEach((inv: any) => {
          investorsMap.set(inv.id, inv);
        });
      }
    }

    // Filter jobs by source if source filter is applied
    let filteredData = data || [];
    if (sourceFilter && matchingInvestorIds) {
      filteredData = filteredData.filter((job: any) => {
        const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
        return run?.investor_id && matchingInvestorIds.has(run.investor_id);
      });
    }

    // Fetch replies for these message jobs
    const jobIds = filteredData.map((j: any) => j.id);
    let repliesMap = new Map<string, any[]>();
    
    if (jobIds.length > 0) {
      const { data: repliesData } = await supabase
        .from('sms_replies')
        .select('*')
        .in('message_job_id', jobIds)
        .order('received_at', { ascending: false });

      if (repliesData) {
        repliesData.forEach((reply: any) => {
          const jobId = reply.message_job_id;
          if (!repliesMap.has(jobId)) {
            repliesMap.set(jobId, []);
          }
          repliesMap.get(jobId)!.push(reply);
        });
      }
    }

    // Fetch SMS interactions for these investors
    const investorIdsForInteractions = Array.from(investorsMap.keys());
    let interactionsMap = new Map<number, any[]>();
    
    if (investorIdsForInteractions.length > 0) {
      const { data: interactionsData } = await supabase
        .from('sms_interactions')
        .select('*')
        .in('investor_id', investorIdsForInteractions)
        .order('created_at', { ascending: false });

      if (interactionsData) {
        interactionsData.forEach((interaction: any) => {
          const invId = interaction.investor_id;
          if (!interactionsMap.has(invId)) {
            interactionsMap.set(invId, []);
          }
          interactionsMap.get(invId)!.push(interaction);
        });
      }
    }

    // Calculate metrics
    const now = new Date();
    const jobs = filteredData.map((job: any) => {
      const scheduled = new Date(job.scheduled_for);
      const sent = job.sent_at ? new Date(job.sent_at) : null;
      
      // Calculate timing accuracy
      let timingAccuracy: number | null = null;
      let timingStatus: 'on-time' | 'early' | 'late' | 'overdue' | 'pending' = 'pending';
      
      if (sent) {
        const diffMs = sent.getTime() - scheduled.getTime();
        timingAccuracy = diffMs;
        if (Math.abs(diffMs) <= 60000) { // Within 1 minute
          timingStatus = 'on-time';
        } else if (diffMs < 0) {
          timingStatus = 'early';
        } else {
          timingStatus = 'late';
        }
      } else if (scheduled < now) {
        timingStatus = 'overdue';
      }

      // Extract sequence name from nested structure
      // Handle both array and object formats from Supabase
      const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
      const version = Array.isArray(run?.sequence_versions) ? run?.sequence_versions[0] : run?.sequence_versions;
      const sequence = Array.isArray(version?.sequences) ? version?.sequences[0] : version?.sequences;
      
      const sequenceName = sequence?.name || 'Unknown Sequence';
      const versionNumber = version?.version_number || null;
      
      // Get investor info from the map
      const investorId = run?.investor_id;
      const investor = investorId ? investorsMap.get(investorId) : null;
      const investorName = investor?.investor_name || null;
      const investorPhone = investor?.phone_number || job.phone_number || null;
      const investorEmail = investor?.email_address || job.email_address || null;
      const investorIntentScore = (investor?.intent_score ?? 0) as number;
      
      // Flatten the structure for easier access
      const flattenedRun = run ? {
        id: run.id,
        lead_id: run.lead_id,
        investor_id: run.investor_id,
        status: run.status,
        started_at: run.started_at,
        context_jsonb: run.context_jsonb,
      } : null;

      const replies = repliesMap.get(job.id) || [];
      const hasReplies = replies.length > 0;

      const interactions = investorId ? (interactionsMap.get(investorId) || []) : [];
      
      return {
        ...job,
        sequence_name: sequenceName,
        version_number: versionNumber,
        investor_name: investorName,
        investor_phone: investorPhone,
        investor_email: investorEmail,
        investor_intent_score: investorIntentScore,
        timing_accuracy_ms: timingAccuracy,
        timing_status: timingStatus,
        is_anomaly: timingStatus === 'overdue' || timingStatus === 'late' || job.error !== null,
        sequence_runs: flattenedRun,
        replies: replies,
        has_replies: hasReplies,
        reply_count: replies.length,
        interactions: interactions,
        interaction_count: interactions.length,
      };
    });

    // Calculate summary stats
    const stats = {
      total: jobs.length,
      sent: jobs.filter((j: any) => j.sent_at).length,
      pending: jobs.filter((j: any) => !j.sent_at && new Date(j.scheduled_for) > now).length,
      overdue: jobs.filter((j: any) => !j.sent_at && new Date(j.scheduled_for) <= now).length,
      failed: jobs.filter((j: any) => j.error).length,
      anomalies: jobs.filter((j: any) => j.is_anomaly).length,
      on_time: jobs.filter((j: any) => j.timing_status === 'on-time').length,
      late: jobs.filter((j: any) => j.timing_status === 'late').length,
      replied: jobs.filter((j: any) => j.has_replies).length,
    };

    // Count unique investors
    const uniqueInvestors = new Set(
      jobs
        .map((j: any) => j.sequence_runs?.investor_id)
        .filter((id: any) => id !== null && id !== undefined)
    );

    return NextResponse.json({ 
      jobs,
      stats,
      runs: Array.from(new Set(jobs.map((j: any) => j.run_id))).length,
      investors: uniqueInvestors.size,
      availableSources: uniqueSources,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/message-jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

