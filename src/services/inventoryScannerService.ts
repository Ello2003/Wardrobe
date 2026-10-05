import { WardrobeItem, Category } from '../types';
import { canonicalizeCategory } from '../constants/categories';
import {
  extractBrandFromTitleAndDesc,
  extractColorFromTitleAndDesc,
  extractMaterialFromTitleAndDesc,
  extractSizeFromTitleAndDesc,
} from '../utils/garmentAttributeExtractor';
import { getColorSwatchHex } from '../components/duplicateMerge/duplicateUtils';
import { findProductImageForGarment } from './productImageLookupService';

export interface ProposedEnrichment {
  itemId: string;
  originalItem: WardrobeItem;
  // Discovered attributes
  proposedImageUrl?: string;
  candidateImages: string[];
  proposedBrand?: string;
  proposedName?: string;
  proposedCategory?: Category;
  proposedSubcategory?: string;
  proposedColor?: string;
  proposedColorHex?: string;
  proposedMaterial?: string;
  proposedSize?: string;
  proposedCareNotes?: string;
  proposedRrp?: number;
  proposedTags: string[];
  // Intelligence metadata
  confidence: number; // 0 to 100
  improvements: string[]; // e.g. ['High-Res Photo Found', 'Identified 100% Merino Wool', 'Navy Blue Swatch']
  missingFieldsCount: number;
  engineUsed?: string;
  isApplied?: boolean;
  isDismissed?: boolean;
}

export type ScanFilterTab =
  | 'all'
  | 'missing_photo'
  | 'missing_material'
  | 'missing_color'
  | 'missing_size'
  | 'missing_valuation'
  | 'dismissed';

/**
 * Infer category and subcategory from garment name and notes with high precision
 */
export function inferCategoryAndSubcategory(
  title: string,
  desc: string = '',
  availableCategories?: string[]
): { category: Category; subcategory?: string } {
  const detectRaw = (): { category: Category; subcategory?: string } => {
    const text = `${title} ${desc}`.toLowerCase();

  // 1. Knitwear
  if (
    text.includes('sweater') ||
    text.includes('jumper') ||
    text.includes('cardigan') ||
    text.includes('knit') ||
    text.includes('pullover') ||
    text.includes('crewneck') ||
    text.includes('rollneck') ||
    text.includes('turtleneck') ||
    text.includes('hoodie') ||
    text.includes('sweatshirt')
  ) {
    let sub = 'Knitwear';
    if (text.includes('cardigan')) sub = 'Cardigan';
    else if (text.includes('crewneck') || text.includes('crew neck')) sub = 'Crewneck Knit';
    else if (text.includes('rollneck') || text.includes('turtleneck')) sub = 'Rollneck';
    else if (text.includes('hoodie')) sub = 'Hoodie';
    return { category: 'Knitwear', subcategory: sub };
  }

  // 2. Tailoring & Formal
  if (
    text.includes('blazer') ||
    text.includes('suit') ||
    text.includes('tuxedo') ||
    text.includes('sportcoat') ||
    text.includes('sport coat') ||
    text.includes('tailored jacket')
  ) {
    return { category: 'Tailoring', subcategory: text.includes('suit') ? 'Two-Piece Suit' : 'Tailored Blazer' };
  }

  // 3. Outerwear
  if (
    text.includes('jacket') ||
    text.includes('coat') ||
    text.includes('parka') ||
    text.includes('trench') ||
    text.includes('overcoat') ||
    text.includes('mac') ||
    text.includes('bomber') ||
    text.includes('harrington') ||
    text.includes('windbreaker') ||
    text.includes('anorak') ||
    text.includes('gilet') ||
    text.includes('vest') && !text.includes('sweater') ||
    text.includes('overshirt') ||
    text.includes('shacket')
  ) {
    let sub = 'Outerwear';
    if (text.includes('wax')) sub = 'Waxed Jacket';
    else if (text.includes('overcoat') || text.includes('coat')) sub = 'Overcoat';
    else if (text.includes('overshirt') || text.includes('shacket')) sub = 'Overshirt';
    else if (text.includes('bomber')) sub = 'Bomber Jacket';
    else if (text.includes('harrington')) sub = 'Harrington Jacket';
    return { category: 'Outerwear', subcategory: sub };
  }

  // 4. Shoes / Footwear
  if (
    text.includes('shoe') ||
    text.includes('shoes') ||
    text.includes('boot') ||
    text.includes('boots') ||
    text.includes('sneaker') ||
    text.includes('sneakers') ||
    text.includes('trainer') ||
    text.includes('trainers') ||
    text.includes('derby') ||
    text.includes('derbies') ||
    text.includes('loafer') ||
    text.includes('loafers') ||
    text.includes('oxford') && (text.includes('shoe') || text.includes('leather')) ||
    text.includes('brogue') ||
    text.includes('sandal') ||
    text.includes('mule') ||
    text.includes('slide') ||
    text.includes('chelsea')
  ) {
    let sub = 'Shoes';
    if (text.includes('chelsea')) sub = 'Chelsea Boots';
    else if (text.includes('boot')) sub = 'Boots';
    else if (text.includes('sneaker') || text.includes('trainer')) sub = 'Sneakers';
    else if (text.includes('loafer')) sub = 'Loafers';
    else if (text.includes('derby')) sub = 'Derby Shoes';
    return { category: 'Shoes', subcategory: sub };
  }

  // 5. Bottoms
  if (
    text.includes('trouser') ||
    text.includes('trousers') ||
    text.includes('pant') ||
    text.includes('pants') ||
    text.includes('jean') ||
    text.includes('jeans') ||
    text.includes('chino') ||
    text.includes('chinos') ||
    text.includes('short') ||
    text.includes('shorts') ||
    text.includes('denim') && !text.includes('jacket')
  ) {
    let sub = 'Bottoms';
    if (text.includes('jean') || text.includes('denim')) sub = 'Denim Jeans';
    else if (text.includes('chino')) sub = 'Chinos';
    else if (text.includes('pleat')) sub = 'Pleated Trousers';
    else if (text.includes('short')) sub = 'Shorts';
    return { category: 'Bottoms', subcategory: sub };
  }

  // 6. Dresses & Jumpsuits
  if (
    text.includes('dress') ||
    text.includes('gown') ||
    text.includes('jumpsuit') ||
    text.includes('dungarees') ||
    text.includes('romper')
  ) {
    return { category: 'Dresses & Jumpsuits', subcategory: text.includes('jumpsuit') ? 'Jumpsuit' : 'Midi Dress' };
  }

  // 7. Tops
  if (
    text.includes('shirt') ||
    text.includes('t-shirt') ||
    text.includes('tee') ||
    text.includes('polo') ||
    text.includes('blouse') ||
    text.includes('tank')
  ) {
    let sub = 'Tops';
    if (text.includes('polo')) sub = 'Polo Shirt';
    else if (text.includes('t-shirt') || text.includes('tee')) sub = 'T-Shirt';
    else if (text.includes('oxford') || text.includes('button down') || text.includes('ocbd')) sub = 'Oxford Shirt';
    else if (text.includes('linen')) sub = 'Linen Shirt';
    return { category: 'Tops', subcategory: sub };
  }

  // 8. Homeware & Lifestyle
  if (
    text.includes('blanket') ||
    text.includes('throw') ||
    text.includes('cushion') ||
    text.includes('ceramic') ||
    text.includes('candle') ||
    text.includes('vase') ||
    text.includes('towel') ||
    text.includes('lamp') ||
    text.includes('mug') ||
    text.includes('plate')
  ) {
    return { category: 'Homeware', subcategory: 'Homeware & Decor' };
  }

  // 9. Accessories
  if (
    text.includes('scarf') ||
    text.includes('belt') ||
    text.includes('hat') ||
    text.includes('cap') ||
    text.includes('beanie') ||
    text.includes('glove') ||
    text.includes('sunglasses') ||
    text.includes('wallet') ||
    text.includes('watch') ||
    text.includes('tie') ||
    text.includes('pocket square')
  ) {
    return { category: 'Accessories', subcategory: 'Accessory' };
  }

  // 10. Bags
  if (
    text.includes('bag') ||
    text.includes('tote') ||
    text.includes('backpack') ||
    text.includes('crossbody') ||
    text.includes('briefcase') ||
    text.includes('holdall') ||
    text.includes('duffle')
  ) {
    return { category: 'Bags', subcategory: 'Bag' };
  }

    return { category: '' as Category };
  };

  const raw = detectRaw();
  if (availableCategories && availableCategories.length > 0) {
    return {
      category: canonicalizeCategory(raw.category, availableCategories) as Category,
      subcategory: raw.subcategory,
    };
  }

  return raw;
}

/**
 * Infer fabric care instructions based on material and category
 */
export function inferCareNotes(material: string, category?: Category): string {
  const lower = material.toLowerCase();
  if (lower.includes('cashmere') || lower.includes('merino') || lower.includes('wool') || lower.includes('alpaca') || lower.includes('mohair')) {
    return 'Hand wash cold with delicate wool wash. Reshape and dry flat on a clean towel. Never tumble dry.';
  }
  if (lower.includes('silk')) {
    return 'Specialist dry clean or delicate cold hand wash with silk shampoo. Iron on low heat on reverse side.';
  }
  if (lower.includes('wax') || lower.includes('barbour')) {
    return 'Sponge clean with cold water only. Do not machine wash, dry clean, or use detergent. Re-proof annually with original wax dressing.';
  }
  if (lower.includes('leather') || lower.includes('suede') || category === 'Shoes') {
    return 'Specialist leather care only. Nourish with leather conditioner and protect with water-repellent spray. Store with cedar shoe trees.';
  }
  if (lower.includes('denim') || lower.includes('selvedge')) {
    return 'Wash inside out in cold water on gentle spin. Hang to air dry. Avoid frequent laundering to preserve custom fades and whiskers.';
  }
  if (lower.includes('linen')) {
    return 'Machine wash cold at 30°C on gentle cycle. Hang or lay flat to dry. Steam iron while slightly damp.';
  }
  return 'Machine wash cold at 30°C with similar colors. Line dry recommended to preserve fabric structure and color vibrancy.';
}

/**
 * Estimates retail RRP based on brand tier and category
 */
export function estimateGarmentRrp(brand: string, category: Category, currentPrice: number = 0): number {
  const b = brand.toLowerCase();

  // Ultra Luxury / Designer
  if (
    b.includes('acne') || b.includes('lemaire') || b.includes('margiela') ||
    b.includes('dries') || b.includes('row') || b.includes('jil sander') ||
    b.includes('prada') || b.includes('bottega') || b.includes('celine') ||
    b.includes('loewe') || b.includes('gucci')
  ) {
    if (category === 'Outerwear' || category === 'Tailoring') return Math.max(currentPrice * 2.5, 950);
    if (category === 'Knitwear') return Math.max(currentPrice * 2.2, 450);
    if (category === 'Bottoms') return Math.max(currentPrice * 2.0, 380);
    if (category === 'Shoes') return Math.max(currentPrice * 2.0, 520);
    return Math.max(currentPrice * 2.0, 280);
  }

  // Heritage & Contemporary (Barbour, Drake's, Margaret Howell, Studio Nicholson)
  if (
    b.includes('barbour') || b.includes('drake') || b.includes('howell') ||
    b.includes('nicholson') || b.includes('our legacy') || b.includes('sunspel') ||
    b.includes('norse') || b.includes('universal works') || b.includes('auralee') ||
    b.includes('kaptain') || b.includes('visvim') || b.includes('beams')
  ) {
    if (category === 'Outerwear' || category === 'Tailoring') return Math.max(currentPrice * 2.0, 350);
    if (category === 'Knitwear') return Math.max(currentPrice * 1.8, 240);
    if (category === 'Bottoms') return Math.max(currentPrice * 1.8, 195);
    if (category === 'Tops') return Math.max(currentPrice * 1.8, 135);
    return Math.max(currentPrice * 1.8, 180);
  }

  // Denim & Workwear (Levi's, Carhartt)
  if (b.includes('levi') || b.includes('carhartt') || b.includes('dickies') || b.includes('edwin') || b.includes('nudie')) {
    if (category === 'Bottoms') return Math.max(currentPrice * 1.5, 95);
    if (category === 'Outerwear') return Math.max(currentPrice * 1.5, 140);
    return Math.max(currentPrice * 1.5, 75);
  }

  // High Street / Minimalist (Uniqlo, Arket, COS, Zara)
  if (b.includes('uniqlo') || b.includes('arket') || b.includes('cos') || b.includes('zara') || b.includes('reiss')) {
    if (category === 'Outerwear' || category === 'Tailoring') return Math.max(currentPrice * 1.4, 150);
    if (category === 'Knitwear') return Math.max(currentPrice * 1.3, 85);
    if (category === 'Bottoms') return Math.max(currentPrice * 1.3, 70);
    return Math.max(currentPrice * 1.3, 45);
  }

  // Default fallback
  return currentPrice > 0 ? Math.round(currentPrice * 1.6) : 120;
}

/**
 * Checks whether an item is missing key information
 */
export function checkItemIncomplete(item: WardrobeItem): {
  isIncomplete: boolean;
  missingPhoto: boolean;
  missingMaterial: boolean;
  missingColor: boolean;
  missingCategory: boolean;
  missingValuation: boolean;
  missingSize: boolean;
  missingCare: boolean;
  missingFieldsCount: number;
} {
  const missingPhoto = !item.imageUrl || item.imageUrl.trim() === '';
  const cleanMaterial = (item.material || '').toLowerCase().trim();
  const missingMaterial =
    !cleanMaterial ||
    cleanMaterial === 'natural fiber / blend' ||
    cleanMaterial === 'quality fabric' ||
    cleanMaterial === 'natural blend' ||
    cleanMaterial === 'unspecified' ||
    cleanMaterial === 'unknown';

  const cleanColor = (item.color || '').toLowerCase().trim();
  const missingColor =
    !cleanColor ||
    cleanColor === 'neutral' ||
    cleanColor === 'unspecified' ||
    cleanColor === 'various' ||
    cleanColor === 'other';

  const missingCategory = !item.category || item.category.trim() === '';
  const missingValuation = !item.purchasePrice || item.purchasePrice === 0 || !item.rrp;
  const missingSize = !item.size || item.size.trim() === '';
  const missingCare = !item.careNotes || item.careNotes.trim() === '';

  let missingFieldsCount = 0;
  if (missingPhoto) missingFieldsCount += 2; // high weight
  if (missingMaterial) missingFieldsCount += 1.5;
  if (missingColor) missingFieldsCount += 1;
  if (missingSize) missingFieldsCount += 1;
  if (missingCategory) missingFieldsCount += 1;
  if (missingValuation) missingFieldsCount += 0.8;
  if (missingCare) missingFieldsCount += 0.5;

  const isIncomplete =
    missingPhoto ||
    missingMaterial ||
    missingColor ||
    missingSize ||
    missingValuation ||
    missingCare;

  return {
    isIncomplete,
    missingPhoto,
    missingMaterial,
    missingColor,
    missingCategory,
    missingValuation,
    missingSize,
    missingCare,
    missingFieldsCount: Math.round(missingFieldsCount),
  };
}

/**
 * Clean model title by removing redundant brand prefix
 */
export function cleanGarmentTitle(name: string, brand: string): string {
  if (!name) return 'Garment Piece';
  let clean = name.trim();
  if (brand && brand !== 'Curated Brand' && brand !== 'Pre-Loved Brand' && brand !== 'Curated Label') {
    const brandRegex = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–:]?\\s*`, 'i');
    clean = clean.replace(brandRegex, '').trim();
  }
  // Remove leading punctuation
  clean = clean.replace(/^[-–:•,]\s*/, '').trim();
  // Capitalize first letter
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean || name;
}

/**
 * Scan a single garment and synthesize rich proposed enrichment
 * NEVER defaults to fake values like "Classic Navy" or "100% Cotton / Natural Fiber"
 */
export async function enrichSingleGarment(
  item: WardrobeItem,
  fetchWebPhotos: boolean = true
): Promise<ProposedEnrichment> {
  const incompleteStatus = checkItemIncomplete(item);

  // 1. Detect Brand
  const detectedBrand = extractBrandFromTitleAndDesc(item.name, item.notes || '', item.brand);
  const finalBrand =
    detectedBrand && detectedBrand !== 'Unbranded' && detectedBrand !== 'Pre-Loved Brand'
      ? detectedBrand
      : item.brand || 'Curated Label';

  // 2. Clean Name
  const cleanName = cleanGarmentTitle(item.name, finalBrand);

  // 3. Category & Subcategory
  const { category: detectedCat, subcategory: detectedSubcat } = inferCategoryAndSubcategory(
    `${cleanName} ${finalBrand}`,
    item.notes || ''
  );
  // Keep original category if valid and specific
  const finalCategory = (detectedCat || item.category || '') as Category;
  const finalSubcategory = item.subcategory || detectedSubcat || '';

  // 4. Color & Swatch (DO NOT default blindly to Classic Navy or Oatmeal)
  const detectedColor = extractColorFromTitleAndDesc(cleanName, item.notes || '', item.color);
  const finalColor =
    detectedColor && detectedColor !== 'Neutral' && detectedColor !== 'Unspecified'
      ? detectedColor
      : item.color && item.color !== 'Neutral' && item.color !== 'Unspecified'
      ? item.color
      : '';
  const colorHex = finalColor ? (item.colorHex || getColorSwatchHex(finalColor)) : '';

  // 5. Fabric / Material (Do not inject fake placeholder materials)
  const detectedMaterial = extractMaterialFromTitleAndDesc(cleanName, item.notes || '', item.material);
  const finalMaterial =
    detectedMaterial && !detectedMaterial.toLowerCase().includes('natural fiber')
      ? detectedMaterial
      : item.material || '';

  // 6. Size
  const detectedSize = extractSizeFromTitleAndDesc(cleanName, item.notes || '', item.size);
  const finalSize = detectedSize || item.size || '';

  // 7. Care Notes
  const proposedCare = item.careNotes || inferCareNotes(finalMaterial, finalCategory);

  // 8. Estimated RRP
  const proposedRrp = item.rrp && item.rrp > 0 ? item.rrp : estimateGarmentRrp(finalBrand, finalCategory, item.purchasePrice);

  // 9. Tags
  const newTags = new Set(item.tags || []);
  if (finalBrand && finalBrand !== 'Curated Label') newTags.add(finalBrand.toLowerCase());
  if (finalCategory) newTags.add(finalCategory.toLowerCase());
  if (finalSubcategory) newTags.add(finalSubcategory.toLowerCase());
  if (finalColor) newTags.add(finalColor.toLowerCase());

  // 10. Photo Lookup via Product Image Scout
  let foundImage = item.imageUrl || '';
  let candidates: string[] = item.imageUrl ? [item.imageUrl] : [];

  if (fetchWebPhotos && (!item.imageUrl || item.imageUrl.trim() === '')) {
    try {
      const scout = await findProductImageForGarment(
        finalBrand,
        cleanName,
        finalColor,
        finalCategory
      );
      if (scout.primaryImageUrl) {
        foundImage = scout.primaryImageUrl;
        candidates = scout.candidateImages;
      }
    } catch (e) {
      console.warn('Scout image lookup note:', e);
    }
  }

  // 11. Improvements & Confidence Score
  const improvements: string[] = [];
  let confidence = 75;

  if (!item.imageUrl && foundImage) {
    improvements.push(`Discovered ${candidates.length > 1 ? `${candidates.length} High-Res Photos` : 'Authentic Product Photo'}`);
    confidence += 12;
  }
  if (incompleteStatus.missingMaterial && finalMaterial) {
    improvements.push(`Identified Fabric: ${finalMaterial}`);
    confidence += 7;
  }
  if (incompleteStatus.missingColor && finalColor) {
    improvements.push(`Extracted Colorway: ${finalColor}`);
    confidence += 5;
  }
  if (incompleteStatus.missingSize && finalSize) {
    improvements.push(`Standardized Size: ${finalSize}`);
    confidence += 5;
  }
  if (!item.rrp && proposedRrp) {
    improvements.push(`Calculated Est. RRP: £${proposedRrp}`);
    confidence += 4;
  }
  if (!item.careNotes && proposedCare) {
    improvements.push(`Crafted Fabric Care Instructions`);
    confidence += 3;
  }
  if (finalBrand !== item.brand && finalBrand !== 'Curated Label') {
    improvements.push(`Identified Designer Brand: ${finalBrand}`);
    confidence += 5;
  }

  confidence = Math.min(98, confidence);

  return {
    itemId: item.id,
    originalItem: item,
    proposedImageUrl: foundImage || item.imageUrl,
    candidateImages: candidates,
    proposedBrand: finalBrand,
    proposedName: cleanName,
    proposedCategory: finalCategory,
    proposedSubcategory: finalSubcategory,
    proposedColor: finalColor,
    proposedColorHex: colorHex,
    proposedMaterial: finalMaterial,
    proposedSize: finalSize,
    proposedCareNotes: proposedCare,
    proposedRrp,
    proposedTags: Array.from(newTags),
    confidence,
    improvements: improvements.length > 0 ? improvements : ['Verified Metadata Cohesion'],
    missingFieldsCount: incompleteStatus.missingFieldsCount,
    engineUsed: 'enhanced-deterministic-audit',
  };
}

/**
 * Scan entire inventory or items with missing fields in chunks
 * Tries server-side Gemini 3.8 Flash AI audit endpoint first, falling back to local deterministic engine
 */
export async function scanInventoryBatch(
  items: WardrobeItem[],
  onProgress?: (scannedCount: number, totalCount: number, currentItemName: string) => void,
  mode: 'deep_ai' | 'fast_only' = 'deep_ai'
): Promise<ProposedEnrichment[]> {
  const incompleteItems = items.filter((it) => !it.isArchived && checkItemIncomplete(it).isIncomplete);
  const results: ProposedEnrichment[] = [];
  const chunkSize = 10;

  for (let i = 0; i < incompleteItems.length; i += chunkSize) {
    const chunk = incompleteItems.slice(i, i + chunkSize);
    const progressIndex = Math.min(i + chunk.length, incompleteItems.length);
    if (onProgress) {
      onProgress(progressIndex, incompleteItems.length, `${chunk[0].brand || ''} ${chunk[0].name}`);
    }

    let chunkHandledByAi = false;

    // Attempt Gemini AI batch audit if deep_ai mode is requested
    if (mode === 'deep_ai') {
      try {
        const res = await fetch('/api/gemini/inventory-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk, mode }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.proposals) && data.proposals.length > 0) {
            results.push(...data.proposals);
            chunkHandledByAi = true;
          }
        }
      } catch (err) {
        console.warn('Backend AI inventory scan notice, falling back to local enrichment:', err);
      }
    }

    if (!chunkHandledByAi) {
      // Local high-fidelity deterministic fallback
      for (const item of chunk) {
        try {
          const enrichment = await enrichSingleGarment(item, true);
          results.push(enrichment);
        } catch {
          const fallback = await enrichSingleGarment(item, false);
          results.push(fallback);
        }
      }
    }

    // Gentle micro-yield to keep UI fluid
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  return results;
}

/**
 * Direct Vision AI Photo Scan for a single garment
 */
export async function scanGarmentPhotoWithVision(
  item: WardrobeItem,
  imageBase64?: string
): Promise<ProposedEnrichment | null> {
  try {
    const res = await fetch('/api/gemini/scan-garment-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: imageBase64 || item.imageUrl,
        currentItem: item,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audit) {
        const audit = data.audit;
        return {
          itemId: item.id,
          originalItem: item,
          proposedImageUrl: item.imageUrl,
          candidateImages: item.imageUrl ? [item.imageUrl] : [],
          proposedBrand: audit.brand || item.brand,
          proposedName: audit.name || item.name,
          proposedCategory: audit.category || item.category,
          proposedSubcategory: audit.subcategory || item.subcategory,
          proposedColor: audit.color || item.color,
          proposedColorHex: audit.colorHex || getColorSwatchHex(audit.color || item.color),
          proposedMaterial: audit.material || item.material,
          proposedSize: audit.size || item.size,
          proposedCareNotes: audit.careNotes || item.careNotes,
          proposedRrp: audit.rrp || item.rrp,
          proposedTags: ['photo-vision', (audit.category || '').toLowerCase()].filter(Boolean),
          confidence: audit.confidence || 92,
          improvements: audit.improvements || ['Audited via Gemini Computer Vision'],
          missingFieldsCount: 0,
          engineUsed: 'gemini-vision',
        };
      }
    }
  } catch (err) {
    console.error('Garment photo vision scan error:', err);
  }
  return null;
}
