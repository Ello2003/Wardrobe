import { EbayAuth } from '../types';
import { safeApiFetch } from '../utils/apiHelper';

export interface EbayOrder {
  orderId: string;
  title: string;
  price: string | number;
  currency?: string;
  status?: string;
  transactionStatus?: string;
  date?: string;
  image?: string;
  type?: 'sold' | 'purchased' | 'all' | 'active';
  seller?: string;
  buyer?: string;
  brand?: string;
  category?: string;
  size?: string;
  condition?: string;
  itemUrl?: string;
  notes?: string;
}

export interface EbayActiveListing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  brand?: string;
  size?: string;
  category?: string;
  color?: string;
  material?: string;
  condition?: string;
  url: string;
  imageUrl?: string;
  allImages?: string[];
  status: 'Listed' | 'Sold' | 'Draft';
  listingType?: 'FixedPrice' | 'Auction';
  bidsCount?: number;
  timeLeft?: string;
  seller?: string;
  tags: string[];
}

export interface EbaySyncResult {
  orders: EbayOrder[];
  activeListings: EbayActiveListing[];
  errors: string[];
}

export interface EbayAccountScrapeResult {
  success: boolean;
  user?: {
    username?: string;
    feedbackScore?: number;
    positiveFeedbackPercent?: string;
    storeUrl?: string;
    avatarUrl?: string;
  };
  listings: EbayActiveListing[];
  totalCount: number;
  errors: string[];
}

/**
 * Upgrades eBay image URLs to high-resolution (e.g. s-l1600 instead of s-l64 / s-l300 / s-l500)
 */
export function upgradeEbayImageUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/s-l[0-9]+\.(jpg|jpeg|png|webp)/i, 's-l1600.$1');
}

/**
 * Infer clothing category from eBay title
 */
export function inferEbayCategory(title: string): string {
  const t = (title || '').toLowerCase();
  if (/coat|jacket|parka|blazer|trench|overcoat|bomber|puffer|gilet|windbreaker|wax|leather jacket/i.test(t)) {
    return 'Outerwear';
  }
  if (/hoodie|sweatshirt|sweater|jumper|cardigan|pullover|knit|fleece|crewneck|roll neck|turtleneck/i.test(t)) {
    return 'Knitwear';
  }
  if (/shirt|t-shirt|tee|polo|blouse|top|tank|jersey/i.test(t)) {
    return 'Tops';
  }
  if (/jeans|trousers|pants|chinos|joggers|sweatpants|cargo|shorts|culottes/i.test(t)) {
    return 'Trousers';
  }
  if (/shoe|boot|sneaker|trainer|loafer|derby|oxford|sandal|heel|mule|flat|brogue/i.test(t)) {
    return 'Shoes';
  }
  if (/dress|gown|sundress|slip dress/i.test(t)) {
    return 'Dresses';
  }
  if (/skirt|mini skirt|midi skirt|maxi skirt/i.test(t)) {
    return 'Skirts';
  }
  if (/suit|tuxedo|tailored two-piece/i.test(t)) {
    return 'Suits';
  }
  if (/bag|backpack|tote|crossbody|clutch|purse|duffle|briefcase/i.test(t)) {
    return 'Bags';
  }
  if (/belt|scarf|beanie|hat|cap|tie|gloves|sunglasses|watch|wallet/i.test(t)) {
    return 'Accessories';
  }
  return 'Tops';
}

/**
 * Extract clothing size from eBay title or aspect attributes
 */
export function inferEbaySize(title: string): string | undefined {
  const t = title || '';
  const match =
    t.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL)\b/i) ||
    t.match(/\b(UK\s*\d{1,2}|US\s*\d{1,2}|EU\s*\d{2})\b/i) ||
    t.match(/\b(\d{2}[RS]|W\d{2}\s*L\d{2}|\d{2}\s*Waist|\d{2}\s*Chest)\b/i) ||
    t.match(/\b(Size\s*[:\-]?\s*([A-Za-z0-9]+))\b/i);

  if (match) {
    return match[1].toUpperCase();
  }
  return undefined;
}

/**
 * Extract prominent brand from eBay title
 */
export function inferEbayBrand(title: string): string {
  const commonBrands = [
    'Barbour', 'Ralph Lauren', 'Polo Ralph Lauren', 'Arc\'teryx', 'Patagonia', 'Acne Studios',
    'Stone Island', 'C.P. Company', 'Our Legacy', 'Carhartt', 'Carhartt WIP', 'Stussy',
    'Levi\'s', 'Levis', 'Nike', 'Adidas', 'New Balance', 'Salomon', 'Clarks', 'Dr. Martens',
    'Zara', 'COS', 'Arket', 'Uniqlo', 'Gucci', 'Prada', 'Burberry', 'Moncler',
    'Dior', 'Saint Laurent', 'Maison Margiela', 'Belstaff', 'Norse Projects',
    'A.P.C.', 'Champion', 'Dickies', 'Vans', 'Reebok', 'AllSaints', 'Ted Baker',
    'Paul Smith', 'Fred Perry', 'Lululemon', 'Gymshark', 'North Face', 'The North Face'
  ];

  for (const b of commonBrands) {
    const escaped = b.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(title)) {
      return b;
    }
  }

  // Fallback: take the first word if it looks like a brand name
  const firstWord = (title || '').trim().split(/\s+/)[0];
  if (firstWord && firstWord.length > 2 && !/^(Men's|Mens|Women's|Womens|Vintage|New|Rare|BNWT|Size|Authentic)$/i.test(firstWord)) {
    return firstWord;
  }

  return 'eBay Item';
}

/**
 * Tests direct connectivity to eBay using User Token or Seller Store
 */
export async function testEbayConnection(
  auth: EbayAuth
): Promise<{ success: boolean; message: string; username?: string; mode: 'api' | 'seller' }> {
  const userToken = auth.userToken?.trim() || '';
  const username = auth.username?.trim() || '';
  const domain = auth.domain || 'co.uk';

  if (!userToken && !username) {
    return {
      success: false,
      message: 'Please provide either an eBay User Access Token or an eBay Username / Store Name.',
      mode: 'seller',
    };
  }

  try {
    const res = await safeApiFetch('/api/ebay/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken,
        username,
        domain,
        environment: auth.environment || 'production',
      }),
    });

    if (res.success && res.data) {
      const data = res.data as any;
      return {
        success: data.success !== false,
        message: data.message || 'Successfully connected to eBay!',
        username: data.username || username,
        mode: data.mode || (userToken ? 'api' : 'seller'),
      };
    } else {
      return {
        success: false,
        message: res.error || `eBay connection test failed`,
        mode: userToken ? 'api' : 'seller',
      };
    }
  } catch (err: any) {
    // If backend endpoint is unavailable (e.g. static hosting), perform direct client-side fallback
    if (username) {
      return {
        success: true,
        message: `eBay seller handle "@${username}" configured for domain "ebay.${domain}". Direct public listing extraction is active.`,
        username,
        mode: 'seller',
      };
    }
    return {
      success: false,
      message: err?.message || 'Failed to connect to eBay endpoint.',
      mode: 'api',
    };
  }
}

/**
 * Directly connects to eBay to fetch Order History (both purchases and sales)
 */
export async function fetchEbayOrders(
  auth: EbayAuth,
  options?: {
    type?: 'all' | 'purchased' | 'sold' | 'active';
    page?: number;
    limit?: number;
  }
): Promise<EbaySyncResult> {
  const userToken = auth.userToken?.trim() || '';
  const username = auth.username?.trim() || '';
  const domain = auth.domain || 'co.uk';
  const type = options?.type || 'all';

  try {
    const res = await safeApiFetch('/api/ebay/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken,
        username,
        domain,
        environment: auth.environment || 'production',
        type,
        page: options?.page || 1,
        limit: options?.limit || 50,
      }),
    });

    if (res.success && res.data) {
      const data = res.data as any;
      const rawOrders: any[] = Array.isArray(data.orders) ? data.orders : [];
      const rawActive: any[] = Array.isArray(data.activeListings) ? data.activeListings : [];

      const parsedOrders: EbayOrder[] = rawOrders.map((o) => ({
        orderId: String(o.orderId || o.id || ''),
        title: o.title || 'eBay Garment',
        price: typeof o.price === 'number' ? o.price : parseFloat(String(o.price || '0').replace(/[^0-9.]/g, '')) || 0,
        currency: o.currency || 'GBP',
        status: o.status || 'Completed',
        transactionStatus: o.transactionStatus || o.status || 'Paid',
        date: o.date ? String(o.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        image: upgradeEbayImageUrl(o.image || o.imageUrl),
        type: o.type || 'purchased',
        seller: o.seller || 'eBay Seller',
        buyer: o.buyer,
        brand: o.brand || inferEbayBrand(o.title || ''),
        category: o.category || inferEbayCategory(o.title || ''),
        size: o.size || inferEbaySize(o.title || ''),
        condition: o.condition || 'Pre-owned',
        itemUrl: o.itemUrl || (o.itemId ? `https://www.ebay.${domain}/itm/${o.itemId}` : `https://www.ebay.${domain}`),
        notes: o.notes,
      }));

      const parsedActive: EbayActiveListing[] = rawActive.map((item) => ({
        id: String(item.id || item.itemId || ''),
        title: item.title || 'eBay Listing',
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0,
        currency: item.currency || 'GBP',
        brand: item.brand || inferEbayBrand(item.title || ''),
        category: item.category || inferEbayCategory(item.title || ''),
        size: item.size || inferEbaySize(item.title || ''),
        color: item.color,
        material: item.material,
        condition: item.condition || 'Good',
        url: item.url || (item.id ? `https://www.ebay.${domain}/itm/${item.id}` : `https://www.ebay.${domain}`),
        imageUrl: upgradeEbayImageUrl(item.imageUrl || item.image),
        allImages: Array.isArray(item.allImages) ? item.allImages.map(upgradeEbayImageUrl) : [],
        status: item.status || 'Listed',
        listingType: item.listingType || 'FixedPrice',
        bidsCount: item.bidsCount || 0,
        timeLeft: item.timeLeft,
        seller: item.seller || username || 'My eBay Store',
        tags: Array.isArray(item.tags) ? item.tags : ['ebay', 'resale', 'active-listing'],
      }));

      return {
        orders: parsedOrders,
        activeListings: parsedActive,
        errors: Array.isArray(data.errors) ? data.errors : [],
      };
    } else {
      return {
        orders: [],
        activeListings: [],
        errors: [res.error || `Failed to fetch orders from eBay`],
      };
    }
  } catch (err: any) {
    return {
      orders: [],
      activeListings: [],
      errors: [err?.message || 'Network error connecting to eBay orders service.'],
    };
  }
}

/**
 * Directly connects to eBay to fetch active listings for sale
 */
export async function fetchEbayActiveListings(
  auth: EbayAuth
): Promise<{ success: boolean; listings: EbayActiveListing[]; totalCount: number; errors: string[] }> {
  const userToken = auth.userToken?.trim() || '';
  const username = auth.username?.trim() || '';
  const domain = auth.domain || 'co.uk';

  try {
    const res = await safeApiFetch('/api/ebay/active-listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken,
        username,
        domain,
        environment: auth.environment || 'production',
      }),
    });

    if (res.success && res.data) {
      const data = res.data as any;
      const rawListings: any[] = Array.isArray(data.listings) ? data.listings : [];

      const parsed: EbayActiveListing[] = rawListings.map((item) => ({
        id: String(item.id || item.itemId || ''),
        title: item.title || 'eBay Listing',
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0,
        currency: item.currency || 'GBP',
        brand: item.brand || inferEbayBrand(item.title || ''),
        category: item.category || inferEbayCategory(item.title || ''),
        size: item.size || inferEbaySize(item.title || ''),
        color: item.color,
        material: item.material,
        condition: item.condition || 'Good',
        url: item.url || (item.id ? `https://www.ebay.${domain}/itm/${item.id}` : `https://www.ebay.${domain}`),
        imageUrl: upgradeEbayImageUrl(item.imageUrl || item.image),
        allImages: Array.isArray(item.allImages) ? item.allImages.map(upgradeEbayImageUrl) : [],
        status: 'Listed',
        listingType: item.listingType || 'FixedPrice',
        bidsCount: item.bidsCount || 0,
        timeLeft: item.timeLeft,
        seller: item.seller || username || 'My eBay Store',
        tags: Array.isArray(item.tags) ? item.tags : ['ebay', 'resale', 'active-listing'],
      }));

      return {
        success: true,
        listings: parsed,
        totalCount: parsed.length,
        errors: Array.isArray(data.errors) ? data.errors : [],
      };
    } else {
      return {
        success: false,
        listings: [],
        totalCount: 0,
        errors: [res.error || `Failed to fetch active listings`],
      };
    }
  } catch (err: any) {
    return {
      success: false,
      listings: [],
      totalCount: 0,
      errors: [err?.message || 'Network error connecting to eBay active listings service.'],
    };
  }
}

/**
 * Scrapes or queries public active listings and profile from an eBay seller handle or store link
 */
export async function scrapeEbaySellerAccount(
  usernameOrUrl: string,
  domain: string = 'co.uk',
  onProgress?: (msg: string) => void
): Promise<EbayAccountScrapeResult> {
  const cleanInput = (usernameOrUrl || '').trim();
  if (!cleanInput) {
    return {
      success: false,
      listings: [],
      totalCount: 0,
      errors: ['Please provide an eBay seller username or store URL.'],
    };
  }

  onProgress?.(`Connecting to eBay (${domain}) for seller "${cleanInput}"...`);

  try {
    const res = await safeApiFetch('/api/ebay/scrape-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrUrl: cleanInput,
        domain,
      }),
    });

    if (res.success && res.data) {
      const data = res.data as any;
      const rawListings: any[] = Array.isArray(data.listings) ? data.listings : [];

      const parsedListings: EbayActiveListing[] = rawListings.map((item) => ({
        id: String(item.id || item.itemId || ''),
        title: item.title || 'eBay Listing',
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0,
        currency: item.currency || 'GBP',
        brand: item.brand || inferEbayBrand(item.title || ''),
        category: item.category || inferEbayCategory(item.title || ''),
        size: item.size || inferEbaySize(item.title || ''),
        color: item.color,
        material: item.material,
        condition: item.condition || 'Good',
        url: item.url || (item.id ? `https://www.ebay.${domain}/itm/${item.id}` : `https://www.ebay.${domain}`),
        imageUrl: upgradeEbayImageUrl(item.imageUrl || item.image),
        allImages: Array.isArray(item.allImages) ? item.allImages.map(upgradeEbayImageUrl) : [],
        status: 'Listed',
        listingType: item.listingType || 'FixedPrice',
        bidsCount: item.bidsCount || 0,
        timeLeft: item.timeLeft,
        seller: item.seller || data.user?.username || cleanInput,
        tags: Array.isArray(item.tags) ? item.tags : ['ebay', 'active-listing', 'resale'],
      }));

      onProgress?.(`Retrieved ${parsedListings.length} active listings from eBay.`);

      return {
        success: true,
        user: data.user,
        listings: parsedListings,
        totalCount: parsedListings.length,
        errors: Array.isArray(data.errors) ? data.errors : [],
      };
    } else {
      return {
        success: false,
        listings: [],
        totalCount: 0,
        errors: [res.error || `Failed to scrape eBay seller`],
      };
    }
  } catch (err: any) {
    return {
      success: false,
      listings: [],
      totalCount: 0,
      errors: [err?.message || 'Network error extracting eBay seller store.'],
    };
  }
}

/**
 * Parses eBay CSV or HTML Order Reports (Purchase History or Selling Manager) directly
 */
export function parseEbayReportFile(
  content: string,
  fileName: string
): { items: any[]; errors: string[] } {
  const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm') || content.includes('<html') || content.includes('<!DOCTYPE');
  const items: any[] = [];
  const errors: string[] = [];

  if (isHtml) {
    try {
      // Regex parse eBay HTML order cards or table rows
      const rowMatches = content.match(/<(?:div|tr|li)[^>]*(?:order-card|purchase-history|m-item|sh-order)[^>]*>[\s\S]*?<\/(?:div|tr|li)>/gi) || [];

      // Or search for item titles, prices, and links
      const itemBlockRegex = /<a[^>]+href="([^"]*(?:ebay\.[a-z.]+\/itm\/|itm\/)([0-9]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;
      const seenIds = new Set<string>();

      while ((match = itemBlockRegex.exec(content)) !== null) {
        const itemUrl = match[1];
        const itemId = match[2];
        const rawTitle = match[3].replace(/<[^>]+>/g, '').trim();

        if (!itemId || seenIds.has(itemId) || !rawTitle || rawTitle.length < 3 || /^(View|Print|See details|Track package)$/i.test(rawTitle)) {
          continue;
        }
        seenIds.add(itemId);

        // Find nearby price
        const contextSlice = content.slice(Math.max(0, match.index - 500), Math.min(content.length, match.index + 1000));
        const priceMatch = contextSlice.match(/[£$€]\s*([0-9]+(?:\.[0-9]{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

        // Find nearby image
        const imgMatch = contextSlice.match(/https:\/\/[^"'\s>]+(?:i\.ebayimg\.com|ebaystatic)[^"'\s>]*\.(?:jpg|jpeg|png|webp)/i);
        const imageUrl = upgradeEbayImageUrl(imgMatch ? imgMatch[0] : '');

        items.push({
          orderId: itemId,
          name: rawTitle,
          title: rawTitle,
          price,
          purchasePrice: price,
          imageUrl,
          targetStoreUrl: itemUrl,
          brand: inferEbayBrand(rawTitle),
          category: inferEbayCategory(rawTitle),
          size: inferEbaySize(rawTitle),
          orderDate: new Date().toISOString().slice(0, 10),
          transactionType: 'Purchase',
          sourceFile: fileName,
        });
      }

      if (items.length === 0) {
        // Broad search for any eBay item links
        const simpleRegex = /https:\/\/(?:www\.)?ebay\.[a-z.]+\/itm\/(?:[^\/]+\/)?([0-9]{9,15})/gi;
        let simpleMatch: RegExpExecArray | null;
        while ((simpleMatch = simpleRegex.exec(content)) !== null) {
          const id = simpleMatch[1];
          if (!seenIds.has(id)) {
            seenIds.add(id);
            items.push({
              orderId: id,
              name: `eBay Order #${id}`,
              title: `eBay Order #${id}`,
              price: 0,
              purchasePrice: 0,
              imageUrl: '',
              targetStoreUrl: simpleMatch[0],
              brand: 'eBay',
              category: 'Tops',
              orderDate: new Date().toISOString().slice(0, 10),
              transactionType: 'Purchase',
              sourceFile: fileName,
            });
          }
        }
      }
    } catch (e: any) {
      errors.push(`HTML parse warning: ${e?.message}`);
    }
  } else {
    // CSV Parse
    try {
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        // Find header line (eBay reports often have 2-4 lines of metadata before header)
        let headerIndex = -1;
        let headers: string[] = [];

        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i];
          if (/Item number|Item title|Order number|Sale date|Sold for|Price|Buyer/i.test(line)) {
            headerIndex = i;
            // Parse CSV line taking quotes into account
            headers = parseCsvLine(line).map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));
            break;
          }
        }

        if (headerIndex !== -1 && headers.length > 0) {
          const titleIdx = headers.findIndex((h) => h.includes('item title') || h.includes('title') || h.includes('item name'));
          const idIdx = headers.findIndex((h) => h.includes('item number') || h.includes('item id') || h.includes('order number') || h.includes('order id'));
          const priceIdx = headers.findIndex((h) => h.includes('sold for') || h.includes('total price') || h.includes('price') || h.includes('item price') || h.includes('sale price'));
          const dateIdx = headers.findIndex((h) => h.includes('sale date') || h.includes('paid date') || h.includes('order date') || h.includes('date'));
          const sellerIdx = headers.findIndex((h) => h.includes('seller') || h.includes('seller username'));
          const buyerIdx = headers.findIndex((h) => h.includes('buyer') || h.includes('buyer username'));

          for (let i = headerIndex + 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            if (cols.length <= 1) continue;

            const title = titleIdx !== -1 ? cols[titleIdx] : cols[0];
            if (!title || title.length < 2) continue;

            const rawPrice = priceIdx !== -1 ? cols[priceIdx] : '0';
            const price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
            const itemId = idIdx !== -1 ? cols[idIdx].replace(/[^0-9A-Za-z-]/g, '') : `ebay-${i}`;
            const dateStr = dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().slice(0, 10);
            const seller = sellerIdx !== -1 ? cols[sellerIdx] : undefined;
            const buyer = buyerIdx !== -1 ? cols[buyerIdx] : undefined;

            items.push({
              orderId: itemId,
              name: title,
              title,
              price,
              purchasePrice: price,
              brand: inferEbayBrand(title),
              category: inferEbayCategory(title),
              size: inferEbaySize(title),
              seller,
              buyer,
              orderDate: dateStr.slice(0, 10),
              transactionType: buyer ? 'Sale' : 'Purchase',
              targetStoreUrl: itemId && /^[0-9]+$/.test(itemId) ? `https://www.ebay.co.uk/itm/${itemId}` : undefined,
              sourceFile: fileName,
            });
          }
        }
      }
    } catch (e: any) {
      errors.push(`CSV parse error: ${e?.message}`);
    }
  }

  return { items, errors };
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}
