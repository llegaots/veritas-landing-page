/**
 * List all tables in Supabase
 * Helps identify what tables exist before cleanup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
  console.log('📊 Listing all tables in Supabase...\n');
  
  try {
    // Query information_schema to get all tables
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          table_name,
          (SELECT COUNT(*) 
           FROM information_schema.columns 
           WHERE table_name = t.table_name 
           AND table_schema = 'public') as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (error) {
      // Try alternative method using direct query
      console.log('⚠️  RPC method not available, trying alternative...\n');
      
      // List tables by trying to query them
      const knownTables = [
        'events',
        'investors',
        'sequences',
        'sequence_versions',
        'sequence_runs',
        'message_jobs',
        'sequence_events',
        'audit_log'
      ];

      console.log('Checking known tables:\n');
      for (const table of knownTables) {
        try {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          console.log(`✅ ${table.padEnd(25)} - Exists (${count || 0} rows)`);
        } catch (err) {
          if (err.message?.includes('does not exist') || err.code === '42P01') {
            console.log(`❌ ${table.padEnd(25)} - Does not exist`);
          } else {
            console.log(`⚠️  ${table.padEnd(25)} - Error: ${err.message}`);
          }
        }
      }
      return;
    }

    if (data) {
      console.log('Found tables:\n');
      data.forEach((row) => {
        console.log(`  ${row.table_name.padEnd(25)} - ${row.column_count} columns`);
      });
    }
  } catch (err) {
    console.error('Error listing tables:', err.message);
    
    // Fallback: try to query each known table
    console.log('\nTrying to detect tables by querying them...\n');
    
    const knownTables = [
      'events',
      'investors', 
      'sequences',
      'sequence_versions',
      'sequence_runs',
      'message_jobs',
      'sequence_events',
      'audit_log'
    ];

    for (const table of knownTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.log(`❌ ${table} - Does not exist`);
          } else {
            console.log(`⚠️  ${table} - Error: ${error.message}`);
          }
        } else {
          console.log(`✅ ${table} - Exists (${count || 0} rows)`);
        }
      } catch (err) {
        console.log(`❌ ${table} - ${err.message}`);
      }
    }
  }
}

listTables().catch(console.error);

