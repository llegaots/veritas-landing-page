import { NextRequest, NextResponse } from 'next/server';
import { triggerSmsSequenceForInvestor } from '@/lib/sequences/integration';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

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
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD;
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Support both direct investor object and Airtable webhook format
    const investor = body.investor || body.fields || body;
    
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

    const investorData = {
      id: investor.id || investor.airtable_id || investor.investor_id,
      investor_name: extractString(investor.investor_name || investor.name || investor['Investor Name']),
      phone_number: extractString(investor.phone_number || investor.phone || investor['Phone Number']),
      email_address: extractString(investor.email_address || investor.email || investor['Email Address']),
      status: extractString(investor.status || investor['Status']),
      property_name: extractString(investor.property_name || investor['Property Name'] || investor.deal),
    };

    // Validate required fields
    if (!investorData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    if (!investorData.phone_number) {
      return NextResponse.json(
        { error: 'Missing required field: phone_number' },
        { status: 400 }
      );
    }

    // Only trigger SMS for investors with status "New Lead"
    const status = investorData.status?.toLowerCase().trim();
    if (status !== 'new lead') {
      return NextResponse.json({
        success: true,
        message: `Investor status is "${investorData.status}", not "New Lead". SMS sequence not triggered.`,
        skipped: true,
      });
    }

    // Trigger SMS sequence (only for "New Lead" status - already checked above)
    console.log('[investor-created] Triggering SMS sequence for investor:', {
      id: investorData.id,
      name: investorData.investor_name,
      phone: investorData.phone_number,
      status: investorData.status,
    });

    const result = await triggerSmsSequenceForInvestor({
      id: investorData.id.toString(),
      investor_name: investorData.investor_name,
      phone_number: investorData.phone_number,
      email_address: investorData.email_address,
      property_name: investorData.property_name,
      status: investorData.status,
    }, {
      onlyIfStatus: 'New Lead', // Double-check, though we already filtered above
    });

    console.log('[investor-created] Result:', result);

    if (!result.success) {
      // If skipped, return success with skip message
      if (result.skipped) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: result.error || 'SMS sequence skipped',
          investor_id: investorData.id,
        });
      }
      
      // Otherwise return error
      return NextResponse.json(
        { 
          error: result.error || 'Failed to trigger SMS sequence',
          investor_id: investorData.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sequence triggered successfully',
      investor_id: investorData.id,
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

