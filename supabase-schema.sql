-- Supabase Database Schema for Event Tracking
-- Run this SQL in your Supabase SQL Editor

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  properties JSONB NOT NULL,
  anonymous_id TEXT NOT NULL,
  name TEXT,
  url TEXT,
  referrer TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);

-- Enable Row Level Security (optional, for additional security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust based on your security needs)
-- For tracking, we typically want to allow inserts from the application
CREATE POLICY "Allow all operations for service role" ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);

