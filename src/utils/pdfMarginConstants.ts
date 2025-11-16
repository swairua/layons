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
export const PDF_PAGE_CSS = `
  @page {
    size: A4;
    margin: ${PDF_PAGE_CONFIG.margin}mm;
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
