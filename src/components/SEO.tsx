import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  canonical?: string;
}

const SEO = ({ 
  title, 
  description, 
  image, 
  type = 'website',
  canonical 
}: SEOProps) => {
  const location = useLocation();
  const siteUrl = 'https://layonsconstruction.com';
  const currentUrl = `${siteUrl}${location.pathname}`;
  
  const defaultTitle = 'Layons Construction Limited - Professional Business Suite';
  const defaultDescription = 'Professional Management System with Quotations, Invoices, Payments, Inventory, and Multi-Company Support';
  
  const seoTitle = title ? `${title} | Layons Construction` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoCanonical = canonical || currentUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={seoCanonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={seoCanonical} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
};

export default SEO;
