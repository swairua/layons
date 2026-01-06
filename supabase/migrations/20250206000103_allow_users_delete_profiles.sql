-- Allow authenticated users in the same company to delete profiles
CREATE POLICY "Users can delete profiles in their company" ON profiles
    FOR DELETE USING (
        auth.uid() IS NOT NULL
        AND auth.uid() != id
        AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );
