# Quick Start: Sync to Airtable

## 1. Get Your Airtable Credentials

### API Key
1. Go to https://airtable.com/api
2. Click "Create a personal access token"
3. Name it (e.g., "Veritas Sync")
4. Copy the token (starts with `pat...`)

### Base ID
1. Open your Airtable base
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. Copy the part after `/app` (e.g., `appXXXXXXXXXXXXXX`)

## 2. Create the Table in Airtable

Create a table called **"Investors"** with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| Name | Single line text | |
| Anonymous ID | Single line text | |
| Email | Email | |
| Intent Score | Number | |
| Engagement Level | Single select | High, Medium, Low |
| Demo Booked | Single select | Yes, No |
| Page Views | Number | |
| Return Visits | Number | |
| Max Scroll Depth | Single line text | |
| CTA Clicks | Number | |
| Avg Time on Page (s) | Number | |
| Quick Exits | Number | |
| First Visit | Date | Include time |
| Last Visit | Date | Include time |
| Status | Single select | Demo Booked, High Intent, Medium Intent, Low Intent |

## 3. Add Environment Variables

Add to `.env.local`:

```bash
AIRTABLE_API_KEY=pat_your_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
AIRTABLE_TABLE_NAME=Investors
```

## 4. Run the Script

```bash
npm run sync:airtable
```

Or directly:

```bash
node scripts/sync-to-airtable.js
```

## What Gets Synced?

Only **high-intent leads**:
- ✅ Booked a demo
- ✅ Intent score >= 5
- ✅ Return visitors
- ✅ Provided their name

The script will:
- Create new records for new leads
- Update existing records (matched by Anonymous ID)
- Skip low-intent visitors

## Troubleshooting

**"Table not found"** → Create the table in Airtable first

**"Invalid API key"** → Make sure it starts with `pat...` and is a Personal Access Token

**"Base not found"** → Check the Base ID in your Airtable URL

