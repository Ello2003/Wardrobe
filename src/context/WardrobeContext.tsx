import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  INITIAL_WARDROBE_ITEMS,
  INITIAL_LOOKBOOK_OUTFITS,
  INITIAL_SHOPPING_LIST,
  INITIAL_SALE_ITEMS,
  INITIAL_VERSION_LOGS,
  INITIAL_SNAPSHOTS,
} from '../data/initialData';

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
  addItem: (itemData: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>) => string;
  updateItem: (id: string, updates: Partial<WardrobeItem>) => void;
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

  // Snapshot & Versioning Actions
  createSnapshot: (name: string, description?: string) => string;
  restoreSnapshot: (snapshotId: string) => boolean;
  deleteSnapshot: (snapshotId: string) => void;

  // Budget & System Actions
  syncVintedOrderStatuses: () => number;
  updateMonthlyBudget: (newBudgetGbp: number) => void;
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => { success: boolean; message: string };
  resetToDefaultData: () => void;
  clearDatabase: () => void;

  // Computed Metrics
  stats: {
    totalItems: number;
    totalValuationGbp: number;
    averageCostPerWearGbp: number;
    totalWearsRecorded: number;
    totalOutfitsCount: number;
    wishlistTotalGbp: number;
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
  // Load initial state with localStorage fallback
  const [items, setItems] = useState<WardrobeItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_items`);
      const raw: WardrobeItem[] = saved ? JSON.parse(saved) : INITIAL_WARDROBE_ITEMS;
      return raw.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
    } catch {
      return INITIAL_WARDROBE_ITEMS.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
    }
  });

  const [outfits, setOutfits] = useState<LookbookOutfit[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_outfits`);
      return saved ? JSON.parse(saved) : INITIAL_LOOKBOOK_OUTFITS;
    } catch {
      return INITIAL_LOOKBOOK_OUTFITS;
    }
  });

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_shopping`);
      const raw: ShoppingItem[] = saved ? JSON.parse(saved) : INITIAL_SHOPPING_LIST;
      return raw.map((item) => {
        const norm = normalizeShoppingItem(item);
        return {
          ...norm,
          category: normalizeCategoryName(norm.category) as Category,
        };
      });
    } catch {
      return INITIAL_SHOPPING_LIST.map((item) => {
        const norm = normalizeShoppingItem(item);
        return {
          ...norm,
          category: normalizeCategoryName(norm.category) as Category,
        };
      });
    }
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
      const raw: SaleItem[] = saved ? JSON.parse(saved) : INITIAL_SALE_ITEMS;
      return raw.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
    } catch {
      return INITIAL_SALE_ITEMS.map((item) => ({
        ...item,
        category: normalizeCategoryName(item.category) as Category,
      }));
    }
  });

  const [changeLogs, setChangeLogs] = useState<VersionChangeLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_logs`);
      return saved ? JSON.parse(saved) : INITIAL_VERSION_LOGS;
    } catch {
      return INITIAL_VERSION_LOGS;
    }
  });

  const [snapshots, setSnapshots] = useState<WardrobeSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_snapshots`);
      return saved ? JSON.parse(saved) : INITIAL_SNAPSHOTS;
    } catch {
      return INITIAL_SNAPSHOTS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
      return saved ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) } : DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_budget`);
      return saved ? JSON.parse(saved) : 350;
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

  // Current version number = total logs count
  const currentVersion = changeLogs.length > 0 ? changeLogs[0].versionNumber : 1;

  // Helper to append a structured change log entry
  const recordChange = useCallback(
    (
      actionType: VersionChangeLog['actionType'],
      entityType: VersionChangeLog['entityType'],
      entityTitle: string,
      summary: string,
      entityId?: string,
      details?: VersionChangeLog['details']
    ) => {
      setChangeLogs((prev) => {
        const nextVersion = prev.length > 0 ? prev[0].versionNumber + 1 : 1;
        const newLog: VersionChangeLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          versionNumber: nextVersion,
          timestamp: new Date().toISOString(),
          actionType,
          entityType,
          entityId,
          entityTitle,
          summary,
          details,
          author: 'Graeme (User)',
        };
        return [newLog, ...prev];
      });
    },
    []
  );

  // CREATE SNAPSHOT CHECKPOINT (Available for batch actions and manual snapshots)
  const createSnapshot = useCallback(
    (name: string, description = '') => {
      const snapId = `snap-${Date.now()}`;
      const totalVal = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
      const nextVersion = changeLogs.length > 0 ? changeLogs[0].versionNumber + 1 : 1;

      const newSnapshot: WardrobeSnapshot = {
        id: snapId,
        versionNumber: nextVersion,
        name: name.trim() || `Wardrobe Snapshot #${snapshots.length + 1}`,
        description: description || `Checkpoint of ${items.length} items (£${totalVal} valuation), ${outfits.length} looks, ${shoppingList.length} wishlist pieces, ${saleItems.length} sales listings.`,
        createdAt: new Date().toISOString(),
        itemCount: items.length,
        totalValuation: totalVal,
        outfitCount: outfits.length,
        wishlistCount: shoppingList.length,
        data: {
          items: JSON.parse(JSON.stringify(items)),
          outfits: JSON.parse(JSON.stringify(outfits)),
          shoppingList: JSON.parse(JSON.stringify(shoppingList)),
          saleItems: JSON.parse(JSON.stringify(saleItems)),
          monthlyBudget,
        },
      };

      setSnapshots((prev) => [newSnapshot, ...prev]);
      recordChange(
        'SNAPSHOT_CREATED',
        'snapshot',
        newSnapshot.name,
        `Created wardrobe version snapshot "${newSnapshot.name}" (${newSnapshot.itemCount} items, £${totalVal} total value).`,
        snapId,
        {
          financialImpact: totalVal,
        }
      );

      return snapId;
    },
    [items, outfits, shoppingList, saleItems, monthlyBudget, changeLogs, snapshots.length, recordChange]
  );

  // 1. ADD WARDROBE ITEM
  const addItem = useCallback(
    (itemData: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>) => {
      const now = new Date().toISOString();
      const id = `item-${Date.now()}`;
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
    [captureUndoState, recordChange]
  );

  // 2. UPDATE WARDROBE ITEM
  const updateItem = useCallback(
    (id: string, updates: Partial<WardrobeItem>) => {
      const targetItem = items.find((i) => i.id === id);
      if (targetItem) {
        captureUndoState(`Updated "${targetItem.brand} ${targetItem.name}"`);
      }
      setItems((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (!existing) return prev;
        const normalizedCategory = updates.category
          ? (normalizeCategoryName(updates.category) as Category)
          : existing.category;
        const updatedItem = {
          ...existing,
          ...updates,
          category: normalizedCategory,
          updatedAt: new Date().toISOString(),
        };

        recordChange(
          'ITEM_UPDATED',
          'wardrobe_item',
          `${updatedItem.brand} ${updatedItem.name}`,
          `Updated details for "${updatedItem.brand} ${updatedItem.name}".`,
          id,
          {
            oldValue: existing,
            newValue: updatedItem,
          }
        );

        return prev.map((item) => (item.id === id ? updatedItem : item));
      });
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
      const created: WardrobeItem[] = itemsData.map((data, idx) => ({
        ...data,
        id: `item-${Date.now()}-${idx}`,
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
      const id = `look-${Date.now()}`;
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
          id
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
      const id = `shop-${Date.now()}`;
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
          id
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
        `Bulk removed ${itemsToDelete.length} items from shopping list (£${totalVal.toFixed(2)} total value).`
      );
    },
    [shoppingList, createSnapshot, captureUndoState, recordChange]
  );

  // 13c. BATCH ADD SHOPPING ITEMS (Auto-Snapshot + Undo)
  const batchAddShoppingItems = useCallback(
    (itemsData: Array<Omit<ShoppingItem, 'id' | 'addedDate'>>, customTitle?: string) => {
      if (!itemsData || itemsData.length === 0) return [];
      const today = new Date().toISOString().split('T')[0];
      const created: ShoppingItem[] = itemsData.map((data, idx) => {
        const raw: ShoppingItem = {
          ...data,
          id: `shop-${Date.now()}-${idx}`,
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
      const wardrobeItemId = `item-${Date.now()}`;
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
      const id = `sale-${Date.now()}`;
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
        undefined
      );
    },
    [saleItems, captureUndoState, recordChange]
  );

  const batchAddSaleItems = useCallback(
    (itemsData: Array<Omit<SaleItem, 'id' | 'createdAt' | 'updatedAt'>>, customTitle?: string) => {
      if (!itemsData || itemsData.length === 0) return [];
      const now = new Date().toISOString();
      const created: SaleItem[] = itemsData.map((data, idx) => ({
        ...data,
        id: `sale-${Date.now()}-${idx}`,
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
      const saleId = `sale-${Date.now()}`;

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
      const saleId = `sale-${Date.now()}`;
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
      const shopId = `shop-${Date.now()}`;
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
      const wardrobeId = `item-${Date.now()}`;

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
      const shopId = `shop-${Date.now()}`;

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

  // 17. MERGE DUPLICATES ACTIONS
  const mergeWardrobeItems = useCallback(
    (
      primaryId: string,
      secondaryIds: string[],
      customMerged?: Partial<WardrobeItem>
    ) => {
      if (!primaryId || !secondaryIds || secondaryIds.length === 0) return;
      captureUndoState(`Merged ${secondaryIds.length + 1} wardrobe items`);

      const now = new Date().toISOString();

      setItems((prev) => {
        const primary = prev.find((i) => i.id === primaryId);
        if (!primary) return prev;

        const secondaries = prev.filter((i) => secondaryIds.includes(i.id));
        const allTags = Array.from(
          new Set([
            ...(primary.tags || []),
            ...secondaries.flatMap((s) => s.tags || []),
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
        const fallbackColor = primary.color || secondaries.find((s) => s.color)?.color || 'Unspecified';
        const fallbackColorHex = primary.colorHex || secondaries.find((s) => s.colorHex)?.colorHex;
        const fallbackSize = primary.size || secondaries.find((s) => s.size)?.size;
        const fallbackMaterial = primary.material || secondaries.find((s) => s.material)?.material;
        const fallbackCare = primary.careNotes || secondaries.find((s) => s.careNotes)?.careNotes;
        const fallbackLocation = primary.storageLocation || secondaries.find((s) => s.storageLocation)?.storageLocation;
        const fallbackSubcategory = primary.subcategory || secondaries.find((s) => s.subcategory)?.subcategory;
        const fallbackSeller = primary.seller || secondaries.find((s) => s.seller)?.seller;

        const mergedNotes = [
          primary.notes,
          ...secondaries.map((s) => s.notes).filter(Boolean),
        ]
          .filter(Boolean)
          .join(' | ');

        const mergedItem: WardrobeItem = {
          ...primary,
          color: fallbackColor,
          colorHex: fallbackColorHex,
          size: fallbackSize,
          material: fallbackMaterial,
          careNotes: fallbackCare,
          storageLocation: fallbackLocation,
          subcategory: fallbackSubcategory,
          seller: fallbackSeller,
          ...customMerged,
          tags: customMerged?.tags || allTags,
          wearCount: customMerged?.wearCount !== undefined ? customMerged.wearCount : combinedWearCount,
          currentValuation: customMerged?.currentValuation || maxValuation,
          notes: customMerged?.notes !== undefined ? customMerged.notes : mergedNotes || undefined,
          updatedAt: now,
        };

        const remaining = prev.filter((i) => !secondaryIds.includes(i.id));
        return remaining.map((i) => (i.id === primaryId ? mergedItem : i));
      });

      // Update Lookbook outfits referencing secondaries
      setOutfits((prev) =>
        prev.map((outfit) => {
          const updatedItemIds = outfit.itemIds.map((id) =>
            secondaryIds.includes(id) ? primaryId : id
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
        `Merged ${secondaryIds.length + 1} Wardrobe Items`,
        `Consolidated duplicate items into master record.`,
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
      if (!primaryId || !secondaryIds || secondaryIds.length === 0) return;
      captureUndoState(`Merged ${secondaryIds.length + 1} shopping items`);

      setShoppingList((prev) => {
        const primary = prev.find((i) => i.id === primaryId);
        if (!primary) return prev;

        const secondaries = prev.filter((i) => secondaryIds.includes(i.id));
        const allTags = Array.from(
          new Set([
            ...(primary.tags || []),
            ...secondaries.flatMap((s) => s.tags || []),
          ])
        );
        const allMatching = Array.from(
          new Set([
            ...(primary.matchingWardrobeItemIds || []),
            ...secondaries.flatMap((s) => s.matchingWardrobeItemIds || []),
          ])
        );

        const fallbackColor = primary.color || secondaries.find((s) => s.color)?.color;
        const fallbackSize = primary.size || secondaries.find((s) => s.size)?.size;
        const fallbackMaterial = primary.material || secondaries.find((s) => s.material)?.material;
        const fallbackSeller = primary.seller || secondaries.find((s) => s.seller)?.seller;
        const fallbackRetailer = primary.retailerName || secondaries.find((s) => s.retailerName)?.retailerName;

        const mergedReason = [
          primary.reasonOrGap,
          ...secondaries.map((s) => s.reasonOrGap).filter(Boolean),
        ]
          .filter(Boolean)
          .join(' | ');

        const mergedItem: ShoppingItem = {
          ...primary,
          color: fallbackColor,
          size: fallbackSize,
          material: fallbackMaterial,
          seller: fallbackSeller,
          retailerName: fallbackRetailer,
          ...customMerged,
          tags: customMerged?.tags || allTags,
          matchingWardrobeItemIds: customMerged?.matchingWardrobeItemIds || allMatching,
          reasonOrGap: customMerged?.reasonOrGap || mergedReason,
        };

        const remaining = prev.filter((i) => !secondaryIds.includes(i.id));
        return remaining.map((i) => (i.id === primaryId ? mergedItem : i));
      });

      recordChange(
        'WISHLIST_UPDATED',
        'shopping_item',
        `Merged ${secondaryIds.length + 1} Shopping Items`,
        `Consolidated duplicate wishlist items.`,
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
      if (!primaryId || !secondaryIds || secondaryIds.length === 0) return;
      captureUndoState(`Merged ${secondaryIds.length + 1} sale items`);
      const now = new Date().toISOString();

      setSaleItems((prev) => {
        const primary = prev.find((i) => i.id === primaryId);
        if (!primary) return prev;

        const secondaries = prev.filter((i) => secondaryIds.includes(i.id));
        const allTags = Array.from(
          new Set([
            ...(primary.tags || []),
            ...secondaries.flatMap((s) => s.tags || []),
          ])
        );

        const fallbackColor = primary.color || secondaries.find((s) => s.color)?.color;
        const fallbackSize = primary.size || secondaries.find((s) => s.size)?.size;
        const fallbackDescription = primary.description || secondaries.find((s) => s.description)?.description;
        const fallbackBuyer = primary.buyerUsername || secondaries.find((s) => s.buyerUsername)?.buyerUsername;

        const mergedNotes = [
          primary.notes,
          ...secondaries.map((s) => s.notes).filter(Boolean),
        ]
          .filter(Boolean)
          .join(' | ');

        const mergedItem: SaleItem = {
          ...primary,
          color: fallbackColor,
          size: fallbackSize,
          description: fallbackDescription,
          buyerUsername: fallbackBuyer,
          ...customMerged,
          tags: customMerged?.tags || allTags,
          notes: customMerged?.notes !== undefined ? customMerged.notes : mergedNotes || undefined,
          updatedAt: now,
        };

        const remaining = prev.filter((i) => !secondaryIds.includes(i.id));
        return remaining.map((i) => (i.id === primaryId ? mergedItem : i));
      });

      recordChange(
        'SALE_UPDATED',
        'sale_item',
        `Merged ${secondaryIds.length + 1} Sale Items`,
        `Consolidated duplicate listings into primary record.`,
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
      captureUndoState(`Merged cross-collection duplicate items`);
      secondaryItems.forEach((sec) => {
        if (sec.collection === 'wardrobe') {
          setItems((prev) => prev.filter((i) => i.id !== sec.id));
          setOutfits((prev) =>
            prev.map((o) => ({
              ...o,
              itemIds: o.itemIds.filter((id) => id !== sec.id),
            }))
          );
        } else if (sec.collection === 'shopping') {
          setShoppingList((prev) => prev.filter((i) => i.id !== sec.id));
        } else if (sec.collection === 'selling') {
          setSaleItems((prev) => prev.filter((i) => i.id !== sec.id));
        }
      });

      if (customMerged) {
        if (primaryCollection === 'wardrobe') {
          setItems((prev) =>
            prev.map((i) => (i.id === primaryId ? { ...i, ...customMerged, updatedAt: new Date().toISOString() } : i))
          );
        } else if (primaryCollection === 'shopping') {
          setShoppingList((prev) =>
            prev.map((i) => (i.id === primaryId ? { ...i, ...customMerged } : i))
          );
        } else if (primaryCollection === 'selling') {
          setSaleItems((prev) =>
            prev.map((i) => (i.id === primaryId ? { ...i, ...customMerged, updatedAt: new Date().toISOString() } : i))
          );
        }
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
      }>
    ) => {
      if (!clusters || clusters.length === 0) return 0;
      captureUndoState(`Auto-merged ${clusters.length} duplicate clusters`);

      let totalRemoved = 0;
      clusters.forEach((cluster) => {
        totalRemoved += cluster.secondary.length;
        if (
          cluster.primaryCollection === 'wardrobe' &&
          cluster.secondary.every((s) => s.collection === 'wardrobe')
        ) {
          mergeWardrobeItems(
            cluster.primaryId,
            cluster.secondary.map((s) => s.id)
          );
        } else if (
          cluster.primaryCollection === 'shopping' &&
          cluster.secondary.every((s) => s.collection === 'shopping')
        ) {
          mergeShoppingItems(
            cluster.primaryId,
            cluster.secondary.map((s) => s.id)
          );
        } else if (
          cluster.primaryCollection === 'selling' &&
          cluster.secondary.every((s) => s.collection === 'selling')
        ) {
          mergeSaleItems(
            cluster.primaryId,
            cluster.secondary.map((s) => s.id)
          );
        } else {
          mergeCrossCollectionItems(
            cluster.primaryCollection,
            cluster.primaryId,
            cluster.secondary
          );
        }
      });

      return totalRemoved;
    },
    [
      captureUndoState,
      mergeWardrobeItems,
      mergeShoppingItems,
      mergeSaleItems,
      mergeCrossCollectionItems,
    ]
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
        undefined
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

      setItems(snap.data.items || []);
      setOutfits(snap.data.outfits || []);
      setShoppingList(snap.data.shoppingList || []);
      if (snap.data.saleItems && Array.isArray(snap.data.saleItems)) setSaleItems(snap.data.saleItems);
      if (snap.data.monthlyBudget) setMonthlyBudget(snap.data.monthlyBudget);

      recordChange(
        'SNAPSHOT_RESTORED',
        'snapshot',
        snap.name,
        `Restored entire wardrobe state to snapshot "${snap.name}" (Version #${snap.versionNumber}, recorded on ${new Date(snap.createdAt).toLocaleDateString()}).`,
        snapshotId
      );

      return true;
    },
    [snapshots, recordChange]
  );

  // 17. DELETE SNAPSHOT
  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  }, []);

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
      monthlyBudget,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wardrobe_studio_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [items, outfits, shoppingList, saleItems, snapshots, changeLogs, monthlyBudget]);

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
      id: `log-${Date.now()}`,
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
    const totalItems = activeItems.length;
    const totalValuationGbp = activeItems.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
    const totalWearsRecorded = activeItems.reduce((sum, i) => sum + (i.wearCount || 0), 0);
    const averageCostPerWearGbp =
      totalWearsRecorded > 0 ? totalValuationGbp / totalWearsRecorded : totalValuationGbp;

    const wishlistTotalGbp = shoppingList
      .filter((s) => s.status === 'To Buy' || s.status === 'In Basket')
      .reduce((sum, s) => sum + (s.estimatedPrice || 0), 0);

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
      totalValuationGbp,
      averageCostPerWearGbp,
      totalWearsRecorded,
      totalOutfitsCount: outfits.length,
      wishlistTotalGbp,
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
      createSnapshot,
      restoreSnapshot,
      deleteSnapshot,
      syncVintedOrderStatuses,
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
      createSnapshot,
      restoreSnapshot,
      deleteSnapshot,
      syncVintedOrderStatuses,
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
