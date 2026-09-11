import { VintedWorkerAuth } from '../types';
import { safeApiFetch } from '../utils/apiHelper';

export interface VintedOrder {
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
  brand?: string;
  color?: string;
  colour?: string;
  material?: string;
  fabric?: string;
  size?: string;
  description?: string;
  user?: { login?: string; username?: string };
  seller_username?: string;
}

export interface VintedExtractedItem {
  url: string;
  title: string;
  brand?: string;
  price: string | number;
  condition?: string;
  color?: string;
  colour?: string;
  material?: string;
  fabric?: string;
  size?: string;
  description?: string;
  seller?: string;
  image?: string;
  source?: string;
  tags?: string[];
  status?: string;
  notes?: string;
}

export interface VintedAccountListing {
  id: string;
  title: string;
  price: number | string;
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
  status: 'Listed' | 'Sold' | 'Reserved' | 'Cancelled';
  seller?: string;
  description?: string;
  tags: string[];
}

export interface VintedAccountScrapeResult {
  success: boolean;
  user?: {
    id?: string;
    username?: string;
    profileUrl?: string;
    photo?: string;
    itemsCount?: number;
    feedbackCount?: number;
  };
  listings: VintedAccountListing[];
  totalCount: number;
  errors: string[];
}

export interface VintedSyncResult {
  orders: VintedOrder[];
  refreshedAccessToken?: string;
  errors: string[];
}

export interface VintedExtractBatchResult {
  items: VintedExtractedItem[];
  skipped: number;
  failed: number;
  errors: string[];
}

// Clean and validate worker endpoint URL
export const sanitizeWorkerUrl = (url: string): string => {
  let v = (url || '').trim().replace(/\/$/, '');
  if (v && !/^https?:\/\//i.test(v)) {
    v = 'https://' + v;
  }
  return v;
};

// Test if worker endpoint is reachable
export const testWorkerConnection = async (
  rawEndpoint: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  const endpoint = sanitizeWorkerUrl(rawEndpoint);
  if (!endpoint) {
    return { success: false, message: 'Please provide a Cloudflare Worker endpoint URL.' };
  }

  try {
    // 1. Direct attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // The worker returns 400 with message "GET requests need ?url=..." which indicates it's alive!
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (res.status === 200 || res.status === 400 || (parsed && parsed.error)) {
        return {
          success: true,
          message: 'Connected successfully to Cloudflare Worker!',
          data: parsed,
        };
      }
    } catch {
      clearTimeout(timeoutId);
    }

    // 2. Fallback via server proxy check
    const proxyRes = await fetch(
      `/api/vinted-proxy/extract?workerEndpoint=${encodeURIComponent(endpoint)}&url=test`
    );
    const proxyData = await proxyRes.json();
    if (proxyRes.ok || (proxyData && proxyData.error)) {
      return {
        success: true,
        message: 'Connected successfully to Cloudflare Worker (via proxy)!',
        data: proxyData,
      };
    }

    return {
      success: false,
      message: 'Worker returned unexpected response. Check your endpoint URL.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reach worker: ${err?.message || 'Network error'}`,
    };
  }
};

// Fetch a single order page from the worker
export const fetchVintedOrderPage = async (
  auth: VintedWorkerAuth,
  type: 'sold' | 'purchased' | 'all',
  page: number,
  perPage: number = 50
): Promise<{
  orders?: VintedOrder[];
  pagination?: { total_pages: number; current_page?: number };
  refreshed_access_token?: string;
  error?: string;
}> => {
  const endpoint = sanitizeWorkerUrl(auth.workerEndpoint);
  if (!endpoint) {
    throw new Error('Cloudflare Worker endpoint is missing.');
  }
  if (!auth.accessToken || !auth.csrfToken) {
    throw new Error('Access token and CSRF token are required.');
  }

  const payload = {
    domain: auth.domain || 'co.uk',
    access_token: auth.accessToken.trim(),
    xcsrf_token: auth.csrfToken.trim(),
    cookie: (auth.cookie || '').trim(),
    refresh_token: (auth.refreshToken || '').trim(),
    type,
    status: 'all',
    page,
    per_page: perPage,
  };

  // Try direct fetch to worker first (Worker has CORS enabled)
  try {
    const res = await fetch(`${endpoint}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => null);
    if (errBody && errBody.error) {
      return { error: errBody.error };
    }
  } catch (directErr) {
    console.warn('Direct worker fetch encountered issue, attempting server proxy fallback...', directErr);
  }

  // Fallback via local backend server proxy (or external API if configured)
  const proxyRes = await safeApiFetch('/api/vinted-proxy/orders', {
    method: 'POST',
    body: JSON.stringify({
      workerEndpoint: endpoint,
      ...payload,
    }),
  });

  if (!proxyRes.success || !proxyRes.data) {
    throw new Error(proxyRes.error || 'Failed to connect to Vinted sync service.');
  }

  return proxyRes.data;
};

// Fetch all orders across pages for purchased, sold, and active closet items
export const fetchAllVintedOrders = async (
  auth: VintedWorkerAuth,
  syncTypes: Array<'purchased' | 'sold' | 'active'> = ['purchased', 'sold'],
  onProgress?: (msg: string) => void,
  onTokenRefreshed?: (newToken: string) => void
): Promise<VintedSyncResult> => {
  const allOrders: VintedOrder[] = [];
  const errors: string[] = [];
  let latestAccessToken = auth.accessToken;

  for (const kind of syncTypes) {
    if (kind === 'active') {
      if (onProgress) {
        onProgress('Scraping active closet listings via authenticated session (bypassing Cloudflare)...');
      }
      try {
        const accountRes = await scrapeVintedAccountListings({
          accountUrlOrUsername: auth.username || '',
          domain: auth.domain || 'co.uk',
          workerEndpoint: auth.workerEndpoint,
          statusFilter: 'listed',
          accessToken: latestAccessToken,
          cookie: auth.cookie,
          onProgress: (m) => onProgress && onProgress(`[Active Listings] ${m}`),
        });

        if (accountRes && Array.isArray(accountRes.listings) && accountRes.listings.length > 0) {
          accountRes.listings.forEach((l) => {
            allOrders.push({
              orderId: l.id,
              title: l.title,
              price: l.price,
              status: 'Listed',
              transactionStatus: 'Listed',
              type: 'active' as any,
              image: l.imageUrl,
              date: new Date().toISOString(),
              seller: accountRes.user?.username || auth.username || 'me',
              currency: l.currency || 'GBP',
              brand: l.brand,
              color: l.color,
              material: l.material,
              size: l.size,
              description: l.description,
            });
          });
        }
      } catch (actErr: any) {
        errors.push(`Active listings sync: ${actErr?.message || actErr}`);
      }
      continue;
    }

    let page = 1;
    let totalPages = 1;

    do {
      if (onProgress) {
        onProgress(
          `Fetching ${kind} orders — page ${page}${totalPages > 1 ? ` of ${totalPages}` : ''}...`
        );
      }

      const activeAuth: VintedWorkerAuth = {
        ...auth,
        accessToken: latestAccessToken,
      };

      let data;
      try {
        data = await fetchVintedOrderPage(activeAuth, kind, page);
      } catch (err: any) {
        errors.push(`Page ${page} of ${kind} failed: ${err?.message || err}`);
        break;
      }

      if (data.error) {
        errors.push(`Vinted returned error for ${kind}: ${data.error}`);
        break;
      }

      if (data.refreshed_access_token) {
        latestAccessToken = data.refreshed_access_token;
        if (onTokenRefreshed) {
          onTokenRefreshed(latestAccessToken);
        }
      }

      if (Array.isArray(data.orders)) {
        data.orders.forEach((o) => {
          allOrders.push({
            ...o,
            type: kind,
          });
        });
      }

      totalPages = data.pagination && data.pagination.total_pages ? data.pagination.total_pages : 1;
      page++;
    } while (page <= totalPages);
  }

  return {
    orders: allOrders,
    refreshedAccessToken: latestAccessToken !== auth.accessToken ? latestAccessToken : undefined,
    errors,
  };
};

// Extract a single active listing from a public Vinted URL
export const extractVintedItemFromUrl = async (
  rawWorkerEndpoint: string,
  url: string
): Promise<VintedExtractedItem> => {
  const endpoint = sanitizeWorkerUrl(rawWorkerEndpoint);
  if (!endpoint) {
    throw new Error('Cloudflare Worker endpoint is missing.');
  }
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('Vinted URL is required.');
  }

  // 1. Try direct fetch to worker
  try {
    const res = await fetch(`${endpoint}?url=${encodeURIComponent(cleanUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (!data.error) {
        return {
          ...data,
          url: data.url || cleanUrl,
        };
      }
      throw new Error(data.error);
    }
  } catch (directErr: any) {
    console.warn('Direct URL extraction fetch failed, attempting server proxy...', directErr?.message);
  }

  // 2. Fallback via server proxy
  const proxyRes = await fetch(
    `/api/vinted-proxy/extract?workerEndpoint=${encodeURIComponent(endpoint)}&url=${encodeURIComponent(cleanUrl)}`
  );
  const proxyData = await proxyRes.json();
  if (proxyRes.ok && !proxyData.error) {
    return {
      ...proxyData,
      url: proxyData.url || cleanUrl,
    };
  }

  throw new Error(proxyData?.error || 'Failed to extract item from Vinted URL.');
};

// Extract multiple active listings in batch
export const extractVintedItemsFromUrls = async (
  workerEndpoint: string,
  urls: string[],
  onProgress?: (current: number, total: number, url: string) => void
): Promise<VintedExtractBatchResult> => {
  const validUrls = urls
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http') && u.includes('vinted'));

  const items: VintedExtractedItem[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < validUrls.length; i++) {
    const u = validUrls[i];
    if (onProgress) {
      onProgress(i + 1, validUrls.length, u);
    }

    try {
      const extracted = await extractVintedItemFromUrl(workerEndpoint, u);
      items.push(extracted);
    } catch (err: any) {
      failed++;
      errors.push(`${u}: ${err?.message || 'Extraction failed'}`);
    }
  }

  return {
    items,
    skipped,
    failed,
    errors,
  };
};

// Heuristic category classifier from garment title
export const inferCategoryFromTitle = (title: string): string => {
  const t = (title || '').toLowerCase();

  if (/\b(tie|bowtie|scarf|shawl|belt|hat|beanie|cap|gloves|sunglasses|watch|cufflinks|wallet|umbrella|jewel|necklace|ring|bracelet)\b/.test(t)) {
    return 'Accessories';
  }
  if (/\b(jacket|coat|parka|blazer|trench|bomber|puffer|windbreaker|gilet|overcoat|cape|anorak|shearling|leather jacket)\b/.test(t)) {
    return 'Outerwear';
  }
  if (/\b(knit|knitwear|jumper|sweater|cardigan|pullover|roll neck|turtleneck|crewneck|cashmere|wool jumper)\b/.test(t)) {
    return 'Knitwear';
  }
  if (/\b(dress|gown|maxi dress|midi dress|mini dress|jumpsuit|dungarees|romper|playsuit)\b/.test(t)) {
    return 'Dresses & Jumpsuits';
  }
  if (/\b(trousers|jeans|pants|shorts|skirt|chinos|leggings|culottes|slacks|joggers)\b/.test(t)) {
    return 'Bottoms';
  }
  if (/\b(boot|boots|shoe|shoes|sneaker|sneakers|trainer|trainers|loafer|loafers|heel|heels|sandal|sandals|oxford|derby|brogues|mules|flats)\b/.test(t)) {
    return 'Shoes';
  }
  if (/\b(bag|handbag|tote|backpack|clutch|crossbody|briefcase|satchel|shoulder bag|duffle)\b/.test(t)) {
    return 'Bags';
  }
  if (/\b(suit|tuxedo|dinner jacket|tailcoat|formal)\b/.test(t)) {
    return 'Formalwear';
  }
  if (/\b(activewear|gym|running|sports|legging|bra|tracksuit|yoga)\b/.test(t)) {
    return 'Activewear';
  }
  if (/\b(shirt|t-shirt|tee|polo|blouse|top|tank|camisole|crop top|button down|oxford shirt)\b/.test(t)) {
    return 'Tops';
  }

  return 'Tops';
};

// Scrape active listings and items from a Vinted account or member profile URL
export const scrapeVintedAccountListings = async (params: {
  accountUrlOrUsername: string;
  domain?: string;
  workerEndpoint?: string;
  rawHtml?: string;
  statusFilter?: 'all' | 'listed' | 'sold';
  accessToken?: string;
  cookie?: string;
  onProgress?: (msg: string) => void;
}): Promise<VintedAccountScrapeResult> => {
  const {
    accountUrlOrUsername,
    domain = 'co.uk',
    workerEndpoint = '',
    rawHtml = '',
    statusFilter = 'all',
    accessToken = '',
    cookie = '',
    onProgress,
  } = params;

  if (onProgress) {
    onProgress('Connecting to Vinted account scraper proxy...');
  }

  const cleanInput = (accountUrlOrUsername || '').trim();
  const endpoint = sanitizeWorkerUrl(workerEndpoint);

  // 1. Direct fetch via Cloudflare Worker if configured and worker supports /scrape-account
  if (endpoint) {
    try {
      if (onProgress) onProgress('Scraping account via Cloudflare Worker...');
      const workerRes = await fetch(`${endpoint}/scrape-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountUrlOrUsername: cleanInput,
          domain,
          rawHtml,
          statusFilter,
          accessToken,
          cookie,
        }),
      });
      if (workerRes.ok) {
        const workerData = await workerRes.json();
        if (workerData && !workerData.error) {
          return workerData;
        }
      }
    } catch (err: any) {
      console.warn('Worker direct account scrape skipped, falling back to server proxy...', err?.message);
    }
  }

  // 2. Fetch via Express server proxy endpoint (or external API if configured)
  if (onProgress) onProgress('Extracting listings & photos from account feed...');
  const proxyRes = await safeApiFetch('/api/vinted-proxy/scrape-account', {
    method: 'POST',
    body: JSON.stringify({
      accountUrlOrUsername: cleanInput,
      domain,
      workerEndpoint: endpoint,
      rawHtml,
      statusFilter,
      accessToken,
      cookie,
    }),
  });

  if (!proxyRes.success || !proxyRes.data || proxyRes.data.error) {
    throw new Error(proxyRes.error || proxyRes.data?.error || 'Failed to scrape Vinted account listings.');
  }

  return proxyRes.data;
};
