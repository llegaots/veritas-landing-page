import { NextRequest, NextResponse } from 'next/server'

/**
 * Fetches invitee details from Calendly API using the invitee URI
 * Requires CALENDLY_PERSONAL_ACCESS_TOKEN environment variable
 */
export async function GET(request: NextRequest) {
  const inviteeUri = request.nextUrl.searchParams.get('uri')
  
  if (!inviteeUri) {
    return NextResponse.json(
      { error: 'Missing required parameter: uri' },
      { status: 400 }
    )
  }

  const calendlyToken = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN
  
  if (!calendlyToken) {
    console.error('[Calendly API] Missing CALENDLY_PERSONAL_ACCESS_TOKEN environment variable')
    return NextResponse.json(
      { error: 'Calendly API token not configured' },
      { status: 500 }
    )
  }

  // Log token info (without exposing the full token)
  console.log('[Calendly API] Token check:', {
    hasToken: !!calendlyToken,
    tokenLength: calendlyToken?.length || 0,
    tokenPrefix: calendlyToken?.substring(0, 10) || 'none',
    inviteeUri
  })

  try {
    // The invitee URI from Calendly events is typically:
    // https://api.calendly.com/scheduled_events/EVENT_UUID/invitees/INVITEE_UUID
    // But it might come in different formats from the event payload
    
    let apiUrl = inviteeUri
    
    // Handle different URI formats
    if (!inviteeUri.startsWith('https://api.calendly.com')) {
      // If it's a relative URI, prepend the base URL
      if (inviteeUri.startsWith('/scheduled_events/') || inviteeUri.startsWith('scheduled_events/')) {
        apiUrl = `https://api.calendly.com${inviteeUri.startsWith('/') ? '' : '/'}${inviteeUri}`
      } 
      // If it contains UUIDs, try to construct the full URL
      else {
        const uuidMatch = inviteeUri.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi)
        if (uuidMatch && uuidMatch.length >= 2) {
          // Assume format: scheduled_events/{event_uuid}/invitees/{invitee_uuid}
          apiUrl = `https://api.calendly.com/scheduled_events/${uuidMatch[0]}/invitees/${uuidMatch[1]}`
        } else if (uuidMatch && uuidMatch.length === 1) {
          // If only one UUID, it might be just the invitee UUID - we'd need the event UUID
          // But we can't construct it without the event UUID, so log an error
          console.error('[Calendly API] Only one UUID found, need event UUID to construct full URL')
        }
      }
    }
    
    console.log('[Calendly API] Fetching invitee from:', {
      originalUri: inviteeUri,
      apiUrl,
      tokenPrefix: calendlyToken.substring(0, 20) + '...'
    })
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('[Calendly API] Response status:', response.status, response.statusText)

    if (!response.ok) {
      let errorText = ''
      try {
        errorText = await response.text()
      } catch (e) {
        errorText = 'Could not read error response'
      }
      
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        inviteeUri: apiUrl,
        hasToken: !!calendlyToken,
        tokenLength: calendlyToken?.length || 0
      }
      
      console.error('[Calendly API] Failed to fetch invitee:', errorDetails)
      
      // If 401, provide helpful error message
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Unauthorized - Check your Calendly Personal Access Token',
            details: errorText.substring(0, 200),
            hint: 'Make sure your token is valid and has not expired. Get a new token from https://calendly.com/integrations/api_webhooks',
            inviteeUri: apiUrl
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Calendly API error: ${response.status}`,
          details: errorText.substring(0, 200),
          inviteeUri: apiUrl
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Extract name and email from Calendly response
    const resource = data.resource || {}
    const name = resource.name || ''
    const email = resource.email || ''
    
    // Try first_name + last_name if name is not available
    let fullName = name
    if (!fullName && (resource.first_name || resource.last_name)) {
      fullName = [resource.first_name, resource.last_name].filter(Boolean).join(' ').trim()
    }

    console.log('[Calendly API] Fetched invitee details:', {
      uri: inviteeUri,
      name: fullName,
      email: email,
      hasName: !!fullName,
      hasEmail: !!email
    })

    return NextResponse.json({
      name: fullName,
      email: email,
      invitee: resource,
    })
  } catch (error) {
    console.error('[Calendly API] Error fetching invitee:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch invitee details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

