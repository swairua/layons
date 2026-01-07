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
    faviconElement.href = '/company-logo.svg';
    faviconElement.type = 'image/svg+xml';
  }
}
