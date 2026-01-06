-- Final RLS Fix - Drop ONLY the problematic recursive policies

BEGIN TRANSACTION;

-- Step 1: Drop the recursive policies that are causing infinite loops
DROP POLICY IF EXISTS "Users can view all profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can create profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can delete profiles in their company" ON profiles;

-- The safe policies will remain:
-- - "Users can view their own profile" (auth.uid() = id)
-- - "Users can update their own profile" (auth.uid() = id)
-- - "Authenticated users can insert profiles" (auth.uid() = id)

-- These safe policies allow each user to read/write their own profile
-- without any recursive table lookups

COMMIT;

-- Verify the fix - run this separately:
-- SELECT policyname FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
