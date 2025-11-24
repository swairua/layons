import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BoqDocument, BoqSection } from '@/utils/boqPdfGenerator';

const safeN = (v: number | undefined) => (typeof v === 'number' && !isNaN(v) ? v : 0);

// Flatten BOQ sections and subsections into items for invoice
const flattenBoqItems = (boqData: BoqDocument) => {
  const flatItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    unit_of_measure: string;
    section_name?: string;
  }> = [];

  boqData.sections.forEach((section, sectionIndex) => {
    // Add section header if title exists
    if (section.title) {
      flatItems.push({
        description: `SECTION: ${section.title}`,
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        unit_of_measure: 'Item',
        section_name: section.title
      });
    }

    // Handle subsections
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach((subsection) => {
        // Add subsection header
        flatItems.push({
          description: `${subsection.name}: ${subsection.label}`,
          quantity: 1,
          unit_price: 0,
          line_total: 0,
          unit_of_measure: 'Item',
          section_name: `${section.title || 'General'} - ${subsection.label}`
        });

        // Add items from subsection
        subsection.items.forEach((item) => {
          const qty = safeN(item.quantity ?? 1);
          const rate = safeN(item.rate ?? 0);
          const amount = safeN(item.amount ?? qty * rate);

          flatItems.push({
            description: item.description,
            quantity: qty,
            unit_price: rate,
            line_total: amount,
            unit_of_measure: item.unit_name || item.unit || 'Item',
            section_name: `${section.title || 'General'} - ${subsection.label}`
          });
        });
      });
    } else if (section.items && section.items.length > 0) {
      // Handle legacy items (non-subsection format)
      section.items.forEach((item) => {
        const qty = safeN(item.quantity ?? 1);
        const rate = safeN(item.rate ?? 0);
        const amount = safeN(item.amount ?? qty * rate);

        flatItems.push({
          description: item.description,
          quantity: qty,
          unit_price: rate,
          line_total: amount,
          unit_of_measure: item.unit_name || item.unit || 'Item',
          section_name: section.title || 'General'
        });
      });
    }
  });

  // Filter out header items (quantity 0, unit_price 0) and calculate totals
  const invoiceItems = flatItems.filter(item => !(item.quantity === 1 && item.unit_price === 0 && item.line_total === 0 && item.description.includes(':') && item.description.includes('SECTION')));
  
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.line_total, 0);

  return { invoiceItems, subtotal };
};

export const useConvertBoqToInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boqId: string) => {
      // Get BOQ data
      const { data: boq, error: boqError } = await supabase
        .from('boqs')
        .select('*')
        .eq('id', boqId)
        .single();

      if (boqError) throw boqError;
      if (!boq) throw new Error('BOQ not found');

      const boqData = boq.data as BoqDocument;

      // Get customer data from BOQ if available
      const customerData = boqData.client;

      // Check if customer exists by email or create a new one
      let customerId = null;

      if (customerData?.name) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', boq.company_id)
          .eq('name', customerData.name)
          .limit(1)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer from BOQ client data
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert([
              {
                company_id: boq.company_id,
                name: customerData.name,
                email: customerData.email || null,
                phone: customerData.phone || null,
                address: customerData.address || null,
                city: customerData.city || null,
                country: customerData.country || null
              }
            ])
            .select()
            .single();

          if (customerError) {
            console.warn('Could not create customer, continuing without customer_id:', customerError);
          } else {
            customerId = newCustomer.id;
          }
        }
      }

      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
        company_uuid: boq.company_id
      });

      if (!invoiceNumber) throw new Error('Failed to generate invoice number');

      // Get current user
      let createdBy: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        createdBy = userData?.user?.id || null;
      } catch {
        createdBy = null;
      }

      // Flatten BOQ items and calculate subtotal
      const { invoiceItems, subtotal } = flattenBoqItems(boqData);

      // Create invoice
      const invoiceData = {
        company_id: boq.company_id,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: subtotal,
        tax_amount: 0,
        total_amount: subtotal,
        notes: boqData.notes || `Converted from BOQ ${boq.number}`,
        created_by: createdBy,
        source_boq_id: boqId
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      if (invoiceItems.length > 0) {
        const itemsToInsert = invoiceItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          unit_of_measure: item.unit_of_measure,
          section_name: item.section_name,
          sort_order: index,
          tax_percentage: 0,
          tax_amount: 0,
          tax_inclusive: false
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Update BOQ to mark as converted
      await supabase
        .from('boqs')
        .update({ 
          converted_to_invoice_id: invoice.id,
          converted_at: new Date().toISOString()
        })
        .eq('id', boqId);

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boqs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};
