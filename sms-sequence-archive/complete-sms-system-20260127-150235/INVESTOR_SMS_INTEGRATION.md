# Investor SMS Sequence Integration

## ✅ Automatic SMS Trigger for "New Lead" Investors

The system now **automatically triggers SMS sequences** when investors with status **"New Lead"** are added to your investor list.

## How It Works

1. **Investor Created** → Investor added to database with status "New Lead"
2. **Webhook Triggered** → `/api/webhooks/investor-created` endpoint called
3. **Status Check** → Only triggers if status = "New Lead"
4. **SMS Sequence Starts** → Creates sequence run and schedules messages

## Integration Options

### Option 1: Airtable Webhook (Recommended)

If you're using Airtable, set up a webhook that calls this endpoint when a new record is created:

**Airtable Webhook Setup:**
1. Go to Airtable → Automations
2. Create new automation: "When record is created"
3. Add action: "Send webhook"
4. URL: `https://veritas-landing-page.vercel.app/api/webhooks/investor-created`
5. Headers: `x-webhook-secret: veritas2024admin`
6. Body: Send the full record data

**Webhook Payload Format:**
```json
{
  "fields": {
    "Investor Name": "John Doe",
    "Phone Number": "+15551234567",
    "Status": "New Lead",
    "Email Address": "john@example.com",
    "Property Name": "Oak Street Apartments"
  }
}
```

### Option 2: Direct API Call

Call the webhook endpoint directly when creating investors:

```typescript
// When creating a new investor
const investor = {
  id: '123',
  investor_name: 'John Doe',
  phone_number: '+15551234567',
  status: 'New Lead',
  email_address: 'john@example.com',
};

// Trigger SMS sequence
await fetch('/api/webhooks/investor-created', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': process.env.WEBHOOK_SECRET,
  },
  body: JSON.stringify({ investor }),
});
```

### Option 3: Database Trigger (PostgreSQL)

If investors are added directly to Supabase, you can set up a database trigger:

```sql
-- Create function to call webhook
CREATE OR REPLACE FUNCTION trigger_investor_sms()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for "New Lead" status
  IF NEW.status = 'New Lead' AND NEW.phone_number IS NOT NULL THEN
    -- Call webhook endpoint (requires pg_net extension)
    PERFORM net.http_post(
      url := 'https://your-domain.com/api/webhooks/investor-created',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'your_secret'
      ),
      body := jsonb_build_object(
        'investor', jsonb_build_object(
          'id', NEW.id,
          'investor_name', NEW.investor_name,
          'phone_number', NEW.phone_number,
          'email_address', NEW.email_address,
          'status', NEW.status,
          'property_name', NEW.deal
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER investor_sms_trigger
  AFTER INSERT ON investors
  FOR EACH ROW
  EXECUTE FUNCTION trigger_investor_sms();
```

## Testing

### Test with cURL

```bash
curl -X POST "http://localhost:3000/api/webhooks/investor-created" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: veritas2024admin" \
  -d '{
    "investor": {
      "id": "test_123",
      "investor_name": "Test Investor",
      "phone_number": "+15551234567",
      "status": "New Lead",
      "email_address": "test@example.com"
    }
  }'
```

### Test with Different Status (Should Skip)

```bash
curl -X POST "http://localhost:3000/api/webhooks/investor-created" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: veritas2024admin" \
  -d '{
    "investor": {
      "id": "test_456",
      "investor_name": "Test Investor 2",
      "phone_number": "+15551234567",
      "status": "Qualified",
      "email_address": "test2@example.com"
    }
  }'
```

Expected response: `{ "success": true, "skipped": true, "message": "Investor status is 'Qualified', not 'New Lead'. SMS sequence not triggered." }`

## Status Filter

The system **ONLY triggers SMS sequences** for investors with status **"New Lead"** (case-insensitive).

All other statuses are skipped:
- ✅ "New Lead" → SMS triggered
- ❌ "Qualified" → Skipped
- ❌ "Contacted" → Skipped
- ❌ "Converted" → Skipped
- ❌ Any other status → Skipped

## Required Fields

- `id` - Investor ID (required)
- `phone_number` - Phone number (required)
- `status` - Must be "New Lead" to trigger

## Optional Fields

- `investor_name` - Used for personalization ({{FirstName}})
- `email_address` - Stored in context
- `property_name` - Used for personalization ({{PropertyName}})

## Verification

After triggering, you can verify:

1. **Check Message Jobs**: `/admin/sequences/jobs?key=veritas2024admin`
2. **Check Sequence Runs**: View in Supabase `sequence_runs` table
3. **Check Events**: View in Supabase `sequence_events` table

## Troubleshooting

### SMS Not Triggering?

1. **Check Status**: Ensure investor status is exactly "New Lead" (case-insensitive)
2. **Check Phone**: Ensure `phone_number` is provided and valid
3. **Check Webhook Secret**: Ensure `x-webhook-secret` header matches `WEBHOOK_SECRET` env var
4. **Check Logs**: Check server logs for errors
5. **Check Sequence**: Ensure you have an active SMS sequence with trigger type "lead.created"

### Testing Locally

Set `WEBHOOK_SECRET` in `.env.local`:
```bash
WEBHOOK_SECRET=veritas2024admin
```

Or use the default (development mode allows requests without secret).

