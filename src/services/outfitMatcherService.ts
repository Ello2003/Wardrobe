import {
  WardrobeItem,
  OutfitMatcherCombination,
  OutfitMatcherWeatherPreset,
  Season,
} from '../types';
import { safeApiFetch } from '../utils/apiHelper';
import { categorizeItemSlot } from '../utils/wardrobeCombinationEngine';

export const WEATHER_PRESETS: OutfitMatcherWeatherPreset[] = [
  {
    id: 'mild_transitional',
    label: 'Mild & Transitional (14°C - 19°C)',
    icon: 'CloudSun',
    temperature: '16°C',
    tempRange: [14, 19],
    conditionDescription: 'Temperate overcast with pleasant breeze',
    layeringFocus: 'Light overshirt or chore coat over cotton tee, paired with chinos or denim.',
  },
  {
    id: 'sunny_warm',
    label: 'Sunny & Warm (20°C - 26°C)',
    icon: 'Sun',
    temperature: '22°C',
    tempRange: [20, 26],
    conditionDescription: 'Clear blue skies with direct sunshine',
    layeringFocus: 'Breathable linen or poplin tops, relaxed light trousers, and clean low-profile shoes.',
  },
  {
    id: 'breezy_chilly',
    label: 'Breezy & Chilly (9°C - 13°C)',
    icon: 'Wind',
    temperature: '11°C',
    tempRange: [9, 13],
    conditionDescription: 'Brisk wind requiring moderate insulation',
    layeringFocus: 'Merino wool knitwear, midweight chore jacket, raw denim, and leather chelsea boots.',
  },
  {
    id: 'cold_winter',
    label: 'Cold & Winter (0°C - 8°C)',
    icon: 'Snowflake',
    temperature: '4°C',
    tempRange: [0, 8],
    conditionDescription: 'Crisp freezing air and frost',
    layeringFocus: 'Heavy wool overcoat, cashmere mock-neck, tailored wool trousers, and Dainite sole boots.',
  },
  {
    id: 'rainy_damp',
    label: 'Rainy & Wet Weather (8°C - 15°C)',
    icon: 'CloudRain',
    temperature: '12°C',
    tempRange: [8, 15],
    conditionDescription: 'Active rainfall and wet pavements',
    layeringFocus: 'Waxed cotton jacket or waterproof trench, dark selvedge denim, and weather-treated leather shoes.',
  },
  {
    id: 'hot_summer',
    label: 'High Summer Heat (27°C - 35°C)',
    icon: 'SunMedium',
    temperature: '29°C',
    tempRange: [27, 35],
    conditionDescription: 'Intense summer heat and humidity',
    layeringFocus: 'Unbuttoned camp-collar shirt, linen shorts or light trousers, and breathable slip-ons.',
  },
];

export interface OutfitMatcherRequest {
  wardrobeItems: WardrobeItem[];
  weatherPresetId?: string;
  customTempC?: number;
  customCondition?: string;
  occasion?: string;
  focalItemId?: string;
  numCombinations?: number;
  enableGemini?: boolean;
}

export interface OutfitMatcherResponse {
  success: boolean;
  combinations: OutfitMatcherCombination[];
  engine: 'gemini_grounded' | 'deterministic_weather_matcher';
  weatherUsed: {
    label: string;
    temperature: string;
    conditions: string;
  };
  occasionUsed: string;
  count: number;
  message?: string;
}

// Color palette harmonizer
function getPaletteForItems(items: WardrobeItem[]): string[] {
  const defaultColors = ['#1E293B', '#8C7355', '#E2E8F0', '#475569'];
  const extracted = items
    .map((i) => i.color)
    .filter(Boolean) as string[];

  if (extracted.length === 0) return defaultColors;
  return Array.from(new Set(extracted)).slice(0, 4);
}

/**
 * Local deterministic Outfit Matcher based on real meteorological rules and garment thermodynamics
 */
export function generateLocalWeatherMatchedOutfits(
  params: OutfitMatcherRequest
): OutfitMatcherCombination[] {
  const {
    wardrobeItems,
    weatherPresetId = 'mild_transitional',
    customTempC,
    occasion = 'Smart Casual',
    focalItemId,
    numCombinations = 3,
  } = params;

  const preset =
    WEATHER_PRESETS.find((p) => p.id === weatherPresetId) || WEATHER_PRESETS[0];
  const effectiveTemp = customTempC !== undefined ? customTempC : preset.tempRange[0] + 2;

  // Filter wearable clothing pieces
  const wearable = wardrobeItems.filter(
    (item) => !item.isArchived && item.itemType !== 'homeware_lifestyle'
  );

  if (wearable.length < 2) return [];

  const tops = wearable.filter((i) => categorizeItemSlot(i) === 'tops');
  const bottoms = wearable.filter((i) => categorizeItemSlot(i) === 'bottoms');
  const outerwear = wearable.filter((i) => categorizeItemSlot(i) === 'outerwear');
  const shoes = wearable.filter((i) => categorizeItemSlot(i) === 'shoes');
  const accessories = wearable.filter((i) => categorizeItemSlot(i) === 'accessories');

  const focalItem = focalItemId ? wearable.find((i) => i.id === focalItemId) : null;
  const isCold = effectiveTemp < 12;
  const isVeryCold = effectiveTemp < 7;
  const isWarm = effectiveTemp >= 20;
  const isRain = preset.id === 'rainy_damp';

  const results: OutfitMatcherCombination[] = [];

  // Generate varied options
  const targetBottoms = bottoms.length > 0 ? bottoms : wearable.filter((i) => i.category.toLowerCase().includes('bottom') || i.category.toLowerCase().includes('trouser'));
  const targetTops = tops.length > 0 ? tops : wearable.filter((i) => i.category.toLowerCase().includes('shirt') || i.category.toLowerCase().includes('top') || i.category.toLowerCase().includes('knit'));
  const targetShoes = shoes.length > 0 ? shoes : wearable.filter((i) => i.category.toLowerCase().includes('shoe') || i.category.toLowerCase().includes('boot'));

  for (let idx = 0; idx < numCombinations; idx++) {
    const comboPieces: WardrobeItem[] = [];

    // If focal item provided, guarantee inclusion
    if (focalItem && !comboPieces.some((p) => p.id === focalItem.id)) {
      comboPieces.push(focalItem);
    }

    // Pick a Top
    if (!comboPieces.some((p) => categorizeItemSlot(p) === 'tops') && targetTops.length > 0) {
      const topPick = targetTops[idx % targetTops.length];
      comboPieces.push(topPick);
    }

    // Pick a Bottom
    if (!comboPieces.some((p) => categorizeItemSlot(p) === 'bottoms') && targetBottoms.length > 0) {
      const bottomPick = targetBottoms[(idx + 1) % targetBottoms.length];
      comboPieces.push(bottomPick);
    }

    // Outerwear logic based on weather
    if (isCold || isVeryCold || isRain || occasion.includes('Office') || occasion.includes('Formal')) {
      if (outerwear.length > 0 && !comboPieces.some((p) => categorizeItemSlot(p) === 'outerwear')) {
        const coatPick = outerwear[idx % outerwear.length];
        comboPieces.push(coatPick);
      }
    }

    // Shoes logic
    if (!comboPieces.some((p) => categorizeItemSlot(p) === 'shoes') && targetShoes.length > 0) {
      const shoePick = targetShoes[idx % targetShoes.length];
      comboPieces.push(shoePick);
    }

    // Optional accessory
    if (accessories.length > 0 && comboPieces.length < 5) {
      const accPick = accessories[idx % accessories.length];
      if (!comboPieces.some((p) => p.id === accPick.id)) {
        comboPieces.push(accPick);
      }
    }

    // Make sure we have at least 2 distinct items
    if (comboPieces.length < 2) continue;

    // Build meteorological rationale
    let weatherRationale = '';
    if (isVeryCold) {
      weatherRationale = `Tailored for frosty ${effectiveTemp}°C winter conditions: Prioritizes thermal density, shielding wind chill with structured heavy layers while maintaining clean tailoring.`;
    } else if (isCold) {
      weatherRationale = `Optimized for brisk ${effectiveTemp}°C weather: Strategic midweight layering ensures core insulation while allowing temperature regulation if indoors.`;
    } else if (isRain) {
      weatherRationale = `Curated for wet weather at ${effectiveTemp}°C: Relies on water-deflecting fabrics, resilient footwear, and ground-clearance hems that protect against rain spray.`;
    } else if (isWarm) {
      weatherRationale = `Engineered for warm ${effectiveTemp}°C temperatures: Prioritizes breathable weave drape, moisture-wicking natural fibers, and relaxed effortless proportions.`;
    } else {
      weatherRationale = `Harmonized for transitional ${effectiveTemp}°C conditions: Balances versatile mid-layers with agile breathable foundations that adapt to changing daily temperatures.`;
    }

    const titles = [
      `${occasion} ${preset.label.split(' ')[0]} Capsule`,
      `Sartorial ${preset.label.split(' ')[0]} Formulation`,
      `Urban Architectural ${occasion} Formula`,
      `Heritage Minimalist ${preset.label.split(' ')[0]} Look`,
    ];

    const missingPieces = [
      {
        name: 'Fine Gauge Merino Crewneck',
        category: 'Knitwear',
        suggestedRetailer: 'Arket',
        searchQuery: 'Arket merino wool crewneck jumper',
        estimatedPriceGbp: 79,
        reason: `Layering between shirt and jacket adds ideal thermal warmth for ${effectiveTemp}°C.`,
      },
      {
        name: 'Handcrafted Goodyear-Welt Suede Chelsea Boots',
        category: 'Shoes',
        suggestedRetailer: 'Loake',
        searchQuery: 'Loake brown suede chelsea boots Dainite sole',
        estimatedPriceGbp: 220,
        reason: 'Adds grounded textural depth and all-weather rubber grip.',
      },
      {
        name: 'Tailored Wool-Cashmere Scarf',
        category: 'Accessories',
        suggestedRetailer: 'End Clothing',
        searchQuery: 'Acne Studios wool fringed scarf',
        estimatedPriceGbp: 150,
        reason: 'Offers instantaneous wind protection and tonal color framing.',
      },
    ];

    const baseCohesion = 91 + (idx * 3) % 8;

    results.push({
      id: `matcher-local-${idx}-${Date.now()}`,
      title: titles[idx % titles.length],
      occasion: occasion === 'All' ? 'Smart Casual' : occasion,
      season: (isVeryCold || isCold ? 'Winter' : isWarm ? 'Summer' : 'Autumn') as Season,
      weatherRecommendation: weatherRationale,
      weatherConditions: `${preset.temperature} · ${preset.conditionDescription}`,
      itemIds: comboPieces.map((p) => p.id),
      items: comboPieces,
      stylingRationale: `Cohesive ensemble featuring ${comboPieces.map((p) => p.brand).filter(Boolean).join(', ')}. Tonal balance coordinates ${comboPieces.map((p) => p.color || 'neutral').join(', ')} while balancing silhouettes for ${occasion}.`,
      colorPalette: getPaletteForItems(comboPieces),
      stylingTips: [
        'Balance structural proportions: keep outer garment unbuttoned for vertical elongation.',
        isCold ? 'Layer cuffs slightly to expose contrasting knit texture.' : 'Keep collar soft and uncluttered.',
        'Match belt and shoe leather finishes for polished cohesion.',
      ],
      vibe: isCold ? 'Cozy Sartorialist' : isWarm ? 'Effortless Mediterranean' : 'Modern Urban Tailoring',
      cohesionScore: baseCohesion,
      engineUsed: 'deterministic_weather_matcher',
      suggestedMissingPiece: missingPieces[idx % missingPieces.length],
    });
  }

  return results;
}

/**
 * Main AI Outfit Matcher caller: queries Gemini API with live fallback
 */
export async function matchOutfitsForWeatherAndOccasion(
  params: OutfitMatcherRequest
): Promise<OutfitMatcherResponse> {
  const preset =
    WEATHER_PRESETS.find((p) => p.id === params.weatherPresetId) || WEATHER_PRESETS[0];
  const occasion = params.occasion || 'Smart Casual';

  try {
    const res = await safeApiFetch('/api/gemini/outfit-matcher', {
      method: 'POST',
      body: JSON.stringify({
        wardrobeItems: params.wardrobeItems,
        weatherPresetId: params.weatherPresetId,
        customTempC: params.customTempC,
        customCondition: params.customCondition,
        occasion: params.occasion,
        focalItemId: params.focalItemId,
        numCombinations: params.numCombinations || 3,
      }),
    });

    if (
      res.success &&
      res.data &&
      Array.isArray(res.data.combinations) &&
      res.data.combinations.length > 0
    ) {
      // Re-link items from wardrobeItems to ensure full item hydration
      const hydrated = res.data.combinations.map((combo: OutfitMatcherCombination) => {
        const fullItems = (combo.itemIds || [])
          .map((id) => params.wardrobeItems.find((w) => w.id === id))
          .filter(Boolean) as WardrobeItem[];

        return {
          ...combo,
          items: fullItems.length > 0 ? fullItems : combo.items,
        };
      });

      return {
        success: true,
        combinations: hydrated,
        engine: 'gemini_grounded',
        weatherUsed: {
          label: preset.label,
          temperature: preset.temperature,
          conditions: preset.conditionDescription,
        },
        occasionUsed: occasion,
        count: hydrated.length,
        message: 'Synthesized by Gemini AI with thermodynamic weather grounding.',
      };
    }
  } catch (err) {
    console.warn('AI Outfit Matcher API call failed, engaging deterministic local matcher:', err);
  }

  // Robust fallback
  const localCombos = generateLocalWeatherMatchedOutfits(params);
  return {
    success: true,
    combinations: localCombos,
    engine: 'deterministic_weather_matcher',
    weatherUsed: {
      label: preset.label,
      temperature: preset.temperature,
      conditions: preset.conditionDescription,
    },
    occasionUsed: occasion,
    count: localCombos.length,
    message: 'Generated via meteorological weather-layering engine.',
  };
}
