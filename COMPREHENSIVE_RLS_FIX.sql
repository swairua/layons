-- Comprehensive RLS Fix for Profiles Table
-- This removes ALL policies and creates new clean ones

BEGIN TRANSACTION;

-- Step 1: Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Admins can insert new profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles in their company" ON profiles;

-- Step 2: Create simple, non-recursive SELECT policy
-- Users can read their own profile
CREATE POLICY "users_select_own_profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Step 3: Create non-recursive UPDATE policy
-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 4: Create INSERT policy
-- Users can insert their own profile (on signup)
CREATE POLICY "users_insert_own_profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Step 5: Create DELETE policy (if needed for cleanup)
CREATE POLICY "users_delete_own_profile" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- Step 6: Drop policies on related tables that might cause recursion
DROP POLICY IF EXISTS "Users can view all profiles in their company" ON user_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations for their company" ON user_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their company" ON user_invitations;

-- Step 7: Create simple policy for user_invitations (no profile subquery)
CREATE POLICY "authenticated_view_invitations" ON user_invitations
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

COMMIT;

-- Verification query - run this separately to verify policies:
-- SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
