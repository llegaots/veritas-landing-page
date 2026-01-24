import { NextRequest, NextResponse } from 'next/server'
import { insertEvent, updateNameForAnonymousId } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { event, properties, anonymous_id, name, url, referrer, timestamp } = body

    // Validate required fields
    if (!event || !anonymous_id || !timestamp) {
      console.error('Missing required fields:', { event, anonymous_id, timestamp })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert event into database
    try {
      insertEvent({
        event,
        properties: properties || {},
        anonymous_id,
        name: name || undefined,
        url,
        referrer,
        timestamp,
      })
      console.log('Event tracked:', event, anonymous_id.substring(0, 20), name ? `(${name})` : '')

      // If name is provided, update all previous events for this anonymous_id
      if (name) {
        updateNameForAnonymousId(anonymous_id, name)
        console.log('Updated name for anonymous_id:', anonymous_id.substring(0, 20), '→', name)
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error tracking event:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

