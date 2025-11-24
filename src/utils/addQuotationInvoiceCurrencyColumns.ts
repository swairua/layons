import { supabase } from '@/integrations/supabase/client';

/**
 * Add currency columns to quotations and invoices tables if they don't exist
 */
export async function addCurrencyColumnsToDocuments(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Adding currency columns to quotations and invoices tables...');
    
    const sqlStatements = [
      `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';`,
      `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';`
    ];

    // Execute each statement
    for (const sql of sqlStatements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: sql 
        });

        if (error) {
          console.warn(`RPC execution failed for: ${sql}`, error);
          // Continue with next statement even if this one fails
        } else {
          console.log(`✅ Executed: ${sql}`);
        }
      } catch (e) {
        console.warn(`Failed to execute SQL: ${sql}`, e);
        // Continue with other statements
      }
    }

    return {
      success: true,
      message: 'Currency columns addition initiated. Please verify in Supabase console.'
    };

  } catch (error) {
    console.error('Error adding currency columns:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * SQL statements for manual execution in Supabase
 */
export const ADD_CURRENCY_COLUMNS_SQL = `
-- Add currency column to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

-- Add currency column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

-- Update quotation_items to have currency if needed
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

-- Update invoice_items to have currency if needed
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';
`;
