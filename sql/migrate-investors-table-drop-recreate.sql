-- Alternative: Drop and recreate the table (ONLY if you don't have important data!)
-- This is cleaner but will DELETE all existing data
-- Run this ONLY if you're okay losing existing data

-- Step 1: Drop the old table
DROP TABLE IF EXISTS investors CASCADE;

-- Step 2: Create the new table with correct structure
CREATE TABLE investors (
  id SERIAL PRIMARY KEY,
  airtable_id TEXT UNIQUE,
  
  -- Core investor information
  investor_name TEXT,
  email_address TEXT,
  phone_number TEXT,
  
  -- Status and tracking
  status TEXT,
  investor_type TEXT,
  liquid_ready TEXT,
  ready_for_follow_up TEXT,
  
  -- Financial
  amount_dollars NUMERIC(12, 2) DEFAULT 0,
  
  -- Deal information
  deal TEXT,
  source TEXT,
  
  -- Notes
  investor_notes TEXT,
  
  -- Timestamps
  created_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create indexes
CREATE INDEX idx_investors_airtable_id ON investors(airtable_id);
CREATE INDEX idx_investors_email ON investors(email_address);
CREATE INDEX idx_investors_status ON investors(status);
CREATE INDEX idx_investors_source ON investors(source);
CREATE INDEX idx_investors_ready_for_follow_up ON investors(ready_for_follow_up);
CREATE INDEX idx_investors_created_time ON investors(created_time);

-- Step 4: Enable RLS
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policy
CREATE POLICY "Allow all operations for service role" ON investors
  FOR ALL
  USING (true)
  WITH CHECK (true);


