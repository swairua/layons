import { supabase } from '@/integrations/supabase/client';

interface AutoCreateReceiptParams {
  company_id: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

/**
 * Automatically creates a cash receipt when a payment is recorded
 * This provides an audit trail linking payments to receipts
 */
export async function autoCreateCashReceipt(params: AutoCreateReceiptParams) {
  try {
    const {
      company_id,
      customer_id,
      payment_date,
      amount,
      payment_method,
      reference_number,
      notes,
      created_by
    } = params;

    // Generate receipt number based on count of existing receipts
    let receiptNumber: string;
    try {
      const { data: existingReceipts, error: countError } = await supabase
        .from('cash_receipts')
        .select('id', { count: 'exact' })
        .eq('company_id', company_id);

      if (!countError && existingReceipts) {
        const count = (existingReceipts.length || 0) + 1;
        receiptNumber = `RCP-${String(count).padStart(3, '0')}`;
      } else {
        receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
      }
    } catch (err) {
      receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
    }

    // Create the cash receipt without items
    // For payment-based receipts, we don't need items, just the payment record
    const { data: receipt, error: receiptError } = await supabase
      .from('cash_receipts')
      .insert({
        company_id,
        customer_id,
        receipt_number: receiptNumber,
        receipt_date: payment_date,
        total_amount: amount,
        value_tendered: amount, // Payment amount equals value tendered
        change: 0, // No change for invoice payments
        payment_method: mapPaymentMethod(payment_method),
        notes: notes || `Payment received. Reference: ${reference_number || 'N/A'}`,
        created_by: created_by || null
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating auto-receipt:', receiptError);
      throw receiptError;
    }

    if (!receipt) {
      throw new Error('Failed to create receipt - no response from server');
    }

    console.log('✅ Auto-created cash receipt:', {
      receipt_id: receipt.id,
      receipt_number: receipt.receipt_number,
      amount: receipt.total_amount
    });

    return receipt;
  } catch (error) {
    console.error('Failed to auto-create cash receipt:', error);
    // Don't throw - this is a non-critical operation that shouldn't block payment recording
    // Log the error but continue with payment recording
    return null;
  }
}

/**
 * Maps payment method names from the payment modal to standard receipt payment methods
 */
function mapPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'bank_transfer': 'Bank Transfer',
    'cash': 'Cash',
    'mpesa': 'Mobile Money',
    'mobile_money': 'Mobile Money',
    'cheque': 'Cheque',
    'card': 'Card',
    'other': 'Other'
  };

  return methodMap[method.toLowerCase()] || method;
}
