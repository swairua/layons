# How to Fix "Delete Invoice Failed" Error

## Problem
You're getting this error when trying to delete invoices:
```
RLSPolicyError: Unable to delete invoice due to RLS policy issue: 
column 'company_id' does not exist in table 'invoices'
```

The column actually exists, but the RLS (Row Level Security) policy is causing a recursion issue that prevents the delete operation.

## Root Cause
The RLS policy on the invoices table tries to check both:
1. The `company_id` column in the invoices table
2. The `company_id` from the profiles table (which also has RLS)

This creates a circular dependency that causes the error.

## Solution: Manual SQL Fix

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase dashboard
2. Navigate to the **SQL Editor** section
3. Click on the **New Query** button (or use the "+" button)

### Step 2: Copy and Run the Fix SQL
Copy the entire SQL from the `RLS_INVOICE_FIX.sql` file and paste it into the SQL editor.

The script will:
1. Disable RLS temporarily
2. Drop the problematic RLS policies
3. Re-enable RLS with a simple, safe policy
4. Show you the new policy

### Step 3: Execute the Query
Click the **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)

You should see output like:
```
tablename  | policyname                           | cmd
-----------+--------------------------------------+-----
invoices   | Authenticated users can manage invo  | ALL
```

### Step 4: Test the Fix
Try deleting an invoice again. It should now work without errors.

---

## If You Want More Restrictive Access

If you want to restrict invoice access by company (multi-tenant), you can use this alternative policy:

```sql
-- First, disable RLS
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Users can access invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;

-- Re-enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create company-scoped policy using company_id directly (no recursion)
CREATE POLICY "Users can access invoices in their company" ON invoices
  FOR ALL TO authenticated
  USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );
```

---

## If Still Having Issues

If the SQL still fails, run this emergency fix to completely disable RLS:

```sql
-- Emergency: Disable RLS entirely
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Users can access invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;
```

Then invoice deletion will work immediately. After verifying everything works, you can re-enable RLS with the policies from Step 2.

---

## Verification

To verify the fix worked, run this query in SQL Editor:

```sql
-- Check all RLS policies on invoices
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'invoices'
ORDER BY policyname;
```

You should see the `"Authenticated users can manage invoices"` policy listed.

---

## Need Help?

If you need more information about RLS in Supabase:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Common RLS Issues](https://supabase.com/docs/guides/database/postgres/row-level-security/examples)
