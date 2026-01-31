-- Add email support to message_jobs table
-- This migration adds columns to support both SMS and Email jobs

-- Add job_type column to distinguish between SMS and Email jobs
ALTER TABLE message_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'sms' CHECK (job_type IN ('sms', 'email'));

-- Make phone_number nullable (email jobs don't need it)
ALTER TABLE message_jobs
  ALTER COLUMN phone_number DROP NOT NULL;

-- Make message_text nullable (email jobs use different fields)
ALTER TABLE message_jobs
  ALTER COLUMN message_text DROP NOT NULL;

-- Add email-specific columns
ALTER TABLE message_jobs
  ADD COLUMN IF NOT EXISTS email_address TEXT,
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_html TEXT,
  ADD COLUMN IF NOT EXISTS email_text TEXT;

-- Add constraint: SMS jobs must have phone_number and message_text
-- Email jobs must have email_address, email_subject, and email_html
-- This is enforced at the application level, but we can add a check constraint
-- Note: PostgreSQL doesn't support conditional NOT NULL, so we'll enforce this in the app

-- Add index for email jobs
CREATE INDEX IF NOT EXISTS idx_message_jobs_email ON message_jobs(email_address) WHERE email_address IS NOT NULL;

-- Add index for job_type
CREATE INDEX IF NOT EXISTS idx_message_jobs_type ON message_jobs(job_type);

-- Update existing jobs to have job_type = 'sms' (default)
UPDATE message_jobs SET job_type = 'sms' WHERE job_type IS NULL;


