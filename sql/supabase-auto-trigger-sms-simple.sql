-- Supabase Database Trigger to Automatically Trigger SMS Sequences
-- When a new investor with status "New Lead" is created
-- 
-- This trigger calls /api/events/lead.created which automatically finds
-- all active sequences with trigger.type === 'lead.created' and starts them
--
-- Step 1: Enable the pg_net extension (for making HTTP requests)
-- Step 2: Run this entire script
-- Step 3: Test by inserting a new investor

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call the lead.created event endpoint
CREATE OR REPLACE FUNCTION trigger_sms_on_new_investor()
RETURNS TRIGGER AS $$
DECLARE
  base_url TEXT;
  webhook_url TEXT;
  admin_password TEXT := 'veritas2024admin';
  response_status INT;
BEGIN
  -- Only trigger if status is "New Lead" and phone number exists
  IF LOWER(TRIM(NEW.status)) = 'new lead' AND NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    
    -- Determine base URL (use localhost for development, production otherwise)
    -- For local development, set: ALTER DATABASE postgres SET app.settings.base_url = 'http://localhost:3000';
    -- For production, leave unset to use default production URL
    base_url := COALESCE(
      current_setting('app.settings.base_url', true),
      'http://localhost:3000'  -- Default to localhost for local development
    );
    
    webhook_url := base_url || '/api/events/lead.created';
    
    -- Call the lead.created event endpoint
    -- This endpoint automatically finds all active sequences with trigger.type === 'lead.created'
    -- and starts them for this lead
    PERFORM
      net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || admin_password
        ),
        body := jsonb_build_object(
          'lead_id', 'investor_' || NEW.id::text,
          'phone', NEW.phone_number,
          'attributes', jsonb_build_object(
            'FirstName', COALESCE(split_part(NEW.investor_name, ' ', 1), 'Investor'),
            'FullName', COALESCE(NEW.investor_name, 'Investor'),
            'PropertyName', COALESCE(NEW.deal, 'Test Property'),
            'CalendarLink', 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call',
            'Email', COALESCE(NEW.email_address, ''),
            'Phone', NEW.phone_number,
            'investor_id', NEW.id::text,
            'status', NEW.status,
            'source', COALESCE(NEW.source, '')
          )
        )
      );
    
    RAISE NOTICE 'SMS sequence triggered for investor % (phone: %)', NEW.id, NEW.phone_number;
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

-- Verify the trigger was created
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'investor_created_sms_trigger';

-- Test the trigger (uncomment to test)
-- INSERT INTO investors (investor_name, phone_number, status, source)
-- VALUES ('Test Auto Trigger', '+14385017336', 'New Lead', 'Test');
-- 
-- This should automatically:
-- 1. Call /api/events/lead.created
-- 2. Find all active sequences with trigger.type === 'lead.created'
-- 3. Start those sequences for this lead
-- 4. Schedule SMS messages according to the sequence timing
