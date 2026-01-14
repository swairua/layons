# Quotation Creation Error - Fix

## Problem

Creating quotations was failing with the error: **"Failed to create quotation: TypeError: Failed to fetch"**

## Root Cause

The `quotations` and `quotation_items` tables in the database were missing several columns that the application code was trying to insert:

### Missing Columns in `quotations` table:
- `currency` - Currency code (KES, USD, EUR, GBP, etc.)

### Missing Columns in `quotation_items` table:
- `tax_percentage` - Tax percentage for line items
- `tax_amount` - Calculated tax amount
- `tax_inclusive` - Whether tax is included in unit price
- `section_name` - Section/category name for grouping
- `section_labor_cost` - Labor cost for the section

When the application tried to insert data with these columns, the database rejected the insert because the columns didn't exist, causing the "Failed to fetch" error.

## Solution

Two migration files have been created to add these missing columns:

1. **`supabase/migrations/20250214000000_add_currency_to_quotations.sql`**
   - Adds the `currency` column to the `quotations` table

2. **`supabase/migrations/20250214000001_add_tax_and_section_to_quotation_items.sql`**
   - Adds tax and section columns to the `quotation_items` table

## How to Apply the Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to the **SQL Editor**
3. Create a new query and copy the contents of the migration files
4. Execute each migration in order:
   - First: `supabase/migrations/20250214000000_add_currency_to_quotations.sql`
   - Then: `supabase/migrations/20250214000001_add_tax_and_section_to_quotation_items.sql`

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd your-project-directory

# Push the migrations
supabase db push
```

This will automatically apply all pending migrations in the `supabase/migrations/` directory.

### Option 3: Manual SQL Execution

Execute the following SQL commands directly in your Supabase SQL Editor:

**Step 1: Add currency to quotations**
```sql
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

COMMENT ON COLUMN quotations.currency IS 'Currency code: KES, USD, EUR, GBP, etc.';
```

**Step 2: Add tax and section columns to quotation_items**
```sql
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS section_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS section_labor_cost DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN quotation_items.tax_percentage IS 'Tax percentage for this line item';
COMMENT ON COLUMN quotation_items.tax_amount IS 'Calculated tax amount for this line item';
COMMENT ON COLUMN quotation_items.tax_inclusive IS 'Whether tax is included in the unit price';
COMMENT ON COLUMN quotation_items.section_name IS 'Section/category name for grouping items';
COMMENT ON COLUMN quotation_items.section_labor_cost IS 'Labor cost for the section containing this item';
```

## Verification

After applying the migrations, verify that the columns were added successfully:

```sql
-- Check quotations table
\d quotations

-- Check quotation_items table
\d quotation_items
```

You should see the new columns listed with their data types.

## Testing

Once the migrations are applied:

1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Navigate to the **Quotations** page
3. Click **"+ New Quotation"**
4. Fill in the quotation details and items
5. Click **"Create Quotation"**

The quotation should now be created successfully!

## What Changed

### In `database-schema.sql`:
- Added `currency VARCHAR(3) DEFAULT 'KES'` column to the quotations table definition
- Added tax and section columns to the quotation_items table definition

These changes ensure that the database schema matches what the application code expects.

## Files Modified

1. **`supabase/migrations/20250214000000_add_currency_to_quotations.sql`** (NEW)
2. **`supabase/migrations/20250214000001_add_tax_and_section_to_quotation_items.sql`** (NEW)
3. **`database-schema.sql`** (UPDATED)

## Related Code

The CreateQuotationModal component in `src/components/quotations/CreateQuotationModal.tsx` was correctly trying to insert these columns. The issue was that the database didn't have the columns defined.
