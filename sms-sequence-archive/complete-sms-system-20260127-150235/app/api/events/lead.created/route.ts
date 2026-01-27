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
    const { lead_id, phone, attributes = {}, org_id } = body;

    if (!lead_id || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, phone' },
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

      // Check if trigger matches
      if (spec.trigger.type !== 'lead.created') {
        continue;
      }

      // Apply trigger filters if any
      if (spec.trigger.filters) {
        let matches = true;
        for (const [key, value] of Object.entries(spec.trigger.filters)) {
          if (attributes[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Create sequence run
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
        console.error('Error creating run:', runError);
        continue;
      }

      // Compile sequence to jobs
      const jobs = compileSequenceToJobs(spec, run.id, {
        lead_id,
        phone,
        ...attributes,
      });

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

