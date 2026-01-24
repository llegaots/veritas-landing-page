import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'events.db');

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

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

  return db;
}

export function insertEvent(data: {
  event: string;
  properties: Record<string, any>;
  anonymous_id: string;
  name?: string;
  url?: string;
  referrer?: string;
  timestamp: number;
}) {
  const db = getDb();
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

// Update all events for an anonymous_id with a name
export function updateNameForAnonymousId(anonymousId: string, name: string) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE events 
    SET name = ? 
    WHERE anonymous_id = ? AND name IS NULL
  `);
  
  stmt.run(name, anonymousId);
}

