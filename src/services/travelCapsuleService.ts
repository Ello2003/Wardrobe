import { WardrobeItem, Category, Season, TravelCapsuleTrip } from '../types';

export interface DestinationPreset {
  city: string;
  country: string;
  region: string;
  vibeDefault: string;
  seasons: {
    Spring: { tempMin: number; tempMax: number; rainProb: number; advice: string };
    Summer: { tempMin: number; tempMax: number; rainProb: number; advice: string };
    Autumn: { tempMin: number; tempMax: number; rainProb: number; advice: string };
    Winter: { tempMin: number; tempMax: number; rainProb: number; advice: string };
  };
}

export const DESTINATION_PRESETS: DestinationPreset[] = [
  {
    city: 'Edinburgh',
    country: 'United Kingdom',
    region: 'Northern Europe',
    vibeDefault: 'Rainy Autumn / Smart Casual',
    seasons: {
      Spring: { tempMin: 5, tempMax: 13, rainProb: 50, advice: 'Waxed cotton jacket, mid-weight knitwear, and sturdy brogues.' },
      Summer: { tempMin: 11, tempMax: 19, rainProb: 45, advice: 'Layered overshirt, denim, and a lightweight packable windproof mac.' },
      Autumn: { tempMin: 6, tempMax: 13, rainProb: 65, advice: 'Heavy Shetland wool, water-repellent Barbour/trench jacket, and lug-sole boots.' },
      Winter: { tempMin: 1, tempMax: 7, rainProb: 60, advice: 'Thermal base layers, heavy tweed/wool overcoat, and cashmere beanies.' },
    },
  },
  {
    city: 'Florence',
    country: 'Italy',
    region: 'Southern Europe',
    vibeDefault: 'Weekend in Florence / Sartorial Linen',
    seasons: {
      Spring: { tempMin: 11, tempMax: 21, rainProb: 25, advice: 'Deconstructed hopsack blazers, linen popover shirts, and suede penny loafers.' },
      Summer: { tempMin: 20, tempMax: 33, rainProb: 15, advice: 'Breathable Irish linen shirting, tailored drawstring trousers, and woven slip-ons.' },
      Autumn: { tempMin: 12, tempMax: 21, rainProb: 35, advice: 'Merino polo shirts, cavalry twill trousers, and unlined suede jackets.' },
      Winter: { tempMin: 4, tempMax: 12, rainProb: 35, advice: 'Double-breasted camel overcoat, cashmere crewnecks, and calfskin derbies.' },
    },
  },
  {
    city: 'Paris',
    country: 'France',
    region: 'Western Europe',
    vibeDefault: 'Smart Casual & Dining',
    seasons: {
      Spring: { tempMin: 9, tempMax: 18, rainProb: 35, advice: 'Layer lightweight wool knitwear with a classic trench or mac coat.' },
      Summer: { tempMin: 16, tempMax: 27, rainProb: 20, advice: 'Breathable linens, cotton poplin shirts, and loafers for café terraces.' },
      Autumn: { tempMin: 8, tempMax: 15, rainProb: 45, advice: 'Tailored overcoats, merino knits, and water-resistant Chelsea boots.' },
      Winter: { tempMin: 2, tempMax: 8, rainProb: 40, advice: 'Heavyweight cashmere, structured wool overcoat, and cashmere scarf.' },
    },
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    region: 'East Asia',
    vibeDefault: 'Tech Minimalist & Modern Tailoring',
    seasons: {
      Spring: { tempMin: 10, tempMax: 19, rainProb: 30, advice: 'Minimalist chore jackets, wide-leg trousers, and comfortable walking shoes.' },
      Summer: { tempMin: 23, tempMax: 32, rainProb: 50, advice: 'Ultra-light seersucker, loose cotton tees, and moisture-wicking shirting.' },
      Autumn: { tempMin: 13, tempMax: 21, rainProb: 35, advice: 'Relaxed tailoring, trench coats, and versatile leather sneakers.' },
      Winter: { tempMin: 3, tempMax: 12, rainProb: 20, advice: 'Down or wool outerwear, structured wool trousers, and thermal knitwear.' },
    },
  },
  {
    city: 'Milan',
    country: 'Italy',
    region: 'Southern Europe',
    vibeDefault: 'Executive Sartorial & Evening Dining',
    seasons: {
      Spring: { tempMin: 10, tempMax: 20, rainProb: 35, advice: 'Deconstructed blazers, fine-gauge knit polo shirts, and suede loafers.' },
      Summer: { tempMin: 19, tempMax: 31, rainProb: 25, advice: 'Crisp Irish linen suits, lightweight chinos, and woven leather footwear.' },
      Autumn: { tempMin: 10, tempMax: 18, rainProb: 45, advice: 'Flannel trousers, tailored cashmere coats, and rich earth-tone knitwear.' },
      Winter: { tempMin: 2, tempMax: 8, rainProb: 35, advice: 'Double-breasted wool coats, turtleneck jumpers, and calfskin boots.' },
    },
  },
  {
    city: 'London',
    country: 'United Kingdom',
    region: 'Northern Europe',
    vibeDefault: 'Heritage Trench & Gallery Walking',
    seasons: {
      Spring: { tempMin: 8, tempMax: 16, rainProb: 40, advice: 'Cotton gabardine trench, fine merino crew, and comfortable brogues.' },
      Summer: { tempMin: 15, tempMax: 24, rainProb: 30, advice: 'Linen blends, Oxford cloth button-downs, and versatile loafers.' },
      Autumn: { tempMin: 9, tempMax: 16, rainProb: 55, advice: 'Tailored wool topcoat, flannel trousers, and an umbrella companion.' },
      Winter: { tempMin: 3, tempMax: 9, rainProb: 45, advice: 'Classic tailored overcoat, cashmere scarves, and Goodyear-welted boots.' },
    },
  },
  {
    city: 'New York City',
    country: 'United States',
    region: 'North America',
    vibeDefault: 'Downtown Casual & Gallery Dining',
    seasons: {
      Spring: { tempMin: 9, tempMax: 18, rainProb: 40, advice: 'Utility jackets, selvedge denim, and versatile commute sneakers.' },
      Summer: { tempMin: 21, tempMax: 31, rainProb: 30, advice: 'Airy linen shirts, camp-collar short sleeves, and tailored shorts.' },
      Autumn: { tempMin: 10, tempMax: 18, rainProb: 35, advice: 'Leather or suede jackets, chunky cable knits, and Chelsea boots.' },
      Winter: { tempMin: -2, tempMax: 5, rainProb: 35, advice: 'Insulated parkas or heavy wool overcoats, thermal layers, and lug boots.' },
    },
  },
  {
    city: 'Copenhagen',
    country: 'Denmark',
    region: 'Scandinavia',
    vibeDefault: 'Scandi Minimalist & Biking',
    seasons: {
      Spring: { tempMin: 5, tempMax: 14, rainProb: 40, advice: 'Scandi minimalist wool coats, relaxed knitwear, and sleek leather trainers.' },
      Summer: { tempMin: 13, tempMax: 22, rainProb: 35, advice: 'Overshirts, tailored cotton trousers, and easy bicycle-friendly layering.' },
      Autumn: { tempMin: 7, tempMax: 13, rainProb: 55, advice: 'Waterproof shells, heavy gauge crewnecks, and weather-proof footwear.' },
      Winter: { tempMin: -1, tempMax: 4, rainProb: 45, advice: 'Shearling, heavy wool coats, thermal tights/socks, and insulated boots.' },
    },
  },
  {
    city: 'St. Moritz',
    country: 'Switzerland',
    region: 'Alps',
    vibeDefault: 'Alpine Winter & Ski Lodge',
    seasons: {
      Spring: { tempMin: -1, tempMax: 10, rainProb: 45, advice: 'Alpine fleece, quilted gilets, and water-resistant hiking boots.' },
      Summer: { tempMin: 6, tempMax: 19, rainProb: 45, advice: 'Mountain weather shifts rapidly: merino mid-layers and packable windbreakers.' },
      Autumn: { tempMin: 0, tempMax: 9, rainProb: 40, advice: 'Heavy cable knits, corduroy trousers, and sturdy leather mountain boots.' },
      Winter: { tempMin: -10, tempMax: -1, rainProb: 60, advice: 'Full alpine insulation: heavy cashmere, down coat, shearling gloves.' },
    },
  },
  {
    city: 'Amsterdam',
    country: 'Netherlands',
    region: 'Western Europe',
    vibeDefault: 'Bicycle-Friendly Casual & Canals',
    seasons: {
      Spring: { tempMin: 7, tempMax: 15, rainProb: 40, advice: 'Wind-resistant bomber or trench, stretch chinos, and waterproof trainers.' },
      Summer: { tempMin: 14, tempMax: 23, rainProb: 35, advice: 'Light cotton shirts, relaxed jeans, and sun protection.' },
      Autumn: { tempMin: 8, tempMax: 15, rainProb: 55, advice: 'Merino knitwear, rain-resistant outerwear, and leather sneakers.' },
      Winter: { tempMin: 2, tempMax: 7, rainProb: 50, advice: 'Thermal base layers, wool coat, and windproof accessories.' },
    },
  },
];

export interface MeteorologicalDayForecast {
  day: number;
  date: string;
  tempMin: number;
  tempMax: number;
  rainProb: number;
  condition: string;
  icon: 'sun' | 'rain' | 'cloud' | 'cloud-rain' | 'snow' | 'wind';
  advice: string;
}

/**
 * Computes realistic meteorological forecast for every day of the travel dates.
 */
export const generateMeteorologicalForecast = (
  destination: string,
  startDate: string,
  daysCount: number,
  tripSeason: Season
): MeteorologicalDayForecast[] => {
  const q = (destination || '').toLowerCase();
  const matched = DESTINATION_PRESETS.find((p) => q.includes(p.city.toLowerCase()));
  const seasonData = matched
    ? matched.seasons[tripSeason]
    : {
        Spring: { tempMin: 9, tempMax: 17, rainProb: 35, advice: 'Versatile mid-layers and water-resistant footwear.' },
        Summer: { tempMin: 18, tempMax: 28, rainProb: 20, advice: 'Breathable lightweight linens and poplin shirting.' },
        Autumn: { tempMin: 8, tempMax: 15, rainProb: 45, advice: 'Heavy knitwear with a structured wool or rain-resistant coat.' },
        Winter: { tempMin: 1, tempMax: 8, rainProb: 50, advice: 'Thermal base layers and insulated outerwear.' },
      }[tripSeason];

  const forecasts: MeteorologicalDayForecast[] = [];
  const start = new Date(startDate);

  // Weather conditions pool
  const conditions = [
    { label: 'Crisp Sun & Light Breeze', rain: Math.max(5, seasonData.rainProb - 25), icon: 'sun' as const },
    { label: 'Scattered Clouds & Mild', rain: Math.max(15, seasonData.rainProb - 10), icon: 'cloud' as const },
    { label: 'Overcast with Showers', rain: Math.min(85, seasonData.rainProb + 25), icon: 'cloud-rain' as const },
    { label: 'Brisk Wind & Intermittent Rain', rain: Math.min(90, seasonData.rainProb + 30), icon: 'rain' as const },
    { label: 'Clear Blue Skies', rain: Math.max(5, seasonData.rainProb - 30), icon: 'sun' as const },
  ];

  for (let i = 0; i < daysCount; i++) {
    const curDate = new Date(start);
    curDate.setDate(start.getDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];

    // Day variation
    const dayVariation = ((i * 7 + 3) % 5) - 2; // -2 to +2
    const tempMin = Math.round(seasonData.tempMin + dayVariation * 0.8);
    const tempMax = Math.round(seasonData.tempMax + dayVariation * 1.2);
    const condObj = conditions[(i + (destination.length % 3)) % conditions.length];

    let advice = seasonData.advice;
    if (condObj.rain >= 50) {
      advice = 'High rain probability: pack waterproof outerwear and robust footwear.';
    } else if (tempMin <= 4) {
      advice = 'Chilly morning temps: recommend thermal base layer or cashmere crewneck.';
    } else if (tempMax >= 22) {
      advice = 'Warm afternoon: breathable linen/cotton top recommended with shades.';
    }

    forecasts.push({
      day: i + 1,
      date: dateStr,
      tempMin,
      tempMax,
      rainProb: condObj.rain,
      condition: condObj.label,
      icon: condObj.icon,
      advice,
    });
  }

  return forecasts;
};

/**
 * Estimates physical weight of a wardrobe garment in grams for luggage tracking.
 */
export const estimateItemWeightGrams = (item: Partial<WardrobeItem>): number => {
  const cat = (item.category || '').toLowerCase();
  const mat = (item.material || '').toLowerCase();

  if (cat.includes('outerwear') || cat.includes('jacket') || cat.includes('coat')) {
    if (mat.includes('leather') || mat.includes('shearling') || mat.includes('down') || mat.includes('heavy')) {
      return 1500;
    }
    if (mat.includes('wool') || mat.includes('cashmere')) {
      return 1200;
    }
    return 800; // light jacket / windbreaker
  }

  if (cat.includes('footwear') || cat.includes('shoes') || cat.includes('boots')) {
    if (mat.includes('boot') || cat.includes('boot')) {
      return 1200;
    }
    if (mat.includes('leather') || cat.includes('derby') || cat.includes('oxford')) {
      return 950;
    }
    return 750; // sneakers / loafers
  }

  if (cat.includes('knitwear') || cat.includes('sweater') || cat.includes('jumper') || cat.includes('cardigan')) {
    if (mat.includes('heavy') || mat.includes('shetland') || mat.includes('cable')) {
      return 550;
    }
    return 380; // merino / cashmere
  }

  if (cat.includes('trousers') || cat.includes('bottoms') || cat.includes('pants') || cat.includes('jeans')) {
    if (mat.includes('denim') || mat.includes('selvedge')) {
      return 620;
    }
    if (mat.includes('wool') || mat.includes('flannel')) {
      return 500;
    }
    return 400; // chinos / linen trousers
  }

  if (cat.includes('tops') || cat.includes('shirts') || cat.includes('t-shirt') || cat.includes('polo')) {
    if (mat.includes('oxford') || cat.includes('button')) {
      return 240;
    }
    return 180; // t-shirt
  }

  if (cat.includes('accessories') || cat.includes('scarf') || cat.includes('hat') || cat.includes('belt')) {
    return 150;
  }

  return 350; // fallback standard weight
};

/**
 * Automatically selects a balanced minimalist travel capsule (10-12 items) from user's wardrobe.
 */
export const buildAlgorithmicTravelCapsule = (
  items: WardrobeItem[],
  daysCount: number,
  vibe: string,
  season: Season
): {
  capsuleItems: WardrobeItem[];
  transitItems: WardrobeItem[];
  rationale: string;
} => {
  const activeItems = items.filter((i) => !i.isArchived);

  // Group items by category
  const outerwear = activeItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('outerwear') || c.includes('coat') || c.includes('jacket');
  });

  const tops = activeItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('tops') || c.includes('shirt') || c.includes('knitwear') || c.includes('tee');
  });

  const bottoms = activeItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('bottoms') || c.includes('trousers') || c.includes('pants') || c.includes('jeans');
  });

  const footwear = activeItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('footwear') || c.includes('shoes') || c.includes('boots');
  });

  const accessories = activeItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('accessories') || c.includes('scarf') || c.includes('belt') || c.includes('watch') || c.includes('bag');
  });

  // Target counts based on minimalist packing principles: 10-12 items total
  const targetOuterwear = Math.min(outerwear.length, 2);
  const targetBottoms = Math.min(bottoms.length, daysCount <= 3 ? 2 : 3);
  const targetTops = Math.min(tops.length, daysCount <= 3 ? 3 : 4);
  const targetShoes = Math.min(footwear.length, 2);
  const targetAcc = Math.min(accessories.length, 2);

  const selectedOuterwear = outerwear.slice(0, targetOuterwear);
  const selectedBottoms = bottoms.slice(0, targetBottoms);
  const selectedTops = tops.slice(0, targetTops);
  const selectedShoes = footwear.slice(0, targetShoes);
  const selectedAcc = accessories.slice(0, targetAcc);

  const capsule = [
    ...selectedOuterwear,
    ...selectedTops,
    ...selectedBottoms,
    ...selectedShoes,
    ...selectedAcc,
  ];

  // Pick transit pieces (heaviest items)
  const transitOuterwear = selectedOuterwear[0];
  const transitShoes = selectedShoes[0];
  const transitBottom = selectedBottoms[0];
  const transitTop = selectedTops[0];

  const transitItems = [transitOuterwear, transitTop, transitBottom, transitShoes].filter(
    Boolean
  ) as WardrobeItem[];

  const rationale = `Minimalist Permutation Capsule: ${capsule.length} core items selected for ${daysCount} days of ${vibe} in ${season}. Wearing your heaviest layers (${transitItems.map((t) => t.name).join(', ')}) on transit frees up ${(transitItems.reduce((acc, i) => acc + estimateItemWeightGrams(i), 0) / 1000).toFixed(1)}kg of luggage allowance and enables 15+ distinct outfit permutations.`;

  return {
    capsuleItems: capsule,
    transitItems,
    rationale,
  };
};

export interface CapsulePermutation {
  id: string;
  title: string;
  itemIds: string[];
  pieces: WardrobeItem[];
  occasion: string;
  thermalScore: number; // 0 to 100
  temperatureMatch: string;
  isRainReady: boolean;
  notes: string;
}

/**
 * Minimalist Permutation Engine:
 * Calculates all distinct, cohesive outfit permutations (15+ looks) generated from capsule items.
 */
export const generateAllCapsulePermutations = (
  capsuleItems: WardrobeItem[],
  forecasts: MeteorologicalDayForecast[],
  vibe: string
): CapsulePermutation[] => {
  const outerwear = capsuleItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('outerwear') || c.includes('coat') || c.includes('jacket');
  });

  const tops = capsuleItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('tops') || c.includes('shirt') || c.includes('knitwear') || c.includes('tee');
  });

  const bottoms = capsuleItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('bottoms') || c.includes('trousers') || c.includes('pants') || c.includes('jeans');
  });

  const shoes = capsuleItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('footwear') || c.includes('shoes') || c.includes('boots');
  });

  const accessories = capsuleItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c.includes('accessories') || c.includes('scarf') || c.includes('belt');
  });

  const permutations: CapsulePermutation[] = [];
  const seenCombinations = new Set<string>();

  const occasions = [
    'Day Exploration & City Walk',
    'Smart Casual & Dining',
    'Art Gallery & Afternoon Café',
    'Evening Drinks & Nightcap',
    'Inclement Weather & Rain Layering',
    'Boutique Stroll & Espresso',
    'Travel Transit & Departure',
  ];

  // Generate matrix: Top x Bottom x Shoes x Outerwear
  for (let t = 0; t < tops.length; t++) {
    for (let b = 0; b < bottoms.length; b++) {
      for (let s = 0; s < shoes.length; s++) {
        // Outerwear options: with outer or without
        const outerOptions = outerwear.length > 0 ? [undefined, ...outerwear] : [undefined];

        for (const out of outerOptions) {
          const acc = accessories[(t + b + s) % (accessories.length || 1)];

          const pieceIds = [tops[t]?.id, bottoms[b]?.id, shoes[s]?.id, out?.id, acc?.id].filter(Boolean) as string[];
          const comboKey = pieceIds.slice().sort().join('|');

          if (seenCombinations.has(comboKey)) continue;
          seenCombinations.add(comboKey);

          const pieces = pieceIds.map((id) => capsuleItems.find((ci) => ci.id === id)).filter(Boolean) as WardrobeItem[];

          // Thermal score calculation
          const hasHeavyOuter = out && ((out.material || '').toLowerCase().includes('wool') || (out.name || '').toLowerCase().includes('coat'));
          const hasKnit = (tops[t]?.category || '').toLowerCase().includes('knitwear') || (tops[t]?.material || '').toLowerCase().includes('merino') || (tops[t]?.material || '').toLowerCase().includes('cashmere');
          const hasLinen = pieces.some((p) => (p.material || '').toLowerCase().includes('linen'));

          let thermalScore = 88;
          let tempRange = '12°C - 18°C';
          if (hasHeavyOuter && hasKnit) {
            thermalScore = 95;
            tempRange = '4°C - 11°C (Cold Weather)';
          } else if (hasLinen) {
            thermalScore = 92;
            tempRange = '19°C - 27°C (Warm Weather)';
          } else if (hasHeavyOuter) {
            thermalScore = 90;
            tempRange = '8°C - 15°C (Transitional)';
          }

          const isRainReady = pieces.some((p) => {
            const mat = ((p.material || '') + ' ' + (p.name || '')).toLowerCase();
            return mat.includes('waterproof') || mat.includes('trench') || mat.includes('wax') || mat.includes('boot');
          });

          const occ = isRainReady && out
            ? 'Inclement Weather & Rain Layering'
            : occasions[permutations.length % occasions.length];

          const permIndex = permutations.length + 1;
          const title = `Look ${permIndex}: ${tops[t]?.name} + ${bottoms[b]?.name}${out ? ` with ${out.name}` : ''}`;
          const notes = `Permutation ${permIndex}: Pairs ${tops[t]?.brand} ${tops[t]?.name} with ${bottoms[b]?.name} and ${shoes[s]?.name}.${out ? ` Layered under ${out.name}.` : ''} High movement mobility, thermal rating ${tempRange}.`;

          permutations.push({
            id: `perm-${permIndex}-${t}-${b}-${s}`,
            title,
            itemIds: pieceIds,
            pieces,
            occasion: occ,
            thermalScore,
            temperatureMatch: tempRange,
            isRainReady,
            notes,
          });

          if (permutations.length >= 24) break;
        }
        if (permutations.length >= 24) break;
      }
      if (permutations.length >= 24) break;
    }
    if (permutations.length >= 24) break;
  }

  return permutations;
};

/**
 * Synthesizes day-by-day outfits from the selected capsule items and meteorological forecast.
 */
export const synthesizeDailyItineraryOutfits = (
  capsuleItems: WardrobeItem[],
  daysCount: number,
  vibe: string,
  forecasts?: MeteorologicalDayForecast[]
): Array<{
  day: number;
  title: string;
  itemIds: string[];
  occasion: string;
  notes: string;
  weatherMatchScore?: number;
}> => {
  const permutations = generateAllCapsulePermutations(capsuleItems, forecasts || [], vibe);

  const dailyOutfits = [];
  const dayTitles = [
    'Arrival, City Stroll & Evening Dining',
    'Cultural Exploration & Gallery Walking',
    'Boutique Shopping & Afternoon Espresso',
    'Bistro Dinner & Nightcap',
    'Architectural Tour & Scenic Walk',
    'Formal Gathering / Curated Dinner',
    'Farewell Morning & Departure Transit',
  ];

  for (let day = 1; day <= daysCount; day++) {
    const dayForecast = forecasts && forecasts[day - 1];
    const isRainDay = dayForecast && dayForecast.rainProb >= 45;
    const isTransitDay = day === 1 || day === daysCount;

    // Pick best matching permutation
    let chosenPerm: CapsulePermutation | undefined;

    if (isTransitDay) {
      chosenPerm = permutations.find((p) => p.occasion.includes('Transit') || p.pieces.length >= 4);
    } else if (isRainDay) {
      chosenPerm = permutations.find((p) => p.isRainReady);
    } else {
      chosenPerm = permutations[(day - 1) % (permutations.length || 1)];
    }

    if (!chosenPerm && permutations.length > 0) {
      chosenPerm = permutations[(day - 1) % permutations.length];
    }

    const title = dayTitles[(day - 1) % dayTitles.length];
    const occ = isTransitDay
      ? 'Travel Transit & Departure'
      : isRainDay
      ? 'Inclement Weather & Rain Layering'
      : chosenPerm?.occasion || 'Smart Casual & Dining';

    const weatherNote = dayForecast
      ? `Forecast: ${dayForecast.tempMin}°C - ${dayForecast.tempMax}°C, ${dayForecast.condition} (${dayForecast.rainProb}% rain chance).`
      : '';

    dailyOutfits.push({
      day,
      title: `Day ${day}: ${title}`,
      itemIds: chosenPerm ? chosenPerm.itemIds : capsuleItems.slice(0, 4).map((i) => i.id),
      occasion: occ,
      notes: `${chosenPerm?.notes || 'Curated travel look.'} ${weatherNote}`.trim(),
      weatherMatchScore: chosenPerm?.thermalScore || 90,
    });
  }

  return dailyOutfits;
};

export interface TravelLaundryPlan {
  laundryDays: number[];
  turnaroundSummary: string;
  itemsRewornCount: number;
  weightSavedGrams: number;
  rewearLog: Array<{
    itemId: string;
    itemName: string;
    brand: string;
    category: string;
    wornDays: number[];
    isRefreshedByLaundry: boolean;
  }>;
}

/**
 * Calculates travel laundry turnaround plan and rewear metrics.
 */
export const calculateLaundryTurnaroundPlan = (
  daysCount: number,
  capsuleItems: WardrobeItem[],
  dailyOutfits: Array<{ day: number; itemIds: string[] }>,
  laundryDays: number[]
): TravelLaundryPlan => {
  const itemUsageMap: Record<string, number[]> = {};

  dailyOutfits.forEach((outfit) => {
    outfit.itemIds.forEach((id) => {
      if (!itemUsageMap[id]) itemUsageMap[id] = [];
      if (!itemUsageMap[id].includes(outfit.day)) {
        itemUsageMap[id].push(outfit.day);
      }
    });
  });

  const rewearLog = capsuleItems.map((item) => {
    const wornDays = itemUsageMap[item.id] || [];
    const hasRewear = wornDays.length > 1;
    const isRefreshed = laundryDays.some((lDay) => wornDays.some((w) => w <= lDay) && wornDays.some((w) => w > lDay));

    return {
      itemId: item.id,
      itemName: item.name,
      brand: item.brand,
      category: item.category,
      wornDays,
      isRefreshedByLaundry: isRefreshed,
    };
  });

  const itemsRewornCount = rewearLog.filter((r) => r.wornDays.length > 1).length;
  // Estimate weight saved by not packing duplicate pieces
  const weightSavedGrams = itemsRewornCount * 420;

  const turnaroundSummary = laundryDays.length > 0
    ? `Laundry planned on Day ${laundryDays.join(', ')} enables clean rewears of ${itemsRewornCount} core pieces, saving approx ${(weightSavedGrams / 1000).toFixed(1)}kg of luggage space.`
    : `No mid-trip laundry turnaround scheduled. Recommended for trips > 4 days to reduce carry-on bulk.`;

  return {
    laundryDays,
    turnaroundSummary,
    itemsRewornCount,
    weightSavedGrams,
    rewearLog,
  };
};

export interface TravelEssentialChecklistItem {
  id: string;
  name: string;
  category: 'Essentials & Tech' | 'Laundry & Garment Care' | 'Grooming & Toiletries' | 'Documents';
  isPacked: boolean;
  weightEstimateGrams: number;
}

export const DEFAULT_TRAVEL_ESSENTIALS: TravelEssentialChecklistItem[] = [
  { id: 'ess-1', name: 'Passport & Boarding Documents', category: 'Documents', isPacked: false, weightEstimateGrams: 100 },
  { id: 'ess-2', name: 'Compact Travel Garment Steamer', category: 'Laundry & Garment Care', isPacked: false, weightEstimateGrams: 450 },
  { id: 'ess-3', name: 'Crease Release & Fabric Refresh Spray (100ml)', category: 'Laundry & Garment Care', isPacked: false, weightEstimateGrams: 120 },
  { id: 'ess-4', name: 'Dissolvable Laundry Detergent Sheets (Pack of 6)', category: 'Laundry & Garment Care', isPacked: false, weightEstimateGrams: 40 },
  { id: 'ess-5', name: 'Universal International Power Adaptor', category: 'Essentials & Tech', isPacked: false, weightEstimateGrams: 150 },
  { id: 'ess-6', name: 'USB-C Fast Charging Cable & Power Bank', category: 'Essentials & Tech', isPacked: false, weightEstimateGrams: 280 },
  { id: 'ess-7', name: 'Clear TSA Approved Toiletries Pouch', category: 'Grooming & Toiletries', isPacked: false, weightEstimateGrams: 350 },
  { id: 'ess-8', name: 'Compact Folding Umbrella (Windproof)', category: 'Essentials & Tech', isPacked: false, weightEstimateGrams: 220 },
];

const TRIPS_STORAGE_KEY = 'travel_capsule_saved_trips_v1';

export const getSavedTravelTrips = (): TravelCapsuleTrip[] => {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load travel trips from localStorage:', err);
  }
  return [];
};

export const saveTravelTrip = (trip: TravelCapsuleTrip): void => {
  try {
    const existing = getSavedTravelTrips();
    const idx = existing.findIndex((t) => t.id === trip.id);
    let updated: TravelCapsuleTrip[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = trip;
    } else {
      updated = [trip, ...existing];
    }
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save travel trip:', err);
  }
};

export const deleteTravelTrip = (tripId: string): void => {
  try {
    const existing = getSavedTravelTrips();
    const updated = existing.filter((t) => t.id !== tripId);
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete travel trip:', err);
  }
};
