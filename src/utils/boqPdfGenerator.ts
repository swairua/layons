import { generatePDF } from '@/utils/pdfGenerator';

export interface BoqItem {
  description: string;
  quantity?: number; // defaults to 1 for lump sum items
  unit_id?: string; // unit id reference
  unit_name?: string; // human readable unit name
  unit?: string; // legacy fallback
  rate?: number; // KES per unit
  amount?: number; // optional; if omitted computed as qty*rate
  unit_abbreviation?: string; // abbreviation for the unit
}

export interface BoqSubsection {
  name: string; // "A", "B", "C", etc.
  label: string; // "Materials", "Labor", etc.
  items: BoqItem[];
}

export interface BoqSection {
  title?: string; // optional section title like "BILL NO. 01: DEMOLITIONS"
  subsections?: BoqSubsection[]; // new subsections support
  items?: BoqItem[]; // legacy items support (for backwards compatibility)
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
        unit_of_measure: it.unit_name || it.unit || 'Item',
        unit_abbreviation: (it.unit_abbreviation || ''),
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
    project_title: doc.project_title,
    contractor: doc.contractor,
    notes: doc.notes || ''
  });
}
