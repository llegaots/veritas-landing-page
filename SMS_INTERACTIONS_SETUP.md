# SMS Interactions & Intent Scoring Setup

## ✅ Setup Complete

The SMS interactions and intent scoring system is now fully set up and integrated.

## Database Schema

The following tables and columns have been created:

### `sms_interactions` Table
- Logs all SMS-related interactions (replies, STOP requests, Calendly bookings)
- Fields:
  - `id` (UUID, primary key)
  - `investor_id` (references investors table)
  - `phone_number` (TEXT, required)
  - `interaction_type` (TEXT, enum: 'reply', 'stop', 'calendly_booking')
  - `message_body` (TEXT, for replies)
  - `intent_score_change` (NUMERIC, positive for good, negative for bad)
  - `metadata` (JSONB, additional context)
  - `created_at` (TIMESTAMP)

### `investors.intent_score` Column
- Tracks cumulative intent score for each investor
- Default: 0
- Updated automatically when interactions occur

## Intent Score Calculation

### Positive Interactions
- **SMS Reply**: +5.0 points
- **Calendly Booking**: +15.0 points (highest value)

### Negative Interactions
- **STOP Request**: -10.0 points
- Score cannot go below 0

## Integration Points

### 1. Twilio SMS Webhook (`/api/webhooks/twilio-sms`)
- **Replies**: Logs interaction, updates intent score (+5.0)
- **STOP**: Logs interaction, updates intent score (-10.0), pauses sequences

### 2. Calendly Webhook (`/api/webhooks/calendly`)
- **Booking**: Logs interaction, updates intent score (+15.0), pauses sequences

### 3. Message Jobs API (`/api/admin/message-jobs`)
- Fetches interactions for display in logging page
- Includes intent scores in investor data

### 4. Logging Page (`/admin/sequences/jobs`)
- Displays intent score badges (color-coded by score level)
- Shows interaction history with counts
- Displays full interaction timeline

## How It Works

1. **When an investor replies to an SMS**:
   - Interaction logged in `sms_interactions`
   - Investor's `intent_score` increased by 5.0
   - Reply appears in message logs

2. **When an investor replies "STOP"**:
   - Interaction logged in `sms_interactions`
   - Investor's `intent_score` decreased by 10.0 (minimum 0)
   - All active sequences paused
   - Unsubscribe confirmation sent

3. **When an investor books via Calendly**:
   - Interaction logged in `sms_interactions`
   - Investor's `intent_score` increased by 15.0
   - All active sequences paused
   - Booking date updated in investors table

## Viewing Interactions

### In Message Logs Page
1. Navigate to `/admin/sequences/jobs`
2. Expand any investor card
3. View "Interaction History" section showing:
   - All interactions (replies, STOP, bookings)
   - Intent score changes
   - Timestamps
   - Message content (for replies)

### Intent Score Badges
- **Green (15+)**: Very high intent
- **Blue (5-14)**: Good intent
- **Yellow (1-4)**: Low intent
- **Gray (0)**: No intent

## Testing

Run the verification script:
```bash
node scripts/verify-sms-interactions-setup.js
```

This will check:
- ✅ `sms_interactions` table exists
- ✅ `intent_score` column exists on investors
- ✅ Recent interactions are being logged
- ✅ Investors with intent scores

## Next Steps

1. **Test SMS Reply**: Send an SMS to your Twilio number
2. **Test STOP**: Reply "STOP" to an SMS
3. **Test Calendly**: Book a meeting via Calendly
4. **Check Logs**: View interactions in `/admin/sequences/jobs`

## Database Migration

If you need to run the migration again:
```sql
-- Run supabase-sms-interactions-schema.sql in Supabase SQL Editor
```

The migration is idempotent (safe to run multiple times).


