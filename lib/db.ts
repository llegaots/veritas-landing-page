// REMOVED: Static require('better-sqlite3') - this causes build failures in Vercel
// All database access should use getLocalSqliteDb() from lib/sqlite.ts instead
// which uses dynamic imports that won't be detected by the prebuild script

import { createClient } from '@supabase/supabase-js';
import { getLocalSqliteDb } from './sqlite';

// Database configuration
// More robust Vercel detection - check multiple environment variables
const isVercel = !!(
  process.env.VERCEL === '1' || 
  process.env.VERCEL_ENV || 
  process.env.VERCEL_URL ||
  process.cwd() === '/var/task' // Fallback: check if we're in Vercel's task directory
);

// DEBUG: Log environment detection
if (typeof console !== 'undefined') {
  console.log('[DB INIT] Environment check:', {
    isVercel,
    cwd: process.cwd(),
    hasVercel: !!process.env.VERCEL,
    hasVercelEnv: !!process.env.VERCEL_ENV,
    hasVercelUrl: !!process.env.VERCEL_URL,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
  });
}

// CRITICAL: Check Supabase at runtime, not module load time
// In Vercel, env vars might not be available during build but are at runtime
function checkSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// Initial check for logging
const useSupabase = checkSupabase();

if (!useSupabase && isVercel) {
  console.error('[DB INIT] ⚠️ WARNING: Running in Vercel but Supabase not configured!');
  console.error('[DB INIT] Missing:', {
    SUPABASE_URL: !process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !process.env.SUPABASE_ANON_KEY,
  });
}

let db: any = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Initialize Supabase client - create a function to get/init client at runtime
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // Check Supabase at runtime (env vars might not be available at module load)
  if (checkSupabase()) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    // Prefer service role key for admin operations, fallback to anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase configured but missing SUPABASE_URL or SUPABASE keys');
      return null;
    } else {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      return supabaseClient;
    }
  }
  
  return null;
}

// Initialize if available at module load (for early initialization)
if (useSupabase) {
  getSupabaseClient();
}

// Initialize local SQLite database
// NOTE: This should NEVER be called in Vercel - use Supabase instead
// Now uses async getLocalSqliteDb() from lib/sqlite.ts which has proper Vercel guards
let db: any = null;
async function getLocalDb(): Promise<any> {
  if (db) {
    return db;
  }

  try {
    // Use getLocalSqliteDb() from lib/sqlite.ts which uses dynamic imports
    db = await getLocalSqliteDb();
    
    // Create events table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        properties TEXT NOT NULL,
        anonymous_id TEXT NOT NULL,
        name TEXT,
        url TEXT,
        referrer TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add name column if it doesn't exist (migration for existing databases)
    try {
      db.exec(`ALTER TABLE events ADD COLUMN name TEXT;`)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Create indexes for better query performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
      CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
    `);
  } catch (error) {
    console.error('Failed to open local database:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return db;
}

// Note: Supabase table creation must be done manually via SQL Editor
// The anon key doesn't have permissions to create tables
// Users should run the SQL from supabase-schema.sql in their Supabase SQL Editor

export async function getDb(): Promise<any> {
  if (useSupabase) {
    throw new Error('Supabase is configured. Use async database functions instead.');
  }
  return await getLocalDb();
}

// Async database functions for Supabase
export async function insertEvent(data: {
  event: string;
  properties: Record<string, any>;
  anonymous_id: string;
  name?: string;
  url?: string;
  referrer?: string;
  timestamp: number;
}) {
  // CRITICAL: Check at runtime, not module load time
  // In Vercel, env vars are available at runtime even if not during build
  const runtimeIsVercel = !!(
    process.env.VERCEL === '1' || 
    process.env.VERCEL_ENV || 
    process.env.VERCEL_URL ||
    process.cwd() === '/var/task'
  );
  
  const runtimeUseSupabase = checkSupabase();
  const client = runtimeUseSupabase ? getSupabaseClient() : null;

  // CRITICAL: In Vercel, MUST use Supabase - never local DB
  if (runtimeIsVercel && !runtimeUseSupabase) {
    const error = new Error('Cannot insert events in Vercel without Supabase. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.');
    console.error('[insertEvent]', error.message, {
      isVercel: runtimeIsVercel,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      cwd: process.cwd(),
    });
    throw error;
  }

  if (runtimeUseSupabase && client) {
    const { error } = await (client
      .from('events') as any)
      .insert({
        event: data.event,
        properties: data.properties, // Supabase handles JSONB automatically
        anonymous_id: data.anonymous_id,
        name: data.name || null,
        url: data.url || null,
        referrer: data.referrer || null,
        timestamp: data.timestamp,
      });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  } else {
    // In Vercel, we should use Supabase, not local DB
    if (isVercel) {
      throw new Error('Local database not available in Vercel. Please configure Supabase.');
    }
    const db = await getLocalDb();
    const stmt = db.prepare(`
      INSERT INTO events (event, properties, anonymous_id, name, url, referrer, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      data.event,
      JSON.stringify(data.properties),
      data.anonymous_id,
      data.name || null,
      data.url || null,
      data.referrer || null,
      data.timestamp
    );
  }
}

export async function updateNameForAnonymousId(anonymousId: string, name: string) {
  const runtimeUseSupabase = checkSupabase();
  const client = runtimeUseSupabase ? getSupabaseClient() : null;
  
  if (runtimeUseSupabase && client) {
    const { error } = await (client
      .from('events') as any)
      .update({ name })
      .eq('anonymous_id', anonymousId)
      .is('name', null);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
  } else {
    // Check at runtime
    const runtimeIsVercel = !!(
      process.env.VERCEL === '1' || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.cwd() === '/var/task'
    );
    
    // In Vercel, we should use Supabase, not local DB
    if (runtimeIsVercel) {
      throw new Error('Local database not available in Vercel. Please configure Supabase (SUPABASE_URL and SUPABASE_ANON_KEY).');
    }
    const db = await getLocalDb();
    const stmt = db.prepare(`
      UPDATE events 
      SET name = ? 
      WHERE anonymous_id = ? AND name IS NULL
    `);
    
    stmt.run(name, anonymousId);
  }
}

// Query functions for admin stats
export async function getAllEvents() {
  const runtimeUseSupabase = checkSupabase();
  const client = runtimeUseSupabase ? getSupabaseClient() : null;
  
  if (runtimeUseSupabase && client) {
    const { data, error } = await (client
      .from('events') as any)
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: Number(row.id),
      event: String(row.event),
      properties: typeof row.properties === 'string' 
        ? row.properties 
        : JSON.stringify(row.properties),
      anonymous_id: String(row.anonymous_id),
      name: row.name ? String(row.name) : null,
      url: row.url ? String(row.url) : null,
      referrer: row.referrer ? String(row.referrer) : null,
      timestamp: Number(row.timestamp),
      created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    }));
  } else {
    // Check at runtime
    const runtimeIsVercel = !!(
      process.env.VERCEL === '1' || 
      process.env.VERCEL_ENV || 
      process.env.VERCEL_URL ||
      process.cwd() === '/var/task'
    );
    
    // In Vercel, we should use Supabase, not local DB
    if (runtimeIsVercel) {
      throw new Error('Local database not available in Vercel. Please configure Supabase (SUPABASE_URL and SUPABASE_ANON_KEY).');
    }
    const db = await getLocalDb();
    return db.prepare('SELECT * FROM events ORDER BY timestamp DESC').all() as Array<{
      id: number;
      event: string;
      properties: string;
      anonymous_id: string;
      name: string | null;
      url: string | null;
      referrer: string | null;
      timestamp: number;
      created_at: string;
    }>;
  }
}

// Sequence database functions
import { SequenceSpec } from './sequences/spec';

export interface Sequence {
  id: string;
  org_id: string | null;
  name: string;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SequenceVersion {
  id: string;
  sequence_id: string;
  version_number: number;
  spec_jsonb: SequenceSpec;
  created_at: string;
  created_by: string | null;
}

export async function getSequences(): Promise<Sequence[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { data, error } = await (client
    .from('sequences') as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sequences:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    active_version_id: row.active_version_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getSequence(id: string): Promise<Sequence | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { data, error } = await (client
    .from('sequences') as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching sequence:', error);
    throw error;
  }

  const result = data as any;
  return {
    id: result.id,
    org_id: result.org_id,
    name: result.name,
    active_version_id: result.active_version_id,
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

export async function getSequenceVersion(versionId: string): Promise<SequenceVersion | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { data, error } = await (client
    .from('sequence_versions') as any)
    .select('*')
    .eq('id', versionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching sequence version:', error);
    throw error;
  }

  const result = data as any;
  return {
    id: result.id,
    sequence_id: result.sequence_id,
    version_number: result.version_number,
    spec_jsonb: result.spec_jsonb as SequenceSpec,
    created_at: result.created_at,
    created_by: result.created_by,
  };
}

export async function getActiveVersion(sequenceId: string): Promise<SequenceVersion | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const sequence = await getSequence(sequenceId);
  if (!sequence || !sequence.active_version_id) {
    return null;
  }

  return getSequenceVersion(sequence.active_version_id);
}

export async function createSequence(name: string, orgId?: string): Promise<Sequence> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }

  try {
    const { data, error } = await (client
      .from('sequences') as any)
      .insert({
        name,
        org_id: orgId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating sequence:', error);
      // Supabase errors have a message property
      const errorMessage = error.message || JSON.stringify(error);
      throw new Error(`Failed to create sequence in database: ${errorMessage}`);
    }

    if (!data) {
      throw new Error('No data returned from database insert');
    }

    const result = data as any;
    return {
      id: result.id,
      org_id: result.org_id,
      name: result.name,
      active_version_id: result.active_version_id,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  } catch (error) {
    console.error('Error in createSequence:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to create sequence: ${String(error)}`);
  }
}

export async function createSequenceVersion(
  sequenceId: string,
  spec: SequenceSpec,
  createdBy?: string
): Promise<SequenceVersion> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  // Get current max version number
  const { data: existingVersions, error: versionError } = await (client
    .from('sequence_versions') as any)
    .select('version_number')
    .eq('sequence_id', sequenceId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (versionError && versionError.code !== 'PGRST116') {
    console.error('Error fetching versions:', versionError);
    throw versionError;
  }

  const nextVersion = existingVersions && existingVersions.length > 0
    ? ((existingVersions as any[])[0].version_number as number) + 1
    : 1;

  const { data, error } = await (client
    .from('sequence_versions') as any)
    .insert({
      sequence_id: sequenceId,
      version_number: nextVersion,
      spec_jsonb: spec,
      created_by: createdBy || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating sequence version:', error);
    throw error;
  }

  // Update sequence to point to this version
  const versionResult = data as any;
  const updateClient = getSupabaseClient();
  if (updateClient) {
    await (updateClient
      .from('sequences') as any)
      .update({ active_version_id: versionResult.id })
      .eq('id', sequenceId);
  }

  const result = data as any;
  return {
    id: result.id,
    sequence_id: result.sequence_id,
    version_number: result.version_number,
    spec_jsonb: result.spec_jsonb as SequenceSpec,
    created_at: result.created_at,
    created_by: result.created_by,
  };
}

export async function updateSequence(id: string, updates: Partial<Sequence>): Promise<Sequence> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { data, error } = await (client
    .from('sequences') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating sequence:', error);
    throw error;
  }

  const result = data as any;
  return {
    id: result.id,
    org_id: result.org_id,
    name: result.name,
    active_version_id: result.active_version_id,
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

export async function deleteSequence(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const { error } = await (client
    .from('sequences') as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting sequence:', error);
    throw error;
  }
}

