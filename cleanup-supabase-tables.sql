-- Supabase Table Cleanup Script
-- This script removes unused tables and cleans up the database
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor

-- ============================================
-- STEP 1: List all current tables (for reference)
-- ============================================
-- Uncomment to see all tables:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- ============================================
-- STEP 2: Identify unused tables
-- ============================================
-- Based on codebase analysis, these tables are NOT used:
-- - audit_log (not queried anywhere in active codebase)
-- - sms_campaigns (old SMS system, replaced by sequences)
-- - sms_intent_keywords (old SMS system, not used)
-- - sms_messages (old SMS system, replaced by message_jobs)
-- - sms_sequence_steps (old SMS system, replaced by sequence_versions)
-- - sms_sequence_stops (old SMS system, replaced by sequence_versions)
-- - sms_sequences (old SMS system, replaced by sequences)

-- ============================================
-- STEP 3: Drop unused tables
-- ============================================

-- Drop audit_log table (not used in active codebase)
DROP TABLE IF EXISTS audit_log CASCADE;

-- Drop old SMS system tables (replaced by new sequence system)
DROP TABLE IF EXISTS sms_campaigns CASCADE;
DROP TABLE IF EXISTS sms_intent_keywords CASCADE;
DROP TABLE IF EXISTS sms_messages CASCADE;
DROP TABLE IF EXISTS sms_sequence_steps CASCADE;
DROP TABLE IF EXISTS sms_sequence_stops CASCADE;
DROP TABLE IF EXISTS sms_sequences CASCADE;

-- ============================================
-- STEP 4: Clean up orphaned data (optional)
-- ============================================

-- Remove sequence_runs without a valid sequence_version
DELETE FROM sequence_runs 
WHERE sequence_version_id NOT IN (SELECT id FROM sequence_versions);

-- Remove message_jobs without a valid sequence_run
DELETE FROM message_jobs 
WHERE run_id NOT IN (SELECT id FROM sequence_runs);

-- Remove sequence_versions without a valid sequence
DELETE FROM sequence_versions 
WHERE sequence_id NOT IN (SELECT id FROM sequences);

-- ============================================
-- STEP 5: Verify active tables remain
-- ============================================
-- These tables should remain (actively used):
-- ✅ events - Event tracking
-- ✅ investors - Investor data  
-- ✅ sequences - SMS sequences (new system)
-- ✅ sequence_versions - Sequence versions (new system)
-- ✅ sequence_runs - Sequence execution instances (new system)
-- ✅ message_jobs - Scheduled SMS messages (new system)
-- ✅ sequence_events - Sequence trigger events (new system)
--
-- These tables will be removed (unused):
-- ❌ audit_log - Unused change tracking
-- ❌ sms_campaigns - Old SMS system
-- ❌ sms_intent_keywords - Old SMS system
-- ❌ sms_messages - Old SMS system
-- ❌ sms_sequence_steps - Old SMS system
-- ❌ sms_sequence_stops - Old SMS system
-- ❌ sms_sequences - Old SMS system

-- ============================================
-- STEP 6: Final verification query
-- ============================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

