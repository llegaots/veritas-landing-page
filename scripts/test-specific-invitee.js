/**
 * Test fetching a specific invitee URI
 * Usage: node scripts/test-specific-invitee.js
 */

require('dotenv').config({ path: '.env.local' })

const CALENDLY_TOKEN = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN

// Use the exact URI from your console
const INVITEE_URI = process.argv[2] || 'https://api.calendly.com/scheduled_events/7c0237bc-043b-45c9-b542-78416c302347/invitees/efb4c6f4-4a35-44d3-9a02-66e7f34a72df'

if (!CALENDLY_TOKEN) {
  console.error('❌ CALENDLY_PERSONAL_ACCESS_TOKEN not found in .env.local')
  process.exit(1)
}

async function testInviteeURI() {
  console.log('🔑 Token found:', {
    hasToken: !!CALENDLY_TOKEN,
    tokenLength: CALENDLY_TOKEN.length,
    tokenPrefix: CALENDLY_TOKEN.substring(0, 20) + '...'
  })

  console.log('\n📡 Testing invitee URI:', INVITEE_URI)

  try {
    const response = await fetch(INVITEE_URI, {
      headers: {
        'Authorization': `Bearer ${CALENDLY_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Response status:', response.status, response.statusText)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to fetch invitee:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500)
      })
      return
    }

    const data = await response.json()
    console.log('✅ Successfully fetched invitee details!')
    console.log('Invitee data:', JSON.stringify(data, null, 2))

    const resource = data.resource || {}
    console.log('\n📋 Extracted info:')
    console.log('  Name:', resource.name || 'N/A')
    console.log('  Email:', resource.email || 'N/A')
    console.log('  First Name:', resource.first_name || 'N/A')
    console.log('  Last Name:', resource.last_name || 'N/A')

  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
  }
}

testInviteeURI()

