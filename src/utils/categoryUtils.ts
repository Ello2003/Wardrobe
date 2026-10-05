/**
 * Single Source of Truth for Categories (Re-exported from centralized constants)
 * 
 * Provides unified, canonical category definitions, synonym normalization,
 * apparel vs homeware taxonomy grouping, and safe fallbacks across all dialogs,
 * forms, batch creators, tables, and auto-scanners.
 */

export type { Category, GroupedCategoriesResult } from '../constants/categories';
export {
  CANONICAL_GARMENT_CATEGORIES,
  CANONICAL_HOMEWARE_CATEGORIES,
  DEFAULT_GARMENT_CATEGORIES,
  DEFAULT_HOMEWARE_CATEGORIES,
  DEFAULT_CATEGORIES,
  deduplicateCategoriesCaseInsensitive,
  isHomewareCategory,
  normalizeCategoryName,
  CATEGORY_SYNONYMS,
  getSafeCategories,
  canonicalizeCategory,
  getGroupedCategories,
} from '../constants/categories';

