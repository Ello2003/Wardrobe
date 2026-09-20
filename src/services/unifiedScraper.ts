/**
 * Unified Web Scraping Service - Single Source of Truth
 * 
 * Provides resilient, high-fidelity garment and e-commerce scraping across the entire application.
 * - Primary Engine: Firecrawl (bypasses bot protections, handles client-side SPA rendering, executes JS, extracts clean LLM markdown & metadata)
 * - Fallback Engine: Enhanced Stealth HTTP fetch (emulates modern browser, parses OpenGraph, Twitter cards, JSON-LD, Microdata & high-res images)
 */

export interface ScrapedPageResult {
  url: string;
  engineUsed: 'firecrawl' | 'stealth-fallback';
  success: boolean;
  statusCode?: number;
  title?: string;
  description?: string;
  siteName?: string;
  brand?: string;
  price?: string | number;
  rrp?: string | number;
  currency?: string;
  color?: string;
  originalListingColor?: string;
  material?: string;
  markdown?: string;
  cleanSnippet?: string;
  candidateImages: string[];
  mainImage?: string;
  jsonLd?: any[];
  rawHtmlSnippet?: string;
  error?: string;
  debugNote?: string;
}

export interface ScraperEngineStatus {
  firecrawlConfigured: boolean;
  activeEngine: 'firecrawl' | 'stealth-fallback';
  message: string;
}

// Helper: Clean and normalize image URLs against the page origin
export function cleanImageUrl(imgUrl: string | undefined | null, baseUrl: string): string {
  if (!imgUrl || typeof imgUrl !== 'string') return '';
  let cleaned = imgUrl.trim();
  if (!cleaned) return '';

  // Filter out data icons, tiny spacers, or svgs that aren't product images
  if (
    cleaned.startsWith('data:image/svg') ||
    cleaned.includes('spacer.gif') ||
    cleaned.includes('1x1') ||
    cleaned.includes('pixel.gif') ||
    cleaned.includes('tracking') ||
    cleaned.includes('/favicon')
  ) {
    return '';
  }

  // Handle protocol-relative URLs
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned;
  } else if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    try {
      const base = new URL(baseUrl);
      cleaned = new URL(cleaned, base.origin).toString();
    } catch {
      return '';
    }
  }

  return cleaned;
}

// Helper: Infer brand or retailer name from hostname
export function inferBrandFromUrl(urlStr: string): string {
  try {
    const hostname = new URL(urlStr).hostname.replace('www.', '').toLowerCase();
    const parts = hostname.split('.');
    const mainDomain = parts.length > 1 ? parts[parts.length - 2] : parts[0];

    const brandMap: Record<string, string> = {
      barbour: 'Barbour',
      zara: 'Zara',
      cos: 'COS',
      arket: 'Arket',
      drakes: "Drake's",
      suitsupply: 'Suitsupply',
      reiss: 'Reiss',
      sezane: 'Sézane',
      toteme: 'Toteme',
      massimodutti: 'Massimo Dutti',
      mango: 'Mango',
      vinted: 'Vinted',
      ebay: 'eBay',
      ssense: 'SSENSE',
      mrporter: 'Mr Porter',
      netaporter: 'Net-A-Porter',
      farfetch: 'Farfetch',
      grailed: 'Grailed',
      depop: 'Depop',
      endclothing: 'END.',
      matchesfashion: 'Matches Fashion',
      uniqlo: 'Uniqlo',
      toast: 'TOAST',
      ralphlauren: 'Ralph Lauren',
      brooksbrothers: 'Brooks Brothers',
      cultizm: 'Cultizm',
      permanentstyle: 'Permanent Style',
      therake: 'The Rake',
    };

    if (brandMap[mainDomain]) return brandMap[mainDomain];
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch {
    return 'Online Retailer';
  }
}

// Extract image links embedded in Firecrawl markdown format: ![alt](url)
export function extractImagesFromMarkdown(markdown: string, baseUrl: string): string[] {
  const images: string[] = [];
  if (!markdown) return images;

  const mdImgRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/gi;
  let match;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const cleaned = cleanImageUrl(match[1], baseUrl);
    if (cleaned && !images.includes(cleaned)) {
      images.push(cleaned);
    }
  }

  // Also match standard markdown links to image files: [text](https://...jpg|png|webp)
  const linkImgRegex = /\[.*?\]\((https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s\)]*)?)\)/gi;
  while ((match = linkImgRegex.exec(markdown)) !== null) {
    const cleaned = cleanImageUrl(match[1], baseUrl);
    if (cleaned && !images.includes(cleaned)) {
      images.push(cleaned);
    }
  }

  return images;
}

// Parse JSON-LD blocks from HTML
export function extractJsonLdFromHtml(html: string): any[] {
  const results: any[] = [];
  if (!html) return results;

  const jsonLdMatches = html.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!jsonLdMatches) return results;

  for (const match of jsonLdMatches) {
    try {
      const rawJson = match
        .replace(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>/i, '')
        .replace(/<\/script>/i, '')
        .trim();
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        results.push(...parsed['@graph']);
      } else {
        results.push(parsed);
      }
    } catch {
      // ignore JSON parse errors from invalid site markup
    }
  }

  return results;
}

/**
 * Primary Engine: Scrape URL via Firecrawl v1 API
 */
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<ScrapedPageResult> {
  const candidateImages: string[] = [];
  let title = '';
  let description = '';
  let siteName = '';
  let brand = '';
  let price: string | number | undefined;
  let rrp: string | number | undefined;
  let currency = 'GBP';
  let color = '';
  let material = '';
  let markdown = '';
  let html = '';
  let statusCode = 200;

  // Try official Firecrawl API v1
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 2000,
    }),
    signal: AbortSignal.timeout(18000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Firecrawl API responded with ${response.status}: ${errBody || response.statusText}`);
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Firecrawl did not return data for this page.');
  }

  const data = json.data;
  markdown = data.markdown || '';
  html = data.html || '';

  const meta = data.metadata || {};
  statusCode = meta.statusCode || meta.pageStatusCode || 200;
  title = meta.title || meta.ogTitle || meta['twitter:title'] || '';
  description = meta.description || meta.ogDescription || meta['twitter:description'] || '';
  siteName = meta.ogSiteName || meta.siteName || meta['og:site_name'] || inferBrandFromUrl(url);

  // Extract images from markdown
  const mdImages = extractImagesFromMarkdown(markdown, url);
  for (const img of mdImages) {
    if (!candidateImages.includes(img)) candidateImages.push(img);
  }

  // Extract og:image from metadata
  const ogImg = cleanImageUrl(meta.ogImage || meta['og:image'] || meta['twitter:image'], url);
  if (ogImg && !candidateImages.includes(ogImg)) {
    candidateImages.unshift(ogImg);
  }

  // Parse JSON-LD from rendered HTML
  const jsonLdBlocks = extractJsonLdFromHtml(html);
  for (const p of jsonLdBlocks) {
    if (p['@type'] === 'Product' || p['@type']?.includes?.('Product') || p.offers || p.image || p.name) {
      if (p.name && !title) title = p.name;
      if (p.description && !description) description = p.description;
      if (p.brand) {
        brand = typeof p.brand === 'string' ? p.brand : p.brand.name || brand;
      }
      if (p.color) color = p.color;
      if (p.material) material = p.material;

      if (p.image) {
        const rawImgs = Array.isArray(p.image) ? p.image : [p.image];
        for (const rawImg of rawImgs) {
          const imgUrl = typeof rawImg === 'string' ? rawImg : rawImg?.url || rawImg?.contentUrl;
          const cleaned = cleanImageUrl(imgUrl, url);
          if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
        }
      }

      if (p.offers) {
        const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        if (offer?.price) price = offer.price;
        if (offer?.priceCurrency) currency = offer.priceCurrency;
        if (offer?.highPrice) rrp = offer.highPrice;
      }
    }
  }

  // Meta price / currency fallback
  if (!price && meta.ogPriceAmount) {
    price = meta.ogPriceAmount;
  }
  if (!brand) {
    brand = inferBrandFromUrl(url);
  }

  return {
    url,
    engineUsed: 'firecrawl',
    success: true,
    statusCode,
    title,
    description,
    siteName,
    brand,
    price,
    rrp: rrp || price,
    currency,
    color,
    originalListingColor: color,
    material,
    markdown,
    cleanSnippet: markdown.slice(0, 3500).replace(/\s+/g, ' ').trim(),
    candidateImages,
    mainImage: candidateImages[0] || '',
    jsonLd: jsonLdBlocks,
    rawHtmlSnippet: html.slice(0, 1500),
  };
}

/**
 * Fallback Engine: Enhanced Stealth HTTP fetch with comprehensive metadata extraction
 */
async function scrapeWithStealthFetch(url: string): Promise<ScrapedPageResult> {
  const candidateImages: string[] = [];
  let title = '';
  let description = '';
  let siteName = '';
  let brand = '';
  let price: string | number | undefined;
  let rrp: string | number | undefined;
  let currency = 'GBP';
  let color = '';
  let material = '';
  let pageHtml = '';
  let statusCode = 200;

  try {
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    statusCode = fetchResponse.status;
    if (fetchResponse.ok) {
      pageHtml = await fetchResponse.text();

      // 1. OpenGraph & Twitter tags
      const ogTitleMatch =
        pageHtml.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["'](.*?)["']/i) ||
        pageHtml.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:title|twitter:title)["']/i);
      const titleTagMatch = pageHtml.match(/<title[^>]*>(.*?)<\/title>/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
      else if (titleTagMatch) title = titleTagMatch[1];

      const ogDescMatch =
        pageHtml.match(/<meta\s+(?:property|name)=["'](?:og:description|twitter:description|description)["']\s+content=["'](.*?)["']/i) ||
        pageHtml.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:description|twitter:description|description)["']/i);
      if (ogDescMatch) description = ogDescMatch[1];

      const ogSiteMatch =
        pageHtml.match(/<meta\s+(?:property|name)=["'](?:og:site_name|twitter:site)["']\s+content=["'](.*?)["']/i) ||
        pageHtml.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:site_name|twitter:site)["']/i);
      if (ogSiteMatch) siteName = ogSiteMatch[1];

      const ogPriceMatch =
        pageHtml.match(/<meta\s+property=["'](?:og:price:amount|product:price:amount)["']\s+content=["'](.*?)["']/i) ||
        pageHtml.match(/<meta\s+content=["'](.*?)["']\s+property=["'](?:og:price:amount|product:price:amount)["']/i);
      if (ogPriceMatch) price = ogPriceMatch[1];

      // Extract candidate images
      const ogImageMatches = [
        ...pageHtml.matchAll(/<meta\s+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["']\s+content=["'](.*?)["']/gi),
        ...pageHtml.matchAll(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["']/gi),
      ];
      for (const m of ogImageMatches) {
        const cleaned = cleanImageUrl(m[1], url);
        if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
      }

      const linkImageMatch = pageHtml.match(/<link\s+rel=["'](?:image_src|preload)["'](?:\s+as=["']image["'])?\s+href=["'](.*?)["']/i);
      if (linkImageMatch) {
        const cleaned = cleanImageUrl(linkImageMatch[1], url);
        if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
      }

      // 2. JSON-LD parsing
      const jsonLdBlocks = extractJsonLdFromHtml(pageHtml);
      for (const p of jsonLdBlocks) {
        if (p['@type'] === 'Product' || p['@type']?.includes?.('Product') || p.offers || p.image || p.name) {
          if (p.name && !title) title = p.name;
          if (p.description && !description) description = p.description;
          if (p.brand) {
            brand = typeof p.brand === 'string' ? p.brand : p.brand.name || brand;
          }
          if (p.color) color = p.color;
          if (p.material) material = p.material;

          if (p.image) {
            const rawImgs = Array.isArray(p.image) ? p.image : [p.image];
            for (const rawImg of rawImgs) {
              const imgUrl = typeof rawImg === 'string' ? rawImg : rawImg?.url || rawImg?.contentUrl;
              const cleaned = cleanImageUrl(imgUrl, url);
              if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
            }
          }

          if (p.offers) {
            const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
            if (offer?.price) price = offer.price;
            if (offer?.priceCurrency) currency = offer.priceCurrency;
            if (offer?.highPrice) rrp = offer.highPrice;
          }
        }
      }

      // 3. Fallback product images from standard <img> tags
      if (candidateImages.length === 0) {
        const imgTagMatches = pageHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
        for (const imgMatch of imgTagMatches) {
          const src = imgMatch[1];
          if (
            src &&
            (src.includes('/products/') ||
              src.includes('product') ||
              src.includes('cdn.shopify.com') ||
              src.includes('media') ||
              src.includes('uploads') ||
              src.includes('images/')) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('svg')
          ) {
            const cleaned = cleanImageUrl(src, url);
            if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
          }
          if (candidateImages.length >= 6) break;
        }
      }

      // 4. Fallback price regex
      if (!price) {
        const gbpMatch = pageHtml.match(/£\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
        if (gbpMatch) {
          price = gbpMatch[1];
          currency = 'GBP';
        } else {
          const eurMatch = pageHtml.match(/€\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
          if (eurMatch) {
            price = (parseFloat(eurMatch[1]) * 0.85).toFixed(2);
            currency = 'EUR';
          } else {
            const usdMatch = pageHtml.match(/\$\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
            if (usdMatch) {
              price = (parseFloat(usdMatch[1]) * 0.79).toFixed(2);
              currency = 'USD';
            }
          }
        }
      }
    }
  } catch (fetchErr: any) {
    console.warn(`Stealth scraper note for ${url}:`, fetchErr?.message || fetchErr);
  }

  if (!siteName) siteName = inferBrandFromUrl(url);
  if (!brand) brand = inferBrandFromUrl(url);

  const cleanSnippet = (pageHtml || '')
    .slice(0, 3500)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    url,
    engineUsed: 'stealth-fallback',
    success: statusCode >= 200 && statusCode < 400,
    statusCode,
    title,
    description,
    siteName,
    brand,
    price,
    rrp: rrp || price,
    currency,
    color,
    originalListingColor: color,
    material,
    cleanSnippet,
    candidateImages,
    mainImage: candidateImages[0] || '',
    rawHtmlSnippet: pageHtml.slice(0, 1500),
  };
}

/**
 * Single Source of Truth Scraper Method:
 * Attempts Firecrawl first (if FIRECRAWL_API_KEY is configured), then seamlessly
 * falls back to enhanced stealth browser fetch if unavailable or on error.
 */
export async function scrapeUrlUnified(url: string): Promise<ScrapedPageResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return {
      url: '',
      engineUsed: 'stealth-fallback',
      success: false,
      error: 'Empty URL provided.',
      candidateImages: [],
    };
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (firecrawlKey && firecrawlKey.trim()) {
    try {
      const firecrawlResult = await scrapeWithFirecrawl(cleanUrl, firecrawlKey);
      if (firecrawlResult.success) {
        return firecrawlResult;
      }
    } catch (firecrawlErr: any) {
      console.warn(
        `Firecrawl failed for ${cleanUrl} (${firecrawlErr?.message || firecrawlErr}), seamlessly routing to stealth fallback.`
      );
    }
  }

  // Stealth fallback engine
  const fallbackResult = await scrapeWithStealthFetch(cleanUrl);
  return fallbackResult;
}

/**
 * Get current scraper engine configuration and status
 */
export function getScraperEngineStatus(): ScraperEngineStatus {
  const hasKey = !!(process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_API_KEY.trim());
  return {
    firecrawlConfigured: hasKey,
    activeEngine: hasKey ? 'firecrawl' : 'stealth-fallback',
    message: hasKey
      ? 'Firecrawl scraping engine active with headless JS rendering and anti-bot bypass.'
      : 'Built-in stealth browser engine active with OpenGraph, JSON-LD, and metadata extractors.',
  };
}
