import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processLeadCreated } from '@/lib/sequences/process-lead-created';

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

/**
 * Webhook endpoint to receive new investor data
 * Triggers SMS sequence automatically for investors with status "New Lead"
 * 
 * This can be called from:
 * - Airtable webhooks
 * - External CRM systems
 * - Manual investor import scripts
 * - Any system that creates investors
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication
    const webhookSecret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD || 'veritas2024admin';
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Support both direct investor object and Airtable webhook format
    const investor = body.investor || body.fields || body;
    
    // Debug logging to see what we received
    console.log('[investor-created] Received body keys:', Object.keys(body));
    console.log('[investor-created] Investor object keys:', Object.keys(investor));
    console.log('[investor-created] Status field raw value:', JSON.stringify(investor.status || investor['Status'] || investor['SMS Status']));
    console.log('[investor-created] All status-related fields:', {
      status: investor.status,
      'Status': investor['Status'],
      'SMS Status': investor['SMS Status'],
    });
    
    // Extract investor data
    // Helper to extract string from Airtable select fields (objects with .name property)
    const extractString = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && value.length > 0) {
        return typeof value[0] === 'string' ? value[0] : value[0]?.name || null;
      }
      if (typeof value === 'object' && value.name) {
        return value.name;
      }
      return String(value);
    };

    // Try multiple status field variations
    const rawStatus = investor.status || investor['Status'] || investor['SMS Status'] || investor['Lead Status'];
    const extractedStatus = extractString(rawStatus);
    
    console.log('[investor-created] Raw status:', JSON.stringify(rawStatus));
    console.log('[investor-created] Extracted status:', extractedStatus);

    // Get Supabase client
    const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Field mapping from Airtable to Supabase
    const fieldMappings: Record<string, string> = {
      'Investor Name': 'investor_name',
      'Email Address': 'email_address',
      'Phone Number': 'phone_number',
      'Status': 'status',
      'Investor Type': 'investor_type',
      'Liquid Ready': 'liquid_ready',
      'Ready for Follow Up': 'ready_for_follow_up',
      'Amount ($)': 'amount_dollars',
      'Amount$': 'amount_dollars',
      'Deal': 'deal',
      'Source': 'source',
      'Investor Notes': 'investor_notes',
      'Created Time': 'created_time',
      'Property Name': 'property_name',
    };

    // Helper to extract value from Airtable fields
    const extractValue = (value: any, isDate = false, isNumber = false): any => {
      if (!value) return null;
      if (typeof value === 'string') {
        if (isDate) return new Date(value).toISOString();
        if (isNumber) {
          const cleaned = value.replace(/[$,]/g, '');
          return parseFloat(cleaned) || 0;
        }
        return value;
      }
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first.name) return first.name;
        return typeof first === 'string' ? first : String(first);
      }
      if (typeof value === 'object' && value.name) {
        return value.name;
      }
      if (isNumber && typeof value === 'number') return value;
      return String(value);
    };

    // Map Airtable fields to Supabase format
    const airtableId = investor.id || investor.airtable_id || investor.investor_id;
    if (!airtableId) {
      return NextResponse.json(
        { error: 'Missing required field: id or airtable_id' },
        { status: 400 }
      );
    }

    const mappedRecord: any = {
      airtable_id: airtableId,
    };

    // Map all fields from Airtable format
    Object.entries(fieldMappings).forEach(([airtableField, supabaseColumn]) => {
      const value = investor[airtableField];
      if (value !== undefined && value !== null) {
        if (supabaseColumn === 'created_time') {
          mappedRecord[supabaseColumn] = extractValue(value, true);
        } else if (supabaseColumn === 'amount_dollars') {
          mappedRecord[supabaseColumn] = extractValue(value, false, true);
        } else {
          mappedRecord[supabaseColumn] = extractValue(value);
        }
      }
    });

    // Also try direct field names (for non-Airtable formats)
    if (!mappedRecord.investor_name) {
      mappedRecord.investor_name = extractString(investor.investor_name || investor.name || investor['Investor Name']);
    }
    if (!mappedRecord.phone_number) {
      mappedRecord.phone_number = extractString(investor.phone_number || investor.phone || investor['Phone Number']);
    }
    if (!mappedRecord.email_address) {
      mappedRecord.email_address = extractString(investor.email_address || investor.email || investor['Email Address']);
    }
    if (!mappedRecord.status) {
      mappedRecord.status = extractedStatus;
    }
    if (!mappedRecord.source) {
      mappedRecord.source = extractString(investor.source || investor['Source']);
    }

    // Validate required fields
    if (!mappedRecord.phone_number) {
      return NextResponse.json(
        { error: 'Missing required field: phone_number' },
        { status: 400 }
      );
    }

    // Check if investor already exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id, status')
      .eq('airtable_id', airtableId)
      .single();

    let investorId: number;
    const wasNewRecord = !existing;

    if (existing) {
      // Update existing record
      const { id, ...updateData } = mappedRecord;
      const { data: updated, error: updateError } = await supabase
        .from('investors')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[investor-created] Error updating investor:', updateError);
        return NextResponse.json(
          { error: `Failed to update investor: ${updateError.message}` },
          { status: 500 }
        );
      }

      investorId = updated.id;
      console.log('[investor-created] Updated existing investor:', investorId);
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from('investors')
        .insert(mappedRecord)
        .select('id')
        .single();

      if (insertError) {
        console.error('[investor-created] Error inserting investor:', insertError);
        return NextResponse.json(
          { error: `Failed to insert investor: ${insertError.message}` },
          { status: 500 }
        );
      }

      investorId = inserted.id;
      console.log('[investor-created] Created new investor:', investorId);
    }

    // Prepare investor data for SMS trigger (include source for audience filtering)
    const investorData = {
      id: investorId.toString(),
      investor_name: mappedRecord.investor_name,
      phone_number: mappedRecord.phone_number,
      email_address: mappedRecord.email_address,
      status: mappedRecord.status,
      property_name: mappedRecord.property_name || mappedRecord.deal,
      source: mappedRecord.source || null,
    };

    // Only trigger SMS for investors with status "New Lead"
    const status = investorData.status?.toLowerCase().trim();
    if (status !== 'new lead') {
      return NextResponse.json({
        success: true,
        message: `Investor status is "${investorData.status}", not "New Lead". SMS sequence not triggered.`,
        skipped: true,
        investor_id: investorId,
        was_new_record: wasNewRecord,
      });
    }

    // Process lead created in-process (no HTTP fetch - more reliable)
    console.log('[investor-created] Processing lead.created for investor:', {
      id: investorData.id,
      phone: investorData.phone_number,
      status: investorData.status,
    });

    const result = await processLeadCreated(
      {
        lead_id: `investor_${investorData.id}`,
        phone: investorData.phone_number,
        email: investorData.email_address || undefined,
        attributes: {
          investor_id: investorData.id,
          FirstName: investorData.investor_name?.split(' ')[0] || 'Investor',
          FullName: investorData.investor_name || 'Investor',
          PropertyName: investorData.property_name || 'Horizontal Parks',
          CalendarLink: 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call',
          source: investorData.source ?? undefined,
        },
      },
      supabase
    );

    console.log('[investor-created] Result:', result);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create SMS jobs', investor_id: investorData.id },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Investor synced and SMS sequence triggered successfully',
      investor_id: investorId,
      was_new_record: wasNewRecord,
      runs_created: result.runs_created || 0,
    });
  } catch (error) {
    console.error('Error processing investor webhook:', error);
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
    message: 'Investor created webhook endpoint is active',
    method: 'POST',
    url: '/api/webhooks/investor-created',
    headers_required: {
      'Content-Type': 'application/json',
      'x-webhook-secret': 'veritas2024admin',
    },
    body_format: {
      fields: {
        id: 'Airtable record ID',
        'Investor Name': 'Investor name',
        'Phone Number': 'Phone number (required)',
        'Email Address': 'Email address',
        'Status': 'Status (e.g., "New Lead")',
        'Source': 'Source',
        // ... other fields
      },
    },
  });
}

