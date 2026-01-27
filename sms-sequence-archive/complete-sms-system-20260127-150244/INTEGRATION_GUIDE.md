# SMS Sequence Integration Guide

## How It Currently Works

The SMS sequence system is **NOT automatically connected** to lead creation yet. Here's how to set it up:

## Current Flow

1. **Lead Created** → Currently manual
2. **Trigger Event** → Must call `/api/events/lead.created` manually
3. **Sequence Runs** → Creates message jobs
4. **Cron Job** → Sends messages at scheduled times

## How to Connect It

### Option 1: Automatic Integration (Recommended)

When a lead is created in your system, call the trigger endpoint:

```typescript
// In your lead creation code (e.g., form submission, API route)
async function createLead(leadData: {
  lead_id: string;
  phone: string;
  name?: string;
  email?: string;
  investor_id?: string;
  [key: string]: any;
}) {
  // 1. Save lead to your database
  const lead = await saveLeadToDatabase(leadData);
  
  // 2. Trigger SMS sequence automatically
  await fetch('/api/events/lead.created', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_PASSWORD}`,
    },
    body: JSON.stringify({
      lead_id: lead.id || lead.anonymous_id,
      phone: lead.phone || lead.phone_number,
      attributes: {
        FirstName: lead.name?.split(' ')[0] || lead.first_name,
        PropertyName: lead.property_name || 'Investment Opportunity',
        investor_id: lead.investor_id,
        email: lead.email,
        ...leadData.attributes,
      },
    }),
  });
  
  return lead;
}
```

### Option 2: Webhook Integration

If leads come from external sources (forms, CRM, etc.), set up a webhook:

```typescript
// app/api/webhooks/lead-created/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const webhookSecret = request.headers.get('x-webhook-secret');
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leadData = await request.json();
  
  // Forward to SMS sequence trigger
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events/lead.created`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_PASSWORD}`,
    },
    body: JSON.stringify({
      lead_id: leadData.id,
      phone: leadData.phone,
      attributes: leadData,
    }),
  });

  return NextResponse.json({ success: true });
}
```

## Linking to Investor List

The system supports linking leads to investors via `investor_id`:

```typescript
// When creating a lead, include investor_id if matched
await fetch('/api/events/lead.created', {
  method: 'POST',
  body: JSON.stringify({
    lead_id: 'lead_123',
    phone: '+15551234567',
    attributes: {
      FirstName: 'John',
      investor_id: 'investor_456', // Links to investor list
      PropertyName: 'Oak Street Apartments',
    },
  }),
});
```

## Where Leads Are Created

Currently, leads come from:
1. **Visitor Tracking** (`anonymous_id` from events table)
2. **Investor List** (manual entry in `/admin/investors`)
3. **Manual Entry** (via test endpoint `/api/admin/test-lead`)

## Next Steps

1. **Identify where leads are created** in your system
2. **Add trigger call** to that location
3. **Map lead data** to SMS sequence attributes (FirstName, PropertyName, etc.)
4. **Test** with `/api/admin/test-lead` endpoint

## Testing

```bash
# Test lead creation with SMS trigger
curl -X POST "http://localhost:3000/api/admin/test-lead?key=veritas2024admin" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "test_123",
    "phone": "+15551234567",
    "attributes": {
      "FirstName": "John",
      "PropertyName": "Test Property",
      "investor_id": "investor_456"
    }
  }'
```

## Variables Available in SMS Messages

- `{{FirstName}}` - Lead's first name
- `{{PropertyName}}` - Property name
- `{{investor_id}}` - Investor ID (if linked)
- Any custom attributes passed in `attributes` object

