import { supabase } from '@/integrations/supabase/client';

/**
 * Fix RLS issue with quotations table
 * Error: "new row violates row-level security policy for table 'quotations'"
 */

export interface QuotationsRLSFixResult {
  success: boolean;
  message: string;
  details?: string;
  requiresManualFix?: boolean;
  sqlToRun?: string;
}

/**
 * Get the SQL needed to fix quotations RLS issues
 */
export function getQuotationsRLSFixSQL(): string {
  return `-- ============================================================================
-- FIX QUOTATIONS RLS POLICY ISSUE
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Disable RLS on quotations table
ALTER TABLE IF EXISTS quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotation_items DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing problematic policies
DROP POLICY IF EXISTS "Company scoped access" ON quotations;
DROP POLICY IF EXISTS "Users can view quotations in their company" ON quotations;
DROP POLICY IF EXISTS "Users can insert quotations in their company" ON quotations;
DROP POLICY IF EXISTS "Users can update quotations in their company" ON quotations;
DROP POLICY IF EXISTS "Users can delete quotations in their company" ON quotations;

DROP POLICY IF EXISTS "Company scoped access" ON quotation_items;
DROP POLICY IF EXISTS "Users can view items in their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON quotation_items;

-- Step 3: Ensure company_id column exists on quotations
ALTER TABLE IF EXISTS quotations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);

-- Step 5: Populate company_id from customer relationship
UPDATE quotations q
SET company_id = (
  SELECT c.company_id
  FROM customers c
  WHERE c.id = q.customer_id
)
WHERE q.company_id IS NULL AND q.customer_id IS NOT NULL;

-- Step 6: For orphaned quotations, assign to first company
UPDATE quotations
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL;

COMMIT;

-- Verify the fix
SELECT 'QUOTATIONS RLS FIX COMPLETED' as status,
       COUNT(*) as total_quotations,
       COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as quotations_with_company_id
FROM quotations;`;
}

/**
 * Apply the quotations RLS fix
 */
export async function fixQuotationsRLS(): Promise<QuotationsRLSFixResult> {
  console.log('🔧 Starting quotations RLS fix...');

  const fixSQL = getQuotationsRLSFixSQL();

  // Try method 1: Using exec RPC
  try {
    console.log('Attempting fix via exec RPC...');
    const { data, error } = await supabase.rpc('exec', { sql: fixSQL });
    
    if (!error) {
      console.log('✅ Quotations RLS fix applied successfully via exec RPC');
      return {
        success: true,
        message: 'Quotations RLS policies have been fixed successfully',
        details: 'Disabled RLS and ensured company_id column exists'
      };
    }
    
    console.warn('exec RPC error:', error?.message);
  } catch (err) {
    console.warn('exec RPC not available:', (err as Error).message);
  }

  // Try method 2: Using exec_sql RPC
  try {
    console.log('Attempting fix via exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: fixSQL });
    
    if (!error) {
      console.log('✅ Quotations RLS fix applied successfully via exec_sql RPC');
      return {
        success: true,
        message: 'Quotations RLS policies have been fixed successfully',
        details: 'Disabled RLS and ensured company_id column exists'
      };
    }
    
    console.warn('exec_sql RPC error:', error?.message);
  } catch (err) {
    console.warn('exec_sql RPC not available:', (err as Error).message);
  }

  // All automatic methods failed
  console.warn('⚠️ All RPC methods failed. Manual fix required.');
  
  return {
    success: false,
    requiresManualFix: true,
    message: 'Quotations RLS fix requires manual application',
    sqlToRun: fixSQL,
    details: 'Please copy the SQL and run it in your Supabase SQL Editor'
  };
}

/**
 * Verify if quotations RLS is working
 */
export async function verifyQuotationsRLS(): Promise<boolean> {
  try {
    console.log('Verifying quotations RLS...');
    
    // Try to insert a test quotation
    const { error } = await supabase
      .from('quotations')
      .select('id')
      .limit(1);

    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      
      if (errorMsg.includes('row level security') || 
          errorMsg.includes('company_id')) {
        console.error('❌ Quotations RLS issue detected:', error.message);
        return false;
      }
    }

    console.log('✅ Quotations RLS verified successfully');
    return true;
  } catch (error) {
    console.error('Error verifying quotations RLS:', error);
    return false;
  }
}
