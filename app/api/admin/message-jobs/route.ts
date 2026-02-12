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
  const statusFilter = request.nextUrl.searchParams.get('filter') || 'all'; // Tab: pending/sent/failed/replied
  const jobType = request.nextUrl.searchParams.get('jobType') || 'all'; // all | sms | email
  const sequenceId = request.nextUrl.searchParams.get('sequenceId') || '';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '1000', 10);
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate = request.nextUrl.searchParams.get('endDate');
  const sourceFilter = request.nextUrl.searchParams.get('source');

  try {
    // Fetch ALL jobs matching jobType, sequenceId, date, source (no status filter - stats need full set)
    // Include spec_jsonb to check sequence status (archived sequences should be filtered out)
    // CRITICAL: Filter archived runs at database level for performance (prevents fetching thousands of archived jobs)
    let query = supabase
      .from('message_jobs')
      .select(`
        *,
        sequence_runs!inner(
          id,
          lead_id,
          investor_id,
          status,
          started_at,
          created_at,
          archived_at,
          context_jsonb,
          sequence_versions(
            id,
            version_number,
            spec_jsonb,
            sequences(
              id,
              name
            )
          )
        )
      `)
      .is('sequence_runs.archived_at', null) // CRITICAL: Filter archived runs at DB level (uses index, scales to 10k+ archived runs)
      .order('scheduled_for', { ascending: false })
      .order('run_id', { ascending: true });

    if (jobType === 'sms') {
      query = query.or('job_type.is.null,job_type.eq.sms');
    } else if (jobType === 'email') {
      query = query.eq('job_type', 'email');
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
    // Use case-insensitive matching (like sequence trigger filters) to handle "Meta Ads" vs "Meta ads" etc.
    let matchingInvestorIds: Set<number> | null = null;
    if (sourceFilter) {
      const normalize = (v: any) => {
        if (v == null) return '';
        if (typeof v === 'string') return v.trim().toLowerCase();
        return String(v).toLowerCase();
      };
      const normalizedFilter = normalize(sourceFilter);
      
      // Fetch all investors and filter case-insensitively in JavaScript
      // (Supabase .eq() is case-sensitive, so we need to do this client-side)
      const { data: allInvestors } = await supabase
        .from('investors')
        .select('id, source');
      
      if (allInvestors) {
        const matching = allInvestors.filter((inv: any) => 
          normalize(inv.source) === normalizedFilter
        );
        matchingInvestorIds = new Set(matching.map((inv: any) => inv.id));
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

    // Filter by sequence if sequenceId provided
    if (sequenceId) {
      filteredData = filteredData.filter((job: any) => {
        const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
        const version = Array.isArray(run?.sequence_versions) ? run?.sequence_versions[0] : run?.sequence_versions;
        const seq = Array.isArray(version?.sequences) ? version?.sequences[0] : version?.sequences;
        return seq?.id === sequenceId;
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
    const jobs = filteredData
      .map((job: any) => {
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
      
      // NOTE: Archived runs are now filtered at database level (see query above with .is('sequence_runs.archived_at', null))
      // No need to check run?.archived_at here - archived runs won't be in the results
      // This improves performance significantly (no need to fetch and filter thousands of archived jobs)
      
      // Check if the entire sequence is globally archived (legacy check)
      if (version?.spec_jsonb?.metadata) {
        const sequenceStatus = version.spec_jsonb.metadata.status;
        if (sequenceStatus === 'archived') {
          console.log(`[message-jobs] Filtering out job ${job.id} - sequence is globally archived (status: ${sequenceStatus})`);
          return null; // Filter out jobs from globally archived sequences
        }
      } else if (version && !version.spec_jsonb) {
        // Log if we have version but no spec_jsonb (shouldn't happen but helps debug)
        console.warn(`[message-jobs] Job ${job.id} has version ${version.id} but no spec_jsonb`);
      }
      
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
      const sequenceId = sequence?.id ?? null;
      const flattenedRun = run ? {
        id: run.id,
        lead_id: run.lead_id,
        investor_id: run.investor_id,
        status: run.status,
        started_at: run.started_at,
        created_at: run.created_at,
        context_jsonb: run.context_jsonb,
        sequence_id: sequenceId,
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
    })
    .filter((job: any) => {
      if (job === null) {
        return false; // Remove null entries (globally archived sequences only - per-investor archived runs filtered at DB level)
      }
      return true;
    });
  
  // Note: Archived runs are filtered at database level, so we only log globally archived sequences here
  const globallyArchivedCount = filteredData.length - jobs.length;
  if (globallyArchivedCount > 0) {
    console.log(`[message-jobs] Filtered out ${globallyArchivedCount} job(s) from globally archived sequences`);
  }

    // Helper: resolve job type (legacy jobs may not have job_type)
    const getJobType = (j: any) => j.job_type || (j.phone_number ? 'sms' : 'email');

    // Stats: computed from FULL set (not filtered by status tab), split by SMS and Email
    const allJobs = jobs;
    const smsJobs = allJobs.filter((j: any) => getJobType(j) === 'sms');
    const emailJobs = allJobs.filter((j: any) => getJobType(j) === 'email');
    const calcStats = (arr: any[]) => ({
      total: arr.length,
      sent: arr.filter((j: any) => j.sent_at).length,
      pending: arr.filter((j: any) => !j.sent_at && new Date(j.scheduled_for) > now).length,
      failed: arr.filter((j: any) => j.error).length,
      replied: arr.filter((j: any) => j.has_replies).length,
    });
    const stats = {
      sms: calcStats(smsJobs),
      email: calcStats(emailJobs),
      total: allJobs.length,
      sent: allJobs.filter((j: any) => j.sent_at).length,
      pending: allJobs.filter((j: any) => !j.sent_at && new Date(j.scheduled_for) > now).length,
      overdue: allJobs.filter((j: any) => !j.sent_at && new Date(j.scheduled_for) <= now).length,
      failed: allJobs.filter((j: any) => j.error).length,
      anomalies: allJobs.filter((j: any) => j.is_anomaly).length,
      on_time: allJobs.filter((j: any) => j.timing_status === 'on-time').length,
      late: allJobs.filter((j: any) => j.timing_status === 'late').length,
      replied: allJobs.filter((j: any) => j.has_replies).length,
    };

    // Apply status tab filter to jobs list only (stats stay full)
    let jobsToReturn = allJobs;
    if (statusFilter === 'pending') {
      jobsToReturn = allJobs.filter((j: any) => !j.sent_at && new Date(j.scheduled_for) > now);
    } else if (statusFilter === 'sent') {
      jobsToReturn = allJobs.filter((j: any) => j.sent_at && !j.error);
    } else if (statusFilter === 'failed') {
      jobsToReturn = allJobs.filter((j: any) => j.error);
    } else if (statusFilter === 'replied') {
      jobsToReturn = allJobs.filter((j: any) => j.has_replies);
    }

    // Unique sequences for filter dropdown (from jobs + sequences table for empty state)
    const sequenceMap = new Map<string, string>();
    allJobs.forEach((j: any) => {
      const name = j.sequence_name || 'Unknown';
      const id = j.sequence_runs?.sequence_id;
      if (id && !sequenceMap.has(id)) sequenceMap.set(id, name);
    });
    if (sequenceMap.size === 0) {
      // Use getSequences to filter out archived sequences
      const { getSequences } = await import('@/lib/db');
      const seqs = await getSequences(false); // false = exclude archived
      seqs.forEach((s) => sequenceMap.set(s.id, s.name || 'Unknown'));
    }
    const availableSequences = Array.from(sequenceMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

    // Count unique investors from returned jobs
    const uniqueInvestors = new Set(
      jobsToReturn
        .map((j: any) => j.sequence_runs?.investor_id)
        .filter((id: any) => id !== null && id !== undefined)
    );

    return NextResponse.json({ 
      jobs: jobsToReturn,
      stats,
      runs: Array.from(new Set(jobsToReturn.map((j: any) => j.run_id))).length,
      investors: uniqueInvestors.size,
      availableSources: uniqueSources,
      availableSequences,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/message-jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

