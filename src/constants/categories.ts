/**
 * Centralized Category Constants & Taxonomy Configuration
 * 
 * Single source of truth for all apparel and homeware categories,
 * taxonomy classification, synonym resolution, and safe fallbacks
 * across the entire application.
 */

export type Category = string;

/**
 * Standard Canonical Garment Categories in curated sartorial display order
 */
export const CANONICAL_GARMENT_CATEGORIES: readonly string[] = [
  'Outerwear',
  'Knitwear',
  'Shirts',
  'T-Shirts',
  'Tops',
  'Bottoms',
  'Trousers',
  'Jeans',
  'Tailoring',
  'Coats',
  'Jacket',
  'Dresses & Jumpsuits',
  'Shoes',
  'Shoe Care',
  'Shoe Care & Maintenance',
  'Bags',
  'Accessories',
  'Resort Wear',
  'Socks',
  'Formalwear',
  'Activewear',
] as const;

/**
 * Standard Canonical Homeware & Lifestyle Categories in curated display order
 */
export const CANONICAL_HOMEWARE_CATEGORIES: readonly string[] = [
  'Homeware',
  'Home Bar & Glassware',
  'Furniture & Living',
  'Lighting & Lamps',
  'Audio & Tech',
  'Electronics & Tech',
  'Cameras & Optics',
  'Hobbies & Instruments',
  'Vinyl',
  'Art & Books',
  'Textiles & Bedding',
  'Tableware & Dining',
  'Kitchen & Cookware',
  'Decor & Vases',
  'Tools & EDC',
  'Misc Homeware',
] as const;

/**
 * Default Garment Categories for initialization
 */
export const DEFAULT_GARMENT_CATEGORIES: string[] = [
  'Outerwear',
  'Knitwear',
  'Shirts',
  'T-Shirts',
  'Tops',
  'Bottoms',
  'Trousers',
  'Jeans',
  'Tailoring',
  'Coats',
  'Jacket',
  'Dresses & Jumpsuits',
  'Shoes',
  'Shoe Care',
  'Bags',
  'Accessories',
  'Resort Wear',
  'Socks',
  'Formalwear',
  'Activewear',
];

/**
 * Default Homeware Categories for initialization
 */
export const DEFAULT_HOMEWARE_CATEGORIES: string[] = [
  'Homeware',
  'Home Bar & Glassware',
  'Furniture & Living',
  'Lighting & Lamps',
  'Audio & Tech',
  'Electronics & Tech',
  'Cameras & Optics',
  'Hobbies & Instruments',
  'Vinyl',
  'Art & Books',
  'Textiles & Bedding',
  'Tableware & Dining',
  'Kitchen & Cookware',
  'Decor & Vases',
  'Tools & EDC',
  'Misc Homeware',
];

/**
 * Case-insensitively deduplicates a category list while preserving proper title casing
 */
export const deduplicateCategoriesCaseInsensitive = (cats: string[]): string[] => {
  const seen = new Map<string, string>();
  for (const cat of cats) {
    if (!cat || !cat.trim()) continue;
    const trimmed = cat.trim();
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, trimmed);
    } else {
      const existing = seen.get(lower)!;
      // Prefer Title Case over lowercase
      if (trimmed[0] === trimmed[0].toUpperCase() && existing[0] !== existing[0].toUpperCase()) {
        seen.set(lower, trimmed);
      }
    }
  }
  return Array.from(seen.values());
};

/**
 * Single source of truth combined category array
 */
export const DEFAULT_CATEGORIES: string[] = deduplicateCategoriesCaseInsensitive([
  ...DEFAULT_GARMENT_CATEGORIES,
  ...DEFAULT_HOMEWARE_CATEGORIES,
]);

/**
 * Returns true if a given category belongs to the homeware / lifestyle taxonomy.
 * 
 * Strict taxonomy rules:
 * 1. Shoe Care and shoe trees ALWAYS belong to Wardrobe / Garments (never homeware or electronics)
 * 2. User's explicit customGarmentCategories takes precedence (returns false)
 * 3. User's explicit customHomewareCategories takes precedence (returns true)
 * 4. Checks against DEFAULT_HOMEWARE_CATEGORIES and homeware keywords
 */
export const isHomewareCategory = (
  category: string | undefined | null,
  customGarmentCategories?: string[],
  customHomewareCategories?: string[]
): boolean => {
  if (!category) return false;
  const lower = category.trim().toLowerCase();

  // If user has explicitly placed this category in customGarmentCategories, it is NOT homeware
  if (customGarmentCategories && customGarmentCategories.some((c) => c.toLowerCase() === lower)) {
    return false;
  }
  // If user has explicitly placed this category in customHomewareCategories, it IS homeware
  if (customHomewareCategories && customHomewareCategories.some((c) => c.toLowerCase() === lower)) {
    return true;
  }

  // Shoe care and shoe trees explicitly belong to wardrobe / footwear, never homeware or electronics
  if (
    lower === 'shoe care' ||
    lower === 'shoecare' ||
    lower === 'shoe care & maintenance' ||
    lower.includes('shoe care') ||
    lower.includes('shoe tree')
  ) {
    return false;
  }

  const homewareKeywords = [
    'homeware',
    'homebar',
    'home bar',
    'barware',
    'bar & glassware',
    'drinkware',
    'glassware',
    'cocktail',
    'decanter',
    'vinyl',
    'bedding',
    'textiles',
    'tableware',
    'dining',
    'kitchen',
    'cookware',
    'lighting',
    'lamps',
    'decor',
    'vases',
    'furniture',
    'living',
    'audio',
    'tech',
    'electronics',
    'gadget',
    'camera',
    'hobby',
    'hobbies',
    'instrument',
    'tool',
    'books',
    'art & books',
    'cigar',
    'humidor',
    'misc homeware',
  ];

  return (
    DEFAULT_HOMEWARE_CATEGORIES.some((c) => c.toLowerCase() === lower) ||
    homewareKeywords.some((kw) => lower.includes(kw))
  );
};

/**
 * Normalizes a category string to a valid safe name
 */
export const normalizeCategoryName = (
  category: string | undefined | null,
  availableCategories: string[] = DEFAULT_CATEGORIES
): string => {
  if (!category || !category.trim()) return '';
  return canonicalizeCategory(category, availableCategories);
};

/**
 * Common Category Synonyms / Colloquial Variations
 * Maps user or scraper variations to their primary canonical equivalent
 */
export const CATEGORY_SYNONYMS: Record<string, string> = {
  // Footwear & Shoe Care
  footwear: 'Shoes',
  shoe: 'Shoes',
  boots: 'Shoes',
  boot: 'Shoes',
  sneakers: 'Shoes',
  sneaker: 'Shoes',
  trainers: 'Shoes',
  trainer: 'Shoes',
  loafers: 'Shoes',
  loafer: 'Shoes',
  derbies: 'Shoes',
  derby: 'Shoes',
  oxfords: 'Shoes',
  mules: 'Shoes',
  slides: 'Shoes',
  sandals: 'Shoes',
  shoecare: 'Shoe Care',
  'shoe care': 'Shoe Care',
  'shoe care & maintenance': 'Shoe Care',
  'shoe trees': 'Shoe Care',
  'shoe tree': 'Shoe Care',

  // Bottoms
  pants: 'Bottoms',
  pant: 'Bottoms',
  trousers: 'Trousers',
  trouser: 'Trousers',
  chinos: 'Bottoms',
  chino: 'Bottoms',
  slacks: 'Bottoms',
  denim: 'Jeans',
  jean: 'Jeans',
  jeans: 'Jeans',
  shorts: 'Bottoms',

  // Tops & Knitwear
  sweater: 'Knitwear',
  sweaters: 'Knitwear',
  jumper: 'Knitwear',
  jumpers: 'Knitwear',
  cardigan: 'Knitwear',
  cardigans: 'Knitwear',
  crewneck: 'Knitwear',
  rollneck: 'Knitwear',
  turtleneck: 'Knitwear',
  hoodie: 'Knitwear',
  hoodies: 'Knitwear',
  sweatshirt: 'Knitwear',
  sweatshirts: 'Knitwear',
  pullover: 'Knitwear',
  shirt: 'Shirts',
  shirts: 'Shirts',
  'button-down': 'Shirts',
  tshirt: 'T-Shirts',
  't-shirt': 'T-Shirts',
  't-shirts': 'T-Shirts',
  tee: 'T-Shirts',
  tees: 'T-Shirts',
  polo: 'Tops',
  polos: 'Tops',

  // Outerwear
  coat: 'Outerwear',
  coats: 'Outerwear',
  jacket: 'Outerwear',
  jackets: 'Outerwear',
  overcoat: 'Outerwear',
  overcoats: 'Outerwear',
  parka: 'Outerwear',
  parkas: 'Outerwear',
  trench: 'Outerwear',
  trenchcoat: 'Outerwear',
  blazer: 'Tailoring',
  blazers: 'Tailoring',
  overshirt: 'Outerwear',
  shacket: 'Outerwear',
  bomber: 'Outerwear',
  windbreaker: 'Outerwear',
  anorak: 'Outerwear',
  gilet: 'Outerwear',

  // Tailoring
  suit: 'Tailoring',
  suits: 'Tailoring',
  'suits & tailoring': 'Tailoring',
  tuxedo: 'Tailoring',
  waistcoat: 'Tailoring',

  // Accessories
  accessory: 'Accessories',
  jewellery: 'Accessories',
  jewelry: 'Accessories',
  belts: 'Accessories',
  belt: 'Accessories',
  scarves: 'Accessories',
  scarf: 'Accessories',
  hats: 'Accessories',
  hat: 'Accessories',
  cap: 'Accessories',
  sunglasses: 'Accessories',
  watches: 'Accessories',
  watch: 'Accessories',
  ties: 'Accessories',
  tie: 'Accessories',
  'pocket square': 'Accessories',

  // Homeware
  homebar: 'Home Bar & Glassware',
  'home bar': 'Home Bar & Glassware',
  barware: 'Home Bar & Glassware',
  glassware: 'Home Bar & Glassware',
  records: 'Vinyl',
  record: 'Vinyl',
  'vinyl records': 'Vinyl',
  electronics: 'Electronics & Tech',
  tech: 'Audio & Tech',
  audio: 'Audio & Tech',
  ceramics: 'Tableware & Dining',
  pottery: 'Tableware & Dining',
  crockery: 'Tableware & Dining',
  linen: 'Textiles & Bedding',
  bedding: 'Textiles & Bedding',
  lamp: 'Lighting & Lamps',
  lamps: 'Lighting & Lamps',
  lighting: 'Lighting & Lamps',
  furniture: 'Furniture & Living',
  books: 'Art & Books',
  book: 'Art & Books',
};

/**
 * Returns a guaranteed non-empty list of categories from the single source of truth
 */
export function getSafeCategories(userCategories?: string[]): string[] {
  if (Array.isArray(userCategories) && userCategories.length > 0) {
    return deduplicateCategoriesCaseInsensitive(userCategories);
  }
  return [...DEFAULT_CATEGORIES];
}

/**
 * Canonicalizes a category name against standard synonyms and existing user categories
 */
/**
 * Canonicalizes a category name against standard synonyms and existing user categories.
 * When availableCategories are provided, it strictly resolves only to a category present in
 * availableCategories (e.g. mapping 'Outerwear' to 'Coats' if the user defined 'Coats').
 */
export function canonicalizeCategory(
  rawCategory: string | undefined | null,
  availableCategories?: string[]
): string {
  if (!rawCategory || !rawCategory.trim()) {
    return '';
  }

  const clean = rawCategory.trim();
  const lower = clean.toLowerCase();

  const hasAvailable = Array.isArray(availableCategories) && availableCategories.length > 0;

  // 1. Direct exact match in available categories (case-insensitive)
  if (hasAvailable) {
    const existing = availableCategories.find((c) => c.toLowerCase() === lower);
    if (existing) return existing;
  }

  // Helper to find a category in available categories matching any regex
  const findInAvailable = (patterns: RegExp[]): string | undefined => {
    if (!hasAvailable) return undefined;
    for (const pat of patterns) {
      const match = availableCategories.find((c) => pat.test(c.toLowerCase()));
      if (match) return match;
    }
    return undefined;
  };

  // 2. High-precision semantic family mapping against user-defined categories
  if (hasAvailable) {
    // Outerwear / Coats / Jackets family
    if (
      /\b(outerwear|outer wear|coat|coats|jacket|jackets|overcoat|overcoats|parka|parkas|puffer|puffers|trench|trenchcoat|windbreaker|anorak|shearling|bomber|gilet|cape)\b/i.test(lower)
    ) {
      // Prioritize Coats first if defined by user, then Outerwear, then Jackets, then Tailoring
      const matched = findInAvailable([/^coats?$/i, /^outerwear$/i, /^jackets?$/i, /^tailoring$/i]);
      if (matched) return matched;
    }

    // Knitwear / Sweaters family
    if (
      /\b(knit|knitwear|sweater|sweaters|jumper|jumpers|cardigan|cardigans|pullover|crewneck|rollneck|turtleneck|hoodie|sweatshirt|fleece)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^knitwear$/i, /^knit/i, /^tops?$/i]);
      if (matched) return matched;
    }

    // T-Shirts family
    if (
      /\b(t-?shirt|t-?shirts|tshirt|tshirts|tee|tees|graphic tee)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^t-?shirts?$/i, /^tops?$/i, /^shirts?$/i]);
      if (matched) return matched;
    }

    // Shirts family
    if (
      /\b(shirt|shirts|button-down|oxford shirt|blouse|overshirt)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^shirts?$/i, /^tops?$/i]);
      if (matched) return matched;
    }

    // Tops / Polos family
    if (
      /\b(top|tops|polo|polos|tank|camisole|vest)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^tops?$/i, /^shirts?$/i, /^t-?shirts?$/i]);
      if (matched) return matched;
    }

    // Trousers & Pants family
    if (
      /\b(trouser|trousers|pant|pants|chino|chinos|slacks)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^trousers?$/i, /^bottoms?$/i, /^jeans?$/i]);
      if (matched) return matched;
    }

    // Jeans & Denim family
    if (
      /\b(jean|jeans|denim)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^jeans?$/i, /^trousers?$/i, /^bottoms?$/i]);
      if (matched) return matched;
    }

    // Bottoms / Shorts / Skirts family
    if (
      /\b(bottom|bottoms|short|shorts|skirt|skirts|legging|leggings)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^bottoms?$/i, /^trousers?$/i, /^jeans?$/i]);
      if (matched) return matched;
    }

    // Shoes & Footwear family
    if (
      /\b(shoe|shoes|footwear|boot|boots|sneaker|sneakers|trainer|trainers|loafer|loafers|derby|oxford|mule|mules|sandal|sandals|heel|heels|flats)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^shoes?$/i, /^footwear$/i]);
      if (matched) return matched;
    }

    // Shoe Care family
    if (
      /\b(shoe care|shoecare|shoe trees?|shoe polish|leather cleaner)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^shoe care/i, /^shoes?$/i, /^accessories?$/i]);
      if (matched) return matched;
    }

    // Tailoring & Formalwear family
    if (
      /\b(suit|suits|tailoring|tuxedo|waistcoat|formalwear)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^tailoring$/i, /^formalwear$/i, /^coats?$/i, /^outerwear$/i]);
      if (matched) return matched;
    }

    // Bags family
    if (
      /\b(bag|bags|handbag|tote|backpack|clutch|crossbody|briefcase|satchel|holdall|duffle)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^bags?$/i, /^accessories?$/i]);
      if (matched) return matched;
    }

    // Accessories family
    if (
      /\b(accessory|accessories|belt|belts|scarf|scarves|hat|hats|cap|beanie|sunglasses|watch|watches|tie|ties|jewel|jewelry|jewellery)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^accessories?$/i]);
      if (matched) return matched;
    }

    // Dresses & Jumpsuits family
    if (
      /\b(dress|dresses|gown|jumpsuit|jumpsuits|romper|dungarees|playsuit)\b/i.test(lower)
    ) {
      const matched = findInAvailable([/^dresses?\s*&?\s*jumpsuits?$/i, /^dresses?$/i]);
      if (matched) return matched;
    }

    // Check generic synonym map, and resolve its target against available categories
    if (CATEGORY_SYNONYMS[lower]) {
      const synTarget = CATEGORY_SYNONYMS[lower];
      const directSyn = availableCategories.find((c) => c.toLowerCase() === synTarget.toLowerCase());
      if (directSyn) return directSyn;

      // If synonym target is 'Outerwear' and user has 'Coats', resolve to 'Coats'
      if (synTarget.toLowerCase() === 'outerwear') {
        const coats = findInAvailable([/^coats?$/i, /^outerwear$/i, /^jackets?$/i]);
        if (coats) return coats;
      }
      if (synTarget.toLowerCase() === 'bottoms') {
        const tr = findInAvailable([/^trousers?$/i, /^bottoms?$/i, /^jeans?$/i]);
        if (tr) return tr;
      }
      if (synTarget.toLowerCase() === 'shoes') {
        const sh = findInAvailable([/^shoes?$/i, /^footwear$/i]);
        if (sh) return sh;
      }
    }

    // Check partial substring match among user's defined categories
    const substringMatch = availableCategories.find(
      (c) => lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower)
    );
    if (substringMatch) return substringMatch;

    // STRICT USER REQUIREMENT: When availableCategories are provided, ONLY choose from them.
    // If no reasonable match exists, return empty string '' rather than an alien un-defined category!
    return '';
  }

  // 3. Fallback when NO availableCategories is provided: match against canonical lists and synonyms
  const canonicalAll = [...CANONICAL_GARMENT_CATEGORIES, ...CANONICAL_HOMEWARE_CATEGORIES];
  const canonicalMatch = canonicalAll.find((c) => c.toLowerCase() === lower);
  if (canonicalMatch) return canonicalMatch;

  if (CATEGORY_SYNONYMS[lower]) {
    return CATEGORY_SYNONYMS[lower];
  }

  return clean;
}

/**
 * Grouped categories result object
 */
export interface GroupedCategoriesResult {
  garmentCategories: string[];
  homewareCategories: string[];
  allCategories: string[];
}

/**
 * Groups available categories into Apparel and Homeware sets
 * Guarantees that currentCategory is included so existing item data is never masked
 */
export function getGroupedCategories(
  userCategories?: string[],
  currentCategory?: string,
  preferHomewareFirst: boolean = false,
  customGarments?: string[],
  customHomeware?: string[]
): GroupedCategoriesResult {
  if (customGarments && customGarments.length > 0 && customHomeware && customHomeware.length > 0) {
    const garments = deduplicateCategoriesCaseInsensitive([...customGarments]);
    const homeware = deduplicateCategoriesCaseInsensitive([...customHomeware]);
    if (currentCategory && currentCategory.trim()) {
      const clean = currentCategory.trim();
      const inG = garments.some((c) => c.toLowerCase() === clean.toLowerCase());
      const inH = homeware.some((c) => c.toLowerCase() === clean.toLowerCase());
      if (!inG && !inH) {
        if (isHomewareCategory(clean, garments, homeware)) {
          homeware.push(clean);
        } else {
          garments.push(clean);
        }
      }
    }
    return {
      garmentCategories: garments,
      homewareCategories: homeware,
      allCategories: preferHomewareFirst ? [...homeware, ...garments] : [...garments, ...homeware],
    };
  }

  const safe = getSafeCategories(userCategories);
  const set = new Set(safe);

  // Guarantee current category is in the set
  if (currentCategory && currentCategory.trim() && !set.has(currentCategory.trim())) {
    set.add(currentCategory.trim());
  }

  const all = Array.from(set);

  const garments: string[] = [];
  const homeware: string[] = [];

  for (const cat of all) {
    if (isHomewareCategory(cat, customGarments, customHomeware)) {
      homeware.push(cat);
    } else {
      garments.push(cat);
    }
  }

  return {
    garmentCategories: garments,
    homewareCategories: homeware,
    allCategories: preferHomewareFirst ? [...homeware, ...garments] : [...garments, ...homeware],
  };
}
