import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// Database configuration
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const useTurso = !!process.env.TURSO_DATABASE_URL;

let db: Database.Database | null = null;
let tursoClient: ReturnType<typeof createClient> | null = null;

// Initialize Turso client if configured
if (useTurso) {
  const url = process.env.TURSO_DATABASE_URL!;
  const authToken = process.env.TURSO_AUTH_TOKEN!;
  
  if (!url || !authToken) {
    console.warn('Turso configured but missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  } else {
    tursoClient = createClient({
      url,
      authToken,
    });
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

// Initialize Turso database schema
async function initTursoSchema() {
  if (!tursoClient) return;

  try {
    await tursoClient.execute(`
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

    // Try to add name column (ignore if it already exists)
    try {
      await tursoClient.execute(`ALTER TABLE events ADD COLUMN name TEXT;`);
    } catch (e) {
      // Column already exists, ignore error
    }

    // Create indexes
    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
    `);
    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id);
    `);
    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `);
    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
    `);
  } catch (error) {
    console.error('Failed to initialize Turso schema:', error);
  }
}

// Initialize schema on first use
if (useTurso && tursoClient) {
  initTursoSchema().catch(console.error);
}

export function getDb(): Database.Database {
  if (useTurso) {
    throw new Error('Turso is configured. Use async database functions instead.');
  }
  return getLocalDb();
}

// Async database functions for Turso
export async function insertEvent(data: {
  event: string;
  properties: Record<string, any>;
  anonymous_id: string;
  name?: string;
  url?: string;
  referrer?: string;
  timestamp: number;
}) {
  if (useTurso && tursoClient) {
    await initTursoSchema();
    await tursoClient.execute({
      sql: `
        INSERT INTO events (event, properties, anonymous_id, name, url, referrer, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.event,
        JSON.stringify(data.properties),
        data.anonymous_id,
        data.name || null,
        data.url || null,
        data.referrer || null,
        data.timestamp,
      ],
    });
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
  if (useTurso && tursoClient) {
    await tursoClient.execute({
      sql: `
        UPDATE events 
        SET name = ? 
        WHERE anonymous_id = ? AND name IS NULL
      `,
      args: [name, anonymousId],
    });
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
  if (useTurso && tursoClient) {
    const result = await tursoClient.execute('SELECT * FROM events ORDER BY timestamp DESC');
    return result.rows.map((row: any) => ({
      id: Number(row.id),
      event: String(row.event),
      properties: typeof row.properties === 'string' ? row.properties : JSON.stringify(row.properties),
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
