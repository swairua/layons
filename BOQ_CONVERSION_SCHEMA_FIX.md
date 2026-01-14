# BOQ Conversion Schema Fix

## Problem

When attempting to convert a BOQ to an invoice, you may encounter this error:

```
Failed to update BOQ status: Could not find the 'converted_at' column of 'boqs' in the schema cache
```

This occurs because the database is missing two essential columns that track BOQ conversions:
- `converted_to_invoice_id`: UUID reference to the invoice created from the BOQ
- `converted_at`: Timestamp of when the BOQ was converted

## Root Cause

The migration that adds these columns was never applied to the database. The code in `src/hooks/useBOQ.ts` expects these columns to exist (lines 388-390), but they weren't created in the initial database schema.

## Solution

You need to:
1. **Apply the database migration** - Add the missing columns to the `boqs` table
2. **Refresh the Supabase schema cache** - So PostgREST detects the new columns

### Option A: Automated Fix (Recommended)

A new BOQ Conversion Fix component has been added. You can use it to automatically apply both steps:

1. Navigate to your BOQs page in the application
2. Look for the "BOQ Conversion Schema Fix" alert (it will appear if the error occurs)
3. Click "Apply Migration" 
4. Then click "Refresh Schema Cache"
5. Try converting a BOQ again

### Option B: Manual Fix via Supabase Dashboard

If the automated approach doesn't work, follow these steps:

#### Step 1: Apply the Migration

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project (klifzjcfnlaxminytmyh)
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Paste this SQL:

```sql
-- Add converted_to_invoice_id column (references the invoice created from this BOQ)
ALTER TABLE IF EXISTS boqs
ADD COLUMN IF NOT EXISTS converted_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add converted_at column (timestamp when BOQ was converted)
ALTER TABLE IF EXISTS boqs
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_boqs_converted_to_invoice_id ON boqs(converted_to_invoice_id);
CREATE INDEX IF NOT EXISTS idx_boqs_converted_at ON boqs(converted_at);
```

6. Click **Run**
7. You should see a success message

#### Step 2: Refresh the Schema Cache

1. In the same SQL Editor, click **New Query** again
2. Paste this SQL:

```sql
NOTIFY pgrst, 'reload schema';
```

3. Click **Run**
4. Wait 5-10 seconds for the cache to refresh

### Step 3: Test the Fix

1. Go back to your application
2. Navigate to the BOQs page
3. Try converting a BOQ to an invoice
4. The status should update to "Converted" and the badge should change
5. Check your browser console - you should see success messages instead of errors

## Files Modified

- `migrations/011_add_boq_conversion_fields.sql` - New migration that adds the missing columns
- `src/components/boq/BOQConversionFix.tsx` - New component to help apply the fix

## What Changed

### Migration Details

The migration (`migrations/011_add_boq_conversion_fields.sql`) adds:

1. **converted_to_invoice_id** (UUID)
   - References the invoice created from this BOQ
   - Allows deletion of the referenced invoice to cascade and clear this field
   - Indexed for fast lookups

2. **converted_at** (TIMESTAMPTZ)
   - Timestamp of when the BOQ was converted
   - Helps track conversion history
   - Indexed for fast queries

### Code Already Expecting These Columns

The following code was already referencing these columns:

**src/hooks/useBOQ.ts (lines 388-390)**
```typescript
const { error: updateError } = await supabase
  .from('boqs')
  .update({
    converted_to_invoice_id: invoice.id,
    converted_at: new Date().toISOString(),
    status: 'converted'
  })
  .eq('id', boqId)
  .eq('company_id', companyId);
```

**migrations/20250214_add_boq_status.sql**
```sql
UPDATE boqs
SET status = CASE 
  WHEN converted_to_invoice_id IS NOT NULL THEN 'converted'
  ELSE 'draft'
END
WHERE status = 'draft';
```

## Verification

After applying the fix, you can verify the columns exist with this SQL query:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'boqs'
  AND column_name IN ('converted_to_invoice_id', 'converted_at');
```

Should return 2 rows:
- `converted_to_invoice_id` (uuid, nullable)
- `converted_at` (timestamp with time zone, nullable)

## Support

If you encounter any issues:
1. Check the browser console for detailed error messages
2. Verify that the columns were successfully created using the verification SQL above
3. Ensure the schema cache refresh completed (wait 5-10 seconds after running the NOTIFY command)
4. If issues persist, contact support with the error message from the browser console
