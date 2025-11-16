/**
 * PDF Margin Configuration Constants
 * Ensures uniform page margins across all PDF document types
 * (Quotations, Invoices, BOQs, Credit Notes, LPOs, Delivery Notes, etc.)
 */

// Standard A4 page dimensions in millimeters
export const PDF_PAGE_CONFIG = {
  // Page size
  size: 'A4',
  width: 210, // mm
  height: 297, // mm

  // Uniform margins (top, right, bottom, left)
  // 15mm provides professional spacing while maintaining content area
  margin: 15, // mm

  // Computed values for reference
  get contentWidth() {
    return this.width - (this.margin * 2);
  },
  get contentHeight() {
    return this.height - (this.margin * 2);
  },
};

// CSS @page rule string for injection into PDF HTML
// Enhanced with orphans/widows and page break settings to prevent text cutting
export const PDF_PAGE_CSS = `
  @page {
    size: A4;
    margin: ${PDF_PAGE_CONFIG.margin}mm;
    orphans: 3;
    widows: 3;
  }

  @page :first {
    margin-top: ${PDF_PAGE_CONFIG.margin}mm;
  }

  /* Page break rules to prevent content cutting */
  .page-section {
    page-break-before: always;
    page-break-inside: avoid;
    page-break-after: avoid;
    position: relative;
  }

  .page-section:first-of-type {
    page-break-before: avoid;
  }

  /* Ensure sections don't cut across pages */
  .section-title,
  .section-row,
  .preliminaries-section,
  .subsection,
  .totals-section,
  .footer,
  .stamp-section {
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  /* Ensure table rows stay together */
  tr {
    page-break-inside: avoid;
  }

  /* Prevent tables from breaking */
  table {
    page-break-inside: avoid;
  }

  thead {
    display: table-header-group;
  }

  tfoot {
    display: table-footer-group;
  }

  /* Add spacing before sections to prevent cutting */
  .section-title::before {
    content: '';
    display: block;
    height: 10mm;
  }

  /* Ensure proper spacing at page boundaries */
  body {
    margin: ${PDF_PAGE_CONFIG.margin}mm;
    padding: 0;
  }
`;

// Footer positioning based on margins
export const PDF_FOOTER_CONFIG = {
  bottom: PDF_PAGE_CONFIG.margin,
  left: PDF_PAGE_CONFIG.margin,
  right: PDF_PAGE_CONFIG.margin,
};

// Ensure consistency across all document types
export const validateMarginConfig = () => {
  if (PDF_PAGE_CONFIG.margin < 10 || PDF_PAGE_CONFIG.margin > 20) {
    console.warn(
      `PDF margin ${PDF_PAGE_CONFIG.margin}mm is outside recommended range (10-20mm). ` +
      'This may affect document formatting or printing.'
    );
  }
};
