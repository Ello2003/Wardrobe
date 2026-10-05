import { WardrobeItem, LookbookOutfit, Season } from '../types';

export interface WardrobeCombination {
  id: string;
  title: string;
  occasion: string;
  season: Season;
  focalItemId?: string;
  itemIds: string[];
  items: WardrobeItem[];
  stylingRationale: string;
  colorPalette: string[];
  stylingTips: string[];
  vibe: string;
  engineUsed: 'gemini_grounded' | 'deterministic_local';
  groundingInsights?: string;
}

interface GenerateCombinationOptions {
  occasion?: string;
  season?: string;
  focalItemId?: string;
  numCombinations?: number;
}

// Color temperature & harmony mapping
const NEUTRAL_COLORS = new Set([
  'black', 'white', 'grey', 'gray', 'charcoal', 'navy', 'cream', 'beige', 
  'ecru', 'tan', 'off-white', 'sand', 'camel', 'ivory', 'stone'
]);

const EARTH_COLORS = new Set([
  'olive', 'khaki', 'brown', 'chocolate', 'rust', 'terracotta', 'forest green', 
  'moss', 'taupe', 'cognac', 'tobacco', 'tan', 'caramel'
]);

const RICH_ACCENT_COLORS = new Set([
  'burgundy', 'maroon', 'bordeaux', 'oxblood', 'emerald', 'mustard', 'indigo', 
  'cobalt', 'plum', 'terracotta', 'brick'
]);

// Helper to normalize color strings
function cleanColor(color?: string): string {
  if (!color) return 'neutral';
  return color.trim().toLowerCase();
}

// Check if colors harmonize
function areColorsHarmonious(c1: string, c2: string): boolean {
  const norm1 = cleanColor(c1);
  const norm2 = cleanColor(c2);

  if (norm1 === norm2) return true; // Monochromatic
  if (NEUTRAL_COLORS.has(norm1) || NEUTRAL_COLORS.has(norm2)) return true; // Neutrals pair with everything
  if (EARTH_COLORS.has(norm1) && EARTH_COLORS.has(norm2)) return true; // Earth-tone cohesion
  if ((EARTH_COLORS.has(norm1) && RICH_ACCENT_COLORS.has(norm2)) || (RICH_ACCENT_COLORS.has(norm1) && EARTH_COLORS.has(norm2))) return true;

  // Denim / Indigo matches almost all casual colors
  if (norm1.includes('denim') || norm1.includes('indigo') || norm1.includes('blue') ||
      norm2.includes('denim') || norm2.includes('indigo') || norm2.includes('blue')) {
    return true;
  }

  return false;
}

// Slot categorization
export function categorizeItemSlot(item: WardrobeItem): 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' {
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (
    cat.includes('outerwear') || cat.includes('coat') || cat.includes('jacket') || 
    cat.includes('blazer') || cat.includes('trench') || name.includes('coat') || 
    name.includes('jacket') || name.includes('overshirt')
  ) {
    return 'outerwear';
  }

  if (
    cat.includes('bottom') || cat.includes('trouser') || cat.includes('jean') || 
    cat.includes('pant') || cat.includes('shorts') || cat.includes('chino') || 
    name.includes('trouser') || name.includes('jeans') || name.includes('denim')
  ) {
    return 'bottoms';
  }

  if (
    cat.includes('shoe') || cat.includes('boot') || cat.includes('sneaker') || 
    cat.includes('loafer') || cat.includes('derby') || cat.includes('footwear') ||
    name.includes('shoe') || name.includes('boot') || name.includes('sneaker') || 
    name.includes('loafer')
  ) {
    return 'shoes';
  }

  if (
    cat.includes('accessory') || cat.includes('bag') || cat.includes('hat') || 
    cat.includes('cap') || cat.includes('scarf') || cat.includes('belt') || 
    cat.includes('watch') || cat.includes('eyewear') || cat.includes('sunglasses') ||
    cat.includes('socks')
  ) {
    return 'accessories';
  }

  // Default to tops (knitwear, shirts, t-shirts, polo, etc.)
  return 'tops';
}

/**
 * Deterministic local wardrobe combination engine.
 * Analyzes real items in the closet and constructs styled outfits
 * using color theory, silhouette layering, and occasion context.
 * Zero token cost, zero external API requirement.
 */
export function generateLocalWardrobeCombinations(
  allItems: WardrobeItem[],
  options: GenerateCombinationOptions = {}
): WardrobeCombination[] {
  // Only use clothing items (ignore homeware)
  const wearableItems = allItems.filter(
    (item) => !item.isArchived && item.itemType !== 'homeware_lifestyle'
  );

  if (wearableItems.length === 0) {
    return [];
  }

  const {
    occasion = 'All',
    season = 'All',
    focalItemId,
    numCombinations = 4,
  } = options;

  // Filter candidate pool by season if specified
  let pool = wearableItems;
  if (season && season !== 'All') {
    const seasonPool = pool.filter(
      (i) =>
        !i.season ||
        (Array.isArray(i.season)
          ? i.season.some((s) => s === season || s === 'All-Season')
          : (i.season as unknown as string) === season || (i.season as unknown as string) === 'All-Season')
    );
    if (seasonPool.length >= 3) {
      pool = seasonPool;
    }
  }

  // Group items by sartorial slot
  const tops = pool.filter((i) => categorizeItemSlot(i) === 'tops');
  const bottoms = pool.filter((i) => categorizeItemSlot(i) === 'bottoms');
  const outerwear = pool.filter((i) => categorizeItemSlot(i) === 'outerwear');
  const shoes = pool.filter((i) => categorizeItemSlot(i) === 'shoes');
  const accessories = pool.filter((i) => categorizeItemSlot(i) === 'accessories');

  // If focal item is provided, find it
  const focalItem = focalItemId ? pool.find((i) => i.id === focalItemId) : undefined;

  const results: WardrobeCombination[] = [];
  const usedCombos = new Set<string>();

  // Aesthetic styling templates
  const stylingAesthetics = [
    {
      vibe: 'Refined Parisian Sartorial',
      occasions: ['Work & Office', 'Evening & Dining', 'Date Night'],
      tipFormula: 'Tuck the base top cleanly and balance structured tailoring with soft textures.',
    },
    {
      vibe: 'Modern Relaxed Minimalist',
      occasions: ['Weekend Casual', 'Travel Capsule', 'Casual Everyday'],
      tipFormula: 'Lean into generous drape and subtle tonal contrast between pieces.',
    },
    {
      vibe: 'Heritage Casual & Layered Workwear',
      occasions: ['Weekend Casual', 'Seasonal Transition', 'Travel Capsule'],
      tipFormula: 'Layer a sturdy overshirt or coat over tactile knitwear for depth.',
    },
    {
      vibe: 'Quiet Luxury Earth Tones',
      occasions: ['Work & Office', 'Evening & Dining', 'Date Night'],
      tipFormula: 'Emphasize organic materials (wool, cotton, linen) with warm neutral accents.',
    },
  ];

  // Try creating combinations
  const targetCount = Math.min(numCombinations, 6);
  let attempts = 0;
  const maxAttempts = 120;

  while (results.length < targetCount && attempts < maxAttempts) {
    attempts++;

    // Pick base top & bottom
    let chosenTop: WardrobeItem | undefined;
    let chosenBottom: WardrobeItem | undefined;
    let chosenOuter: WardrobeItem | undefined;
    let chosenShoe: WardrobeItem | undefined;
    let chosenAcc: WardrobeItem | undefined;

    if (focalItem) {
      const slot = categorizeItemSlot(focalItem);
      if (slot === 'tops') chosenTop = focalItem;
      else if (slot === 'bottoms') chosenBottom = focalItem;
      else if (slot === 'outerwear') chosenOuter = focalItem;
      else if (slot === 'shoes') chosenShoe = focalItem;
      else if (slot === 'accessories') chosenAcc = focalItem;
    }

    if (!chosenTop && tops.length > 0) {
      chosenTop = tops[Math.floor(Math.random() * tops.length)];
    }
    if (!chosenBottom && bottoms.length > 0) {
      // Find a bottom that harmonizes with the top
      const harmonizingBottoms = bottoms.filter(
        (b) => !chosenTop || areColorsHarmonious(chosenTop.color, b.color)
      );
      chosenBottom =
        harmonizingBottoms.length > 0
          ? harmonizingBottoms[Math.floor(Math.random() * harmonizingBottoms.length)]
          : bottoms[Math.floor(Math.random() * bottoms.length)];
    }

    // Outerwear (preferred for layering)
    if (!chosenOuter && outerwear.length > 0 && Math.random() > 0.25) {
      const harmonizingOuter = outerwear.filter(
        (o) =>
          (!chosenTop || areColorsHarmonious(chosenTop.color, o.color)) &&
          (!chosenBottom || areColorsHarmonious(chosenBottom.color, o.color))
      );
      if (harmonizingOuter.length > 0) {
        chosenOuter = harmonizingOuter[Math.floor(Math.random() * harmonizingOuter.length)];
      } else {
        chosenOuter = outerwear[Math.floor(Math.random() * outerwear.length)];
      }
    }

    // Footwear
    if (!chosenShoe && shoes.length > 0) {
      chosenShoe = shoes[Math.floor(Math.random() * shoes.length)];
    }

    // Optional Accessory
    if (!chosenAcc && accessories.length > 0 && Math.random() > 0.5) {
      chosenAcc = accessories[Math.floor(Math.random() * accessories.length)];
    }

    const outfitPieces = [chosenOuter, chosenTop, chosenBottom, chosenShoe, chosenAcc].filter(
      (item): item is WardrobeItem => Boolean(item)
    );

    if (outfitPieces.length < 2) {
      break;
    }

    const comboKey = outfitPieces.map((p) => p.id).sort().join('-');
    if (usedCombos.has(comboKey)) {
      continue;
    }
    usedCombos.add(comboKey);

    // Aesthetic mapping
    const aesthetic = stylingAesthetics[results.length % stylingAesthetics.length];
    const resolvedOccasion =
      occasion !== 'All'
        ? occasion
        : aesthetic.occasions[Math.floor(Math.random() * aesthetic.occasions.length)];

    const firstPieceSeason = outfitPieces[0]?.season;
    const resolvedSeason: Season =
      season !== 'All'
        ? (season as Season)
        : Array.isArray(firstPieceSeason) && firstPieceSeason[0]
        ? firstPieceSeason[0]
        : 'All-Season';

    // Color palette extraction
    const rawColors = outfitPieces.map((p) => p.color || 'Neutral').filter(Boolean);
    const colorPalette = Array.from(new Set(rawColors));

    // Construct evocative title
    const heroPiece = chosenOuter || chosenTop || outfitPieces[0];
    const secondaryPiece = chosenBottom || chosenShoe || outfitPieces[1];
    const title = `${heroPiece.brand} ${heroPiece.name} & ${secondaryPiece.name}`;

    // Generate rationale based on actual garment properties
    const materials = outfitPieces
      .map((p) => p.material)
      .filter((m): m is string => Boolean(m && m.trim()));
    const materialSummary = materials.length > 0 ? ` featuring tactile ${materials.slice(0, 3).join(', ')}` : '';

    const sizes = outfitPieces
      .map((p) => p.size)
      .filter((s): s is string => Boolean(s && s.trim()));
    const sizeSummary = sizes.length > 0 ? ` (proportioned around ${sizes[0]} silhouette)` : '';

    const underwornItem = outfitPieces.find((p) => p.wearCount === 0 || p.wearCount < 3);

    const rationale = `A cohesive ${resolvedOccasion.toLowerCase()} ensemble${materialSummary}${sizeSummary}. The ${heroPiece.color || 'toned'} ${heroPiece.name} anchors the silhouette, naturally complemented by ${secondaryPiece.name} in ${secondaryPiece.color || 'neutral'}. The palette [${colorPalette.join(' + ')}] delivers effortless harmony with intentional texture layering.`;

    const stylingTips = [
      aesthetic.tipFormula,
      chosenOuter
        ? `Let the ${chosenOuter.name}${chosenOuter.material ? ` (${chosenOuter.material})` : ''} hang unbuttoned to showcase the layer underneath.`
        : 'Keep proportions balanced with a natural break at the hemline.',
      underwornItem
        ? `Wear-velocity optimization: Wearing your ${underwornItem.brand} ${underwornItem.name} (${underwornItem.wearCount} previous wears) drives down your cost-per-wear.`
        : `Perfect for ${resolvedOccasion.toLowerCase()} throughout ${resolvedSeason.toLowerCase()}.`,
    ];

    results.push({
      id: `ai-combo-${Date.now()}-${results.length}`,
      title,
      occasion: resolvedOccasion,
      season: resolvedSeason,
      focalItemId: focalItem?.id || heroPiece.id,
      itemIds: outfitPieces.map((p) => p.id),
      items: outfitPieces,
      stylingRationale: rationale,
      colorPalette,
      stylingTips,
      vibe: aesthetic.vibe,
      engineUsed: 'deterministic_local',
      groundingInsights: 'Curated locally using color-harmony matrices and sartorial silhouette balance.',
    });
  }

  return results;
}
