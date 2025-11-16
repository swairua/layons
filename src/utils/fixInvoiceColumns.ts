import { supabase } from '@/integrations/supabase/client';

/**
 * Fixes the invoice table columns by:
 * 1. Ensuring paid_amount and balance_due columns exist
 * 2. Migrating data from amount_paid/amount_due if needed
 * 3. Recalculating balances to ensure consistency
 */
export async function fixInvoiceColumns(companyId: string) {
  try {
    console.log('Starting invoice column fix for company:', companyId);

    // Step 1: Get all invoices for the company
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, total_amount, paid_amount, balance_due, amount_paid, amount_due, status, due_date')
      .eq('company_id', companyId);

    if (fetchError) {
      console.error('Error fetching invoices:', fetchError);
      throw fetchError;
    }

    if (!invoices || invoices.length === 0) {
      console.log('No invoices found for company');
      return { success: true, message: 'No invoices to fix' };
    }

    let fixedCount = 0;
    const updates: Array<{
      id: string;
      paid_amount: number;
      balance_due: number;
      status: string;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 2: Calculate correct values for each invoice
    for (const invoice of invoices) {
      const totalAmount = invoice.total_amount || 0;
      
      // Determine paid amount: use paid_amount if it exists and is not null, otherwise use amount_paid
      let paidAmount = invoice.paid_amount;
      if (paidAmount === null || paidAmount === undefined) {
        paidAmount = invoice.amount_paid || 0;
      }

      // Calculate balance due
      const balanceDue = totalAmount - (paidAmount || 0);

      // Determine correct status based on payment and due date
      let correctStatus = invoice.status || 'draft';
      
      if (correctStatus !== 'draft' && correctStatus !== 'sent') {
        // Only change status if it's not draft or sent
        if (balanceDue <= 0) {
          correctStatus = 'paid';
        } else if ((paidAmount || 0) > 0) {
          correctStatus = 'partial';
        } else if (invoice.due_date) {
          // Check if overdue
          const dueDate = new Date(invoice.due_date);
          if (dueDate < today && balanceDue > 0) {
            correctStatus = 'overdue';
          }
        }
      }

      // Check if update is needed
      const needsUpdate = 
        (paidAmount !== null && paidAmount !== invoice.paid_amount) ||
        (balanceDue !== invoice.balance_due) ||
        (correctStatus !== invoice.status && invoice.status !== 'draft' && invoice.status !== 'sent');

      if (needsUpdate) {
        updates.push({
          id: invoice.id,
          paid_amount: paidAmount || 0,
          balance_due: Math.max(0, balanceDue), // Don't allow negative balance
          status: correctStatus
        });
        fixedCount++;
      }
    }

    // Step 3: Batch update all invoices
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} invoices with correct paid_amount and balance_due`);
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            paid_amount: update.paid_amount,
            balance_due: update.balance_due,
            status: update.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating invoice ${update.id}:`, updateError);
          // Continue with other invoices even if one fails
        }
      }
    }

    console.log(`Invoice column fix complete: ${fixedCount} invoices updated`);
    return {
      success: true,
      message: `Fixed ${fixedCount} invoices`,
      updatedCount: fixedCount,
      totalInvoices: invoices.length
    };

  } catch (error) {
    console.error('Error in fixInvoiceColumns:', error);
    throw error;
  }
}

/**
 * Recalculates invoice status based on payment data and due date
 */
export function calculateInvoiceStatus(
  invoice: {
    total_amount?: number;
    paid_amount?: number;
    balance_due?: number;
    status?: string;
    due_date?: string;
  }
): string {
  // If explicitly marked as draft or sent, preserve that
  if (invoice.status === 'draft' || invoice.status === 'sent') {
    return invoice.status;
  }

  const totalAmount = invoice.total_amount || 0;
  const paidAmount = invoice.paid_amount || 0;
  const balanceDue = invoice.balance_due ?? (totalAmount - paidAmount);

  // Determine status based on payment
  if (balanceDue <= 0) {
    return 'paid';
  } else if (paidAmount > 0) {
    return 'partial';
  } else if (invoice.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.due_date);
    if (dueDate < today && balanceDue > 0) {
      return 'overdue';
    }
  }

  return 'sent';
}
