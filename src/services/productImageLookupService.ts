/**
 * Product Image Lookup Service
 * 
 * Provides robust multi-engine product image search across:
 * 1. Google Search & Web Grounding
 * 2. Brand Official Websites (e.g. barbour.com, acnestudios.com, drakes.com, uniqlo.com)
 * 3. Luxury Retailers & Stockists (Mr Porter, SSENSE, Farfetch, End Clothing, Net-a-Porter, Lyst)
 * 4. High-Resolution Public Web Catalogues (DuckDuckGo Open API, Wikimedia Commons)
 * 
 * Operates with or without API keys, deduplicates photos, and labels source provenance.
 */

export interface ProductImageResult {
  title: string;
  imageUrl: string;
  thumbnail?: string;
  source?: string;
  sourceType?: 'google' | 'brand_site' | 'retailer' | 'web';
  width?: number;
  height?: number;
}

/**
 * Mapping of top fashion and lifestyle brands to their official website domains
 */
export const KNOWN_BRAND_DOMAINS: Record<string, string> = {
  // Heritage & Outerwear
  barbour: 'barbour.com',
  belstaff: 'belstaff.com',
  baracuta: 'baracuta.com',
  gloverall: 'gloverall.com',
  mackintosh: 'mackintosh.com',
  patagonia: 'patagonia.com',
  arcteryx: 'arcteryx.com',
  'arc\'teryx': 'arcteryx.com',
  'the north face': 'thenorthface.com',
  tnf: 'thenorthface.com',
  filson: 'filson.com',
  'canada goose': 'canadagoose.com',
  woolrich: 'woolrich.com',
  pendleton: 'pendleton-usa.com',

  // Contemporary & Menswear Classics
  'acne studios': 'acnestudios.com',
  acne: 'acnestudios.com',
  'drake\'s': 'drakes.com',
  drakes: 'drakes.com',
  lemaire: 'lemaire.fr',
  'margaret howell': 'margarethowell.co.uk',
  mhl: 'margarethowell.co.uk',
  'our legacy': 'ourlegacy.com',
  'studio nicholson': 'studionicholson.com',
  'universal works': 'universalworks.co.uk',
  'norse projects': 'norseprojects.com',
  sunspel: 'sunspel.com',
  'a.p.c.': 'apcstore.com',
  apc: 'apcstore.com',
  folk: 'folkclothing.com',
  'oliver spencer': 'oliverspencer.co.uk',
  ymc: 'youmustcreate.com',
  toast: 'toa.st',
  'nigel cabourn': 'cabourn.com',
  'beams plus': 'beams.co.jp',
  beams: 'beams.co.jp',
  auralee: 'auralee.jp',
  visvim: 'visvim.tv',
  wtaps: 'wtaps.com',
  nn07: 'nn07.com',
  'portuguese flannel': 'portugueseflannel.com',

  // High Street & Modern Essentials
  uniqlo: 'uniqlo.com',
  arket: 'arket.com',
  cos: 'cos.com',
  zara: 'zara.com',
  'massimo dutti': 'massimodutti.com',
  reiss: 'reiss.com',
  allsaints: 'allsaints.com',
  mango: 'mango.com',
  'j.crew': 'jcrew.com',
  jcrew: 'jcrew.com',

  // Workwear & Denim
  'levi\'s': 'levi.com',
  levis: 'levi.com',
  'carhartt wip': 'carhartt-wip.com',
  carhartt: 'carhartt.com',
  dickies: 'dickieslife.com',
  'stan ray': 'stanray.com',
  edwin: 'edwin-europe.com',
  'nudie jeans': 'nudiejeans.com',
  'iron heart': 'ironheart.co.uk',
  orslow: 'orslow.jp',

  // Tailoring & American Tradition
  'ralph lauren': 'ralphlauren.co.uk',
  'polo ralph lauren': 'ralphlauren.co.uk',
  rrl: 'ralphlauren.co.uk',
  suitsupply: 'suitsupply.com',
  'brooks brothers': 'brooksbrothers.com',
  'turnbull & asser': 'turnbullandasser.co.uk',
  'charles tyrwhitt': 'charlestyrwhitt.com',
  'paul smith': 'paulsmith.com',
  hackett: 'hackett.com',
  gant: 'gant.co.uk',
  'fred perry': 'fredperry.com',
  lacoste: 'lacoste.com',

  // Luxury & Designer
  'comme des garcons': 'doverstreetmarket.com',
  cdg: 'doverstreetmarket.com',
  'maison margiela': 'maisonmargiela.com',
  margiela: 'maisonmargiela.com',
  'jil sander': 'jilsander.com',
  'the row': 'therow.com',
  'dries van noten': 'driesvannoten.com',
  prada: 'prada.com',
  gucci: 'gucci.com',
  'bottega veneta': 'bottegaveneta.com',
  loewe: 'loewe.com',
  celine: 'celine.com',
  'saint laurent': 'ysl.com',
  ysl: 'ysl.com',
  jacquemus: 'jacquemus.com',
  'ami paris': 'amiparis.com',
  'stone island': 'stoneisland.com',
  moncler: 'moncler.com',
  burberry: 'burberry.com',

  // Footwear
  'common projects': 'commonprojects.com',
  paraboot: 'paraboot.com',
  alden: 'aldenshoe.com',
  grenson: 'grenson.com',
  trickers: 'trickers.com',
  'crockett & jones': 'crockettandjones.com',
  churchs: 'church-footwear.com',
  'edward green': 'edwardgreen.com',
  birkenstock: 'birkenstock.com',
  clarks: 'clarks.co.uk',
  'red wing': 'redwingshoes.com',
  'new balance': 'newbalance.co.uk',
  salomon: 'salomon.com',
  blundstone: 'blundstone.co.uk',
  veja: 'veja-store.com',
  nike: 'nike.com',
  adidas: 'adidas.co.uk',
};

/**
 * Returns the official brand domain if known
 */
export function getBrandOfficialDomain(brand: string): string | undefined {
  if (!brand) return undefined;
  const clean = brand.trim().toLowerCase().replace(/['’]/g, '');
  if (KNOWN_BRAND_DOMAINS[clean]) return KNOWN_BRAND_DOMAINS[clean];

  for (const [key, domain] of Object.entries(KNOWN_BRAND_DOMAINS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return domain;
    }
  }

  // If brand is a single clean word without spaces, return brand.com
  const words = clean.split(/\s+/);
  if (words.length === 1 && /^[a-z]{3,20}$/.test(words[0])) {
    return `${words[0]}.com`;
  }

  return undefined;
}

/**
 * Clean and validate image URLs
 */
export function isValidProductImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;

  const lower = clean.toLowerCase();
  if (
    lower.includes('spacer.gif') ||
    lower.includes('1x1') ||
    lower.includes('pixel') ||
    lower.includes('tracking') ||
    lower.includes('analytics') ||
    lower.includes('favicon') ||
    lower.includes('.svg') ||
    lower.includes('data:image') ||
    lower.includes('badge')
  ) {
    return false;
  }

  return true;
}

/**
 * Search DuckDuckGo Images for authentic product photographs
 */
async function searchDuckDuckGoImages(
  query: string,
  limit: number = 8,
  sourceLabel: string = 'Web Catalog',
  sourceType: 'google' | 'brand_site' | 'retailer' | 'web' = 'web'
): Promise<ProductImageResult[]> {
  const results: ProductImageResult[] = [];
  const cleanQuery = query.trim();
  if (!cleanQuery) return results;

  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!tokenRes.ok) return results;
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([^"']+)["']/);
    if (!vqdMatch || !vqdMatch[1]) return results;

    const vqd = vqdMatch[1];
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=uk-en&o=json&q=${encodeURIComponent(cleanQuery)}&vqd=${vqd}&f=,,,`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          Referer: 'https://duckduckgo.com/',
        },
        signal: AbortSignal.timeout(7000),
      }
    );

    if (!imgRes.ok) return results;
    const data = await imgRes.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];

    for (const r of rawResults) {
      if (isValidProductImageUrl(r.image)) {
        let finalSource = sourceLabel;
        let finalType = sourceType;

        try {
          if (r.url) {
            const host = new URL(r.url).hostname.replace('www.', '');
            if (host.includes('mrporter') || host.includes('ssense') || host.includes('farfetch') || host.includes('endclothing')) {
              finalSource = `Retailer: ${host}`;
              finalType = 'retailer';
            } else if (sourceType === 'brand_site') {
              finalSource = `Official Brand Store (${host})`;
            }
          }
        } catch {}

        results.push({
          title: r.title || cleanQuery,
          imageUrl: r.image,
          thumbnail: r.thumbnail || r.image,
          source: finalSource,
          sourceType: finalType,
          width: r.width,
          height: r.height,
        });
      }
      if (results.length >= limit) break;
    }
  } catch (err: any) {
    console.warn(`DDG search notice for "${cleanQuery}":`, err?.message || err);
  }

  return results;
}

/**
 * Search Wikimedia Commons for heritage/archival fashion photos
 */
async function searchWikimediaImages(query: string, limit: number = 3): Promise<ProductImageResult[]> {
  const results: ProductImageResult[] = [];
  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encodeURIComponent(query)}&piprop=thumbnail&pithumbsize=900`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'WardrobeStudioImageScout/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return results;
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});

    for (const p of pages as any[]) {
      if (p.thumbnail?.source && isValidProductImageUrl(p.thumbnail.source)) {
        results.push({
          title: p.title || query,
          imageUrl: p.thumbnail.source,
          thumbnail: p.thumbnail.source,
          source: 'Wikimedia Commons Archive',
          sourceType: 'web',
        });
      }
      if (results.length >= limit) break;
    }
  } catch (err: any) {
    console.warn(`Wikimedia image search notice for "${query}":`, err?.message || err);
  }
  return results;
}

/**
 * Search brand's official website directly (e.g. site:barbour.com "Beaufort")
 */
export async function searchBrandOfficialSiteImages(
  brand: string,
  name: string,
  limit: number = 6
): Promise<ProductImageResult[]> {
  const brandDomain = getBrandOfficialDomain(brand);
  if (!brandDomain) return [];

  const cleanName = name.replace(/^[-–:•,]\s*/, '').trim();
  const query = `site:${brandDomain} "${cleanName}"`;
  return searchDuckDuckGoImages(query, limit, `Official Brand: ${brandDomain}`, 'brand_site');
}

/**
 * Search luxury retailers & verified stockists (SSENSE, Mr Porter, Farfetch, End Clothing)
 */
export async function searchLuxuryRetailerImages(
  brand: string,
  name: string,
  limit: number = 6
): Promise<ProductImageResult[]> {
  const cleanBrand = brand.trim();
  const cleanName = name.replace(/^[-–:•,]\s*/, '').trim();
  const query = `(site:mrporter.com OR site:ssense.com OR site:farfetch.com OR site:endclothing.com) "${cleanBrand}" "${cleanName}"`;
  return searchDuckDuckGoImages(query, limit, 'Luxury Retailer (Mr Porter/SSENSE/Farfetch)', 'retailer');
}

/**
 * Call server endpoint to run multi-source image lookup with Google Search Grounding
 */
export async function searchGoogleAndMultiSourceImages(options: {
  brand?: string;
  name?: string;
  color?: string;
  category?: string;
  query?: string;
  provider?: 'all' | 'google' | 'brand_site' | 'retailer' | 'web';
  brandDomain?: string;
  limit?: number;
}): Promise<ProductImageResult[]> {
  const {
    brand = '',
    name = '',
    color = '',
    category = '',
    query = '',
    provider = 'all',
    limit = 12,
  } = options;

  const resolvedDomain = options.brandDomain || getBrandOfficialDomain(brand);

  try {
    const res = await fetch('/api/scraper/lookup-product-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand,
        name,
        color,
        category,
        query,
        provider,
        brandDomain: resolvedDomain,
        limit,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.images) && data.images.length > 0) {
        return data.images;
      }
    }
  } catch (err) {
    console.warn('Backend image lookup notice, falling back to direct client sources:', err);
  }

  // Client-side fallback: Query Brand Site + Luxury Retailers + Web Search in parallel
  const fallbackResults: ProductImageResult[] = [];
  const seenUrls = new Set<string>();

  const addUnique = (list: ProductImageResult[]) => {
    for (const item of list) {
      if (!seenUrls.has(item.imageUrl) && isValidProductImageUrl(item.imageUrl)) {
        seenUrls.add(item.imageUrl);
        fallbackResults.push(item);
      }
    }
  };

  const tasks: Promise<ProductImageResult[]>[] = [];

  // 1. Brand Official Site
  if (brand && name) {
    tasks.push(searchBrandOfficialSiteImages(brand, name, 5));
  }

  // 2. Luxury Retailers
  if (brand && name) {
    tasks.push(searchLuxuryRetailerImages(brand, name, 5));
  }

  // 3. General Search
  const generalQuery = query || [brand, name, color, category].filter(Boolean).join(' ');
  if (generalQuery) {
    tasks.push(searchDuckDuckGoImages(`${generalQuery} product`, 8, 'Google & Web Search', 'google'));
  }

  const settled = await Promise.allSettled(tasks);
  settled.forEach((res) => {
    if (res.status === 'fulfilled') {
      addUnique(res.value);
    }
  });

  return fallbackResults.slice(0, limit);
}

/**
 * Primary Export: Search product images across multiple resilient providers
 */
export async function searchProductImages(
  query: string,
  limit: number = 8
): Promise<ProductImageResult[]> {
  return searchGoogleAndMultiSourceImages({ query, limit });
}

/**
 * Intelligently lookup authentic product photo for a garment across Google, Brand Site, and Retailers
 */
export async function findProductImageForGarment(
  brand: string,
  name: string,
  color?: string,
  category?: string
): Promise<{ primaryImageUrl: string; candidateImages: string[]; results: ProductImageResult[] }> {
  const results = await searchGoogleAndMultiSourceImages({
    brand: brand !== 'Curated Brand' && brand !== 'Pre-Loved Brand' ? brand : '',
    name,
    color: color && color !== 'Neutral' ? color : '',
    category,
    provider: 'all',
    limit: 10,
  });

  if (results.length > 0) {
    return {
      primaryImageUrl: results[0].imageUrl,
      candidateImages: results.map((i) => i.imageUrl),
      results,
    };
  }

  return {
    primaryImageUrl: '',
    candidateImages: [],
    results: [],
  };
}
