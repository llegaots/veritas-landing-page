# Airtable Integration Setup Guide

This guide will help you set up Airtable to sync investor/lead data from your tracking system.

## Step 1: Get Your Airtable Credentials

### 1.1 Get Your API Key
1. Go to https://airtable.com/api
2. Select your base (or create a new one)
3. Copy your **Personal Access Token** (starts with `pat...`)

### 1.2 Get Your Base ID
1. Open your Airtable base
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The part after `/app` is your **Base ID** (e.g., `appXXXXXXXXXXXXXX`)

### 1.3 Create a Table
1. In your Airtable base, create a new table called **"Investors"** (or any name you prefer)
2. Add the following fields:

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| Name | Single line text | |
| Anonymous ID | Single line text | Used as unique identifier |
| Email | Email | |
| Intent Score | Number | |
| Engagement Level | Single select | Options: High, Medium, Low |
| Demo Booked | Single select | Options: Yes, No |
| Page Views | Number | |
| Return Visits | Number | |
| Max Scroll Depth | Single line text | e.g., "75%" |
| CTA Clicks | Number | |
| Avg Time on Page (s) | Number | |
| Quick Exits | Number | |
| First Visit | Date | Include time |
| Last Visit | Date | Include time |
| Status | Single select | Options: Demo Booked, High Intent, Medium Intent, Low Intent |

## Step 2: Configure Environment Variables

Create or update `.env.local` in your project root:

```bash
AIRTABLE_API_KEY=pat_your_api_key_here
AIRTABLE_BASE_ID=app_your_base_id_here
AIRTABLE_TABLE_NAME=Investors
```

## Step 3: Run the Sync Script

```bash
npx tsx scripts/sync-to-airtable.ts
```

## What Gets Synced?

The script will sync **high-intent leads** that meet any of these criteria:
- ✅ Booked a demo
- ✅ Intent score >= 5
- ✅ Return visitors (visited more than once)
- ✅ Provided their name

## Field Mapping

| Tracking Data | Airtable Field | Description |
|---------------|----------------|-------------|
| `name` | Name | Visitor's name (or "Visitor {ID}") |
| `anonymous_id` | Anonymous ID | Unique identifier |
| `email` | Email | From demo booking |
| `intent_score` | Intent Score | Calculated engagement score |
| `demo_booked > 0` | Demo Booked | Yes/No |
| `page_views` | Page Views | Number of sessions |
| `return_visits` | Return Visits | Number of return visits |
| `max_scroll_depth` | Max Scroll Depth | Highest scroll percentage |
| `cta_clicks` | CTA Clicks | Number of CTA button clicks |
| `avg_time_on_page` | Avg Time on Page (s) | Average seconds on page |
| `quick_exits` | Quick Exits | Number of quick exits |
| `first_visit` | First Visit | Timestamp of first visit |
| `last_visit` | Last Visit | Timestamp of most recent visit |

## Engagement Levels

- **High**: Demo booked OR intent score >= 8
- **Medium**: Intent score >= 3 OR return visits > 0
- **Low**: Everything else

## Status Values

- **Demo Booked**: Visitor scheduled a demo
- **High Intent**: Intent score >= 8
- **Medium Intent**: Intent score >= 5
- **Low Intent**: Everything else

## Troubleshooting

### Error: "Table not found"
- Make sure the table name in `.env.local` matches exactly (case-sensitive)
- Create the table in Airtable first

### Error: "Invalid API key"
- Check that your API key starts with `pat...`
- Make sure it's a Personal Access Token, not a base-specific API key
- Regenerate the token if needed

### Error: "Base not found"
- Verify the Base ID in your Airtable URL
- Make sure the base is accessible with your API key

### Rate Limiting
- The script processes records in batches of 10
- Waits 200ms between batches to avoid rate limits
- If you hit rate limits, wait a few minutes and try again

## Running Regularly

You can set up a cron job or scheduled task to run this script periodically:

```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/veritas-horizon-park && npx tsx scripts/sync-to-airtable.ts
```

Or add it to your deployment pipeline to run automatically.


