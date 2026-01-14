# Apply Quotation Table Migrations

The quotation feature requires database schema updates. Follow these steps:

## Quick Fix - Apply SQL Directly

1. **Go to your Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy and run this SQL (in this exact order)**

### Step 1: Add currency column to quotations
```sql
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

COMMENT ON COLUMN quotations.currency IS 'Currency code: KES, USD, EUR, GBP, etc.';
```

**Click Run ▶️**

### Step 2: Add tax columns to quotation_items
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

**Click Run ▶️**

4. **Verify success**
   - You should see "Success. No rows returned" for both queries
   - No errors should appear

5. **Back in the application**
   - Refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Try creating a quotation again
   - It should now work!

## Using Supabase CLI (Alternative)

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd your-project

# Push migrations
supabase db push

# Verify migrations were applied
supabase db pull
```

## If You Still Get Errors

If you get an error like "column already exists", that's OK - it means the columns are already in the table.

If you get a different error, please:
1. Copy the exact error message
2. Share it in the error toast (the error message now displays the exact issue)
3. Check that:
   - You're logged into the correct Supabase project
   - Your credentials have permission to modify tables
   - The `quotations` and `quotation_items` tables exist

## Verify the Fix

After applying the migrations:

1. Go to **Quotations** page in the app
2. Click **"+ New Quotation"**
3. Fill in the form:
   - Select a customer
   - Add at least one product
   - Fill in pricing details
4. Click **"Create Quotation"**
5. ✅ It should now create successfully!

## What Changed

These migrations add support for:
- **Currency selection** when creating quotations
- **Tax calculations** with inclusive/exclusive options  
- **Section-based grouping** of items with labor costs
- **Advanced quotation features** like materials subtotals and labor costs per section

All columns have sensible defaults (0 for amounts, 'KES' for currency) so existing data won't break.
