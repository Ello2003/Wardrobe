import { EditorialArticle, EditorialFeedSource, EditorialFeedSettings, ShoppingItem, Category } from '../types';

export const DEFAULT_EDITORIAL_SOURCES: EditorialFeedSource[] = [
  {
    id: 'drakes',
    name: "Drake's",
    tagline: 'British Haberdashery, Neapolitan Soft Tailoring & Transatlantic Ivy',
    siteUrl: 'https://www.drakes.com',
    feedUrl: 'https://www.drakes.com/blogs/open.atom',
    brandBadge: "DRAKE'S LONDON",
    brandColor: '#2D3E33', // Signature Drake's British racing green
    enabled: true,
    category: 'Haberdashery & Ivy',
    logoLetter: 'D',
  },
  {
    id: 'suitsupply',
    name: 'Suitsupply',
    tagline: 'Contemporary Tailoring, Biella Fabric Mills & Sartorial Lookbooks',
    siteUrl: 'https://suitsupply.com',
    feedUrl: 'https://suitsupply.com/en-gb/journal',
    brandBadge: 'SUITSUPPLY',
    brandColor: '#1A1A1A', // Sharp tailoring charcoal
    enabled: true,
    category: 'Sartorial Tailoring',
    logoLetter: 'S',
  },
  {
    id: 'the-rake',
    name: 'The Rake',
    tagline: 'The International Voice of Classic Elegance & Sartorial Heritage',
    siteUrl: 'https://therake.com',
    feedUrl: 'https://therake.com/stories/rss',
    brandBadge: 'THE RAKE',
    brandColor: '#841B1B', // Rich Oxblood Burgundy
    enabled: true,
    category: 'Luxury Sartorialism',
    logoLetter: 'R',
  },
  {
    id: 'permanent-style',
    name: 'Permanent Style',
    tagline: "Simon Crompton's Authority on Classic Menswear, Bespoke & Craft",
    siteUrl: 'https://www.permanentstyle.com',
    feedUrl: 'https://www.permanentstyle.com/feed',
    brandBadge: 'PERMANENT STYLE',
    brandColor: '#8C7355', // Classic Flannel / Sartorial Camel
    enabled: true,
    category: 'Bespoke Craft & Menswear',
    logoLetter: 'P',
  },
  {
    id: 'die-workwear',
    name: 'Die, Workwear!',
    tagline: "Derek Guy's Critiques on Proportions, Vintage Craft & Silhouettes",
    siteUrl: 'https://dieworkwear.com',
    feedUrl: 'https://dieworkwear.com/feed/',
    brandBadge: 'DIE, WORKWEAR!',
    brandColor: '#204060', // Indigo Navy
    enabled: true,
    category: 'Menswear Criticism',
    logoLetter: 'DW',
  },
  {
    id: 'put-this-on',
    name: 'Put This On',
    tagline: 'A Guide to Dressing Like a Grownup & Vintage Haberdashery Scouting',
    siteUrl: 'https://putthison.com',
    feedUrl: 'https://putthison.com/feed/',
    brandBadge: 'PUT THIS ON',
    brandColor: '#536551', // Olive Drab
    enabled: false,
    category: 'Menswear & Vintage',
    logoLetter: 'PO',
  },
];

export const DEFAULT_FEED_SETTINGS: EditorialFeedSettings = {
  activeSourceIds: ['drakes', 'suitsupply', 'the-rake', 'permanent-style', 'die-workwear'],
  customSources: [],
  savedArticleIds: [],
  autoRefreshMinutes: 30,
  defaultViewMode: 'magazine',
};

const STORAGE_SETTINGS_KEY = 'wardrobe_editorial_feed_settings_v1';
const STORAGE_CACHE_KEY = 'wardrobe_editorial_feed_cache_v1';

export function getEditorialSettings(): EditorialFeedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FEED_SETTINGS,
        ...parsed,
        activeSourceIds: parsed.activeSourceIds || DEFAULT_FEED_SETTINGS.activeSourceIds,
        customSources: parsed.customSources || [],
        savedArticleIds: parsed.savedArticleIds || [],
      };
    }
  } catch (e) {
    console.warn('Failed to load editorial settings from localStorage', e);
  }
  return DEFAULT_FEED_SETTINGS;
}

export function saveEditorialSettings(settings: EditorialFeedSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save editorial settings', e);
  }
}

// Fallback / Base Curated Articles for high fidelity whenever remote RSS is unreachable or delayed
export const CURATED_EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    id: 'drakes-transatlantic-autumn-lookbook',
    title: "Drake's Transatlantic Autumn: Corduroy, Soft Shoulders & Shetland Tweeds",
    sourceId: 'drakes',
    sourceName: "Drake's",
    brandBadge: "DRAKE'S LONDON",
    brandColor: '#2D3E33',
    siteUrl: 'https://www.drakes.com',
    articleUrl: 'https://www.drakes.com/editorial/autumn-winter-transatlantic-wardrobe',
    author: 'Michael Hill',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    summary:
      "A deep dive into Drake's signature blend of Savile Row haberdashery and relaxed American Ivy League nonchalance. Featuring wide-wale needlecord trousers paired with brushed Shetland knitwear, unconstructed games blazers, and mac coats designed to weather London and New York drizzle.",
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    tags: ['Tailoring', 'Knitwear', 'Ivy Style', 'Shetland Wool', 'Autumn/Winter'],
    readTimeMinutes: 5,
    stylingNotes:
      'Pair an unconstructed forest green corduroy suit with an ecru brushed cotton button-down and tobacco suede chukkas.',
    suggestedGarments: [
      {
        name: 'Unconstructed Needlecord Blazer',
        category: 'Tailoring',
        estimatedPriceGbp: 895,
        reason: 'Versatile soft-shoulder jacket that pairs seamlessly with denim or flannel trousers.',
      },
      {
        name: 'Brushed Shetland Wool Crewneck',
        category: 'Knitwear',
        estimatedPriceGbp: 195,
        reason: 'Adds rich tactile texture and micro-layer warmth without bulk.',
      },
    ],
  },
  {
    id: 'permanent-style-worsted-flannel-guide',
    title: 'The Sartorial Taxonomy of Flannel: Woollen vs Worsted and How to Wear Them',
    sourceId: 'permanent-style',
    sourceName: 'Permanent Style',
    brandBadge: 'PERMANENT STYLE',
    brandColor: '#8C7355',
    siteUrl: 'https://www.permanentstyle.com',
    articleUrl: 'https://www.permanentstyle.com/2026/09/a-guide-to-woollen-vs-worsted-flannel.html',
    author: 'Simon Crompton',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    summary:
      'A masterclass exploring why Fox Brothers woollen flannel holds its shape differently from Italian worsted alternatives. Simon explores the drape, breathability, and crease recovery across weights from 11oz to 16oz, with guidance on pairing with fine gauge merino and cordovan loafers.',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
    tags: ['Bespoke', 'Fabrics', 'Flannel', 'Fox Brothers', 'Tailoring'],
    readTimeMinutes: 7,
    stylingNotes:
      'Opt for mid-grey high-rise woollen flannel trousers with 2-inch turn-ups to give weight to winter tailoring.',
    suggestedGarments: [
      {
        name: 'Fox Brothers Mid-Grey Flannel Trousers',
        category: 'Trousers',
        estimatedPriceGbp: 340,
        reason: 'The single most versatile autumn/winter separate in classic menswear.',
      },
    ],
  },
  {
    id: 'the-rake-double-breasted-modern-revival',
    title: 'The Rebirth of the Double-Breasted Suit: Relaxed Italian Drape for Everyday Wear',
    sourceId: 'the-rake',
    sourceName: 'The Rake',
    brandBadge: 'THE RAKE',
    brandColor: '#841B1B',
    siteUrl: 'https://therake.com',
    articleUrl: 'https://therake.com/stories/style/the-modern-double-breasted-suit-revival',
    author: 'Wei Koh',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago
    summary:
      "Gone are the stiff, padded 1980s power suits. Today's modern 6x2 and 4x1 double-breasted silhouettes feature spalla camicia Neapolitan shoulders, lightweight canvassing, and extended trouser waistbands. Explore how to dress it down effortlessly with a fine-gauge rollneck and tassel loafers.",
    imageUrl: 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=80',
    tags: ['Tailoring', 'Double-Breasted', 'Neapolitan', 'The Rake', 'Formalwear'],
    readTimeMinutes: 6,
    stylingNotes:
      'Fasten only the anchor button or leave it unbuttoned when tailored with an ultra-light floating canvas.',
    suggestedGarments: [
      {
        name: 'Navy Solaro 6x2 Double-Breasted Jacket',
        category: 'Tailoring',
        estimatedPriceGbp: 950,
        reason: 'Offers dramatic lapel sweep while retaining Mediterranean comfort.',
      },
    ],
  },
  {
    id: 'suitsupply-pure-cashmere-overcoat-study',
    title: 'Suitsupply Journal: Pure Italian Cashmere & The Anatomy of The Balmacaan',
    sourceId: 'suitsupply',
    sourceName: 'Suitsupply',
    brandBadge: 'SUITSUPPLY',
    brandColor: '#1A1A1A',
    siteUrl: 'https://suitsupply.com',
    articleUrl: 'https://suitsupply.com/en-gb/journal/outerwear/cashmere-balmacaan-overcoat',
    author: 'Suitsupply Design Studio',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    summary:
      'An in-depth look into sourcing raw fibre from Inner Mongolia before spinning in the historic mills of Biella, Italy. The raglan-sleeved Balmacaan overcoat merges weatherproof practicality with unlined fluid movement over chunky knitwear and suit jackets alike.',
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=80',
    tags: ['Outerwear', 'Cashmere', 'Italian Mills', 'Overcoats', 'Winter'],
    readTimeMinutes: 4,
    stylingNotes:
      'The raglan sleeve cut drapes naturally over both soft-shoulder sport coats and chunky aran knitwear without bunching.',
    suggestedGarments: [
      {
        name: 'Oatmeal Cashmere Balmacaan Overcoat',
        category: 'Outerwear',
        estimatedPriceGbp: 699,
        reason: 'Raglan sleeve construction allows effortless layering over heavy blazers.',
      },
    ],
  },
  {
    id: 'die-workwear-silhouette-proportions-guide',
    title: 'Why Fuller Trousers Make Everything You Own Look Better',
    sourceId: 'die-workwear',
    sourceName: 'Die, Workwear!',
    brandBadge: 'DIE, WORKWEAR!',
    brandColor: '#204060',
    siteUrl: 'https://dieworkwear.com',
    articleUrl: 'https://dieworkwear.com/2026/09/the-case-for-generous-trousers.html',
    author: 'Derek Guy',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 38).toISOString(),
    summary:
      'Derek Guy breaks down the visual geometry of classical men’s tailoring. When trousers have a higher rise and an 8.5 to 9-inch hem, they visually elongate the legs, balance the shoulders, and drape without breaking awkwardly over shoes. A visual history from 1930s Savile Row to modern bespoke.',
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Proportions', 'Trousers', 'Classic Menswear', 'Silhouette', 'Tailoring'],
    readTimeMinutes: 8,
    stylingNotes:
      'Look for forward pleats with side adjusters to eliminate bulky belt loops and maintain a clean vertical line.',
    suggestedGarments: [
      {
        name: 'High-Rise Forward-Pleat Chinos',
        category: 'Trousers',
        estimatedPriceGbp: 180,
        reason: 'Anchor classic proportion balance for both tailored sport coats and casual knitwear.',
      },
    ],
  },
  {
    id: 'drakes-haberdashery-silk-grenadine-ties',
    title: 'Drake’s Archive: The Rhythms of Como Silk and The Handcrafted Grenadine Tie',
    sourceId: 'drakes',
    sourceName: "Drake's",
    brandBadge: "DRAKE'S LONDON",
    brandColor: '#2D3E33',
    siteUrl: 'https://www.drakes.com',
    articleUrl: 'https://www.drakes.com/editorial/the-art-of-the-grenadine-tie',
    author: 'Drake’s Haberdashery',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    summary:
      'Woven on centuries-old wooden looms in Lake Como, silk grenadine remains the quintessential connoisseur neckwear. Whether in Garza Fina or Garza Grossa, its three-dimensional honeycomb weave catches light and provides tactile contrast against brushed flannel or crisp poplin.',
    imageUrl: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=80',
    tags: ['Accessories', 'Silk Grenadine', 'Drake’s London', 'Neckwear', 'Craft'],
    readTimeMinutes: 4,
    stylingNotes:
      'A midnight navy or forest green Garza Grossa tie pairs effortlessly with a grey tweed jacket or chalk-stripe suit.',
    suggestedGarments: [
      {
        name: 'Hand-Rolled 8cm Silk Grenadine Tie',
        category: 'Accessories',
        estimatedPriceGbp: 165,
        reason: 'Unmatched texture that bridges formal suitings and casual tweed separates.',
      },
    ],
  },
  {
    id: 'permanent-style-suede-loafers-year-round',
    title: 'How to Wear Suede Loafers in Autumn and Winter Without Damaging Them',
    sourceId: 'permanent-style',
    sourceName: 'Permanent Style',
    brandBadge: 'PERMANENT STYLE',
    brandColor: '#8C7355',
    siteUrl: 'https://www.permanentstyle.com',
    articleUrl: 'https://www.permanentstyle.com/2026/09/wearing-suede-in-winter.html',
    author: 'Simon Crompton',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    summary:
      'Debunking the myth that suede is only for sunny Italian summers. High-quality reverse calf with a nano-protector spray and rubber Dainite or Vibram half-soles can resist London rain better than calf leather while offering superior softness and warmth.',
    imageUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1200&q=80',
    tags: ['Footwear', 'Suede', 'Care Guide', 'Loafers', 'Shoecare'],
    readTimeMinutes: 5,
    stylingNotes:
      'Dark chocolate or snuff suede provides natural contrast against stone chinos and charcoal flannels.',
    suggestedGarments: [
      {
        name: 'Dark Brown Suede Penny Loafers (City Rubber Sole)',
        category: 'Shoes',
        estimatedPriceGbp: 420,
        reason: 'Four-season versatility that pairs with tailored flannel, corduroy, and raw denim.',
      },
    ],
  },
  {
    id: 'the-rake-craft-of-neapolitan-shoulders',
    title: 'The Art of Spalla Camicia: Inside the Atelier of Neapolitan Master Tailors',
    sourceId: 'the-rake',
    sourceName: 'The Rake',
    brandBadge: 'THE RAKE',
    brandColor: '#841B1B',
    siteUrl: 'https://therake.com',
    articleUrl: 'https://therake.com/stories/craft/the-secret-of-neapolitan-tailoring',
    author: 'Christian Barker',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    summary:
      'Step inside the sunlit workshops of Naples where tailors gather the sleeve head with tiny pleats to form the famed "shirt shoulder". Discover why this relaxed construction offers total arm freedom while looking undeniably nonchalant.',
    imageUrl: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=1200&q=80',
    tags: ['Bespoke', 'Neapolitan', 'Craftsmanship', 'Tailoring', 'Sartorial'],
    readTimeMinutes: 6,
    stylingNotes:
      'Look for subtle shirring at the shoulder seam; it should look handmade and effortless, never stiff.',
    suggestedGarments: [
      {
        name: 'Spalla Camicia Hopsack Blazer',
        category: 'Tailoring',
        estimatedPriceGbp: 750,
        reason: 'Breathable open-weave hopsack with zero shoulder padding for year-round comfort.',
      },
    ],
  },
];

/**
 * Fetches editorial feeds from the server endpoint /api/editorial-feeds,
 * falling back smoothly to curated editorial archives if offline or rate-limited.
 */
export async function fetchEditorialFeed(options?: {
  sources?: string[];
  forceRefresh?: boolean;
}): Promise<{
  articles: EditorialArticle[];
  sources: EditorialFeedSource[];
  lastUpdated: string;
  isLive: boolean;
}> {
  const settings = getEditorialSettings();
  const allSources = [...DEFAULT_EDITORIAL_SOURCES, ...settings.customSources];
  const activeSources = allSources.filter((s) => settings.activeSourceIds.includes(s.id));

  // Check cached data if not force refresh
  if (!options?.forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const ageMinutes = (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60);
        if (ageMinutes < (settings.autoRefreshMinutes || 30)) {
          // Merge saved state
          const merged = (cached.articles || []).map((art: EditorialArticle) => ({
            ...art,
            isSaved: settings.savedArticleIds.includes(art.id),
          }));
          return {
            articles: merged,
            sources: allSources,
            lastUpdated: cached.lastUpdated,
            isLive: true,
          };
        }
      }
    } catch (e) {
      console.warn('Cache read error', e);
    }
  }

  // Attempt live server fetch
  try {
    const activeIds = (options?.sources || settings.activeSourceIds).join(',');
    const customJson = JSON.stringify(settings.customSources);
    const url = `/api/editorial-feeds?sources=${encodeURIComponent(activeIds)}&customSources=${encodeURIComponent(
      customJson
    )}&t=${Date.now()}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        const mergedArticles = data.articles.map((art: EditorialArticle) => ({
          ...art,
          isSaved: settings.savedArticleIds.includes(art.id),
        }));

        // Cache successful response
        localStorage.setItem(
          STORAGE_CACHE_KEY,
          JSON.stringify({
            articles: mergedArticles,
            lastUpdated: new Date().toISOString(),
          })
        );

        return {
          articles: mergedArticles,
          sources: allSources,
          lastUpdated: new Date().toISOString(),
          isLive: true,
        };
      }
    }
  } catch (err) {
    console.warn('Live editorial feed server fetch failed or timed out, using curated baseline:', err);
  }

  // Graceful Fallback: Curated baseline filtered by active sources
  const fallbackFiltered = CURATED_EDITORIAL_ARTICLES.filter((art) =>
    settings.activeSourceIds.includes(art.sourceId)
  ).map((art) => ({
    ...art,
    isSaved: settings.savedArticleIds.includes(art.id),
  }));

  return {
    articles: fallbackFiltered.length > 0 ? fallbackFiltered : CURATED_EDITORIAL_ARTICLES,
    sources: allSources,
    lastUpdated: new Date().toISOString(),
    isLive: false,
  };
}

/**
 * Validates a custom RSS / Atom feed URL
 */
export async function testRssFeedUrl(url: string): Promise<{
  valid: boolean;
  title?: string;
  description?: string;
  itemCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/editorial-feeds/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        valid: false,
        error: errData.error || `HTTP ${res.status} response when fetching feed.`,
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Unable to connect to feed URL.',
    };
  }
}

/**
 * Converts an editorial article suggested piece into a Wardrobe ShoppingItem
 */
export function convertEditorialPieceToShoppingItem(
  article: EditorialArticle,
  garment: {
    name: string;
    category: Category;
    estimatedPriceGbp: number;
    reason: string;
  }
): Omit<ShoppingItem, 'id' | 'createdAt'> {
  return {
    name: garment.name,
    brand: article.sourceName,
    category: garment.category,
    estimatedPrice: garment.estimatedPriceGbp || 150,
    priority: 'Medium',
    status: 'Researching',
    season: 'All-Season',
    matchingWardrobeItemIds: [],
    addedDate: new Date().toISOString().split('T')[0],
    reasonOrGap: `Inspired by editorial "${article.title}" from ${article.sourceName}: ${garment.reason}`,
    imageUrl: article.imageUrl,
    tags: ['Editorial', article.sourceName, ...article.tags.slice(0, 2)],
    notes: `Article URL: ${article.articleUrl}\nStyling notes: ${article.stylingNotes || ''}`,
    estimatedWearsPerYear: 30,
  };
}
