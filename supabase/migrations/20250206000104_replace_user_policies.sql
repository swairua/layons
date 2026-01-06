-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can create profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can delete profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can manage invitations in their company" ON user_invitations;

-- Recreate policies with full permissions for authenticated users in the same company

-- Allow authenticated users to view profiles in their company
CREATE POLICY "Users can view all profiles in their company" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow authenticated users to create new profiles in their company
CREATE POLICY "Users can create profiles in their company" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow authenticated users to update profiles in their company
CREATE POLICY "Users can update profiles in their company" ON profiles
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow authenticated users to delete profiles in their company (but not themselves)
CREATE POLICY "Users can delete profiles in their company" ON profiles
    FOR DELETE USING (
        auth.uid() IS NOT NULL
        AND auth.uid() != id
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow authenticated users to view invitations in their company
CREATE POLICY "Users can view invitations for their company" ON user_invitations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow authenticated users to manage invitations in their company
CREATE POLICY "Users can manage invitations in their company" ON user_invitations
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update invitations in their company" ON user_invitations
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete invitations in their company" ON user_invitations
    FOR DELETE USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );
