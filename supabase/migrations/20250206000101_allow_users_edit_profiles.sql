-- Allow authenticated users in the same company to update profiles
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

-- Allow authenticated users in the same company to manage invitations
CREATE POLICY "Users can manage invitations in their company" ON user_invitations
    FOR ALL USING (
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
