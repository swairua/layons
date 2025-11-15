// PDF Generation utility using HTML to print/PDF conversion
// Since we don't have jsPDF installed, I'll create a simple HTML-to-print function
// In a real app, you'd want to use a proper PDF library like jsPDF or react-pdf

export interface DocumentData {
  type: 'quotation' | 'invoice' | 'remittance' | 'proforma' | 'delivery' | 'statement' | 'receipt' | 'lpo' | 'boq';
  number: string;
  date: string;
  lpo_number?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  company?: CompanyDetails; // Optional company details override
  // BOQ-specific structured fields
  project_title?: string;
  contractor?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    discount_before_vat?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    tax_inclusive?: boolean;
    line_total: number;
    unit_of_measure?: string;
    transaction_date?: string;
    reference?: string;
    debit?: number;
    credit?: number;
    transaction_type?: string;
    balance?: number;
    days_overdue?: number;
    due_date?: string;
    item_code?: string;
    section_name?: string;
    section_labor_cost?: number;
  }>;
  preliminaries_items?: Array<{
    item_code: string;
    description: string;
    line_total: number;
  }>;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  notes?: string;
  terms_and_conditions?: string;
  valid_until?: string; // For proforma invoices
  due_date?: string; // For invoices
  // Delivery note specific fields
  delivery_date?: string;
  delivery_address?: string;
  delivery_method?: string;
  carrier?: string;
  tracking_number?: string;
  delivered_by?: string;
  received_by?: string;
  // Quotation sections
  sections?: Array<{
    name: string;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_percentage?: number;
      tax_amount?: number;
      line_total: number;
    }>;
    labor_cost: number;
  }>;
}

// Company details interface
interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  company_services?: string;
  logo_url?: string;
}

// Default company details (fallback) - logo will be determined dynamically
const DEFAULT_COMPANY: CompanyDetails = {
  name: 'Layons Construction Limited',
  address: '',
  city: 'Nairobi',
  country: 'Kenya',
  phone: '',
  email: 'layonscoltd@gmail.com',
  tax_number: '',
  logo_url: 'https://cdn.builder.io/api/v1/image/assets%2Fb048b36350454e4dba55aefd37788f9c%2Fbd04dab542504461a2451b061741034c?format=webp&width=800'
};

// Helper function to determine which columns have values
const analyzeColumns = (items: DocumentData['items']) => {
  if (!items || items.length === 0) return {};

  const columns = {
    discountPercentage: false,
    discountBeforeVat: false,
    discountAmount: false,
    taxPercentage: false,
    taxAmount: false,
  };

  items.forEach(item => {
    if (item.discount_percentage && item.discount_percentage > 0) {
      columns.discountPercentage = true;
    }
    if (item.discount_before_vat && item.discount_before_vat > 0) {
      columns.discountBeforeVat = true;
    }
    if (item.discount_amount && item.discount_amount > 0) {
      columns.discountAmount = true;
    }
    if (item.tax_percentage && item.tax_percentage > 0) {
      columns.taxPercentage = true;
    }
    if (item.tax_amount && item.tax_amount > 0) {
      columns.taxAmount = true;
    }
  });

  return columns;
};

export const generatePDF = (data: DocumentData) => {
  // Extract theme color variables from the main document so PDFs match the app theme
  const computed = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const primaryVar = computed ? (computed.getPropertyValue('--primary') || '46 65% 53%').trim() : '46 65% 53%';
  const primaryForegroundVar = computed ? (computed.getPropertyValue('--primary-foreground') || '0 0% 10%').trim() : '0 0% 10%';
  const successVar = computed ? (computed.getPropertyValue('--success') || '140 50% 45%').trim() : '140 50% 45%';
  const warningVar = computed ? (computed.getPropertyValue('--warning') || '45 85% 57%').trim() : '45 85% 57%';

  // Build CSS root variables to inject into the PDF window
  const pdfRootVars = `:root { --primary: ${primaryVar}; --primary-foreground: ${primaryForegroundVar}; --success: ${successVar}; --warning: ${warningVar}; }`;

  // Use company details from data or fall back to defaults
  const company = data.company || DEFAULT_COMPANY;

  // Analyze which columns have values
  const visibleColumns = analyzeColumns(data.items);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Longer, human-friendly date (e.g. 23 July 2025)
  const formatDateLong = (date: string) => {
    try {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return String(date || '');
    }
  };

  // Create a new window with the document content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  const documentTitle = data.type === 'proforma' ? 'Proforma Invoice' :
                       data.type === 'delivery' ? 'Delivery Note' :
                       data.type === 'statement' ? 'Customer Statement' :
                       data.type === 'receipt' ? 'Payment Receipt' :
                       data.type === 'remittance' ? 'Remittance Advice' :
                       data.type === 'lpo' ? 'Purchase Order' :
                       data.type === 'boq' ? 'Bill of Quantities' :
                       data.type.charAt(0).toUpperCase() + data.type.slice(1);
  
  // Prefer structured fields if present, otherwise fall back to parsing notes
  let boqProject = data.project_title || '';
  let boqContractor = data.contractor || '';
  if (data.type === 'boq' && (!boqProject || !boqContractor) && data.notes) {
    const parts = data.notes.split('\n');
    parts.forEach(p => {
      const t = p.trim();
      if (!boqProject && t.toUpperCase().startsWith('PROJECT:')) boqProject = t.replace(/PROJECT:\s*/i, '').trim();
      if (!boqContractor && t.toUpperCase().startsWith('CONTRACTOR:')) boqContractor = t.replace(/CONTRACTOR:\s*/i, '').trim();
    });
  }

  // If this is a BOQ, render a dedicated BOQ-style layout
  if (data.type === 'boq') {
    // Build preliminaries table HTML if present
    let preliminariesHtml = '';
    let preliminariesTotal = 0;
    if (data.preliminaries_items && data.preliminaries_items.length > 0) {
      preliminariesHtml = `
        <div class="preliminaries-section">
          <table class="items">
            <thead>
              <tr>
                <th style="width:10%">ITEM</th>
                <th style="width:70%; text-align:left">DESCRIPTION</th>
                <th style="width:20%">AMOUNT (KSHS)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="section-row"><td colspan="3" class="section-title">SECTION NO. 1: PRELIMINARIES</td></tr>
      `;
      let itemNo = 1;
      data.preliminaries_items.forEach((item) => {
        preliminariesHtml += `<tr class="item-row">
          <td class="num" style="text-align:center; width:10%">${item.item_code || ''}</td>
          <td class="desc" style="width:70%">${item.description}</td>
          <td class="amount" style="width:20%; text-align:right; font-weight:600">${formatCurrency(item.line_total || 0)}</td>
        </tr>`;
        preliminariesTotal += item.line_total || 0;
      });
      preliminariesHtml += `
              <tr class="section-total">
                <td colspan="2" class="label" style="text-align:right; font-weight:700">SECTION TOTAL:</td>
                <td class="amount" style="text-align:right; font-weight:700">${formatCurrency(preliminariesTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Build table rows; support Sections, Subsections, and their totals
    let rowsHtml = '';
    let currentSection = '';
    let itemNo = 0;

    // Detect if subsections are present (items produced by boqPdfGenerator)
    const hasSubsections = (data.items || []).some((it) => typeof it.description === 'string' && it.description.toLowerCase().includes('subsection'));

    // Keep track of section totals to compute final total as sum of section totals
    const sectionTotals: number[] = [];

    // Helpers to detect row kinds
    const isSectionHeader = (d: string) => d.startsWith('➤ ');
    const isSubsectionHeader = (d: string) => /^\s*[→-]?\s*subsection\s+[^:]+:\s*/i.test(d);
    const isSubsectionSubtotal = (d: string) => /^subsection\s+[^\s]+\s+subtotal\s*$/i.test(d);
    const isSectionTotalRow = (d: string) => /^section\s+total$/i.test(d);

    if (hasSubsections) {
      (data.items || []).forEach((it) => {
        const desc = String(it.description || '');

        if (isSectionHeader(desc)) {
          currentSection = desc.replace(/^➤\s*/, '');
          itemNo = 0;
          rowsHtml += `<tr class=\"section-row\"><td colspan=\"6\" class=\"section-title\">${currentSection}</td></tr>`;
          return;
        }

        if (isSubsectionSubtotal(desc)) {
          rowsHtml += `<tr class=\"subsection-total\">\n          <td class=\"num\"></td>\n          <td colspan=\"4\" class=\"label\">${desc}</td>\n          <td class=\"amount\">${formatCurrency(it.line_total || 0)}</td>\n        </tr>`;
          return;
        }

        if (isSubsectionHeader(desc)) {
          rowsHtml += `<tr class=\"subsection-row\"><td class=\"num\"></td><td colspan=\"5\" class=\"subsection-title\">${desc.replace(/^\s*[→-]?\s*/, '')}</td></tr>`;
          return;
        }

        if (isSectionTotalRow(desc)) {
          const total = Number(it.line_total || 0);
          sectionTotals.push(total);
          rowsHtml += `<tr class=\"section-total\">\n          <td class=\"num\"></td>\n          <td colspan=\"4\" class=\"label\">SECTION TOTAL:</td>\n          <td class=\"amount\">${formatCurrency(total)}</td>\n        </tr>`;
          itemNo = 0;
          return;
        }

        // Regular item row within subsection
        itemNo += 1;
        rowsHtml += `<tr class=\"item-row\">\n        <td class=\"num\">${itemNo}</td>\n        <td class=\"desc\">${it.description}</td>\n        <td class=\"qty\">${it.quantity || ''}</td>\n        <td class=\"unit\">${(it as any).unit_abbreviation || it.unit_of_measure || ''}</td>\n        <td class=\"rate\">${formatCurrency(it.unit_price || 0)}</td>\n        <td class=\"amount\">${formatCurrency(it.line_total || 0)}</td>\n      </tr>`;
      });
    } else {
      // Legacy behavior: section headers are items with qty=0 and unit_price=0; totals are computed per section
      let runningSectionTotal = 0;
      (data.items || []).forEach((it) => {
        const isSection = (it.quantity === 0 && it.unit_price === 0);
        if (isSection) {
          if (itemNo > 0) {
            rowsHtml += `<tr class=\"section-total\">\n          <td class=\"num\"></td>\n          <td colspan=\"4\" class=\"label\">SECTION TOTAL:</td>\n          <td class=\"amount\">${formatCurrency(runningSectionTotal)}</td>\n        </tr>`;
            sectionTotals.push(runningSectionTotal);
          }
          runningSectionTotal = 0;
          itemNo = 0;
          currentSection = it.description.replace(/^➤\s*/, '');
          rowsHtml += `<tr class=\"section-row\"><td colspan=\"6\" class=\"section-title\">${currentSection}</td></tr>`;
          return;
        }
        itemNo += 1;
        const line = (it.line_total || 0);
        runningSectionTotal += line;
        rowsHtml += `<tr class=\"item-row\">\n        <td class=\"num\">${itemNo}</td>\n        <td class=\"desc\">${it.description}</td>\n        <td class=\"qty\">${it.quantity || ''}</td>\n        <td class=\"unit\">${(it as any).unit_abbreviation || it.unit_of_measure || ''}</td>\n        <td class=\"rate\">${formatCurrency(it.unit_price || 0)}</td>\n        <td class=\"amount\">${formatCurrency(line)}</td>\n      </tr>`;
      });
      // Flush last section
      if (itemNo > 0) {
        rowsHtml += `<tr class=\"section-total\">\n          <td class=\"num\"></td>\n          <td colspan=\"4\" class=\"label\">SECTION TOTAL:</td>\n          <td class=\"amount\">${formatCurrency(runningSectionTotal)}</td>\n        </tr>`;
        sectionTotals.push(runningSectionTotal);
      }
    }

    // Compute grand total for BOQ as sum of section totals if present; otherwise fallback to provided total
    let mainSectionsTotal = (sectionTotals.length > 0)
      ? sectionTotals.reduce((a, b) => a + b, 0)
      : (data.total_amount || data.subtotal || 0);
    const grandTotalForBOQ = preliminariesTotal + mainSectionsTotal;

    const htmlContentBOQ = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BILLS OF QUANTITIES ${data.number}</title>
      <meta charset="UTF-8">
      <style>
        ${pdfRootVars}
        @page { size: A4; margin: 0 0 12mm 0; }
        @media print {
          @page { counter-increment: page; }
        }
        * { box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; margin:0; color:#222; font-size:12px; }
        body { counter-reset: page; }
        .pagefoot::after { content: "Page " counter(page) ""; }
        .container { padding: 12mm; }

        /* Header image styling - matching quotations */
        .header-image { width: 100%; height: auto; display: block; margin: 0; padding: 0; }

        /* Header content styling */
        .header-content { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-top: 20px; }
        .header-left { display: flex; flex-direction: column; gap: 8px; font-size: 10px; line-height: 1.6; text-align: left; }
        .header-right { text-align: right; font-size: 10px; line-height: 1.6; }
        .header-right .company-name { font-weight: bold; margin-bottom: 6px; font-size: 12px; }

        .items { width:100%; border-collapse:collapse; margin-top:6px; }
        .items th, .items td { border:1px solid #e6e6e6; padding:6px 8px; }
        .items thead th { background:#000; color:#fff; font-weight:700; }
        .section-row td.section-title { background:#f4f4f4; font-weight:700; padding:8px; }
        .item-row td.num { text-align:center; }
        .item-row td.desc { width:55%; }
        .item-row td.qty, .item-row td.unit, .item-row td.rate, .item-row td.amount { text-align:right; }
        .section-total td { font-weight:700; background:#fafafa; }
        .section-total .label { text-align:right; padding-right:12px; }
        .preliminaries-section { margin-bottom:12px; }
        .preliminaries-section .items { margin-top:0; }
        .subsection-row td { background:#fcfcfc; font-weight:600; }
        .subsection-title { padding:6px 8px; }
        .subsection-total td { font-weight:600; background:#fdfdfd; }
        .subsection-total .label { text-align:right; padding-right:12px; }
        .totals { margin-top:10px; width:100%; }
        .totals .label { text-align:right; padding-right:12px; }
        .footer { margin-top:24px; display:flex; flex-direction:column; gap:18px; }
        .sig-block { display:flex; flex-direction:column; gap:8px; }
        .sig-title { font-weight:700; }
        .sig-role { font-weight:700; }
        .sigline { height:16px; border-bottom:1px dotted #999; }
        .field-row { display:flex; align-items:flex-end; gap:8px; }
        .field-row .label { width:80px; font-weight:600; }
        .field-row .fill { flex:1; height:16px; border-bottom:1px dotted #999; }
        .pagefoot { position:fixed; bottom:12mm; left:12mm; right:12mm; text-align:center; font-size:10px; color:#666; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Section -->
        <div class="header">
          <!-- Full-width header image (same as quotations) -->
          <img src="https://cdn.builder.io/api/v1/image/assets%2Ff04fab3fe283460ba50093ba53a92dcd%2F1ce2c870c8304b9cab69f4c60615a6af?format=webp&width=800" alt="Layons Construction Limited" class="header-image" />

          <!-- Header content below image -->
          <div class="header-content">
            <!-- Left side: Client and Document Details -->
            <div class="header-left">
              ${company.company_services ? `
              <div style="font-size: 10px; font-weight: bold; color: #333; margin-bottom: 6px; line-height: 1.4; text-transform: uppercase;">
                ${company.company_services.split('\n').filter((line: string) => line.trim()).map((line: string) => `<div>${line.trim()}</div>`).join('')}
              </div>
              ` : ''}

              <div style="margin-bottom: 4px;"><strong>Client:</strong> ${data.customer.name}</div>
              ${boqProject ? `<div style="margin-bottom: 4px;"><strong>Project:</strong> ${boqProject}</div>` : ''}
              <div style="margin-bottom: 4px;"><strong>Subject:</strong> Bill of Quantities</div>
              <div style="margin-bottom: 4px;"><strong>Date:</strong> ${formatDateLong(data.date)}</div>
              <div style="margin-bottom: 4px;"><strong>BOQ No:</strong> ${data.number}</div>
            </div>

            <!-- Right side: Company details (right-aligned) -->
            <div class="header-right">
              <div class="company-name">${company.name}</div>
              ${company.address ? `<div>${company.address}</div>` : ''}
              ${company.city ? `<div>${company.city}${company.country ? ', ' + company.country : ''}</div>` : ''}
              ${company.phone ? `<div>Telephone: ${company.phone}</div>` : ''}
              ${company.email ? `<div>${company.email}</div>` : ''}
              ${company.tax_number ? `<div>PIN: ${company.tax_number}</div>` : ''}
            </div>
          </div>
        </div>

        ${preliminariesHtml}

        <table class="items">
          <thead>
            <tr>
              <th style="width:5%">#</th>
              <th style="width:55%; text-align:left">ITEM DESCRIPTION</th>
              <th style="width:8%">QTY</th>
              <th style="width:9%">UNIT</th>
              <th style="width:11%">RATE</th>
              <th style="width:12%">AMOUNT (KSHS)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table style="width:100%; margin-top:8px;">
            <tr>
              <td class="label" style="text-align:right; font-weight:700;">TOTAL:</td>
              <td style="width:150px; text-align:right; font-weight:700;">${formatCurrency(grandTotalForBOQ)}</td>
            </tr>
          </table>
        </div>

        <div class="stamp-section" style="display:flex; justify-content:center; margin:20px 0 24px 0;">
          <img src="https://cdn.builder.io/api/v1/image/assets%2F9ff3999d5c9643b5b444cfaefad1cb5e%2F70894a4a73a347ac823210fd2ffd0871?format=webp&width=800" alt="Company Stamp" style="height:140px; width:auto; object-fit:contain;" />
        </div>

        <div class="footer">
          <div class="sig-block">
            <div class="sig-title">SIGNED:</div>
            <div class="sig-role">( CONTRACTOR )</div>
            <div class="sigline"></div>
            <div class="field-row"><div class="label">Address:</div><div class="fill"></div></div>
            <div class="field-row"><div class="label">Tel No:</div><div class="fill"></div></div>
            <div class="field-row"><div class="label">Date:</div><div class="fill"></div></div>
          </div>
          <div class="sig-block">
            <div class="sig-title">SIGNED:</div>
            <div class="sig-role">( EMPLOYER )</div>
            <div class="sigline"></div>
            <div class="field-row"><div class="label">Address:</div><div class="fill"></div></div>
            <div class="field-row"><div class="label">Tel No:</div><div class="fill"></div></div>
            <div class="field-row"><div class="label">Date:</div><div class="fill"></div></div>
          </div>
        </div>
      </div>
      <div class="pagefoot">${company.name} • Generated on ${new Date().toLocaleDateString()}</div>
    </body>
    </html>
    `;

    printWindow.document.write(htmlContentBOQ);
    printWindow.document.close();

    printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
    setTimeout(() => { if (printWindow && !printWindow.closed) printWindow.print(); }, 1000);

    return printWindow;
  }

  // Handle quotations, invoices, and proformas with sections
  if ((data.type === 'quotation' || data.type === 'invoice' || data.type === 'proforma') && data.sections && data.sections.length > 0) {
    let pagesHtml = '';

    // Render one section per page
    data.sections.forEach((section, sectionIndex) => {
      const sectionMaterialsTotal = section.items.reduce((sum, item) => sum + (item.line_total || 0), 0);
      const sectionLaborCost = section.labor_cost || 0;
      const sectionTotal = sectionMaterialsTotal + sectionLaborCost;
      const sectionTaxAmount = section.items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);

      // Generate alphabetical section letter (A, B, C, etc.)
      const sectionLetter = String.fromCharCode(65 + sectionIndex); // 65 = 'A'
      const sectionTitleWithLetter = `${sectionLetter}. ${section.name.toUpperCase()}`;

      // Only show header on first section page
      const showHeader = sectionIndex === 0;

      pagesHtml += `
        <div class="page" style="page-break-after: always;">
          ${showHeader ? `
          <!-- Header Section (only on first page) -->
          <div class="header">
            <!-- Full-width header image -->
            <img src="https://cdn.builder.io/api/v1/image/assets%2Ff04fab3fe283460ba50093ba53a92dcd%2F1ce2c870c8304b9cab69f4c60615a6af?format=webp&width=800" alt="Layons Construction Limited" class="header-image" />

            <!-- Header content below image -->
            <div class="header-content" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-top: 20px;">
              <!-- Left side: Client and Document Details (matches supplied attachment) -->
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 10px; line-height: 1.6; text-align:left;">
                ${company.company_services ? `
                <div style="font-size: 10px; font-weight: bold; color: #333; margin-bottom: 6px; line-height: 1.4; text-transform: uppercase;">
                  ${company.company_services.split('\n').filter((line: string) => line.trim()).map((line: string) => `<div>${line.trim()}</div>`).join('')}
                </div>
                ` : ''}

                <div style="margin-bottom: 4px;"><strong>Client:</strong> ${data.customer?.name || ''}</div>
                ${data.project_title ? `<div style="margin-bottom: 4px;"><strong>Project:</strong> ${data.project_title}</div>` : ''}
                <div style="margin-bottom: 4px;"><strong>Subject:</strong> ${data.type === 'boq' ? 'Bill of Quantities' : (data.subject || (data.type === 'invoice' ? 'Invoice' : 'Quotation'))}</div>
                <div style="margin-bottom: 4px;"><strong>Date:</strong> ${formatDateLong(data.date || '')}</div>
                <div style="margin-bottom: 4px;"><strong>Qtn No:</strong> ${data.number || ''}</div>
              </div>

              <!-- Right side: Company details (right-aligned) -->
              <div style="text-align: right; font-size: 10px; line-height: 1.6;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">${company.name}</div>
                ${company.address ? `<div>${company.address}</div>` : ''}
                ${company.city ? `<div>${company.city}${company.country ? ', ' + company.country : ''}</div>` : ''}
                ${company.phone ? `<div>Telephone: ${company.phone}</div>` : ''}
                ${company.email ? `<div>${company.email}</div>` : ''}
                ${company.tax_number ? `<div>PIN: ${company.tax_number}</div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Section Title with alphabetical letter -->
          <div class="section-title" style="margin: ${showHeader ? '25px 0 15px 0' : '20px 0 15px 0'}; padding: 12px; background: #fff; border-left: 4px solid #000; font-size: 14px; font-weight: bold; text-transform: uppercase;">${sectionTitleWithLetter}</div>

          <!-- Materials Subsection -->
          <div class="subsection" style="margin-bottom:12px;">
            <div style="font-weight:600; margin-bottom:6px;">Materials</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 5%;">Item #</th>
                  <th style="width: 30%;">Description</th>
                  <th style="width: 10%;">Unit</th>
                  <th style="width: 10%;">Qty</th>
                  <th style="width: 18%;">Unit Price</th>
                  <th style="width: 27%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${section.items.map((item, itemIndex) => {
                  const unit = item.products?.unit_of_measure || item.unit_of_measure || '-';
                  return `
                  <tr>
                    <td>${itemIndex + 1}</td>
                    <td class="description-cell">${item.description}</td>
                    <td class="center">${unit}</td>
                    <td class="center">${item.quantity}</td>
                    <td class="amount-cell">${formatCurrency(item.unit_price)}</td>
                    <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                  </tr>
                `;
                }).join('')}
                <tr style="background: #fff; font-weight: 600; border-top: 2px solid #000;">
                  <td colspan="5" style="text-align: right; padding: 8px 8px;">Materials Subtotal:</td>
                  <td style="text-align: right; padding: 8px 8px;">${formatCurrency(sectionMaterialsTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Labour Subsection (only display if labor cost > 0) -->
          ${sectionLaborCost > 0 ? `
          <div class="subsection" style="margin-bottom:12px;">
            <div style="font-weight:600; margin-bottom:6px;">Labour</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 6%;">#</th>
                  <th style="width: 74%; text-align:left;">Description</th>
                  <th style="width: 20%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align:center;">1</td>
                  <td class="description-cell">Labour for ${section.name}</td>
                  <td class="amount-cell">${formatCurrency(sectionLaborCost)}</td>
                </tr>
                <tr style="background: #fff; font-weight: 600; border-top: 2px solid #000;">
                  <td colspan="2" style="text-align: right; padding: 8px 8px;">Labour Subtotal:</td>
                  <td style="text-align: right; padding: 8px 8px;">${formatCurrency(sectionLaborCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- Section Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr class="total-row">
                <td class="label">SECTION ${sectionLetter} TOTAL:</td>
                <td class="amount">${formatCurrency(sectionTotal)}</td>
              </tr>
            </table>
          </div>

        </div>
      `;
    });

    // Add Summary Page with section totals only
    const grandTotal = data.sections.reduce((sum, sec) => {
      const secTotal = sec.items.reduce((s, item) => s + (item.line_total || 0), 0) + (sec.labor_cost || 0);
      return sum + secTotal;
    }, 0);

    pagesHtml += `
      <div class="page" style="position: relative; page-break-before: always;">
        <!-- Section Totals Table Only -->
        <div style="margin: 20px 0;">
          <table class="totals-table" style="width: 400px;">
            <thead>
              <tr style="border-bottom: 2px solid #000;">
                <th style="text-align: left; padding: 10px 15px; font-weight: bold; color: #000; font-size: 12px;">SECTION</th>
                <th style="text-align: right; padding: 10px 15px; font-weight: bold; color: #000; font-size: 12px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${data.sections.map((section, idx) => {
                const sectionLetter = String.fromCharCode(65 + idx);
                const matTotal = section.items.reduce((sum, item) => sum + (item.line_total || 0), 0);
                const labour = section.labor_cost || 0;
                const secTotal = matTotal + labour;

                return `
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 15px; text-align: left; font-weight: 500;">${sectionLetter}. ${section.name}</td>
                    <td style="padding: 10px 15px; text-align: right; font-weight: 600;">${formatCurrency(secTotal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Grand Total -->
        <div style="display: flex; justify-content: flex-start; margin-top: 20px;">
          <table class="totals-table" style="width: 400px;">
            <tr class="total-row" style="border-top: 2px solid #000; background: #fff;">
              <td class="label" style="padding: 12px 15px; text-align: left; font-weight: bold; color: #000; font-size: 14px;">GRAND TOTAL:</td>
              <td class="amount" style="padding: 12px 15px; text-align: right; font-weight: bold; color: #000; font-size: 14px;">${formatCurrency(grandTotal)}</td>
            </tr>
          </table>
        </div>

        <!-- Stamp Section -->
        <div class="stamp-section" style="display:flex; justify-content:center; margin:40px 0 24px 0;">
          <img src="https://cdn.builder.io/api/v1/image/assets%2F9ff3999d5c9643b5b444cfaefad1cb5e%2F70894a4a73a347ac823210fd2ffd0871?format=webp&width=800" alt="Company Stamp" style="height:140px; width:auto; object-fit:contain;" />
        </div>
      </div>
    `;

    // Add Terms and Conditions Page (Final Page)
    pagesHtml += `
      <div class="page" style="position: relative; page-break-before: always;">
        <div style="padding: 0;">

          <!-- Terms Section -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Terms;</h3>
            <ol style="font-size: 11px; line-height: 1.6; margin: 0; padding-left: 20px; color: #333;">
              <li style="margin-bottom: 6px;">The Payment terms for each stage are as follows; a. 50% Upon Order (${formatCurrency(grandTotal * 0.5)}) b. 40% As Progressive (${formatCurrency(grandTotal * 0.4)}) c. 10% Upon Completion (${formatCurrency(grandTotal * 0.1)})</li>
              <li style="margin-bottom: 6px;">All work will be executed based on the drawings and samples approved by the client</li>
              <li style="margin-bottom: 6px;">Any Changes/alterations to the scope of work outlined will affect the final quantity will be measured, and charges will be applied on a pro-rata basis at the agreed rate</li>
              <li style="margin-bottom: 6px;">We are not responsible for any damages caused by negligence from other Sub Contractors Hired by the Client.</li>
              <li style="margin-bottom: 6px;">The quotation does not include statutory fees.</li>
              <li style="margin-bottom: 6px;">The work shall be completed within weeks from the day of Order.</li>
            </ol>
          </div>

          <!-- Acceptance of Quote Section -->
          <div style="margin-bottom: 25px; padding-top: 15px; border-top: 1px solid #ddd;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Acceptance of Quote;</h3>
            <p style="font-size: 11px; margin: 0; color: #333;">The above prices specifications and terms are satisfactory.</p>
          </div>

          <!-- Contractor and Client Section -->
          <div style="display: flex; gap: 40px; margin-bottom: 25px; margin-top: 30px;">
            <!-- Contractor Section -->
            <div style="flex: 1;">
              <div style="font-size: 11px; line-height: 1.8; color: #333;">
                <div><strong>Contractor;</strong> ${company.name}</div>
                <div><strong>Tel No;</strong> 254720717463</div>
                <div><strong>Signed;</strong> KELVIN MURIITHI</div>
              </div>
            </div>

            <!-- Stamp Area -->
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px;">
              <img src="https://cdn.builder.io/api/v1/image/assets%2F9ff3999d5c9643b5b444cfaefad1cb5e%2F70894a4a73a347ac823210fd2ffd0871?format=webp&width=800" alt="Company Stamp" style="height:140px; width:auto; object-fit:contain;" />
            </div>
          </div>

          <!-- Client Section -->
          <div style="margin-bottom: 25px; padding-top: 15px; border-top: 1px solid #ddd;">
            <div style="font-size: 11px; line-height: 1.8; color: #333;">
              <div><strong>Client;</strong> ________________________</div>
              <div><strong>Tel No;</strong> ________________________</div>
            </div>
          </div>

          <!-- Prepaired By Section -->
          <div style="margin-bottom: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
            <div style="font-size: 11px; color: #333;"><strong>PREPAIRED BY;</strong> ${company.name}</div>
          </div>

          <!-- Account Details Section -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">Account Details;</h3>
            <table style="font-size: 10px; width: 100%; line-height: 1.8; color: #333;">
              <tr>
                <td style="width: 30%;"><strong>BANK;</strong></td>
                <td style="width: 70%;">CO-OPERATIVE BANK OF KENYA</td>
              </tr>
              <tr>
                <td><strong>ACCOUNT NAME;</strong></td>
                <td>LAYONS CONSTRUCTION LIMITED</td>
              </tr>
              <tr>
                <td><strong>ACCOUNT NUMBER;</strong></td>
                <td>01192659527000</td>
              </tr>
              <tr>
                <td><strong>BRANCH;</strong></td>
                <td>JUJA</td>
              </tr>
              <tr>
                <td><strong>SWIFT CODE;</strong></td>
                <td>KCOOKENA</td>
              </tr>
              <tr>
                <td><strong>BANK CODE;</strong></td>
                <td>11000</td>
              </tr>
              <tr>
                <td><strong>BRANCH CODE;</strong></td>
                <td>11124</td>
              </tr>
              <tr>
                <td><strong>PAYBILL;</strong></td>
                <td>400200</td>
              </tr>
              <tr>
                <td><strong>ACCOUNT;</strong></td>
                <td>01192659527000</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;

    const htmlContentWithSections = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.type === 'invoice' ? 'Invoice' : data.type === 'proforma' ? 'Proforma Invoice' : 'Quotation'} ${data.number}</title>
        <meta charset="UTF-8">
        <style>
          ${pdfRootVars}
          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            line-height: 1.4;
            font-size: 12px;
            background: white;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 0 20mm 20mm 20mm;
            position: relative;
            /* Ensure each .page begins on a new printed page */
            page-break-after: always;
            break-after: page;
          }

          .header {
            display: flex;
            flex-direction: column;
            margin-bottom: 30px;
            padding-bottom: 0;
            border-bottom: none;
            margin-left: -20mm;
            margin-right: -20mm;
            padding-left: 0;
            padding-right: 0;
          }

          .header-image {
            width: 100%;
            height: auto;
            margin: 0 0 20px 0;
            padding: 0;
            display: block;
            border: none;
          }

          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 30px;
            padding: 20px 20px 20px 20px;
            margin: 0;
            border-bottom: 2px solid #000;
          }

          .company-info {
            flex: 1;
          }

          .logo {
            width: 120px;
            height: 120px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            border-radius: 4px;
            overflow: hidden;
          }

          .logo img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #212529;
          }

          .company-details {
            font-size: 10px;
            color: #666;
            line-height: 1.6;
          }

          .document-info {
            text-align: right;
            flex: 1;
          }

          .document-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #000;
            text-transform: uppercase;
          }

          .document-details table {
            width: 100%;
            margin-top: 10px;
          }

          .document-details td {
            padding: 4px 0;
          }

          .document-details .label {
            font-weight: bold;
            color: #495057;
            width: 40%;
          }

          .document-details .value {
            text-align: right;
            color: #212529;
          }

          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #000;
            margin: 0 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .customer-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #212529;
          }

          .customer-details {
            color: #666;
            line-height: 1.6;
          }

          .items-section {
            margin: 12px 0 30px 0;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 11px;
            border: 2px solid #000;
            border-radius: 0;
            overflow: hidden;
          }

          .items-table thead {
            background: #000;
            color: white;
          }

          .items-table th {
            padding: 8px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-right: 1px solid rgba(255,255,255,0.2);
          }

          .items-table th:last-child {
            border-right: none;
          }

          .items-table td {
            padding: 8px 8px;
            border-bottom: 1px solid #e9ecef;
            border-right: 1px solid #e9ecef;
            text-align: center;
            vertical-align: top;
          }

          .items-table td:last-child {
            border-right: none;
          }

          .items-table tbody tr:last-child td {
            border-bottom: none;
          }

          .items-table tbody tr:nth-child(even) {
            background: #f8f9fa;
          }

          .description-cell {
            text-align: left !important;
            max-width: 200px;
            word-wrap: break-word;
          }

          .amount-cell {
            text-align: right !important;
            font-weight: 500;
          }

          .center {
            text-align: center !important;
          }

          .totals-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }

          .totals-table {
            width: 350px;
            border-collapse: collapse;
            font-size: 12px;
          }

          .totals-table td {
            padding: 8px 15px;
            border: none;
          }

          .totals-table .label {
            text-align: left;
            color: #495057;
            font-weight: 500;
          }

          .totals-table .amount {
            text-align: right;
            font-weight: 600;
            color: #212529;
          }

          .totals-table .total-row {
            border-top: 2px solid #000;
            background: #fff;
          }

          .totals-table .total-row .label {
            font-size: 13px;
            font-weight: bold;
            color: #000;
          }

          .totals-table .total-row .amount {
            font-size: 13px;
            font-weight: bold;
            color: #000;
          }

          /* Allow sections to break naturally but start new sections on new page if needed */
          .section-summary {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 15px;
          }

          .section-summary:not(:last-of-type) {
            page-break-after: always;
            break-after: page;
          }

          .section-summary table,
          .section-summary .subsection,
          .section-summary .items-table,
          .section-summary .totals-table {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          @media print {
            body {
              background: white;
            }

            .page {
              box-shadow: none;
              margin: 0;
              padding: 0;
            }
          }

          @media screen {
            body {
              background: #f5f5f5;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    printWindow.document.write(htmlContentWithSections);
    printWindow.document.close();

    printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
    setTimeout(() => { if (printWindow && !printWindow.closed) printWindow.print(); }, 1000);

    return printWindow;
  }

  // Fallback generic document HTML (existing template)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${documentTitle} ${data.number}</title>
      <meta charset="UTF-8">
      <style>
        ${pdfRootVars}
        @page {
          size: A4;
          margin: 15mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          line-height: 1.4;
          font-size: 12px;
          background: white;
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          padding: 0 20mm 20mm 20mm;
          position: relative;
        }

        .header {
          display: flex;
          flex-direction: column;
          margin-bottom: 8px;
          padding-bottom: 0;
          border-bottom: none;
          margin-left: -20mm;
          margin-right: -20mm;
          padding-left: 20mm;
          padding-right: 20mm;
        }

        .header-image {
          width: calc(100% + 40mm);
          height: auto;
          margin: 0 -20mm 5px -20mm;
          padding: 0;
          display: block;
          border: none;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 40px;
          padding: 0;
          margin: 0;
        }

        .company-info {
          flex: 1;
        }

        .logo {
          display: none;
        }

        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #000;
        }

        .company-details {
          font-size: 10px;
          line-height: 1.6;
          color: #666;
          margin-bottom: 0;
        }

        .document-info {
          text-align: left;
          flex: 1;
          max-width: 100%;
        }
        
        .document-title {
          font-size: 16px;
          font-weight: bold;
          margin: 0 0 12px 0;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .document-details {
          background: transparent;
          padding: 0;
          border-radius: 0;
          border: none;
        }

        .document-details table {
          width: 100%;
          border-collapse: collapse;
        }

        .document-details td {
          padding: 4px 0;
          border: none;
          font-size: 10px;
        }

        .document-details .label {
          font-weight: bold;
          color: #495057;
          width: 50%;
        }

        .document-details .value {
          text-align: left;
          color: #212529;
        }
        
        
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #000;
          margin: 0 0 15px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .customer-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #212529;
        }

        .customer-details {
          color: #666;
          line-height: 1.6;
        }

        .items-section {
          margin: 12px 0 30px 0;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 11px;
          border: 2px solid #000;
          border-radius: 8px;
          overflow: hidden;
        }

        .items-table thead {
          background: #000;
          color: white;
        }

        .items-table th {
          padding: 12px 8px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        .items-table th:last-child {
          border-right: none;
        }
        
        .items-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e9ecef;
          border-right: 1px solid #e9ecef;
          text-align: center;
          vertical-align: top;
        }
        
        .items-table td:last-child {
          border-right: none;
        }
        
        .items-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .items-table tbody tr:hover {
          background: hsl(var(--primary-light));
        }
        
        .description-cell {
          text-align: left !important;
          max-width: 200px;
          word-wrap: break-word;
        }
        
        .amount-cell {
          text-align: right !important;
          font-weight: 500;
        }

        .center {
          text-align: center !important;
        }
        
        .totals-section {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        
        .totals-table {
          width: 300px;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .totals-table td {
          padding: 8px 15px;
          border: none;
        }
        
        .totals-table .label {
          text-align: left;
          color: #495057;
          font-weight: 500;
        }
        
        .totals-table .amount {
          text-align: right;
          font-weight: 600;
          color: #212529;
        }
        
        .totals-table .subtotal-row {
          border-top: 1px solid #dee2e6;
        }
        
        .totals-table .total-row {
          border-top: 2px solid #000;
          background: #fff;
        }

        .totals-table .total-row .label {
          font-size: 14px;
          font-weight: bold;
          color: #000;
        }

        .totals-table .total-row .amount {
          font-size: 14px;
          font-weight: bold;
          color: #000;
        }
        
        
        .footer {
          position: absolute;
          bottom: 20mm;
          left: 20mm;
          right: 20mm;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #e9ecef;
          padding-top: 15px;
        }
        
        .delivery-info-section {
          margin: 25px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .delivery-details {
          margin-top: 15px;
        }

        .delivery-row {
          display: flex;
          gap: 20px;
          margin-bottom: 12px;
        }

        .delivery-field {
          flex: 1;
          min-width: 0;
        }

        .delivery-field.full-width {
          flex: 100%;
        }

        .field-label {
          font-size: 10px;
          font-weight: bold;
          color: #000;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .field-value {
          font-size: 11px;
          color: #333;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .signature-section {
          margin: 30px 0 20px 0;
          padding: 20px;
          border-top: 1px solid #e9ecef;
        }

        .signature-row {
          display: flex;
          gap: 40px;
        }

        .signature-box {
          flex: 1;
          text-align: center;
        }

        .signature-label {
          font-size: 11px;
          font-weight: bold;
          color: #000;
          margin-bottom: 20px;
          text-transform: uppercase;
        }

        .signature-line {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #333;
          margin-bottom: 10px;
          padding-bottom: 5px;
          min-height: 20px;
        }

        .signature-date {
          font-size: 10px;
          color: #666;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 72px;
          color: hsl(var(--primary) / 0.12);
          font-weight: bold;
          z-index: -1;
          pointer-events: none;
          text-transform: uppercase;
          letter-spacing: 5px;
        }
        
        @media print {
          body {
            background: white;
          }
          
          .page {
            box-shadow: none;
            margin: 0;
            padding: 0;
          }
          
          .watermark {
            display: ${data.type === 'proforma' ? 'block' : 'none'};
          }
        }
        
        @media screen {
          body {
            background: #f5f5f5;
            padding: 20px;
          }
        }
        \n        .payment-banner {\n          background: #f8f9fa;\n          padding: 8px 15px;\n          margin-bottom: 20px;\n          border-left: 4px solid hsl(var(--primary));\n          font-size: 10px;\n          color: #333;\n          text-align: center;\n          border-radius: 4px;\n          font-weight: 600;\n        }\n        \n        .bank-details {\n          background: #f8f9fa;\n          padding: 10px;\n          margin: 15px 0;\n          border-left: 4px solid hsl(var(--primary));\n          font-size: 10px;\n          color: #333;\n          text-align: center;\n          border-radius: 4px;\n          font-weight: 600;\n        }\n      </style>
    </head>
    <body>
      <div class="page">
        <!-- Watermark for proforma invoices -->
        ${data.type === 'proforma' ? '<div class="watermark">Proforma</div>' : ''}
        
        <!-- Header Section -->
        <div class="header">
          <!-- Full-width header image -->
          <img src="https://cdn.builder.io/api/v1/image/assets%2Ff04fab3fe283460ba50093ba53a92dcd%2F1ce2c870c8304b9cab69f4c60615a6af?format=webp&width=800" alt="Layons Construction Limited" class="header-image" />

          <!-- Header content below image -->
          <div class="header-content">
            <!-- Left side: Services and Client info (formatted like attachment) -->
            <div class="company-info">
              ${company.company_services ? `
              <div style="font-size: 10px; font-weight: bold; color: #333; margin-bottom: 8px; line-height: 1.4; text-transform: uppercase;">
                ${company.company_services.split('\\n').filter((line: string) => line.trim()).map((line: string) => `<div>${line.trim()}</div>`).join('')}
              </div>
              ` : ''}

              <div style="margin-top: 6px; font-size: 10px; line-height:1.6;">
                <div style="margin-bottom:6px; font-weight:600;">${data.type === 'lpo' ? 'Supplier' : 'Client'}</div>
                <div style="margin-bottom:4px;">${data.customer?.name || ''}</div>
                ${data.project_title ? `<div style="margin-bottom:4px;"><strong>Project:</strong> ${data.project_title}</div>` : ''}
                <div style="margin-bottom:4px;"><strong>Subject:</strong> ${data.type === 'boq' ? 'Bill of Quantities' : (data.subject || (data.type === 'invoice' ? 'Invoice' : 'Quotation'))}</div>
                <div style="margin-bottom:4px;"><strong>Date:</strong> ${formatDateLong(data.date || '')}</div>
                <div style="margin-bottom:4px;"><strong>Qtn No:</strong> ${data.number || ''}</div>
              </div>
            </div>

            <!-- Right side: Document info -->
            <div class="document-info">
              <div style="text-align: right; font-size: 10px; line-height: 1.6; margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">${company.name}</div>
                ${company.address ? `<div>${company.address}</div>` : ''}
                ${company.city ? `<div>${company.city}${company.country ? ', ' + company.country : ''}</div>` : ''}
                ${company.phone ? `<div>Telephone: ${company.phone}</div>` : ''}
                ${company.email ? `<div>${company.email}</div>` : ''}
                ${company.tax_number ? `<div>PIN: ${company.tax_number}</div>` : ''}
              </div>

              <!-- Document title and metadata removed as requested -->
            </div>
          </div>
        </div>

        <!-- Delivery Information Section (for delivery notes) -->
        ${data.type === 'delivery' ? `
        <div class="delivery-info-section">
          <div class="section-title">Delivery Information</div>
          <div class="delivery-details">
            <div class="delivery-row">
              ${data.delivery_date ? `
              <div class="delivery-field">
                <div class="field-label">Delivery Date:</div>
                <div class="field-value">${new Date(data.delivery_date).toLocaleDateString()}</div>
              </div>
              ` : ''}
              ${data.delivery_method ? `
              <div class="delivery-field">
                <div class="field-label">Delivery Method:</div>
                <div class="field-value">${data.delivery_method}</div>
              </div>
              ` : ''}
            </div>

            ${data.delivery_address ? `
            <div class="delivery-row">
              <div class="delivery-field full-width">
                <div class="field-label">Delivery Address:</div>
                <div class="field-value">${data.delivery_address}</div>
              </div>
            </div>
            ` : ''}

            <div class="delivery-row">
              ${data.carrier ? `
              <div class="delivery-field">
                <div class="field-label">Carrier:</div>
                <div class="field-value">${data.carrier}</div>
              </div>
              ` : ''}
              ${data.tracking_number ? `
              <div class="delivery-field">
                <div class="field-label">Tracking Number:</div>
                <div class="field-value">${data.tracking_number}</div>
              </div>
              ` : ''}
            </div>

            <div class="delivery-row">
              ${data.delivered_by ? `
              <div class="delivery-field">
                <div class="field-label">Delivered By:</div>
                <div class="field-value">${data.delivered_by}</div>
              </div>
              ` : ''}
              ${data.received_by ? `
              <div class="delivery-field">
                <div class="field-label">Received By:</div>
                <div class="field-value">${data.received_by}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Items Section -->
        ${data.items && data.items.length > 0 ? `
        <div class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                ${data.type === 'delivery' ? `
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Item Description</th>
                <th style="width: 15%;">Ordered Qty</th>
                <th style="width: 15%;">Delivered Qty</th>
                <th style="width: 15%;">Unit</th>
                <th style="width: 10%;">Status</th>
                ` : data.type === 'statement' ? `
                <th style="width: 12%;">Date</th>
                <th style="width: 25%;">Description</th>
                <th style="width: 15%;">Reference</th>
                <th style="width: 12%;">Debit</th>
                <th style="width: 12%;">Credit</th>
                <th style="width: 12%;">Balance</th>
                ` : data.type === 'remittance' ? `
                <th style="width: 15%;">Date</th>
                <th style="width: 15%;">Document Type</th>
                <th style="width: 20%;">Document Number</th>
                <th style="width: 16%;">Invoice Amount</th>
                <th style="width: 16%;">Credit Amount</th>
                <th style="width: 18%;">Payment Amount</th>
                ` : data.type === 'boq' ? `
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Item Description</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 10%;">Unit</th>
                <th style="width: 15%;">Rate</th>
                <th style="width: 15%;">Amount</th>
                ` : `
                <th style="width: 5%;">Item #</th>
                <th style="width: 35%;">Description</th>
                <th style="width: 12%;">Unit</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 18%;">Unit Price</th>
                <th style="width: 20%;">Total</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => `
                <tr>
                  ${data.type === 'statement' ? `
                  <td>${formatDate((item as any).transaction_date)}</td>
                  <td class="description-cell">${item.description}</td>
                  <td>${(item as any).reference}</td>
                  <td class="amount-cell">${(item as any).debit > 0 ? formatCurrency((item as any).debit) : ''}</td>
                  <td class="amount-cell">${(item as any).credit > 0 ? formatCurrency((item as any).credit) : ''}</td>
                  <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                  ` : data.type === 'remittance' ? `
                  <td>${formatDate((item as any).document_date)}</td>
                  <td>${(item as any).description ? (item as any).description.split(':')[0] : 'Payment'}</td>
                  <td>${(item as any).description ? (item as any).description.split(':')[1] || (item as any).description : ''}</td>
                  <td class="amount-cell">${(item as any).invoice_amount ? formatCurrency((item as any).invoice_amount) : ''}</td>
                  <td class="amount-cell">${(item as any).credit_amount ? formatCurrency((item as any).credit_amount) : ''}</td>
                  <td class="amount-cell" style="font-weight: bold;">${formatCurrency(item.line_total)}</td>
                  ` : `
                  <td>${index + 1}</td>
                  <td class="description-cell">${item.description}</td>
                  ${data.type === 'delivery' ? `
                  <td>${(item as any).quantity_ordered || item.quantity}</td>
                  <td style="font-weight: bold; color: ${(item as any).quantity_delivered >= (item as any).quantity_ordered ? 'hsl(var(--primary))' : '#F59E0B'};">${(item as any).quantity_delivered || item.quantity}</td>
                  <td>${(item as any).unit_of_measure || 'pcs'}</td>
                  <td style="font-size: 10px;">
                    ${(item as any).quantity_delivered >= (item as any).quantity_ordered ?
                      '<span style="color: hsl(var(--primary)); font-weight: bold;">✓ Complete</span>' :
                      '<span style="color: #F59E0B; font-weight: bold;">⚠ Partial</span>'
                    }
                  </td>
                  ` : data.type === 'boq' ? `
                  <td>${item.quantity}</td>
                  <td>${(item as any).unit_of_measure || (item as any).unit || 'Item'}</td>
                  <td class="amount-cell">${formatCurrency(item.unit_price)}</td>
                  <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                  ` : `
                  <td>${item.unit_of_measure || 'pcs'}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="amount-cell">${formatCurrency(item.unit_price)}</td>
                  <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                  `}
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <!-- Totals Section (not for delivery notes) -->
        ${data.type !== 'delivery' ? `
        <div class="totals-section">
          <table class="totals-table">
            ${data.subtotal ? `
            <tr class="subtotal-row">
              <td class="label">Subtotal:</td>
              <td class="amount">${formatCurrency(data.subtotal)}</td>
            </tr>
            ` : ''}
            ${data.tax_amount && data.tax_amount > 0 ? `
            <tr>
              <td class="label">Tax Amount:</td>
              <td class="amount">${formatCurrency(data.tax_amount)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td class="label">${data.type === 'statement' ? 'TOTAL OUTSTANDING:' : 'TOTAL:'}</td>
              <td class="amount">${formatCurrency(data.total_amount)}</td>
            </tr>
            ${(data.type === 'invoice' || data.type === 'proforma') && data.paid_amount !== undefined ? `
            <tr class="payment-info">
              <td class="label">Paid Amount:</td>
              <td class="amount" style="color: hsl(var(--primary));">${formatCurrency(data.paid_amount || 0)}</td>
            </tr>
            <tr class="balance-info">
              <td class="label" style="font-weight: bold;">Balance Due:</td>
              <td class="amount" style="font-weight: bold; color: ${(data.balance_due || 0) > 0 ? '#DC2626' : 'hsl(var(--primary))'};">${formatCurrency(data.balance_due || 0)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        ` : ''}

        <!-- Signature Section (for delivery notes) -->
        ${data.type === 'delivery' ? `
        <div class="signature-section">
          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-label">Delivered By:</div>
              <div class="signature-line">${data.delivered_by || '_________________________'}</div>
              <div class="signature-date">Date: ${data.delivery_date ? new Date(data.delivery_date).toLocaleDateString() : '__________'}</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Received By:</div>
              <div class="signature-line">${data.received_by || '_________________________'}</div>
              <div class="signature-date">Date: __________</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Stamp Section (not for invoice/quotation as they have their own stamp area) -->
        ${(data.type !== 'invoice' && data.type !== 'quotation') ? `
        <div class="stamp-section" style="display:flex; justify-content:center; margin:30px 0 24px 0;">
          <img src="https://cdn.builder.io/api/v1/image/assets%2F9ff3999d5c9643b5b444cfaefad1cb5e%2F70894a4a73a347ac823210fd2ffd0871?format=webp&width=800" alt="Company Stamp" style="height:140px; width:auto; object-fit:contain;" />
        </div>
        ` : ''}

        <!-- Bank Details (only for invoices and quotations) -->
        ${(data.type === 'invoice' || data.type === 'quotation') ? `
        <div class="bank-details">
        </div>
        ` : ''}

        <!-- Footer (only for non-invoice/quotation types) -->
        ${(data.type !== 'invoice' && data.type !== 'quotation') ? `
        <div class="footer">
          <strong>Thank you for your business!</strong><br>
          <strong>${company.name}</strong><br>
          This document was generated on ${new Date().toLocaleString()}
          ${data.type === 'proforma' ? '<br><em>This is a proforma invoice and not a request for payment</em>' : ''}
          ${data.type === 'delivery' ? '<br><em>This delivery note confirms the items delivered</em>' : ''}
          ${data.type === 'receipt' ? '<br><em>This receipt serves as proof of payment received</em>' : ''}
          ${data.type === 'remittance' ? '<br><em>This remittance advice details payments made to your account</em>' : ''}
          ${data.type === 'lpo' ? '<br><em>This Local Purchase Order serves as an official request for goods/services</em>' : ''}
        </div>
        ` : ''}
      </div>

      <!-- Last Page for Invoices and Quotations -->
      ${(data.type === 'invoice' || data.type === 'quotation') ? `
      <div class="page" style="page-break-before: always; position: relative;">
        <div style="padding: 20mm;">

          <!-- Terms Section -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Terms;</h3>
            <ol style="font-size: 11px; line-height: 1.6; margin: 0; padding-left: 20px; color: #333;">
              <li style="margin-bottom: 6px;">The Payment terms for each stage are as follows; a. 50% Upon Order (${formatCurrency(data.total_amount * 0.5)}) b. 40% As Progressive (${formatCurrency(data.total_amount * 0.4)}) c. 10% Upon Completion (${formatCurrency(data.total_amount * 0.1)})</li>
              <li style="margin-bottom: 6px;">All work will be executed based on the drawings and samples approved by the client</li>
              <li style="margin-bottom: 6px;">Any Changes/alterations to the scope of work outlined will affect the final quantity will be measured, and charges will be applied on a pro-rata basis at the agreed rate</li>
              <li style="margin-bottom: 6px;">We are not responsible for any damages caused by negligence from other Sub Contractors Hired by the Client.</li>
              <li style="margin-bottom: 6px;">The quotation does not include statutory fees.</li>
              <li style="margin-bottom: 6px;">The work shall be completed within weeks from the day of Order.</li>
            </ol>
          </div>

          <!-- Acceptance of Quote Section -->
          <div style="margin-bottom: 25px; padding-top: 15px; border-top: 1px solid #ddd;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Acceptance of Quote;</h3>
            <p style="font-size: 11px; margin: 0; color: #333;">The above prices specifications and terms are satisfactory.</p>
          </div>

          <!-- Contractor and Client Section -->
          <div style="display: flex; gap: 40px; margin-bottom: 25px; margin-top: 30px;">
            <!-- Contractor Section -->
            <div style="flex: 1;">
              <div style="font-size: 11px; line-height: 1.8; color: #333;">
                <div><strong>Contractor;</strong> ${company.name}</div>
                <div><strong>Tel No;</strong> 254720717463</div>
                <div><strong>Signed;</strong> KELVIN MURIITHI</div>
              </div>
            </div>

            <!-- Stamp Area -->
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px;">
              <img src="https://cdn.builder.io/api/v1/image/assets%2F9ff3999d5c9643b5b444cfaefad1cb5e%2F70894a4a73a347ac823210fd2ffd0871?format=webp&width=800" alt="Company Stamp" style="height:140px; width:auto; object-fit:contain;" />
            </div>
          </div>

          <!-- Client Section -->
          <div style="margin-bottom: 25px; padding-top: 15px; border-top: 1px solid #ddd;">
            <div style="font-size: 11px; line-height: 1.8; color: #333;">
              <div><strong>Client;</strong> ________________________</div>
              <div><strong>Tel No;</strong> ________________________</div>
            </div>
          </div>

          <!-- Prepaired By Section -->
          <div style="margin-bottom: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
            <div style="font-size: 11px; color: #333;"><strong>PREPAIRED BY;</strong> ${company.name}</div>
          </div>

          <!-- Account Details Section -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd;">
            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">Account Details;</h3>
            <table style="font-size: 10px; width: 100%; line-height: 1.8; color: #333;">
              <tr>
                <td style="width: 30%;"><strong>BANK;</strong></td>
                <td style="width: 70%;">CO-OPERATIVE BANK OF KENYA</td>
              </tr>
              <tr>
                <td><strong>ACCOUNT NAME;</strong></td>
                <td>LAYONS CONSTRUCTION LIMITED</td>
              </tr>
              <tr>
                <td><strong>ACCOUNT NUMBER;</strong></td>
                <td>01192659527000</td>
              </tr>
              <tr>
                <td><strong>BRANCH;</strong></td>
                <td>JUJA</td>
              </tr>
              <tr>
                <td><strong>SWIFT CODE;</strong></td>
                <td>KCOOKENA</td>
              </tr>
              <tr>
                <td><strong>BANK CODE;</strong></td>
                <td>11000</td>
              </tr>
              <tr>
                <td><strong>BRANCH CODE;</strong></td>
                <td>11124</td>
              </tr>
              <tr>
                <td><strong>PAYBILL;</strong></td>
                <td>400200</td>
              </tr>
              <tr>
                <td><strong>ACCOUNT;</strong></td>
                <td>01192659527000</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
      ` : ''}
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (printWindow && !printWindow.closed) {
      printWindow.print();
    }
  }, 1000);

  return printWindow;
};

// Specific function for invoice PDF generation
export const downloadInvoicePDF = async (invoice: any, documentType: 'INVOICE' | 'PROFORMA' = 'INVOICE', company?: CompanyDetails) => {
  const items = invoice.invoice_items?.map((item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const taxAmount = Number(item.tax_amount || 0);
    const discountAmount = Number(item.discount_amount || 0);
    const computedLineTotal = quantity * unitPrice - discountAmount + taxAmount;

    return {
      description: item.description || item.product_name || item.products?.name || 'Unknown Item',
      quantity: quantity,
      unit_price: unitPrice,
      discount_percentage: Number(item.discount_percentage || 0),
      discount_before_vat: Number(item.discount_before_vat || 0),
      discount_amount: discountAmount,
      tax_percentage: Number(item.tax_percentage || 0),
      tax_amount: taxAmount,
      tax_inclusive: item.tax_inclusive || false,
      line_total: Number(item.line_total ?? computedLineTotal),
      unit_of_measure: item.unit_of_measure || item.products?.unit_of_measure || 'pcs',
      section_name: item.section_name,
      section_labor_cost: Number(item.section_labor_cost || 0),
    };
  }) || [];

  // Check if items have sections
  const hasSections = items.some((item: any) => item.section_name);

  let documentData: DocumentData;

  if (hasSections) {
    // Group items by section
    const sectionMap = new Map<string, any[]>();
    items.forEach((item: any) => {
      const sectionName = item.section_name || 'Untitled Section';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push(item);
    });

    // Create sections array with labor costs
    const sections = Array.from(sectionMap.entries()).map(([sectionName, sectionItems]) => {
      const laborCost = sectionItems.length > 0 ? sectionItems[0].section_labor_cost : 0;
      return {
        name: sectionName,
        items: sectionItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percentage: item.tax_percentage,
          tax_amount: item.tax_amount,
          line_total: item.line_total,
          unit_of_measure: item.unit_of_measure,
          products: item.products,
        })),
        labor_cost: laborCost,
      };
    });

    documentData = {
      type: documentType === 'PROFORMA' ? 'proforma' : 'invoice',
      number: invoice.invoice_number,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      lpo_number: invoice.lpo_number,
      company: company,
      customer: {
        name: invoice.customers?.name || 'Unknown Customer',
        email: invoice.customers?.email,
        phone: invoice.customers?.phone,
        address: invoice.customers?.address,
        city: invoice.customers?.city,
        country: invoice.customers?.country,
      },
      items: items,
      sections: sections,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      paid_amount: invoice.paid_amount || 0,
      balance_due: invoice.balance_due || (invoice.total_amount - (invoice.paid_amount || 0)),
      notes: invoice.notes,
      terms_and_conditions: invoice.terms_and_conditions,
    };
  } else {
    documentData = {
      type: documentType === 'PROFORMA' ? 'proforma' : 'invoice',
      number: invoice.invoice_number,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      lpo_number: invoice.lpo_number,
      company: company,
      customer: {
        name: invoice.customers?.name || 'Unknown Customer',
        email: invoice.customers?.email,
        phone: invoice.customers?.phone,
        address: invoice.customers?.address,
        city: invoice.customers?.city,
        country: invoice.customers?.country,
      },
      items: items,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      paid_amount: invoice.paid_amount || 0,
      balance_due: invoice.balance_due || (invoice.total_amount - (invoice.paid_amount || 0)),
      notes: invoice.notes,
      terms_and_conditions: invoice.terms_and_conditions,
    };
  }

  return generatePDF(documentData);
};

// Function for quotation PDF generation
export const downloadQuotationPDF = async (quotation: any, company?: CompanyDetails) => {
  const items = quotation.quotation_items?.map((item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const taxAmount = Number(item.tax_amount || 0);
    const discountAmount = Number(item.discount_amount || 0);
    const computedLineTotal = quantity * unitPrice - discountAmount + taxAmount;

    return {
      description: item.description || item.product_name || item.products?.name || 'Unknown Item',
      quantity: quantity,
      unit_price: unitPrice,
      discount_percentage: Number(item.discount_percentage || 0),
      discount_amount: discountAmount,
      tax_percentage: Number(item.tax_percentage || 0),
      tax_amount: taxAmount,
      tax_inclusive: item.tax_inclusive || false,
      line_total: Number(item.line_total ?? computedLineTotal),
      unit_of_measure: item.unit_of_measure || item.products?.unit_of_measure || 'pcs',
      section_name: item.section_name,
      section_labor_cost: Number(item.section_labor_cost || 0),
    };
  }) || [];

  // Check if items have sections
  const hasSections = items.some((item: any) => item.section_name);

  let documentData: DocumentData;

  if (hasSections) {
    // Group items by section
    const sectionMap = new Map<string, any[]>();
    items.forEach((item: any) => {
      const sectionName = item.section_name || 'Untitled Section';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push(item);
    });

    // Create sections array with labor costs
    const sections = Array.from(sectionMap.entries()).map(([sectionName, sectionItems]) => {
      const laborCost = sectionItems.length > 0 ? sectionItems[0].section_labor_cost : 0;
      return {
        name: sectionName,
        items: sectionItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percentage: item.tax_percentage,
          tax_amount: item.tax_amount,
          line_total: item.line_total,
          unit_of_measure: item.unit_of_measure,
          products: item.products,
        })),
        labor_cost: laborCost,
      };
    });

    documentData = {
      type: 'quotation',
      number: quotation.quotation_number,
      date: quotation.quotation_date,
      valid_until: quotation.valid_until,
      company: company,
      customer: {
        name: quotation.customers?.name || 'Unknown Customer',
        email: quotation.customers?.email,
        phone: quotation.customers?.phone,
        address: quotation.customers?.address,
        city: quotation.customers?.city,
        country: quotation.customers?.country,
      },
      items: items,
      sections: sections,
      subtotal: quotation.subtotal,
      tax_amount: quotation.tax_amount,
      total_amount: quotation.total_amount,
      notes: quotation.notes,
      terms_and_conditions: quotation.terms_and_conditions,
    };
  } else {
    documentData = {
      type: 'quotation',
      number: quotation.quotation_number,
      date: quotation.quotation_date,
      valid_until: quotation.valid_until,
      company: company,
      customer: {
        name: quotation.customers?.name || 'Unknown Customer',
        email: quotation.customers?.email,
        phone: quotation.customers?.phone,
        address: quotation.customers?.address,
        city: quotation.customers?.city,
        country: quotation.customers?.country,
      },
      items: items,
      subtotal: quotation.subtotal,
      tax_amount: quotation.tax_amount,
      total_amount: quotation.total_amount,
      notes: quotation.notes,
      terms_and_conditions: quotation.terms_and_conditions,
    };
  }

  return generatePDF(documentData);
};

// Function for generating customer statement PDF
export const generateCustomerStatementPDF = async (customer: any, invoices: any[], payments: any[], statementData?: any, company?: CompanyDetails) => {
  const today = new Date();
  const statementDate = statementData?.statement_date || today.toISOString().split('T')[0];

  // Calculate outstanding amounts
  const totalOutstanding = invoices.reduce((sum, inv) =>
    sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0
  );

  // Calculate aging buckets
  const current = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue <= 0 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const days30 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0 && daysOverdue <= 30 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const days60 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 30 && daysOverdue <= 60 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const days90 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 60 && daysOverdue <= 90 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const over90 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 90 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  // Create all transactions (invoices and payments) with running balance
  const allTransactions = [
    // Add all invoices as debits
    ...invoices.map(inv => ({
      date: inv.invoice_date,
      type: 'invoice',
      reference: inv.invoice_number,
      description: `Invoice ${inv.invoice_number}`,
      debit: inv.total_amount || 0,
      credit: 0,
      due_date: inv.due_date
    })),
    // Add all payments as credits
    ...payments.map(pay => ({
      date: pay.payment_date,
      type: 'payment',
      reference: pay.payment_number || pay.id || 'PMT',
      description: `Payment - ${pay.method || 'Cash'}`,
      debit: 0,
      credit: pay.amount || 0,
      due_date: null
    }))
  ];

  // Sort by date
  allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  const statementItems = allTransactions.map((transaction, index) => {
    runningBalance += transaction.debit - transaction.credit;

    return {
      description: transaction.description,
      quantity: 1,
      unit_price: Number(transaction.debit || transaction.credit || 0),
      tax_percentage: 0,
      tax_amount: 0,
      tax_inclusive: false,
      line_total: Number(runningBalance),
      balance: Number(runningBalance),
      transaction_date: transaction.date,
      transaction_type: transaction.type,
      reference: transaction.reference,
      debit: Number(transaction.debit || 0),
      credit: Number(transaction.credit || 0),
      due_date: transaction.due_date,
      days_overdue: transaction.due_date ? Math.max(0, Math.floor((today.getTime() - new Date(transaction.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0
    };
  });

  // Calculate final balance from last transaction
  const finalBalance = statementItems.length > 0 ? statementItems[statementItems.length - 1].line_total : 0;

  const documentData: DocumentData = {
    type: 'statement', // Use statement type for proper formatting
    number: `STMT-${customer.customer_code || customer.id}-${statementDate}`,
    date: statementDate,
    company: company, // Pass company details
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
    },
    items: statementItems,
    subtotal: finalBalance,
    tax_amount: 0,
    total_amount: finalBalance,
    notes: `Statement of Account as of ${new Date(statementDate).toLocaleDateString()}\n\nThis statement shows all transactions including invoices (debits) and payments (credits) with running balance.\n\nAging Summary for Outstanding Invoices:\nCurrent: $${current.toFixed(2)}\n1-30 Days: $${days30.toFixed(2)}\n31-60 Days: $${days60.toFixed(2)}\n61-90 Days: $${days90.toFixed(2)}\nOver 90 Days: $${over90.toFixed(2)}`,
    terms_and_conditions: 'Please remit payment for any outstanding amounts. Contact us if you have any questions about this statement.',
  };

  return generatePDF(documentData);
};

// Function for generating payment receipt PDF
export const generatePaymentReceiptPDF = async (payment: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'receipt', // Use receipt type for payment receipts
    number: payment.number || payment.payment_number || `REC-${Date.now()}`,
    date: payment.date || payment.payment_date || new Date().toISOString().split('T')[0],
    company: company, // Pass company details
    customer: {
      name: payment.customer || payment.customers?.name || 'Unknown Customer',
      email: payment.customers?.email,
      phone: payment.customers?.phone,
    },
    total_amount: typeof payment.amount === 'string' ?
      parseFloat(payment.amount.replace('$', '').replace(',', '')) :
      payment.amount,
    notes: `Payment received via ${payment.payment_method?.replace('_', ' ') || payment.method?.replace('_', ' ') || 'Unknown method'}\n\nReference: ${payment.reference_number || 'N/A'}\nInvoice: ${payment.payment_allocations?.[0]?.invoice_number || 'N/A'}`,
    terms_and_conditions: 'Thank you for your payment. This receipt confirms that payment has been received and processed.',
  };

  return generatePDF(documentData);
};

// Function for generating remittance advice PDF
export const downloadRemittancePDF = async (remittance: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'remittance',
    number: remittance.adviceNumber || remittance.advice_number || `REM-${Date.now()}`,
    date: remittance.adviceDate || remittance.advice_date || new Date().toISOString().split('T')[0],
    company: company, // Pass company details
    customer: {
      name: remittance.customerName || remittance.customers?.name || 'Unknown Customer',
      email: remittance.customers?.email,
      phone: remittance.customers?.phone,
      address: remittance.customers?.address,
      city: remittance.customers?.city,
      country: remittance.customers?.country,
    },
    items: (remittance.remittance_advice_items || remittance.items || []).map((item: any) => ({
      description: item.document_number
        ? `${item.document_type === 'invoice' ? 'Invoice' : item.document_type === 'credit_note' ? 'Credit Note' : 'Payment'}: ${item.document_number}`
        : item.description
        || `Payment for ${item.invoiceNumber || item.creditNote || 'Document'}`,
      quantity: 1,
      unit_price: item.payment_amount || item.payment || 0,
      tax_percentage: item.tax_percentage || 0,
      tax_amount: item.tax_amount || 0,
      tax_inclusive: item.tax_inclusive || false,
      line_total: item.payment_amount || item.payment || 0,
      // Additional details for remittance-specific display
      document_date: item.document_date || item.date,
      invoice_amount: item.invoice_amount || item.invoiceAmount,
      credit_amount: item.credit_amount || item.creditAmount,
    })),
    subtotal: remittance.totalPayment || remittance.total_payment || 0,
    tax_amount: 0,
    total_amount: remittance.totalPayment || remittance.total_payment || 0,
    notes: remittance.notes || 'Remittance advice for payments made',
    terms_and_conditions: 'This remittance advice details payments made to your account.',
  };

  return generatePDF(documentData);
};

// Function for delivery note PDF generation
export const downloadDeliveryNotePDF = async (deliveryNote: any, company?: CompanyDetails) => {
  // Get invoice information for reference
  const invoiceNumber = deliveryNote.invoice_number ||
                       deliveryNote.invoices?.invoice_number ||
                       (deliveryNote.invoice_id ? `INV-${deliveryNote.invoice_id.slice(-8)}` : 'N/A');

  const documentData: DocumentData = {
    type: 'delivery',
    number: deliveryNote.delivery_note_number || deliveryNote.delivery_number,
    date: deliveryNote.delivery_date,
    delivery_date: deliveryNote.delivery_date,
    delivery_address: deliveryNote.delivery_address,
    delivery_method: deliveryNote.delivery_method,
    carrier: deliveryNote.carrier,
    tracking_number: deliveryNote.tracking_number,
    delivered_by: deliveryNote.delivered_by,
    received_by: deliveryNote.received_by,
    // Add invoice reference for delivery notes
    lpo_number: `Related Invoice: ${invoiceNumber}`,
    company: company, // Pass company details
    customer: {
      name: deliveryNote.customers?.name || 'Unknown Customer',
      email: deliveryNote.customers?.email,
      phone: deliveryNote.customers?.phone,
      address: deliveryNote.customers?.address,
      city: deliveryNote.customers?.city,
      country: deliveryNote.customers?.country,
    },
    items: (deliveryNote.delivery_note_items || deliveryNote.delivery_items)?.map((item: any, index: number) => ({
      description: `${item.products?.name || item.product_name || item.description || 'Unknown Item'}${invoiceNumber !== 'N/A' ? ` (From Invoice: ${invoiceNumber})` : ''}`,
      quantity: item.quantity_delivered || item.quantity || 0,
      unit_price: 0, // Not relevant for delivery notes
      tax_percentage: 0,
      tax_amount: 0,
      tax_inclusive: false,
      line_total: 0,
      unit_of_measure: item.products?.unit_of_measure || item.unit_of_measure || 'pcs',
      // Add delivery-specific details
      quantity_ordered: item.quantity_ordered || item.quantity || 0,
      quantity_delivered: item.quantity_delivered || item.quantity || 0,
    })) || [],
    total_amount: 0, // Not relevant for delivery notes
    notes: deliveryNote.notes || `Items delivered as per Invoice ${invoiceNumber}`,
  };

  return generatePDF(documentData);
};

// Function for LPO PDF generation
export const downloadLPOPDF = async (lpo: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'lpo', // Use LPO document type
    number: lpo.lpo_number,
    date: lpo.lpo_date,
    due_date: lpo.delivery_date,
    delivery_date: lpo.delivery_date,
    delivery_address: lpo.delivery_address,
    company: company, // Pass company details
    customer: {
      name: lpo.suppliers?.name || 'Unknown Supplier',
      email: lpo.suppliers?.email,
      phone: lpo.suppliers?.phone,
      address: lpo.suppliers?.address,
      city: lpo.suppliers?.city,
      country: lpo.suppliers?.country,
    },
    items: lpo.lpo_items?.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const taxAmount = Number(item.tax_amount || 0);
      const computedLineTotal = quantity * unitPrice + taxAmount;

      return {
        description: item.description || item.products?.name || 'Unknown Item',
        quantity: quantity,
        unit_price: unitPrice,
        discount_percentage: 0,
        discount_amount: 0,
        tax_percentage: Number(item.tax_rate || 0),
        tax_amount: taxAmount,
        tax_inclusive: false,
        line_total: Number(item.line_total ?? computedLineTotal),
        unit_of_measure: item.products?.unit_of_measure || 'pcs',
      };
    }) || [],
    subtotal: lpo.subtotal,
    tax_amount: lpo.tax_amount,
    total_amount: lpo.total_amount,
    notes: `${lpo.notes || ''}${lpo.contact_person ? `\n\nContact Person: ${lpo.contact_person}` : ''}${lpo.contact_phone ? `\nContact Phone: ${lpo.contact_phone}` : ''}`.trim(),
    terms_and_conditions: lpo.terms_and_conditions,
  };

  return generatePDF(documentData);
};
