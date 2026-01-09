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
    faviconElement.href = 'https://cdn.builder.io/api/v1/image/assets%2Fe2eb9e788fdb405b8eda593a40e178b5%2F23073e29015745f6bebad21080caefe4?format=webp&width=256';
    faviconElement.type = 'image/webp';
  }
}
