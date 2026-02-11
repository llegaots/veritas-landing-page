import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

/**
 * Webhook endpoint to receive Calendly booking events
 * 
 * Configure this URL in your Calendly webhook settings:
 * https://your-domain.com/api/webhooks/calendly
 * 
 * Calendly will send POST requests when events are scheduled/cancelled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Calendly webhook payload structure
    const event = body.event || body.name; // 'invitee.created' or 'invitee.canceled'
    const payload = body.payload || body;
    
    // Extract invitee information
    const invitee = payload.invitee || payload;
    const email = invitee.email || invitee.email_address;
    const name = invitee.name || `${invitee.first_name || ''} ${invitee.last_name || ''}`.trim();
    const phone = invitee.phone_number || invitee.phone;
    const eventUri = payload.event_uri || invitee.event;
    const scheduledEvent = payload.event || {};
    const startTime = scheduledEvent.start_time || invitee.scheduled_event?.start_time;
    
    console.log('[Calendly Webhook] Received event:', {
      event,
      email,
      name,
      phone,
      startTime,
    });

    if (!email && !phone) {
      console.warn('[Calendly Webhook] No email or phone found in payload');
      return NextResponse.json({ 
        received: true,
        message: 'No email or phone found' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle booking created
    if (event === 'invitee.created' || event === 'calendly.event_scheduled') {
      // Find investor by email or phone
      let investorId: number | null = null;
      
      if (email) {
        const { data: investorByEmail } = await supabase
          .from('investors')
          .select('id')
          .eq('email_address', email)
          .limit(1)
          .single();
        
        if (investorByEmail) {
          investorId = investorByEmail.id;
        }
      }
      
      if (!investorId && phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        const { data: investorByPhone } = await supabase
          .from('investors')
          .select('id, phone_number')
          .or(`phone_number.eq.${phone},phone_number.eq.+${phone},phone_number.ilike.%${normalizedPhone}%`)
          .limit(1)
          .single();
        
        if (investorByPhone) {
          investorId = investorByPhone.id;
        }
      }

      if (investorId) {
        const bookingDate = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
        
        // Update investor with booking information
        await supabase
          .from('investors')
          .update({
            calendly_booking_date: bookingDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', investorId);

        // Log interaction and update intent score (very positive for Calendly booking)
        const { data: currentInvestor } = await supabase
          .from('investors')
          .select('intent_score, phone_number')
          .eq('id', investorId)
          .single();

        const currentScore = currentInvestor?.intent_score || 0;
        const newScore = currentScore + 15.0; // Very positive boost for booking

        await supabase
          .from('investors')
          .update({
            intent_score: newScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', investorId);

        // Log Calendly booking interaction
        await supabase
          .from('sms_interactions')
          .insert({
            investor_id: investorId,
            phone_number: currentInvestor?.phone_number || phone || '',
            interaction_type: 'calendly_booking',
            intent_score_change: 15.0,
            metadata: {
              email: email,
              name: name,
              event_uri: eventUri,
              start_time: startTime,
            },
          });

        console.log(`[Calendly Webhook] Updated intent score: ${currentScore} → ${newScore} (Calendly Booking)`);

        // Note: We no longer auto-pause runs when someone books a Calendly call
        // Runs continue automatically unless manually paused by the user
        console.log(`[Calendly Webhook] Booking received for investor ${investorId} - sequences will continue automatically`);

        return NextResponse.json({
          success: true,
          message: 'Booking processed - sequences will continue automatically',
          investor_id: investorId,
        });
      } else {
        console.log('[Calendly Webhook] Investor not found, booking recorded but no sequences to pause');
        return NextResponse.json({
          success: true,
          message: 'Booking received but investor not found in database',
        });
      }
    }

    // Handle booking canceled
    if (event === 'invitee.canceled' || event === 'calendly.event_canceled') {
      // Optionally resume sequences if booking is canceled
      // For now, we'll leave them paused
      return NextResponse.json({
        success: true,
        message: 'Booking cancellation received',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      event,
    });
  } catch (error) {
    console.error('Error processing Calendly webhook:', error);
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
    message: 'Calendly webhook endpoint',
    instructions: 'Configure this URL in your Calendly webhook settings to receive booking events',
    url: '/api/webhooks/calendly',
  });
}

