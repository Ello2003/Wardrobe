/**
 * Text Casing and Proper Case formatting utilities for Wardrobe, Wishlist, and Resale items.
 */

// Well-known sartorial acronyms to preserve in uppercase
export const COMMON_SARTORIAL_ACRONYMS = new Set([
  'UK',
  'US',
  'USA',
  'NYC',
  'EU',
  'IT',
  'FR',
  'JP',
  'RL',
  'RRL',
  'LVMH',
  'BB',
  'J.PRESS',
  'OG',
  'FW',
  'SS',
  'AW',
  'TPO',
  'CWF',
  'OCBD',
  'MTO',
  'MTM',
  'BESPOKE',
  'GORE-TEX',
  'NPS',
  'VTC',
]);

// Exact brand casing mappings for sartorial labels
export const SARTORIAL_BRAND_CASING: Record<string, string> = {
  "drake's": "Drake's",
  'drakes': "Drake's",
  'suitsupply': 'Suitsupply',
  'ralph lauren': 'Ralph Lauren',
  'polo ralph lauren': 'Polo Ralph Lauren',
  'rrl': 'RRL',
  'loro piana': 'Loro Piana',
  'ermenegildo zegna': 'Ermenegildo Zegna',
  'zegna': 'Zegna',
  'brunello cucinelli': 'Brunello Cucinelli',
  'crockett & jones': 'Crockett & Jones',
  'crockett and jones': 'Crockett & Jones',
  'edward green': 'Edward Green',
  'john lobb': 'John Lobb',
  'church\'s': "Church's",
  'cheaney': 'Cheaney',
  'joseph cheaney': 'Joseph Cheaney',
  'alden': 'Alden',
  'barbour': 'Barbour',
  'belstaff': 'Belstaff',
  'mackintosh': 'Mackintosh',
  'spier & mackay': 'Spier & Mackay',
  'spier and mackay': 'Spier & Mackay',
  'turnbull & asser': 'Turnbull & Asser',
  'charvet': 'Charvet',
  'finamore': 'Finamore',
  'luigi borrelli': 'Luigi Borrelli',
  'borrelli': 'Borrelli',
  'cesare attolini': 'Cesare Attolini',
  'ring jacket': 'Ring Jacket',
  'boglioli': 'Boglioli',
  'tagliatore': 'Tagliatore',
  'canali': 'Canali',
  'corneliani': 'Corneliani',
  'brioni': 'Brioni',
  'kiton': 'Kiton',
  'carmina': 'Carmina',
  'meermin': 'Meermin',
  'grenson': 'Grenson',
  'tricker\'s': "Tricker's",
  'paraboot': 'Paraboot',
  'alessandro gherardi': 'Alessandro Gherardi',
  'barba napoli': 'Barba Napoli',
  'emma willis': 'Emma Willis',
  'begg & co': 'Begg & Co',
  'johnstons of elgin': 'Johnstons of Elgin',
  'invertere': 'Invertere',
  'gloverall': 'Gloverall',
  'valstar': 'Valstar',
  'chrysalis': 'Chrysalis',
  'cordings': 'Cordings',
  'j.press': 'J.Press',
  'brooks brothers': 'Brooks Brothers',
  'anatomica': 'Anatomica',
  'the armoury': 'The Armoury',
  'permanent style': 'Permanent Style',
};

export interface ProperCaseOptions {
  preserveAcronyms?: boolean;
  useBrandDictionary?: boolean;
  keepMinorWordsLower?: boolean; // false = Capitalize Every Word (strict Proper Case)
}

const MINOR_WORDS = new Set([
  'and',
  'or',
  'nor',
  'but',
  'a',
  'an',
  'the',
  'as',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'per',
  'to',
  'vs',
  'via',
  'with',
]);

/**
 * Converts a string to Proper Case (Capitalizing the first letter of words).
 * E.g. "NAVY BLUE WOOL SUIT" -> "Navy Blue Wool Suit"
 * "drake's raw denim 14oz" -> "Drake's Raw Denim 14oz"
 */
export function toProperCase(
  input: string | null | undefined,
  options: ProperCaseOptions = {}
): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  const {
    preserveAcronyms = true,
    useBrandDictionary = true,
    keepMinorWordsLower = false,
  } = options;

  // Check brand dictionary exact match first
  if (useBrandDictionary) {
    const normalizedKey = trimmed.toLowerCase();
    if (SARTORIAL_BRAND_CASING[normalizedKey]) {
      return SARTORIAL_BRAND_CASING[normalizedKey];
    }
  }

  // Regex matches words (handling hyphens, apostrophes, and slashes)
  // e.g. "off-white", "drake's", "cotton/linen"
  return trimmed.replace(
    /([^\s\-\/\(\)\[\]\.,;:]+)([\s\-\/\(\)\[\]\.,;:]*)/gi,
    (match, word: string, separator: string, offset: number) => {
      const upperWord = word.toUpperCase();
      const lowerWord = word.toLowerCase();

      // Check brand dictionary word match (e.g. within a compound brand like "Drake's")
      if (useBrandDictionary && SARTORIAL_BRAND_CASING[lowerWord]) {
        return SARTORIAL_BRAND_CASING[lowerWord] + separator;
      }

      // Preserve known acronyms (e.g. UK, USA, NYC, RRL, OCBD)
      if (preserveAcronyms && COMMON_SARTORIAL_ACRONYMS.has(upperWord)) {
        return upperWord + separator;
      }

      // Check minor words if title-case mode is active
      if (keepMinorWordsLower && offset > 0 && MINOR_WORDS.has(lowerWord)) {
        return lowerWord + separator;
      }

      // If word contains internal apostrophe (e.g. "o'connell's", "drake's")
      if (word.includes("'")) {
        const parts = word.split("'");
        const capitalized = parts
          .map((p, idx) => {
            if (idx === 0) {
              return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
            }
            // For "'s", keep lower "s", e.g. "Drake's"
            if (p.toLowerCase() === 's') return 's';
            return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          })
          .join("'");
        return capitalized + separator;
      }

      // Standard word capitalization
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      return capitalized + separator;
    }
  );
}

export interface ProperCaseFieldSelection {
  name: boolean;
  brand: boolean;
  color: boolean;
  material: boolean;
  subCategory: boolean;
  tags: boolean;
}

export const DEFAULT_PROPER_CASE_FIELDS: ProperCaseFieldSelection = {
  name: true,
  brand: true,
  color: true,
  material: true,
  subCategory: true,
  tags: false, // Default off to prevent unintentional tag taxonomy changes
};

export interface ItemProperCaseDiff {
  id: string;
  originalName: string;
  itemType: 'wardrobe' | 'shopping' | 'sale';
  changes: Array<{
    field: string;
    before: string;
    after: string;
  }>;
}

/**
 * Calculates differences if proper case is applied to an item.
 */
export function previewItemProperCase(
  item: any,
  itemType: 'wardrobe' | 'shopping' | 'sale',
  fields: ProperCaseFieldSelection,
  options: ProperCaseOptions = {}
): ItemProperCaseDiff | null {
  if (!item) return null;

  const changes: Array<{ field: string; before: string; after: string }> = [];

  const checkField = (fieldName: string, currentVal: any) => {
    if (typeof currentVal !== 'string' || !currentVal.trim()) return;
    const transformed = toProperCase(currentVal, options);
    if (transformed !== currentVal) {
      changes.push({
        field: fieldName,
        before: currentVal,
        after: transformed,
      });
    }
  };

  if (fields.name && item.name) checkField('name', item.name);
  if (fields.brand && item.brand) checkField('brand', item.brand);
  if (fields.color && item.color) checkField('color', item.color);
  if (fields.material && item.material) checkField('material', item.material);
  if (fields.subCategory && item.subCategory) checkField('subCategory', item.subCategory);

  if (fields.tags && Array.isArray(item.tags)) {
    const originalTagsStr = item.tags.join(', ');
    const transformedTags = item.tags.map((t: string) => toProperCase(t, options));
    const newTagsStr = transformedTags.join(', ');
    if (originalTagsStr !== newTagsStr) {
      changes.push({
        field: 'tags',
        before: originalTagsStr,
        after: newTagsStr,
      });
    }
  }

  if (changes.length === 0) return null;

  return {
    id: item.id,
    originalName: item.name || item.brand || 'Item',
    itemType,
    changes,
  };
}
