-- SQL to create the investors table in Supabase
-- Run this in your Supabase SQL Editor before running the import script
-- This matches your Airtable table structure

CREATE TABLE IF NOT EXISTS investors (
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investors_airtable_id ON investors(airtable_id);
CREATE INDEX IF NOT EXISTS idx_investors_email ON investors(email_address);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);
CREATE INDEX IF NOT EXISTS idx_investors_source ON investors(source);
CREATE INDEX IF NOT EXISTS idx_investors_ready_for_follow_up ON investors(ready_for_follow_up);
CREATE INDEX IF NOT EXISTS idx_investors_created_time ON investors(created_time);

-- Enable Row Level Security (optional)
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
DROP POLICY IF EXISTS "Allow all operations for service role" ON investors;
CREATE POLICY "Allow all operations for service role" ON investors
  FOR ALL
  USING (true)
  WITH CHECK (true);
