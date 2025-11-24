import { supabase } from '@/integrations/supabase/client';

export interface BOQData {
  id: string;
  number: string;
  boq_date: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_country?: string;
  contractor?: string;
  project_title?: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  data?: any;
  company_id: string;
  created_by?: string;
}

export async function fetchBOQByNumber(boqNumber: string, companyId: string): Promise<BOQData | null> {
  const { data, error } = await supabase
    .from('boqs')
    .select('*')
    .eq('number', boqNumber)
    .eq('company_id', companyId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch BOQ:', error);
    return null;
  }

  return data;
}

export function createPercentageCopy(originalBOQ: BOQData, percentage: number, newBoqNumber: string): BOQData {
  const multiplier = percentage / 100;

  const newData = JSON.parse(JSON.stringify(originalBOQ.data));

  if (newData.sections) {
    newData.sections = newData.sections.map((section: any) => ({
      ...section,
      subsections: section.subsections ? section.subsections.map((subsection: any) => ({
        ...subsection,
        items: (subsection.items || []).map((item: any) => ({
          ...item,
          quantity: Math.round(item.quantity * multiplier * 100) / 100,
        })),
      })) : [],
      items: section.items ? section.items.map((item: any) => ({
        ...item,
        quantity: Math.round(item.quantity * multiplier * 100) / 100,
      })) : [],
    }));
  }

  const newSubtotal = Math.round(originalBOQ.subtotal * multiplier * 100) / 100;
  const newTaxAmount = Math.round(originalBOQ.tax_amount * multiplier * 100) / 100;
  const newTotalAmount = Math.round(originalBOQ.total_amount * multiplier * 100) / 100;

  return {
    ...originalBOQ,
    number: newBoqNumber,
    subtotal: newSubtotal,
    tax_amount: newTaxAmount,
    total_amount: newTotalAmount,
    data: newData,
  };
}

export async function saveBOQCopy(boqCopy: Omit<BOQData, 'id'>, createdBy?: string): Promise<BOQData | null> {
  const { data, error } = await supabase
    .from('boqs')
    .insert([
      {
        ...boqCopy,
        created_by: createdBy,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Failed to save BOQ copy:', error);
    return null;
  }

  return data;
}
