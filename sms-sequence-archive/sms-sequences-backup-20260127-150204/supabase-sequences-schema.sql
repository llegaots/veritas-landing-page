-- Supabase Schema for SMS Sequence Automation
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sequences table - Main sequence records
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID, -- For multi-tenant (nullable for now)
  name TEXT NOT NULL,
  active_version_id UUID, -- Foreign key to sequence_versions
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sequence versions - Versioned specs
CREATE TABLE IF NOT EXISTS sequence_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  spec_jsonb JSONB NOT NULL, -- The full SequenceSpec
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  
  UNIQUE(sequence_id, version_number)
);

-- Sequence runs - Execution instances
CREATE TABLE IF NOT EXISTS sequence_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_version_id UUID NOT NULL REFERENCES sequence_versions(id) ON DELETE CASCADE,
  lead_id TEXT, -- Maps to anonymous_id from events table
  investor_id INTEGER, -- Foreign key to investors table (nullable)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed')),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  current_node_id TEXT, -- Current position in the sequence
  context_jsonb JSONB DEFAULT '{}', -- Runtime variables
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message jobs - Scheduled SMS sends
CREATE TABLE IF NOT EXISTS message_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES sequence_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- Which node in the sequence
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  provider_status TEXT, -- Twilio status
  error TEXT,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sequence events table - For trigger ingestion (separate from main events table)
-- Note: This is different from the main 'events' table used for tracking
CREATE TABLE IF NOT EXISTS sequence_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID, -- For multi-tenant
  type TEXT NOT NULL, -- e.g., 'lead.created', 'lead.demo_booked', 'investor.matched'
  payload JSONB NOT NULL, -- Event data (lead_id, phone, attributes, etc.)
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log - Change tracking
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  version_id UUID REFERENCES sequence_versions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'versioned')),
  patches_jsonb JSONB, -- JSON Patch operations
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sequences_active_version ON sequences(active_version_id);
CREATE INDEX IF NOT EXISTS idx_sequences_org ON sequences(org_id) WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sequence_versions_sequence ON sequence_versions(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_versions_version ON sequence_versions(sequence_id, version_number);

CREATE INDEX IF NOT EXISTS idx_sequence_runs_version ON sequence_runs(sequence_version_id);
CREATE INDEX IF NOT EXISTS idx_sequence_runs_lead ON sequence_runs(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_runs_investor ON sequence_runs(investor_id) WHERE investor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_runs_status ON sequence_runs(status);
CREATE INDEX IF NOT EXISTS idx_sequence_runs_started ON sequence_runs(started_at);

CREATE INDEX IF NOT EXISTS idx_message_jobs_run ON message_jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_message_jobs_scheduled ON message_jobs(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_message_jobs_status ON message_jobs(provider_status) WHERE provider_status IS NOT NULL;

-- Sequence events table indexes
CREATE INDEX IF NOT EXISTS idx_sequence_events_type ON sequence_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sequence_events_org ON sequence_events(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_events_status ON sequence_events(processing_status, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_sequence ON audit_log(sequence_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_version ON audit_log(version_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_runs_updated_at
  BEFORE UPDATE ON sequence_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_jobs_updated_at
  BEFORE UPDATE ON message_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON sequences
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON sequence_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON sequence_runs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON message_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON sequence_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON audit_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: For authenticated users, you would add policies like:
-- CREATE POLICY "Users can manage their org's sequences" ON sequences
--   FOR ALL
--   USING (org_id = current_setting('app.current_org_id')::uuid)
--   WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);

