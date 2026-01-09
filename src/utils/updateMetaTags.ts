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
  const companyName = companyData?.name || 'Layons Construction Limited';
  const companyServices =
    companyData?.company_services ||
    'Professional Management System with Quotations, Invoices, Payments, Inventory, and Multi-Company Support';
  const logoUrl = companyData?.logo_url || 'https://cdn.builder.io/api/v1/image/assets%2Fe2eb9e788fdb405b8eda593a40e178b5%2F23073e29015745f6bebad21080caefe4?format=webp&width=1200';
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
