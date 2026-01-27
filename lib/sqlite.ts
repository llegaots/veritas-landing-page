/**
 * SQLite Database Module
 * 
 * This module provides a safe way to access better-sqlite3 with:
 * - Dynamic imports (prevents bundling in Vercel)
 * - Hard Vercel guard (never allows local SQLite in production)
 * - Graceful fallback when module is not available
 */

/**
 * Hard stop: never allow local sqlite in Vercel
 */
function isVercel(): boolean {
  return !!(
    process.env.VERCEL === '1' || 
    process.env.VERCEL_ENV || 
    process.env.VERCEL_URL ||
    process.cwd() === '/var/task'
  );
}

/**
 * Get local SQLite database instance
 * 
 * @throws Error if called in Vercel environment
 * @throws Error if better-sqlite3 is not available
 */
export async function getLocalSqliteDb() {
  // Hard stop: never allow local sqlite in Vercel
  if (isVercel()) {
    throw new Error("Local SQLite is disabled on Vercel. Use Supabase instead.");
  }

  // Dynamic load so bundler doesn't require it at build time
  // Use Function constructor to make import truly dynamic and prevent bundler analysis
  let Database: any;
  try {
    // Use Function constructor to create a truly dynamic import that bundlers won't analyze
    const importBetterSqlite3 = new Function('specifier', 'return import(specifier)');
    const mod: any = await importBetterSqlite3('better-sqlite3');
    Database = mod.default ?? mod;
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
      throw new Error("better-sqlite3 is not installed. Install it with: npm install better-sqlite3");
    }
    throw error;
  }

  // Local only - never in Vercel
  const path = await import('path');
  const fs = await import('fs');
  
  const DB_DIR = path.join(process.cwd(), 'data');
  const DB_PATH = path.join(DB_DIR, 'local.db');

  // Only create directory in local development
  if (!fs.existsSync(DB_DIR)) {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create database directory: ${DB_DIR}`);
    }
  }

  const db = new Database(DB_PATH);
  return db;
}

/**
 * Check if better-sqlite3 is available (for testing/checking)
 */
export async function isSqliteAvailable(): Promise<boolean> {
  if (isVercel()) {
    return false;
  }
  
  try {
    // Use Function constructor to create a truly dynamic import that bundlers won't analyze
    const importBetterSqlite3 = new Function('specifier', 'return import(specifier)');
    await importBetterSqlite3('better-sqlite3');
    return true;
  } catch {
    return false;
  }
}

