-- SMS Replies Table
-- Stores incoming SMS replies from investors
CREATE TABLE IF NOT EXISTS sms_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_job_id UUID REFERENCES message_jobs(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  from_number TEXT NOT NULL,
  received_at TIMESTAMP DEFAULT NOW(),
  provider_message_id TEXT, -- Twilio message SID
  provider_status TEXT, -- Twilio status
  investor_id INTEGER REFERENCES investors(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sms_replies_phone ON sms_replies(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_replies_job ON sms_replies(message_job_id);
CREATE INDEX IF NOT EXISTS idx_sms_replies_investor ON sms_replies(investor_id);
CREATE INDEX IF NOT EXISTS idx_sms_replies_received ON sms_replies(received_at);

-- Add replied_at column to message_jobs for quick filtering
ALTER TABLE message_jobs 
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_message_jobs_replied ON message_jobs(replied_at) WHERE replied_at IS NOT NULL;


