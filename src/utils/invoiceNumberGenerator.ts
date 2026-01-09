import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a unique invoice number in the format XXXXMMYYYY
 * X = sequential number, MM = month, YYYY = year
 * @param companyId - The company ID
 * @returns Unique invoice number
 */
export async function generateUniqueInvoiceNumber(companyId: string): Promise<string> {
  try {
    // Get current date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get the highest existing invoice/quotation number for this company
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .order('invoice_number', { ascending: false })
      .limit(1);

    const { data: quotations, error: quotationError } = await supabase
      .from('quotations')
      .select('quotation_number')
      .eq('company_id', companyId)
      .order('quotation_number', { ascending: false })
      .limit(1);

    if (invoiceError) console.error('Error fetching invoices:', invoiceError);
    if (quotationError) console.error('Error fetching quotations:', quotationError);

    let maxNumber = 0;

    // Extract numeric part from existing numbers
    if (invoices && invoices.length > 0) {
      const numericMatch = invoices[0].invoice_number.match(/^(\d{4})/);
      if (numericMatch) {
        maxNumber = Math.max(maxNumber, parseInt(numericMatch[1], 10));
      }
    }

    if (quotations && quotations.length > 0) {
      const numericMatch = quotations[0].quotation_number.match(/^(\d{4})/);
      if (numericMatch) {
        maxNumber = Math.max(maxNumber, parseInt(numericMatch[1], 10));
      }
    }

    // Generate next number
    const nextNumber = maxNumber + 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');
    
    return `${paddedNumber}${month}${year}`;
  } catch (error) {
    console.error('Failed to generate invoice number:', error);
    // Fallback: generate a timestamp-based number
    const timestamp = Date.now().toString().slice(-4);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${timestamp}${month}${year}`;
  }
}
