/**
 * Test script to verify Calendly API token works
 * Usage: node scripts/test-calendly-api.js
 */

require('dotenv').config({ path: '.env.local' })

const CALENDLY_TOKEN = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN

if (!CALENDLY_TOKEN) {
  console.error('❌ CALENDLY_PERSONAL_ACCESS_TOKEN not found in .env.local')
  process.exit(1)
}

console.log('🔑 Token found:', {
  hasToken: !!CALENDLY_TOKEN,
  tokenLength: CALENDLY_TOKEN.length,
  tokenPrefix: CALENDLY_TOKEN.substring(0, 20) + '...'
})

async function testCalendlyAPI() {
  try {
    // First, test the user info endpoint to verify token works
    console.log('\n📡 Testing Calendly API: Getting current user info...')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Response status:', userResponse.status, userResponse.statusText)

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ Failed to authenticate:', {
        status: userResponse.status,
        error: errorText.substring(0, 500)
      })
      
      if (userResponse.status === 401) {
        console.error('\n💡 Token is invalid or expired. Please:')
        console.error('   1. Go to https://calendly.com/integrations/api_webhooks')
        console.error('   2. Create a new Personal Access Token')
        console.error('   3. Copy the FULL token and update .env.local')
      }
      
      return
    }

    const userData = await userResponse.json()
    console.log('✅ Authentication successful!')
    console.log('User:', {
      uri: userData.resource?.uri,
      name: userData.resource?.name,
      email: userData.resource?.email,
    })

    // Now test fetching scheduled events (to see if we can get invitee URIs)
    console.log('\n📡 Testing: Fetching recent scheduled events...')
    const userUri = userData.resource?.uri
    const eventsUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&count=5`
    console.log('Events URL:', eventsUrl)
    
    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Bearer ${CALENDLY_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Events response status:', eventsResponse.status, eventsResponse.statusText)

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json()
      console.log('✅ Successfully fetched events!')
      console.log('Found', eventsData.collection?.length || 0, 'events')
      
      if (eventsData.collection && eventsData.collection.length > 0) {
        const firstEvent = eventsData.collection[0]
        console.log('\n📅 Sample event:', {
          uri: firstEvent.uri,
          name: firstEvent.name,
          start_time: firstEvent.start_time,
        })

        // Try to fetch invitees for this event
        if (firstEvent.uri) {
          console.log('\n📡 Testing: Fetching invitees for this event...')
          const inviteesResponse = await fetch(`${firstEvent.uri}/invitees`, {
            headers: {
              'Authorization': `Bearer ${CALENDLY_TOKEN}`,
              'Content-Type': 'application/json',
            },
          })

          console.log('Invitees response status:', inviteesResponse.status, inviteesResponse.statusText)

          if (inviteesResponse.ok) {
            const inviteesData = await inviteesResponse.json()
            console.log('✅ Successfully fetched invitees!')
            console.log('Found', inviteesData.collection?.length || 0, 'invitees')
            
            if (inviteesData.collection && inviteesData.collection.length > 0) {
              const firstInvitee = inviteesData.collection[0]
              console.log('\n👤 Sample invitee:', {
                uri: firstInvitee.uri,
                name: firstInvitee.name,
                email: firstInvitee.email,
                first_name: firstInvitee.first_name,
                last_name: firstInvitee.last_name,
              })
              
              // Test fetching this specific invitee
              console.log('\n📡 Testing: Fetching this specific invitee...')
              const inviteeResponse = await fetch(firstInvitee.uri, {
                headers: {
                  'Authorization': `Bearer ${CALENDLY_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              })

              console.log('Invitee response status:', inviteeResponse.status, inviteeResponse.statusText)
              
              if (inviteeResponse.ok) {
                const inviteeData = await inviteeResponse.json()
                console.log('✅ Successfully fetched invitee details!')
                console.log('Invitee data:', {
                  name: inviteeData.resource?.name,
                  email: inviteeData.resource?.email,
                  first_name: inviteeData.resource?.first_name,
                  last_name: inviteeData.resource?.last_name,
                })
              } else {
                const errorText = await inviteeResponse.text()
                console.error('❌ Failed to fetch invitee:', errorText.substring(0, 500))
              }
            } else {
              console.log('⚠️ No invitees found for this event')
            }
          } else {
            const errorText = await inviteesResponse.text()
            console.error('❌ Failed to fetch invitees:', errorText.substring(0, 500))
          }
        }
      } else {
        console.log('⚠️ No events found. Book a test demo to create an event.')
      }
    } else {
      const errorText = await eventsResponse.text()
      console.error('❌ Failed to fetch events:', errorText.substring(0, 500))
    }

    console.log('\n✅ Calendly API test complete!')
    console.log('\n💡 If all tests passed, your token is working correctly.')
    console.log('   The issue might be with the invitee URI format from the event payload.')

  } catch (error) {
    console.error('❌ Error testing Calendly API:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

testCalendlyAPI()

