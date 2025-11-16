import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures the invoices table has the necessary columns for payment tracking.
 * This function:
 * 1. Checks if paid_amount and balance_due columns exist
 * 2. Creates them if they don't exist
 * 3. Initializes them with default values from total_amount if needed
 */
export async function ensureInvoiceSchema() {
  try {
    console.log('Checking invoice table schema...');

    // Try to select the columns to see if they exist
    const { data: testData, error: testError } = await supabase
      .from('invoices')
      .select('paid_amount, balance_due')
      .limit(1);

    if (testError && testError.code === 'PGRST203') {
      // Column doesn't exist error
      console.warn('paid_amount and/or balance_due columns may not exist, attempting to create them...');
      
      // Execute SQL to add columns if they don't exist
      const { error: execError } = await supabase.rpc('exec', {
        sql: `
          ALTER TABLE invoices
          ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS balance_due DECIMAL(15,2) DEFAULT 0;
          
          UPDATE invoices
          SET paid_amount = COALESCE(paid_amount, COALESCE(amount_paid, 0)),
              balance_due = COALESCE(balance_due, COALESCE(amount_due, total_amount - COALESCE(amount_paid, 0)))
          WHERE paid_amount IS NULL OR balance_due IS NULL;
        `
      });

      if (execError) {
        console.warn('Could not execute migration via RPC (may not be available):', execError);
        // Schema might already exist or user doesn't have permission
        // Continue anyway as columns might have been added
      }
    } else if (testError) {
      console.error('Error checking invoice schema:', testError);
    } else {
      console.log('Invoice schema check passed');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in ensureInvoiceSchema:', error);
    // Don't throw - this is a best-effort operation
    return { success: false, error };
  }
}

/**
 * Alternative approach: Initialize invoice balances using a database trigger or function
 * This would be more efficient in production but requires database function setup
 */
export async function initializeInvoiceBalances(companyId?: string) {
  try {
    console.log('Initializing invoice balances...');

    // For all invoices without set balances, calculate them from total_amount and paid_amount
    const updateQuery = supabase
      .from('invoices')
      .update({
        balance_due: supabase.rpc('COALESCE(balance_due, total_amount - COALESCE(paid_amount, 0))')
      });

    if (companyId) {
      const { error } = await updateQuery.eq('company_id', companyId);
      if (error) throw error;
    } else {
      const { error } = await updateQuery.is('balance_due', null);
      if (error) throw error;
    }

    console.log('Invoice balances initialized');
    return { success: true };
  } catch (error) {
    console.error('Error initializing invoice balances:', error);
    return { success: false, error };
  }
}
