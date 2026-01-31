-- Update the database trigger to use localhost for local development
-- Run this in your Supabase SQL Editor

-- Update the trigger function to use localhost
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
    
    -- Use localhost for local development
    -- Change this back to 'https://veritas-landing-page.vercel.app' for production
    base_url := 'http://localhost:3000';
    
    webhook_url := base_url || '/api/events/lead.created';
    
    -- Call the lead.created event endpoint
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

