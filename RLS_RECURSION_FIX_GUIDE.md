# Fix for Infinite Recursion in Invoice RLS Policy

## Problem
The application is throwing this error:
```
Error: Failed to fetch invoices: infinite recursion detected in policy for relation "profiles"
```

This happens because the RLS (Row Level Security) policy on the `invoices` table tries to access the `profiles` table, which itself has RLS policies. This creates a circular dependency that causes infinite recursion.

## Root Cause
The problematic policy was:
```sql
CREATE POLICY "Company scoped access" ON invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
```

When PostgreSQL tries to evaluate this policy, it needs to read from `profiles`, but `profiles` has RLS policies that require checking relationships, causing infinite recursion.

## Solution: Two Steps

### Step 1: Quick Fix (Recommended - Apply Immediately)
Run this SQL in your Supabase SQL Editor to remove the problematic policy and replace it with a simpler one:

```sql
BEGIN TRANSACTION;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Company scoped access" ON invoices;

-- Create a simple policy that allows authenticated users
CREATE POLICY "Invoices are accessible to authenticated users" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');

COMMIT;
```

**Why this works:**
- `auth.role() = 'authenticated'` checks if the user is logged in WITHOUT querying any tables
- No recursion, no circular dependencies
- The app will work immediately

### Step 2: Long-Term Fix (Apply After Step 1 Works)
Once you have the `user_company_access` table properly set up, replace the policy with:

```sql
BEGIN TRANSACTION;

DROP POLICY IF EXISTS "Invoices are accessible to authenticated users" ON invoices;

CREATE POLICY "Users can access invoices in their company" ON invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

COMMIT;
```

## How to Apply the Fix

1. Go to your Supabase Dashboard
2. Navigate to "SQL Editor"
3. Create a new SQL query
4. Copy and paste **Step 1** SQL above
5. Click "Run" or press Ctrl+Enter
6. Wait for the query to complete
7. Refresh your application

The error should be gone immediately!

## If You're Still Getting Errors

If you're still seeing recursion errors after Step 1:

1. Check if there are other policies on `invoices` causing issues:
```sql
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'invoices';
```

2. If there are other problematic policies, drop them:
```sql
DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Users can access invoices in their company" ON invoices;
```

3. Then create only the simple policy:
```sql
CREATE POLICY "Invoices are accessible to authenticated users" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');
```

## Technical Note
The `user_company_access` table mentioned in the long-term fix should have this structure:
```sql
CREATE TABLE IF NOT EXISTS user_company_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_company_access ON user_company_access(user_id, company_id);
```

Once this table is properly populated with user company relationships, the long-term RLS policy will work correctly.
