import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// Database configuration
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

let db: Database.Database | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Initialize Supabase client if configured
if (useSupabase) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase configured but missing SUPABASE_URL or SUPABASE_ANON_KEY');
  } else {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
}

// Initialize local SQLite database
function getLocalDb(): Database.Database {
  if (db) {
    return db;
  }

  // Determine database path based on environment
  const DB_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
  const DB_PATH = path.join(DB_DIR, 'events.db');

  // Ensure data directory exists (only in non-Vercel environments)
  if (!isVercel && !existsSync(DB_DIR)) {
    try {
      mkdirSync(DB_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create DB directory:', error);
    }
  }

  try {
    db = new Database(DB_PATH);
    
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

export function getDb(): Database.Database {
  if (useSupabase) {
    throw new Error('Supabase is configured. Use async database functions instead.');
  }
  return getLocalDb();
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
  if (useSupabase && supabaseClient) {
    const { error } = await (supabaseClient
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
    const db = getLocalDb();
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
  if (useSupabase && supabaseClient) {
    const { error } = await (supabaseClient
      .from('events') as any)
      .update({ name })
      .eq('anonymous_id', anonymousId)
      .is('name', null);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
  } else {
    const db = getLocalDb();
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
  if (useSupabase && supabaseClient) {
    const { data, error } = await (supabaseClient
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
    const db = getLocalDb();
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
