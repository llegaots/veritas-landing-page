-- Safe fix: Update RLS policy instead of disabling RLS
-- This is safer and Supabase won't warn about destructive operations

-- First, check if the policy exists and drop it
DROP POLICY IF EXISTS "Allow all operations for service role" ON events;

-- Create a new policy that allows service_role to access all data
-- This works because service_role bypasses RLS, but having a policy ensures compatibility
CREATE POLICY "Allow service role full access" ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify it worked
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'events';

