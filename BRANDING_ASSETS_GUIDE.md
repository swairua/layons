# Layons Construction Limited - Branding Assets Guide

## Overview
All branding assets have been updated to use the Layons Construction Limited logo. The lovable icon references have been removed and replaced with the company logo across all platforms.

## Current Logo Source
**Asset ID:** `e2eb9e788fdb405b8eda593a40e178b5/23073e29015745f6bebad21080caefe4`

**URL:** `https://cdn.builder.io/api/v1/image/assets%2Fe2eb9e788fdb405b8eda593a40e178b5%2F23073e29015745f6bebad21080caefe4`

---

## Updated Assets

### 1. **Favicon** ✅
- **Location:** `index.html` (`<link id="favicon">`)
- **Size:** 256x256px (optimized for browsers)
- **Format:** WebP
- **URL Parameters:** `?format=webp&width=256`
- **Purpose:** Browser tab icon, bookmarks, address bar
- **Fallback:** `/favicon.ico`

### 2. **Apple Touch Icon** ✅
- **Location:** `index.html` (`<link rel="apple-touch-icon">`)
- **Size:** 180x180px (Apple standard)
- **Format:** WebP
- **URL Parameters:** `?format=webp&width=180`
- **Purpose:** iOS/macOS home screen shortcuts, Safari bookmarks

### 3. **Open Graph Image (OG)** ✅
- **Location:** `index.html` (`<meta property="og:image">`)
- **Size:** 1200x630px (standard OG size)
- **Format:** WebP
- **URL Parameters:** `?format=webp&width=1200&height=630`
- **Dimensions in Meta:** width=1200, height=630
- **Purpose:** Social media sharing (Facebook, LinkedIn, Discord, etc.)
- **Updated in:** `src/utils/updateMetaTags.ts`

### 4. **Twitter Card Image** ✅
- **Location:** `index.html` (`<meta name="twitter:image">`)
- **Size:** 1200x630px
- **Format:** WebP
- **URL Parameters:** `?format=webp&width=1200&height=630`
- **Card Type:** `summary_large_image`
- **Purpose:** Twitter/X sharing preview

### 5. **Pinterest Pin Image** ✅
- **Location:** `index.html` (`<meta property="pinterest:media">`)
- **Size:** 1000x1500px (portrait, Pinterest optimized)
- **Format:** WebP
- **URL Parameters:** `?format=webp&width=1000&height=1500`
- **Purpose:** Pinterest sharing, saving, and discoverability

---

## Files Updated

### 1. **index.html**
```html
<!-- All OG, Twitter, Pinterest, and favicon tags updated -->
- Removed old lovable asset references
- Updated all image URLs to use Layons logo
- Added Pinterest media tag
- Added Apple touch icon
- Added og:url property
- Enhanced Twitter card metadata
```

### 2. **src/utils/setFavicon.ts**
```typescript
// Updated default favicon fallback
- Changed from: f42eafb1b7184ff9bc71811d79efa0f8/b4608012e7fa4083a708e27b18ed304e
+ Changed to: e2eb9e788fdb405b8eda593a40e178b5/23073e29015745f6bebad21080caefe4
- Size: 256x256 (optimized for favicon)
```

### 3. **src/utils/updateMetaTags.ts**
```typescript
// Updated default OG image fallback
- Changed from: f42eafb1b7184ff9bc71811d79efa0f8/b4608012e7fa4083a708e27b18ed304e
+ Changed to: e2eb9e788fdb405b8eda593a40e178b5/23073e29015745f6bebad21080caefe4
- Size: 1200x1200 (optimized for OG sharing)
```

---

## Social Media Image Specifications

### Platform Requirements Reference

| Platform | Recommended Size | Aspect Ratio | Format | Notes |
|----------|-----------------|--------------|--------|-------|
| **Facebook OG** | 1200x630 | 1.91:1 | JPG, PNG | Current size ✅ |
| **Twitter** | 1200x675 | 16:9 | JPG, PNG | Uses OG size ✅ |
| **LinkedIn** | 1200x627 | 1.91:1 | JPG, PNG | Uses OG size ✅ |
| **Pinterest** | 1000x1500 | 2:3 | JPG, PNG | Implemented ✅ |
| **Discord** | 1200x630 | 1.91:1 | PNG | Uses OG size ✅ |
| **Favicon** | 256x256 | 1:1 | ICO, PNG | Implemented ✅ |
| **Apple Touch Icon** | 180x180 | 1:1 | PNG | Implemented ✅ |

---

## How to Create Optimized Versions

If you need high-resolution or format-specific versions of the logo:

### Option 1: Using Builder CDN (Current Method)
The CDN automatically generates optimized versions. Adjust URL parameters:

```
Base URL: https://cdn.builder.io/api/v1/image/assets%2Fe2eb9e788fdb405b8eda593a40e178b5%2F23073e29015745f6bebad21080caefe4

Parameters:
- ?format=webp&width=256 (WebP, 256px)
- ?format=webp&width=512 (WebP, 512px)
- ?format=png&width=1200 (PNG, 1200px)
- ?format=jpg&width=1200&quality=90 (JPEG, 1200px)
```

### Option 2: Create Custom Versions
To create custom-designed social media templates:

1. **Use Figma/Adobe XD** to design branded templates
2. **Export dimensions:**
   - Favicon: 256x256px (square)
   - OG/Twitter: 1200x630px (landscape)
   - Pinterest: 1000x1500px (portrait)
   - Instagram Square: 1080x1080px
   - Instagram Story: 1080x1920px (portrait)

3. **Save in:**
   - `public/assets/` for static assets
   - CDN for dynamic serving

### Option 3: Generate Using Tools
- **Favicon Generator:** favicon-generator.org
- **Social Media Graphics:** Canva, Adobe Express
- **Icon Creator:** Icon8, Flaticon

---

## Dynamic Meta Tags

The application dynamically updates meta tags when:
1. **User navigates to different pages** - `updateMetaTags()` is called from `App.tsx`
2. **Company/profile changes** - Favicon and OG image update based on `currentCompany?.logo_url`
3. **Page title/description changes** - Meta tags reflect current page context

### Relevant Code:
```typescript
// src/App.tsx
useEffect(() => {
  setFavicon(currentCompany?.logo_url);
}, [currentCompany?.logo_url]);

useEffect(() => {
  updateMetaTags(currentCompany);
}, [currentCompany]);
```

---

## Testing Social Media Sharing

### Verify Your Updates:
1. **Facebook:** facebook.com/sharer/dialog (share your URL)
2. **Twitter:** twitter.com/intent/tweet (preview card)
3. **LinkedIn:** linkedin.com/sharing/share-offsite (preview)
4. **Discord:** Send URL in channel (preview embed)

### Debug Tools:
- Facebook: developers.facebook.com/tools/debug/
- Twitter: cards-dev.twitter.com/validator
- LinkedIn: linkedin.com/feed/
- Open Graph: opengraphcheck.com

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge | Mobile |
|---------|--------|---------|--------|------|--------|
| WebP Favicon | ✅ | ✅ | ✅ | ✅ | ✅ |
| OG Meta Tags | ✅ | ✅ | ✅ | ✅ | ✅ |
| Apple Touch Icon | ✅ | ✅ | ✅ | ✅ | ✅ iOS |
| Twitter Card | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Next Steps

### Recommended Actions:
1. **Test favicon display** - Check browser tab and bookmarks
2. **Verify social sharing** - Share URL to Twitter, LinkedIn, Facebook
3. **Check Apple devices** - Test home screen shortcut (iOS/macOS)
4. **Monitor analytics** - Track which platforms drive the most traffic
5. **Create variations** - Design platform-specific graphics if needed

### Optional Enhancements:
- [ ] Create Instagram Square (1080x1080px)
- [ ] Create Instagram Story (1080x1920px)
- [ ] Design LinkedIn specific image
- [ ] Create animated favicon (GIF)
- [ ] Add structured data (JSON-LD)
- [ ] Implement Schema.org markup

---

## Asset Checklist

- [x] Favicon Updated
- [x] Apple Touch Icon Updated
- [x] OG Image Updated
- [x] Twitter Card Updated
- [x] Pinterest Image Added
- [x] Meta Tags Updated
- [x] Dynamic favicon utility updated
- [x] Meta tag update utility updated
- [x] Removed lovable icon references
- [x] All URLs point to Layons logo

---

## Questions & Support

For issues with:
- **Favicon not showing:** Clear browser cache (Ctrl+Shift+Delete)
- **Social sharing showing wrong image:** Use platform debug tools to refresh cache
- **WebP not supported:** Fallback to favicon.ico (already configured)
- **Image quality:** Adjust width parameter in URL or upload higher resolution source

---

**Last Updated:** 2024
**Branding:** Layons Construction Limited - Professional Business Suite
