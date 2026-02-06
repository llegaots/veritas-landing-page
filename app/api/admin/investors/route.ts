import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { triggerSmsSequenceForInvestor } from '@/lib/sequences/integration';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

/**
 * Admin API endpoint to fetch investors
 * Used by the admin dashboard investor list page
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '50');
  const offset = (page - 1) * pageSize;
  
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const source = searchParams.get('source');

  try {
    // Build query
    let query = supabase
      .from('investors')
      .select('*', { count: 'exact' })
      .order('created_time', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (search) {
      query = query.or(`investor_name.ilike.%${search}%,email_address.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching investors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch investors' },
        { status: 500 }
      );
    }

    // Get unique statuses and sources for filters
    const { data: allInvestors } = await supabase
      .from('investors')
      .select('status, source, intent_score');

    const statuses = [...new Set(allInvestors?.map(i => i.status).filter(Boolean) || [])];
    const sources = [...new Set(allInvestors?.map(i => i.source).filter(Boolean) || [])];

    return NextResponse.json({
      investors: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      filters: {
        statuses,
        sources,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Admin API endpoint to create a new investor
 * Automatically triggers SMS sequence if status is "New Lead"
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Prepare investor data
    const investorData = {
      investor_name: body.investor_name || null,
      email_address: body.email_address || null,
      phone_number: body.phone_number,
      status: body.status || 'New Lead',
      investor_type: body.investor_type || null,
      liquid_ready: body.liquid_ready || null,
      ready_for_follow_up: body.ready_for_follow_up || null,
      amount_dollars: body.amount_dollars || null,
      deal: body.deal || null,
      source: body.source || null,
      investor_notes: body.investor_notes || null,
      airtable_id: body.airtable_id || null,
    };

    // Insert investor
    const { data: inserted, error: insertError } = await supabase
      .from('investors')
      .insert(investorData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating investor:', insertError);
      return NextResponse.json(
        { error: `Failed to create investor: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('[admin/investors] Created investor:', inserted.id);

    // Automatically trigger SMS sequence if status is "New Lead"
    const status = investorData.status?.toLowerCase().trim();
    if (status === 'new lead' && investorData.phone_number) {
      console.log('[admin/investors] Triggering SMS sequence for new investor:', {
        id: inserted.id,
        name: investorData.investor_name,
        phone: investorData.phone_number,
      });

      try {
        const smsResult = await triggerSmsSequenceForInvestor({
          id: inserted.id.toString(),
          investor_name: investorData.investor_name,
          phone_number: investorData.phone_number,
          email_address: investorData.email_address,
          property_name: investorData.deal,
          status: investorData.status,
        }, {
          onlyIfStatus: 'New Lead',
        });

        if (smsResult.success && smsResult.runs_created && smsResult.runs_created > 0) {
          console.log('[admin/investors] SMS sequence triggered successfully:', smsResult.runs_created, 'runs created');
        } else if (smsResult.skipped) {
          console.log('[admin/investors] SMS sequence skipped:', smsResult.error);
        } else {
          console.error('[admin/investors] SMS sequence failed:', smsResult.error);
        }
      } catch (smsError) {
        // Don't fail the investor creation if SMS fails
        console.error('[admin/investors] Error triggering SMS sequence:', smsError);
      }
    }

    return NextResponse.json({
      success: true,
      investor: inserted,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Admin API endpoint to update an investor
 */
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Investor ID is required' },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      'status',
      'source',
      'phone_number',
      'amount_dollars',
      'investor_name',
      'email_address',
    ];

    const filteredUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    // Update investor
    const { data: updated, error: updateError } = await supabase
      .from('investors')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating investor:', updateError);
      return NextResponse.json(
        { error: `Failed to update investor: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If status changed to "Interested", pause all active sequence runs - STOP sending
    const newStatus = (filteredUpdates.status ?? updated?.status ?? '').toString().toLowerCase().trim();
    if (newStatus === 'interested') {
      const { data: activeRuns } = await supabase
        .from('sequence_runs')
        .select('id')
        .eq('investor_id', id)
        .in('status', ['pending', 'active']);

      if (activeRuns && activeRuns.length > 0) {
        const runIds = activeRuns.map((r: { id: string }) => r.id);
        await supabase
          .from('sequence_runs')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .in('id', runIds);
        console.log(`[admin/investors] Paused ${runIds.length} sequence run(s) - investor ${id} status set to Interested`);
      }
    }

    return NextResponse.json({
      success: true,
      investor: updated,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
