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
    // Fall back to Layons Construction Limited logo
    faviconElement.href = 'https://cdn.builder.io/api/v1/image/assets%2F7a328cb3421e406ca54186a5902e41b7%2F1f63456b33f04af1ba43104b637519aa?format=webp&width=256';
    faviconElement.type = 'image/png';
  }
}
