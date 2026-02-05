import { NextRequest, NextResponse } from 'next/server'
import { insertEvent, updateNameForAnonymousId, getNameForAnonymousId } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Handle both regular JSON and sendBeacon Blob requests
    let body: any
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // sendBeacon sends Blob data, need to read as text and parse
      const text = await request.text()
      try {
        body = JSON.parse(text)
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid JSON payload' },
          { status: 400 }
        )
      }
    }
    
    const { event, properties, anonymous_id, name, url, referrer, timestamp } = body

    // Validate required fields
    if (!event || !anonymous_id || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: event, anonymous_id, timestamp' },
        { status: 400 }
      )
    }

    // Extract name from properties if not provided at top level
    let finalName = name || properties?.name || undefined
    let trimmedName = finalName ? String(finalName).trim() : undefined

    // If no name provided in this event, check if we already have a name for this anonymous_id
    if (!trimmedName || trimmedName.length === 0) {
      try {
        const existingName = await getNameForAnonymousId(anonymous_id)
        if (existingName) {
          trimmedName = existingName
          console.log(`[Track API] Using existing name for anonymous_id ${anonymous_id}: "${trimmedName}"`)
        }
      } catch (error) {
        // Log but don't fail - name lookup is optional
        console.warn(`[Track API] Could not lookup existing name for ${anonymous_id}:`, error)
      }
    }

    console.log(`[Track API] Received event: ${event}`, {
      anonymous_id,
      hasTopLevelName: !!name,
      topLevelName: name,
      hasPropertiesName: !!properties?.name,
      propertiesName: properties?.name,
      finalName: trimmedName,
      propertiesKeys: properties ? Object.keys(properties) : []
    })

    // Insert the event with the name (either from this event or from existing events)
    await insertEvent({
      event,
      properties: properties || {},
      anonymous_id,
      name: trimmedName,
      url: url || undefined,
      referrer: referrer || undefined,
      timestamp,
    })

    // If a name is provided, update all previous events for this anonymous_id
    if (trimmedName && trimmedName.length > 0) {
      try {
        console.log(`[Track API] ✅ Updating name for anonymous_id ${anonymous_id}: "${trimmedName}"`)
        const result = await updateNameForAnonymousId(anonymous_id, trimmedName)
        console.log(`[Track API] ✅ Name update successful:`, result)
      } catch (error) {
        // Log error but don't fail the request - event is already inserted
        console.error('[Track API] ❌ Error updating name for anonymous_id:', anonymous_id, error)
        if (error instanceof Error) {
          console.error('[Track API] Error details:', error.message, error.stack)
        }
      }
    } else {
      console.warn(`[Track API] ⚠️ No name provided for event ${event}, anonymous_id: ${anonymous_id}`, {
        receivedName: name,
        receivedProperties: properties
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/track:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

