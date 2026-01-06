-- Allow authenticated users in the same company to create new profiles
CREATE POLICY "Users can create profiles in their company" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );
