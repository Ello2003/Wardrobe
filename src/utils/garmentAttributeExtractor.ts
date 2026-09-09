/**
 * Garment Attribute Extraction Utilities
 * Intelligently extracts Brand, Colour, Fabric/Material, Seller, and Size
 * from garment titles, descriptions, and raw marketplace order/listing payloads.
 * Prevents Vinted platform from incorrectly overwriting item brand or retailer.
 */

// Comprehensive known fashion, contemporary, luxury, vintage, and high-street brands
const KNOWN_BRANDS: Array<{ pattern: RegExp; canonical: string }> = [
  // Contemporary & Menswear Classics
  { pattern: /\bmargaret\s*howell\b/i, canonical: 'Margaret Howell' },
  { pattern: /\bmhl(?:\s*by\s*margaret\s*howell)?\b/i, canonical: 'MHL by Margaret Howell' },
  { pattern: /\bbarbour(?:\s*heritage)?\b/i, canonical: 'Barbour' },
  { pattern: /\buniversal\s*works\b/i, canonical: 'Universal Works' },
  { pattern: /\bstudio\s*nicholson\b/i, canonical: 'Studio Nicholson' },
  { pattern: /\bour\s*legacy\b/i, canonical: 'Our Legacy' },
  { pattern: /\blemaire\b/i, canonical: 'Lemaire' },
  { pattern: /\ba\.?p\.?c\.?\b/i, canonical: 'A.P.C.' },
  { pattern: /\bacne\s*studios\b/i, canonical: 'Acne Studios' },
  { pattern: /\bnorse\s*projects\b/i, canonical: 'Norse Projects' },
  { pattern: /\bsunspel\b/i, canonical: 'Sunspel' },
  { pattern: /\balbam\b/i, canonical: 'Albam' },
  { pattern: /\bportuguese\s*flannel\b/i, canonical: 'Portuguese Flannel' },
  { pattern: /\boliver\s*spencer\b/i, canonical: 'Oliver Spencer' },
  { pattern: /\bfolk\b/i, canonical: 'Folk' },
  { pattern: /\bymc\b|\byou\s*must\s*create\b/i, canonical: 'YMC' },
  { pattern: /\btoast\b/i, canonical: 'Toast' },
  { pattern: /\bnigel\s*cabourn\b/i, canonical: 'Nigel Cabourn' },
  { pattern: /\bengineered\s*garments\b/i, canonical: 'Engineered Garments' },
  { pattern: /\bneedles\b/i, canonical: 'Needles' },
  { pattern: /\bkaptain\s*sunshine\b/i, canonical: 'Kaptain Sunshine' },
  { pattern: /\bauralee\b/i, canonical: 'Auralee' },
  { pattern: /\bbeams(?:\s*plus)?\b/i, canonical: 'Beams Plus' },
  { pattern: /\bvisvim\b/i, canonical: 'Visvim' },
  { pattern: /\bwtaps\b/i, canonical: 'WTAPS' },
  { pattern: /\bnn07\b/i, canonical: 'NN07' },
  { pattern: /\bsamsøe\s*samsøe\b|\bsamsoe\s*samsoe\b/i, canonical: 'Samsøe Samsøe' },

  // Luxury & Designer
  { pattern: /\bcomme\s*des\s*gar[cç]ons\b|\bcdg\b/i, canonical: 'Comme des Garçons' },
  { pattern: /\bjunya\s*watanabe\b/i, canonical: 'Junya Watanabe' },
  { pattern: /\bdries\s*van\s*noten\b/i, canonical: 'Dries Van Noten' },
  { pattern: /\bmaison\s*margiela\b|\bmargiela\b/i, canonical: 'Maison Margiela' },
  { pattern: /\bjil\s*sander\b/i, canonical: 'Jil Sander' },
  { pattern: /\bthe\s*row\b/i, canonical: 'The Row' },
  { pattern: /\bbottega\s*veneta\b/i, canonical: 'Bottega Veneta' },
  { pattern: /\bprada\b/i, canonical: 'Prada' },
  { pattern: /\bgucci\b/i, canonical: 'Gucci' },
  { pattern: /\bsaint\s*laurent\b|\byves\s*saint\s*laurent\b|\bysl\b/i, canonical: 'Saint Laurent' },
  { pattern: /\bceline\b/i, canonical: 'Celine' },
  { pattern: /\bloewe\b/i, canonical: 'Loewe' },
  { pattern: /\bjacquemus\b/i, canonical: 'Jacquemus' },
  { pattern: /\bami\s*paris\b|\bami\s*alexandre\s*mattiussi\b/i, canonical: 'Ami Paris' },
  { pattern: /\bissey\s*miyake\b/i, canonical: 'Issey Miyake' },
  { pattern: /\byohji\s*yamamoto\b/i, canonical: 'Yohji Yamamoto' },
  { pattern: /\bstone\s*island\b/i, canonical: 'Stone Island' },
  { pattern: /\bc\.?p\.?\s*company\b/i, canonical: 'C.P. Company' },
  { pattern: /\bmoncler\b/i, canonical: 'Moncler' },
  { pattern: /\bburberry\b/i, canonical: 'Burberry' },

  // Heritage & Outerwear
  { pattern: /\bbelstaff\b/i, canonical: 'Belstaff' },
  { pattern: /\bbaracuta\b/i, canonical: 'Baracuta' },
  { pattern: /\bgloverall\b/i, canonical: 'Gloverall' },
  { pattern: /\bmackintosh\b/i, canonical: 'Mackintosh' },
  { pattern: /\bcanada\s*goose\b/i, canonical: 'Canada Goose' },
  { pattern: /\bpatagonia\b/i, canonical: 'Patagonia' },
  { pattern: /\barc'?teryx\b/i, canonical: "Arc'teryx" },
  { pattern: /\bthe\s*north\s*face\b|\btnf\b/i, canonical: 'The North Face' },
  { pattern: /\bsnow\s*peak\b/i, canonical: 'Snow Peak' },
  { pattern: /\bcarhartt(?:\s*wip)?\b/i, canonical: 'Carhartt WIP' },
  { pattern: /\bdickies\b/i, canonical: 'Dickies' },
  { pattern: /\bstan\s*ray\b/i, canonical: 'Stan Ray' },

  // Denim & Workwear
  { pattern: /\blevi'?s\b|\blevi\s*strauss\b/i, canonical: "Levi's" },
  { pattern: /\blee\b/i, canonical: 'Lee' },
  { pattern: /\bwrangler\b/i, canonical: 'Wrangler' },
  { pattern: /\bedwin\b/i, canonical: 'Edwin' },
  { pattern: /\bnudie(?:\s*jeans)?\b/i, canonical: 'Nudie Jeans' },
  { pattern: /\biron\s*heart\b/i, canonical: 'Iron Heart' },
  { pattern: /\bmomotaro\b/i, canonical: 'Momotaro' },
  { pattern: /\borSlow\b/i, canonical: 'orSlow' },

  // Tailoring & American Tradition
  { pattern: /\bpolo\s*ralph\s*lauren\b|\bralph\s*lauren\b|\brrl\b/i, canonical: 'Ralph Lauren' },
  { pattern: /\bbrooks\s*brothers\b/i, canonical: 'Brooks Brothers' },
  { pattern: /\bgant\b/i, canonical: 'GANT' },
  { pattern: /\btommy\s*hilfiger\b/i, canonical: 'Tommy Hilfiger' },
  { pattern: /\bfred\s*perry\b/i, canonical: 'Fred Perry' },
  { pattern: /\blacoste\b/i, canonical: 'Lacoste' },
  { pattern: /\bben\s*sherman\b/i, canonical: 'Ben Sherman' },
  { pattern: /\bpaul\s*smith\b/i, canonical: 'Paul Smith' },
  { pattern: /\bdrake'?s\b/i, canonical: "Drake's" },
  { pattern: /\bturnbull\s*&?\s*asser\b/i, canonical: 'Turnbull & Asser' },
  { pattern: /\bhilditch\s*&?\s*key\b/i, canonical: 'Hilditch & Key' },
  { pattern: /\bcharles\s*tyrwhitt\b/i, canonical: 'Charles Tyrwhitt' },
  { pattern: /\bt\.?m\.?\s*lewin\b/i, canonical: 'T.M. Lewin' },
  { pattern: /\bhackett\b/i, canonical: 'Hackett' },

  // Footwear
  { pattern: /\bclarks(?:\s*originals)?\b/i, canonical: 'Clarks Originals' },
  { pattern: /\bparaboot\b/i, canonical: 'Paraboot' },
  { pattern: /\bdr\.?\s*martens\b|\bdoc\s*martens\b/i, canonical: 'Dr. Martens' },
  { pattern: /\bbirkenstock\b/i, canonical: 'Birkenstock' },
  { pattern: /\bgrenson\b/i, canonical: 'Grenson' },
  { pattern: /\btricker'?s\b/i, canonical: "Tricker's" },
  { pattern: /\bchurch'?s\b/i, canonical: "Church's" },
  { pattern: /\bred\s*wing(?:\s*shoes)?\b/i, canonical: 'Red Wing' },
  { pattern: /\bsalomon\b/i, canonical: 'Salomon' },
  { pattern: /\bnew\s*balance\b/i, canonical: 'New Balance' },
  { pattern: /\basics\b/i, canonical: 'Asics' },
  { pattern: /\bnike\b/i, canonical: 'Nike' },
  { pattern: /\badidas(?:\s*originals)?\b/i, canonical: 'Adidas' },
  { pattern: /\bconverse\b/i, canonical: 'Converse' },
  { pattern: /\bvans\b/i, canonical: 'Vans' },

  // Modern High Street & Scandi
  { pattern: /\bcos\b/i, canonical: 'COS' },
  { pattern: /\barket\b/i, canonical: 'Arket' },
  { pattern: /\b&\s*other\s*stories\b/i, canonical: '& Other Stories' },
  { pattern: /\bmassimo\s*dutti\b/i, canonical: 'Massimo Dutti' },
  { pattern: /\bzara(?:\s*man|\s*woman|\s*studio)?\b/i, canonical: 'Zara' },
  { pattern: /\buniqlo(?:\s*u)?\b/i, canonical: 'Uniqlo' },
  { pattern: /\bmango\b/i, canonical: 'Mango' },
  { pattern: /\breiss\b/i, canonical: 'Reiss' },
  { pattern: /\bwhistles\b/i, canonical: 'Whistles' },
  { pattern: /\ballsaints\b/i, canonical: 'AllSaints' },
  { pattern: /\bsandro\b/i, canonical: 'Sandro' },
  { pattern: /\bmaje\b/i, canonical: 'Maje' },
  { pattern: /\bs[eé]zane\b/i, canonical: 'Sézane' },
  { pattern: /\bm&s\b|\bmarks\s*&?\s*spencer\b/i, canonical: 'Marks & Spencer' },
  { pattern: /\bmuji\b/i, canonical: 'Muji' },
  { pattern: /\bh&m(?:\s*premium)?\b/i, canonical: 'H&M' },
  { pattern: /\bganni\b/i, canonical: 'Ganni' },
  { pattern: /\bme\s*\+\s*em\b/i, canonical: 'ME+EM' },
  { pattern: /\bboden\b/i, canonical: 'Boden' },
  { pattern: /\btoby\s*tiger\b/i, canonical: 'Toby Tiger' },
  { pattern: /\btoast\b/i, canonical: 'Toast' },
  { pattern: /\bjigsaw\b/i, canonical: 'Jigsaw' },
  { pattern: /\bhobbs\b/i, canonical: 'Hobbs' },
  { pattern: /\bted\s*baker\b/i, canonical: 'Ted Baker' },
  { pattern: /\bkaren\s*millen\b/i, canonical: 'Karen Millen' },
  { pattern: /\bclaudie\s*pierlot\b/i, canonical: 'Claudie Pierlot' },
  { pattern: /\bfree\s*people\b/i, canonical: 'Free People' },
  { pattern: /\banthropologie\b/i, canonical: 'Anthropologie' },
  { pattern: /\burban\s*outfitters\b/i, canonical: 'Urban Outfitters' },
  { pattern: /\basos(?:\s*design|\s*edition)?\b/i, canonical: 'ASOS' },
  { pattern: /\btopshop\b/i, canonical: 'Topshop' },
  { pattern: /\bweekday\b/i, canonical: 'Weekday' },
  { pattern: /\bmonki\b/i, canonical: 'Monki' },
  { pattern: /\bbershka\b/i, canonical: 'Bershka' },
  { pattern: /\bpull\s*&?\s*bear\b/i, canonical: 'Pull&Bear' },
  { pattern: /\bstradivarius\b/i, canonical: 'Stradivarius' },
  { pattern: /\bcalvin\s*klein\b/i, canonical: 'Calvin Klein' },
  { pattern: /\bdiesel\b/i, canonical: 'Diesel' },
  { pattern: /\bst[uü]ssy\b/i, canonical: 'Stüssy' },
  { pattern: /\bsupreme\b/i, canonical: 'Supreme' },
  { pattern: /\bpalace\b/i, canonical: 'Palace' },
];

// Rich color palette definitions
const KNOWN_COLORS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(?:black|noir|nero|schwarz)\b/i, canonical: 'Black' },
  { pattern: /\b(?:charcoal|anthracite|dark\s*grey|dark\s*gray)\b/i, canonical: 'Charcoal' },
  { pattern: /\b(?:grey|gray|gris|grau)\b/i, canonical: 'Grey' },
  { pattern: /\b(?:white|blanc|blanco|weiss)\b/i, canonical: 'White' },
  { pattern: /\b(?:off-?white|broken\s*white)\b/i, canonical: 'Off-White' },
  { pattern: /\b(?:cream|cr[eè]me|ivory)\b/i, canonical: 'Cream' },
  { pattern: /\b(?:ecru|[eé]cru)\b/i, canonical: 'Ecru' },
  { pattern: /\b(?:navy|dark\s*blue|bleu\s*marine|marine)\b/i, canonical: 'Navy' },
  { pattern: /\b(?:royal\s*blue|cobalt)\b/i, canonical: 'Royal Blue' },
  { pattern: /\b(?:indigo)\b/i, canonical: 'Indigo' },
  { pattern: /\b(?:sky\s*blue|light\s*blue|baby\s*blue)\b/i, canonical: 'Sky Blue' },
  { pattern: /\b(?:blue|bleu|azul|blau)\b/i, canonical: 'Blue' },
  { pattern: /\b(?:olive|olive\s*green)\b/i, canonical: 'Olive' },
  { pattern: /\b(?:sage|sage\s*green)\b/i, canonical: 'Sage' },
  { pattern: /\b(?:khaki)\b/i, canonical: 'Khaki' },
  { pattern: /\b(?:forest\s*green|bottle\s*green|dark\s*green|pine)\b/i, canonical: 'Forest Green' },
  { pattern: /\b(?:green|vert|verde|grün)\b/i, canonical: 'Green' },
  { pattern: /\b(?:chocolate|espresso|dark\s*brown)\b/i, canonical: 'Chocolate' },
  { pattern: /\b(?:brown|marron|braun)\b/i, canonical: 'Brown' },
  { pattern: /\b(?:camel)\b/i, canonical: 'Camel' },
  { pattern: /\b(?:tan|cognac)\b/i, canonical: 'Tan' },
  { pattern: /\b(?:beige|sand|taupe)\b/i, canonical: 'Beige' },
  { pattern: /\b(?:burgundy|maroon|wine|bordeaux|oxblood)\b/i, canonical: 'Burgundy' },
  { pattern: /\b(?:red|rouge|rojo|rot)\b/i, canonical: 'Red' },
  { pattern: /\b(?:pink|rose|rosa|blush)\b/i, canonical: 'Pink' },
  { pattern: /\b(?:orange|tangerine)\b/i, canonical: 'Orange' },
  { pattern: /\b(?:rust|terracotta|burnt\s*orange)\b/i, canonical: 'Rust' },
  { pattern: /\b(?:mustard|ochre)\b/i, canonical: 'Mustard' },
  { pattern: /\b(?:yellow|jaune|gelb)\b/i, canonical: 'Yellow' },
  { pattern: /\b(?:purple|violet|plum|aubergine)\b/i, canonical: 'Purple' },
  { pattern: /\b(?:lilac|lavender)\b/i, canonical: 'Lilac' },
  { pattern: /\b(?:multi-?colo(?:u)?r|patterned|floral|striped|check|plaid|tartan)\b/i, canonical: 'Multi / Patterned' },
];

// Rich material & fabric definitions
const KNOWN_MATERIALS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(?:cashmere|cachemire)\b/i, canonical: '100% Cashmere' },
  { pattern: /\b(?:merino\s*wool|merino)\b/i, canonical: 'Merino Wool' },
  { pattern: /\b(?:lambswool)\b/i, canonical: 'Lambswool' },
  { pattern: /\b(?:wool\s*blend)\b/i, canonical: 'Wool Blend' },
  { pattern: /\b(?:wool|pure\s*wool|laine|wolle)\b/i, canonical: 'Wool' },
  { pattern: /\b(?:mohair)\b/i, canonical: 'Mohair' },
  { pattern: /\b(?:alpaca)\b/i, canonical: 'Alpaca' },
  { pattern: /\b(?:silk|soie|seide)\b/i, canonical: 'Silk' },
  { pattern: /\b(?:linen|pure\s*linen|lin|leinen)\b/i, canonical: 'Linen' },
  { pattern: /\b(?:linen\s*blend)\b/i, canonical: 'Linen Blend' },
  { pattern: /\b(?:heavyweight\s*cotton|organic\s*cotton)\b/i, canonical: 'Heavyweight Cotton' },
  { pattern: /\b(?:cotton\s*drill|drill|twill)\b/i, canonical: 'Cotton Twill' },
  { pattern: /\b(?:cotton|coton|baumwolle)\b/i, canonical: 'Cotton' },
  { pattern: /\b(?:selvedge\s*denim|selvage\s*denim)\b/i, canonical: 'Selvedge Denim' },
  { pattern: /\b(?:denim|jean)\b/i, canonical: 'Denim' },
  { pattern: /\b(?:corduroy|cord)\b/i, canonical: 'Corduroy' },
  { pattern: /\b(?:flannel)\b/i, canonical: 'Flannel' },
  { pattern: /\b(?:suede)\b/i, canonical: 'Suede' },
  { pattern: /\b(?:shearling)\b/i, canonical: 'Shearling' },
  { pattern: /\b(?:leather|cuir|leder)\b/i, canonical: 'Leather' },
  { pattern: /\b(?:ventile)\b/i, canonical: 'Ventile' },
  { pattern: /\b(?:waxed\s*cotton|wax\s*jacket)\b/i, canonical: 'Waxed Cotton' },
  { pattern: /\b(?:canvas)\b/i, canonical: 'Canvas' },
  { pattern: /\b(?:ripstop)\b/i, canonical: 'Ripstop' },
  { pattern: /\b(?:velvet|velours)\b/i, canonical: 'Velvet' },
  { pattern: /\b(?:satin)\b/i, canonical: 'Satin' },
  { pattern: /\b(?:poplin)\b/i, canonical: 'Poplin' },
  { pattern: /\b(?:tweed|harris\s*tweed)\b/i, canonical: 'Tweed' },
  { pattern: /\b(?:viscose|rayon)\b/i, canonical: 'Viscose' },
  { pattern: /\b(?:lyocell|tencel)\b/i, canonical: 'Tencel / Lyocell' },
  { pattern: /\b(?:fleece)\b/i, canonical: 'Fleece' },
  { pattern: /\b(?:nylon|polyamide)\b/i, canonical: 'Nylon' },
  { pattern: /\b(?:gore-?tex)\b/i, canonical: 'Gore-Tex' },
];

/**
 * Clean string helper
 */
function cleanText(str?: any): string {
  if (!str) return '';
  return String(str).trim();
}

/**
 * Extract true brand from title, description, and existing brand fields.
 * CRITICAL: Overrides false 'Vinted' brands with the real garment designer/brand.
 */
export function extractBrandFromTitleAndDesc(
  title?: string,
  desc?: string,
  existingBrand?: string
): string {
  const cleanExisting = cleanText(existingBrand);

  // If existing brand is a real brand (and NOT 'Vinted', 'None', 'Various', 'Unbranded', etc.)
  if (
    cleanExisting &&
    !/^vinted(?:\s*(?:item|listing|account|order|closet))?$/i.test(cleanExisting) &&
    !/^various$/i.test(cleanExisting) &&
    !/^unknown$/i.test(cleanExisting) &&
    !/^none$/i.test(cleanExisting) &&
    !/^online store$/i.test(cleanExisting) &&
    !/^designer brand$/i.test(cleanExisting) &&
    !/^other$/i.test(cleanExisting)
  ) {
    return cleanExisting;
  }

  const combined = `${cleanText(title)} ${cleanText(desc)}`;

  // 1. Check if description has explicit brand tag/metadata (e.g. "Brand: Barbour", "Marque: Sézane", "Marke: COS")
  const explicitBrandMatch = combined.match(/(?:brand|marque|marke|marca|retailer)\s*[:\-–]\s*([a-zA-Z0-9&'+.\s-]+?)(?:\s*(?:[,\n\r\t•|;]|size|taille|grösse|color|couleur|material|composition|\.|$))/i);
  if (explicitBrandMatch && explicitBrandMatch[1]) {
    const candidate = explicitBrandMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 35 && !/^vinted/i.test(candidate) && !/^various/i.test(candidate)) {
      return candidate;
    }
  }

  // 2. Check known brand dictionary
  for (const { pattern, canonical } of KNOWN_BRANDS) {
    if (pattern.test(combined)) {
      return canonical;
    }
  }

  // 3. Heuristic extraction from title if title has a brand prefix
  // Often titles are: "BrandName Model/Type Garment Sizing"
  // e.g. "Margaret Howell Olive MHL Drill Jacket S"
  // or "Barbour Beaufort Waxed Jacket C40"
  const cleanTitle = cleanText(title);
  if (cleanTitle) {
    // Remove "vintage", "retro", "rare", "bnwt", "nwt" prefixes
    const withoutNoise = cleanTitle
      .replace(/^(?:vintage|retro|rare|bnwt|nwt|authentic|original)\s+/i, '')
      .trim();

    // Check if starts with 1 or 2 capitalized words before garment keywords
    const garmentKeywords = /\b(jacket|coat|overshirt|shirt|t-shirt|tee|knit|jumper|sweater|cardigan|trousers|pants|jeans|shorts|skirt|dress|hoodie|sweatshirt|boots|shoes|sneakers|trainers|bag|blazer|suit|scarf|hat|beanie)\b/i;
    const matchGarment = withoutNoise.search(garmentKeywords);
    if (matchGarment > 2) {
      const prefix = withoutNoise.slice(0, matchGarment).trim();
      // Remove trailing prepositions/punctuation
      const cleanedPrefix = prefix.replace(/[-–—/,\s]+$/, '').trim();
      const words = cleanedPrefix.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && !/^vinted/i.test(cleanedPrefix)) {
        return cleanedPrefix;
      }
    }
  }

  return 'Unbranded';
}

/**
 * Extract colour from title, description, or payload
 */
export function extractColorFromTitleAndDesc(
  title?: string,
  desc?: string,
  existingColor?: string
): string {
  const cleanExisting = cleanText(existingColor);
  if (
    cleanExisting &&
    !/^various$/i.test(cleanExisting) &&
    !/^neutral$/i.test(cleanExisting) &&
    !/^unknown$/i.test(cleanExisting) &&
    !/^none$/i.test(cleanExisting)
  ) {
    return cleanExisting;
  }

  const combined = `${cleanText(title)} ${cleanText(desc)}`;

  // 1. Check explicit color tag in description (e.g. "Color: Sage Olive", "Couleur: Noir", "Farbe: Blau")
  const explicitColorMatch = combined.match(/(?:color|colour|couleur|farbe|colore)\s*[:\-–]\s*([a-zA-Z0-9\s/-]+?)(?:\s*(?:[,\n\r\t•|;]|\.|$))/i);
  if (explicitColorMatch && explicitColorMatch[1]) {
    const cand = explicitColorMatch[1].trim();
    if (cand.length >= 3 && cand.length <= 30 && !/^various/i.test(cand)) {
      return cand;
    }
  }

  // 2. Check dictionary of known colors
  for (const { pattern, canonical } of KNOWN_COLORS) {
    if (pattern.test(combined)) {
      return canonical;
    }
  }

  return cleanExisting || 'Neutral';
}

/**
 * Extract fabric / material from title, description, or payload
 */
export function extractMaterialFromTitleAndDesc(
  title?: string,
  desc?: string,
  existingMaterial?: string
): string {
  const cleanExisting = cleanText(existingMaterial);
  if (
    cleanExisting &&
    !/^premium fabric$/i.test(cleanExisting) &&
    !/^quality fabric$/i.test(cleanExisting) &&
    !/^natural fiber \/ blend$/i.test(cleanExisting) &&
    !/^unknown$/i.test(cleanExisting) &&
    !/^none$/i.test(cleanExisting)
  ) {
    return cleanExisting;
  }

  const combined = `${cleanText(title)} ${cleanText(desc)}`;

  // 1. Check explicit material / composition tag in description (e.g. "Composition: 100% Cotton", "Matière: Laine")
  const explicitMaterialMatch = combined.match(/(?:material|fabric|composition|matière|stoff|tessuto)\s*[:\-–]\s*([a-zA-Z0-9%&'+.\s/-]+?)(?:\s*(?:[,\n\r\t•|;]|\.|$))/i);
  if (explicitMaterialMatch && explicitMaterialMatch[1]) {
    const cand = explicitMaterialMatch[1].trim();
    if (cand.length >= 3 && cand.length <= 50) {
      return cand;
    }
  }

  // 2. Check dictionary of known materials
  for (const { pattern, canonical } of KNOWN_MATERIALS) {
    if (pattern.test(combined)) {
      return canonical;
    }
  }

  return cleanExisting || 'Cotton / Natural Fiber';
}

/**
 * Extract size from title, description, or payload
 */
export function extractSizeFromTitleAndDesc(
  title?: string,
  desc?: string,
  existingSize?: string
): string {
  const cleanExisting = cleanText(existingSize);
  if (cleanExisting) return cleanExisting;

  const combined = `${cleanText(title)} ${cleanText(desc)}`;
  
  // Waist & Length (e.g. W32 L32, W30/L32, 32/32)
  const waistMatch = combined.match(/\bW([0-9]{2})[\s/]*L([0-9]{2})\b/i);
  if (waistMatch) return `W${waistMatch[1]} L${waistMatch[2]}`;

  // Chest/Suit sizing (e.g. 38R, 40L, 42S)
  const suitMatch = combined.match(/\b([3-5][0-9])([RSL])\b/i);
  if (suitMatch) return `${suitMatch[1]}${suitMatch[2].toUpperCase()}`;

  // UK / EU sizing
  const ukMatch = combined.match(/\bUK\s*([0-9]{1,2}(?:\.5)?)\b/i);
  if (ukMatch) return `UK ${ukMatch[1]}`;

  const euMatch = combined.match(/\bEU\s*([0-9]{2}(?:\.5)?)\b/i);
  if (euMatch) return `EU ${euMatch[1]}`;

  // Standard sizes (XXS, XS, S, M, L, XL, XXL)
  const sizeTagMatch = combined.match(/\b(?:size|sz\.?|taille|talla|taglia)[\s:]*([XSMLExtraSmallMediumLarge]+|[0-9]{1,2})\b/i);
  if (sizeTagMatch) return sizeTagMatch[1].toUpperCase();

  // Standalone word boundaries for sizes
  const wordSizeMatch = combined.match(/\b(XXS|XS|XL|XXL|XXXL)\b/i);
  if (wordSizeMatch) return wordSizeMatch[1].toUpperCase();

  const letterSizeMatch = combined.match(/\b([SML])\b/);
  if (letterSizeMatch) return letterSizeMatch[1];

  return '';
}

/**
 * Extract seller username cleanly from order object, description, or notes
 */
export function extractSellerFromOrder(
  order: any,
  fallbackSeller?: string
): string | undefined {
  if (!order) return fallbackSeller ? String(fallbackSeller).trim() : undefined;

  // Direct seller fields on order
  const s =
    order.seller?.username ||
    order.seller_username ||
    order.seller ||
    order.item?.seller?.username ||
    order.item?.seller ||
    order.user?.login ||
    order.user?.username;

  if (s && typeof s === 'string' && s.trim()) {
    return s.trim().replace(/^@/, '');
  }

  // Search description or notes for "@sellername" or "seller: ..."
  const text = `${order.description || ''} ${order.notes || ''} ${order.title || ''}`;
  const match = text.match(/(?:sold\s*by|seller|from)[\s:@]+([a-zA-Z0-9_.-]{3,30})/i);
  if (match) {
    return match[1].trim();
  }

  return fallbackSeller ? String(fallbackSeller).trim().replace(/^@/, '') : undefined;
}

/**
 * Process an entire order / listing payload to ensure all attributes
 * (Brand, Color, Material, Size, Seller, Retailer) are maximally accurate
 * and do not fall back to 'Vinted' as the garment's brand.
 */
export function extractAllGarmentAttributes(input: {
  title?: string;
  description?: string;
  brand?: string;
  color?: string;
  material?: string;
  size?: string;
  seller?: string;
  notes?: string;
  isOrder?: boolean;
}) {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const notes = cleanText(input.notes);

  const brand = extractBrandFromTitleAndDesc(title, `${description} ${notes}`, input.brand);
  const color = extractColorFromTitleAndDesc(title, `${description} ${notes}`, input.color);
  const material = extractMaterialFromTitleAndDesc(title, `${description} ${notes}`, input.material);
  const size = extractSizeFromTitleAndDesc(title, `${description} ${notes}`, input.size);
  const seller = extractSellerFromOrder(input, input.seller);

  return {
    brand,
    color,
    material,
    size,
    seller,
    retailerName: 'Vinted', // Retailer/Platform is Vinted, but brand is the actual garment brand!
  };
}
