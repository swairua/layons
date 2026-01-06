import { supabase } from '@/integrations/supabase/client';

/**
 * Fixes missing company_id column in invoices table
 * This addresses the "column 'company_id' does not exist" error during delete operations
 */
export async function fixMissingInvoiceCompanyId() {
  try {
    console.log('Checking and fixing invoice table schema...');

    // Step 1: Check if company_id column exists
    const { data: checkData, error: checkError } = await supabase
      .from('invoices')
      .select('company_id')
      .limit(1);

    if (!checkError) {
      console.log('✅ company_id column already exists in invoices table');
      return { success: true, message: 'Column already exists' };
    }

    // Step 2: Column doesn't exist, need to add it
    console.warn('❌ company_id column missing, attempting to add...');

    // Add the company_id column using raw SQL via RPC
    const { data: result, error: alterError } = await supabase.rpc('exec', {
      sql: `
        -- Add company_id column to invoices if it doesn't exist
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

        -- For existing invoices without company_id, we need to populate it
        -- First, check if there are orphaned invoices (no customer or no company link via customer)
        UPDATE invoices inv
        SET company_id = (
          SELECT COALESCE(c.company_id, (SELECT company_id FROM companies LIMIT 1))
          FROM customers c
          WHERE c.id = inv.customer_id
          LIMIT 1
        )
        WHERE inv.company_id IS NULL;

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

        -- Create RLS policy for company-scoped access
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Company scoped access" ON invoices;
        CREATE POLICY "Company scoped access" ON invoices
          FOR ALL USING (
            company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          );
      `
    });

    if (alterError) {
      console.error('Error adding company_id column via RPC:', alterError);
      // RPC method might not be available, try alternative approach
      return await fixViaDirectSQL();
    }

    console.log('✅ Successfully added company_id column to invoices table');
    return { success: true, message: 'Column added and RLS policy configured' };

  } catch (error) {
    console.error('Error in fixMissingInvoiceCompanyId:', error);
    return { success: false, error };
  }
}

/**
 * Alternative approach if RPC is not available
 * This provides SQL that can be manually executed in Supabase SQL editor
 */
async function fixViaDirectSQL() {
  console.log('RPC method not available, providing manual SQL fix...');
  
  const sqlFix = `
-- Manual SQL fix for missing company_id in invoices table
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Add company_id column to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Step 2: Populate company_id from customer relationship
UPDATE invoices inv
SET company_id = (
  SELECT c.company_id
  FROM customers c
  WHERE c.id = inv.customer_id
)
WHERE inv.company_id IS NULL;

-- Step 3: For any remaining NULL values, assign to first company (emergency fallback)
UPDATE invoices
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;

-- Step 4: Create index for query performance
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

-- Step 5: Make company_id NOT NULL since all should be populated now
ALTER TABLE invoices
ALTER COLUMN company_id SET NOT NULL;

-- Step 6: Ensure RLS is enabled and policy is set
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company scoped access" ON invoices;
CREATE POLICY "Company scoped access" ON invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMIT;
`;

  console.log('SQL Fix Required:');
  console.log(sqlFix);
  
  return {
    success: false,
    requiresManualFix: true,
    sql: sqlFix,
    message: 'Manual SQL execution required in Supabase SQL Editor'
  };
}

/**
 * Verify that invoices table has company_id column properly configured
 */
export async function verifyInvoiceCompanyIdColumn(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, company_id')
      .limit(1);

    if (error) {
      console.error('❌ company_id column verification failed:', error);
      return false;
    }

    console.log('✅ company_id column verified in invoices table');
    return true;
  } catch (error) {
    console.error('Error verifying company_id column:', error);
    return false;
  }
}
