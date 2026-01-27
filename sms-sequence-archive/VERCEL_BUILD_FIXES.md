# Vercel Build Fixes - January 27, 2026

This document summarizes all fixes applied to resolve Vercel deployment issues related to better-sqlite3 and build-time environment variable checks.

## ✅ Fixes Applied

### 1. Made better-sqlite3 Optional Dependency

**File**: `package.json`

- Moved `better-sqlite3` and `@types/better-sqlite3` from `dependencies` to `optionalDependencies`
- This prevents npm from failing if better-sqlite3 cannot be installed (e.g., in Vercel)

**Before**:
```json
"dependencies": {
  "@types/better-sqlite3": "^7.6.13",
  ...
}
```

**After**:
```json
"optionalDependencies": {
  "better-sqlite3": "^12.6.2",
  "@types/better-sqlite3": "^7.6.13"
}
```

### 2. Created Dynamic SQLite Import Module

**File**: `lib/sqlite.ts` (NEW)

- Created new module with dynamic import pattern
- Hard Vercel guard that throws error if called in Vercel
- Uses `await import("better-sqlite3")` instead of static `require()` or `import`
- Guards all filesystem operations (only runs in local dev)

**Key Features**:
- Dynamic import prevents bundler from requiring better-sqlite3 at build time
- Vercel detection checks multiple environment variables
- Throws clear error messages if misused

### 3. Updated Database Module

**File**: `lib/db.ts`

- Removed static `require('better-sqlite3')` call
- Updated `getLocalDb()` to use async `getLocalSqliteDb()` from `lib/sqlite.ts`
- Made `getLocalDb()` async to support dynamic imports
- Updated all callers to use `await getLocalDb()`

**Changes**:
- Removed module-level `require('better-sqlite3')`
- Removed `getDatabase()` helper function
- All SQLite access now goes through `lib/sqlite.ts`

### 4. Fixed Environment Variable Validation

**Files**: 
- `app/api/webhooks/airtable-sync/route.ts`
- `app/api/cron/send-due-messages/route.ts`

**Problem**: Environment variables were checked at module scope, causing build failures when env vars aren't available during build.

**Solution**: Moved env validation to runtime functions called inside request handlers.

**Before**:
```typescript
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing env vars');
}
```

**After**:
```typescript
function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  return { supabaseUrl, supabaseServiceKey };
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
  // ... use env vars
}
```

### 5. Added Node.js Runtime to Webhook Routes

**Files**:
- `app/api/webhooks/airtable-sync/route.ts`
- `app/api/webhooks/investor-created/route.ts`
- `app/api/cron/send-due-messages/route.ts`

Added explicit Node.js runtime to prevent Edge runtime issues:

```typescript
export const runtime = 'nodejs';
```

### 6. Created Build-Time Check Script

**File**: `scripts/check-native-imports.js` (NEW)

- Scans codebase for static better-sqlite3 imports
- Runs before every build via `prebuild` script
- Fails fast with clear error messages if violations found

**Patterns Checked**:
- `from "better-sqlite3"`
- `require("better-sqlite3")`
- `import ... from "better-sqlite3"`

### 7. Added Prebuild Script

**File**: `package.json`

Added prebuild hook to run check script:

```json
{
  "scripts": {
    "prebuild": "node scripts/check-native-imports.js"
  }
}
```

## 🔍 Verification

### Check Script
```bash
npm run prebuild
# or
node scripts/check-native-imports.js
```

Expected output: `✅ No static better-sqlite3 imports found`

### Local Build Test
```bash
rm -rf node_modules .next
npm ci
npm run build
```

This should now succeed without trying to compile better-sqlite3.

## 📋 Filesystem Operations

All filesystem operations are now guarded:

1. **lib/sqlite.ts**: 
   - Checks `isVercel()` before any filesystem operations
   - Throws error immediately if in Vercel
   - Only creates directories in local development

2. **lib/db.ts**:
   - All SQLite access goes through `getLocalSqliteDb()` which has Vercel guard
   - No direct filesystem operations

## 🚨 Important Notes

1. **Never use static imports** of better-sqlite3 anywhere in the codebase
2. **Always use** `getLocalSqliteDb()` from `lib/sqlite.ts` for SQLite access
3. **Environment variables** should only be validated at runtime, not module scope
4. **Webhook routes** should have `export const runtime = 'nodejs'` to avoid Edge runtime issues
5. **Filesystem operations** are only allowed in local development (guarded by Vercel checks)

## 🎯 What This Fixes

- ✅ Vercel build failures due to better-sqlite3 native module compilation
- ✅ Build failures from env validation at module scope
- ✅ Edge runtime issues with Node.js-only modules
- ✅ Filesystem write attempts in Vercel
- ✅ Future regressions (via prebuild check script)

## 📝 Testing Checklist

- [x] Check script passes: `npm run prebuild`
- [x] Local build succeeds: `npm run build`
- [x] No static imports found
- [x] All webhook routes have `runtime = 'nodejs'`
- [x] All env validation moved to runtime
- [x] Filesystem operations guarded

## 🔗 Related Files

- `lib/sqlite.ts` - Dynamic SQLite import module
- `lib/db.ts` - Database abstraction layer
- `scripts/check-native-imports.js` - Build-time check script
- `package.json` - Optional dependencies and prebuild script
- `app/api/webhooks/*/route.ts` - Webhook routes with runtime config
- `app/api/cron/*/route.ts` - Cron routes with runtime config

---

**Date**: January 27, 2026  
**Status**: ✅ All fixes applied and verified

