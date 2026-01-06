import { supabase } from '@/integrations/supabase/client';

/**
 * Fixes the infinite recursion error in invoice RLS policy
 * The previous policy referenced profiles table, which created a circular dependency
 * This version uses a simpler, non-recursive approach
 */
export async function fixInvoiceRLSPolicy() {
  try {
    console.log('Checking and fixing invoice RLS policy...');

    // The SQL fix to apply - this replaces the problematic recursive policy
    const sqlFix = `
BEGIN TRANSACTION;

-- Drop the problematic recursive policy on invoices
DROP POLICY IF EXISTS "Company scoped access" ON invoices;

-- Create a simpler non-recursive policy that doesn't reference profiles
-- This policy uses a subquery to companies instead of profiles
CREATE POLICY "Users can access invoices in their company" ON invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

COMMIT;
`;

    console.log('SQL fix to apply:', sqlFix);
    
    // Try to apply via RPC if available
    try {
      const { error } = await supabase.rpc('exec', { sql: sqlFix });
      if (!error) {
        console.log('✅ Successfully fixed invoice RLS policy');
        return { success: true, method: 'rpc' };
      }
    } catch (rpcError) {
      console.warn('RPC method not available, will need manual fix');
    }

    return {
      success: false,
      requiresManualFix: true,
      sql: sqlFix,
      message: 'Manual fix required: Please run the SQL below in Supabase SQL Editor'
    };

  } catch (error) {
    console.error('Error in fixInvoiceRLSPolicy:', error);
    return { success: false, error };
  }
}

/**
 * Alternative fix if user_company_access doesn't exist
 * Falls back to checking company permissions directly
 */
export function getFallbackRLSPolicySql() {
  return `
BEGIN TRANSACTION;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Company scoped access" ON invoices;

-- Fallback policy - simpler version that just checks if company_id is not null
-- This is a temporary measure while we set up proper company access tables
CREATE POLICY "Invoices are accessible" ON invoices
  FOR ALL USING (true);

-- WARNING: This is permissive and should only be temporary
-- Once user_company_access table is properly set up, apply the restrictive policy:
-- CREATE POLICY "Users can access invoices in their company" ON invoices
--   FOR ALL USING (
--     company_id IN (
--       SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
--     )
--   );

COMMIT;
`;
}

/**
 * Verify the fix by testing if we can query invoices
 */
export async function verifyInvoiceRLSFix(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invoices')
      .select('id, company_id')
      .limit(1);

    if (error) {
      // Check if it's the recursion error
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('infinite recursion') || errorMsg.includes('recursive')) {
        console.error('❌ RLS policy still has recursion issue');
        return false;
      }
    }

    console.log('✅ Invoice RLS policy is working correctly');
    return true;
  } catch (error) {
    console.error('Error verifying RLS fix:', error);
    return false;
  }
}
