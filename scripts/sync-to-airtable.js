/**
 * Script to sync investor/lead data from tracking database to Airtable
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    AIRTABLE_API_KEY=your_api_key_here
 *    AIRTABLE_BASE_ID=your_base_id_here
 *    AIRTABLE_TABLE_NAME=Investors
 * 
 * 2. Run: node scripts/sync-to-airtable.js
 * 
 * This script will:
 * - Fetch all visitor data from your tracking database
 * - Filter for high-intent leads (demo booked, high intent score, etc.)
 * - Create or update records in Airtable
 */

const Airtable = require('airtable')
const { getAllEvents } = require('../lib/db')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Investors'

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing required environment variables!')
  console.error('Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local')
  console.error('\nTo get your credentials:')
  console.error('1. API Key: https://airtable.com/api → Select your base → Copy API key')
  console.error('2. Base ID: Found in your Airtable base URL: https://airtable.com/appXXXXXXXXXXXXXX/...')
  process.exit(1)
}

// Initialize Airtable
Airtable.configure({ apiKey: AIRTABLE_API_KEY })
const base = Airtable.base(AIRTABLE_BASE_ID)

/**
 * Calculate visitor statistics from events
 */
async function getVisitorData() {
  console.log('📊 Fetching visitor data from database...')
  
  const events = await getAllEvents()
  
  // Parse properties
  const parsedEvents = events.map(e => ({
    ...e,
    properties: typeof e.properties === 'string' ? JSON.parse(e.properties) : e.properties,
  }))

  // Calculate per-user statistics
  const perUserStats = new Map()
  const intentScores = new Map()

  // Calculate intent scores
  parsedEvents.forEach(e => {
    if (!intentScores.has(e.anonymous_id)) {
      intentScores.set(e.anonymous_id, 0)
    }
    let score = intentScores.get(e.anonymous_id)
    
    if (e.event === 'scroll_25') score += 1
    if (e.event === 'scroll_50') score += 2
    if (e.event === 'scroll_75') score += 3
    if (e.event === 'demo_booked') score += 8
    if (e.event === 'cta_click') score += 2
    if (e.event === 'quick_exit') score -= 5
    
    intentScores.set(e.anonymous_id, score)
  })

  // Count return visits
  const visitorPageViews = new Map()
  parsedEvents.forEach(e => {
    if (e.event === 'page_view') {
      visitorPageViews.set(e.anonymous_id, (visitorPageViews.get(e.anonymous_id) || 0) + 1)
    }
  })

  visitorPageViews.forEach((pageViewCount, anonId) => {
    if (pageViewCount > 1) {
      const returnVisits = pageViewCount - 1
      const currentScore = intentScores.get(anonId) || 0
      intentScores.set(anonId, currentScore + 5 * returnVisits)
    }
  })

  // Aggregate per user
  parsedEvents.forEach(e => {
    if (!perUserStats.has(e.anonymous_id)) {
      perUserStats.set(e.anonymous_id, {
        anonymous_id: e.anonymous_id,
        name: null,
        email: undefined,
        page_views: 0,
        return_visits: 0,
        scroll_25: 0,
        scroll_50: 0,
        scroll_75: 0,
        cta_clicks: 0,
        demo_booked: 0,
        avg_time_on_page: 0,
        quick_exits: 0,
        intent_score: 0,
        first_visit: e.timestamp,
        last_visit: e.timestamp,
        max_scroll_depth: 0,
        engagement_level: 'Low',
        total_time: 0,
        time_events_count: 0,
      })
    }

    const stats = perUserStats.get(e.anonymous_id)
    
    if (e.name && !stats.name) {
      stats.name = e.name
    }
    
    // Extract email from demo_booked event
    if (e.event === 'demo_booked' && e.properties?.email) {
      stats.email = e.properties.email
    }
    
    if (e.timestamp < stats.first_visit) stats.first_visit = e.timestamp
    if (e.timestamp > stats.last_visit) stats.last_visit = e.timestamp

    if (e.event === 'page_view') stats.page_views++
    if (e.event === 'scroll_25') {
      stats.scroll_25 = 1
      stats.max_scroll_depth = Math.max(stats.max_scroll_depth, 25)
    }
    if (e.event === 'scroll_50') {
      stats.scroll_50 = 1
      stats.max_scroll_depth = Math.max(stats.max_scroll_depth, 50)
    }
    if (e.event === 'scroll_75') {
      stats.scroll_75 = 1
      stats.max_scroll_depth = Math.max(stats.max_scroll_depth, 75)
    }
    if (e.event === 'cta_click') stats.cta_clicks++
    if (e.event === 'demo_booked') stats.demo_booked++
    if (e.event === 'time_on_page') {
      const seconds = e.properties?.seconds || 0
      stats.total_time += seconds
      stats.time_events_count++
    }
    if (e.event === 'quick_exit') stats.quick_exits++
  })

  // Calculate return visits and finalize
  const visitors = []
  perUserStats.forEach((stats, anonId) => {
    stats.return_visits = stats.page_views > 1 ? stats.page_views - 1 : 0
    stats.intent_score = intentScores.get(anonId) || 0
    stats.avg_time_on_page = stats.time_events_count > 0 
      ? Math.round(stats.total_time / stats.time_events_count)
      : 0
    
    // Determine engagement level
    if (stats.demo_booked > 0 || stats.intent_score >= 8) {
      stats.engagement_level = 'High'
    } else if (stats.intent_score >= 3 || stats.return_visits > 0) {
      stats.engagement_level = 'Medium'
    } else {
      stats.engagement_level = 'Low'
    }
    
    visitors.push(stats)
  })

  return visitors.sort((a, b) => b.last_visit - a.last_visit)
}

/**
 * Format datetime for Airtable
 */
function formatDateTime(timestamp) {
  return new Date(timestamp).toISOString()
}

/**
 * Sync visitor data to Airtable
 */
async function syncToAirtable(visitors) {
  console.log(`\n🔄 Syncing ${visitors.length} visitors to Airtable...`)
  console.log(`   Table: ${AIRTABLE_TABLE_NAME}`)
  console.log(`   Base: ${AIRTABLE_BASE_ID}\n`)

  // Filter for high-intent leads (those worth tracking)
  const highIntentLeads = visitors.filter(v => 
    v.demo_booked > 0 || 
    v.intent_score >= 5 || 
    v.return_visits > 0 ||
    v.name // Has provided name
  )

  console.log(`📈 Found ${highIntentLeads.length} high-intent leads to sync\n`)

  let created = 0
  let updated = 0
  let errors = 0

  // Process in batches of 10 (Airtable rate limit)
  for (let i = 0; i < highIntentLeads.length; i += 10) {
    const batch = highIntentLeads.slice(i, i + 10)
    
    try {
      // First, try to find existing records by anonymous_id
      const anonymousIds = batch.map(v => v.anonymous_id)
      
      // Fetch existing records
      const existingRecords = new Map()
      try {
        const records = await base(AIRTABLE_TABLE_NAME)
          .select({
            filterByFormula: `{Anonymous ID} != ""`,
            maxRecords: 1000,
          })
          .all()
        
        records.forEach(record => {
          const anonId = record.fields['Anonymous ID']
          if (anonId && anonymousIds.includes(anonId)) {
            existingRecords.set(anonId, record)
          }
        })
      } catch (err) {
        console.warn('⚠️  Could not fetch existing records (table might be new):', err.message)
      }

      // Prepare records for batch create/update
      const recordsToCreate = []
      const recordsToUpdate = []

      batch.forEach(visitor => {
        const recordData = {
          'Name': visitor.name || `Visitor ${visitor.anonymous_id.substring(0, 8)}`,
          'Anonymous ID': visitor.anonymous_id,
          'Email': visitor.email || '',
          'Intent Score': visitor.intent_score,
          'Engagement Level': visitor.engagement_level,
          'Demo Booked': visitor.demo_booked > 0 ? 'Yes' : 'No',
          'Page Views': visitor.page_views,
          'Return Visits': visitor.return_visits,
          'Max Scroll Depth': visitor.max_scroll_depth > 0 ? `${visitor.max_scroll_depth}%` : '0%',
          'CTA Clicks': visitor.cta_clicks,
          'Avg Time on Page (s)': visitor.avg_time_on_page,
          'Quick Exits': visitor.quick_exits,
          'First Visit': formatDateTime(visitor.first_visit),
          'Last Visit': formatDateTime(visitor.last_visit),
          'Status': visitor.demo_booked > 0 ? 'Demo Booked' : 
                   visitor.intent_score >= 8 ? 'High Intent' :
                   visitor.intent_score >= 5 ? 'Medium Intent' : 'Low Intent',
        }

        const existing = existingRecords.get(visitor.anonymous_id)
        if (existing) {
          // Update existing record
          recordsToUpdate.push({
            id: existing.id,
            fields: recordData,
          })
        } else {
          // Create new record
          recordsToCreate.push({ fields: recordData })
        }
      })

      // Batch create
      if (recordsToCreate.length > 0) {
        try {
          await base(AIRTABLE_TABLE_NAME).create(recordsToCreate)
          created += recordsToCreate.length
          console.log(`✅ Created ${recordsToCreate.length} new records`)
        } catch (err) {
          console.error(`❌ Error creating records:`, err.message)
          errors += recordsToCreate.length
        }
      }

      // Batch update
      if (recordsToUpdate.length > 0) {
        try {
          await base(AIRTABLE_TABLE_NAME).update(recordsToUpdate)
          updated += recordsToUpdate.length
          console.log(`🔄 Updated ${recordsToUpdate.length} existing records`)
        } catch (err) {
          console.error(`❌ Error updating records:`, err.message)
          errors += recordsToUpdate.length
        }
      }

      // Rate limiting: wait 200ms between batches
      if (i + 10 < highIntentLeads.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (err) {
      console.error(`❌ Error processing batch:`, err.message)
      errors += batch.length
    }
  }

  console.log(`\n✨ Sync complete!`)
  console.log(`   ✅ Created: ${created}`)
  console.log(`   🔄 Updated: ${updated}`)
  console.log(`   ❌ Errors: ${errors}`)
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Airtable sync...\n')
    
    // Verify table exists
    try {
      await base(AIRTABLE_TABLE_NAME).select({ maxRecords: 1 }).firstPage()
    } catch (err) {
      if (err.message?.includes('Could not find table')) {
        console.error(`❌ Table "${AIRTABLE_TABLE_NAME}" not found in Airtable!`)
        console.error(`\nPlease create a table named "${AIRTABLE_TABLE_NAME}" with these fields:`)
        console.error(`
Required Fields:
- Name (Single line text)
- Anonymous ID (Single line text) - Used as unique identifier
- Email (Email)
- Intent Score (Number)
- Engagement Level (Single select: High, Medium, Low)
- Demo Booked (Single select: Yes, No)
- Page Views (Number)
- Return Visits (Number)
- Max Scroll Depth (Single line text)
- CTA Clicks (Number)
- Avg Time on Page (s) (Number)
- Quick Exits (Number)
- First Visit (Date)
- Last Visit (Date)
- Status (Single select: Demo Booked, High Intent, Medium Intent, Low Intent)
        `)
        process.exit(1)
      }
      throw err
    }

    const visitors = await getVisitorData()
    await syncToAirtable(visitors)
    
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()


