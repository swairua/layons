/**
 * Updates the favicon to use the company logo
 * Falls back to default favicon if no logo is provided
 */
export function setFavicon(logoUrl?: string | null) {
  const faviconElement = document.getElementById('favicon') as HTMLLinkElement;

  if (!faviconElement) {
    console.warn('Favicon element not found in the document');
    return;
  }

  if (logoUrl) {
    // If the logo is a data URL or external URL, use it directly
    if (logoUrl.startsWith('data:') || logoUrl.startsWith('http')) {
      faviconElement.href = logoUrl;
      faviconElement.type = logoUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
    } else {
      // Otherwise, prepend the base URL if needed
      faviconElement.href = logoUrl;
    }
  } else {
    // Fall back to default company logo
    faviconElement.href = 'https://cdn.builder.io/api/v1/image/assets%2Ff42eafb1b7184ff9bc71811d79efa0f8%2Fb4608012e7fa4083a708e27b18ed304e?format=webp&width=800';
    faviconElement.type = 'image/webp';
  }
}
