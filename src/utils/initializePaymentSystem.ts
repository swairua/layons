import { supabase } from '@/integrations/supabase/client';

/**
 * Test if payment allocations system is working
 */
export async function testPaymentAllocations() {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { working: false, reason: 'Not authenticated' };
    }

    // Check table access
    const { error: tableError } = await supabase
      .from('payment_allocations')
      .select('id')
      .limit(1);

    if (tableError) {
      if (tableError.message?.includes('relation') && tableError.message?.includes('does not exist')) {
        return { working: false, reason: 'Table missing - run initialization' };
      } else if (tableError.message?.includes('permission')) {
        return { working: false, reason: 'Permission denied - check company link' };
      } else {
        return { working: false, reason: `Table error: ${tableError.message}` };
      }
    }

    // Check function
    const { error: funcError } = await supabase.rpc('record_payment_with_allocation', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_invoice_id: '00000000-0000-0000-0000-000000000000',
      p_payment_number: 'TEST',
      p_payment_date: '2024-01-01',
      p_amount: 1,
      p_payment_method: 'cash',
      p_reference_number: 'TEST',
      p_notes: 'Test'
    });

    if (funcError) {
      if (funcError.message?.includes('function') && funcError.message?.includes('does not exist')) {
        return { working: false, reason: 'Function missing - run initialization' };
      } else if (funcError.message?.includes('Invoice not found')) {
        // This is expected - it means function is working
        return { working: true, reason: 'Function is working' };
      } else {
        return { working: false, reason: `Function error: ${funcError.message}` };
      }
    }

    return { working: true, reason: 'All systems working' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { working: false, reason: errorMsg };
  }
}
