# Import Airtable to Supabase Guide

This guide will help you import your existing Airtable investor data into Supabase.

## Your Airtable Table Structure

Based on your Airtable table, these columns will be imported:

- **Investor Name** → `investor_name`
- **Email Address** → `email_address`
- **Phone Number** → `phone_number`
- **Status** → `status`
- **$ Amount$** → `amount_dollars` (numeric)
- **Investor Notes** → `investor_notes`
- **Deal** → `deal`
- **Source** → `source`
- **Investor Type** → `investor_type`
- **Liquid Ready** → `liquid_ready`
- **Created Time** → `created_time` (timestamp)
- **readyForFollowUp** → `ready_for_follow_up`

## Step 1: Get Your Credentials

### Airtable Credentials
1. **API Key**: Go to https://airtable.com/api → Create Personal Access Token (starts with `pat...`)
2. **Base ID**: From your Airtable URL: `https://airtable.com/appXXXXXXXXXXXXXX/...` (the part after `/app`)
3. **Table Name**: The name of your table in Airtable

### Supabase Credentials
1. **Supabase URL**: Found in your Supabase project settings → API → Project URL
2. **Supabase Anon Key**: Found in your Supabase project settings → API → Project API keys → `anon` `public`

## Step 2: Create the Investors Table in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- See scripts/import-airtable-to-supabase.sql for the full SQL
```

Or run the SQL file directly:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/import-airtable-to-supabase.sql`
3. Paste and run

The table will include:
- All your Airtable columns mapped to Supabase
- `airtable_id` field to track the original Airtable record ID (prevents duplicates)
- `created_at` and `updated_at` timestamps
- Indexes for fast queries

## Step 3: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Airtable
AIRTABLE_API_KEY=pat_your_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
AIRTABLE_TABLE_NAME=YourTableName

# Supabase (should already be set)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Run the Import Script

```bash
npm run import:airtable
```

Or directly:

```bash
node scripts/import-airtable-to-supabase.js
```

## Field Mapping Details

| Airtable Field | Supabase Column | Type | Notes |
|----------------|-----------------|------|-------|
| Investor Name | `investor_name` | TEXT | |
| Email Address | `email_address` | TEXT | |
| Phone Number | `phone_number` | TEXT | |
| Status | `status` | TEXT | Single select values preserved |
| $ Amount$ | `amount_dollars` | NUMERIC | Removes $ and commas, converts to number |
| Investor Notes | `investor_notes` | TEXT | |
| Deal | `deal` | TEXT | |
| Source | `source` | TEXT | Single select values preserved |
| Investor Type | `investor_type` | TEXT | |
| Liquid Ready | `liquid_ready` | TEXT | |
| Created Time | `created_time` | TIMESTAMP | Converts Airtable date to ISO timestamp |
| readyForFollowUp | `ready_for_follow_up` | TEXT | Formula field values preserved |

## How It Works

1. **Fetches all records** from your Airtable table
2. **Maps field names** from Airtable to Supabase columns (exact match)
3. **Handles data types**:
   - Dates → ISO timestamps
   - Currency ($ Amount$) → Numeric (removes $ and commas)
   - Select fields → Text (preserves values)
   - Arrays → Comma-separated strings
4. **Checks for existing records** by `airtable_id` (prevents duplicates)
5. **Creates new records** or **updates existing ones**
6. **Processes in batches** of 100 to avoid rate limits

## Troubleshooting

### "Table investors does not exist"
- Run the SQL from `scripts/import-airtable-to-supabase.sql` in Supabase SQL Editor first

### "Could not find table" in Airtable
- Check your `AIRTABLE_TABLE_NAME` matches exactly (case-sensitive)
- Verify the table exists in your Airtable base

### Fields not mapping correctly
- The script shows a sample record structure when it runs
- Check that your Airtable field names match exactly (case-sensitive)
- Edit the `fieldMappings` object in the script if needed

### "$ Amount$" not importing correctly
- The script automatically removes $ signs and commas
- If you have a different currency format, update the mapping function

### "Invalid API key" for Airtable
- Make sure you're using a Personal Access Token (starts with `pat...`)
- Not a base-specific API key

### "Invalid Supabase credentials"
- Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`
- Get them from Supabase Dashboard → Settings → API

## After Import

Once imported, you can:
- Query investors from Supabase in your application
- Set up automatic syncing (modify the script to run periodically)
- Add additional fields to the Supabase table as needed
- Use the `airtable_id` to track which records came from Airtable

## Next Steps

Consider setting up:
1. **Automatic syncing**: Run the script on a schedule (cron job, GitHub Actions, etc.)
2. **Bidirectional sync**: Update the script to sync changes both ways
3. **Webhooks**: Use Airtable webhooks to sync changes in real-time
