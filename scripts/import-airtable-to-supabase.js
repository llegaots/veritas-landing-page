/**
 * Script to import investor data from Airtable to Supabase
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    AIRTABLE_API_KEY=your_api_key_here
 *    AIRTABLE_BASE_ID=your_base_id_here
 *    AIRTABLE_TABLE_NAME=your_table_name
 *    SUPABASE_URL=your_supabase_url
 *    SUPABASE_ANON_KEY=your_supabase_anon_key
 * 
 * 2. Run: node scripts/import-airtable-to-supabase.js
 * 
 * This script will:
 * - Fetch all records from your Airtable table
 * - Create the "investors" table in Supabase (if it doesn't exist)
 * - Import all data into Supabase
 */

const Airtable = require('airtable')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const fetch = require('node-fetch')

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Investors'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

// Validate environment variables
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing Airtable credentials!')
  console.error('Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!')
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

// Initialize clients
Airtable.configure({ apiKey: AIRTABLE_API_KEY })
const base = Airtable.base(AIRTABLE_BASE_ID)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Check if investors table exists, show instructions if not
 */
async function checkInvestorsTable() {
  const { error } = await supabase
    .from('investors')
    .select('id')
    .limit(1)
  
  if (error) {
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      console.log('\n⚠️  Investors table not found in Supabase!')
      console.log('\n📋 Please run this SQL in your Supabase SQL Editor first:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('See: scripts/import-airtable-to-supabase.sql')
      console.log('Or copy the SQL from that file and run it in Supabase SQL Editor')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      process.exit(1)
    }
    throw error
  }
}

/**
 * Fetch all records from Airtable
 */
async function fetchAirtableRecords() {
  console.log(`📥 Fetching records from Airtable table: ${AIRTABLE_TABLE_NAME}...`)
  
  const allRecords = []
  
  try {
    await base(AIRTABLE_TABLE_NAME)
      .select({
        // Fetch all fields - no view specified to get all records
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          allRecords.push({
            id: record.id,
            fields: record.fields,
          })
        })
        fetchNextPage()
      })
    
    console.log(`✅ Fetched ${allRecords.length} records from Airtable\n`)
    return allRecords
  } catch (err) {
    console.error('❌ Error fetching from Airtable:', err.message)
    if (err.message?.includes('Could not find table')) {
      console.error(`\nTable "${AIRTABLE_TABLE_NAME}" not found in Airtable!`)
      console.error('Please check your AIRTABLE_TABLE_NAME in .env.local')
    }
    throw err
  }
}

/**
 * Map Airtable field names to Supabase column names
 * Based on your actual Airtable table structure
 */
function mapAirtableToSupabase(airtableRecord) {
  const fields = airtableRecord.fields
  const mapped = {
    airtable_id: airtableRecord.id,
  }

  // Direct field mappings from your Airtable table
  const fieldMappings = {
    // Core investor information
    'Investor Name': 'investor_name',
    'Email Address': 'email_address',
    'Phone Number': 'phone_number',
    
    // Status and tracking
    'Status': 'status',
    'Investor Type': 'investor_type',
    'Liquid Ready': 'liquid_ready',
    'readyForFollowUp': 'ready_for_follow_up',
    
    // Financial
    '$ Amount$': 'amount_dollars',
    'Amount$': 'amount_dollars',
    
    // Deal information
    'Deal': 'deal',
    'Source': 'source',
    
    // Notes
    'Investor Notes': 'investor_notes',
    
    // Timestamps
    'Created Time': 'created_time',
  }

  // Map fields
  Object.keys(fields).forEach(airtableField => {
    const supabaseColumn = fieldMappings[airtableField]
    if (supabaseColumn) {
      let value = fields[airtableField]
      
      // Handle date/timestamp fields
      if (supabaseColumn === 'created_time') {
        if (value) {
          // Airtable dates come as strings, convert to ISO
          value = new Date(value).toISOString()
        }
      }
      
      // Handle number fields (remove $ and commas, convert to number)
      if (supabaseColumn === 'amount_dollars') {
        if (value) {
          // Remove $, commas, and convert to number
          const cleaned = String(value).replace(/[$,]/g, '')
          value = parseFloat(cleaned) || 0
        } else {
          value = 0
        }
      }
      
      // Handle select/single select fields (convert array to string)
      if (Array.isArray(value)) {
        value = value.join(', ')
      }
      
      // Handle object fields (like linked records, convert to string)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        value = String(value)
      }
      
      mapped[supabaseColumn] = value
    }
  })

  return mapped
}

/**
 * Trigger SMS sequences for "New Lead" investors
 */
async function triggerSmsForNewLeads(investors) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const webhookSecret = process.env.WEBHOOK_SECRET || process.env.ADMIN_PASSWORD || 'veritas2024admin'
  
  let triggered = 0
  let errors = 0
  
  for (const investor of investors) {
    try {
      const response = await fetch(`${baseUrl}/api/webhooks/investor-created`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret,
        },
        body: JSON.stringify({
          investor: {
            id: investor.id,
            investor_name: investor.investor_name,
            phone_number: investor.phone_number,
            email_address: investor.email_address,
            status: investor.status,
            property_name: investor.deal,
          },
        }),
      })
      
      const result = await response.json()
      
      if (result.success && !result.skipped) {
        triggered++
      } else if (result.skipped) {
        // Expected for non-"New Lead" statuses
      } else {
        console.error(`  ⚠️  Failed to trigger SMS for investor ${investor.id}:`, result.error)
        errors++
      }
    } catch (err) {
      console.error(`  ⚠️  Error triggering SMS for investor ${investor.id}:`, err.message)
      errors++
    }
  }
  
  if (triggered > 0) {
    console.log(`  ✅ Triggered SMS sequences for ${triggered} investor(s)`)
  }
  if (errors > 0) {
    console.log(`  ⚠️  ${errors} SMS trigger(s) failed`)
  }
}

/**
 * Import records to Supabase
 */
async function importToSupabase(records) {
  console.log(`🔄 Importing ${records.length} records to Supabase...\n`)

  let created = 0
  let updated = 0
  let errors = 0

  // Process in batches of 100 (Supabase limit)
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100)
    
    try {
      // Map Airtable records to Supabase format
      const supabaseRecords = batch.map(mapAirtableToSupabase)
      
      // Check for existing records by airtable_id
      const airtableIds = supabaseRecords.map(r => r.airtable_id).filter(Boolean)
      let existing = []
      if (airtableIds.length > 0) {
        const { data, error } = await supabase
          .from('investors')
          .select('airtable_id, id')
          .in('airtable_id', airtableIds)
        if (!error && data) {
          existing = data
        }
      }
      
      const existingMap = new Map()
      if (existing) {
        existing.forEach(record => {
          existingMap.set(record.airtable_id, record.id)
        })
      }

      // Split into creates and updates
      const toCreate = []
      const toUpdate = []

      supabaseRecords.forEach(record => {
        const existingId = existingMap.get(record.airtable_id)
        if (existingId) {
          toUpdate.push({ ...record, id: existingId })
        } else {
          toCreate.push(record)
        }
      })

      // Batch insert new records
      if (toCreate.length > 0) {
        const { error, data: insertedData } = await supabase
          .from('investors')
          .insert(toCreate)
          .select()
        
        if (error) {
          console.error(`❌ Error inserting batch:`, error.message)
          errors += toCreate.length
        } else {
          created += toCreate.length
          console.log(`✅ Created ${toCreate.length} new records`)
          
          // Trigger SMS sequences for "New Lead" investors
          if (insertedData) {
            const newLeadInvestors = insertedData.filter(inv => 
              inv.status && inv.status.toLowerCase().trim() === 'new lead' && inv.phone_number
            )
            
            if (newLeadInvestors.length > 0) {
              console.log(`📱 Triggering SMS sequences for ${newLeadInvestors.length} "New Lead" investor(s)...`)
              await triggerSmsForNewLeads(newLeadInvestors)
            }
          }
        }
      }

      // Batch update existing records
      if (toUpdate.length > 0) {
        const updatePromises = toUpdate.map(record => {
          const { id, ...fields } = record
          return supabase
            .from('investors')
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq('id', id)
        })

        const results = await Promise.all(updatePromises)
        const successCount = results.filter(r => !r.error).length
        updated += successCount
        errors += (toUpdate.length - successCount)
        
        if (successCount > 0) {
          console.log(`🔄 Updated ${successCount} existing records`)
        }
      }

    } catch (err) {
      console.error(`❌ Error processing batch:`, err.message)
      errors += batch.length
    }
  }

  console.log(`\n✨ Import complete!`)
  console.log(`   ✅ Created: ${created}`)
  console.log(`   🔄 Updated: ${updated}`)
  console.log(`   ❌ Errors: ${errors}`)
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Airtable to Supabase import...\n')
    
    // Check if table exists
    await checkInvestorsTable()

    // Fetch from Airtable
    const airtableRecords = await fetchAirtableRecords()
    
    if (airtableRecords.length === 0) {
      console.log('⚠️  No records found in Airtable')
      return
    }

    // Show sample record structure
    console.log('📋 Sample Airtable record structure:')
    console.log(JSON.stringify(airtableRecords[0].fields, null, 2))
    console.log('\n💡 Tip: If fields are not mapping correctly, check the fieldMappings in the script\n')

    // Import to Supabase
    await importToSupabase(airtableRecords)
    
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()

