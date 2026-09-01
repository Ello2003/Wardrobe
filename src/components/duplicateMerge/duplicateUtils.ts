import {
  MatchPreset,
  MatchParametersConfig,
  StatusCategory,
} from './duplicateMergeTypes';

export const normalizeString = (str: string = ''): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ');
};

export const BRAND_ALIASES: Record<string, string> = {
  finnamore: 'finamore',
  'finamore napoli': 'finamore',
  'finamore 1925': 'finamore',
  'finamore 1925 napoli': 'finamore',
  'finamore napoli 1925': 'finamore',
  cucinelli: 'brunello cucinelli',
  'brunello cucinelli': 'brunello cucinelli',
  'loro piana': 'loro piana',
  loropiana: 'loro piana',
  'crockett and jones': 'crockett & jones',
  'crockett & jones': 'crockett & jones',
  'crockett&jones': 'crockett & jones',
  'crockett jones': 'crockett & jones',
  'polo ralph lauren': 'ralph lauren',
  'ralph lauren': 'ralph lauren',
  'ralph lauren purple label': 'ralph lauren',
  rlpl: 'ralph lauren',
  polo: 'ralph lauren',
  'ermenegildo zegna': 'zegna',
  zegna: 'zegna',
  'zegna couture': 'zegna',
  'turnbull & asser': 'turnbull & asser',
  'turnbull and asser': 'turnbull & asser',
  'turnbull asser': 'turnbull & asser',
  drakes: "drake's",
  "drake's": "drake's",
  charvet: 'charvet',
  'charvet paris': 'charvet',
  barba: 'barba',
  'barba napoli': 'barba',
  borrelli: 'borrelli',
  'luigi borrelli': 'borrelli',
  'luigi borrelli napoli': 'borrelli',
  attolini: 'attolini',
  'cesare attolini': 'attolini',
  'cesare attolini napoli': 'attolini',
  barbour: 'barbour',
  'j barbour & sons': 'barbour',
  'j barbour and sons': 'barbour',
  'john smedley': 'john smedley',
  smedley: 'john smedley',
  caruso: 'caruso',
  'raffaele caruso': 'caruso',
  boglioli: 'boglioli',
  'boglioli milano': 'boglioli',
  incotex: 'incotex',
  'slowear incotex': 'incotex',
  rota: 'rota',
  'rota pantalloni': 'rota',
  'ring jacket': 'ring jacket',
  'ring jacket meister': 'ring jacket',
  alden: 'alden',
  'alden shoe company': 'alden',
  'edward green': 'edward green',
  'john lobb': 'john lobb',
  'john lobb paris': 'john lobb',
  churchs: "church's",
  "church's": "church's",
  canali: 'canali',
  'canali 1934': 'canali',
  corneliani: 'corneliani',
  kiton: 'kiton',
  'kiton napoli': 'kiton',
  brioni: 'brioni',
  'brioni roma': 'brioni',
  isaia: 'isaia',
  'isaia napoli': 'isaia',
};

export const normalizeBrand = (brand: string = ''): string => {
  const clean = normalizeString(brand);
  if (!clean) return 'unbranded';

  if (BRAND_ALIASES[clean]) {
    return BRAND_ALIASES[clean];
  }

  // Handle common typo variations (e.g. finnamore / finnam / finamore)
  if (clean.includes('finnam') || clean.includes('finam')) {
    return 'finamore';
  }

  // Remove city/year/corporate suffix markers
  const stripped = clean
    .replace(/\b(napoli|milano|paris|london|roma|italy|italia|1925|1934|1880|ltd|inc|co|brand|label)\b/gi, '')
    .trim();

  if (stripped && BRAND_ALIASES[stripped]) {
    return BRAND_ALIASES[stripped];
  }

  return stripped || clean;
};

export const extractGarmentType = (title: string = '', category: string = ''): string => {
  const norm = normalizeString(`${title} ${category}`);
  if (norm.includes('shirt') || norm.includes('chemise') || norm.includes('camicia') || norm.includes('button')) return 'shirt';
  if (norm.includes('jacket') || norm.includes('blazer') || norm.includes('coat') || norm.includes('overcoat') || norm.includes('waxed')) return 'jacket';
  if (norm.includes('trouser') || norm.includes('pant') || norm.includes('chino') || norm.includes('jean') || norm.includes('denim')) return 'trouser';
  if (norm.includes('knit') || norm.includes('sweater') || norm.includes('jumper') || norm.includes('cardigan') || norm.includes('cashmere') || norm.includes('rollneck')) return 'knitwear';
  if (norm.includes('shoe') || norm.includes('boot') || norm.includes('loafer') || norm.includes('derby') || norm.includes('oxford') || norm.includes('sneaker')) return 'footwear';
  if (norm.includes('tie') || norm.includes('scarf') || norm.includes('belt') || norm.includes('pocket square') || norm.includes('bag')) return 'accessory';
  return normalizeString(category || 'garment');
};

export const cleanItemTitle = (str: string = '', brand: string = ''): string => {
  let cleaned = normalizeString(str);
  
  // Strip brand name if present in title
  if (brand) {
    const normB = normalizeString(brand);
    if (normB) {
      cleaned = cleaned.replace(new RegExp(`\\b${normB}\\b`, 'gi'), '');
    }
  }

  return cleaned
    .replace(/\b(size|sz|uk|eu|us|m|l|s|xl|xxl|xs|small|medium|large|15|155|16|165|17|38|39|40|41|42|43|44)\b/gi, '')
    .replace(
      /\b(black|white|blue|navy|grey|gray|green|red|brown|beige|cream|tan|olive|sage|camel|oatmeal|khaki|burgundy|charcoal|stripe|striped|check|checked|plaid|gingham|poplin|linen|cotton|silk|wool|cashmere|twill|oxford)\b/gi,
      ''
    )
    .replace(/\b(new|vintage|worn|bnwt|authentic|classic|pure|napoli|1925|milano)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getColorSwatchHex = (colorName: string = ''): string => {
  const c = colorName.toLowerCase().trim();
  if (!c || c === 'unspecified') return '#E5E5E1';
  if (c.includes('black') || c.includes('nero') || c.includes('noir') || c.includes('onyx') || c.includes('jet black')) return '#1A1A1A';
  if (c.includes('navy') || c.includes('midnight') || c.includes('marine') || c.includes('indigo') || c.includes('ink')) return '#1B2A4A';
  if (c.includes('sky blue') || c.includes('baby blue') || c.includes('light blue')) return '#87CEEB';
  if (c.includes('royal blue') || c.includes('cobalt')) return '#0047AB';
  if (c.includes('blue') || c.includes('azure') || c.includes('denim') || c.includes('petrol')) return '#336699';
  if (c.includes('sage') || c.includes('moss') || c.includes('mint')) return '#7D9D8B';
  if (c.includes('olive') || c.includes('khaki green') || c.includes('army')) return '#556B2F';
  if (c.includes('forest') || c.includes('emerald') || c.includes('pine') || c.includes('green')) return '#2E6F40';
  if (c.includes('charcoal') || c.includes('anthracite')) return '#36454F';
  if (c.includes('grey') || c.includes('gray') || c.includes('slate') || c.includes('ash') || c.includes('silver') || c.includes('marl') || c.includes('melange')) return '#808080';
  if (c.includes('cream') || c.includes('ivory') || c.includes('ecru') || c.includes('eggshell') || c.includes('oatmeal') || c.includes('vanilla') || c.includes('bone')) return '#F5F2EB';
  if (c.includes('white') || c.includes('snow') || c.includes('optic')) return '#FFFFFF';
  if (c.includes('camel') || c.includes('tan') || c.includes('sand') || c.includes('biscuit') || c.includes('caramel') || c.includes('taupe') || c.includes('khaki') || c.includes('beige')) return '#C19A6B';
  if (c.includes('chocolate') || c.includes('espresso') || c.includes('cognac') || c.includes('chestnut') || c.includes('brown') || c.includes('mocha') || c.includes('rust')) return '#5C4033';
  if (c.includes('burgundy') || c.includes('wine') || c.includes('maroon') || c.includes('bordeaux') || c.includes('oxblood')) return '#800020';
  if (c.includes('red') || c.includes('crimson') || c.includes('scarlet') || c.includes('ruby')) return '#B22222';
  if (c.includes('pink') || c.includes('blush') || c.includes('rose') || c.includes('fuchsia') || c.includes('magenta') || c.includes('salmon') || c.includes('coral')) return '#FFB6C1';
  if (c.includes('mustard') || c.includes('ochre') || c.includes('gold') || c.includes('amber')) return '#DAA520';
  if (c.includes('yellow') || c.includes('lemon')) return '#F0E68C';
  if (c.includes('terracotta') || c.includes('burnt orange') || c.includes('orange') || c.includes('peach') || c.includes('apricot')) return '#D97706';
  if (c.includes('purple') || c.includes('lilac') || c.includes('lavender') || c.includes('violet') || c.includes('plum') || c.includes('mauve')) return '#7B68EE';
  if (c.includes('multi') || c.includes('print') || c.includes('stripe') || c.includes('check') || c.includes('floral') || c.includes('tartan') || c.includes('plaid')) return '#8C7355';
  return '#9A9A95';
};

export const getColorFamily = (colorName: string = ''): string => {
  const c = colorName.toLowerCase().trim();
  if (!c || c === 'unspecified') return 'unspecified';
  if (c.includes('black') || c.includes('nero') || c.includes('noir') || c.includes('onyx') || c.includes('jet black')) return 'black';
  if (c.includes('navy') || c.includes('midnight') || c.includes('marine') || c.includes('indigo') || c.includes('ink')) return 'navy';
  if (c.includes('sky blue') || c.includes('baby blue') || c.includes('light blue') || c.includes('royal blue') || c.includes('cobalt') || c.includes('blue') || c.includes('azure') || c.includes('denim') || c.includes('petrol')) return 'blue';
  if (c.includes('sage') || c.includes('olive') || c.includes('green') || c.includes('moss') || c.includes('khaki green') || c.includes('emerald') || c.includes('pine') || c.includes('mint')) return 'green';
  if (c.includes('charcoal') || c.includes('grey') || c.includes('gray') || c.includes('slate') || c.includes('ash') || c.includes('silver') || c.includes('marl') || c.includes('melange')) return 'grey';
  if (c.includes('cream') || c.includes('ivory') || c.includes('ecru') || c.includes('eggshell') || c.includes('oatmeal') || c.includes('vanilla') || c.includes('bone')) return 'cream';
  if (c.includes('white') || c.includes('snow') || c.includes('optic')) return 'white';
  if (c.includes('camel') || c.includes('tan') || c.includes('sand') || c.includes('biscuit') || c.includes('caramel') || c.includes('taupe') || c.includes('beige') || c.includes('khaki')) return 'tan/beige';
  if (c.includes('chocolate') || c.includes('espresso') || c.includes('cognac') || c.includes('chestnut') || c.includes('brown') || c.includes('mocha') || c.includes('rust')) return 'brown';
  if (c.includes('burgundy') || c.includes('wine') || c.includes('maroon') || c.includes('bordeaux') || c.includes('oxblood')) return 'burgundy';
  if (c.includes('red') || c.includes('crimson') || c.includes('scarlet') || c.includes('ruby')) return 'red';
  if (c.includes('pink') || c.includes('blush') || c.includes('rose') || c.includes('fuchsia') || c.includes('magenta') || c.includes('salmon') || c.includes('coral')) return 'pink';
  if (c.includes('mustard') || c.includes('ochre') || c.includes('gold') || c.includes('amber') || c.includes('yellow') || c.includes('lemon')) return 'yellow/gold';
  if (c.includes('terracotta') || c.includes('burnt orange') || c.includes('orange') || c.includes('peach')) return 'orange';
  if (c.includes('purple') || c.includes('lilac') || c.includes('lavender') || c.includes('violet') || c.includes('plum') || c.includes('mauve')) return 'purple';
  if (c.includes('multi') || c.includes('print') || c.includes('stripe') || c.includes('check') || c.includes('floral') || c.includes('tartan') || c.includes('plaid')) return 'pattern/multi';
  return c;
};

export const normalizeSize = (sizeStr: string = ''): string => {
  return sizeStr
    .toLowerCase()
    .trim()
    .replace(/^(size|sz)\s*/i, '')
    .replace(/\s+/g, '');
};

export const normalizeMaterial = (mat: string = ''): string => {
  return normalizeString(mat)
    .replace(/\b(100%|pure|genuine|fine|gradea|premium)\b/gi, '')
    .trim();
};

export const getStatusCategory = (rawStatus: string = '', isArchived: boolean = false): StatusCategory => {
  if (isArchived) return 'archived';
  const s = rawStatus.toLowerCase();
  if (s.includes('cancel') || s.includes('passed') || s.includes('declined') || s.includes('rejected')) {
    return 'cancelled_passed';
  }
  if (s.includes('purchased') || s.includes('sold') || s.includes('shipped') || s.includes('completed')) {
    return 'completed_sold';
  }
  if (s.includes('archived')) {
    return 'archived';
  }
  return 'active';
};

export const getDefaultPresetConfig = (preset: MatchPreset): MatchParametersConfig => {
  switch (preset) {
    case 'strict':
      return {
        matchBrand: true,
        matchTitle: true,
        matchColour: 'strict',
        matchCategory: true,
        matchSubcategory: true,
        matchSize: true,
        matchMaterial: true,
        matchCondition: true,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'exact',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'active_only':
      return {
        matchBrand: true,
        matchTitle: true,
        matchColour: 'family',
        matchCategory: false,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: true,
        excludeArchived: true,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'tags_style':
      return {
        matchBrand: false,
        matchTitle: false,
        matchColour: 'family',
        matchCategory: true,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'any_overlap',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'brand_consolidator':
      return {
        matchBrand: true,
        matchTitle: false,
        matchColour: 'ignore',
        matchCategory: false,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'style_model':
      return {
        matchBrand: true,
        matchTitle: true,
        matchColour: 'ignore',
        matchCategory: false,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'location_storage':
      return {
        matchBrand: false,
        matchTitle: false,
        matchColour: 'ignore',
        matchCategory: true,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: true,
        matchPriceProximity: false,
      };
    case 'cross_collection':
      return {
        matchBrand: true,
        matchTitle: true,
        matchColour: 'family',
        matchCategory: false,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'fuzzy':
      return {
        matchBrand: true,
        matchTitle: true,
        matchColour: 'ignore',
        matchCategory: false,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
    case 'standard':
    default:
      return {
        matchBrand: true,
        matchTitle: true,
        matchColour: 'family',
        matchCategory: false,
        matchSubcategory: false,
        matchSize: false,
        matchMaterial: false,
        matchCondition: false,
        matchSeason: false,
        matchTags: 'ignore',
        matchStatus: 'ignore',
        excludeCancelled: false,
        excludeArchived: false,
        matchSeller: false,
        matchLocation: false,
        matchPriceProximity: false,
      };
  }
};
