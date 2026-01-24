# Migration Guide: Update Investors Table

You have an existing `investors` table in Supabase with the old schema. You need to update it to match your Airtable structure.

## Option 1: Migrate (Preserves Data) ✅ **RECOMMENDED**

Use this if you have existing data you want to keep.

1. Open Supabase SQL Editor
2. Run `scripts/migrate-investors-table.sql`

This will:
- Rename columns: `name` → `investor_name`, `email` → `email_address`, etc.
- Add new columns: `investor_type`, `liquid_ready`, `ready_for_follow_up`, `amount_dollars`, `deal`, `source`, `created_time`
- Keep old columns (you can drop them later if not needed)
- Update indexes

**Note:** The old tracking columns (`intent_score`, `page_views`, etc.) will remain. You can drop them later if you don't need them.

## Option 2: Drop and Recreate (Deletes All Data) ⚠️

Use this ONLY if you don't have important data in the table.

1. Open Supabase SQL Editor
2. Run `scripts/migrate-investors-table-drop-recreate.sql`

This will:
- Delete the entire table
- Create a fresh table with the correct structure
- **WARNING: This deletes all existing data!**

## After Migration

Once you've migrated, you can run the import script:

```bash
npm run import:airtable
```

## Verify Migration

Run this SQL to verify your table structure:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'investors'
ORDER BY ordinal_position;
```

You should see:
- `investor_name`
- `email_address`
- `phone_number`
- `status`
- `investor_type`
- `liquid_ready`
- `ready_for_follow_up`
- `amount_dollars`
- `deal`
- `source`
- `investor_notes`
- `created_time`
- `airtable_id`
- `created_at`
- `updated_at`

