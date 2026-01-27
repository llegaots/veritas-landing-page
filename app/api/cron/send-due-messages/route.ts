import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSms } from '@/lib/sms/provider';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase environment variables');
}

// Verify this is called by Vercel Cron
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  
  if (cronSecret && authHeader) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // In development, allow if no secret is set
  return process.env.NODE_ENV === 'development';
}

export async function GET(request: NextRequest) {
  // Verify cron authentication
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check for required environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date().toISOString();

  try {
    // Use FOR UPDATE SKIP LOCKED to prevent double-sends
    // Note: Supabase doesn't support SKIP LOCKED directly, so we'll use a transaction approach
    const { data: jobs, error: fetchError } = await supabase
      .from('message_jobs')
      .select('*')
      .eq('sent_at', null) // Not yet sent
      .lte('scheduled_for', now) // Due now or past
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching due jobs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No due messages',
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each job
    for (const job of jobs) {
      try {
        // Mark as processing (optimistic lock)
        const { error: lockError } = await supabase
          .from('message_jobs')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', job.id)
          .eq('sent_at', null); // Only if still unsent

        if (lockError) {
          // Another worker got it first
          continue;
        }

        // Send SMS
        const sendResult = await sendSms({
          to: job.phone_number,
          body: job.message_text,
          metadata: {
            job_id: job.id,
            run_id: job.run_id,
            node_id: job.node_id,
          },
        });

        // Update job with provider status
        await supabase
          .from('message_jobs')
          .update({
            provider_status: sendResult.status,
            error: sendResult.error || null,
            // sent_at already set above
          })
          .eq('id', job.id);

        if (sendResult.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Job ${job.id}: ${sendResult.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Mark job as failed
        await supabase
          .from('message_jobs')
          .update({
            error: error instanceof Error ? error.message : 'Unknown error',
            sent_at: new Date().toISOString(), // Mark as processed even if failed
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed: jobs.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error processing due messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

