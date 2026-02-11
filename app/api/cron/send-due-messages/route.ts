import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSms } from '@/lib/sms/provider';
import { sendEmail } from '@/lib/email/provider';
import { isWithinSendingWindow } from '@/lib/sequences/send-window';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

// Runtime env validation - only check inside request handlers
function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return { supabaseUrl, supabaseServiceKey };
}

// Verify this is called by Vercel Cron
function verifyCronAuth(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check if this is from Vercel Cron - if so, trust it
  // Vercel Cron sends "vercel-cron/1.0" as the user agent
  const isVercelCron = userAgent.includes('vercel-cron');
  
  if (isVercelCron) {
    console.log('[Cron Auth] ✅ Allowing Vercel Cron request (User-Agent:', userAgent, ')');
    return true;
  }
  
  // For non-Vercel requests, check secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  
  if (cronSecret && authHeader) {
    const matches = authHeader === `Bearer ${cronSecret}`;
    if (matches) {
      console.log('[Cron Auth] ✅ Allowing request with matching secret');
      return true;
    }
  }
  
  // In development, allow if no secret is set
  if (process.env.NODE_ENV === 'development') {
    console.log('[Cron Auth] ✅ Allowing (development mode)');
    return true;
  }
  
  console.log('[Cron Auth] ❌ Rejecting - not from Vercel Cron and no valid secret');
  return false;
}

export async function GET(request: NextRequest) {
  // Verify cron authentication
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get env vars at runtime (not module scope)
  let supabaseUrl: string;
  let supabaseServiceKey: string;
  try {
    const env = getSupabaseEnv();
    supabaseUrl = env.supabaseUrl;
    supabaseServiceKey = env.supabaseServiceKey;
  } catch (error) {
    console.error('Missing Supabase environment variables:', error);
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const isWithinWindow = isWithinSendingWindow(now);

  // Log window status but don't block - we'll check for overdue messages
  if (!isWithinWindow) {
    console.log(`[Cron] Outside sending window (9 AM - 7 PM Eastern). Current time (Eastern): ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}. Will still process overdue messages.`);
  }

  try {
    // Use FOR UPDATE SKIP LOCKED to prevent double-sends
    // Note: Supabase doesn't support SKIP LOCKED directly, so we'll use a transaction approach
    // IMPORTANT: Only send messages that are actually due (scheduled_for <= now)
    // This ensures messages with delays are sent at the correct time
    // Add a small buffer (5 seconds) to account for clock skew and processing time
    const bufferMs = 5000; // 5 seconds
    const dueTime = new Date(now.getTime() + bufferMs).toISOString();
    
    // Get due jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('message_jobs')
      .select(`
        *,
        sequence_runs!inner(
          id,
          status,
          investor_id
        )
      `)
      .is('sent_at', null) // Not yet sent (use .is() for null checks)
      .lte('scheduled_for', dueTime) // Due now or past (with small buffer)
      .order('scheduled_for', { ascending: true }) // Process in chronological order
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching due jobs:', fetchError);
      console.error('Error details:', JSON.stringify(fetchError, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to fetch jobs',
          details: fetchError.message || String(fetchError),
          code: fetchError.code,
        },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log(`[Cron] No due messages found (checked up to ${dueTime})`);
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No due messages',
      });
    }

    console.log(`[Cron] Found ${jobs.length} due message job(s) to process`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each job
    for (const job of jobs) {
      try {
        // Check if sequence run is paused - skip if paused
        const run = Array.isArray(job.sequence_runs) ? job.sequence_runs[0] : job.sequence_runs;
        if (!run) {
          console.log(`[Cron] ⚠️ Skipping job ${job.id} - no sequence run found`);
          results.errors.push(`Job ${job.id}: No sequence run found`);
          continue;
        }
        if (run.status !== 'active') {
          console.log(`[Cron] ⏸️ Skipping job ${job.id} - sequence run ${run.id} is ${run.status} (not active)`);
          results.errors.push(`Job ${job.id}: Sequence run is ${run.status}`);
          continue;
        }

        // If investor status is "Interested", pause the run and skip - STOP sending
        if (run?.investor_id) {
          const { data: investor } = await supabase
            .from('investors')
            .select('id, status')
            .eq('id', run.investor_id)
            .single();
          const investorStatus = (investor?.status || '').toLowerCase().trim();
          if (investorStatus === 'interested') {
            await supabase
              .from('sequence_runs')
              .update({ status: 'paused', updated_at: new Date().toISOString() })
              .eq('id', run.id)
              .in('status', ['pending', 'active']);
            console.log(`[Cron] Skipping job ${job.id} - investor ${run.investor_id} status is "Interested". Sequence run ${run.id} paused.`);
            continue;
          }
        }
        
        // Double-check that this job is actually due (defensive check)
        const scheduledTime = new Date(job.scheduled_for);
        const currentTime = new Date();
        
        // Skip if scheduled for the future (shouldn't happen due to query, but be safe)
        // Allow a small buffer (5 seconds) for clock skew
        const timeDiff = scheduledTime.getTime() - currentTime.getTime();
        if (timeDiff > 5000) {
          console.log(`[Cron] Skipping job ${job.id} - scheduled for future: ${job.scheduled_for} (${Math.round(timeDiff / 1000)}s ahead)`);
          continue;
        }
        
        // Check if message is overdue (more than 1 hour past scheduled time)
        const overdueByMs = currentTime.getTime() - scheduledTime.getTime();
        const overdueByHours = overdueByMs / (1000 * 60 * 60);
        const isOverdue = overdueByHours > 1;
        
        // If outside sending window, only send overdue messages (more than 1 hour late)
        if (!isWithinWindow && !isOverdue) {
          console.log(`[Cron] Skipping job ${job.id} - outside sending window and not overdue (scheduled: ${job.scheduled_for}, overdue by: ${Math.round(overdueByHours * 10) / 10}h)`);
          continue;
        }
        
        if (isOverdue && !isWithinWindow) {
          console.log(`[Cron] Processing overdue job ${job.id} outside sending window (overdue by ${Math.round(overdueByHours * 10) / 10}h)`);
        }
        
        // Mark as processing (optimistic lock)
        const { error: lockError } = await supabase
          .from('message_jobs')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', job.id)
          .is('sent_at', null); // Only if still unsent (use .is() for null checks)

        if (lockError) {
          // Another worker got it first
          console.log(`[Cron] Job ${job.id} already processed by another worker`);
          continue;
        }

        const delaySeconds = Math.round((currentTime.getTime() - scheduledTime.getTime()) / 1000);
        console.log(`[Cron] Sending job ${job.id} (type: ${job.job_type || 'sms'}, run_id: ${job.run_id}, node_id: ${job.node_id}) scheduled for ${job.scheduled_for} (delay: ${delaySeconds}s, ${delaySeconds > 0 ? 'LATE' : delaySeconds < -5 ? 'EARLY' : 'ON-TIME'})`);

        // Determine job type (default to 'sms' for backward compatibility)
        const jobType = job.job_type || 'sms';
        let sendResult;

        if (jobType === 'email') {
          // Send Email
          if (!job.email_address || !job.email_subject) {
            throw new Error('Email job missing required fields: email_address or email_subject');
          }

          // Check if this is a text-only email or HTML email
          const isTextOnly = !job.email_html || job.email_html.trim().length === 0;
          const hasText = job.email_text && job.email_text.trim().length > 0;

          if (isTextOnly && !hasText) {
            throw new Error('Email job must have either HTML content or text content');
          }

          if (isTextOnly) {
            // Text-only email
            console.log(`[Cron] Email job ${job.id} is text-only`);
            console.log(`[Cron] Text content length: ${job.email_text?.length || 0} chars`);
            console.log(`[Cron] Text preview (first 200): ${job.email_text?.substring(0, 200) || ''}`);

            sendResult = await sendEmail({
              to: job.email_address,
              subject: job.email_subject,
              text: job.email_text!,
              metadata: {
                job_id: job.id,
                run_id: job.run_id,
                node_id: job.node_id,
              },
            });
          } else {
            // HTML email (with optional text fallback)
            const htmlLength = job.email_html?.length || 0;
            const htmlPreview = job.email_html?.substring(0, 500) || '';
            const htmlEndPreview = job.email_html?.substring(Math.max(0, htmlLength - 500)) || '';
            const brCount = (job.email_html?.match(/<br\s*\/?>/gi) || []).length;
            const pCount = (job.email_html?.match(/<p[\s>]/gi) || []).length;
            console.log(`[Cron] Email job ${job.id} is HTML email`);
            console.log(`[Cron] HTML content length: ${htmlLength} chars`);
            console.log(`[Cron] HTML has ${brCount} <br> tags`);
            console.log(`[Cron] HTML has ${pCount} <p> tags`);
            console.log(`[Cron] HTML preview (first 500): ${htmlPreview}`);
            console.log(`[Cron] HTML preview (last 500): ${htmlEndPreview}`);

            sendResult = await sendEmail({
              to: job.email_address,
              subject: job.email_subject,
              html: job.email_html!,
              text: job.email_text || undefined,
              metadata: {
                job_id: job.id,
                run_id: job.run_id,
                node_id: job.node_id,
              },
            });
          }
        } else {
          // Send SMS (default)
          if (!job.phone_number || !job.message_text) {
            throw new Error('SMS job missing required fields: phone_number or message_text');
          }

          sendResult = await sendSms({
            to: job.phone_number,
            body: job.message_text,
            metadata: {
              job_id: job.id,
              run_id: job.run_id,
              node_id: job.node_id,
            },
          });
        }

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

