-- Supabase Database Trigger to Automatically Trigger SMS Sequence
-- When a new investor is created with status "New Lead"
-- 
-- This trigger calls a webhook endpoint when a new investor is inserted
-- Run this SQL in your Supabase SQL Editor

-- Create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION trigger_sms_on_new_investor()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://veritas-landing-page.vercel.app/api/webhooks/investor-created';
  -- For local development, use: 'http://localhost:3000/api/webhooks/investor-created'
  webhook_secret TEXT := 'veritas2024admin';
  response_status INT;
  response_body TEXT;
BEGIN
  -- Only trigger if status is "New Lead" and phone number exists
  IF LOWER(TRIM(NEW.status)) = 'new lead' AND NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    -- Call the webhook endpoint
    SELECT status, content INTO response_status, response_body
    FROM http((
      'POST',
      webhook_url,
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('x-webhook-secret', webhook_secret)
      ],
      'application/json',
      json_build_object(
        'investor', json_build_object(
          'id', NEW.id,
          'investor_name', NEW.investor_name,
          'phone_number', NEW.phone_number,
          'email_address', NEW.email_address,
          'status', NEW.status,
          'deal', NEW.deal,
          'source', NEW.source,
          'airtable_id', NEW.airtable_id
        )
      )::text
    )::http_request);
    
    -- Log the result (optional)
    RAISE NOTICE 'SMS webhook triggered for investor %: Status %', NEW.id, response_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS investor_created_sms_trigger ON investors;
CREATE TRIGGER investor_created_sms_trigger
  AFTER INSERT ON investors
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sms_on_new_investor();

-- Note: This requires the http extension to be enabled in Supabase
-- Run this first: CREATE EXTENSION IF NOT EXISTS http;



