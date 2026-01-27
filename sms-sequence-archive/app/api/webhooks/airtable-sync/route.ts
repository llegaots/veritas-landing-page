import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
 * Webhook endpoint to sync Airtable investor data to Supabase
 * 
 * This endpoint receives webhooks from Airtable when:
 * - A new record is created
 * - A record is updated
 * - A record is deleted
 * 
 * It automatically syncs the data to the Supabase investors table
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication
    const webhookSecret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD || 'veritas2024admin';
    
    // Log for debugging (remove in production)
    console.log('Webhook received:', {
      method: request.method,
      hasSecret: !!webhookSecret,
      secretMatch: webhookSecret === expectedSecret,
    });
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.error('Webhook authentication failed:', {
        received: webhookSecret,
        expected: expectedSecret,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    // Get env vars at runtime (not module scope)
    const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log received data for debugging
    console.log('Webhook body received:', JSON.stringify(body, null, 2));

    // Airtable can send data in different formats
    // Format 1: Direct event and records
    // Format 2: Nested in payload
    // Format 3: Airtable automation format with fields
    const event = body.event || body.payload?.event || (body.records ? 'records.create' : null);
    const records = body.records || body.payload?.records || (body.fields ? [{ id: body.id || 'unknown', fields: body.fields }] : []);

    if (!event || records.length === 0) {
      console.log('No records to process:', { event, recordsCount: records.length });
      return NextResponse.json({
        success: true,
        message: 'No records to process',
        received_body: body,
      });
    }

    const results = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[],
    };

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
      'Deal': 'deal',
      'Source': 'source',
      'Investor Notes': 'investor_notes',
      'Created Time': 'created_time',
      'Property Name': 'property_name',
    };

    // Helper to map Airtable record to Supabase format
    const mapAirtableRecord = (airtableRecord: any) => {
      const mapped: any = {
        airtable_id: airtableRecord.id,
      };

      const fields = airtableRecord.fields || {};

      // Map all fields
      Object.entries(fieldMappings).forEach(([airtableField, supabaseColumn]) => {
        const value = fields[airtableField];
        if (value !== undefined && value !== null) {
          // Handle date/timestamp fields
          if (supabaseColumn === 'created_time' && value) {
            mapped[supabaseColumn] = new Date(value).toISOString();
          }
          // Handle number fields (remove $ and commas)
          else if (supabaseColumn === 'amount_dollars' && value) {
            const cleaned = String(value).replace(/[$,]/g, '');
            mapped[supabaseColumn] = parseFloat(cleaned) || 0;
          }
          // Handle select/single select fields (convert array to string)
          else if (Array.isArray(value)) {
            mapped[supabaseColumn] = value.join(', ');
          }
          // Handle object fields (convert to string)
          else if (typeof value === 'object' && value !== null) {
            mapped[supabaseColumn] = String(value);
          }
          else {
            mapped[supabaseColumn] = value;
          }
        }
      });

      return mapped;
    };

    // Process each record based on event type
    for (const record of records) {
      try {
        if (event === 'records.create' || event === 'records.update') {
          const mappedRecord = mapAirtableRecord(record);

          // Check if record exists by airtable_id
          const { data: existing } = await supabase
            .from('investors')
            .select('id')
            .eq('airtable_id', mappedRecord.airtable_id)
            .single();

          if (existing) {
            // Update existing record
            const { id, ...updateData } = mappedRecord;
            const { error } = await supabase
              .from('investors')
              .update({
                ...updateData,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (error) {
              results.errors.push(`Update failed for ${mappedRecord.airtable_id}: ${error.message}`);
            } else {
              results.updated++;
              
              // Trigger SMS if status changed to "New Lead"
              if (mappedRecord.status?.toLowerCase().trim() === 'new lead' && mappedRecord.phone_number) {
                // Only trigger if this is a new record or status just changed to "New Lead"
                const { data: oldRecord } = await supabase
                  .from('investors')
                  .select('status')
                  .eq('id', existing.id)
                  .single();
                
                // Trigger SMS if status is now "New Lead" (either new record or status changed)
                if (event === 'records.create' || oldRecord?.status?.toLowerCase().trim() !== 'new lead') {
                  await triggerSmsForInvestor(mappedRecord, existing.id);
                }
              }
            }
          } else {
            // Create new record
            const { error } = await supabase
              .from('investors')
              .insert(mappedRecord);

            if (error) {
              results.errors.push(`Create failed for ${mappedRecord.airtable_id}: ${error.message}`);
            } else {
              results.created++;
              
              // Trigger SMS if status is "New Lead"
              if (mappedRecord.status?.toLowerCase().trim() === 'new lead' && mappedRecord.phone_number) {
                const { data: newRecord } = await supabase
                  .from('investors')
                  .select('id')
                  .eq('airtable_id', mappedRecord.airtable_id)
                  .single();
                
                if (newRecord) {
                  await triggerSmsForInvestor(mappedRecord, newRecord.id);
                }
              }
            }
          }
        } else if (event === 'records.delete') {
          // Delete record by airtable_id
          const { error } = await supabase
            .from('investors')
            .delete()
            .eq('airtable_id', record.id);

          if (error) {
            results.errors.push(`Delete failed for ${record.id}: ${error.message}`);
          } else {
            results.deleted++;
          }
        }
      } catch (err) {
        results.errors.push(`Error processing record ${record.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      event,
      records_processed: records.length,
      ...results,
    });
  } catch (error) {
    console.error('Error processing Airtable webhook:', error);
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
    message: 'Airtable sync webhook endpoint is active',
    method: 'POST',
    url: '/api/webhooks/airtable-sync',
    headers_required: {
      'Content-Type': 'application/json',
      'x-webhook-secret': 'veritas2024admin',
    },
  });
}

/**
 * Helper to trigger SMS sequence for investor
 */
async function triggerSmsForInvestor(investorData: any, investorId: number) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD || 'veritas2024admin';

    await fetch(`${baseUrl}/api/webhooks/investor-created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({
        investor: {
          id: investorId,
          investor_name: investorData.investor_name,
          phone_number: investorData.phone_number,
          email_address: investorData.email_address,
          status: investorData.status,
          property_name: investorData.property_name || investorData.deal,
        },
      }),
    });
  } catch (err) {
    console.error('Error triggering SMS for investor:', err);
    // Don't fail the sync if SMS trigger fails
  }
}

