import { Category, Condition, Season } from '../types';
import {
  extractBrandFromTitleAndDesc,
  extractColorFromTitleAndDesc,
  extractMaterialFromTitleAndDesc,
  extractSizeFromTitleAndDesc,
} from '../utils/garmentAttributeExtractor';
import { inferCategoryAndSubcategory, estimateGarmentRrp } from './inventoryScannerService';
import { getColorSwatchHex } from '../components/duplicateMerge/duplicateUtils';

export interface ParsedBatchLineItem {
  id: string; // temporary key for preview UI
  rawLine: string;
  lineNumber: number;
  name: string;
  brand: string;
  category: Category;
  subcategory?: string;
  color: string;
  colorHex?: string;
  material: string;
  size?: string;
  purchasePrice: number;
  rrp?: number;
  condition: Condition;
  season: Season[];
  tags: string[];
  imageUrl?: string;
  allCandidateImages?: string[];
  notes?: string;
  storageLocation?: string;
  isValid: boolean;
  validationError?: string;
  isMultiVariant?: boolean;
  variantGroup?: string;
}

/**
 * Extracts numeric price from a line of text (supports £, $, €, and trailing currency notations)
 */
export function extractPriceFromLine(line: string): { price: number; cleanLineWithoutPrice: string } {
  // Matches: £120, £14.90, $95.50, €300, 150 GBP, 80 USD, etc.
  const priceRegex = /(?:[£$€]\s*([0-9]+(?:[.,][0-9]{1,2})?)|([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:gbp|eur|usd|pounds))/i;
  const match = line.match(priceRegex);

  if (match) {
    const rawVal = match[1] || match[2];
    const price = parseFloat(rawVal.replace(',', '.')) || 0;
    // Strip the matched price part from the string
    const cleanLineWithoutPrice = line.replace(match[0], '').replace(/\s*[-–,]\s*$/, '').trim();
    return { price, cleanLineWithoutPrice };
  }

  return { price: 0, cleanLineWithoutPrice: line };
}

/**
 * Checks if a string likely represents a garment size
 */
function isLikelySize(val: string): boolean {
  if (!val) return false;
  const clean = val.trim();
  // Standard letter sizes
  if (/^(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|4XL|5XL|OS|ONE SIZE)$/i.test(clean)) return true;
  // Numeric sizes: 38R, 40L, 42S, 32W, 34L
  if (/^[0-9]{1,2}(?:\.[0-9])?(?:[RSL]|W|L)?$/i.test(clean)) return true;
  // Waist/Inseam or shoe size: 32/32, 32x32, 32W 32L
  if (/^[0-9]{2}\s*[/xX]\s*[0-9]{2}$/i.test(clean)) return true;
  if (/^W[0-9]{2}(?:\s*[/xX,]?\s*L[0-9]{2})?$/i.test(clean)) return true;
  // Regional shoe/clothing size: UK 9, EU 42, US 10, IT 48, FR 40
  if (/^(?:UK|EU|US|IT|FR|JP)\s*[0-9]+(?:\.[0-9])?$/i.test(clean)) return true;
  return false;
}

/**
 * Checks if a string likely represents a garment material
 */
function isLikelyMaterial(val: string): boolean {
  if (!val) return false;
  const clean = val.toLowerCase();
  if (clean.includes('%')) return true;
  const materialKeywords = [
    'cotton', 'wool', 'linen', 'silk', 'cashmere', 'denim', 'leather',
    'suede', 'shearling', 'nylon', 'polyester', 'canvas', 'tweed',
    'flannel', 'corduroy', 'velvet', 'fleece', 'viscose', 'rayon',
    'merino', 'alpaca', 'mohair', 'poplin', 'oxford', 'twill', 'sateen',
    'chambray', 'gabardine', 'jersey', 'ripstop', 'waxed', 'down'
  ];
  return materialKeywords.some((k) => clean.includes(k));
}

/**
 * Parses a single raw text line into one or multiple structured wardrobe pieces
 * Supports format: Brand - Item - Colour - Material - Size (- Price)
 * Handles multi-color lines: e.g. "Uniqlo - Crew Neck - White, Black, Navy - Cotton - M"
 */
export function parseSingleLineToGarments(
  rawLine: string,
  lineNumber: number,
  defaultCategory?: Category,
  defaultSeason: Season[] = ['Autumn', 'Winter', 'Spring']
): ParsedBatchLineItem[] {
  let line = rawLine.trim();

  // Strip leading bullet points: "-", "*", "•", "1.", "1)", "[ ]"
  line = line.replace(/^(?:[-*•+>]|\d+[.)]|\[[\sx]?\])\s*/i, '').trim();

  if (!line || line.startsWith('---') || line.startsWith('===')) {
    return [];
  }

  // 1. Extract Price if present in text
  const { price: extractedPrice, cleanLineWithoutPrice } = extractPriceFromLine(line);
  let workingLine = cleanLineWithoutPrice;

  // 2. Check for explicit multi-segment delimiter:
  // Supports:
  // - "Brand - Item - Colour - Material - Size" (with hyphens, en-dashes, em-dashes)
  // - "Brand | Item | Colour | Material | Size"
  // - "Brand \t Item \t Colour \t Material \t Size" (tab-delimited from Excel/Sheets)
  // - "Brand ; Item ; Colour ; Material ; Size"
  let segments: string[] = [];

  if (workingLine.includes('\t')) {
    segments = workingLine.split('\t').map((s) => s.trim()).filter(Boolean);
  } else if (workingLine.includes(' | ')) {
    segments = workingLine.split(' | ').map((s) => s.trim()).filter(Boolean);
  } else if (/\s*[-–—]\s*/.test(workingLine)) {
    // Split on dash surrounded by spaces or clean hyphen separation
    segments = workingLine.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean);
    // If not split by space-dash-space, check standard hyphen delimiter if 3+ parts
    if (segments.length < 2 && workingLine.includes(' - ')) {
      segments = workingLine.split(' - ').map((s) => s.trim()).filter(Boolean);
    }
  } else if (workingLine.includes(';')) {
    segments = workingLine.split(';').map((s) => s.trim()).filter(Boolean);
  }

  // 3. Multi-Segment Mapping
  if (segments.length >= 3) {
    let brand = segments[0] || 'Unbranded';
    let name = segments[1] || 'Garment Piece';
    let colorRaw = segments[2] || '';
    let materialRaw = '';
    let sizeRaw = '';
    let finalPrice = extractedPrice;

    if (segments.length >= 5) {
      // Direct match for: Brand - Item - Colour - Material - Size
      materialRaw = segments[3] || '';
      sizeRaw = segments[4] || '';
      if (segments.length >= 6 && !finalPrice) {
        const segPrice = parseFloat(segments[5].replace(/[^0-9.]/g, ''));
        if (!isNaN(segPrice) && segPrice > 0) finalPrice = segPrice;
      }
    } else if (segments.length === 4) {
      // 4 segments: Brand - Item - Colour - (Material OR Size OR Price)
      const lastSeg = segments[3];
      if (isLikelySize(lastSeg)) {
        sizeRaw = lastSeg;
      } else if (isLikelyMaterial(lastSeg)) {
        materialRaw = lastSeg;
      } else {
        const segPrice = parseFloat(lastSeg.replace(/[^0-9.]/g, ''));
        if (!isNaN(segPrice) && segPrice > 0 && !finalPrice) {
          finalPrice = segPrice;
        } else {
          materialRaw = lastSeg;
        }
      }
    }

    // Infer category & subcategory from combined item name, brand & material
    const { category: inferredCat, subcategory } = inferCategoryAndSubcategory(
      `${name} ${brand} ${materialRaw}`,
      `${name} ${materialRaw}`
    );
    const finalCategory = (defaultCategory || inferredCat || '') as Category;
    const rrp = estimateGarmentRrp(brand, finalCategory, finalPrice);

    // Multi-Color Expansion:
    // If colorRaw has multiple colors (e.g. "White, Black, Navy" or "Sage Olive / Rustic Brown")
    // Split into distinct items!
    const colorsList = colorRaw
      .split(/[,/&]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !/^(?:and|\+)$/i.test(c));

    const effectiveColors = colorsList.length > 0 ? colorsList : [colorRaw || 'Neutral'];

    // Multi-Size Expansion if multiple sizes comma-separated
    const sizesList = sizeRaw
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const effectiveSizes = sizesList.length > 1 ? sizesList : [sizeRaw];

    const results: ParsedBatchLineItem[] = [];

    let variantIdx = 0;
    for (const clr of effectiveColors) {
      for (const sz of effectiveSizes) {
        const tempId = `batch-${lineNumber}-${variantIdx}-${Date.now()}`;
        const tags = ['batch-import'];
        if (brand && brand !== 'Unbranded') tags.push(brand.toLowerCase());
        if (finalCategory) tags.push(finalCategory.toLowerCase());
        if (clr && clr !== 'Neutral') tags.push(clr.toLowerCase());

        results.push({
          id: tempId,
          rawLine,
          lineNumber,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          brand: brand.trim(),
          category: finalCategory,
          subcategory,
          color: clr,
          colorHex: getColorSwatchHex(clr),
          material: materialRaw,
          size: sz,
          purchasePrice: finalPrice || 0,
          rrp: rrp !== undefined ? rrp : (finalPrice || 0),
          condition: 'Pristine / New',
          season: defaultSeason,
          tags,
          isValid: true,
          isMultiVariant: effectiveColors.length > 1 || effectiveSizes.length > 1,
          variantGroup: effectiveColors.length > 1 || effectiveSizes.length > 1 ? `${brand}_${name}` : undefined,
        });
        variantIdx++;
      }
    }

    return results;
  }

  // 4. Fallback for 2-segment or natural text lines (e.g. "Acne Studios - 1989 Jeans" or "Barbour Beaufort Waxed Jacket Olive")
  const tempId = `batch-line-${lineNumber}-${Date.now()}`;
  let brand = '';
  let modelTitle = workingLine;

  const colonOrDashMatch = workingLine.match(/^([A-Za-z0-9&'.\s]{2,30})\s*[-–:]\s*(.+)$/);
  if (colonOrDashMatch) {
    brand = colonOrDashMatch[1].trim();
    modelTitle = colonOrDashMatch[2].trim();
  } else {
    const extractedBrand = extractBrandFromTitleAndDesc(workingLine, '');
    if (extractedBrand && extractedBrand !== 'Unbranded' && extractedBrand !== 'Pre-Loved Brand') {
      brand = extractedBrand;
      const brandRegex = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
      modelTitle = workingLine.replace(brandRegex, '').trim();
    } else {
      const words = workingLine.split(/\s+/);
      if (words.length >= 2 && words[0].length >= 3 && /^[A-Z]/.test(words[0])) {
        brand = words[0];
        modelTitle = words.slice(1).join(' ');
      } else {
        brand = 'Curated Brand';
        modelTitle = workingLine;
      }
    }
  }

  if (modelTitle.length > 0) {
    modelTitle = modelTitle.charAt(0).toUpperCase() + modelTitle.slice(1);
  }

  const color = extractColorFromTitleAndDesc(workingLine, '') || '';
  const size = extractSizeFromTitleAndDesc(workingLine, '') || '';
  const material = extractMaterialFromTitleAndDesc(workingLine, '') || '';

  const { category: inferredCat, subcategory } = inferCategoryAndSubcategory(
    `${modelTitle} ${brand} ${material}`,
    workingLine
  );
  const finalCategory = (defaultCategory || inferredCat || '') as Category;
  const rrp = estimateGarmentRrp(brand, finalCategory, extractedPrice);

  const tags: string[] = ['batch-import'];
  if (brand && brand !== 'Curated Brand') tags.push(brand.toLowerCase());
  if (finalCategory) tags.push(finalCategory.toLowerCase());
  if (subcategory) tags.push(subcategory.toLowerCase());

  return [
    {
      id: tempId,
      rawLine,
      lineNumber,
      name: modelTitle || workingLine,
      brand: brand || '',
      category: finalCategory,
      subcategory,
      color,
      colorHex: getColorSwatchHex(color),
      material,
      size,
      purchasePrice: extractedPrice || 0,
      rrp: rrp !== undefined ? rrp : (extractedPrice || 0),
      condition: 'Pristine / New',
      season: defaultSeason,
      tags,
      isValid: true,
    },
  ];
}

/**
 * Single line backward-compatibility helper
 */
export function parseSingleLineToGarment(
  rawLine: string,
  lineNumber: number,
  defaultCategory?: Category,
  defaultSeason: Season[] = ['Autumn', 'Winter', 'Spring']
): ParsedBatchLineItem {
  const items = parseSingleLineToGarments(rawLine, lineNumber, defaultCategory, defaultSeason);
  if (items.length > 0) return items[0];
  return {
    id: `empty-${lineNumber}`,
    rawLine,
    lineNumber,
    name: '',
    brand: '',
    category: (defaultCategory || '') as Category,
    color: '',
    material: '',
    purchasePrice: 0,
    condition: 'Pristine / New',
    season: defaultSeason,
    tags: [],
    isValid: false,
    validationError: 'Empty or invalid line',
  };
}

/**
 * Parses full multi-line text into array of garment items (handles multi-color expansion)
 */
export function parseBatchPastedText(
  fullText: string,
  defaultCategory?: Category,
  defaultSeason: Season[] = ['Autumn', 'Winter', 'Spring']
): ParsedBatchLineItem[] {
  if (!fullText || !fullText.trim()) return [];

  const rawLines = fullText.split(/\r?\n/);
  const parsedItems: ParsedBatchLineItem[] = [];

  let effectiveLineNumber = 1;
  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) continue;

    const itemsFromLine = parseSingleLineToGarments(
      rawLine,
      effectiveLineNumber++,
      defaultCategory,
      defaultSeason
    );

    for (const it of itemsFromLine) {
      if (it.isValid) {
        parsedItems.push(it);
      }
    }
  }

  return parsedItems;
}

/**
 * Formats a garment into the clean standardized format:
 * Brand - Item - Colour - Material - Size - £Price
 */
export function formatGarmentToStandardLine(item: {
  brand?: string;
  name?: string;
  color?: string;
  material?: string;
  size?: string;
  purchasePrice?: number;
}): string {
  const parts = [
    item.brand || 'Unbranded',
    item.name || 'Garment',
    item.color || 'Neutral',
    item.material || 'Standard Fabric',
    item.size || 'M',
  ];
  if (item.purchasePrice !== undefined && item.purchasePrice > 0) {
    parts.push(`£${item.purchasePrice.toFixed(2)}`);
  }
  return parts.join(' - ');
}

/**
 * Sample datasets highlighting the Brand - Item - Colour - Material - Size format
 */
export const SAMPLE_BATCH_INPUTS = [
  {
    title: 'Standard Format: Brand - Item - Colour - Material - Size',
    text: `Barbour - Bedale Waxed Jacket - Sage Olive - Waxed Cotton - 40R - £280
Uniqlo - Supima Cotton Crew Neck - White - 100% Cotton - M - £14.90
Uniqlo - Supima Cotton Crew Neck - Black - 100% Cotton - M - £14.90
Uniqlo - Supima Cotton Crew Neck - Navy - 100% Cotton - L - £14.90
COS - Relaxed Fit Wool Trousers - Charcoal - 100% Merino Wool - 32/32 - £115
Drake's - Lambswool Shawl Collar Cardigan - Dark Navy - 100% Lambswool - 40R - £395
Common Projects - Original Achilles Low - White - Italian Calfskin Leather - EU 42 - £330`,
  },
  {
    title: 'Multi-Colorway Line Expansion (Multiple colours on 1 line)',
    text: `Uniqlo - Airism Oversized T-Shirt - White, Black, Navy, Heather Grey - Cotton Blend - L - £19.90
Sunspel - Riviera Polo Shirt - Navy, White, Sky Blue - 100% Egyptian Cotton - M - £115
Inis Meáin - Ribbed Wool Beanie - Oatmeal, Charcoal, Forest Green - 100% Merino Wool - OS - £85
Acne Studios - 1989 Loose Straight Jeans - Vintage Light Blue, Washed Black - 100% Rigid Denim - 32/32 - £290`,
  },
  {
    title: 'Spreadsheet / Tab & Pipe Copied Rows',
    text: `Margaret Howell | MHL Workwear Overshirt | Olive Khaki | Heavy Drill Cotton | M | £140
Toast | Boiled Wool Crewneck Sweater | Ecru | 100% Pure Wool | L | £110
Paraboot | Michael Tyrolean Derby Shoes | Marron Brown | Waxy Calf Leather | EU 42 | £290
Studio Nicholson | Deep Pleat Voluminous Pant | Dark Navy | Peached Cotton Twill | W32 | £160`,
  },
];
