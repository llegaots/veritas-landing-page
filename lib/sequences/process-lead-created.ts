/**
 * In-process lead creation handler - creates sequence runs and message jobs.
 * Call this directly from webhooks instead of HTTP fetch to avoid failures.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { SequenceSpec } from './spec';
import { compileSequenceToJobs, JobContext } from './compiler';

export interface ProcessLeadCreatedInput {
  lead_id: string;
  phone: string;
  email?: string;
  attributes?: Record<string, any>;
  org_id?: string | null;
}

export interface ProcessLeadCreatedResult {
  success: boolean;
  runs_created: number;
  run_ids: string[];
  error?: string;
  event_id?: string;
}

export async function processLeadCreated(
  input: ProcessLeadCreatedInput,
  supabase: SupabaseClient
): Promise<ProcessLeadCreatedResult> {
  const { lead_id, phone, email = '', attributes = {}, org_id } = input;

  if (!lead_id || (!phone && !email)) {
    return {
      success: false,
      runs_created: 0,
      run_ids: [],
      error: 'Missing required fields: lead_id and either phone or email',
    };
  }

  try {
    // Store the event (non-blocking - log but continue if it fails)
    const { data: event, error: eventError } = await supabase
      .from('sequence_events')
      .insert({
        org_id: org_id || null,
        type: 'lead.created',
        payload: { lead_id, phone, attributes },
      })
      .select('id')
      .single();

    if (eventError) {
      console.warn('[processLeadCreated] Could not store sequence_events (continuing):', eventError.message);
    }

    // Find active sequences
    const { data: sequences, error: seqError } = await supabase
      .from('sequences')
      .select('id, active_version_id')
      .not('active_version_id', 'is', null);

    if (seqError || !sequences?.length) {
      console.log('[processLeadCreated] No sequences with active versions:', seqError?.message || 'empty');
      return {
        success: true,
        runs_created: 0,
        run_ids: [],
        event_id: event?.id,
      };
    }

    const versionIds = sequences.map((s) => s.active_version_id).filter(Boolean) as string[];
    const { data: versions, error: versionError } = await supabase
      .from('sequence_versions')
      .select('id, spec_jsonb, sequence_id')
      .in('id', versionIds);

    if (versionError || !versions?.length) {
      console.log('[processLeadCreated] No versions found:', versionError?.message);
      return {
        success: true,
        runs_created: 0,
        run_ids: [],
        event_id: event?.id,
      };
    }

    const versionMap = new Map(versions.map((v) => [v.sequence_id, v]));
    const runsCreated: string[] = [];

    for (const sequence of sequences) {
      const version = versionMap.get(sequence.id);
      if (!version) continue;

      const spec = version.spec_jsonb as unknown as SequenceSpec;

      if (spec.metadata?.status !== 'active') continue;
      if (spec.trigger?.type !== 'lead.created') continue;

      // Apply trigger filters
      if (spec.trigger.filters) {
        let matches = true;
        for (const [key, value] of Object.entries(spec.trigger.filters)) {
          const attrVal = attributes[key];
          if (Array.isArray(value)) {
            if (!value.includes(attrVal)) {
              matches = false;
              break;
            }
          } else if (attrVal !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Check existing run
      const { data: existingRun } = await supabase
        .from('sequence_runs')
        .select('id')
        .eq('sequence_version_id', version.id)
        .eq('lead_id', lead_id.toString())
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (existingRun) continue;

      // Parse investor_id to integer if present
      let investorIdNum: number | null = null;
      if (attributes.investor_id != null) {
        const parsed = parseInt(String(attributes.investor_id), 10);
        if (!isNaN(parsed)) investorIdNum = parsed;
      }

      // Create run
      const { data: run, error: runError } = await supabase
        .from('sequence_runs')
        .insert({
          sequence_version_id: version.id,
          lead_id: lead_id.toString(),
          investor_id: investorIdNum,
          status: 'active',
          started_at: new Date().toISOString(),
          current_node_id: 'trigger',
          context_jsonb: { lead_id, phone, ...attributes },
        })
        .select('id')
        .single();

      if (runError) {
        if (runError.code === '23505') continue; // Unique violation, skip
        console.error('[processLeadCreated] Run insert error:', runError);
        continue;
      }

      if (!run) continue;

      // Compile and insert jobs
      const compileContext: JobContext = {
        lead_id,
        phone: phone || '',
        email: email || attributes.email || '',
        ...attributes,
      };
      if (!compileContext.FullName && attributes.name) {
        compileContext.FullName = attributes.name;
      }
      if (!compileContext.FirstName && attributes.name) {
        compileContext.FirstName = attributes.name.split(' ')[0] || attributes.name;
      }

      const jobs = compileSequenceToJobs(spec, run.id, compileContext);

      if (jobs.length > 0) {
        const { error: jobsError } = await supabase.from('message_jobs').insert(jobs);
        if (jobsError) {
          console.error('[processLeadCreated] Jobs insert error:', jobsError);
        }
      }

      runsCreated.push(run.id);
    }

    return {
      success: true,
      runs_created: runsCreated.length,
      run_ids: runsCreated,
      event_id: event?.id,
    };
  } catch (err) {
    console.error('[processLeadCreated] Error:', err);
    return {
      success: false,
      runs_created: 0,
      run_ids: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
