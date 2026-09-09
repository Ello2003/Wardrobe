import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  WardrobeItem,
  LookbookOutfit,
  ShoppingItem,
  SaleItem,
  SellingPlatform,
  SellingStatus,
  ShippingStatus,
  VersionChangeLog,
  WardrobeSnapshot,
  Category,
  Season,
  Condition,
  ShoppingPriority,
  ShoppingStatus,
  DEFAULT_CATEGORIES,
  AppSettings,
  DEFAULT_APP_SETTINGS,
  normalizeCategoryName,
} from '../types';
import {
  VintedOrder,
  VintedExtractedItem,
  inferCategoryFromTitle,
} from '../services/vintedWorkerService';
import {
  INITIAL_WARDROBE_ITEMS,
  INITIAL_LOOKBOOK_OUTFITS,
  INITIAL_SHOPPING_LIST,
  INITIAL_SALE_ITEMS,
  INITIAL_VERSION_LOGS,
  INITIAL_SNAPSHOTS,
} from '../data/initialData';
import {
  isGarmentDuplicate,
  consolidateWardrobeDuplicates,
  consolidateShoppingDuplicates,
  consolidateSaleDuplicates,
} from '../components/duplicateMerge/duplicateUtils';
import {
  determineLifecycleTags,
  isCancelledStatus,
} from '../utils/tagUtils';

// Global counter and entropy to ensure collision-free IDs even inside tight synchronous loops (e.g. bulk moves)
let globalIdCounter = 0;
export const generateUniqueId = (prefix: string = 'id'): string => {
  globalIdCounter = (globalIdCounter + 1) % 1000000;
  const entropy = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}-${time}-${globalIdCounter}-${entropy}`;
};

export const ensureUniqueIds = <T extends { id: string }>(list: T[] | null | undefined, prefix: string): T[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list
    .filter((item): item is T => Boolean(item && typeof item === 'object'))
    .map((item) => {
      if (!item.id || seen.has(item.id)) {
        const newId = generateUniqueId(prefix);
        seen.add(newId);
        return { ...item, id: newId };
      }
      seen.add(item.id);
      return item;
    });
};

interface UndoState {
  items: WardrobeItem[];
  outfits: LookbookOutfit[];
  shoppingList: ShoppingItem[];
  saleItems: SaleItem[];
  categories: string[];
  monthlyBudget: number;
  actionTitle: string;
  timestamp: number;
}

interface WardrobeContextType {
  // State
  items: WardrobeItem[];
  outfits: LookbookOutfit[];
  shoppingList: ShoppingItem[];
  saleItems: SaleItem[];
  changeLogs: VersionChangeLog[];
  snapshots: WardrobeSnapshot[];
  categories: string[];
  monthlyBudget: number; // in currency units
  spentThisMonth: number; // in currency units
  currentVersion: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  formatCurrency: (amount: number) => string;

  // Undo & Bulk Operations
  undoLastAction: () => boolean;
  canUndo: boolean;
  undoToast: { visible: boolean; message: string; actionTitle: string } | null;
  dismissUndoToast: () => void;
  deleteMultipleItems: (ids: string[]) => void;
  deleteMultipleShoppingItems: (ids: string[]) => void;
  deleteMultipleSaleItems: (ids: string[]) => void;
  deleteMultipleOutfits: (ids: string[]) => void;
  batchUpdateItems: (
    ids: string[],
    updates: Partial<WardrobeItem> | ((item: WardrobeItem) => Partial<WardrobeItem>),
    customSummary?: string
  ) => void;
  batchUpdateShoppingItems: (
    ids: string[],
    updates: Partial<ShoppingItem> | ((item: ShoppingItem) => Partial<ShoppingItem>),
    customSummary?: string
  ) => void;
  batchUpdateSaleItems: (
    ids: string[],
    updates: Partial<SaleItem> | ((item: SaleItem) => Partial<SaleItem>),
    customSummary?: string
  ) => void;
  batchUpdateOutfits: (
    ids: string[],
    updates: Partial<LookbookOutfit> | ((outfit: LookbookOutfit) => Partial<LookbookOutfit>),
    customSummary?: string
  ) => void;
  batchAddItems: (
    items: Array<Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>>,
    customTitle?: string
  ) => string[];
  batchAddShoppingItems: (
    items: Array<Omit<ShoppingItem, 'id' | 'addedDate'>>,
    customTitle?: string
  ) => string[];
  batchAddSaleItems: (
    items: Array<Omit<SaleItem, 'id' | 'createdAt' | 'updatedAt'>>,
    customTitle?: string
  ) => string[];

  // Global Taxonomy Actions
  renameTagGlobally: (oldTag: string, newTag: string) => void;
  deleteTagGlobally: (tag: string) => void;
  renameBrandGlobally: (oldBrand: string, newBrand: string) => void;

  // Category Actions
  addCategory: (name: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
  resetCategories: () => void;

  // Wardrobe Item Actions
  addItem: (itemData: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>, checkDuplicate?: boolean) => string;
  updateItem: (id: string, updates: Partial<WardrobeItem>, consolidateDuplicates?: boolean) => void;
  deleteItem: (id: string) => void;
  logItemWear: (id: string, customDate?: string) => void;
  toggleItemFavorite: (id: string) => void;

  // Lookbook Actions
  addOutfit: (outfitData: Omit<LookbookOutfit, 'id' | 'createdAt' | 'updatedAt' | 'timesWorn'>) => string;
  updateOutfit: (id: string, updates: Partial<LookbookOutfit>) => void;
  deleteOutfit: (id: string) => void;
  logOutfitWear: (id: string) => void;
  toggleOutfitFavorite: (id: string) => void;

  // Shopping / Wishlist Actions
  addShoppingItem: (itemData: Omit<ShoppingItem, 'id' | 'addedDate'>) => string;
  updateShoppingItem: (id: string, updates: Partial<ShoppingItem>) => void;
  deleteShoppingItem: (id: string) => void;
  purchaseShoppingItem: (id: string, actualPricePaid?: number, condition?: Condition) => string;

  // Cross-Collection Mobility & Transfers
  moveShoppingItemToSales: (
    shoppingItemId: string,
    listingPrice?: number,
    platform?: SellingPlatform,
    removeFromShopping?: boolean
  ) => string;
  moveShoppingItemToWardrobe: (
    shoppingItemId: string,
    actualPricePaid?: number,
    condition?: Condition
  ) => string;
  moveWardrobeItemToSales: (
    wardrobeItemId: string,
    listingPrice?: number,
    platform?: SellingPlatform,
    removeFromWardrobe?: boolean
  ) => string;
  moveWardrobeItemToShopping: (
    wardrobeItemId: string,
    removeFromWardrobe?: boolean
  ) => string;
  moveSaleItemToWardrobe: (
    saleItemId: string,
    removeFromSales?: boolean
  ) => string;
  moveSaleItemToShopping: (
    saleItemId: string,
    removeFromSales?: boolean
  ) => string;
  moveMultipleShoppingItems: (
    ids: string[],
    target: 'wardrobe' | 'selling'
  ) => void;
  moveMultipleWardrobeItems: (
    ids: string[],
    target: 'shopping' | 'selling',
    removeFromWardrobe?: boolean
  ) => void;
  moveMultipleSaleItems: (
    ids: string[],
    target: 'wardrobe' | 'shopping',
    removeFromSales?: boolean
  ) => void;

  // Resale / Selling Actions
  addSaleItem: (saleData: Omit<SaleItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSaleItem: (id: string, updates: Partial<SaleItem>) => void;
  deleteSaleItem: (id: string) => void;
  markItemAsSold: (
    id: string,
    soldData: {
      soldPrice: number;
      soldDate?: string;
      buyerUsername?: string;
      orderNumber?: string;
      courier?: 'Evri' | 'Royal Mail' | 'DPD' | 'InPost' | 'Yodel' | 'Other';
      trackingNumber?: string;
      platformFees?: number;
      shippingCostPaidBySeller?: number;
      archiveFromWardrobe?: boolean;
    }
  ) => void;
  listWardrobeItemForSale: (
    wardrobeItem: WardrobeItem,
    listingData: {
      listingPrice: number;
      platform: SellingPlatform;
      condition?: Condition;
      description?: string;
      tags?: string[];
      notes?: string;
    }
  ) => string;
  batchUpdateSaleItemsStatus: (ids: string[], newStatus: SellingStatus) => void;

  // Deduplication & Merge Actions
  mergeWardrobeItems: (
    primaryId: string,
    secondaryIds: string[],
    customMerged?: Partial<WardrobeItem>
  ) => void;
  mergeShoppingItems: (
    primaryId: string,
    secondaryIds: string[],
    customMerged?: Partial<ShoppingItem>
  ) => void;
  mergeSaleItems: (
    primaryId: string,
    secondaryIds: string[],
    customMerged?: Partial<SaleItem>
  ) => void;
  mergeCrossCollectionItems: (
    primaryCollection: 'wardrobe' | 'shopping' | 'selling',
    primaryId: string,
    secondaryItems: Array<{ collection: 'wardrobe' | 'shopping' | 'selling'; id: string }>,
    customMerged?: any
  ) => void;
  batchAutoMergeDuplicates: (
    clusters: Array<{
      primaryCollection: 'wardrobe' | 'shopping' | 'selling';
      primaryId: string;
      secondary: Array<{ collection: 'wardrobe' | 'shopping' | 'selling'; id: string }>;
    }>
  ) => number;
  autoMergeAllDuplicates: (
    scope?: 'all' | 'wardrobe' | 'shopping' | 'selling',
    exactOnly?: boolean
  ) => { mergedCount: number; removedCount: number; message: string };

  // Snapshot & Rollback Actions
  createSnapshot: (name: string, description?: string, isAuto?: boolean) => string;
  restoreSnapshot: (snapshotId: string) => boolean;
  deleteSnapshot: (snapshotId: string) => void;
  cleanupAutoSnapshots: (keepCount?: number) => number;
  lastAutoSnapshotTime: string | null;
  triggerAutoSnapshot: (reason?: string) => string;

  // Live Audit Timeline Restoration Actions
  restoreTimelineEntryItem: (logId: string) => { success: boolean; message: string; restoredItem?: any };
  restoreTimelineState: (logId: string) => { success: boolean; message: string };
  canRestoreEntry: (log: VersionChangeLog) => {
    canRestoreItem: boolean;
    canRollbackState: boolean;
    itemExistsNow: boolean;
    actionLabel: string;
    description: string;
  };

  // Budget & System Actions
  syncVintedOrderStatuses: () => number;
  syncVintedAccountOrders: (
    orders: VintedOrder[],
    options?: {
      routePurchasedTo?: 'wardrobe' | 'shopping';
      routeSoldTo?: 'selling';
      skipDuplicates?: boolean;
    }
  ) => {
    addedPurchased: number;
    addedSold: number;
    skippedDuplicates: number;
    totalPurchasedVal: number;
    totalSoldVal: number;
  };
  importVintedExtractedListings: (
    items: VintedExtractedItem[],
    destination?: 'selling' | 'shopping' | 'wardrobe'
  ) => {
    importedCount: number;
    totalVal: number;
  };
  updateMonthlyBudget: (newBudgetGbp: number) => void;
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => { success: boolean; message: string };
  resetToDefaultData: () => void;
  clearDatabase: () => void;

  // Computed Metrics
  stats: {
    totalItems: number;
    activeInventoryCount: number;
    archivedItemsCount: number;
    totalValuationGbp: number;
    averageCostPerWearGbp: number;
    totalWearsRecorded: number;
    totalOutfitsCount: number;
    wishlistTotalGbp: number;
    purchasedItemsCount: number;
    wishlistItemsCount: number;
    totalShoppingItemsCount: number;
    budgetRemainingGbp: number;
    topWornItems: WardrobeItem[];
    underutilizedItems: WardrobeItem[];
    bestValueItems: WardrobeItem[];
    categoryCounts: Record<string, number>;
    salesStats: {
      totalRevenueGbp: number;
      totalNetProfitGbp: number;
      profitMarginPercent: number;
      activeListingsCount: number;
      activeListingsValueGbp: number;
      soldItemsCount: number;
      shippedItemsCount: number;
      draftItemsCount: number;
      totalFeesGbp: number;
      platformBreakdown: Record<string, { count: number; revenueGbp: number }>;
    };
  };
}

const STORAGE_KEY = 'wardrobe_lookbook_app_v2_gbp';

// Helper to automatically resolve and align shopping item status from Vinted orderStatus
export const normalizeShoppingItem = (item: ShoppingItem): ShoppingItem => {
  if (!item.orderStatus) return item;
  const clean = item.orderStatus.trim().toLowerCase();
  let resolvedStatus = item.status;

  if (
    clean.includes('completed') ||
    clean.includes('complete') ||
    clean.includes('delivered') ||
    clean.includes('received') ||
    clean.includes('paid') ||
    clean.includes('order completed')
  ) {
    resolvedStatus = 'Purchased';
  } else if (
    clean.includes('cancel') ||
    clean.includes('refund') ||
    clean.includes('returned') ||
    clean.includes('return')
  ) {
    resolvedStatus = 'Cancelled';
  } else if (clean.includes('sold')) {
    resolvedStatus = 'Sold';
  } else if (
    clean.includes('pass') ||
    clean.includes('declin') ||
    clean.includes('reject')
  ) {
    resolvedStatus = 'Passed';
  }

  const effectivePricePaid =
    resolvedStatus === 'Purchased'
      ? item.actualPricePaid || item.orderValue || item.estimatedPrice || 0
      : item.actualPricePaid;

  const effectivePurchasedDate =
    resolvedStatus === 'Purchased'
      ? item.purchasedDate || item.orderDate || new Date().toISOString().split('T')[0]
      : item.purchasedDate;

  return {
    ...item,
    status: resolvedStatus,
    actualPricePaid: effectivePricePaid,
    purchasedDate: effectivePurchasedDate,
  };
};

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);

export const WardrobeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state with localStorage fallback, unique ID disambiguation, and Humidor-grade deduplication sweep
  const [items, setItems] = useState<WardrobeItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_items`);
      const raw: WardrobeItem[] = saved ? JSON.parse(saved) : INITIAL_WARDROBE_ITEMS;
      const uniqueRaw = ensureUniqueIds(raw, 'item');
      const normalized = uniqueRaw.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
      const { consolidated, mergedCount } = consolidateWardrobeDuplicates(normalized);
      if (mergedCount > 0) {
        console.info(
          `[Humidor Auto-Deduplication] Consolidated ${mergedCount} duplicate instances on startup into clean master records.`
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_items`, JSON.stringify(consolidated));
        } catch (e) {
          console.warn('Failed to cache deduplicated items', e);
        }
      }
      return consolidated;
    } catch {
      const uniqueRaw = ensureUniqueIds(INITIAL_WARDROBE_ITEMS, 'item');
      const normalized = uniqueRaw.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
      const { consolidated } = consolidateWardrobeDuplicates(normalized);
      return consolidated;
    }
  });

  const [outfits, setOutfits] = useState<LookbookOutfit[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_outfits`);
      const raw: LookbookOutfit[] = saved ? JSON.parse(saved) : INITIAL_LOOKBOOK_OUTFITS;
      return ensureUniqueIds(raw, 'look');
    } catch {
      return ensureUniqueIds(INITIAL_LOOKBOOK_OUTFITS, 'look');
    }
  });

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_shopping`);
      const raw: ShoppingItem[] = saved ? JSON.parse(saved) : INITIAL_SHOPPING_LIST;
      const uniqueRaw = ensureUniqueIds(raw, 'shop');
      const normalized = uniqueRaw.map((item) => {
        const norm = normalizeShoppingItem(item);
        return {
          ...norm,
          category: normalizeCategoryName(norm.category) as Category,
        };
      });
      const { consolidated } = consolidateShoppingDuplicates(normalized);
      return consolidated;
    } catch {
      const uniqueRaw = ensureUniqueIds(INITIAL_SHOPPING_LIST, 'shop');
      const normalized = uniqueRaw.map((item) => {
        const norm = normalizeShoppingItem(item);
        return {
          ...norm,
          category: normalizeCategoryName(norm.category) as Category,
        };
      });
      const { consolidated } = consolidateShoppingDuplicates(normalized);
      return consolidated;
    }
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
      const raw: SaleItem[] = saved ? JSON.parse(saved) : INITIAL_SALE_ITEMS;
      const uniqueRaw = ensureUniqueIds(raw, 'sale');
      const normalized = uniqueRaw.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
      const { consolidated } = consolidateSaleDuplicates(normalized);
      return consolidated;
    } catch {
      const uniqueRaw = ensureUniqueIds(INITIAL_SALE_ITEMS, 'sale');
      const normalized = uniqueRaw.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
      const { consolidated } = consolidateSaleDuplicates(normalized);
      return consolidated;
    }
  });

  const [changeLogs, setChangeLogs] = useState<VersionChangeLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_logs`);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_VERSION_LOGS;
    } catch {
      return INITIAL_VERSION_LOGS;
    }
  });

  const [snapshots, setSnapshots] = useState<WardrobeSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_snapshots`);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_SNAPSHOTS;
    } catch {
      return INITIAL_SNAPSHOTS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
      const parsed = saved ? JSON.parse(saved) : null;
      let initial = parsed && typeof parsed === 'object' ? { ...DEFAULT_APP_SETTINGS, ...parsed } : DEFAULT_APP_SETTINGS;

      // Automatically migrate or restore any legacy worker-endpoint or vinted-auth from localStorage
      if (!initial.vintedWorkerAuth?.workerEndpoint) {
        const legacyWorker = localStorage.getItem('worker-endpoint');
        let legacyAuth: any = null;
        try {
          const raw = localStorage.getItem('vinted-auth');
          if (raw) legacyAuth = JSON.parse(raw);
        } catch {}

        if (legacyWorker || legacyAuth) {
          initial = {
            ...initial,
            vintedWorkerAuth: {
              workerEndpoint: legacyWorker || initial.vintedWorkerAuth?.workerEndpoint || '',
              domain: legacyAuth?.domain || initial.vintedWorkerAuth?.domain || 'co.uk',
              accessToken: legacyAuth?.access_token || initial.vintedWorkerAuth?.accessToken || '',
              csrfToken: legacyAuth?.xcsrf_token || initial.vintedWorkerAuth?.csrfToken || '',
              refreshToken: legacyAuth?.refresh_token || initial.vintedWorkerAuth?.refreshToken || '',
              cookie: legacyAuth?.cookie || initial.vintedWorkerAuth?.cookie || '',
              autoRouteOrders: true,
              defaultImportDestination: 'wardrobe',
            },
          };
        }
      }

      return initial;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_budget`);
      const parsed = saved ? Number(JSON.parse(saved)) : 350;
      return !isNaN(parsed) && parsed >= 0 ? parsed : 350;
    } catch {
      return 350;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(next));

        // Keep legacy keys in sync for any external scripts or worker calls
        if (next.vintedWorkerAuth) {
          if (next.vintedWorkerAuth.workerEndpoint) {
            localStorage.setItem('worker-endpoint', next.vintedWorkerAuth.workerEndpoint);
          }
          localStorage.setItem(
            'vinted-auth',
            JSON.stringify({
              domain: next.vintedWorkerAuth.domain || 'co.uk',
              access_token: next.vintedWorkerAuth.accessToken || '',
              xcsrf_token: next.vintedWorkerAuth.csrfToken || '',
              refresh_token: next.vintedWorkerAuth.refreshToken || '',
              cookie: next.vintedWorkerAuth.cookie || '',
            })
          );
        }
      } catch (e) {
        console.error('Failed to save settings', e);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS);
    try {
      localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(DEFAULT_APP_SETTINGS));
    } catch (e) {
      console.error('Failed to reset settings', e);
    }
  }, []);

  const formatCurrency = useCallback(
    (amount: number) => {
      const sym = settings.currencySymbol || '£';
      const formattedNum = new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${sym}${formattedNum}`;
    },
    [settings.currencySymbol]
  );

  // Undo & Redo History Stack
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [undoToast, setUndoToast] = useState<{ visible: boolean; message: string; actionTitle: string } | null>(null);

  // Auto-dismiss undo notification after 8s
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  const dismissUndoToast = useCallback(() => {
    setUndoToast(null);
  }, []);

  // Helper to snapshot undo state before any destructive mutation or bulk operation
  const captureUndoState = useCallback(
    (actionTitle: string) => {
      const stateSnapshot: UndoState = {
        items: JSON.parse(JSON.stringify(items)),
        outfits: JSON.parse(JSON.stringify(outfits)),
        shoppingList: JSON.parse(JSON.stringify(shoppingList)),
        saleItems: JSON.parse(JSON.stringify(saleItems)),
        categories: JSON.parse(JSON.stringify(categories)),
        monthlyBudget,
        actionTitle,
        timestamp: Date.now(),
      };
      setUndoStack((prev) => [stateSnapshot, ...prev.slice(0, 29)]);
      setUndoToast({
        visible: true,
        message: actionTitle,
        actionTitle,
      });
    },
    [items, outfits, shoppingList, saleItems, categories, monthlyBudget]
  );

  // Undo last action and restore previous state
  const undoLastAction = useCallback(() => {
    if (undoStack.length === 0) return false;
    const [lastState, ...remaining] = undoStack;

    setItems(lastState.items);
    setOutfits(lastState.outfits);
    setShoppingList(lastState.shoppingList);
    if (lastState.saleItems) setSaleItems(lastState.saleItems);
    setCategories(lastState.categories);
    setMonthlyBudget(lastState.monthlyBudget);
    setUndoStack(remaining);
    setUndoToast(null);

    return true;
  }, [undoStack]);

  // Persist state to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_items`, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_outfits`, JSON.stringify(outfits));
    } catch (e) {
      console.error('Failed to save outfits', e);
    }
  }, [outfits]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_shopping`, JSON.stringify(shoppingList));
    } catch (e) {
      console.error('Failed to save shopping', e);
    }
  }, [shoppingList]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(saleItems));
    } catch (e) {
      console.error('Failed to save sales', e);
    }
  }, [saleItems]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_logs`, JSON.stringify(changeLogs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }, [changeLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_snapshots`, JSON.stringify(snapshots));
    } catch (e) {
      console.error('Failed to save snapshots', e);
    }
  }, [snapshots]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_budget`, JSON.stringify(monthlyBudget));
    } catch (e) {
      console.error('Failed to save budget', e);
    }
  }, [monthlyBudget]);

  // Synchronized state references for consistent access across callbacks and auto-save
  const itemsRef = useRef(items);
  const outfitsRef = useRef(outfits);
  const shoppingListRef = useRef(shoppingList);
  const saleItemsRef = useRef(saleItems);
  const categoriesRef = useRef(categories);
  const monthlyBudgetRef = useRef(monthlyBudget);
  const snapshotsRef = useRef(snapshots);
  const changeLogsRef = useRef(changeLogs);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { outfitsRef.current = outfits; }, [outfits]);
  useEffect(() => { shoppingListRef.current = shoppingList; }, [shoppingList]);
  useEffect(() => { saleItemsRef.current = saleItems; }, [saleItems]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { monthlyBudgetRef.current = monthlyBudget; }, [monthlyBudget]);
  useEffect(() => { snapshotsRef.current = snapshots; }, [snapshots]);
  useEffect(() => { changeLogsRef.current = changeLogs; }, [changeLogs]);

  // Periodic Auto-Snapshot state & change tracker
  const [lastAutoSnapshotTime, setLastAutoSnapshotTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_last_auto_snapshot`) || null;
    } catch {
      return null;
    }
  });

  const hasChangesForAutoSnapshotRef = useRef<boolean>(false);
  const isInitialMountRef = useRef<boolean>(true);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    hasChangesForAutoSnapshotRef.current = true;
  }, [items, outfits, shoppingList, saleItems, monthlyBudget]);

  // Current version number = total logs count
  const currentVersion = changeLogs.length > 0 ? changeLogs[0].versionNumber : 1;

  // Helper to append a structured change log entry with point-in-time snapshot
  const recordChange = useCallback(
    (
      actionType: VersionChangeLog['actionType'],
      entityType: VersionChangeLog['entityType'],
      entityTitle: string,
      summary: string,
      entityId?: string,
      details?: VersionChangeLog['details'],
      customSnapshotData?: VersionChangeLog['snapshotData']
    ) => {
      // Capture live closet snapshot data for instant rollback
      const liveSnapshot: VersionChangeLog['snapshotData'] = customSnapshotData || {
        items: JSON.parse(JSON.stringify(itemsRef.current)),
        outfits: JSON.parse(JSON.stringify(outfitsRef.current)),
        shoppingList: JSON.parse(JSON.stringify(shoppingListRef.current)),
        saleItems: JSON.parse(JSON.stringify(saleItemsRef.current)),
        monthlyBudget: monthlyBudgetRef.current,
      };

      setChangeLogs((prev) => {
        const nextVersion = prev.length > 0 ? prev[0].versionNumber + 1 : 1;
        const newLog: VersionChangeLog = {
          id: generateUniqueId('log'),
          versionNumber: nextVersion,
          timestamp: new Date().toISOString(),
          actionType,
          entityType,
          entityId,
          entityTitle,
          summary,
          details,
          snapshotData: liveSnapshot,
          author: 'Graeme (User)',
        };
        // To preserve local storage space, keep full snapshotData on latest 35 logs, strip older
        return [newLog, ...prev].map((l, index) => {
          if (index > 35 && l.snapshotData) {
            const { snapshotData, ...rest } = l;
            return rest;
          }
          return l;
        });
      });
    },
    []
  );

  // CREATE SNAPSHOT CHECKPOINT (Available for batch actions, manual snapshots, and periodic auto-rollbacks)
  const createSnapshot = useCallback(
    (name: string, description = '', isAuto = false) => {
      const snapId = generateUniqueId('snap');
      const curItems = itemsRef.current;
      const curOutfits = outfitsRef.current;
      const curShopping = shoppingListRef.current;
      const curSales = saleItemsRef.current;
      const curBudget = monthlyBudgetRef.current;

      const totalVal = curItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
      const nextVersion = changeLogsRef.current.length > 0 ? changeLogsRef.current[0].versionNumber + 1 : 1;

      const defaultName = isAuto
        ? `Auto-Checkpoint (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
        : `Wardrobe Snapshot #${snapshotsRef.current.length + 1}`;

      const defaultDesc = isAuto
        ? `Periodic automated rollback save (${curItems.length} items, ${curOutfits.length} looks, ${curShopping.length} wishlist, ${curSales.length} sales).`
        : `Checkpoint of ${curItems.length} items (£${totalVal} valuation), ${curOutfits.length} looks, ${curShopping.length} wishlist pieces, ${curSales.length} sales listings.`;

      const newSnapshot: WardrobeSnapshot = {
        id: snapId,
        versionNumber: nextVersion,
        name: (name && name.trim()) || defaultName,
        description: description || defaultDesc,
        createdAt: new Date().toISOString(),
        itemCount: curItems.length,
        totalValuation: totalVal,
        outfitCount: curOutfits.length,
        wishlistCount: curShopping.length,
        saleItemCount: curSales.length,
        isAuto,
        data: {
          items: JSON.parse(JSON.stringify(curItems)),
          outfits: JSON.parse(JSON.stringify(curOutfits)),
          shoppingList: JSON.parse(JSON.stringify(curShopping)),
          saleItems: JSON.parse(JSON.stringify(curSales)),
          monthlyBudget: curBudget,
        },
      };

      setSnapshots((prev) => {
        const next = [newSnapshot, ...prev];
        const maxAuto = settings.maxAutoSnapshots || 20;
        let autoCount = 0;
        return next.filter((snap) => {
          if (!snap.isAuto) return true;
          autoCount++;
          return autoCount <= maxAuto;
        });
      });

      if (isAuto) {
        hasChangesForAutoSnapshotRef.current = false;
        const nowIso = new Date().toISOString();
        setLastAutoSnapshotTime(nowIso);
        try {
          localStorage.setItem(`${STORAGE_KEY}_last_auto_snapshot`, nowIso);
        } catch {}
      }

      recordChange(
        'SNAPSHOT_CREATED',
        'snapshot',
        newSnapshot.name,
        isAuto
          ? `Periodic automated rollback save (${newSnapshot.itemCount} items, £${totalVal} value).`
          : `Created wardrobe version snapshot "${newSnapshot.name}" (${newSnapshot.itemCount} items, £${totalVal} total value).`,
        snapId,
        {
          financialImpact: totalVal,
          newValue: newSnapshot,
        }
      );

      return snapId;
    },
    [settings.maxAutoSnapshots, recordChange]
  );

  // Trigger automated snapshot checkpoint
  const triggerAutoSnapshot = useCallback(
    (reason?: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const name = `Auto-Checkpoint (${timeStr})`;
      const desc = reason
        ? `Automatic save: ${reason} (${itemsRef.current.length} items, £${itemsRef.current.reduce((s, i) => s + (i.purchasePrice || 0), 0)} valuation).`
        : `Periodic automated rollback save (${itemsRef.current.length} items, £${itemsRef.current.reduce((s, i) => s + (i.purchasePrice || 0), 0)} valuation).`;
      return createSnapshot(name, desc, true);
    },
    [createSnapshot]
  );

  // Periodic Timer for Automated Rollbacks
  useEffect(() => {
    if (settings.autoSnapshotEnabled === false) return;

    const intervalMinutes = Math.max(1, settings.autoSnapshotIntervalMinutes || 10);
    const intervalMs = intervalMinutes * 60 * 1000;

    const checkInterval = setInterval(() => {
      if (settings.autoSnapshotEnabled === false) return;
      if (!hasChangesForAutoSnapshotRef.current) return;

      const lastSaved = lastAutoSnapshotTime ? new Date(lastAutoSnapshotTime).getTime() : 0;
      const now = Date.now();

      if (now - lastSaved >= intervalMs) {
        triggerAutoSnapshot();
      }
    }, 20000);

    return () => clearInterval(checkInterval);
  }, [settings.autoSnapshotEnabled, settings.autoSnapshotIntervalMinutes, lastAutoSnapshotTime, triggerAutoSnapshot]);

  // Clean up auto snapshots if user wants to tidy up
  const cleanupAutoSnapshots = useCallback((keepCount = 5) => {
    let removed = 0;
    setSnapshots((prev) => {
      const autoSnaps = prev.filter((s) => s.isAuto);
      const manualSnaps = prev.filter((s) => !s.isAuto);
      if (autoSnaps.length <= keepCount) return prev;

      const keptAutoSnaps = autoSnaps.slice(0, keepCount);
      removed = autoSnaps.length - keptAutoSnaps.length;
      return [...manualSnaps, ...keptAutoSnaps];
    });
    return removed;
  }, []);

  // 1. ADD WARDROBE ITEM (With Humidor duplicate prevention & auto-consolidation)
  const addItem = useCallback(
    (itemData: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>, checkDuplicate: boolean = false) => {
      const now = new Date().toISOString();

      // Humidor Auto-Merge: If an instance of this garment already exists and checkDuplicate is requested
      if (checkDuplicate) {
        const existingExact = items.find((it) => isGarmentDuplicate(itemData, it));

        if (existingExact) {
          updateItem(
            existingExact.id,
            {
              ...itemData,
              purchasePrice: itemData.purchasePrice || existingExact.purchasePrice,
              imageUrl: itemData.imageUrl || existingExact.imageUrl,
              category: normalizeCategoryName(itemData.category) as Category,
            },
            false
          );
          return existingExact.id;
        }
      }

      const id = generateUniqueId('item');
      const newItem: WardrobeItem = {
        ...itemData,
        id,
        category: normalizeCategoryName(itemData.category) as Category,
        wearCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      captureUndoState(`Added item "${newItem.brand} ${newItem.name}"`);
      setItems((prev) => [newItem, ...prev]);
      recordChange(
        'ITEM_ADDED',
        'wardrobe_item',
        `${newItem.brand} ${newItem.name}`,
        `Added new ${newItem.category.toLowerCase()} "${newItem.brand} ${newItem.name}" to wardrobe for £${newItem.purchasePrice}.`,
        id,
        {
          financialImpact: newItem.purchasePrice,
          newValue: newItem,
        }
      );
      return id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, captureUndoState, recordChange]
  );

  // 2. UPDATE WARDROBE ITEM (With Humidor-grade duplicate safety; preserves distinct items)
  const updateItem = useCallback(
    (id: string, updates: Partial<WardrobeItem>, consolidateDuplicates: boolean = false) => {
      const targetItem = items.find((i) => i.id === id);
      if (targetItem) {
        captureUndoState(`Updated "${targetItem.brand} ${targetItem.name}"`);
      }
      const now = new Date().toISOString();

      setItems((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (!existing) return prev;
        const normalizedCategory = updates.category
          ? (normalizeCategoryName(updates.category) as Category)
          : existing.category;

        const updatedItem: WardrobeItem = {
          ...existing,
          ...updates,
          category: normalizedCategory,
          updatedAt: now,
        };

        if (!consolidateDuplicates) {
          return prev.map((item) => (item.id === id ? updatedItem : item));
        }

        // Humidor Duplicate Detection: Only merge if explicit consolidation was opted into
        const duplicateSecondaries = prev.filter((item) => {
          if (item.id === id) return false;
          return isGarmentDuplicate(updatedItem, item);
        });

        if (duplicateSecondaries.length === 0) {
          return prev.map((item) => (item.id === id ? updatedItem : item));
        }

        // Consolidate all secondary duplicate copies into the single master updated item!
        const secondaryIds = new Set(duplicateSecondaries.map((s) => s.id));
        const allTags = Array.from(
          new Set([...(updatedItem.tags || []), ...duplicateSecondaries.flatMap((s) => s.tags || [])])
        );
        const totalWears =
          (updatedItem.wearCount || 0) +
          duplicateSecondaries.reduce((acc, s) => acc + (s.wearCount || 0), 0);
        const maxVal = Math.max(
          updatedItem.currentValuation || updatedItem.purchasePrice || 0,
          ...duplicateSecondaries.map((s) => s.currentValuation || s.purchasePrice || 0)
        );
        const fallbackImage =
          updatedItem.imageUrl || duplicateSecondaries.find((s) => s.imageUrl)?.imageUrl || '';
        const fallbackColor =
          updatedItem.color || duplicateSecondaries.find((s) => s.color && s.color !== 'Unspecified')?.color || 'Unspecified';
        const fallbackColorHex =
          updatedItem.colorHex || duplicateSecondaries.find((s) => s.colorHex)?.colorHex;
        const fallbackSize = updatedItem.size || duplicateSecondaries.find((s) => s.size)?.size;
        const fallbackMaterial =
          updatedItem.material || duplicateSecondaries.find((s) => s.material)?.material;
        const fallbackCare =
          updatedItem.careNotes || duplicateSecondaries.find((s) => s.careNotes)?.careNotes;
        const fallbackLocation =
          updatedItem.storageLocation || duplicateSecondaries.find((s) => s.storageLocation)?.storageLocation;
        const fallbackSubcategory =
          updatedItem.subcategory || duplicateSecondaries.find((s) => s.subcategory)?.subcategory;
        const fallbackSeller =
          updatedItem.seller || duplicateSecondaries.find((s) => s.seller)?.seller;

        const notePieces = [
          updatedItem.notes,
          ...duplicateSecondaries.map((s) => s.notes).filter(Boolean),
        ].filter(Boolean) as string[];
        const mergedNotes = Array.from(new Set(notePieces)).join(' | ');

        const masterConsolidatedItem: WardrobeItem = {
          ...updatedItem,
          imageUrl: fallbackImage,
          color: fallbackColor,
          colorHex: fallbackColorHex,
          size: fallbackSize,
          material: fallbackMaterial,
          careNotes: fallbackCare,
          storageLocation: fallbackLocation,
          subcategory: fallbackSubcategory,
          seller: fallbackSeller,
          tags: allTags,
          wearCount: totalWears,
          currentValuation: maxVal,
          notes: mergedNotes || undefined,
          updatedAt: now,
        };

        // Remap any lookbook outfits referencing secondary IDs to point to the master item ID
        setOutfits((outfitPrev) =>
          outfitPrev.map((o) => ({
            ...o,
            itemIds: Array.from(
              new Set(o.itemIds.map((itemRefId) => (secondaryIds.has(itemRefId) ? id : itemRefId)))
            ),
            updatedAt: now,
          }))
        );

        return prev
          .filter((item) => !secondaryIds.has(item.id))
          .map((item) => (item.id === id ? masterConsolidatedItem : item));
      });

      if (targetItem) {
        recordChange(
          'ITEM_UPDATED',
          'wardrobe_item',
          `${updates.brand || targetItem.brand} ${updates.name || targetItem.name}`,
          `Updated details and consolidated duplicates for "${updates.brand || targetItem.brand} ${updates.name || targetItem.name}".`,
          id,
          {
            oldValue: targetItem,
            newValue: { ...targetItem, ...updates },
          }
        );
      }
    },
    [items, captureUndoState, recordChange]
  );

  // 3. DELETE WARDROBE ITEM (No confirmation modal needed, undoable via snapshot/undo stack)
  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const itemToDelete = prev.find((i) => i.id === id);
        if (!itemToDelete) return prev;

        captureUndoState(`Deleted "${itemToDelete.brand} ${itemToDelete.name}"`);

        recordChange(
          'ITEM_DELETED',
          'wardrobe_item',
          `${itemToDelete.brand} ${itemToDelete.name}`,
          `Removed "${itemToDelete.brand} ${itemToDelete.name}" from active wardrobe.`,
          id,
          {
            financialImpact: -itemToDelete.purchasePrice,
            oldValue: itemToDelete,
          }
        );

        return prev.filter((i) => i.id !== id);
      });

      // Clean up outfits referencing deleted item
      setOutfits((prev) =>
        prev.map((outfit) => ({
          ...outfit,
          itemIds: outfit.itemIds.filter((itemId) => itemId !== id),
        }))
      );
    },
    [captureUndoState, recordChange]
  );

  // 3b. DELETE MULTIPLE WARDROBE ITEMS (Bulk action with auto-snapshot & undo support)
  const deleteMultipleItems = useCallback(
    (ids: string[]) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const itemsToDelete = items.filter((i) => idSet.has(i.id));
      if (itemsToDelete.length === 0) return;

      const totalValue = itemsToDelete.reduce((sum, it) => sum + (it.purchasePrice || 0), 0);
      const actionTitle = `Deleted ${itemsToDelete.length} ${itemsToDelete.length === 1 ? 'item' : 'items'}`;

      // 1. Auto-Snapshot for durable history
      createSnapshot(
        `[Auto-Snapshot] Before Deleting ${itemsToDelete.length} items`,
        `Safety checkpoint before removing ${itemsToDelete.length} wardrobe pieces (£${totalValue.toFixed(2)} total value).`
      );

      // 2. Undo stack capture
      captureUndoState(actionTitle);

      // 3. Delete items
      setItems((prev) => prev.filter((i) => !idSet.has(i.id)));

      // 4. Clean up outfits
      setOutfits((prev) =>
        prev.map((outfit) => ({
          ...outfit,
          itemIds: outfit.itemIds.filter((itemId) => !idSet.has(itemId)),
        }))
      );

      // 5. Record change log
      recordChange(
        'ITEM_DELETED',
        'wardrobe_item',
        `${itemsToDelete.length} Garments`,
        `Bulk deleted ${itemsToDelete.length} items from wardrobe (£${totalValue.toFixed(2)} total value).`,
        undefined,
        {
          financialImpact: -totalValue,
        }
      );
    },
    [items, createSnapshot, captureUndoState, recordChange]
  );

  // 3c. BATCH ADD WARDROBE ITEMS (Auto-Snapshot + Undo)
  const batchAddItems = useCallback(
    (
      itemsData: Array<Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>>,
      customTitle?: string
    ) => {
      if (!itemsData || itemsData.length === 0) return [];
      const now = new Date().toISOString();
      const created: WardrobeItem[] = itemsData.map((data) => ({
        ...data,
        id: generateUniqueId('item'),
        wearCount: 0,
        createdAt: now,
        updatedAt: now,
      }));

      const totalVal = created.reduce((sum, it) => sum + (it.purchasePrice || 0), 0);
      const actionTitle = customTitle || `Imported ${created.length} ${created.length === 1 ? 'item' : 'items'}`;

      // 1. Auto-Snapshot
      createSnapshot(
        `[Auto-Snapshot] Before Importing ${created.length} items`,
        `Safety checkpoint before importing ${created.length} wardrobe pieces (£${totalVal.toFixed(2)}).`
      );

      // 2. Undo stack capture
      captureUndoState(actionTitle);

      // 3. Add to items
      setItems((prev) => [...created, ...prev]);

      // 4. Record change
      recordChange(
        'BULK_IMPORT',
        'wardrobe_item',
        `${created.length} Items Imported`,
        `Batch imported ${created.length} garments into wardrobe (£${totalVal.toFixed(2)} total value).`,
        undefined,
        {
          financialImpact: totalVal,
        }
      );

      return created.map((i) => i.id);
    },
    [createSnapshot, captureUndoState, recordChange]
  );

  // 3d. BATCH UPDATE WARDROBE ITEMS (Bulk Category, Season, Condition, Tags, Location, Price)
  const batchUpdateItems = useCallback(
    (
      ids: string[],
      updates: Partial<WardrobeItem> | ((item: WardrobeItem) => Partial<WardrobeItem>),
      customSummary?: string
    ) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const affected = items.filter((i) => idSet.has(i.id));
      if (affected.length === 0) return;

      const actionTitle = customSummary || `Bulk updated ${affected.length} wardrobe items`;
      captureUndoState(actionTitle);

      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => {
          if (!idSet.has(item.id)) return item;
          const patch = typeof updates === 'function' ? updates(item) : updates;
          return {
            ...item,
            ...patch,
            updatedAt: now,
          };
        })
      );

      recordChange(
        'ITEM_UPDATED',
        'wardrobe_item',
        `${affected.length} Garments`,
        actionTitle,
        undefined
      );
    },
    [items, captureUndoState, recordChange]
  );

  // 4. LOG ITEM WEAR
  const logItemWear = useCallback(
    (id: string, customDate?: string) => {
      const targetItem = items.find((i) => i.id === id);
      if (targetItem) {
        captureUndoState(`Logged wear for "${targetItem.brand} ${targetItem.name}"`);
      }
      const now = customDate || new Date().toISOString().split('T')[0];
      setItems((prev) => {
        const item = prev.find((i) => i.id === id);
        if (!item) return prev;
        const newWearCount = item.wearCount + 1;

        recordChange(
          'ITEM_WORN',
          'wardrobe_item',
          `${item.brand} ${item.name}`,
          `Logged wear for "${item.brand} ${item.name}" (Total wears: ${newWearCount}x).`,
          id,
          {
            wearCount: newWearCount,
            oldValue: item.wearCount,
            newValue: newWearCount,
          }
        );

        return prev.map((i) =>
          i.id === id
            ? {
                ...i,
                wearCount: newWearCount,
                lastWornDate: now,
                updatedAt: new Date().toISOString(),
              }
            : i
        );
      });
    },
    [items, captureUndoState, recordChange]
  );

  // 5. TOGGLE ITEM FAVORITE
  const toggleItemFavorite = useCallback((id: string) => {
    const targetItem = items.find((i) => i.id === id);
    if (targetItem) {
      captureUndoState(`${targetItem.isFavorite ? 'Unfavorited' : 'Favorited'} "${targetItem.brand} ${targetItem.name}"`);
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  }, [items, captureUndoState]);

  // 6. ADD LOOKBOOK OUTFIT
  const addOutfit = useCallback(
    (outfitData: Omit<LookbookOutfit, 'id' | 'createdAt' | 'updatedAt' | 'timesWorn'>) => {
      const now = new Date().toISOString();
      const id = generateUniqueId('look');
      const newOutfit: LookbookOutfit = {
        ...outfitData,
        id,
        timesWorn: 0,
        createdAt: now,
        updatedAt: now,
      };

      captureUndoState(`Created look "${newOutfit.title}"`);
      setOutfits((prev) => [newOutfit, ...prev]);
      recordChange(
        'LOOK_CREATED',
        'lookbook_outfit',
        newOutfit.title,
        `Styled and saved new look "${newOutfit.title}" (${newOutfit.occasion}, ${newOutfit.itemIds.length} items).`,
        id,
        {
          newValue: newOutfit,
        }
      );
      return id;
    },
    [captureUndoState, recordChange]
  );

  // 7. UPDATE LOOKBOOK OUTFIT
  const updateOutfit = useCallback(
    (id: string, updates: Partial<LookbookOutfit>) => {
      const targetOutfit = outfits.find((o) => o.id === id);
      if (targetOutfit) {
        captureUndoState(`Updated look "${targetOutfit.title}"`);
      }
      setOutfits((prev) => {
        const existing = prev.find((o) => o.id === id);
        if (!existing) return prev;
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

        recordChange(
          'LOOK_UPDATED',
          'lookbook_outfit',
          updated.title,
          `Updated look formula "${updated.title}".`,
          id,
          {
            oldValue: existing,
            newValue: updated,
          }
        );

        return prev.map((o) => (o.id === id ? updated : o));
      });
    },
    [outfits, captureUndoState, recordChange]
  );

  // 8. DELETE LOOKBOOK OUTFIT
  const deleteOutfit = useCallback(
    (id: string) => {
      const targetOutfit = outfits.find((o) => o.id === id);
      if (targetOutfit) {
        captureUndoState(`Deleted look "${targetOutfit.title}"`);
      }
      setOutfits((prev) => {
        const lookToDelete = prev.find((o) => o.id === id);
        if (!lookToDelete) return prev;

        recordChange(
          'LOOK_DELETED',
          'lookbook_outfit',
          lookToDelete.title,
          `Deleted look "${lookToDelete.title}" from Lookbook.`,
          id,
          {
            oldValue: lookToDelete,
            previousEntity: lookToDelete,
          }
        );

        return prev.filter((o) => o.id !== id);
      });
    },
    [outfits, captureUndoState, recordChange]
  );

  // 9. LOG OUTFIT WEAR (also logs wear for all constituent pieces)
  const logOutfitWear = useCallback(
    (id: string) => {
      const targetOutfit = outfits.find((o) => o.id === id);
      if (targetOutfit) {
        captureUndoState(`Logged wear for look "${targetOutfit.title}"`);
      }
      const now = new Date().toISOString().split('T')[0];
      setOutfits((prev) => {
        const outfit = prev.find((o) => o.id === id);
        if (!outfit) return prev;
        const newTimesWorn = outfit.timesWorn + 1;

        // Log wear for each piece in this outfit
        outfit.itemIds.forEach((itemId) => {
          logItemWear(itemId, now);
        });

        recordChange(
          'ITEM_WORN',
          'lookbook_outfit',
          outfit.title,
          `Wore complete look "${outfit.title}" (Recorded across all ${outfit.itemIds.length} items).`,
          id,
          {
            wearCount: newTimesWorn,
          }
        );

        return prev.map((o) =>
          o.id === id
            ? {
                ...o,
                timesWorn: newTimesWorn,
                lastWornDate: now,
                updatedAt: new Date().toISOString(),
              }
            : o
        );
      });
    },
    [outfits, captureUndoState, logItemWear, recordChange]
  );

  // 10. TOGGLE OUTFIT FAVORITE
  const toggleOutfitFavorite = useCallback((id: string) => {
    const targetOutfit = outfits.find((o) => o.id === id);
    if (targetOutfit) {
      captureUndoState(`${targetOutfit.isFavorite ? 'Unfavorited' : 'Favorited'} look "${targetOutfit.title}"`);
    }
    setOutfits((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isFavorite: !o.isFavorite } : o))
    );
  }, [outfits, captureUndoState]);

  // 11. ADD SHOPPING ITEM
  const addShoppingItem = useCallback(
    (itemData: Omit<ShoppingItem, 'id' | 'addedDate'>) => {
      const id = generateUniqueId('shop');
      const rawShopItem: ShoppingItem = {
        ...itemData,
        category: normalizeCategoryName(itemData.category) as Category,
        id,
        addedDate: new Date().toISOString().split('T')[0],
      };
      const newShopItem = normalizeShoppingItem(rawShopItem);

      captureUndoState(`Added wishlist item "${newShopItem.brand} ${newShopItem.name}"`);
      setShoppingList((prev) => [newShopItem, ...prev]);
      recordChange(
        'WISHLIST_ADDED',
        'shopping_item',
        `${newShopItem.brand} ${newShopItem.name}`,
        `Added "${newShopItem.brand} ${newShopItem.name}" (£${newShopItem.estimatedPrice}) to ${newShopItem.status} list [Priority: ${newShopItem.priority}].`,
        id,
        {
          financialImpact: newShopItem.estimatedPrice,
          newValue: newShopItem,
        }
      );
      return id;
    },
    [captureUndoState, recordChange]
  );

  // 12. UPDATE SHOPPING ITEM
  const updateShoppingItem = useCallback(
    (id: string, updates: Partial<ShoppingItem>) => {
      const targetShop = shoppingList.find((s) => s.id === id);
      if (targetShop) {
        captureUndoState(`Updated "${targetShop.brand} ${targetShop.name}"`);
      }
      setShoppingList((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (!existing) return prev;
        const normalizedUpdates = {
          ...updates,
          ...(updates.category ? { category: normalizeCategoryName(updates.category) as Category } : {}),
        };
        const merged = { ...existing, ...normalizedUpdates };
        const updated = updates.orderStatus ? normalizeShoppingItem(merged) : merged;

        recordChange(
          'WISHLIST_UPDATED',
          'shopping_item',
          `${updated.brand} ${updated.name}`,
          `Updated shopping item "${updated.brand} ${updated.name}" (${updated.status}, £${updated.estimatedPrice}).`,
          id,
          {
            oldValue: existing,
            newValue: updated,
          }
        );

        return prev.map((s) => (s.id === id ? updated : s));
      });
    },
    [shoppingList, captureUndoState, recordChange]
  );

  // 13. DELETE SHOPPING ITEM
  const deleteShoppingItem = useCallback(
    (id: string) => {
      setShoppingList((prev) => {
        const toDelete = prev.find((s) => s.id === id);
        if (!toDelete) return prev;

        captureUndoState(`Deleted "${toDelete.brand} ${toDelete.name}" from wishlist`);

        recordChange(
          'WISHLIST_DELETED',
          'shopping_item',
          `${toDelete.brand} ${toDelete.name}`,
          `Removed "${toDelete.brand} ${toDelete.name}" from shopping list.`,
          id,
          {
            financialImpact: -toDelete.estimatedPrice,
            oldValue: toDelete,
            previousEntity: toDelete,
          }
        );

        return prev.filter((s) => s.id !== id);
      });
    },
    [captureUndoState, recordChange]
  );

  // 13b. DELETE MULTIPLE SHOPPING ITEMS (Bulk wishlist removal with auto-snapshot & undo)
  const deleteMultipleShoppingItems = useCallback(
    (ids: string[]) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const itemsToDelete = shoppingList.filter((s) => idSet.has(s.id));
      if (itemsToDelete.length === 0) return;

      const totalVal = itemsToDelete.reduce((sum, it) => sum + (it.estimatedPrice || 0), 0);
      const actionTitle = `Deleted ${itemsToDelete.length} wishlist ${itemsToDelete.length === 1 ? 'item' : 'items'}`;

      // 1. Auto-Snapshot
      createSnapshot(
        `[Auto-Snapshot] Before Deleting ${itemsToDelete.length} wishlist items`,
        `Safety checkpoint before removing ${itemsToDelete.length} wishlist pieces (£${totalVal.toFixed(2)} total value).`
      );

      // 2. Undo capture
      captureUndoState(actionTitle);

      // 3. Delete
      setShoppingList((prev) => prev.filter((s) => !idSet.has(s.id)));

      // 4. Record change
      recordChange(
        'WISHLIST_DELETED',
        'shopping_item',
        `${itemsToDelete.length} Wishlist Items`,
        `Bulk removed ${itemsToDelete.length} items from shopping list (£${totalVal.toFixed(2)} total value).`,
        undefined,
        {
          financialImpact: -totalVal,
          oldValue: itemsToDelete,
          previousEntity: itemsToDelete,
          deletedEntities: itemsToDelete,
        }
      );
    },
    [shoppingList, createSnapshot, captureUndoState, recordChange]
  );

  // 13c. BATCH ADD SHOPPING ITEMS (Auto-Snapshot + Undo)
  const batchAddShoppingItems = useCallback(
    (itemsData: Array<Omit<ShoppingItem, 'id' | 'addedDate'>>, customTitle?: string) => {
      if (!itemsData || itemsData.length === 0) return [];
      const today = new Date().toISOString().split('T')[0];
      const created: ShoppingItem[] = itemsData.map((data) => {
        const raw: ShoppingItem = {
          ...data,
          id: generateUniqueId('shop'),
          addedDate: today,
        };
        return normalizeShoppingItem(raw);
      });

      const totalVal = created.reduce((sum, it) => sum + (it.estimatedPrice || 0), 0);
      const actionTitle = customTitle || `Imported ${created.length} wishlist ${created.length === 1 ? 'item' : 'items'}`;

      // 1. Auto-Snapshot
      createSnapshot(
        `[Auto-Snapshot] Before Importing ${created.length} wishlist items`,
        `Safety checkpoint before importing ${created.length} wishlist pieces.`
      );

      // 2. Undo capture
      captureUndoState(actionTitle);

      // 3. Append
      setShoppingList((prev) => [...created, ...prev]);

      // 4. Record change
      recordChange(
        'BULK_IMPORT',
        'shopping_item',
        `${created.length} Items Added to Wishlist`,
        `Batch imported ${created.length} pieces into wishlist (£${totalVal.toFixed(2)} total value).`
      );

      return created.map((i) => i.id);
    },
    [createSnapshot, captureUndoState, recordChange]
  );

  // 14. PURCHASE SHOPPING ITEM -> Converts directly into a Wardrobe Item!
  const purchaseShoppingItem = useCallback(
    (id: string, actualPricePaid?: number, condition: Condition = 'Pristine / New') => {
      const shoppingItem = shoppingList.find((s) => s.id === id);
      if (!shoppingItem) return '';

      const finalPrice = actualPricePaid !== undefined ? actualPricePaid : shoppingItem.estimatedPrice;
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Create new wardrobe item
      const wardrobeItemId = generateUniqueId('item');
      const newWardrobeItem: WardrobeItem = {
        id: wardrobeItemId,
        name: shoppingItem.name,
        brand: shoppingItem.brand,
        category: shoppingItem.category,
        subcategory: shoppingItem.tags?.[0] || 'Staple',
        color: 'Neutral',
        season: [shoppingItem.season],
        purchaseDate: today,
        purchasePrice: finalPrice,
        currentValuation: finalPrice,
        wearCount: 0,
        condition,
        tags: shoppingItem.tags || ['New Acquisition'],
        imageUrl: shoppingItem.imageUrl,
        isFavorite: false,
        isArchived: false,
        notes: `Purchased via shopping list on ${today}. Gap addressed: ${shoppingItem.reasonOrGap}`,
        createdAt: now,
        updatedAt: now,
      };

      // Add to wardrobe
      setItems((prev) => [newWardrobeItem, ...prev]);

      // Remove from shopping list
      setShoppingList((prev) => prev.filter((s) => s.id !== id));

      recordChange(
        'WISHLIST_PURCHASED',
        'shopping_item',
        `${shoppingItem.brand} ${shoppingItem.name}`,
        `Purchased "${shoppingItem.brand} ${shoppingItem.name}" for £${finalPrice} and converted into active wardrobe item.`,
        id,
        {
          financialImpact: finalPrice,
          newValue: newWardrobeItem,
        }
      );

      return wardrobeItemId;
    },
    [shoppingList, recordChange]
  );

  // 15. RESALE & SELLING ACTIONS
  const addSaleItem = useCallback(
    (saleData: Omit<SaleItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const id = generateUniqueId('sale');
      const newSaleItem: SaleItem = {
        ...saleData,
        category: normalizeCategoryName(saleData.category) as Category,
        id,
        createdAt: now,
        updatedAt: now,
      };

      captureUndoState(`Added sale listing "${newSaleItem.brand} ${newSaleItem.name}"`);
      setSaleItems((prev) => [newSaleItem, ...prev]);
      recordChange(
        'SALE_LISTED',
        'sale_item',
        `${newSaleItem.brand} ${newSaleItem.name}`,
        `Listed "${newSaleItem.brand} ${newSaleItem.name}" for sale on ${newSaleItem.platform} at £${newSaleItem.listingPrice}.`,
        id,
        {
          financialImpact: newSaleItem.listingPrice,
          newValue: newSaleItem,
        }
      );
      return id;
    },
    [captureUndoState, recordChange]
  );

  const updateSaleItem = useCallback(
    (id: string, updates: Partial<SaleItem>) => {
      const targetSale = saleItems.find((s) => s.id === id);
      if (targetSale) {
        captureUndoState(`Updated sale "${targetSale.brand} ${targetSale.name}"`);
      }
      setSaleItems((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (!existing) return prev;
        const normalizedCategory = updates.category
          ? (normalizeCategoryName(updates.category) as Category)
          : existing.category;
        const updated = {
          ...existing,
          ...updates,
          category: normalizedCategory,
          updatedAt: new Date().toISOString(),
        };

        recordChange(
          'SALE_UPDATED',
          'sale_item',
          `${updated.brand} ${updated.name}`,
          `Updated sale listing details for "${updated.brand} ${updated.name}".`,
          id,
          {
            newValue: updated,
          }
        );

        return prev.map((s) => (s.id === id ? updated : s));
      });
    },
    [saleItems, captureUndoState, recordChange]
  );

  const deleteSaleItem = useCallback(
    (id: string) => {
      const existing = saleItems.find((s) => s.id === id);
      if (!existing) return;

      captureUndoState(`Deleted listing "${existing.brand} ${existing.name}"`);
      setSaleItems((prev) => prev.filter((s) => s.id !== id));

      recordChange(
        'SALE_DELETED',
        'sale_item',
        `${existing.brand} ${existing.name}`,
        `Deleted sale listing for "${existing.brand} ${existing.name}".`,
        id,
        {
          financialImpact: -existing.listingPrice,
          oldValue: existing,
          previousEntity: existing,
        }
      );
    },
    [saleItems, captureUndoState, recordChange]
  );

  const deleteMultipleSaleItems = useCallback(
    (ids: string[]) => {
      if (!ids || ids.length === 0) return;
      const itemsToDelete = saleItems.filter((s) => ids.includes(s.id));
      if (itemsToDelete.length === 0) return;

      captureUndoState(`Bulk deleted ${itemsToDelete.length} sale listings`);
      setSaleItems((prev) => prev.filter((s) => !ids.includes(s.id)));

      recordChange(
        'SALE_DELETED',
        'sale_item',
        `${itemsToDelete.length} Sale Listings`,
        `Bulk deleted ${itemsToDelete.length} listings from the Sales manager.`,
        undefined,
        {
          oldValue: itemsToDelete,
          previousEntity: itemsToDelete,
          deletedEntities: itemsToDelete,
        }
      );
    },
    [saleItems, captureUndoState, recordChange]
  );

  const batchAddSaleItems = useCallback(
    (itemsData: Array<Omit<SaleItem, 'id' | 'createdAt' | 'updatedAt'>>, customTitle?: string) => {
      if (!itemsData || itemsData.length === 0) return [];
      const now = new Date().toISOString();
      const created: SaleItem[] = itemsData.map((data) => ({
        ...data,
        id: generateUniqueId('sale'),
        createdAt: now,
        updatedAt: now,
      }));

      captureUndoState(customTitle || `Batch added ${created.length} sale listings`);
      setSaleItems((prev) => [...created, ...prev]);
      recordChange(
        'BULK_IMPORT',
        'sale_item',
        `${created.length} Sale Listings Added`,
        `Batch imported ${created.length} listings into Sales manager.`
      );
      return created.map((s) => s.id);
    },
    [captureUndoState, recordChange]
  );

  const markItemAsSold = useCallback(
    (
      id: string,
      soldData: {
        soldPrice: number;
        soldDate?: string;
        buyerUsername?: string;
        orderNumber?: string;
        courier?: 'Evri' | 'Royal Mail' | 'DPD' | 'InPost' | 'Yodel' | 'Other';
        trackingNumber?: string;
        platformFees?: number;
        shippingCostPaidBySeller?: number;
        archiveFromWardrobe?: boolean;
      }
    ) => {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      let affectedItemTitle = '';
      let profitLoss = 0;

      setSaleItems((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (!existing) return prev;

        affectedItemTitle = `${existing.brand} ${existing.name}`;
        const soldPrice = soldData.soldPrice;
        const fees = soldData.platformFees || 0;
        const shipping = soldData.shippingCostPaidBySeller || 0;
        profitLoss = soldPrice - existing.originalPricePaid - fees - shipping;

        const updated: SaleItem = {
          ...existing,
          status: 'Sold',
          shippingStatus: soldData.trackingNumber ? 'Shipped' : 'To Pack',
          soldPrice,
          soldDate: soldData.soldDate || today,
          buyerUsername: soldData.buyerUsername,
          orderNumber: soldData.orderNumber,
          courier: soldData.courier,
          trackingNumber: soldData.trackingNumber,
          platformFees: fees,
          shippingCostPaidBySeller: shipping,
          updatedAt: now,
        };

        // If linked to a wardrobe item, optionally archive it
        if (existing.sourceWardrobeItemId && soldData.archiveFromWardrobe) {
          setItems((wPrev) =>
            wPrev.map((w) =>
              w.id === existing.sourceWardrobeItemId
                ? {
                    ...w,
                    isArchived: true,
                    notes: `${w.notes ? w.notes + ' | ' : ''}Sold on ${existing.platform} for £${soldPrice} on ${today}.`,
                    updatedAt: now,
                  }
                : w
            )
          );
        }

        return prev.map((s) => (s.id === id ? updated : s));
      });

      recordChange(
        'SALE_SOLD',
        'sale_item',
        affectedItemTitle,
        `Marked "${affectedItemTitle}" as SOLD for £${soldData.soldPrice} (${profitLoss >= 0 ? '+' : ''}£${profitLoss.toFixed(2)} net ${profitLoss >= 0 ? 'profit' : 'loss'}).`,
        id,
        {
          financialImpact: soldData.soldPrice,
        }
      );
    },
    [recordChange]
  );

  const listWardrobeItemForSale = useCallback(
    (
      wardrobeItem: WardrobeItem,
      listingData: {
        listingPrice: number;
        platform: SellingPlatform;
        condition?: Condition;
        description?: string;
        tags?: string[];
        notes?: string;
      }
    ) => {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const saleId = generateUniqueId('sale');

      const newSaleItem: SaleItem = {
        id: saleId,
        name: wardrobeItem.name,
        brand: wardrobeItem.brand,
        category: wardrobeItem.category,
        size: wardrobeItem.size,
        color: wardrobeItem.color,
        condition: listingData.condition || wardrobeItem.condition,
        originalPricePaid: wardrobeItem.purchasePrice,
        listingPrice: listingData.listingPrice,
        platform: listingData.platform,
        status: 'Listed',
        shippingStatus: 'Not Required',
        sourceWardrobeItemId: wardrobeItem.id,
        imageUrl: wardrobeItem.imageUrl,
        description:
          listingData.description ||
          `Authentic ${wardrobeItem.brand} ${wardrobeItem.name}. Size ${wardrobeItem.size || 'N/A'}. Condition: ${listingData.condition || wardrobeItem.condition}. Worn ${wardrobeItem.wearCount || 0} times.`,
        tags: listingData.tags || [...(wardrobeItem.tags || []), 'Wardrobe Sale'],
        listedDate: today,
        notes: listingData.notes || 'Listed from wardrobe inventory.',
        platformFees: 0,
        shippingCostPaidBySeller: 0,
        createdAt: now,
        updatedAt: now,
      };

      setSaleItems((prev) => [newSaleItem, ...prev]);

      recordChange(
        'SALE_LISTED',
        'sale_item',
        `${newSaleItem.brand} ${newSaleItem.name}`,
        `Listed wardrobe piece "${newSaleItem.brand} ${newSaleItem.name}" for sale on ${listingData.platform} at £${listingData.listingPrice}.`,
        saleId,
        {
          financialImpact: listingData.listingPrice,
          newValue: newSaleItem,
        }
      );

      return saleId;
    },
    [recordChange]
  );

  const batchUpdateSaleItemsStatus = useCallback(
    (ids: string[], newStatus: SellingStatus) => {
      if (!ids || ids.length === 0) return;
      const now = new Date().toISOString();
      setSaleItems((prev) =>
        prev.map((s) => (ids.includes(s.id) ? { ...s, status: newStatus, updatedAt: now } : s))
      );
      recordChange(
        'SALE_UPDATED',
        'sale_item',
        `${ids.length} Sale Items`,
        `Updated status to "${newStatus}" for ${ids.length} sale listings.`,
        undefined
      );
    },
    [recordChange]
  );

  // 16. CROSS-COLLECTION MOBILITY & MOVE FUNCTIONS

  // Move a shopping/wishlist item to Sales (Resale listing)
  const moveShoppingItemToSales = useCallback(
    (
      shoppingItemId: string,
      listingPrice?: number,
      platform: SellingPlatform = 'Vinted',
      removeFromShopping: boolean = true
    ) => {
      const shopItem = shoppingList.find((s) => s.id === shoppingItemId);
      if (!shopItem) return '';

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const saleId = generateUniqueId('sale');
      const price = listingPrice !== undefined ? listingPrice : (shopItem.actualPricePaid || shopItem.estimatedPrice || 0);

      const newSaleItem: SaleItem = {
        id: saleId,
        name: shopItem.name,
        brand: shopItem.brand,
        category: shopItem.category,
        size: shopItem.size,
        color: shopItem.color || 'Neutral',
        condition: 'Pristine / New',
        originalPricePaid: shopItem.actualPricePaid || shopItem.estimatedPrice || 0,
        listingPrice: price,
        platform: platform,
        status: 'Listed',
        shippingStatus: 'Not Required',
        imageUrl: shopItem.imageUrl,
        description: `Authentic ${shopItem.brand} ${shopItem.name}. Size: ${shopItem.size || 'N/A'}. Color: ${shopItem.color || 'N/A'}.`,
        tags: [...(shopItem.tags || []), 'sale', 'resale'],
        listedDate: today,
        notes: `Moved to Resale from Shopping List on ${today}. Gap notes: ${shopItem.reasonOrGap || 'N/A'}`,
        platformFees: 0,
        shippingCostPaidBySeller: 0,
        createdAt: now,
        updatedAt: now,
      };

      captureUndoState(`Moved "${shopItem.brand} ${shopItem.name}" from Wishlist to Resale`);
      setSaleItems((prev) => [newSaleItem, ...prev]);

      if (removeFromShopping) {
        setShoppingList((prev) => prev.filter((s) => s.id !== shoppingItemId));
      }

      recordChange(
        'SALE_LISTED',
        'sale_item',
        `${newSaleItem.brand} ${newSaleItem.name}`,
        `Moved "${newSaleItem.brand} ${newSaleItem.name}" from Shopping/Wishlist to Sales listing (£${price}).`,
        saleId,
        {
          financialImpact: price,
          newValue: newSaleItem,
        }
      );

      return saleId;
    },
    [shoppingList, captureUndoState, recordChange]
  );

  // Move shopping item to Wardrobe (Purchased / Acquired)
  const moveShoppingItemToWardrobe = useCallback(
    (shoppingItemId: string, actualPricePaid?: number, condition: Condition = 'Pristine / New') => {
      return purchaseShoppingItem(shoppingItemId, actualPricePaid, condition);
    },
    [purchaseShoppingItem]
  );

  // Move a wardrobe item to Sales
  const moveWardrobeItemToSales = useCallback(
    (
      wardrobeItemId: string,
      listingPrice?: number,
      platform: SellingPlatform = 'Vinted',
      removeFromWardrobe: boolean = false
    ) => {
      const item = items.find((i) => i.id === wardrobeItemId);
      if (!item) return '';

      const price = listingPrice !== undefined ? listingPrice : (item.currentValuation || item.purchasePrice || 0);
      const saleId = listWardrobeItemForSale(item, {
        listingPrice: price,
        platform,
        condition: item.condition,
        tags: [...(item.tags || []), 'sale', 'resale'],
        notes: `Listed directly from active wardrobe.`,
      });

      if (removeFromWardrobe) {
        captureUndoState(`Moved "${item.brand} ${item.name}" from Wardrobe to Sales`);
        setItems((prev) => prev.filter((i) => i.id !== wardrobeItemId));
        setOutfits((prev) =>
          prev.map((outfit) => ({
            ...outfit,
            itemIds: outfit.itemIds.filter((id) => id !== wardrobeItemId),
          }))
        );
      }

      return saleId;
    },
    [items, listWardrobeItemForSale, captureUndoState]
  );

  // Move a wardrobe item to Shopping / Wishlist
  const moveWardrobeItemToShopping = useCallback(
    (wardrobeItemId: string, removeFromWardrobe: boolean = true) => {
      const item = items.find((i) => i.id === wardrobeItemId);
      if (!item) return '';

      const today = new Date().toISOString().split('T')[0];
      const shopId = generateUniqueId('shop');
      const newShopItem: ShoppingItem = {
        id: shopId,
        name: item.name,
        brand: item.brand,
        category: item.category,
        estimatedPrice: item.purchasePrice,
        actualPricePaid: item.purchasePrice,
        priority: 'Medium',
        status: 'Purchased',
        season: item.season[0] || 'All-Season',
        matchingWardrobeItemIds: [],
        imageUrl: item.imageUrl,
        reasonOrGap: `Moved from wardrobe: ${item.notes || 'Wardrobe piece'}`,
        tags: item.tags || [],
        addedDate: today,
        purchasedDate: item.purchaseDate || today,
        size: item.size,
        color: item.color,
        material: item.material,
      };

      captureUndoState(`Moved "${item.brand} ${item.name}" from Wardrobe to Shopping`);
      setShoppingList((prev) => [newShopItem, ...prev]);

      if (removeFromWardrobe) {
        setItems((prev) => prev.filter((i) => i.id !== wardrobeItemId));
        setOutfits((prev) =>
          prev.map((outfit) => ({
            ...outfit,
            itemIds: outfit.itemIds.filter((id) => id !== wardrobeItemId),
          }))
        );
      }

      recordChange(
        'WISHLIST_ADDED',
        'shopping_item',
        `${newShopItem.brand} ${newShopItem.name}`,
        `Moved "${newShopItem.brand} ${newShopItem.name}" from Wardrobe to Shopping list.`,
        shopId
      );

      return shopId;
    },
    [items, captureUndoState, recordChange]
  );

  // Move a sale item back to Wardrobe (Unlist & Keep)
  const moveSaleItemToWardrobe = useCallback(
    (saleItemId: string, removeFromSales: boolean = true) => {
      const sale = saleItems.find((s) => s.id === saleItemId);
      if (!sale) return '';

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const wardrobeId = generateUniqueId('item');

      const newWardrobeItem: WardrobeItem = {
        id: wardrobeId,
        name: sale.name,
        brand: sale.brand,
        category: sale.category,
        subcategory: sale.tags?.[0] || 'Staple',
        color: sale.color || 'Neutral',
        season: ['All-Season'],
        purchaseDate: today,
        purchasePrice: sale.originalPricePaid || sale.listingPrice || 0,
        currentValuation: sale.listingPrice || sale.originalPricePaid || 0,
        wearCount: 0,
        condition: sale.condition || 'Pristine / New',
        tags: (sale.tags || []).filter((t) => t.toLowerCase() !== 'sale' && t.toLowerCase() !== 'resale'),
        imageUrl: sale.imageUrl,
        isFavorite: false,
        isArchived: false,
        notes: `Unlisted & moved back to active wardrobe on ${today}.`,
        size: sale.size,
        createdAt: now,
        updatedAt: now,
      };

      captureUndoState(`Moved "${sale.brand} ${sale.name}" from Sales to Wardrobe`);
      setItems((prev) => [newWardrobeItem, ...prev]);

      if (removeFromSales) {
        setSaleItems((prev) => prev.filter((s) => s.id !== saleItemId));
      }

      recordChange(
        'ITEM_ADDED',
        'wardrobe_item',
        `${newWardrobeItem.brand} ${newWardrobeItem.name}`,
        `Moved "${sale.brand} ${sale.name}" from Sales listings back to Wardrobe.`,
        wardrobeId
      );

      return wardrobeId;
    },
    [saleItems, captureUndoState, recordChange]
  );

  // Move a sale item to Shopping / Wishlist
  const moveSaleItemToShopping = useCallback(
    (saleItemId: string, removeFromSales: boolean = true) => {
      const sale = saleItems.find((s) => s.id === saleItemId);
      if (!sale) return '';

      const today = new Date().toISOString().split('T')[0];
      const shopId = generateUniqueId('shop');

      const newShopItem: ShoppingItem = {
        id: shopId,
        name: sale.name,
        brand: sale.brand,
        category: sale.category,
        estimatedPrice: sale.listingPrice || sale.originalPricePaid || 0,
        actualPricePaid: sale.originalPricePaid,
        priority: 'Medium',
        status: 'Purchased',
        season: 'All-Season',
        matchingWardrobeItemIds: [],
        imageUrl: sale.imageUrl,
        reasonOrGap: `Moved from Sales listing: ${sale.description || ''}`,
        tags: sale.tags || [],
        addedDate: today,
        purchasedDate: today,
        size: sale.size,
        color: sale.color,
      };

      captureUndoState(`Moved "${sale.brand} ${sale.name}" from Sales to Shopping`);
      setShoppingList((prev) => [newShopItem, ...prev]);

      if (removeFromSales) {
        setSaleItems((prev) => prev.filter((s) => s.id !== saleItemId));
      }

      recordChange(
        'WISHLIST_ADDED',
        'shopping_item',
        `${newShopItem.brand} ${newShopItem.name}`,
        `Moved "${sale.brand} ${sale.name}" from Sales to Shopping list.`,
        shopId
      );

      return shopId;
    },
    [saleItems, captureUndoState, recordChange]
  );

  // Bulk Movers
  const moveMultipleShoppingItems = useCallback(
    (ids: string[], target: 'wardrobe' | 'selling') => {
      if (!ids || ids.length === 0) return;
      ids.forEach((id) => {
        if (target === 'selling') {
          moveShoppingItemToSales(id);
        } else {
          moveShoppingItemToWardrobe(id);
        }
      });
    },
    [moveShoppingItemToSales, moveShoppingItemToWardrobe]
  );

  const moveMultipleWardrobeItems = useCallback(
    (ids: string[], target: 'shopping' | 'selling', removeFromWardrobe: boolean = false) => {
      if (!ids || ids.length === 0) return;
      ids.forEach((id) => {
        if (target === 'selling') {
          moveWardrobeItemToSales(id, undefined, 'Vinted', removeFromWardrobe);
        } else {
          moveWardrobeItemToShopping(id, removeFromWardrobe);
        }
      });
    },
    [moveWardrobeItemToSales, moveWardrobeItemToShopping]
  );

  const moveMultipleSaleItems = useCallback(
    (ids: string[], target: 'wardrobe' | 'shopping', removeFromSales: boolean = true) => {
      if (!ids || ids.length === 0) return;
      ids.forEach((id) => {
        if (target === 'wardrobe') {
          moveSaleItemToWardrobe(id, removeFromSales);
        } else {
          moveSaleItemToShopping(id, removeFromSales);
        }
      });
    },
    [moveSaleItemToWardrobe, moveSaleItemToShopping]
  );

  // 17. MERGE DUPLICATES ACTIONS (HUMIDOR-GRADE MASTER CONSOLIDATION)
  const mergeWardrobeItems = useCallback(
    (
      primaryId: string,
      secondaryIds: string[],
      customMerged?: Partial<WardrobeItem>
    ) => {
      if (!primaryId) return;
      captureUndoState(`Merged duplicate wardrobe items into master record`);

      const now = new Date().toISOString();
      const cleanSecIds = (secondaryIds || []).filter((id) => id !== primaryId);
      const secIdSet = new Set(cleanSecIds);

      setItems((prev) => {
        const primary = prev.find((i) => i.id === primaryId);
        if (!primary) return prev;

        // Find all secondary duplicate items (by id or if there's any identical clone or garment match)
        const secondaries = prev.filter(
          (i) =>
            (secIdSet.has(i.id) || (i.id === primaryId && i !== primary) || isGarmentDuplicate(primary, i)) &&
            i !== primary
        );

        const allTags = Array.from(
          new Set([
            ...(primary.tags || []),
            ...secondaries.flatMap((s) => s.tags || []),
            ...(customMerged?.tags || []),
          ])
        );

        const combinedWearCount =
          (primary.wearCount || 0) +
          secondaries.reduce((acc, s) => acc + (s.wearCount || 0), 0);

        const maxValuation = Math.max(
          primary.currentValuation || primary.purchasePrice || 0,
          ...secondaries.map((s) => s.currentValuation || s.purchasePrice || 0)
        );

        // Smart parameter fallbacks from secondaries if primary lacks them
        const fallbackImage = primary.imageUrl || secondaries.find((s) => s.imageUrl)?.imageUrl || '';
        const fallbackColor = primary.color || secondaries.find((s) => s.color)?.color || 'Unspecified';
        const fallbackColorHex = primary.colorHex || secondaries.find((s) => s.colorHex)?.colorHex;
        const fallbackSize = primary.size || secondaries.find((s) => s.size)?.size;
        const fallbackMaterial = primary.material || secondaries.find((s) => s.material)?.material;
        const fallbackCare = primary.careNotes || secondaries.find((s) => s.careNotes)?.careNotes;
        const fallbackLocation = primary.storageLocation || secondaries.find((s) => s.storageLocation)?.storageLocation;
        const fallbackSubcategory = primary.subcategory || secondaries.find((s) => s.subcategory)?.subcategory;
        const fallbackSeller = primary.seller || secondaries.find((s) => s.seller)?.seller;

        // Deduplicate and combine notes
        const notePieces = [
          primary.notes,
          ...secondaries.map((s) => s.notes).filter(Boolean),
        ]
          .filter(Boolean) as string[];
        const uniqueNotes = Array.from(new Set(notePieces)).join(' | ');

        const mergedItem: WardrobeItem = {
          ...primary,
          imageUrl: customMerged?.imageUrl || fallbackImage,
          color: customMerged?.color || fallbackColor,
          colorHex: customMerged?.colorHex || fallbackColorHex,
          size: customMerged?.size !== undefined ? customMerged.size : fallbackSize,
          material: customMerged?.material !== undefined ? customMerged.material : fallbackMaterial,
          careNotes: customMerged?.careNotes !== undefined ? customMerged.careNotes : fallbackCare,
          storageLocation: customMerged?.storageLocation !== undefined ? customMerged.storageLocation : fallbackLocation,
          subcategory: customMerged?.subcategory !== undefined ? customMerged.subcategory : fallbackSubcategory,
          seller: customMerged?.seller !== undefined ? customMerged.seller : fallbackSeller,
          ...customMerged,
          tags: customMerged?.tags || allTags,
          wearCount: customMerged?.wearCount !== undefined ? customMerged.wearCount : combinedWearCount,
          currentValuation: customMerged?.currentValuation !== undefined ? customMerged.currentValuation : maxValuation,
          notes: customMerged?.notes !== undefined ? customMerged.notes : uniqueNotes || undefined,
          updatedAt: now,
        };

        const allSecIdSet = new Set([...Array.from(secIdSet), ...secondaries.map((s) => s.id)]);
        allSecIdSet.delete(primaryId);

        // Filter out ALL secondary instances AND ensure only ONE master instance exists
        const remaining = prev.filter((i) => !allSecIdSet.has(i.id) && i !== primary && i.id !== primaryId);
        return [mergedItem, ...remaining];
      });

      // Update Lookbook outfits referencing secondaries
      setOutfits((prev) =>
        prev.map((outfit) => {
          const updatedItemIds = outfit.itemIds.map((id) =>
            secIdSet.has(id) ? primaryId : id
          );
          return {
            ...outfit,
            itemIds: Array.from(new Set(updatedItemIds)),
            updatedAt: now,
          };
        })
      );

      recordChange(
        'ITEM_UPDATED',
        'wardrobe_item',
        `Merged Duplicate Items`,
        `Consolidated duplicate items into 1 unified master record.`,
        primaryId
      );
    },
    [captureUndoState, recordChange]
  );

  const mergeShoppingItems = useCallback(
    (
      primaryId: string,
      secondaryIds: string[],
      customMerged?: Partial<ShoppingItem>
    ) => {
      if (!primaryId) return;
      captureUndoState(`Merged duplicate shopping items`);
      const cleanSecIds = (secondaryIds || []).filter((id) => id !== primaryId);
      const secIdSet = new Set(cleanSecIds);

      setShoppingList((prev) => {
        const primary = prev.find((i) => i.id === primaryId);
        if (!primary) return prev;

        const secondaries = prev.filter(
          (i) => (secIdSet.has(i.id) || (i.id === primaryId && i !== primary)) && i !== primary
        );
        const allTags = Array.from(
          new Set([
            ...(primary.tags || []),
            ...secondaries.flatMap((s) => s.tags || []),
            ...(customMerged?.tags || []),
          ])
        );
        const allMatching = Array.from(
          new Set([
            ...(primary.matchingWardrobeItemIds || []),
            ...secondaries.flatMap((s) => s.matchingWardrobeItemIds || []),
          ])
        );

        const fallbackImage = primary.imageUrl || secondaries.find((s) => s.imageUrl)?.imageUrl || '';
        const fallbackColor = primary.color || secondaries.find((s) => s.color)?.color;
        const fallbackSize = primary.size || secondaries.find((s) => s.size)?.size;
        const fallbackMaterial = primary.material || secondaries.find((s) => s.material)?.material;
        const fallbackSeller = primary.seller || secondaries.find((s) => s.seller)?.seller;
        const fallbackRetailer = primary.retailerName || secondaries.find((s) => s.retailerName)?.retailerName;

        const notePieces = [
          primary.reasonOrGap,
          ...secondaries.map((s) => s.reasonOrGap).filter(Boolean),
        ].filter(Boolean) as string[];
        const mergedReason = Array.from(new Set(notePieces)).join(' | ');

        const mergedItem: ShoppingItem = {
          ...primary,
          imageUrl: customMerged?.imageUrl || fallbackImage,
          color: customMerged?.color || fallbackColor,
          size: customMerged?.size !== undefined ? customMerged.size : fallbackSize,
          material: customMerged?.material !== undefined ? customMerged.material : fallbackMaterial,
          seller: customMerged?.seller !== undefined ? customMerged.seller : fallbackSeller,
          retailerName: customMerged?.retailerName !== undefined ? customMerged.retailerName : fallbackRetailer,
          ...customMerged,
          tags: customMerged?.tags || allTags,
          matchingWardrobeItemIds: customMerged?.matchingWardrobeItemIds || allMatching,
          reasonOrGap: customMerged?.reasonOrGap !== undefined ? customMerged.reasonOrGap : mergedReason,
        };

        const allSecIdSet = new Set([...Array.from(secIdSet), ...secondaries.map((s) => s.id)]);
        allSecIdSet.delete(primaryId);
        const remaining = prev.filter((i) => !allSecIdSet.has(i.id) && i !== primary && i.id !== primaryId);
        return [mergedItem, ...remaining];
      });

      recordChange(
        'WISHLIST_UPDATED',
        'shopping_item',
        `Merged Shopping Items`,
        `Consolidated duplicate wishlist items into 1 master record.`,
        primaryId
      );
    },
    [captureUndoState, recordChange]
  );

  const mergeSaleItems = useCallback(
    (
      primaryId: string,
      secondaryIds: string[],
      customMerged?: Partial<SaleItem>
    ) => {
      if (!primaryId) return;
      captureUndoState(`Merged duplicate sale items`);
      const now = new Date().toISOString();
      const cleanSecIds = (secondaryIds || []).filter((id) => id !== primaryId);
      const secIdSet = new Set(cleanSecIds);

      setSaleItems((prev) => {
        const primary = prev.find((i) => i.id === primaryId);
        if (!primary) return prev;

        const secondaries = prev.filter(
          (i) => (secIdSet.has(i.id) || (i.id === primaryId && i !== primary)) && i !== primary
        );
        const allTags = Array.from(
          new Set([
            ...(primary.tags || []),
            ...secondaries.flatMap((s) => s.tags || []),
            ...(customMerged?.tags || []),
          ])
        );

        const fallbackImage = primary.imageUrl || secondaries.find((s) => s.imageUrl)?.imageUrl || '';
        const fallbackColor = primary.color || secondaries.find((s) => s.color)?.color;
        const fallbackSize = primary.size || secondaries.find((s) => s.size)?.size;
        const fallbackDescription = primary.description || secondaries.find((s) => s.description)?.description;
        const fallbackBuyer = primary.buyerUsername || secondaries.find((s) => s.buyerUsername)?.buyerUsername;

        const notePieces = [
          primary.notes,
          ...secondaries.map((s) => s.notes).filter(Boolean),
        ].filter(Boolean) as string[];
        const mergedNotes = Array.from(new Set(notePieces)).join(' | ');

        const mergedItem: SaleItem = {
          ...primary,
          imageUrl: customMerged?.imageUrl || fallbackImage,
          color: customMerged?.color || fallbackColor,
          size: customMerged?.size !== undefined ? customMerged.size : fallbackSize,
          description: customMerged?.description !== undefined ? customMerged.description : fallbackDescription,
          buyerUsername: customMerged?.buyerUsername !== undefined ? customMerged.buyerUsername : fallbackBuyer,
          ...customMerged,
          tags: customMerged?.tags || allTags,
          notes: customMerged?.notes !== undefined ? customMerged.notes : mergedNotes || undefined,
          updatedAt: now,
        };

        const allSecIdSet = new Set([...Array.from(secIdSet), ...secondaries.map((s) => s.id)]);
        allSecIdSet.delete(primaryId);
        const remaining = prev.filter((i) => !allSecIdSet.has(i.id) && i !== primary && i.id !== primaryId);
        return [mergedItem, ...remaining];
      });

      recordChange(
        'SALE_UPDATED',
        'sale_item',
        `Merged Sale Items`,
        `Consolidated duplicate listings into 1 master record.`,
        primaryId
      );
    },
    [captureUndoState, recordChange]
  );

  const mergeCrossCollectionItems = useCallback(
    (
      primaryCollection: 'wardrobe' | 'shopping' | 'selling',
      primaryId: string,
      secondaryItems: Array<{ collection: 'wardrobe' | 'shopping' | 'selling'; id: string }>,
      customMerged?: any
    ) => {
      if (!primaryId) return;
      captureUndoState(`Merged cross-collection duplicate items`);
      const now = new Date().toISOString();

      const secWardrobeIds = new Set(
        secondaryItems.filter((s) => s.collection === 'wardrobe' && s.id !== primaryId).map((s) => s.id)
      );
      const secShoppingIds = new Set(
        secondaryItems.filter((s) => s.collection === 'shopping' && s.id !== primaryId).map((s) => s.id)
      );
      const secSaleIds = new Set(
        secondaryItems.filter((s) => s.collection === 'selling' && s.id !== primaryId).map((s) => s.id)
      );

      if (primaryCollection === 'wardrobe') {
        setItems((prev) => {
          const primary = prev.find((i) => i.id === primaryId);
          if (!primary) return prev;
          const mergedItem: WardrobeItem = {
            ...primary,
            ...(customMerged || {}),
            updatedAt: now,
          };
          const remaining = prev.filter((i) => !secWardrobeIds.has(i.id) && i.id !== primaryId);
          return [mergedItem, ...remaining];
        });
        setShoppingList((prev) => prev.filter((s) => !secShoppingIds.has(s.id)));
        setSaleItems((prev) => prev.filter((s) => !secSaleIds.has(s.id)));
        setOutfits((prev) =>
          prev.map((o) => ({
            ...o,
            itemIds: Array.from(
              new Set(
                o.itemIds.map((id) => (secWardrobeIds.has(id) ? primaryId : id))
              )
            ),
          }))
        );
      } else if (primaryCollection === 'shopping') {
        setShoppingList((prev) => {
          const primary = prev.find((s) => s.id === primaryId);
          if (!primary) return prev;
          const mergedItem: ShoppingItem = {
            ...primary,
            ...(customMerged || {}),
          };
          const remaining = prev.filter((s) => !secShoppingIds.has(s.id) && s.id !== primaryId);
          return [mergedItem, ...remaining];
        });
        setItems((prev) => prev.filter((i) => !secWardrobeIds.has(i.id)));
        setSaleItems((prev) => prev.filter((s) => !secSaleIds.has(s.id)));
      } else if (primaryCollection === 'selling') {
        setSaleItems((prev) => {
          const primary = prev.find((s) => s.id === primaryId);
          if (!primary) return prev;
          const mergedItem: SaleItem = {
            ...primary,
            ...(customMerged || {}),
            updatedAt: now,
          };
          const remaining = prev.filter((s) => !secSaleIds.has(s.id) && s.id !== primaryId);
          return [mergedItem, ...remaining];
        });
        setItems((prev) => prev.filter((i) => !secWardrobeIds.has(i.id)));
        setShoppingList((prev) => prev.filter((s) => !secShoppingIds.has(s.id)));
      }
    },
    [captureUndoState]
  );

  const batchAutoMergeDuplicates = useCallback(
    (
      clusters: Array<{
        primaryCollection: 'wardrobe' | 'shopping' | 'selling';
        primaryId: string;
        secondary: Array<{ collection: 'wardrobe' | 'shopping' | 'selling'; id: string }>;
        customMerged?: any;
      }>
    ) => {
      if (!clusters || clusters.length === 0) return 0;
      captureUndoState(`Auto-merged ${clusters.length} duplicate clusters`);

      const now = new Date().toISOString();

      // Collect all secondary IDs to remove across all clusters
      const wardrobeToRemove = new Set<string>();
      const shoppingToRemove = new Set<string>();
      const sellingToRemove = new Set<string>();

      // Collect updates for primaries
      const wardrobeUpdates = new Map<string, Partial<WardrobeItem>>();
      const shoppingUpdates = new Map<string, Partial<ShoppingItem>>();
      const sellingUpdates = new Map<string, Partial<SaleItem>>();

      clusters.forEach((cl) => {
        cl.secondary.forEach((sec) => {
          if (sec.id === cl.primaryId) return; // Never mark primary for removal
          if (sec.collection === 'wardrobe') wardrobeToRemove.add(sec.id);
          if (sec.collection === 'shopping') shoppingToRemove.add(sec.id);
          if (sec.collection === 'selling') sellingToRemove.add(sec.id);
        });

        // Extra safeguard: explicitly remove primaryId from all removal sets
        wardrobeToRemove.delete(cl.primaryId);
        shoppingToRemove.delete(cl.primaryId);
        sellingToRemove.delete(cl.primaryId);

        // Compute merged attributes from secondaries if not explicitly passed
        if (cl.primaryCollection === 'wardrobe') {
          const currentPrimary = items.find((i) => i.id === cl.primaryId);
          const currentSecondaries = items.filter((i) =>
            cl.secondary.some((s) => s.collection === 'wardrobe' && s.id === i.id)
          );

          if (currentPrimary) {
            const allTags = Array.from(
              new Set([
                ...(currentPrimary.tags || []),
                ...currentSecondaries.flatMap((s) => s.tags || []),
                ...(cl.customMerged?.tags || []),
              ])
            );
            const totalWears =
              (currentPrimary.wearCount || 0) +
              currentSecondaries.reduce((acc, s) => acc + (s.wearCount || 0), 0);
            const maxVal = Math.max(
              currentPrimary.currentValuation || currentPrimary.purchasePrice || 0,
              ...currentSecondaries.map((s) => s.currentValuation || s.purchasePrice || 0)
            );
            const fallbackImage =
              currentPrimary.imageUrl || currentSecondaries.find((s) => s.imageUrl)?.imageUrl || '';
            const fallbackColor =
              currentPrimary.color || currentSecondaries.find((s) => s.color)?.color || 'Unspecified';

            const notePieces = [
              currentPrimary.notes,
              ...currentSecondaries.map((s) => s.notes).filter(Boolean),
            ].filter(Boolean) as string[];
            const mergedNotes = Array.from(new Set(notePieces)).join(' | ');

            wardrobeUpdates.set(cl.primaryId, {
              imageUrl: cl.customMerged?.imageUrl || fallbackImage,
              color: cl.customMerged?.color || fallbackColor,
              tags: cl.customMerged?.tags || allTags,
              wearCount: cl.customMerged?.wearCount !== undefined ? cl.customMerged.wearCount : totalWears,
              currentValuation: cl.customMerged?.currentValuation !== undefined ? cl.customMerged.currentValuation : maxVal,
              notes: cl.customMerged?.notes !== undefined ? cl.customMerged.notes : mergedNotes || undefined,
              ...(cl.customMerged || {}),
            });
          }
        } else if (cl.primaryCollection === 'shopping') {
          const currentPrimary = shoppingList.find((s) => s.id === cl.primaryId);
          const currentSecondaries = shoppingList.filter((s) =>
            cl.secondary.some((sec) => sec.collection === 'shopping' && sec.id === s.id)
          );

          if (currentPrimary) {
            const allTags = Array.from(
              new Set([
                ...(currentPrimary.tags || []),
                ...currentSecondaries.flatMap((s) => s.tags || []),
                ...(cl.customMerged?.tags || []),
              ])
            );
            const notePieces = [
              currentPrimary.reasonOrGap,
              ...currentSecondaries.map((s) => s.reasonOrGap).filter(Boolean),
            ].filter(Boolean) as string[];
            const mergedReason = Array.from(new Set(notePieces)).join(' | ');

            shoppingUpdates.set(cl.primaryId, {
              tags: cl.customMerged?.tags || allTags,
              reasonOrGap: cl.customMerged?.reasonOrGap !== undefined ? cl.customMerged.reasonOrGap : mergedReason,
              ...(cl.customMerged || {}),
            });
          }
        } else if (cl.primaryCollection === 'selling') {
          const currentPrimary = saleItems.find((s) => s.id === cl.primaryId);
          const currentSecondaries = saleItems.filter((s) =>
            cl.secondary.some((sec) => sec.collection === 'selling' && sec.id === s.id)
          );

          if (currentPrimary) {
            const allTags = Array.from(
              new Set([
                ...(currentPrimary.tags || []),
                ...currentSecondaries.flatMap((s) => s.tags || []),
                ...(cl.customMerged?.tags || []),
              ])
            );
            const notePieces = [
              currentPrimary.notes,
              ...currentSecondaries.map((s) => s.notes).filter(Boolean),
            ].filter(Boolean) as string[];
            const mergedNotes = Array.from(new Set(notePieces)).join(' | ');

            sellingUpdates.set(cl.primaryId, {
              tags: cl.customMerged?.tags || allTags,
              notes: cl.customMerged?.notes !== undefined ? cl.customMerged.notes : mergedNotes || undefined,
              ...(cl.customMerged || {}),
            });
          }
        }
      });

      // Update wardrobe in ONE atomic pass
      setItems((prev) => {
        const updated = prev
          .filter((i) => !wardrobeToRemove.has(i.id))
          .map((i) => {
            if (wardrobeUpdates.has(i.id)) {
              return { ...i, ...wardrobeUpdates.get(i.id), updatedAt: now };
            }
            return i;
          });
        const seen = new Set<string>();
        return updated.filter((i) => {
          if (seen.has(i.id)) return false;
          seen.add(i.id);
          return true;
        });
      });

      // Update outfits lookbook references
      setOutfits((prev) =>
        prev.map((o) => {
          const updatedItemIds = o.itemIds.map((id) => {
            const cl = clusters.find((c) =>
              c.secondary.some((s) => s.collection === 'wardrobe' && s.id === id)
            );
            return cl ? cl.primaryId : id;
          });
          return {
            ...o,
            itemIds: Array.from(new Set(updatedItemIds)),
            updatedAt: now,
          };
        })
      );

      // Update shopping in ONE atomic pass
      setShoppingList((prev) => {
        const updated = prev
          .filter((s) => !shoppingToRemove.has(s.id))
          .map((s) => {
            if (shoppingUpdates.has(s.id)) {
              return { ...s, ...shoppingUpdates.get(s.id) };
            }
            return s;
          });
        const seen = new Set<string>();
        return updated.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
      });

      // Update selling in ONE atomic pass
      setSaleItems((prev) => {
        const updated = prev
          .filter((s) => !sellingToRemove.has(s.id))
          .map((s) => {
            if (sellingUpdates.has(s.id)) {
              return { ...s, ...sellingUpdates.get(s.id), updatedAt: now };
            }
            return s;
          });
        const seen = new Set<string>();
        return updated.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
      });

      return clusters.reduce((acc, c) => acc + c.secondary.length, 0);
    },
    [captureUndoState, items, shoppingList, saleItems]
  );

  // UNIVERSAL 1-CLICK AUTO MERGE ALL SAME INSTANCES (HUMIDOR-GRADE AUTO CONSOLIDATOR)
  const autoMergeAllDuplicates = useCallback(
    (
      scope: 'all' | 'wardrobe' | 'shopping' | 'selling' = 'all',
      exactOnly: boolean = false
    ): { mergedCount: number; removedCount: number; message: string } => {
      const now = new Date().toISOString();
      let totalMergedClusters = 0;
      let totalRemovedSecondary = 0;

      // 1. Process Wardrobe with Humidor-grade deduplication engine
      if (scope === 'all' || scope === 'wardrobe') {
        const { consolidated, remappedIds, mergedCount } = consolidateWardrobeDuplicates(items);
        if (mergedCount > 0) {
          totalRemovedSecondary += mergedCount;
          totalMergedClusters += 1;

          captureUndoState(`Auto-merged ${mergedCount} duplicate wardrobe items into master records`);
          setItems(consolidated);

          setOutfits((prev) =>
            prev.map((o) => ({
              ...o,
              itemIds: Array.from(
                new Set(o.itemIds.map((id) => remappedIds.get(id) || id))
              ),
              updatedAt: now,
            }))
          );
        }
      }

      // 2. Process Shopping
      if (scope === 'all' || scope === 'shopping') {
        const { consolidated, mergedCount } = consolidateShoppingDuplicates(shoppingList);
        if (mergedCount > 0) {
          totalRemovedSecondary += mergedCount;
          totalMergedClusters += 1;
          setShoppingList(consolidated);
        }
      }

      // 3. Process Selling
      if (scope === 'all' || scope === 'selling') {
        const { consolidated, mergedCount } = consolidateSaleDuplicates(saleItems);
        if (mergedCount > 0) {
          totalRemovedSecondary += mergedCount;
          totalMergedClusters += 1;
          setSaleItems(consolidated);
        }
      }

      const message =
        totalRemovedSecondary > 0
          ? `Consolidated ${totalRemovedSecondary} duplicate copies into clean master records.`
          : 'No duplicate items found to consolidate.';

      if (totalRemovedSecondary > 0) {
        recordChange(
          'ITEM_UPDATED',
          'wardrobe_item',
          `Auto-Merged Duplicates`,
          message
        );
      }

      return {
        mergedCount: totalMergedClusters,
        removedCount: totalRemovedSecondary,
        message,
      };
    },
    [items, shoppingList, saleItems, captureUndoState, recordChange]
  );

  // BATCH UPDATE SHOPPING ITEMS
  const batchUpdateShoppingItems = useCallback(
    (
      ids: string[],
      updates: Partial<ShoppingItem> | ((item: ShoppingItem) => Partial<ShoppingItem>),
      customSummary?: string
    ) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const affected = shoppingList.filter((s) => idSet.has(s.id));
      if (affected.length === 0) return;

      const actionTitle = customSummary || `Bulk updated ${affected.length} shopping items`;
      captureUndoState(actionTitle);

      setShoppingList((prev) =>
        prev.map((item) => {
          if (!idSet.has(item.id)) return item;
          const patch = typeof updates === 'function' ? updates(item) : updates;
          return {
            ...item,
            ...patch,
          };
        })
      );

      recordChange(
        'WISHLIST_UPDATED',
        'shopping_item',
        `${affected.length} Shopping Items`,
        actionTitle,
        undefined
      );
    },
    [shoppingList, captureUndoState, recordChange]
  );

  // BATCH UPDATE SALE ITEMS
  const batchUpdateSaleItems = useCallback(
    (
      ids: string[],
      updates: Partial<SaleItem> | ((item: SaleItem) => Partial<SaleItem>),
      customSummary?: string
    ) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const affected = saleItems.filter((s) => idSet.has(s.id));
      if (affected.length === 0) return;

      const actionTitle = customSummary || `Bulk updated ${affected.length} sale listings`;
      captureUndoState(actionTitle);

      const now = new Date().toISOString();
      setSaleItems((prev) =>
        prev.map((item) => {
          if (!idSet.has(item.id)) return item;
          const patch = typeof updates === 'function' ? updates(item) : updates;
          return {
            ...item,
            ...patch,
            updatedAt: now,
          };
        })
      );

      recordChange(
        'SALE_UPDATED',
        'sale_item',
        `${affected.length} Sale Items`,
        actionTitle,
        undefined
      );
    },
    [saleItems, captureUndoState, recordChange]
  );

  // BATCH UPDATE OUTFITS
  const batchUpdateOutfits = useCallback(
    (
      ids: string[],
      updates: Partial<LookbookOutfit> | ((outfit: LookbookOutfit) => Partial<LookbookOutfit>),
      customSummary?: string
    ) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const affected = outfits.filter((o) => idSet.has(o.id));
      if (affected.length === 0) return;

      const actionTitle = customSummary || `Bulk updated ${affected.length} styled looks`;
      captureUndoState(actionTitle);

      const now = new Date().toISOString();
      setOutfits((prev) =>
        prev.map((outfit) => {
          if (!idSet.has(outfit.id)) return outfit;
          const patch = typeof updates === 'function' ? updates(outfit) : updates;
          return {
            ...outfit,
            ...patch,
            updatedAt: now,
          };
        })
      );

      recordChange(
        'LOOK_UPDATED',
        'lookbook_outfit',
        `${affected.length} Lookbook Outfits`,
        actionTitle,
        undefined
      );
    },
    [outfits, captureUndoState, recordChange]
  );

  // DELETE MULTIPLE OUTFITS
  const deleteMultipleOutfits = useCallback(
    (ids: string[]) => {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const affected = outfits.filter((o) => idSet.has(o.id));
      if (affected.length === 0) return;

      captureUndoState(`Deleted ${affected.length} lookbook outfits`);
      setOutfits((prev) => prev.filter((o) => !idSet.has(o.id)));

      recordChange(
        'LOOK_DELETED',
        'lookbook_outfit',
        `${affected.length} Outfits`,
        `Bulk deleted ${affected.length} looks from Lookbook.`,
        undefined,
        {
          oldValue: affected,
          previousEntity: affected,
          deletedEntities: affected,
        }
      );
    },
    [outfits, captureUndoState, recordChange]
  );

  // GLOBAL TAXONOMY: Rename Tag Globally
  const renameTagGlobally = useCallback(
    (oldTag: string, newTag: string) => {
      if (!oldTag || !newTag || oldTag === newTag) return;
      captureUndoState(`Renamed tag "${oldTag}" to "${newTag}"`);

      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          tags: (i.tags || []).map((t) => (t === oldTag ? newTag : t)),
        }))
      );
      setShoppingList((prev) =>
        prev.map((s) => ({
          ...s,
          tags: (s.tags || []).map((t) => (t === oldTag ? newTag : t)),
        }))
      );
      setSaleItems((prev) =>
        prev.map((s) => ({
          ...s,
          tags: (s.tags || []).map((t) => (t === oldTag ? newTag : t)),
        }))
      );
      setOutfits((prev) =>
        prev.map((o) => ({
          ...o,
          tags: (o.tags || []).map((t) => (t === oldTag ? newTag : t)),
        }))
      );
      updateSettings({
        customTags: (settings.customTags || []).map((t) => (t === oldTag ? newTag : t)),
      });

      recordChange(
        'CATEGORY_UPDATED',
        'system',
        `Tag: ${oldTag} -> ${newTag}`,
        `Renamed tag "${oldTag}" to "${newTag}" across all garments, shopping items, and looks.`
      );
    },
    [captureUndoState, updateSettings, settings.customTags, recordChange]
  );

  // GLOBAL TAXONOMY: Delete Tag Globally
  const deleteTagGlobally = useCallback(
    (tagToDelete: string) => {
      if (!tagToDelete) return;
      captureUndoState(`Removed tag "${tagToDelete}"`);

      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          tags: (i.tags || []).filter((t) => t !== tagToDelete),
        }))
      );
      setShoppingList((prev) =>
        prev.map((s) => ({
          ...s,
          tags: (s.tags || []).filter((t) => t !== tagToDelete),
        }))
      );
      setSaleItems((prev) =>
        prev.map((s) => ({
          ...s,
          tags: (s.tags || []).filter((t) => t !== tagToDelete),
        }))
      );
      setOutfits((prev) =>
        prev.map((o) => ({
          ...o,
          tags: (o.tags || []).filter((t) => t !== tagToDelete),
        }))
      );
      updateSettings({
        customTags: (settings.customTags || []).filter((t) => t !== tagToDelete),
      });

      recordChange(
        'CATEGORY_DELETED',
        'system',
        `Tag: ${tagToDelete}`,
        `Deleted tag "${tagToDelete}" across all items and wardrobe tags.`
      );
    },
    [captureUndoState, updateSettings, settings.customTags, recordChange]
  );

  // GLOBAL TAXONOMY: Rename Brand Globally
  const renameBrandGlobally = useCallback(
    (oldBrand: string, newBrand: string) => {
      if (!oldBrand || !newBrand || oldBrand === newBrand) return;
      captureUndoState(`Renamed brand "${oldBrand}" to "${newBrand}"`);

      setItems((prev) =>
        prev.map((i) => (i.brand === oldBrand ? { ...i, brand: newBrand } : i))
      );
      setShoppingList((prev) =>
        prev.map((s) => (s.brand === oldBrand ? { ...s, brand: newBrand } : s))
      );
      setSaleItems((prev) =>
        prev.map((s) => (s.brand === oldBrand ? { ...s, brand: newBrand } : s))
      );

      recordChange(
        'CATEGORY_UPDATED',
        'system',
        `Brand: ${oldBrand} -> ${newBrand}`,
        `Renamed brand "${oldBrand}" to "${newBrand}" across wardrobe, wishlist, and resale.`
      );
    },
    [captureUndoState, recordChange]
  );

  // 16. RESTORE SNAPSHOT
  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      const snap = snapshots.find((s) => s.id === snapshotId);
      if (!snap || !snap.data) return false;

      // Before restoring, capture undo state so rollback can be undone
      captureUndoState(`Restored snapshot "${snap.name}"`);

      setItems(snap.data.items || []);
      setOutfits(snap.data.outfits || []);
      setShoppingList(snap.data.shoppingList || []);
      if (snap.data.saleItems && Array.isArray(snap.data.saleItems)) setSaleItems(snap.data.saleItems);
      if (typeof snap.data.monthlyBudget === 'number') setMonthlyBudget(snap.data.monthlyBudget);

      recordChange(
        'SNAPSHOT_RESTORED',
        'snapshot',
        snap.name,
        `Restored entire wardrobe state to snapshot "${snap.name}" (Version #${snap.versionNumber}, recorded on ${new Date(snap.createdAt).toLocaleDateString()}).`,
        snapshotId
      );

      return true;
    },
    [snapshots, captureUndoState, recordChange]
  );

  // 17. DELETE SNAPSHOT
  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  }, []);

  // 17b. RESTORE SPECIFIC ITEM / ENTITY FROM A TIMELINE ENTRY
  const restoreTimelineEntryItem = useCallback(
    (logId: string): { success: boolean; message: string; restoredItem?: any } => {
      const log = changeLogs.find((l) => l.id === logId);
      if (!log) return { success: false, message: 'Change log entry not found.' };

      const entityData = log.details?.previousEntity || log.details?.oldValue || log.details?.deletedEntities;
      const currentData = log.details?.currentEntity || log.details?.newValue;

      // A) Handle DELETED items (Re-insert item back into collection)
      if (log.actionType.includes('DELETED')) {
        if (!entityData) {
          // If no stored entity data, try recovering from snapshotData if present
          if (log.snapshotData) {
            if (log.entityType === 'wardrobe_item' && log.entityId) {
              const matchedInSnap = log.snapshotData.items?.find((i) => i.id === log.entityId);
              if (matchedInSnap) {
                captureUndoState(`Restored "${log.entityTitle}" from audit entry`);
                setItems((prev) => [matchedInSnap, ...prev.filter((i) => i.id !== matchedInSnap.id)]);
                recordChange(
                  'ITEM_ADDED',
                  'wardrobe_item',
                  log.entityTitle,
                  `Restored garment "${log.entityTitle}" back to wardrobe from audit Rev #${log.versionNumber}.`,
                  matchedInSnap.id
                );
                return { success: true, message: `Successfully restored "${log.entityTitle}" back to active wardrobe.`, restoredItem: matchedInSnap };
              }
            }
          }
          return { success: false, message: 'No item data preserved in this log entry to restore.' };
        }

        captureUndoState(`Restored ${log.entityTitle} from audit entry Rev #${log.versionNumber}`);

        if (log.entityType === 'wardrobe_item') {
          const itemsToRestore: WardrobeItem[] = Array.isArray(entityData) ? entityData : [entityData];
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = itemsToRestore.filter((i) => !existingIds.has(i.id));
            const updated = prev.map((i) => {
              const matched = itemsToRestore.find((r) => r.id === i.id);
              return matched || i;
            });
            return [...newItems, ...updated];
          });
          recordChange(
            'ITEM_ADDED',
            'wardrobe_item',
            log.entityTitle,
            `Restored ${itemsToRestore.length} garment(s) ("${log.entityTitle}") back to wardrobe from audit Rev #${log.versionNumber}.`,
            itemsToRestore[0]?.id
          );
          return {
            success: true,
            message: `Successfully restored ${itemsToRestore.length} garment(s) ("${log.entityTitle}") back to active wardrobe.`,
            restoredItem: itemsToRestore[0],
          };
        }

        if (log.entityType === 'lookbook_outfit') {
          const outfitsToRestore: LookbookOutfit[] = Array.isArray(entityData) ? entityData : [entityData];
          setOutfits((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            const newOutfits = outfitsToRestore.filter((o) => !existingIds.has(o.id));
            return [...newOutfits, ...prev];
          });
          recordChange(
            'LOOK_CREATED',
            'lookbook_outfit',
            log.entityTitle,
            `Restored look "${log.entityTitle}" back to Lookbook from audit Rev #${log.versionNumber}.`,
            outfitsToRestore[0]?.id
          );
          return {
            success: true,
            message: `Successfully restored look "${log.entityTitle}" back to Lookbook.`,
            restoredItem: outfitsToRestore[0],
          };
        }

        if (log.entityType === 'shopping_item') {
          const shopItemsToRestore: ShoppingItem[] = Array.isArray(entityData) ? entityData : [entityData];
          setShoppingList((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newShopItems = shopItemsToRestore.filter((s) => !existingIds.has(s.id));
            return [...newShopItems, ...prev];
          });
          recordChange(
            'WISHLIST_ADDED',
            'shopping_item',
            log.entityTitle,
            `Restored "${log.entityTitle}" back to wishlist from audit Rev #${log.versionNumber}.`,
            shopItemsToRestore[0]?.id
          );
          return {
            success: true,
            message: `Successfully restored "${log.entityTitle}" back to shopping wishlist.`,
            restoredItem: shopItemsToRestore[0],
          };
        }

        if (log.entityType === 'sale_item') {
          const saleItemsToRestore: SaleItem[] = Array.isArray(entityData) ? entityData : [entityData];
          setSaleItems((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newSaleItems = saleItemsToRestore.filter((s) => !existingIds.has(s.id));
            return [...newSaleItems, ...prev];
          });
          recordChange(
            'SALE_ADDED',
            'sale_item',
            log.entityTitle,
            `Restored "${log.entityTitle}" back to sales listings from audit Rev #${log.versionNumber}.`,
            saleItemsToRestore[0]?.id
          );
          return {
            success: true,
            message: `Successfully restored sale listing "${log.entityTitle}".`,
            restoredItem: saleItemsToRestore[0],
          };
        }
      }

      // B) Handle UPDATED items (Revert attributes to previousEntity)
      if (log.actionType.includes('UPDATED')) {
        if (!entityData) {
          return { success: false, message: 'No prior attributes preserved in this log entry to revert.' };
        }

        captureUndoState(`Reverted ${log.entityTitle} from audit Rev #${log.versionNumber}`);

        if (log.entityType === 'wardrobe_item') {
          const prevItem = entityData as WardrobeItem;
          setItems((prev) => {
            const exists = prev.some((i) => i.id === prevItem.id);
            if (exists) {
              return prev.map((i) => (i.id === prevItem.id ? { ...prevItem, updatedAt: new Date().toISOString() } : i));
            }
            return [prevItem, ...prev];
          });
          recordChange(
            'ITEM_UPDATED',
            'wardrobe_item',
            log.entityTitle,
            `Reverted "${log.entityTitle}" back to previous attributes from audit Rev #${log.versionNumber}.`,
            prevItem.id
          );
          return { success: true, message: `Reverted "${log.entityTitle}" back to its prior attributes.` };
        }

        if (log.entityType === 'lookbook_outfit') {
          const prevLook = entityData as LookbookOutfit;
          setOutfits((prev) => {
            const exists = prev.some((o) => o.id === prevLook.id);
            if (exists) {
              return prev.map((o) => (o.id === prevLook.id ? { ...prevLook, updatedAt: new Date().toISOString() } : o));
            }
            return [prevLook, ...prev];
          });
          return { success: true, message: `Reverted look "${log.entityTitle}" to prior state.` };
        }

        if (log.entityType === 'shopping_item') {
          const prevShop = entityData as ShoppingItem;
          setShoppingList((prev) => {
            const exists = prev.some((s) => s.id === prevShop.id);
            if (exists) {
              return prev.map((s) => (s.id === prevShop.id ? { ...prevShop, updatedAt: new Date().toISOString() } : s));
            }
            return [prevShop, ...prev];
          });
          return { success: true, message: `Reverted wishlist item "${log.entityTitle}".` };
        }

        if (log.entityType === 'sale_item') {
          const prevSale = entityData as SaleItem;
          setSaleItems((prev) => {
            const exists = prev.some((s) => s.id === prevSale.id);
            if (exists) {
              return prev.map((s) => (s.id === prevSale.id ? { ...prevSale, updatedAt: new Date().toISOString() } : s));
            }
            return [prevSale, ...prev];
          });
          return { success: true, message: `Reverted sale listing "${log.entityTitle}".` };
        }

        if (log.entityType === 'budget') {
          const budgetVal = typeof entityData === 'number' ? entityData : Number(entityData);
          if (!isNaN(budgetVal)) {
            setMonthlyBudget(budgetVal);
            return { success: true, message: `Restored monthly budget to £${budgetVal}.` };
          }
        }
      }

      // C) Handle ADDED items (Undo addition by removing the created item)
      if (log.actionType.includes('ADDED') || log.actionType === 'LOOK_CREATED') {
        const idToRemove = log.entityId || (currentData && currentData.id);
        if (!idToRemove) return { success: false, message: 'Entity ID not found for this log entry.' };

        captureUndoState(`Removed added item ${log.entityTitle} from audit Rev #${log.versionNumber}`);

        if (log.entityType === 'wardrobe_item') {
          setItems((prev) => prev.filter((i) => i.id !== idToRemove));
          return { success: true, message: `Removed added garment "${log.entityTitle}" from active wardrobe.` };
        }
        if (log.entityType === 'lookbook_outfit') {
          setOutfits((prev) => prev.filter((o) => o.id !== idToRemove));
          return { success: true, message: `Removed look "${log.entityTitle}".` };
        }
        if (log.entityType === 'shopping_item') {
          setShoppingList((prev) => prev.filter((s) => s.id !== idToRemove));
          return { success: true, message: `Removed wishlist item "${log.entityTitle}".` };
        }
        if (log.entityType === 'sale_item') {
          setSaleItems((prev) => prev.filter((s) => s.id !== idToRemove));
          return { success: true, message: `Removed sale listing "${log.entityTitle}".` };
        }
      }

      return { success: false, message: 'No item-level restoration action is available for this log type.' };
    },
    [changeLogs, captureUndoState, recordChange]
  );

  // 17c. RESTORE FULL WARDROBE STATE AT TIMELINE ENTRY (Time-travel rollback to entry)
  const restoreTimelineState = useCallback(
    (logId: string): { success: boolean; message: string } => {
      const log = changeLogs.find((l) => l.id === logId);
      if (!log) return { success: false, message: 'Timeline entry not found.' };

      // Determine snapshot data from this log, a linked snapshot, or nearest point-in-time
      let targetSnapshotData = log.snapshotData;

      if (!targetSnapshotData) {
        // Look for matching snapshot by version or timestamp
        const linkedSnap = snapshots.find(
          (s) => s.versionNumber === log.versionNumber || s.createdAt.slice(0, 16) === log.timestamp.slice(0, 16)
        );
        if (linkedSnap && linkedSnap.data) {
          targetSnapshotData = linkedSnap.data;
        }
      }

      if (!targetSnapshotData) {
        // Nearest earlier or later changeLog with snapshotData
        const fallbackLog =
          changeLogs.find((l) => l.versionNumber <= log.versionNumber && l.snapshotData) ||
          changeLogs.find((l) => l.snapshotData);
        if (fallbackLog?.snapshotData) {
          targetSnapshotData = fallbackLog.snapshotData;
        }
      }

      if (!targetSnapshotData) {
        // Ultimate baseline fallback
        targetSnapshotData = {
          items: INITIAL_WARDROBE_ITEMS,
          outfits: INITIAL_LOOKBOOK_OUTFITS,
          shoppingList: INITIAL_SHOPPING_LIST,
          saleItems: INITIAL_SALE_ITEMS,
          monthlyBudget: 350,
        };
      }

      // Automatic safety rollback point before rewinding
      createSnapshot(
        `[Pre-Rollback Safety] Prior to Rev #${log.versionNumber}`,
        `Automatic safety checkpoint captured prior to rewinding closet to Rev #${log.versionNumber} ("${log.entityTitle}").`,
        true
      );

      const restoredItems = targetSnapshotData.items || [];
      const restoredOutfits = targetSnapshotData.outfits || [];
      const restoredShopping = targetSnapshotData.shoppingList || [];
      const restoredSales = targetSnapshotData.saleItems || [];
      const restoredBudget = typeof targetSnapshotData.monthlyBudget === 'number' ? targetSnapshotData.monthlyBudget : 350;

      // Update refs synchronously
      itemsRef.current = restoredItems;
      outfitsRef.current = restoredOutfits;
      shoppingListRef.current = restoredShopping;
      saleItemsRef.current = restoredSales;

      // Update states
      setItems(restoredItems);
      setOutfits(restoredOutfits);
      setShoppingList(restoredShopping);
      setSaleItems(restoredSales);
      setMonthlyBudget(restoredBudget);

      recordChange(
        'SNAPSHOT_RESTORED',
        'snapshot',
        `Timeline Rollback: Rev #${log.versionNumber}`,
        `Rewound entire wardrobe, looks, wishlist, and sales to state recorded at Revision #${log.versionNumber} ("${log.entityTitle}").`,
        undefined,
        undefined,
        targetSnapshotData
      );

      return {
        success: true,
        message: `Entire closet state successfully restored to Revision #${log.versionNumber} ("${log.entityTitle}").`,
      };
    },
    [changeLogs, snapshots, createSnapshot, restoreSnapshot, restoreTimelineEntryItem, recordChange]
  );

  // 17d. CAN RESTORE ENTRY HELPER
  const canRestoreEntry = useCallback(
    (log: VersionChangeLog) => {
      const hasSnapshot = Boolean(log.snapshotData);
      const isDeleted = log.actionType.includes('DELETED');
      const isUpdated = log.actionType.includes('UPDATED');
      const isAdded = log.actionType.includes('ADDED') || log.actionType === 'LOOK_CREATED';
      const hasEntityData = Boolean(log.details?.previousEntity || log.details?.oldValue || log.details?.deletedEntities);

      let itemExistsNow = false;
      if (log.entityId) {
        if (log.entityType === 'wardrobe_item') itemExistsNow = items.some((i) => i.id === log.entityId);
        else if (log.entityType === 'lookbook_outfit') itemExistsNow = outfits.some((o) => o.id === log.entityId);
        else if (log.entityType === 'shopping_item') itemExistsNow = shoppingList.some((s) => s.id === log.entityId);
        else if (log.entityType === 'sale_item') itemExistsNow = saleItems.some((s) => s.id === log.entityId);
      }

      let canRestoreItem = false;
      let actionLabel = 'Restore';
      let description = '';

      if (isDeleted && (hasEntityData || (log.snapshotData && log.entityId))) {
        canRestoreItem = true;
        actionLabel = 'Restore Item';
        description = 'Re-insert this deleted piece back into active collection';
      } else if (isUpdated && hasEntityData) {
        canRestoreItem = true;
        actionLabel = 'Revert Changes';
        description = 'Revert attributes back to state prior to this edit';
      } else if (isAdded && itemExistsNow) {
        canRestoreItem = true;
        actionLabel = 'Undo Addition';
        description = 'Remove this added item from collection';
      }

      return {
        canRestoreItem,
        canRollbackState: hasSnapshot,
        itemExistsNow,
        actionLabel,
        description,
      };
    },
    [items, outfits, shoppingList, saleItems]
  );

  // 18. UPDATE MONTHLY BUDGET
  const updateMonthlyBudget = useCallback(
    (newBudgetGbp: number) => {
      const oldBudget = monthlyBudget;
      setMonthlyBudget(newBudgetGbp);
      recordChange(
        'BUDGET_UPDATED',
        'budget',
        'Monthly Shopping Budget',
        `Adjusted monthly wardrobe shopping budget from £${oldBudget} to £${newBudgetGbp}.`,
        undefined,
        {
          oldValue: oldBudget,
          newValue: newBudgetGbp,
          financialImpact: newBudgetGbp - oldBudget,
        }
      );
    },
    [monthlyBudget, recordChange]
  );

  // 18b. SYNC VINTED ORDER STATUSES (Auto-aligns 'ORDER COMPLETED!', 'Cancelled', 'Sold' etc. with ShoppingStatus)
  const syncVintedOrderStatuses = useCallback(() => {
    let updatedCount = 0;
    setShoppingList((prev) => {
      const synced = prev.map((item) => {
        const normalized = normalizeShoppingItem(item);
        if (
          normalized.status !== item.status ||
          normalized.actualPricePaid !== item.actualPricePaid ||
          normalized.purchasedDate !== item.purchasedDate
        ) {
          updatedCount++;
          return normalized;
        }
        return item;
      });
      return synced;
    });

    if (updatedCount > 0) {
      recordChange(
        'WISHLIST_UPDATED',
        'system',
        'Vinted Order Status Sync',
        `Automatically synchronized ${updatedCount} Vinted purchases to active status filters.`
      );
    }
    return updatedCount;
  }, [recordChange]);

  // 18c. SYNC VINTED ACCOUNT ORDERS (Direct Cloudflare Worker Orders API Proxy Sync)
  const syncVintedAccountOrders = useCallback(
    (
      orders: VintedOrder[],
      options?: {
        routePurchasedTo?: 'wardrobe' | 'shopping';
        routeSoldTo?: 'selling';
        skipDuplicates?: boolean;
      }
    ) => {
      if (!orders || orders.length === 0) {
        return {
          addedPurchased: 0,
          addedSold: 0,
          skippedDuplicates: 0,
          totalPurchasedVal: 0,
          totalSoldVal: 0,
        };
      }

      const routePurchasedTo = options?.routePurchasedTo || 'wardrobe';
      const skipDuplicates = options?.skipDuplicates !== false;

      // Existing order numbers / IDs to prevent duplicate insertion
      const existingWardrobeOrderIds = new Set(
        items.map((i) => i.orderNumber).filter(Boolean)
      );
      const existingSaleOrderIds = new Set(
        saleItems.map((s) => s.orderNumber).filter(Boolean)
      );
      const existingShoppingOrderIds = new Set(
        shoppingList.map((s) => s.orderNumber).filter(Boolean)
      );

      const now = new Date().toISOString();
      const domain = settings.vintedWorkerAuth?.domain || 'co.uk';

      const newWardrobeItems: WardrobeItem[] = [];
      const newShoppingItems: ShoppingItem[] = [];
      const newSaleItems: SaleItem[] = [];
      let skippedDuplicates = 0;
      let totalPurchasedVal = 0;
      let totalSoldVal = 0;

      for (const order of orders) {
        const orderId = order.orderId ? String(order.orderId).trim() : '';
        const orderPrice =
          typeof order.price === 'number'
            ? order.price
            : parseFloat(String(order.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const rawDate = order.date ? String(order.date).slice(0, 10) : now.slice(0, 10);
        const orderTitle = (order.title || 'Vinted Order').trim();
        const inferredCategory = normalizeCategoryName(inferCategoryFromTitle(orderTitle), categories);

        if (order.type === 'sold' || (order.type as any) === 'active' || order.status === 'Listed') {
          if (skipDuplicates && orderId && existingSaleOrderIds.has(orderId)) {
            skippedDuplicates++;
            continue;
          }

          const isActiveListing = (order.type as any) === 'active' || order.status === 'Listed';
          const rawStatus = (order.transactionStatus || order.status || '').toLowerCase();
          const isCancelled = isCancelledStatus(rawStatus);

          const saleTags = determineLifecycleTags({
            destination: 'selling',
            sellingStatus: isActiveListing ? 'Listed' : (isCancelled ? 'Draft' : 'Sold'),
            orderStatus: order.transactionStatus || order.status,
            transactionType: 'Sale',
            isVinted: true,
            existingTags: isActiveListing ? ['vinted-active', 'listed'] : ['order-history'],
          });

          const saleItem: SaleItem = {
            id: generateUniqueId('sale'),
            name: orderTitle,
            brand: 'Vinted',
            category: inferredCategory,
            condition: 'Good',
            originalPricePaid: 0,
            listingPrice: orderPrice,
            soldPrice: isActiveListing ? undefined : orderPrice,
            platform: 'Vinted',
            status: isActiveListing ? 'Listed' : (isCancelled ? 'Draft' : 'Sold'),
            shippingStatus: isActiveListing ? 'Not Required' : (isCancelled ? 'Not Required' : 'Delivered'),
            imageUrl: order.image || '',
            tags: saleTags,
            listedDate: rawDate,
            soldDate: isActiveListing ? undefined : rawDate,
            orderNumber: orderId,
            platformListingUrl: orderId ? `https://www.vinted.${domain}/items/${orderId}` : '',
            notes: isActiveListing
              ? `Vinted active listing synced via connected session`
              : (order.transactionStatus ? `Vinted order · ${order.transactionStatus}` : 'Vinted order'),
            createdAt: now,
            updatedAt: now,
          };
          newSaleItems.push(saleItem);
          if (!isActiveListing) {
            totalSoldVal += orderPrice;
          }
          if (orderId) existingSaleOrderIds.add(orderId);
        } else {
          // Purchased order
          const rawStatus = (order.transactionStatus || order.status || '').toLowerCase();
          const isCancelled = isCancelledStatus(rawStatus);

          if (routePurchasedTo === 'shopping') {
            if (skipDuplicates && orderId && existingShoppingOrderIds.has(orderId)) {
              skippedDuplicates++;
              continue;
            }

            const shopTags = determineLifecycleTags({
              destination: 'shopping',
              shoppingStatus: isCancelled ? 'Cancelled' : 'Purchased',
              orderStatus: order.transactionStatus || order.status,
              transactionType: 'Purchase',
              isVinted: true,
              existingTags: ['second-hand'],
            });

            const shopItem: ShoppingItem = {
              id: generateUniqueId('shop'),
              name: orderTitle,
              brand: 'Vinted',
              category: inferredCategory,
              estimatedPrice: orderPrice,
              actualPricePaid: orderPrice,
              priority: 'Essential / Must-Have',
              status: isCancelled ? 'Cancelled' : 'Purchased',
              season: 'All-Season',
              matchingWardrobeItemIds: [],
              reasonOrGap: order.transactionStatus ? `Vinted purchase · ${order.transactionStatus}` : 'Vinted purchase',
              targetStoreUrl: orderId ? `https://www.vinted.${domain}/items/${orderId}` : '',
              imageUrl: order.image || '',
              tags: shopTags,
              addedDate: rawDate,
              createdAt: now,
              purchasedDate: rawDate,
              orderNumber: orderId,
              vintedUrl: orderId ? `https://www.vinted.${domain}/items/${orderId}` : '',
            };
            newShoppingItems.push(shopItem);
            totalPurchasedVal += orderPrice;
            if (orderId) existingShoppingOrderIds.add(orderId);
          } else {
            // Add to Wardrobe
            if (skipDuplicates && orderId && existingWardrobeOrderIds.has(orderId)) {
              skippedDuplicates++;
              continue;
            }

            const wardrobeTags = determineLifecycleTags({
              destination: 'wardrobe',
              orderStatus: order.transactionStatus || order.status,
              transactionType: 'Purchase',
              isVinted: true,
              existingTags: ['pre-owned'],
            });

            const wItem: WardrobeItem = {
              id: generateUniqueId('item'),
              name: orderTitle,
              brand: 'Vinted',
              category: inferredCategory,
              color: 'Various',
              season: ['All-Season'],
              purchasePrice: orderPrice,
              purchaseDate: rawDate,
              wearCount: 0,
              imageUrl: order.image || '',
              retailerName: 'Vinted',
              orderNumber: orderId,
              vintedUrl: orderId ? `https://www.vinted.${domain}/items/${orderId}` : '',
              condition: 'Good',
              isFavorite: false,
              isArchived: false,
              tags: wardrobeTags,
              notes: order.transactionStatus
                ? `Vinted order #${orderId} · ${order.transactionStatus}`
                : `Vinted order #${orderId}`,
              createdAt: now,
              updatedAt: now,
            };
            newWardrobeItems.push(wItem);
            totalPurchasedVal += orderPrice;
            if (orderId) existingWardrobeOrderIds.add(orderId);
          }
        }
      }

      const totalNewCount = newWardrobeItems.length + newShoppingItems.length + newSaleItems.length;
      if (totalNewCount === 0) {
        return {
          addedPurchased: 0,
          addedSold: 0,
          skippedDuplicates,
          totalPurchasedVal: 0,
          totalSoldVal: 0,
        };
      }

      // Safety Auto-Snapshot before applying sync
      createSnapshot(
        `[Auto-Snapshot] Pre-Vinted Sync Checkpoint`,
        `Safety rollback point created before syncing ${totalNewCount} orders from Vinted account.`
      );

      captureUndoState(`Vinted Sync: ${totalNewCount} orders imported`);

      if (newWardrobeItems.length > 0) {
        setItems((prev) => [...newWardrobeItems, ...prev]);
      }
      if (newShoppingItems.length > 0) {
        setShoppingList((prev) => [...newShoppingItems, ...prev]);
      }
      if (newSaleItems.length > 0) {
        setSaleItems((prev) => [...newSaleItems, ...prev]);
      }

      // Record comprehensive Version History entry
      recordChange(
        'VINTED_SYNC',
        newWardrobeItems.length > 0 ? 'wardrobe_item' : newSaleItems.length > 0 ? 'sale_item' : 'shopping_item',
        `Vinted Sync (${totalNewCount} Orders)`,
        `Synchronized ${newWardrobeItems.length + newShoppingItems.length} purchased orders (£${totalPurchasedVal.toFixed(2)}) & ${newSaleItems.length} sold listings (£${totalSoldVal.toFixed(2)}) from Vinted account.${skippedDuplicates > 0 ? ` Skipped ${skippedDuplicates} duplicate orders.` : ''}`,
        undefined,
        {
          financialImpact: totalPurchasedVal,
          newValue: {
            purchasedCount: newWardrobeItems.length + newShoppingItems.length,
            soldCount: newSaleItems.length,
            skippedDuplicates,
            totalPurchasedVal,
            totalSoldVal,
          },
          deletedEntities: [...newWardrobeItems, ...newShoppingItems, ...newSaleItems],
        }
      );

      return {
        addedPurchased: newWardrobeItems.length + newShoppingItems.length,
        addedSold: newSaleItems.length,
        skippedDuplicates,
        totalPurchasedVal,
        totalSoldVal,
      };
    },
    [
      items,
      saleItems,
      shoppingList,
      categories,
      settings.vintedWorkerAuth,
      createSnapshot,
      captureUndoState,
      recordChange,
    ]
  );

  // 18d. IMPORT VINTED EXTRACTED LISTINGS (Active listings via Cloudflare Worker)
  const importVintedExtractedListings = useCallback(
    (
      itemsToImport: VintedExtractedItem[],
      destination: 'selling' | 'shopping' | 'wardrobe' = 'selling'
    ) => {
      if (!itemsToImport || itemsToImport.length === 0) {
        return { importedCount: 0, totalVal: 0 };
      }

      const now = new Date().toISOString();
      let totalVal = 0;

      // 1. Safety snapshot
      createSnapshot(
        `[Auto-Snapshot] Pre-Vinted Active Listings Import`,
        `Safety checkpoint before importing ${itemsToImport.length} active Vinted listing(s) to ${destination}.`
      );

      captureUndoState(`Imported ${itemsToImport.length} Vinted active listings`);

      if (destination === 'selling') {
        const newSales: SaleItem[] = itemsToImport.map((ex) => {
          const price =
            typeof ex.price === 'number'
              ? ex.price
              : parseFloat(String(ex.price || '0').replace(/[^0-9.]/g, '')) || 0;
          totalVal += price;
          const cat = normalizeCategoryName(inferCategoryFromTitle(ex.title), categories);
          return {
            id: generateUniqueId('sale'),
            name: ex.title || 'Vinted Listing',
            brand: ex.brand || 'Vinted',
            category: cat,
            condition: (ex.condition?.toLowerCase().includes('tag') ? 'Pristine / New' : 'Good') as Condition,
            color: ex.colour || '',
            originalPricePaid: 0,
            listingPrice: price,
            platform: 'Vinted',
            status: 'Listed',
            platformListingUrl: ex.url,
            imageUrl: ex.image || '',
            description: ex.description || '',
            tags: determineLifecycleTags({
              destination: 'selling',
              sellingStatus: (ex.status as SellingStatus) || 'Listed',
              isVinted: true,
              existingTags: ex.tags || ['active-listing'],
              sourceType: 'account-scrape',
            }),
            listedDate: now.slice(0, 10),
            createdAt: now,
            updatedAt: now,
            notes: ex.seller ? `Seller: @${ex.seller}` : '',
          };
        });

        setSaleItems((prev) => [...newSales, ...prev]);

        recordChange(
          'VINTED_EXTRACT',
          'sale_item',
          `${newSales.length} Active Vinted Listings`,
          `Added ${newSales.length} live Vinted listings to Resale manager (£${totalVal.toFixed(2)} total listed).`,
          undefined,
          {
            financialImpact: totalVal,
            newValue: newSales,
            deletedEntities: newSales,
          }
        );
      } else if (destination === 'shopping') {
        const newShop: ShoppingItem[] = itemsToImport.map((ex) => {
          const price =
            typeof ex.price === 'number'
              ? ex.price
              : parseFloat(String(ex.price || '0').replace(/[^0-9.]/g, '')) || 0;
          totalVal += price;
          const cat = normalizeCategoryName(inferCategoryFromTitle(ex.title), categories);
          return {
            id: generateUniqueId('shop'),
            name: ex.title || 'Vinted Item',
            brand: ex.brand || 'Vinted',
            category: cat,
            estimatedPrice: price,
            priority: 'High',
            status: 'To Buy',
            season: 'All-Season',
            matchingWardrobeItemIds: [],
            reasonOrGap:
              [ex.description, ex.seller ? `Seller: @${ex.seller}` : '', ex.condition]
                .filter(Boolean)
                .join(' · ') || 'Active Vinted listing watched',
            targetStoreUrl: ex.url,
            imageUrl: ex.image || '',
            tags: determineLifecycleTags({
              destination: 'shopping',
              shoppingStatus: 'To Buy',
              isVinted: true,
              existingTags: ex.tags || ['watching'],
              sourceType: 'account-scrape',
            }),
            addedDate: now.slice(0, 10),
            createdAt: now,
            vintedUrl: ex.url,
          };
        });

        setShoppingList((prev) => [...newShop, ...prev]);

        recordChange(
          'VINTED_EXTRACT',
          'shopping_item',
          `${newShop.length} Vinted Items Watched`,
          `Added ${newShop.length} active Vinted pieces to Wishlist / To Buy (£${totalVal.toFixed(2)} estimated).`,
          undefined,
          {
            financialImpact: totalVal,
            newValue: newShop,
            deletedEntities: newShop,
          }
        );
      } else {
        // Wardrobe
        const newWardrobe: WardrobeItem[] = itemsToImport.map((ex) => {
          const price =
            typeof ex.price === 'number'
              ? ex.price
              : parseFloat(String(ex.price || '0').replace(/[^0-9.]/g, '')) || 0;
          totalVal += price;
          const cat = normalizeCategoryName(inferCategoryFromTitle(ex.title), categories);
          return {
            id: generateUniqueId('item'),
            name: ex.title || 'Vinted Garment',
            brand: ex.brand || 'Vinted',
            category: cat,
            color: ex.colour || 'Various',
            season: ['All-Season'],
            purchasePrice: price,
            purchaseDate: now.slice(0, 10),
            wearCount: 0,
            imageUrl: ex.image || '',
            retailerName: 'Vinted',
            vintedUrl: ex.url,
            condition: (ex.condition?.toLowerCase().includes('tag') ? 'Pristine / New' : 'Good') as Condition,
            isFavorite: false,
            isArchived: false,
            tags: determineLifecycleTags({
              destination: 'wardrobe',
              isVinted: true,
              existingTags: ex.tags || ['pre-owned'],
              sourceType: 'account-scrape',
            }),
            notes: [ex.description, ex.seller ? `Seller: @${ex.seller}` : ''].filter(Boolean).join(' · '),
            createdAt: now,
            updatedAt: now,
          };
        });

        setItems((prev) => [...newWardrobe, ...prev]);

        recordChange(
          'VINTED_EXTRACT',
          'wardrobe_item',
          `${newWardrobe.length} Vinted Garments Added`,
          `Added ${newWardrobe.length} garments extracted from Vinted into wardrobe (£${totalVal.toFixed(2)}).`,
          undefined,
          {
            financialImpact: totalVal,
            newValue: newWardrobe,
            deletedEntities: newWardrobe,
          }
        );
      }

      return { importedCount: itemsToImport.length, totalVal };
    },
    [categories, createSnapshot, captureUndoState, recordChange]
  );

  // 19. EXPORT DATA JSON BACKUP
  const exportDataJSON = useCallback(() => {
    const exportPayload = {
      app: 'Wardrobe & Lookbook Studio',
      currency: 'GBP (£)',
      exportedAt: new Date().toISOString(),
      schemaVersion: '2.4.0',
      items,
      outfits,
      shoppingList,
      saleItems,
      snapshots,
      changeLogs,
      categories,
      monthlyBudget,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wardrobe_studio_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [items, outfits, shoppingList, saleItems, snapshots, changeLogs, categories, monthlyBudget]);
            
  // 20. IMPORT DATA JSON
  const importDataJSON = useCallback(
    (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed.items || !Array.isArray(parsed.items)) {
          return { success: false, message: 'Invalid JSON schema: Missing items array.' };
        }

        setItems(parsed.items);
        if (Array.isArray(parsed.outfits)) setOutfits(parsed.outfits);
        if (Array.isArray(parsed.shoppingList)) setShoppingList(parsed.shoppingList);
        if (Array.isArray(parsed.saleItems)) setSaleItems(parsed.saleItems);
        if (Array.isArray(parsed.snapshots)) setSnapshots(parsed.snapshots);
            if (Array.isArray(parsed.categories) && parsed.categories.length > 0) setCategories(parsed.categories);
        if (parsed.monthlyBudget) setMonthlyBudget(parsed.monthlyBudget);

        recordChange(
          'BULK_IMPORT',
          'system',
          'JSON Backup Restore',
          `Imported full wardrobe backup containing ${parsed.items.length} items and ${parsed.outfits?.length || 0} looks.`
        );

        return { success: true, message: `Successfully restored ${parsed.items.length} items and ${parsed.outfits?.length || 0} looks.` };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to parse JSON file.' };
      }
    },
    [recordChange]
  );

  // CATEGORY MANAGEMENT
  const addCategory = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      captureUndoState(`Created category "${trimmed}"`);
      setCategories((prev) => {
        if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
        return [...prev, trimmed];
      });
      recordChange(
        'ITEM_UPDATED',
        'system',
        `Category: ${trimmed}`,
        `Created new custom category "${trimmed}".`
      );
    },
    [captureUndoState, recordChange]
  );

  const updateCategory = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;

      captureUndoState(`Renamed category "${oldName}" to "${trimmed}"`);
      setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));

      // Update in items
      setItems((prev) =>
        prev.map((item) => (item.category === oldName ? { ...item, category: trimmed } : item))
      );

      // Update in shopping list
      setShoppingList((prev) =>
        prev.map((s) => (s.category === oldName ? { ...s, category: trimmed } : s))
      );

      // Update in sale items
      setSaleItems((prev) =>
        prev.map((s) => (s.category === oldName ? { ...s, category: trimmed } : s))
      );

      recordChange(
        'ITEM_UPDATED',
        'system',
        `Category Renamed`,
        `Renamed category "${oldName}" to "${trimmed}".`
      );
    },
    [captureUndoState, recordChange]
  );

  const deleteCategory = useCallback(
    (nameToDelete: string) => {
      captureUndoState(`Deleted category "${nameToDelete}"`);
      setCategories((prev) => {
        const remaining = prev.filter((c) => c !== nameToDelete);
        const fallback = remaining[0] || 'Tops';

        // Reassign affected items
        setItems((itemPrev) =>
          itemPrev.map((item) =>
            item.category === nameToDelete ? { ...item, category: fallback } : item
          )
        );

        // Reassign affected shopping items
        setShoppingList((shopPrev) =>
          shopPrev.map((s) =>
            s.category === nameToDelete ? { ...s, category: fallback } : s
          )
        );

        // Reassign affected sale items
        setSaleItems((salePrev) =>
          salePrev.map((s) =>
            s.category === nameToDelete ? { ...s, category: fallback } : s
          )
        );

        return remaining;
      });

      recordChange(
        'ITEM_DELETED',
        'system',
        `Category: ${nameToDelete}`,
        `Deleted category "${nameToDelete}".`
      );
    },
    [captureUndoState, recordChange]
  );

  const resetCategories = useCallback(() => {
    captureUndoState('Reset categories to default');
    setCategories(DEFAULT_CATEGORIES);
  }, [captureUndoState]);

  // 21. RESET TO DEFAULT DATA
  const resetToDefaultData = useCallback(() => {
    setItems(INITIAL_WARDROBE_ITEMS);
    setOutfits(INITIAL_LOOKBOOK_OUTFITS);
    setShoppingList(INITIAL_SHOPPING_LIST);
    setSaleItems(INITIAL_SALE_ITEMS);
    setChangeLogs(INITIAL_VERSION_LOGS);
    setSnapshots(INITIAL_SNAPSHOTS);
    setCategories(DEFAULT_CATEGORIES);
    setMonthlyBudget(350);
  }, []);

  // 22. CLEAR ENTIRE DATABASE / PURGE DATA
  const clearDatabase = useCallback(() => {
    setItems([]);
    setOutfits([]);
    setShoppingList([]);
    setSaleItems([]);
    setSnapshots([]);
    const resetLog: VersionChangeLog = {
      id: generateUniqueId('log'),
      versionNumber: 1,
      timestamp: new Date().toISOString(),
      actionType: 'ITEM_DELETED',
      entityType: 'system',
      entityTitle: 'Database Cleared',
      summary: 'Cleared all wardrobe items, lookbooks, shopping list, and snapshots.',
      author: 'Graeme (User)',
    };
    setChangeLogs([resetLog]);
    try {
      localStorage.removeItem(`${STORAGE_KEY}_items`);
      localStorage.removeItem(`${STORAGE_KEY}_outfits`);
      localStorage.removeItem(`${STORAGE_KEY}_shopping`);
      localStorage.removeItem(`${STORAGE_KEY}_sales`);
      localStorage.removeItem(`${STORAGE_KEY}_snapshots`);
      localStorage.removeItem(`${STORAGE_KEY}_logs`);
    } catch (e) {
      console.error('Failed clearing local storage keys', e);
    }
  }, []);

  // Compute spent this month
  const spentThisMonth = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7); // e.g. 2026-08
    return items
      .filter((i) => i.purchaseDate?.startsWith(currentMonthPrefix))
      .reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
  }, [items]);

  // Comprehensive Computed Statistics
  const stats = useMemo(() => {
    const activeItems = items.filter((i) => !i.isArchived);
    const archivedItems = items.filter((i) => i.isArchived);
    const totalItems = items.length;
    const activeInventoryCount = activeItems.length;
    const archivedItemsCount = archivedItems.length;
    const totalValuationGbp = activeItems.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
    const totalWearsRecorded = activeItems.reduce((sum, i) => sum + (i.wearCount || 0), 0);
    const averageCostPerWearGbp =
      totalWearsRecorded > 0 ? totalValuationGbp / totalWearsRecorded : totalValuationGbp;

    const purchasedList = shoppingList.filter((s) => s.status === 'Purchased');
    const wishlistQueue = shoppingList.filter((s) => s.status === 'To Buy' || s.status === 'In Basket');
    const purchasedItemsCount = purchasedList.length;
    const wishlistItemsCount = wishlistQueue.length;
    const totalShoppingItemsCount = shoppingList.length;

    const wishlistTotalGbp = wishlistQueue.reduce((sum, s) => sum + (s.estimatedPrice || 0), 0);

    const budgetRemainingGbp = monthlyBudget - spentThisMonth;

    // Top worn items
    const topWornItems = [...activeItems]
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, 5);

    // Underutilized items (worn < 5 times and owned for more than 30 days)
    const underutilizedItems = [...activeItems]
      .filter((i) => i.wearCount < 5)
      .sort((a, b) => a.wearCount - b.wearCount)
      .slice(0, 5);

    // Most worn wardrobe staples (highest wear frequency)
    const bestValueItems = [...activeItems]
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, 5);

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    activeItems.forEach((i) => {
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    });

    // Resale and sales statistics
    const completedOrSold = saleItems.filter(
      (s) => s.status === 'Sold' || s.status === 'Shipped' || s.status === 'Completed'
    );
    const activeListings = saleItems.filter((s) => s.status === 'Listed' || s.status === 'Reserved');
    const draftListings = saleItems.filter((s) => s.status === 'Draft');

    const totalRevenueGbp = completedOrSold.reduce(
      (sum, s) => sum + (s.soldPrice !== undefined ? s.soldPrice : s.listingPrice || 0),
      0
    );
    const totalFeesGbp = completedOrSold.reduce(
      (sum, s) => sum + (s.platformFees || 0) + (s.shippingCostPaidBySeller || 0),
      0
    );
    const totalOriginalCostSoldGbp = completedOrSold.reduce(
      (sum, s) => sum + (s.originalPricePaid || 0),
      0
    );
    const totalNetProfitGbp = totalRevenueGbp - totalOriginalCostSoldGbp - totalFeesGbp;
    const profitMarginPercent =
      totalRevenueGbp > 0 ? (totalNetProfitGbp / totalRevenueGbp) * 100 : 0;
    const activeListingsValueGbp = activeListings.reduce((sum, s) => sum + (s.listingPrice || 0), 0);

    const platformBreakdown: Record<string, { count: number; revenueGbp: number }> = {};
    completedOrSold.forEach((s) => {
      const p = s.platform || 'Other';
      if (!platformBreakdown[p]) platformBreakdown[p] = { count: 0, revenueGbp: 0 };
      platformBreakdown[p].count += 1;
      platformBreakdown[p].revenueGbp += s.soldPrice !== undefined ? s.soldPrice : s.listingPrice || 0;
    });

    const salesStats = {
      totalRevenueGbp,
      totalNetProfitGbp,
      profitMarginPercent,
      activeListingsCount: activeListings.length,
      activeListingsValueGbp,
      soldItemsCount: completedOrSold.length,
      shippedItemsCount: saleItems.filter((s) => s.status === 'Shipped').length,
      draftItemsCount: draftListings.length,
      totalFeesGbp,
      platformBreakdown,
    };

    return {
      totalItems,
      activeInventoryCount,
      archivedItemsCount,
      totalValuationGbp,
      averageCostPerWearGbp,
      totalWearsRecorded,
      totalOutfitsCount: outfits.length,
      wishlistTotalGbp,
      purchasedItemsCount,
      wishlistItemsCount,
      totalShoppingItemsCount,
      budgetRemainingGbp,
      topWornItems,
      underutilizedItems,
      bestValueItems,
      categoryCounts,
      salesStats,
    };
  }, [items, outfits.length, shoppingList, saleItems, monthlyBudget, spentThisMonth]);

  const value = useMemo(
    () => ({
      items,
      outfits,
      shoppingList,
      saleItems,
      changeLogs,
      snapshots,
      categories,
      monthlyBudget,
      spentThisMonth,
      currentVersion,
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      settings,
      updateSettings,
      resetSettings,
      formatCurrency,
      undoLastAction,
      canUndo: undoStack.length > 0,
      undoToast,
      dismissUndoToast,
      deleteMultipleItems,
      deleteMultipleShoppingItems,
      deleteMultipleSaleItems,
      deleteMultipleOutfits,
      batchUpdateItems,
      batchUpdateShoppingItems,
      batchUpdateSaleItems,
      batchUpdateOutfits,
      batchAddItems,
      batchAddShoppingItems,
      batchAddSaleItems,
      renameTagGlobally,
      deleteTagGlobally,
      renameBrandGlobally,
      addCategory,
      updateCategory,
      deleteCategory,
      resetCategories,
      addItem,
      updateItem,
      deleteItem,
      logItemWear,
      toggleItemFavorite,
      addOutfit,
      updateOutfit,
      deleteOutfit,
      logOutfitWear,
      toggleOutfitFavorite,
      addShoppingItem,
      updateShoppingItem,
      deleteShoppingItem,
      purchaseShoppingItem,
      moveShoppingItemToSales,
      moveShoppingItemToWardrobe,
      moveWardrobeItemToSales,
      moveWardrobeItemToShopping,
      moveSaleItemToWardrobe,
      moveSaleItemToShopping,
      moveMultipleShoppingItems,
      moveMultipleWardrobeItems,
      moveMultipleSaleItems,
      addSaleItem,
      updateSaleItem,
      deleteSaleItem,
      markItemAsSold,
      listWardrobeItemForSale,
      batchUpdateSaleItemsStatus,
      mergeWardrobeItems,
      mergeShoppingItems,
      mergeSaleItems,
      mergeCrossCollectionItems,
      batchAutoMergeDuplicates,
      autoMergeAllDuplicates,
      createSnapshot,
      restoreSnapshot,
      deleteSnapshot,
      cleanupAutoSnapshots,
      lastAutoSnapshotTime,
      triggerAutoSnapshot,
      restoreTimelineEntryItem,
      restoreTimelineState,
      canRestoreEntry,
      syncVintedOrderStatuses,
      syncVintedAccountOrders,
      importVintedExtractedListings,
      updateMonthlyBudget,
      exportDataJSON,
      importDataJSON,
      resetToDefaultData,
      clearDatabase,
      stats,
    }),
    [
      items,
      outfits,
      shoppingList,
      saleItems,
      changeLogs,
      snapshots,
      categories,
      monthlyBudget,
      spentThisMonth,
      currentVersion,
      activeTab,
      searchQuery,
      settings,
      updateSettings,
      resetSettings,
      formatCurrency,
      undoLastAction,
      undoStack.length,
      undoToast,
      dismissUndoToast,
      deleteMultipleItems,
      deleteMultipleShoppingItems,
      deleteMultipleSaleItems,
      deleteMultipleOutfits,
      batchUpdateItems,
      batchUpdateShoppingItems,
      batchUpdateSaleItems,
      batchUpdateOutfits,
      batchAddItems,
      batchAddShoppingItems,
      batchAddSaleItems,
      renameTagGlobally,
      deleteTagGlobally,
      renameBrandGlobally,
      addCategory,
      updateCategory,
      deleteCategory,
      resetCategories,
      addItem,
      updateItem,
      deleteItem,
      logItemWear,
      toggleItemFavorite,
      addOutfit,
      updateOutfit,
      deleteOutfit,
      logOutfitWear,
      toggleOutfitFavorite,
      addShoppingItem,
      updateShoppingItem,
      deleteShoppingItem,
      purchaseShoppingItem,
      moveShoppingItemToSales,
      moveShoppingItemToWardrobe,
      moveWardrobeItemToSales,
      moveWardrobeItemToShopping,
      moveSaleItemToWardrobe,
      moveSaleItemToShopping,
      moveMultipleShoppingItems,
      moveMultipleWardrobeItems,
      moveMultipleSaleItems,
      addSaleItem,
      updateSaleItem,
      deleteSaleItem,
      markItemAsSold,
      listWardrobeItemForSale,
      batchUpdateSaleItemsStatus,
      mergeWardrobeItems,
      mergeShoppingItems,
      mergeSaleItems,
      mergeCrossCollectionItems,
      batchAutoMergeDuplicates,
      autoMergeAllDuplicates,
      createSnapshot,
      restoreSnapshot,
      deleteSnapshot,
      cleanupAutoSnapshots,
      lastAutoSnapshotTime,
      triggerAutoSnapshot,
      restoreTimelineEntryItem,
      restoreTimelineState,
      canRestoreEntry,
      syncVintedOrderStatuses,
      syncVintedAccountOrders,
      importVintedExtractedListings,
      updateMonthlyBudget,
      exportDataJSON,
      importDataJSON,
      resetToDefaultData,
      clearDatabase,
      stats,
    ]
  );

  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
};

export const useWardrobe = () => {
  const context = useContext(WardrobeContext);
  if (!context) {
    throw new Error('useWardrobe must be used within a WardrobeProvider');
  }
  return context;
};
