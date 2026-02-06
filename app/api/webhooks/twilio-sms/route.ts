import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

/**
 * Webhook endpoint to receive SMS replies from Twilio
 * 
 * Configure this URL in your Twilio console:
 * https://your-domain.com/api/webhooks/twilio-sms
 * 
 * Twilio will send POST requests with form data when someone replies to an SMS
 */
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form data, not JSON
    const formData = await request.formData();
    
    const fromNumber = formData.get('From') as string;
    const toNumber = formData.get('To') as string;
    const messageBody = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const accountSid = formData.get('AccountSid') as string;

    if (!fromNumber || !messageBody) {
      return NextResponse.json(
        { error: 'Missing required fields: From, Body' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the investor by phone number
    const normalizedPhone = fromNumber.replace(/\D/g, '');
    const { data: investor } = await supabase
      .from('investors')
      .select('id, phone_number')
      .or(`phone_number.eq.${fromNumber},phone_number.eq.+${fromNumber},phone_number.ilike.%${normalizedPhone}%`)
      .limit(1)
      .single();

    // Find the most recent message job sent to this number
    // Look for messages sent in the last 30 days
    // Try multiple phone formats (Twilio can send +15551234567, we may store 5551234567 or +15551234567)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messageJob } = await supabase
      .from('message_jobs')
      .select('id, phone_number, sent_at, run_id')
      .or(`phone_number.eq.${fromNumber},phone_number.eq.+${normalizedPhone},phone_number.eq.${normalizedPhone}`)
      .not('sent_at', 'is', null)
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if this is a STOP request
    const isStopRequest = /^\s*(stop|unsubscribe|opt.?out|cancel|end|quit)\s*$/i.test(messageBody.trim());
    
    if (isStopRequest) {
      console.log(`[Twilio SMS] STOP request received from ${fromNumber}`);
      
      // Log interaction and update intent score (negative)
      if (investor?.id) {
        // Log STOP interaction
        await supabase
          .from('sms_interactions')
          .insert({
            investor_id: investor.id,
            phone_number: fromNumber,
            interaction_type: 'stop',
            message_body: messageBody,
            intent_score_change: -10.0, // Negative impact
            metadata: {
              message_sid: messageSid,
              message_job_id: messageJob?.id || null,
            },
          });

        // Update investor intent score
        const { data: currentInvestor } = await supabase
          .from('investors')
          .select('intent_score')
          .eq('id', investor.id)
          .single();

        const currentScore = currentInvestor?.intent_score || 0;
        const newScore = Math.max(0, currentScore - 10); // Don't go below 0

        await supabase
          .from('investors')
          .update({
            intent_score: newScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', investor.id);

        console.log(`[Twilio SMS] Updated intent score: ${currentScore} → ${newScore} (STOP)`);
      }
      
      // Pause all active sequence runs for this investor/phone
      if (investor?.id) {
        const { data: activeRuns } = await supabase
          .from('sequence_runs')
          .select('id')
          .eq('investor_id', investor.id)
          .in('status', ['pending', 'active']);

        if (activeRuns && activeRuns.length > 0) {
          const runIds = activeRuns.map(r => r.id);
          await supabase
            .from('sequence_runs')
            .update({
              status: 'paused',
              updated_at: new Date().toISOString(),
            })
            .in('id', runIds);

          console.log(`[Twilio SMS] Paused ${runIds.length} sequence run(s) due to STOP request`);
        }
      } else if (messageJob?.run_id) {
        // If no investor found but we have a run_id, pause that specific run
        await supabase
          .from('sequence_runs')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString(),
          })
          .eq('id', messageJob.run_id)
          .in('status', ['pending', 'active']);
      }

      // Return confirmation message
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed. You will no longer receive messages from us.</Message>
</Response>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      );
    }

    // Insert the reply (for non-STOP messages)
    const { data: reply, error: replyError } = await supabase
      .from('sms_replies')
      .insert({
        message_job_id: messageJob?.id || null,
        phone_number: fromNumber,
        message_body: messageBody,
        from_number: fromNumber,
        provider_message_id: messageSid,
        provider_status: 'received',
        investor_id: investor?.id || null,
      })
      .select()
      .single();

    if (replyError) {
      console.error('Error inserting SMS reply:', replyError);
      return NextResponse.json(
        { error: 'Failed to save reply', details: replyError.message },
        { status: 500 }
      );
    }

    // Log interaction and update intent score (positive for replies)
    if (investor?.id) {
      // Log reply interaction
      await supabase
        .from('sms_interactions')
        .insert({
          investor_id: investor.id,
          phone_number: fromNumber,
          interaction_type: 'reply',
          message_body: messageBody,
          intent_score_change: 5.0, // Positive impact
          metadata: {
            message_sid: messageSid,
            message_job_id: messageJob?.id || null,
            reply_id: reply.id,
          },
        });

      // Update investor intent score
      const { data: currentInvestor } = await supabase
        .from('investors')
        .select('intent_score')
        .eq('id', investor.id)
        .single();

      const currentScore = currentInvestor?.intent_score || 0;
      const newScore = currentScore + 5; // Positive boost

      await supabase
        .from('investors')
        .update({
          intent_score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', investor.id);

      console.log(`[Twilio SMS] Updated intent score: ${currentScore} → ${newScore} (Reply)`);
    }

    // Update the message_job to mark it as replied (if we found one)
    if (messageJob?.id) {
      await supabase
        .from('message_jobs')
        .update({ replied_at: new Date().toISOString() })
        .eq('id', messageJob.id);
    }

    // Pause the sequence run when someone replies (so we don't keep auto-sending)
    if (investor?.id) {
      const { data: activeRuns } = await supabase
        .from('sequence_runs')
        .select('id')
        .eq('investor_id', investor.id)
        .in('status', ['pending', 'active']);

      if (activeRuns && activeRuns.length > 0) {
        const runIds = activeRuns.map((r: { id: string }) => r.id);
        await supabase
          .from('sequence_runs')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .in('id', runIds);
        console.log(`[Twilio SMS] Paused ${runIds.length} sequence run(s) due to reply`);
      }
    } else if (messageJob?.run_id) {
      await supabase
        .from('sequence_runs')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', messageJob.run_id)
        .in('status', ['pending', 'active']);
      console.log(`[Twilio SMS] Paused sequence run ${messageJob.run_id} due to reply`);
    }

    // Return TwiML response (Twilio expects this)
    // You can customize this to send an auto-reply if needed
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Reply received and logged -->
</Response>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Error processing Twilio SMS webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for testing the webhook endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Twilio SMS webhook endpoint',
    instructions: 'Configure this URL in your Twilio console to receive SMS replies',
    url: '/api/webhooks/twilio-sms',
  });
}

