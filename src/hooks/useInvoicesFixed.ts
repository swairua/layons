import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fixed hook for fetching invoices with customer data
 * Uses separate queries to avoid relationship ambiguity
 */
export const useInvoicesFixed = (companyId?: string) => {
  return useQuery({
    queryKey: ['invoices_fixed', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        console.log('Fetching invoices for company:', companyId);

        // Step 1: Get invoices without embedded relationships
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            id,
            company_id,
            customer_id,
            invoice_number,
            invoice_date,
            due_date,
            status,
            subtotal,
            tax_amount,
            total_amount,
            paid_amount,
            balance_due,
            notes,
            terms_and_conditions,
            lpo_number,
            created_at,
            updated_at
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError);
          throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
        }

        console.log('Invoices fetched successfully:', invoices?.length || 0);

        if (!invoices || invoices.length === 0) {
          return [];
        }

        // Step 2: Get unique customer IDs (filter out invalid UUIDs)
        const customerIds = [...new Set(invoices.map(invoice => invoice.customer_id).filter(id => id && typeof id === 'string' && id.length === 36))];
        console.log('Fetching customer data for IDs:', customerIds.length);

        // Step 3: Get customers separately
        const { data: customers, error: customersError } = customerIds.length > 0 ? await supabase
          .from('customers')
          .select('id, name, email, phone, address, city, country')
          .in('id', customerIds) : { data: [], error: null };

        if (customersError) {
          console.error('Error fetching customers (non-fatal):', customersError);
          // Don't throw here, just continue without customer data
        }

        console.log('Customers fetched:', customers?.length || 0);

        // Step 4: Create customer lookup map
        const customerMap = new Map();
        (customers || []).forEach(customer => {
          customerMap.set(customer.id, customer);
        });

        // Step 4a: Get company details
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name, address, city, country, phone, email, tax_number')
          .eq('id', companyId)
          .single();

        if (companyError) {
          console.error('Error fetching company (non-fatal):', companyError);
        }

        // Step 5: Get invoice items for each invoice
        const invoiceIds = invoices.map(inv => inv.id);

        // Helper to retry a Supabase query in case of transient network errors
        async function queryInvoiceItemsWithRetry(attempts = 3, delayMs = 500) {
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const res = await supabase
                .from('invoice_items')
                .select(`
                  id,
                  invoice_id,
                  product_id,
                  description,
                  quantity,
                  unit_price,
                  discount_percentage,
                  discount_before_vat,
                  tax_percentage,
                  tax_amount,
                  tax_inclusive,
                  line_total,
                  sort_order,
                  section_name,
                  section_labor_cost,
                  unit_of_measure,
                  products(id, name, product_code, unit_of_measure)
                `)
                .in('invoice_id', invoiceIds);

              return res;
            } catch (err) {
              console.warn(`Attempt ${attempt} to fetch invoice_items failed:`, err);
              if (attempt < attempts) {
                // small backoff before retrying
                await new Promise(r => setTimeout(r, delayMs * attempt));
                continue;
              }
              // rethrow the last error
              throw err;
            }
          }
          return { data: [], error: null };
        }

        let invoiceItems = [] as any[];
        try {
          if (invoiceIds.length > 0) {
            const { data, error } = await queryInvoiceItemsWithRetry(3, 500);
            if (error) {
              console.error('Error fetching invoice items (non-fatal):', (error as any)?.message || error);
            } else if (data) {
              invoiceItems = data;
            }
          }
        } catch (err) {
          console.error('Network error fetching invoice items after retries (non-fatal):', err);
          // Leave invoiceItems as empty array so invoices still load
        }

        // Step 6: Group invoice items by invoice_id
        const itemsMap = new Map();
        (invoiceItems || []).forEach(item => {
          if (!itemsMap.has(item.invoice_id)) {
            itemsMap.set(item.invoice_id, []);
          }
          itemsMap.get(item.invoice_id).push(item);
        });

        // Step 7: Combine data
        const enrichedInvoices = invoices.map(invoice => ({
          ...invoice,
          customers: customerMap.get(invoice.customer_id) || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          company: company || null,
          invoice_items: itemsMap.get(invoice.id) || []
        }));

        console.log('Invoices enriched successfully:', enrichedInvoices.length);
        return enrichedInvoices;

      } catch (error) {
        console.error('Error in useInvoicesFixed:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching customer invoices (for a specific customer)
 */
export const useCustomerInvoicesFixed = (customerId?: string, companyId?: string) => {
  return useQuery({
    queryKey: ['customer_invoices_fixed', customerId, companyId],
    queryFn: async () => {
      if (!customerId) return [];

      try {
        console.log('Fetching invoices for customer:', customerId);

        // Get invoices for specific customer
        let query = supabase
          .from('invoices')
          .select(`
            id,
            company_id,
            customer_id,
            invoice_number,
            invoice_date,
            due_date,
            status,
            subtotal,
            tax_amount,
            total_amount,
            paid_amount,
            balance_due,
            notes,
            terms_and_conditions,
            lpo_number,
            created_at,
            updated_at
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data: invoices, error: invoicesError } = await query;

        if (invoicesError) {
          console.error('Error fetching customer invoices:', invoicesError);
          throw new Error(`Failed to fetch customer invoices: ${invoicesError.message}`);
        }

        if (!invoices || invoices.length === 0) {
          return [];
        }

        // Get customer data
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name, email, phone, address, city, country')
          .eq('id', customerId)
          .single();

        if (customerError) {
          console.error('Error fetching customer:', customerError);
        }

        // Get company details
        let company = null;
        if (invoices && invoices.length > 0) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id, name, address, city, country, phone, email, tax_number')
            .eq('id', invoices[0].company_id)
            .single();

          if (companyError) {
            console.error('Error fetching company (non-fatal):', companyError);
          } else {
            company = companyData;
          }
        }

        // Get invoice items
        const invoiceIds = invoices.map(inv => inv.id);

        async function queryInvoiceItemsWithRetry(attempts = 3, delayMs = 500) {
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const res = await supabase
                .from('invoice_items')
                .select(`
                  id,
                  invoice_id,
                  product_id,
                  description,
                  quantity,
                  unit_price,
                  discount_percentage,
                  discount_before_vat,
                  tax_percentage,
                  tax_amount,
                  tax_inclusive,
                  line_total,
                  sort_order,
                  section_name,
                  section_labor_cost,
                  unit_of_measure,
                  products(id, name, product_code, unit_of_measure)
                `)
                .in('invoice_id', invoiceIds);

              return res;
            } catch (err) {
              console.warn(`Attempt ${attempt} to fetch invoice_items failed:`, err);
              if (attempt < attempts) {
                await new Promise(r => setTimeout(r, delayMs * attempt));
                continue;
              }
              throw err;
            }
          }
          return { data: [], error: null };
        }

        let invoiceItems = [] as any[];
        try {
          if (invoiceIds.length > 0) {
            const { data, error } = await queryInvoiceItemsWithRetry(3, 500);
            if (error) {
              console.error('Error fetching invoice items:', (error as any)?.message || error);
            } else if (data) {
              invoiceItems = data;
            }
          }
        } catch (err) {
          console.error('Network error fetching invoice items after retries:', err);
        }

        // Group items by invoice
        const itemsMap = new Map();
        (invoiceItems || []).forEach(item => {
          if (!itemsMap.has(item.invoice_id)) {
            itemsMap.set(item.invoice_id, []);
          }
          itemsMap.get(item.invoice_id).push(item);
        });

        // Combine data
        const enrichedInvoices = invoices.map(invoice => ({
          ...invoice,
          customers: customer || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          company: company || null,
          invoice_items: itemsMap.get(invoice.id) || []
        }));

        return enrichedInvoices;

      } catch (error) {
        console.error('Error in useCustomerInvoicesFixed:', error);
        throw error;
      }
    },
    enabled: !!customerId,
    staleTime: 30000,
  });
};
