-- Add calendly_booking_date column to investors table
-- Run this in your Supabase SQL Editor

ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS calendly_booking_date TIMESTAMP;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_investors_calendly_booking ON investors(calendly_booking_date) WHERE calendly_booking_date IS NOT NULL;


