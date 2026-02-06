import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveVersion } from '@/lib/db';
import { SequenceSpec } from '@/lib/sequences/spec';
import { compileSequenceToJobs } from '@/lib/sequences/compiler';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify webhook signature or org secret
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD;
  
  if (!expectedSecret) {
    // In development, allow if no secret is set
    return process.env.NODE_ENV === 'development';
  }
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    return token === expectedSecret;
  }
  
  // Also check query param for convenience
  const key = request.nextUrl.searchParams.get('key');
  return key === expectedSecret;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lead_id, phone, email, attributes = {}, org_id } = body;

    if (!lead_id || (!phone && !email)) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id and either phone or email' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the event in sequence_events table
    const { data: event, error: eventError } = await supabase
      .from('sequence_events')
      .insert({
        org_id: org_id || null,
        type: 'lead.created',
        payload: {
          lead_id,
          phone,
          attributes,
        },
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error storing event:', eventError);
      return NextResponse.json(
        { error: 'Failed to store event' },
        { status: 500 }
      );
    }

    // Find active sequences for this trigger
    // First get sequences with active versions
    const { data: sequences, error: seqError } = await supabase
      .from('sequences')
      .select('id, active_version_id')
      .not('active_version_id', 'is', null);

    if (seqError || !sequences) {
      console.error('Error fetching sequences:', seqError);
      return NextResponse.json(
        { error: 'Failed to fetch sequences' },
        { status: 500 }
      );
    }

    // Then fetch the versions
    const versionIds = sequences.map((s) => s.active_version_id).filter(Boolean) as string[];
    const { data: versions, error: versionError } = await supabase
      .from('sequence_versions')
      .select('id, spec_jsonb, sequence_id')
      .in('id', versionIds);

    if (versionError || !versions) {
      console.error('Error fetching versions:', versionError);
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }

    const runsCreated: string[] = [];

    // Create a map of sequence_id -> version
    const versionMap = new Map(versions.map((v) => [v.sequence_id, v]));

    // For each matching sequence, create a run and compile jobs
    for (const sequence of sequences) {
      const version = versionMap.get(sequence.id);
      if (!version) continue;

      const spec = version.spec_jsonb as unknown as SequenceSpec;

      // IMPORTANT: Only trigger sequences with status "active" (not "draft" or "archived")
      const sequenceStatus = spec.metadata?.status;
      console.log(`[lead.created] Checking sequence ${sequence.id} (${spec.metadata?.name || 'unnamed'}): status="${sequenceStatus}"`);
      
      if (sequenceStatus !== 'active') {
        console.log(`[lead.created] ⏭️  Skipping sequence ${sequence.id} - status is "${sequenceStatus || 'unknown'}" (not active)`);
        continue;
      }

      console.log(`[lead.created] ✅ Sequence ${sequence.id} is active, checking trigger...`);

      // Check if trigger matches
      if (spec.trigger.type !== 'lead.created') {
        console.log(`[lead.created] ⏭️  Skipping sequence ${sequence.id} - trigger type is "${spec.trigger.type}" (not "lead.created")`);
        continue;
      }

      console.log(`[lead.created] ✅ Sequence ${sequence.id} trigger matches, creating run...`);

      // Apply trigger filters if any (supports exact match and array "one of" match)
      // String comparison is case-insensitive to handle "Meta Ads" vs "Meta ads" etc.
      if (spec.trigger.filters) {
        let matches = true;
        for (const [key, value] of Object.entries(spec.trigger.filters)) {
          const attrVal = attributes[key];
          const normalize = (v: any) => {
            if (v == null) return '';
            if (typeof v === 'string') return v.trim().toLowerCase();
            return String(v).toLowerCase();
          };
          if (Array.isArray(value)) {
            const normalizedValues = value.map(normalize);
            const normalizedAttr = normalize(attrVal);
            if (!normalizedValues.some((v) => String(v) === String(normalizedAttr))) {
              matches = false;
              break;
            }
          } else if (normalize(attrVal) !== normalize(value)) {
            matches = false;
            break;
          }
        }
        if (!matches) {
          console.log(`[lead.created] ⏭️  Skipping sequence ${sequence.id} - trigger filters don't match (attributes: ${JSON.stringify(attributes)}, filters: ${JSON.stringify(spec.trigger.filters)})`);
          continue;
        }
      }

      // Check if a run already exists for this lead + sequence combination
      // This prevents duplicate runs if the webhook is called multiple times
      const { data: existingRun } = await supabase
        .from('sequence_runs')
        .select('id')
        .eq('sequence_version_id', version.id)
        .eq('lead_id', lead_id.toString())
        .eq('status', 'active')
        .limit(1)
        .single();
      
      if (existingRun) {
        console.log(`[lead.created] ⏭️  Skipping sequence ${sequence.id} - run already exists for this lead (run_id: ${existingRun.id})`);
        continue;
      }

      // Create sequence run (unique index on sequence_version_id+lead_id prevents race-condition duplicates)
      console.log(`[lead.created] 🚀 Creating run for sequence ${sequence.id} (${spec.metadata?.name || 'unnamed'})`);
      const { data: run, error: runError } = await supabase
        .from('sequence_runs')
        .insert({
          sequence_version_id: version.id,
          lead_id: lead_id.toString(),
          investor_id: attributes.investor_id || null,
          status: 'active',
          started_at: new Date().toISOString(),
          current_node_id: 'trigger',
          context_jsonb: {
            lead_id,
            phone,
            ...attributes,
          },
        })
        .select()
        .single();

      if (runError) {
        // Unique violation = another request already created this run, skip (avoids duplicate jobs)
        if (runError.code === '23505') {
          console.log(`[lead.created] ⏭️  Skipping sequence ${sequence.id} - run already exists (race condition)`);
          continue;
        }
        console.error('Error creating run:', runError);
        continue;
      }

      // Compile sequence to jobs
      // Ensure FullName is available if name is in attributes
      const compileContext = {
        lead_id,
        phone: phone || '',
        email: email || attributes.email || '',
        ...attributes,
      };
      
      // Add FullName if not already present but name is available
      if (!compileContext.FullName && attributes.name) {
        compileContext.FullName = attributes.name;
      }
      // Also ensure FirstName is available
      if (!compileContext.FirstName && attributes.name) {
        compileContext.FirstName = attributes.name.split(' ')[0] || attributes.name;
      }
      
      const jobs = compileSequenceToJobs(spec, run.id, compileContext);

      // Insert jobs
      if (jobs.length > 0) {
        const { error: jobsError } = await supabase
          .from('message_jobs')
          .insert(jobs);

        if (jobsError) {
          console.error('Error creating jobs:', jobsError);
          // Continue even if jobs fail - run is created
        }
      }

      runsCreated.push(run.id);
    }

    return NextResponse.json({
      success: true,
      event_id: event.id,
      runs_created: runsCreated.length,
      run_ids: runsCreated,
    });
  } catch (error) {
    console.error('Error processing lead.created event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

