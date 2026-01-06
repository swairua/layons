-- Allow all authenticated users in the same company to view profiles
CREATE POLICY "Users can view all profiles in their company" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow all authenticated users in the same company to view user invitations
CREATE POLICY "Users can view invitations for their company" ON user_invitations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );
