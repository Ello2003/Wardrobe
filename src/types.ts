export type Category = string;

export const DEFAULT_CATEGORIES: string[] = [
  'Outerwear',
  'Knitwear',
  'Tops',
  'Bottoms',
  'Dresses & Jumpsuits',
  'Shoes',
  'Bags',
  'Accessories',
  'Formalwear',
  'Activewear',
];

export const normalizeCategoryName = (
  category: string | undefined | null,
  availableCategories: string[] = DEFAULT_CATEGORIES
): string => {
  if (!category || !category.trim()) return availableCategories[0] || 'Outerwear';
  const clean = category.trim();
  const found = availableCategories.find((c) => c.toLowerCase() === clean.toLowerCase());
  return found || clean;
};

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter' | 'All-Season';

export type Condition = 'Pristine / New' | 'Excellent' | 'Good' | 'Vintage / Well-Loved';

export type ShoppingPriority = 'Essential / Must-Have' | 'High' | 'Medium' | 'Low / Wishlist';

export type ShoppingStatus =
  | 'Researching'
  | 'To Buy'
  | 'In Basket'
  | 'Purchased'
  | 'Sold'
  | 'Cancelled'
  | 'Passed';

export interface AppSettings {
  currency: 'GBP' | 'USD' | 'EUR' | 'JPY' | 'AUD' | 'CAD';
  currencySymbol: string;
  inlineEditingEnabled: boolean;
  inlineEditTrigger: 'single-click' | 'double-click' | 'always-visible';
  showInlinePencils: boolean;
  defaultWardrobeView: 'grid' | 'table';
  defaultShoppingView: 'grid' | 'table';
  defaultSellingView: 'grid' | 'table';
  imageFit: 'contain' | 'cover';
  imageAspectRatio: '1:1' | '4:5' | '3:4';
  cardDensity: 'comfortable' | 'compact' | 'dense';
  showArchivedByDefault: boolean;
  autoSaveDelayMs: number;
  enableColorBadges: boolean;
  customTags: string[];
  monthlyBudgetAlertThreshold: number; // percentage (e.g. 85%)
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: 'GBP',
  currencySymbol: '£',
  inlineEditingEnabled: true,
  inlineEditTrigger: 'single-click',
  showInlinePencils: true,
  defaultWardrobeView: 'grid',
  defaultShoppingView: 'grid',
  defaultSellingView: 'grid',
  imageFit: 'contain',
  imageAspectRatio: '1:1',
  cardDensity: 'comfortable',
  showArchivedByDefault: false,
  autoSaveDelayMs: 300,
  enableColorBadges: true,
  customTags: ['Casual', 'Formal', 'Work', 'Vintage', 'Minimalist', 'Summer', 'Winter', 'Essential'],
  monthlyBudgetAlertThreshold: 85,
};

export interface BulkEditWardrobePayload {
  category?: Category;
  condition?: Condition;
  seasons?: Season[];
  addTags?: string[];
  removeTags?: string[];
  storageLocation?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  priceAdjustmentType?: 'set' | 'increase_percent' | 'decrease_percent' | 'add_amount';
  priceAdjustmentValue?: number;
}

export interface BulkEditShoppingPayload {
  category?: Category;
  priority?: ShoppingPriority;
  status?: ShoppingStatus;
  retailerName?: string;
  season?: Season;
  addTags?: string[];
  removeTags?: string[];
  priceAdjustmentType?: 'set' | 'increase_percent' | 'decrease_percent' | 'add_amount';
  priceAdjustmentValue?: number;
}

export interface BulkEditSalePayload {
  category?: Category;
  platform?: SellingPlatform;
  status?: SellingStatus;
  condition?: Condition;
  shippingStatus?: ShippingStatus;
  courier?: 'Evri' | 'Royal Mail' | 'DPD' | 'InPost' | 'Yodel' | 'Other';
  addTags?: string[];
  removeTags?: string[];
  priceAdjustmentType?: 'set' | 'increase_percent' | 'decrease_percent' | 'add_amount';
  priceAdjustmentValue?: number;
}

export interface BulkEditOutfitPayload {
  occasion?: 'Work & Office' | 'Weekend Casual' | 'Evening & Dining' | 'Formal & Events' | 'Travel Capsule' | 'Date Night' | 'Seasonal Transition';
  season?: Season;
  addTags?: string[];
  removeTags?: string[];
  isFavorite?: boolean;
}

export interface WardrobeItem {
  id: string;
  name: string;
  brand: string;
  category: Category;
  subcategory?: string;
  color: string;
  colorHex?: string;
  season: Season[];
  purchaseDate: string; // ISO date string (YYYY-MM-DD)
  purchasePrice: number; // in £ GBP
  currentValuation?: number; // in £ GBP
  wearCount: number;
  lastWornDate?: string;
  condition: Condition;
  material?: string;
  size?: string;
  careNotes?: string;
  tags: string[];
  imageUrl: string;
  storageLocation?: string;
  isFavorite: boolean;
  isArchived: boolean;
  notes?: string;
  vintedUrl?: string;
  retailerName?: string;
  orderNumber?: string;
  // Vinted & Acquisition Metadata
  seller?: string;
  buyer?: string;
  orderDate?: string;
  orderStatus?: string;
  transactionType?: 'Purchase' | 'Sale';
  orderValue?: number;
  walletAmount?: number;
  lastUpdatedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LookbookOutfit {
  id: string;
  title: string;
  description?: string;
  occasion: 'Work & Office' | 'Weekend Casual' | 'Evening & Dining' | 'Formal & Events' | 'Travel Capsule' | 'Date Night' | 'Seasonal Transition';
  season: Season;
  itemIds: string[]; // references WardrobeItem id
  wishlistItemIds?: string[]; // references ShoppingItem id (prospective additions)
  tags: string[];
  imageUrl?: string;
  isFavorite: boolean;
  timesWorn: number;
  lastWornDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  brand: string;
  category: Category;
  estimatedPrice: number; // in £ GBP
  actualPricePaid?: number; // in £ GBP if bought
  targetStoreUrl?: string;
  storeUrl?: string;
  vintedUrl?: string;
  orderNumber?: string;
  retailerName?: string;
  priority: ShoppingPriority;
  status: ShoppingStatus;
  season: Season;
  matchingWardrobeItemIds: string[]; // existing wardrobe items this would pair with
  imageUrl: string;
  reasonOrGap: string; // why this item is researched / needed
  estimatedWearsPerYear?: number;
  projectedWears?: number;
  projectedCostPerWear?: number; // estimatedPrice / estimatedWearsPerYear
  tags: string[];
  addedDate: string;
  createdAt?: string;
  purchasedDate?: string;
  // Vinted & Acquisition Metadata
  size?: string;
  color?: string;
  material?: string;
  seller?: string;
  buyer?: string;
  orderDate?: string;
  orderStatus?: string;
  transactionType?: 'Purchase' | 'Sale';
  orderValue?: number;
  walletAmount?: number;
  lastUpdatedDate?: string;
}

export type SellingPlatform =
  | 'Vinted'
  | 'eBay'
  | 'Vestiaire Collective'
  | 'Depop'
  | 'Grailed'
  | 'Direct / Private'
  | 'Other';

export type SellingStatus =
  | 'Draft'
  | 'Listed'
  | 'Reserved'
  | 'Sold'
  | 'Shipped'
  | 'Completed'
  | 'Delisted';

export type ShippingStatus =
  | 'Not Required'
  | 'To Pack'
  | 'Shipped'
  | 'In Transit'
  | 'Delivered';

export interface SaleItem {
  id: string;
  name: string;
  brand: string;
  category: Category;
  size?: string;
  color?: string;
  condition: Condition;
  originalPricePaid: number; // £ cost basis
  listingPrice: number; // £ asking price
  soldPrice?: number; // £ final sale price
  platform: SellingPlatform;
  status: SellingStatus;
  shippingStatus?: ShippingStatus;
  platformListingUrl?: string;
  sourceWardrobeItemId?: string; // links back to original inventory garment
  imageUrl: string;
  additionalImages?: string[];
  description?: string;
  tags: string[];
  listedDate: string; // YYYY-MM-DD
  soldDate?: string; // YYYY-MM-DD
  buyerUsername?: string;
  orderNumber?: string;
  trackingNumber?: string;
  courier?: 'Evri' | 'Royal Mail' | 'DPD' | 'InPost' | 'Yodel' | 'Other';
  platformFees?: number; // in £
  shippingCostPaidBySeller?: number; // in £
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChangeActionType = 
  | 'ITEM_ADDED'
  | 'ITEM_UPDATED'
  | 'ITEM_DELETED'
  | 'ITEM_WORN'
  | 'ITEM_ARCHIVED'
  | 'ITEM_RESTORED'
  | 'CATEGORY_ADDED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'LOOK_CREATED'
  | 'LOOK_UPDATED'
  | 'LOOK_DELETED'
  | 'WISHLIST_ADDED'
  | 'WISHLIST_UPDATED'
  | 'WISHLIST_PURCHASED'
  | 'WISHLIST_DELETED'
  | 'SALE_LISTED'
  | 'SALE_UPDATED'
  | 'SALE_SOLD'
  | 'SALE_DELETED'
  | 'SNAPSHOT_CREATED'
  | 'SNAPSHOT_RESTORED'
  | 'BUDGET_UPDATED'
  | 'BULK_IMPORT'
  | 'UNDO_EXECUTED';

export interface VersionChangeLog {
  id: string;
  versionNumber: number;
  timestamp: string; // ISO string
  actionType: ChangeActionType;
  entityType: 'wardrobe_item' | 'lookbook_outfit' | 'shopping_item' | 'sale_item' | 'system' | 'snapshot' | 'budget';
  entityId?: string;
  entityTitle: string;
  summary: string;
  details?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    financialImpact?: number; // £ change
    wearCount?: number;
  };
  author?: string;
}

export interface WardrobeSnapshot {
  id: string;
  versionNumber: number;
  name: string;
  description: string;
  createdAt: string;
  itemCount: number;
  totalValuation: number; // £
  outfitCount: number;
  wishlistCount: number;
  saleItemCount?: number;
  data: {
    items: WardrobeItem[];
    outfits: LookbookOutfit[];
    shoppingList: ShoppingItem[];
    saleItems?: SaleItem[];
    monthlyBudget: number;
  };
}

export interface WardrobeState {
  version: number;
  items: WardrobeItem[];
  outfits: LookbookOutfit[];
  shoppingList: ShoppingItem[];
  saleItems: SaleItem[];
  changeLogs: VersionChangeLog[];
  snapshots: WardrobeSnapshot[];
  monthlyBudget: number; // in £ GBP
  spentThisMonth: number; // in £ GBP
}

export interface TrendInspiration {
  id: string;
  title: string;
  season: Season;
  aesthetic: string;
  description: string;
  keyPieces: {
    name: string;
    category: Category;
    suggestedPrice: number; // in £
    whyItWorks: string;
    brandExamples: string[];
    imageUrl: string;
  }[];
  colorPalette: { name: string; hex: string }[];
  styleTips: string[];
  coverImageUrl: string;
}
