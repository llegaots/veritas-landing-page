-- SMS Interactions Table
-- Logs all SMS-related interactions (replies, STOP, Calendly bookings)
CREATE TABLE IF NOT EXISTS sms_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id INTEGER REFERENCES investors(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('reply', 'stop', 'calendly_booking')),
  message_body TEXT, -- For replies
  intent_score_change NUMERIC(5, 2) NOT NULL, -- Positive for good, negative for bad
  metadata JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_interactions_investor ON sms_interactions(investor_id);
CREATE INDEX IF NOT EXISTS idx_sms_interactions_phone ON sms_interactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_interactions_type ON sms_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_sms_interactions_created ON sms_interactions(created_at);

-- Add intent_score column to investors if it doesn't exist
ALTER TABLE investors 
  ADD COLUMN IF NOT EXISTS intent_score NUMERIC(5, 2) DEFAULT 0;

-- Create index for intent score
CREATE INDEX IF NOT EXISTS idx_investors_intent_score ON investors(intent_score);


