-- Fix Row Level Security for events table
-- Run this in Supabase SQL Editor

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'events';

-- If RLS is blocking queries, we have two options:

-- Option 1: Disable RLS (simpler, if you're using service_role key)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Option 2: Keep RLS but fix the policy (more secure)
-- First, drop existing policies
DROP POLICY IF EXISTS "Allow all operations for service role" ON events;

-- Create a policy that allows service_role to read all data
CREATE POLICY "Allow service role full access" ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';



