import { WardrobeItem, ShoppingItem, SaleItem, Condition, Season } from '../../types';

export type ItemSource = 'wardrobe' | 'shopping' | 'selling';

export type StatusCategory = 'active' | 'cancelled_passed' | 'completed_sold' | 'archived';

export interface DuplicateItemRef {
  refKey: string;
  id: string;
  source: ItemSource;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  price: number;
  imageUrl: string;
  additionalImages?: string[];
  size?: string;
  color?: string;
  colorHex?: string;
  material?: string;
  condition?: string;
  season?: string[];
  tags: string[];
  notes?: string;
  wearCount?: number;
  status: string;
  statusCategory: StatusCategory;
  rawStatus?: string;
  priority?: string;
  seller?: string;
  retailerName?: string;
  storageLocation?: string;
  platform?: string;
  isArchived?: boolean;
  rawItem: WardrobeItem | ShoppingItem | SaleItem;
}

export type MatchPreset =
  | 'standard'
  | 'brand_consolidator'
  | 'strict'
  | 'active_only'
  | 'tags_style'
  | 'style_model'
  | 'location_storage'
  | 'cross_collection'
  | 'fuzzy'
  | 'custom';

export interface MatchParametersConfig {
  matchBrand: boolean;
  matchTitle: boolean;
  matchColour: 'strict' | 'family' | 'ignore';
  matchCategory: boolean;
  matchSubcategory: boolean;
  matchSize: boolean;
  matchMaterial: boolean;
  matchCondition: boolean;
  matchSeason: boolean;
  matchTags: 'ignore' | 'exact' | 'any_overlap';
  matchStatus: 'ignore' | 'exact' | 'lifecycle';
  excludeCancelled: boolean;
  excludeArchived: boolean;
  matchSeller: boolean;
  matchLocation: boolean;
  matchPriceProximity: boolean;
}

export interface DuplicateCluster {
  id: string;
  key: string;
  matchType: 'exact' | 'color_match' | 'variant' | 'tag_match' | 'fuzzy';
  title: string;
  brand: string;
  category: string;
  items: DuplicateItemRef[];
  primaryId: string;
  primarySource: ItemSource;
  colorStatus: 'same_exact' | 'same_family' | 'variant' | 'missing_some' | 'missing_all';
  uniqueColors: Array<{ name: string; count: number; hex: string; family: string }>;
  uniqueSizes: string[];
  uniqueMaterials: string[];
  uniqueStatuses: string[];
  uniqueStatusCategories: StatusCategory[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalWears: number;
  allTags: string[];
  hasColorMismatch: boolean;
  hasSizeMismatch: boolean;
  hasMaterialMismatch: boolean;
  hasPriceMismatch: boolean;
  hasStatusMismatch: boolean;
  hasCancelledItem: boolean;
  hasArchivedItem: boolean;
}

export interface CustomMergeDraft {
  name: string;
  brand: string;
  color: string;
  colorHex?: string;
  size: string;
  material: string;
  category: string;
  subcategory?: string;
  condition: string;
  price: number;
  wearCount: number;
  imageUrl: string;
  tags: string[];
  notes: string;
  storageLocation: string;
  status: string;
}
