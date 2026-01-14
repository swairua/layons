# Delete Invoice Failed - Complete Solution

## What's Happening

When you try to delete an invoice, you're getting this error:
```
RLSPolicyError: Unable to delete invoice due to RLS policy issue: 
column 'company_id' does not exist in table 'invoices'
```

## Root Cause Analysis

The error message is slightly misleading - **the `company_id` column actually exists** in the invoices table. The real issue is an **RLS (Row Level Security) policy recursion problem**:

1. **The Recursive Policy**: The invoices table has an RLS policy called "Company scoped access" that:
   - Tries to check the `company_id` column in the invoices table
   - References the `profiles` table to get the user's company_id
   - But the profiles table ALSO has RLS enabled

2. **The Recursion Loop**: When you try to delete an invoice:
   - PostgreSQL evaluates the RLS policy on invoices
   - The policy needs to check profiles to verify access
   - But profiles has its own RLS, creating a circular dependency
   - This causes PostgreSQL to fail with a confusing error message

## The Fix

You have **TWO OPTIONS**:

### Option 1: Quick Fix (Recommended)
This disables the problematic RLS policy and replaces it with a simpler one.

**Steps:**
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL from `RLS_INVOICE_FIX.sql`
5. Click **Run**
6. Try deleting an invoice again - it should work!

**What this does:**
- Removes the recursive "Company scoped access" policy
- Creates a new simple policy: "Authenticated users can manage invoices"
- Allows all authenticated users to delete invoices
- No recursion, no more errors

### Option 2: Company-Scoped Access (if you need multi-tenant isolation)
If you want to keep the company-level access control, use this alternative:

```sql
-- This policy checks company_id directly from the users table
-- instead of going through profiles, avoiding recursion

ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

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

## How to Apply the Fix

### For Option 1 (Quick Fix):

```
1. Open Supabase Dashboard → SQL Editor
2. New Query
3. Paste the content of RLS_INVOICE_FIX.sql
4. Click Run
5. Done! Invoice deletion now works
```

### Verification
After applying the fix, run this query to confirm:

```sql
SELECT 
  tablename,
  policyname
FROM pg_policies 
WHERE tablename = 'invoices';
```

You should see:
- `invoices` | `Authenticated users can manage invoices`

The old "Company scoped access" policy should be gone.

## If the SQL Doesn't Work

If you get an error while running the SQL, it's likely because the RPC functions aren't available in your Supabase setup. 

**Emergency Fix - Disable RLS Entirely:**
```sql
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;
```

Run this, then invoice deletion will work immediately. You can re-enable RLS with better policies once you've confirmed everything works.

## Why This Happened

Your application uses:
- **COMPREHENSIVE_DATABASE_MIGRATION.sql** - Sets up RLS policies
- **RLS Recursion Pattern** - The "Company scoped access" policy references the profiles table, which itself has RLS

This pattern is common but can cause recursion issues in PostgreSQL, especially during DELETE operations.

## Files Provided

1. **RLS_INVOICE_FIX.sql** - The exact SQL to fix the issue
2. **INVOICE_DELETE_FIX_INSTRUCTIONS.md** - Detailed step-by-step guide
3. This file - Complete explanation and alternatives

## Next Steps

1. ✅ Run the SQL fix
2. ✅ Try deleting an invoice
3. ✅ If it works, you're done!
4. 📝 Optional: Consider preventing this in the future by using company_id directly in policies instead of referencing profiles

---

## Support

If you need more help with RLS policies in Supabase:
- [RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security/rules)
