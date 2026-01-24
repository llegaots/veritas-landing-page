import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const password = searchParams.get('key')
    const adminPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin'

    // Password protection
    if (!password || password !== adminPassword) {
      console.log('Admin access denied for investors endpoint')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid password' },
        { status: 401 }
      )
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get query parameters for filtering/sorting
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const readyForFollowUp = searchParams.get('ready_for_follow_up')
    const sortBy = searchParams.get('sort_by') || 'created_time'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '50')

    // Build query
    let query = supabase
      .from('investors')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`investor_name.ilike.%${search}%,email_address.ilike.%${search}%,phone_number.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (source) {
      query = query.eq('source', source)
    }

    if (readyForFollowUp) {
      query = query.eq('ready_for_follow_up', readyForFollowUp)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    // Get unique values for filters
    const { data: allInvestors } = await supabase
      .from('investors')
      .select('status, source, ready_for_follow_up')

    const uniqueStatuses = [...new Set(allInvestors?.map(i => i.status).filter(Boolean) || [])]
    const uniqueSources = [...new Set(allInvestors?.map(i => i.source).filter(Boolean) || [])]

    return NextResponse.json({
      investors: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      filters: {
        statuses: uniqueStatuses,
        sources: uniqueSources,
      },
    })
  } catch (error) {
    console.error('Error fetching investors:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

