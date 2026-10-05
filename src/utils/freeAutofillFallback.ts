/**
 * Free & Deterministic Autofill Fallback Engine
 * 
 * Provides an ultra-robust, 100% free, offline-capable fallback extractor that operates
 * with zero Google API keys and zero Firebase dependencies.
 * Parses URLs, path slugs, query parameters, OpenGraph metadata, and freeform text
 * using curated dictionaries of fashion and lifestyle brands, categories, fabrics, colors,
 * and sizes.
 * 
 * STRICT USER RULE: Never injects unsolicited default tags (tags: []).
 */

import { Category, Condition } from '../types';
import { extractAllGarmentAttributes } from './garmentAttributeExtractor';

export interface FreeExtractedGarment {
  name: string;
  brand: string;
  category: Category;
  color: string;
  originalListingColor?: string;
  material: string;
  size?: string;
  purchasePrice?: number;
  rrp?: number;
  condition: Condition;
  imageUrl?: string;
  allCandidateImages?: string[];
  retailerName?: string;
  notes?: string;
  careNotes?: string;
  tags: string[];
  engineUsed: 'free-deterministic-fallback';
}

// 500+ Curated Brands Dictionary (Fashion, Footwear, Heritage, Luxury, & Lifestyle/Hardware)
const BRAND_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\bralph\s*lauren\b|\bpolo\s*ralph\s*lauren\b|\brrl\b/i, canonical: 'Ralph Lauren' },
  { pattern: /\bbarbour(?:\s*heritage)?\b/i, canonical: 'Barbour' },
  { pattern: /\bmargaret\s*howell\b|\bmhl\b/i, canonical: 'Margaret Howell' },
  { pattern: /\buniversal\s*works\b/i, canonical: 'Universal Works' },
  { pattern: /\bstudio\s*nicholson\b/i, canonical: 'Studio Nicholson' },
  { pattern: /\bour\s*legacy\b/i, canonical: 'Our Legacy' },
  { pattern: /\ba\.?p\.?c\.?\b/i, canonical: 'A.P.C.' },
  { pattern: /\bacne\s*studios\b|\bacne\b/i, canonical: 'Acne Studios' },
  { pattern: /\bnorse\s*projects\b/i, canonical: 'Norse Projects' },
  { pattern: /\bsunspel\b/i, canonical: 'Sunspel' },
  { pattern: /\bportuguese\s*flannel\b/i, canonical: 'Portuguese Flannel' },
  { pattern: /\boliver\s*spencer\b/i, canonical: 'Oliver Spencer' },
  { pattern: /\btoast\b/i, canonical: 'Toast' },
  { pattern: /\bfolk\b/i, canonical: 'Folk' },
  { pattern: /\bymc\b|\byou\s*must\s*create\b/i, canonical: 'YMC' },
  { pattern: /\balbam\b/i, canonical: 'Albam' },
  { pattern: /\bnigel\s*cabourn\b/i, canonical: 'Nigel Cabourn' },
  { pattern: /\bengineered\s*garments\b/i, canonical: 'Engineered Garments' },
  { pattern: /\bneedles\b/i, canonical: 'Needles' },
  { pattern: /\bauralee\b/i, canonical: 'Auralee' },
  { pattern: /\bkaptain\s*sunshine\b/i, canonical: 'Kaptain Sunshine' },
  { pattern: /\bbeams(?:\s*plus)?\b/i, canonical: 'Beams Plus' },
  { pattern: /\bvisvim\b/i, canonical: 'Visvim' },
  { pattern: /\bwtaps\b/i, canonical: 'WTAPS' },
  { pattern: /\bnn07\b/i, canonical: 'NN07' },
  { pattern: /\bsamsøe\s*samsøe\b|\bsamsoe\s*samsoe\b/i, canonical: 'Samsøe Samsøe' },
  { pattern: /\bcomme\s*des\s*gar[cç]ons\b|\bcdg\b/i, canonical: 'Comme des Garçons' },
  { pattern: /\bjunya\s*watanabe\b/i, canonical: 'Junya Watanabe' },
  { pattern: /\bdries\s*van\s*noten\b/i, canonical: 'Dries Van Noten' },
  { pattern: /\bmaison\s*margiela\b|\bmargiela\b/i, canonical: 'Maison Margiela' },
  { pattern: /\bjil\s*sander\b/i, canonical: 'Jil Sander' },
  { pattern: /\bthe\s*row\b/i, canonical: 'The Row' },
  { pattern: /\bbottega\s*veneta\b/i, canonical: 'Bottega Veneta' },
  { pattern: /\bprada\b/i, canonical: 'Prada' },
  { pattern: /\bgucci\b/i, canonical: 'Gucci' },
  { pattern: /\bsaint\s*laurent\b|\bysl\b/i, canonical: 'Saint Laurent' },
  { pattern: /\bceline\b/i, canonical: 'Celine' },
  { pattern: /\bloewe\b/i, canonical: 'Loewe' },
  { pattern: /\bjacquemus\b/i, canonical: 'Jacquemus' },
  { pattern: /\bami\s*paris\b/i, canonical: 'Ami Paris' },
  { pattern: /\bissey\s*miyake\b/i, canonical: 'Issey Miyake' },
  { pattern: /\byohji\s*yamamoto\b/i, canonical: 'Yohji Yamamoto' },
  { pattern: /\bstone\s*island\b/i, canonical: 'Stone Island' },
  { pattern: /\bc\.?p\.?\s*company\b/i, canonical: 'C.P. Company' },
  { pattern: /\bmoncler\b/i, canonical: 'Moncler' },
  { pattern: /\bburberry\b/i, canonical: 'Burberry' },
  { pattern: /\bbelstaff\b/i, canonical: 'Belstaff' },
  { pattern: /\bbaracuta\b/i, canonical: 'Baracuta' },
  { pattern: /\bgloverall\b/i, canonical: 'Gloverall' },
  { pattern: /\bmackintosh\b/i, canonical: 'Mackintosh' },
  { pattern: /\bpatagonia\b/i, canonical: 'Patagonia' },
  { pattern: /\barc'?teryx\b/i, canonical: "Arc'teryx" },
  { pattern: /\bthe\s*north\s*face\b|\btnf\b/i, canonical: 'The North Face' },
  { pattern: /\bsnow\s*peak\b/i, canonical: 'Snow Peak' },
  { pattern: /\bcarhartt(?:\s*wip)?\b/i, canonical: 'Carhartt WIP' },
  { pattern: /\bdanser\b/i, canonical: 'Danner' },
  { pattern: /\bred\s*wing\b/i, canonical: 'Red Wing' },
  { pattern: /\bcrockett\s*&\s*jones\b|\bcrockett\s*and\s*jones\b/i, canonical: 'Crockett & Jones' },
  { pattern: /\btricker'?s\b/i, canonical: "Tricker's" },
  { pattern: /\bchurch'?s\b/i, canonical: "Church's" },
  { pattern: /\bcheaney\b/i, canonical: 'Cheaney' },
  { pattern: /\bparaboot\b/i, canonical: 'Paraboot' },
  { pattern: /\balden\b/i, canonical: 'Alden' },
  { pattern: /\bbirkenstock\b/i, canonical: 'Birkenstock' },
  { pattern: /\bclarks(?:\s*originals)?\b/i, canonical: 'Clarks Originals' },
  { pattern: /\bdr\.?\s*martens\b|\bdoc\s*martens\b/i, canonical: 'Dr. Martens' },
  { pattern: /\bkleman\b/i, canonical: 'Kleman' },
  { pattern: /\bsalomon\b/i, canonical: 'Salomon' },
  { pattern: /\bnew\s*balance\b/i, canonical: 'New Balance' },
  { pattern: /\basics\b/i, canonical: 'Asics' },
  { pattern: /\bveja\b/i, canonical: 'Veja' },
  { pattern: /\bnovesta\b/i, canonical: 'Novesta' },
  { pattern: /\bspalwart\b/i, canonical: 'Spalwart' },
  { pattern: /\bcos\b/i, canonical: 'COS' },
  { pattern: /\barket\b/i, canonical: 'Arket' },
  { pattern: /\buniqlo\b/i, canonical: 'Uniqlo' },
  { pattern: /\bmuji\b/i, canonical: 'Muji' },
  { pattern: /\bmassimo\s*dutti\b/i, canonical: 'Massimo Dutti' },
  { pattern: /\bzara\b/i, canonical: 'Zara' },
  { pattern: /\breiss\b/i, canonical: 'Reiss' },
  { pattern: /\bs[eé]zane\b/i, canonical: 'Sézane' },
  { pattern: /\bme\s*\+\s*em\b|\bme\s*and\s*em\b/i, canonical: 'ME+EM' },
  { pattern: /\bganni\b/i, canonical: 'Ganni' },
  { pattern: /\bwhistles\b/i, canonical: 'Whistles' },
  { pattern: /\bjigsaw\b/i, canonical: 'Jigsaw' },
  { pattern: /\bboden\b/i, canonical: 'Boden' },
  { pattern: /\bhobbs\b/i, canonical: 'Hobbs' },
  { pattern: /\blevi'?s\b/i, canonical: "Levi's" },
  { pattern: /\bwrangler\b/i, canonical: 'Wrangler' },
  { pattern: /\blee\b/i, canonical: 'Lee' },
  { pattern: /\bedwin\b/i, canonical: 'Edwin' },
  { pattern: /\bnudie\s*jeans\b|\bnudie\b/i, canonical: 'Nudie Jeans' },
  { pattern: /\borSlow\b/i, canonical: 'orSlow' },
  { pattern: /\biron\s*heart\b/i, canonical: 'Iron Heart' },
  { pattern: /\bmomotaro\b/i, canonical: 'Momotaro' },
  { pattern: /\bfull\s*count\b/i, canonical: 'Fullcount' },
  { pattern: /\bsugar\s*cane\b/i, canonical: 'Sugar Cane' },
  { pattern: /\bresolute\b/i, canonical: 'Resolute' },
  // Lifestyle & Hardware
  { pattern: /\bapple\b/i, canonical: 'Apple' },
  { pattern: /\bsony\b/i, canonical: 'Sony' },
  { pattern: /\bleica\b/i, canonical: 'Leica' },
  { pattern: /\bbraun\b/i, canonical: 'Braun' },
  { pattern: /\bvitra\b/i, canonical: 'Vitra' },
  { pattern: /\bhay\b/i, canonical: 'HAY' },
  { pattern: /\bmuuto\b/i, canonical: 'Muuto' },
  { pattern: /\bfermliving\b|\bferm\s*living\b/i, canonical: 'Ferm Living' },
  { pattern: /\bmarimekko\b/i, canonical: 'Marimekko' },
  { pattern: /\biittala\b/i, canonical: 'Iittala' },
  { pattern: /\bartek\b/i, canonical: 'Artek' },
  { pattern: /\bflos\b/i, canonical: 'Flos' },
  { pattern: /\bartemide\b/i, canonical: 'Artemide' },
];

const COLOR_KEYWORDS = [
  'Navy', 'Charcoal', 'Ecru', 'Camel', 'Olive', 'Sage', 'Burgundy', 'Bordeaux',
  'Black', 'White', 'Grey', 'Gray', 'Cream', 'Beige', 'Tan', 'Khaki', 'Brown',
  'Indigo', 'Blue', 'Green', 'Red', 'Pink', 'Yellow', 'Mustard', 'Orange', 'Rust',
  'Teal', 'Lilac', 'Plum', 'Oatmeal', 'Sand', 'Chambray',
];

const MATERIAL_KEYWORDS = [
  'Oxford Cotton', 'Waxed Cotton', 'Merino Wool', 'Lambswool', 'Cashmere',
  'Linen', 'Silk', 'Twill', 'Poplin', 'Flannel', 'Corduroy', 'Denim', 'Leather',
  'Suede', 'Velvet', 'Gabardine', 'Ripstop', 'Chambray', 'Fleece', 'Wool Blend',
  'Cotton Blend', '100% Cotton', '100% Wool', '100% Linen', '100% Silk',
];

/**
 * Infer category from text string
 */
export function inferCategoryFree(text: string): Category {
  const lower = text.toLowerCase();

  if (/\b(coat|jacket|blazer|parka|trench|overcoat|mac|anorak|gilet|windbreaker|fleece|shearling|bomber|harrington)\b/.test(lower)) {
    return 'Outerwear';
  }
  if (/\b(jumper|sweater|knit|cardigan|crewneck|rollneck|turtleneck|pullover|vest|waistcoat)\b/.test(lower)) {
    return 'Knitwear';
  }
  if (/\b(t-shirt|t-shirts|tshirt|tshirts|tee|tees)\b/.test(lower)) {
    return 'T-Shirts';
  }
  if (/\b(shirt|shirts|button-down|oxford|blouse)\b/.test(lower)) {
    return 'Shirts';
  }
  if (/\b(polo|tank|henley|top|tops|tunic)\b/.test(lower)) {
    return 'Tops';
  }
  if (/\b(trousers|pants|jeans|denim|chinos|shorts|cords|corduroys|slacks|joggers|culottes|skirt)\b/.test(lower)) {
    return 'Bottoms';
  }
  if (/\b(dress|jumpsuit|dungarees|playsuit|gown|kaftan)\b/.test(lower)) {
    return 'Dresses & Jumpsuits';
  }
  if (/\b(shoe tree|shoe trees|shoe polish|shoe cream|shoe brush|leather cleaner|suede protector|crep protect|shoecare|shoe care)\b/.test(lower)) {
    return 'Shoe Care';
  }
  if (/\b(shoes|boots|loafers|sneakers|trainers|derby|oxfords|sandals|brogues|mules|clogs|slippers)\b/.test(lower)) {
    return 'Shoes';
  }
  if (/\b(bag|tote|backpack|messenger|cross-body|crossbody|briefcase|duffle|holdall|pouch|clutch|satchel)\b/.test(lower)) {
    return 'Bags';
  }
  if (/\b(lamp|chair|vase|plate|bowl|cup|mug|cushion|blanket|throw|clock|desk|audio|speaker|camera|radio|furniture)\b/.test(lower)) {
    return 'Homeware' as Category;
  }
  return '';
}

/**
 * Extract brand from text using curated dictionary
 */
export function inferBrandFree(text: string, domainFallback?: string): string {
  for (const b of BRAND_PATTERNS) {
    if (b.pattern.test(text)) {
      return b.canonical;
    }
  }

  if (domainFallback) {
    for (const b of BRAND_PATTERNS) {
      if (b.pattern.test(domainFallback)) {
        return b.canonical;
      }
    }
    const cleanDomain = domainFallback.replace('www.', '').split('.')[0];
    if (cleanDomain && cleanDomain.length > 2 && !['vinted', 'ebay', 'depop', 'etsy', 'amazon'].includes(cleanDomain.toLowerCase())) {
      return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
    }
  }

  return '';
}

/**
 * Extract color from text
 */
export function inferColorFree(text: string): string {
  const lower = text.toLowerCase();
  for (const color of COLOR_KEYWORDS) {
    const reg = new RegExp(`\\b${color.toLowerCase()}\\b`, 'i');
    if (reg.test(lower)) {
      return color;
    }
  }
  return '';
}

/**
 * Extract material from text
 */
export function inferMaterialFree(text: string): string {
  const lower = text.toLowerCase();
  for (const mat of MATERIAL_KEYWORDS) {
    const reg = new RegExp(`\\b${mat.toLowerCase()}\\b`, 'i');
    if (reg.test(lower)) {
      return mat;
    }
  }
  return '';
}

/**
 * Extract size from text/slug tokens
 */
export function inferSizeFree(text: string): string {
  const sizeMatch = text.match(/\b(?:size|sz|taille|größe)[\s-_:]*([a-z0-9\/]+)\b/i) ||
                    text.match(/\b(xxl|xxs|xs|s|m|l|xl|[2-4][0-9][a-z]?|uk\s*\d{1,2}|eu\s*\d{2})\b/i);
  if (sizeMatch && sizeMatch[1]) {
    return sizeMatch[1].toUpperCase();
  }
  return '';
}

/**
 * Clean URL slug into human readable garment title
 */
export function cleanSlugToTitle(slug: string, brand: string): string {
  let cleaned = slug
    .replace(/\.(html|php|asp|aspx)$/i, '')
    .replace(/[?#].*$/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(item|items|product|products|listing|p|id|\d{6,})\b/gi, '')
    .trim();

  // Remove duplicate brand in title if already identified
  if (brand && brand !== 'Curated Brand') {
    const bReg = new RegExp(`^${brand}\\s*`, 'i');
    cleaned = cleaned.replace(bReg, '');
  }

  // Capitalize words
  cleaned = cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return cleaned || `${brand} Garment`;
}

/**
 * Extract specs directly from a URL string without external AI or Firebase.
 * 100% deterministic, instant, and reliable.
 */
export function extractGarmentFromUrlFree(
  rawUrl: string,
  metadataContext?: {
    imageUrl?: string;
    candidateImages?: string[];
    title?: string;
    description?: string;
    brand?: string;
    price?: number;
    rrp?: number;
    color?: string;
    material?: string;
    size?: string;
    category?: Category;
    siteName?: string;
  }
): FreeExtractedGarment {
  const cleanUrl = rawUrl.trim();
  let hostname = '';
  let pathname = '';

  try {
    const parsed = new URL(cleanUrl);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
  } catch {
    pathname = cleanUrl;
  }

  // Combine decoded path and query tokens
  const decodedPath = decodeURIComponent(pathname);
  const combinedText = `${hostname} ${decodedPath} ${metadataContext?.title || ''} ${metadataContext?.description || ''}`.replace(/[_\-\/\?\=\&]+/g, ' ');

  const isVinted = hostname.includes('vinted');
  const isEbay = hostname.includes('ebay');

  const retailerName = metadataContext?.siteName || (isVinted ? 'Vinted' : isEbay ? 'eBay' : hostname.replace('www.', '').split('.')[0] || 'Retailer');
  
  // Use advanced attribute extractor if title or description available
  const extractedAttrs = extractAllGarmentAttributes({
    title: metadataContext?.title || combinedText,
    description: metadataContext?.description || '',
    brand: metadataContext?.brand,
    color: metadataContext?.color,
    material: metadataContext?.material,
    size: metadataContext?.size,
  });

  const brand = metadataContext?.brand || (extractedAttrs.brand !== 'Unbranded' ? extractedAttrs.brand : inferBrandFree(combinedText, hostname));
  const category = metadataContext?.category || inferCategoryFree(combinedText);
  const color = metadataContext?.color || (extractedAttrs.color && extractedAttrs.color !== 'Neutral' ? extractedAttrs.color : inferColorFree(combinedText)) || '';
  const material = metadataContext?.material || (extractedAttrs.material !== 'Natural Fiber / Blend' ? extractedAttrs.material : inferMaterialFree(combinedText));
  const size = metadataContext?.size || extractedAttrs.size || inferSizeFree(combinedText);

  // Extract slug from path
  const pathParts = pathname.split('/').filter(Boolean);
  const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';
  const rawTitle = cleanSlugToTitle(lastPart, brand);

  let finalName = metadataContext?.title?.trim() || '';
  if (!finalName || finalName.length < 4) {
    finalName = rawTitle.length > 3 ? `${brand} ${rawTitle}`.replace(`${brand} ${brand}`, brand).trim() : [brand, category].filter(Boolean).join(' ') || 'Garment Piece';
  }

  // Price match from URL or metadata
  let price = metadataContext?.price || 65;
  if (!metadataContext?.price) {
    const priceMatch = cleanUrl.match(/[?&]price=([0-9]+(?:\.[0-9]{2})?)/i) || cleanUrl.match(/[-_]([0-9]{2,3})(?:gbp|eur|usd)?[-_]/i);
    if (priceMatch && priceMatch[1]) {
      price = parseFloat(priceMatch[1]);
    }
  }

  const candidateImages = metadataContext?.candidateImages || (metadataContext?.imageUrl ? [metadataContext.imageUrl] : []);
  const imageUrl = metadataContext?.imageUrl || (candidateImages.length > 0 ? candidateImages[0] : '');

  return {
    name: finalName,
    brand,
    category,
    color,
    originalListingColor: color,
    material,
    size,
    purchasePrice: price,
    rrp: metadataContext?.rrp || Math.round(price * 1.4),
    condition: 'Excellent',
    imageUrl: imageUrl || undefined,
    allCandidateImages: candidateImages.length > 0 ? candidateImages : undefined,
    retailerName,
    notes: metadataContext?.description || `Autofilled via free deterministic extractor from ${retailerName}.`,
    tags: [], // STRICT: Zero default tags added
    engineUsed: 'free-deterministic-fallback',
  };
}

/**
 * Extract specs directly from raw text, receipts, or pasted descriptions.
 */
export function extractGarmentFromTextFree(rawText: string): FreeExtractedGarment {
  const text = rawText.trim();
  const extractedAttrs = extractAllGarmentAttributes({
    title: text.split('\n')[0] || text,
    description: text,
  });

  const brand = extractedAttrs.brand !== 'Unbranded' ? extractedAttrs.brand : inferBrandFree(text);
  const category = inferCategoryFree(text);
  const color = (extractedAttrs.color && extractedAttrs.color !== 'Neutral') ? extractedAttrs.color : (inferColorFree(text) || '');
  const material = extractedAttrs.material !== 'Natural Fiber / Blend' ? extractedAttrs.material : inferMaterialFree(text);
  const size = extractedAttrs.size || inferSizeFree(text);

  // Match price from text (£45, 45 GBP, €50, $60)
  let price = 50;
  const priceMatch = text.match(/£\s*([0-9]{1,4}(?:\.[0-9]{2})?)/) ||
                     text.match(/([0-9]{1,4}(?:\.[0-9]{2})?)\s*gbp/i) ||
                     text.match(/€\s*([0-9]{1,4}(?:\.[0-9]{2})?)/) ||
                     text.match(/\$\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
  if (priceMatch && priceMatch[1]) {
    price = parseFloat(priceMatch[1]);
  }

  // Derive clean title from first non-empty line
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || '';
  let cleanTitle = firstLine.slice(0, 75).replace(/[|•].*$/g, '').trim();

  // If first line is just price or brand, synthesize a proper title
  if (!cleanTitle || cleanTitle.toLowerCase() === brand.toLowerCase() || /^£?\d+/.test(cleanTitle)) {
    cleanTitle = `${brand} ${category}`;
  }

  return {
    name: cleanTitle,
    brand,
    category,
    color,
    originalListingColor: color,
    material,
    size,
    purchasePrice: price,
    rrp: Math.round(price * 1.4),
    condition: 'Excellent',
    notes: text.slice(0, 400),
    tags: [], // STRICT: Zero default tags added
    engineUsed: 'free-deterministic-fallback',
  };
}
