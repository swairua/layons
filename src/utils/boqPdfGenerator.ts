import { generatePDF } from '@/utils/pdfGenerator';

export interface BoqItem {
  description: string;
  quantity?: number; // defaults to 1 for lump sum items
  unit?: string; // e.g., Item, Sm, Lm, No, Cm
  rate?: number; // KES per unit
  amount?: number; // optional; if omitted computed as qty*rate
}

export interface BoqSection {
  title?: string; // optional section title like "BILL NO. 01: DEMOLITIONS"
  items: BoqItem[];
}

export interface BoqDocument {
  number: string; // e.g., BOQ-0001
  date: string;   // ISO date
  client: { name: string; email?: string; phone?: string; address?: string; city?: string; country?: string };
  contractor?: string;
  project_title?: string; // e.g., Proposed Development - House Renovations
  sections: BoqSection[];
  notes?: string;
}

// Helper
const safeN = (v: number | undefined) => (typeof v === 'number' && !isNaN(v) ? v : 0);

export function downloadBOQPDF(doc: BoqDocument, company?: { name: string; logo_url?: string; address?: string; city?: string; country?: string; phone?: string; email?: string }) {
  // Flatten items and auto-calc amounts; prefix section titles as bold rows
  const flatItems: Array<{ description: string; quantity: number; unit_price: number; line_total: number; unit_of_measure?: string }> = [];

  doc.sections.forEach((section) => {
    if (section.title) {
      flatItems.push({ description: `➤ ${section.title}`, quantity: 0, unit_price: 0, line_total: 0 });
    }
    section.items.forEach((it) => {
      const qty = safeN(it.quantity ?? 1);
      const rate = safeN(it.rate ?? (it.amount ? it.amount : 0));
      const amount = safeN(it.amount ?? qty * rate);
      flatItems.push({
        description: it.description,
        quantity: qty,
        unit_price: rate,
        line_total: amount,
        unit_of_measure: it.unit || 'Item',
      });
    });
  });

  const subtotal = flatItems.reduce((s, r) => s + (r.line_total || 0), 0);

  return generatePDF({
    type: 'boq',
    number: doc.number,
    date: doc.date,
    company,
    customer: doc.client,
    items: flatItems,
    subtotal,
    total_amount: subtotal,
    notes: [
      doc.project_title ? `PROJECT: ${doc.project_title}` : '',
      doc.contractor ? `CONTRACTOR: ${doc.contractor}` : '',
      doc.notes || ''
    ].filter(Boolean).join('\n')
  });
}
