/**
 * Updates meta tags dynamically based on company details
 */
export function updateMetaTags(companyData?: {
  name?: string;
  company_services?: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
} | null) {
  const companyName = companyData?.name || 'Management System';
  const companyServices =
    companyData?.company_services ||
    'Professional Management System with Quotations, Invoices, Payments, Inventory, and Multi-Company Support';
  const logoUrl = companyData?.logo_url || '/favicon.ico';
  const companyLocation = [companyData?.address, companyData?.city, companyData?.country]
    .filter(Boolean)
    .join(', ');

  // Update title
  document.title = `${companyName} - Professional Business Suite`;

  // Update meta description
  const descriptionMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  if (descriptionMeta) {
    descriptionMeta.content = companyServices;
  }

  // Update og:title
  const ogTitleMeta = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
  if (ogTitleMeta) {
    ogTitleMeta.content = `${companyName} - Professional Business Suite`;
  }

  // Update og:description
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
  if (ogDescriptionMeta) {
    ogDescriptionMeta.content = companyServices;
  }

  // Update og:image
  const ogImageMeta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
  if (ogImageMeta) {
    ogImageMeta.content = logoUrl;
  }

  // Update twitter:image
  const twitterImageMeta = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement;
  if (twitterImageMeta) {
    twitterImageMeta.content = logoUrl;
  }

  // Update og:description with company location if available
  if (companyLocation) {
    const ogDescMeta = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
    if (ogDescMeta) {
      ogDescMeta.content = `${companyServices}${companyLocation ? ` • Located in ${companyLocation}` : ''}`;
    }
  }
}
