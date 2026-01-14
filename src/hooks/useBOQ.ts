import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BoqDocument, BoqSection } from '@/utils/boqPdfGenerator';

const safeN = (v: number | undefined) => (typeof v === 'number' && !isNaN(v) ? v : 0);

interface BoqItemForInvoice {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  unit_of_measure: string;
  section_name?: string;
  is_header?: boolean;
}

/**
 * Generates a unique customer code based on customer name
 * Format: First 3 letters of name + random 4-digit number
 */
function generateCustomerCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'A');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}

/**
 * Flatten BOQ sections and subsections into items for invoice
 * Properly filters out header/section rows that shouldn't be invoice items
 */
const flattenBoqItems = (boqData: BoqDocument): { invoiceItems: BoqItemForInvoice[]; subtotal: number } => {
  const flatItems: BoqItemForInvoice[] = [];

  boqData.sections.forEach((section) => {
    // Handle subsections (new structure)
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach((subsection) => {
        // Add actual items from subsection (skip the header row)
        if (subsection.items && subsection.items.length > 0) {
          subsection.items.forEach((item) => {
            const qty = safeN(item.quantity ?? 1);
            const rate = safeN(item.rate ?? 0);
            const amount = safeN(item.amount ?? qty * rate);

            // Only add if it has quantity and price (filters out lump sum headers)
            if (qty > 0 || rate > 0) {
              flatItems.push({
                description: item.description,
                quantity: qty,
                unit_price: rate,
                line_total: amount,
                unit_of_measure: item.unit_name || item.unit || 'Item',
                section_name: section.title ? `${section.title} - ${subsection.label}` : subsection.label,
                is_header: false
              });
            }
          });
        }
      });
    }
    // Handle legacy items (non-subsection format)
    else if (section.items && section.items.length > 0) {
      section.items.forEach((item) => {
        const qty = safeN(item.quantity ?? 1);
        const rate = safeN(item.rate ?? 0);
        const amount = safeN(item.amount ?? qty * rate);

        // Only add if it has quantity and price
        if (qty > 0 || rate > 0) {
          flatItems.push({
            description: item.description,
            quantity: qty,
            unit_price: rate,
            line_total: amount,
            unit_of_measure: item.unit_name || item.unit || 'Item',
            section_name: section.title || 'General',
            is_header: false
          });
        }
      });
    }
  });

  // Calculate subtotal from actual items only (not headers)
  const subtotal = flatItems.reduce((sum, item) => sum + item.line_total, 0);

  return { invoiceItems: flatItems, subtotal };
};

export const useConvertBoqToInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boqId, companyId }: { boqId: string; companyId: string }) => {
      // Get BOQ data
      const { data: boq, error: boqError } = await supabase
        .from('boqs')
        .select('*')
        .eq('id', boqId)
        .eq('company_id', companyId)
        .single();

      if (boqError) {
        const errorMsg = boqError?.message || boqError?.details || JSON.stringify(boqError);
        console.error('BOQ fetch error:', { boqError, boqId, companyId });
        throw new Error(`Failed to fetch BOQ: ${errorMsg}`);
      }

      if (!boq) throw new Error('BOQ not found');

      const boqData = boq.data as BoqDocument;
      if (!boqData) {
        console.error('BOQ data invalid:', { boq });
        throw new Error('BOQ data is invalid or missing');
      }

      // Validate BOQ has sections and items
      if (!boqData.sections || boqData.sections.length === 0) {
        console.error('BOQ has no sections:', { boqData });
        throw new Error('BOQ has no sections. Cannot convert empty BOQ.');
      }

      // Get customer data from BOQ if available
      const customerData = boqData.client;

      // Check if customer exists or create a new one
      let customerId: string | null = null;

      if (customerData?.name) {
        // Try to find existing customer by name and company - use limit without .single() to handle no results
        const { data: existingCustomers, error: searchError } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', boq.company_id)
          .eq('name', customerData.name)
          .limit(1);

        if (existingCustomers && existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
        } else if (!searchError) {
          // No customer found, create a new one
          const customerPayload = {
            company_id: boq.company_id,
            name: customerData.name,
            customer_code: generateCustomerCode(customerData.name),
            email: customerData.email || null,
            phone: customerData.phone || null,
            address: customerData.address || null,
            city: customerData.city || null,
            country: customerData.country || null,
            is_active: true
          };

          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert([customerPayload])
            .select()
            .single();

          if (customerError) {
            // Log but continue - invoice can be created without customer
            console.warn('Could not create customer from BOQ data:', customerError);
          } else if (newCustomer) {
            customerId = newCustomer.id;
          }
        } else {
          // Unexpected error searching for customer
          console.warn('Error searching for existing customer:', searchError);
        }
      }

      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase.rpc('generate_invoice_number', {
        company_uuid: boq.company_id
      });

      if (invoiceNumberError) {
        const errorMsg = invoiceNumberError?.message || invoiceNumberError?.details || JSON.stringify(invoiceNumberError);
        throw new Error(`Failed to generate invoice number: ${errorMsg}`);
      }

      if (!invoiceNumber) throw new Error('Failed to generate invoice number: empty response');

      // Get current user
      let createdBy: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        createdBy = userData?.user?.id || null;
      } catch (err) {
        console.warn('Could not get current user:', err);
        createdBy = null;
      }

      // Flatten BOQ items and calculate subtotal
      let invoiceItems, subtotal;
      try {
        const result = flattenBoqItems(boqData);
        invoiceItems = result.invoiceItems;
        subtotal = result.subtotal;
      } catch (flattenError) {
        console.error('Error flattening BOQ items:', { flattenError, boqData });
        throw new Error(`Failed to process BOQ items: ${flattenError instanceof Error ? flattenError.message : JSON.stringify(flattenError)}`);
      }

      if (invoiceItems.length === 0) {
        console.error('No items resulted from BOQ conversion:', { boqData });
        throw new Error('BOQ conversion resulted in no items. Please check BOQ structure.');
      }

      // Calculate tax if available from BOQ
      const taxAmount = boq.tax_amount || 0;
      const totalAmount = subtotal + taxAmount;

      // Create invoice with BOQ's currency preserved
      const invoiceData = {
        company_id: boq.company_id,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: boq.currency || 'KES', // Preserve BOQ currency
        notes: boqData.notes ? `Converted from BOQ ${boq.number}\n\n${boqData.notes}` : `Converted from BOQ ${boq.number}`,
        terms_and_conditions: null,
        created_by: createdBy,
        source_boq_id: boqId,
        balance_due: totalAmount,
        paid_amount: 0
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) {
        const errorMsg = invoiceError?.message || invoiceError?.details || JSON.stringify(invoiceError);
        console.error('Invoice creation error:', { invoiceError, invoiceData });
        throw new Error(`Failed to create invoice: ${errorMsg}`);
      }

      if (!invoice) throw new Error('Invoice creation returned empty result');

      // Create invoice items with proper validation
      if (invoiceItems.length > 0) {
        const itemsToInsert = invoiceItems.map((item, index) => {
          // Validate item data
          if (!item.description || item.description.trim() === '') {
            throw new Error(`Item ${index + 1} has missing description`);
          }

          return {
            invoice_id: invoice.id,
            product_id: null, // BOQ items don't map to products
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            unit_of_measure: item.unit_of_measure,
            section_name: item.section_name || 'General',
            sort_order: index,
            tax_percentage: 0,
            tax_amount: 0,
            tax_inclusive: false,
            discount_percentage: 0,
            discount_before_vat: false
          };
        });

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) {
          // Try to clean up the invoice if items insertion fails
          await supabase.from('invoices').delete().eq('id', invoice.id).catch(() => {});
          const errorMsg = itemsError?.message || itemsError?.details || JSON.stringify(itemsError);
          console.error('Invoice items creation error:', { itemsError, itemCount: itemsToInsert.length });
          throw new Error(`Failed to create invoice items: ${errorMsg}`);
        }
      }

      // Update BOQ to mark as converted
      const { error: updateError } = await supabase
        .from('boqs')
        .update({
          converted_to_invoice_id: invoice.id,
          converted_at: new Date().toISOString()
        })
        .eq('id', boqId)
        .eq('company_id', companyId);

      if (updateError) {
        console.warn('Warning: Failed to mark BOQ as converted:', updateError);
        // This is not critical, invoice was created successfully
      }

      return invoice;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['boqs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices_fixed'] });
    }
  });
};
