import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  ExternalLink,
  CheckCircle,
  Sparkles,
  Calculator,
  Trash2,
  Edit2,
  Link2,
  X,
  Check,
  CheckSquare,
  Tag,
  ChevronDown,
  RotateCcw,
  FolderUp,
  Files,
  Wallet,
  TrendingUp,
  PoundSterling,
  ArrowUpRight,
  PieChart,
  Sliders,
  LayoutGrid,
  Table,
  SlidersHorizontal,
  Layers,
  Eye,
  CheckCheck,
  Ban,
  Search,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { ShoppingItem, ShoppingPriority, ShoppingStatus, Category } from '../types';
import { AutoImportModal } from './AutoImportModal';
import { GarmentImage } from './GarmentImage';
import { BulkEditModal } from './BulkEditModal';
import {
  ShoppingDisplaySettingsModal,
  ShoppingDisplaySettings,
  DEFAULT_SHOPPING_DISPLAY_SETTINGS,
} from './ShoppingDisplaySettingsModal';
import { ShoppingDatabaseTable } from './ShoppingDatabaseTable';
import { DuplicateMergeModal } from './DuplicateMergeModal';

interface ShoppingViewProps {
  onOpenAddShoppingItem: () => void;
  onEditShoppingItem: (item: ShoppingItem) => void;
}

const STATUSES: (ShoppingStatus | 'All')[] = [
  'All',
  'To Buy',
  'In Basket',
  'Researching',
  'Purchased',
  'Sold',
  'Cancelled',
  'Passed',
];

const PRIORITIES: (ShoppingPriority | 'All')[] = [
  'All',
  'Essential / Must-Have',
  'High',
  'Medium',
  'Low / Wishlist',
];

export const ShoppingView: React.FC<ShoppingViewProps> = ({
  onOpenAddShoppingItem,
  onEditShoppingItem,
}) => {
  const {
    shoppingList,
    items,
    monthlyBudget,
    spentThisMonth,
    updateMonthlyBudget,
    updateShoppingItem,
    deleteShoppingItem,
    deleteMultipleShoppingItems,
    purchaseShoppingItem,
    stats,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    moveShoppingItemToSales,
    moveShoppingItemToWardrobe,
    moveMultipleShoppingItems,
    searchQuery,
    setSearchQuery,
    formatCurrency,
  } = useWardrobe();

  const [selectedStatus, setSelectedStatus] = useState<ShoppingStatus | 'All'>('All');
  const [selectedBrand, setSelectedBrand] = useState<string | 'All'>('All');
  const [selectedPriority, setSelectedPriority] = useState<ShoppingPriority | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [isEditingBudget, setIsEditingBudget] = useState<boolean>(false);
  const [tempBudgetInput, setTempBudgetInput] = useState<string>(monthlyBudget.toString());

  // Multi-Selection State & Actions
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  // Display Settings & Database View State
  const [displaySettings, setDisplaySettings] = useState<ShoppingDisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('shopping_display_settings');
      if (saved) return { ...DEFAULT_SHOPPING_DISPLAY_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
    return DEFAULT_SHOPPING_DISPLAY_SETTINGS;
  });
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);

  const handleUpdateDisplaySettings = (updated: ShoppingDisplaySettings) => {
    setDisplaySettings(updated);
    try {
      localStorage.setItem('shopping_display_settings', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      // ignore
    }
  };

  // Live sync from SettingsModal
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('shopping_display_settings');
        if (saved) {
          setDisplaySettings({ ...DEFAULT_SHOPPING_DISPLAY_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error('Failed to sync shopping display settings', e);
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('custom_display_settings_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('custom_display_settings_updated', handleSync);
    };
  }, []);

  // Category inline management state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Auto-Import State
  const [isAutoImportOpen, setIsAutoImportOpen] = useState(false);
  const [autoImportTab, setAutoImportTab] = useState<'url' | 'photo' | 'text' | 'vinted'>('url');
  const [quickUrl, setQuickUrl] = useState('');

  // Inline Editing State
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newTagInputItemId, setNewTagInputItemId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  // Purchase Modal state
  const [purchasingItem, setPurchasingItem] = useState<ShoppingItem | null>(null);
  const [actualPriceInput, setActualPriceInput] = useState<string>('');

  // Unique Brands with counts from shopping list
  const uniqueBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    shoppingList.forEach((it) => {
      const b = it.brand?.trim() || 'Unbranded';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, count]) => ({ brand, count }));
  }, [shoppingList]);

  const filteredItems = useMemo(() => {
    return shoppingList.filter((item) => {
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
      if (selectedBrand !== 'All' && item.brand !== selectedBrand) return false;
      if (selectedPriority !== 'All' && item.priority !== selectedPriority) return false;
      if (
        selectedCategory !== 'All' &&
        (item.category || '').trim().toLowerCase() !== selectedCategory.trim().toLowerCase()
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(query);
        const matchBrand = item.brand?.toLowerCase().includes(query);
        const matchCategory = item.category?.toLowerCase().includes(query);
        const matchRetailer = item.retailerName?.toLowerCase().includes(query);
        const matchReason = item.reasonOrGap?.toLowerCase().includes(query);
        const matchTags = Array.isArray(item.tags)
          ? item.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(query))
          : typeof item.tags === 'string'
          ? (item.tags as string).toLowerCase().includes(query)
          : false;
        const matchSeller = item.seller?.toLowerCase().includes(query);
        const matchBuyer = item.buyer?.toLowerCase().includes(query);
        const matchOrderStatus = item.orderStatus?.toLowerCase().includes(query);
        const matchStatus = item.status?.toLowerCase().includes(query);
        const matchPriority = item.priority?.toLowerCase().includes(query);
        const matchSeason = Array.isArray(item.season)
          ? item.season.some((s) => typeof s === 'string' && s.toLowerCase().includes(query))
          : typeof item.season === 'string'
          ? item.season.toLowerCase().includes(query)
          : false;
        if (
          !matchName &&
          !matchBrand &&
          !matchCategory &&
          !matchRetailer &&
          !matchReason &&
          !matchTags &&
          !matchSeller &&
          !matchBuyer &&
          !matchOrderStatus &&
          !matchStatus &&
          !matchPriority &&
          !matchSeason
        ) {
          return false;
        }
      }

      return true;
    });
  }, [shoppingList, selectedStatus, selectedBrand, selectedPriority, selectedCategory, searchQuery]);

  // Aggregated Financial & Pipeline Insights across all purchases
  const totalWishlistValuation = useMemo(() => {
    return shoppingList.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [shoppingList]);

  const activePipelineItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'To Buy' || s.status === 'In Basket');
  }, [shoppingList]);

  const activePipelineValue = useMemo(() => {
    return activePipelineItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [activePipelineItems]);

  const inBasketItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'In Basket');
  }, [shoppingList]);

  const inBasketValue = useMemo(() => {
    return inBasketItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [inBasketItems]);

  const toBuyItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'To Buy');
  }, [shoppingList]);

  const toBuyValue = useMemo(() => {
    return toBuyItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [toBuyItems]);

  const researchingItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'Researching');
  }, [shoppingList]);

  const researchingValue = useMemo(() => {
    return researchingItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [researchingItems]);

  const purchasedItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'Purchased');
  }, [shoppingList]);

  const purchasedValue = useMemo(() => {
    return purchasedItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [purchasedItems]);

  const soldItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'Sold');
  }, [shoppingList]);

  const soldValue = useMemo(() => {
    return soldItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [soldItems]);

  const cancelledItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'Cancelled');
  }, [shoppingList]);

  const cancelledValue = useMemo(() => {
    return cancelledItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [cancelledItems]);

  const passedItems = useMemo(() => {
    return shoppingList.filter((s) => s.status === 'Passed');
  }, [shoppingList]);

  const passedValue = useMemo(() => {
    return passedItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [passedItems]);

  const essentialItems = useMemo(() => {
    return shoppingList.filter((s) => s.priority === 'Essential / Must-Have');
  }, [shoppingList]);

  const essentialValue = useMemo(() => {
    return essentialItems.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0);
  }, [essentialItems]);

  const topSpendingCategory = useMemo(() => {
    const map: Record<string, number> = {};
    shoppingList.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + (item.estimatedPrice || 0);
    });
    let bestCat = 'None';
    let maxVal = 0;
    for (const [cat, val] of Object.entries(map)) {
      if (val > maxVal) {
        maxVal = val;
        bestCat = cat;
      }
    }
    return { name: bestCat, value: maxVal };
  }, [shoppingList]);

  const areAllFilteredSelected = useMemo(() => {
    return (
      filteredItems.length > 0 &&
      filteredItems.every((item) => selectedItemIds.has(item.id))
    );
  }, [filteredItems, selectedItemIds]);

  const areSomeFilteredSelected = useMemo(() => {
    return filteredItems.some((item) => selectedItemIds.has(item.id));
  }, [filteredItems, selectedItemIds]);

  const handleToggleSelectItem = useCallback((id: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((item) => next.add(item.id));
      return next;
    });
  }, [filteredItems]);

  const handleDeselectAllVisible = useCallback(() => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((item) => next.delete(item.id));
      return next;
    });
  }, [filteredItems]);

  const handleClearAllSelection = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (areAllFilteredSelected) {
      handleDeselectAllVisible();
    } else {
      handleSelectAllFiltered();
    }
  }, [areAllFilteredSelected, handleDeselectAllVisible, handleSelectAllFiltered]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    deleteMultipleShoppingItems(ids);
    setSelectedItemIds(new Set());
  }, [selectedItemIds, deleteMultipleShoppingItems]);

  const handleDeleteSingleShoppingItem = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    deleteShoppingItem(id);
    setSelectedItemIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return prev;
    });
  }, [deleteShoppingItem]);

  const selectedTotalEstimated = useMemo(() => {
    let sum = 0;
    for (const id of selectedItemIds) {
      const itm = shoppingList.find((s) => s.id === id);
      if (itm) sum += itm.estimatedPrice || 0;
    }
    return sum;
  }, [selectedItemIds, shoppingList]);

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) {
      setIsAddingCategory(false);
      return;
    }
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSaveCategoryRename = (oldName: string) => {
    if (!editingCategoryValue.trim() || editingCategoryValue.trim() === oldName) {
      setEditingCategoryName(null);
      return;
    }
    updateCategory(oldName, editingCategoryValue.trim());
    if (selectedCategory === oldName) {
      setSelectedCategory(editingCategoryValue.trim());
    }
    setEditingCategoryName(null);
  };

  const handleDeleteCategoryPrompt = (catToDelete: string) => {
    deleteCategory(catToDelete);
    if (selectedCategory === catToDelete) {
      setSelectedCategory('All');
    }
  };

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleSaveBudget = () => {
    const num = parseFloat(tempBudgetInput);
    if (!isNaN(num) && num >= 0) {
      updateMonthlyBudget(num);
    }
    setIsEditingBudget(false);
  };

  const handleConfirmPurchase = () => {
    if (!purchasingItem) return;
    const finalPrice = parseFloat(actualPriceInput) || purchasingItem.estimatedPrice;
    purchaseShoppingItem(purchasingItem.id, finalPrice);
    setPurchasingItem(null);
    setActualPriceInput('');
  };

  const handleSaveInline = (itemId: string, field: keyof ShoppingItem) => {
    const item = shoppingList.find((s) => s.id === itemId);
    if (!item) return;

    let parsedVal: any = editingValue.trim();
    if (field === 'estimatedPrice') {
      parsedVal = parseFloat(editingValue) || item.estimatedPrice;
    } else if (field === 'estimatedWearsPerYear') {
      parsedVal = parseInt(editingValue) || item.estimatedWearsPerYear;
    }

    updateShoppingItem(itemId, { [field]: parsedVal });
    setEditingFieldId(null);
  };

  const handleDeleteTag = (itemId: string, tagToDelete: string) => {
    const item = shoppingList.find((s) => s.id === itemId);
    if (!item || !item.tags) return;
    const updatedTags = item.tags.filter((t) => t !== tagToDelete);
    updateShoppingItem(itemId, { tags: updatedTags });
  };

  const handleAddTag = (itemId: string) => {
    if (!newTagText.trim()) {
      setNewTagInputItemId(null);
      return;
    }
    const item = shoppingList.find((s) => s.id === itemId);
    if (!item) return;
    const cleanTag = newTagText.trim().toLowerCase().replace(/^#/, '');
    const currentTags = item.tags || [];
    if (!currentTags.includes(cleanTag)) {
      updateShoppingItem(itemId, { tags: [...currentTags, cleanTag] });
    }
    setNewTagText('');
    setNewTagInputItemId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#E5E5E1] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
                Shopping &amp; Wishlist Manager
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#5A5A55]">
                {shoppingList.length} items planned
              </span>
            </div>
            <p className="text-xs text-[#767670] mt-0.5">
              Track aggregate purchase commitments, monitor monthly spend against budget, and analyze your acquisition pipeline in British Pounds (£).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Select / Deselect Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={filteredItems.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                  areAllFilteredSelected
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:text-[#1A1A1A] hover:bg-[#EAE8E3]'
                }`}
                title={
                  areAllFilteredSelected
                    ? 'Deselect all visible items'
                    : 'Select all visible items'
                }
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {areAllFilteredSelected
                    ? 'Deselect All'
                    : `Select All (${filteredItems.length})`}
                </span>
              </button>

              {selectedItemIds.size > 0 && !areAllFilteredSelected && (
                <button
                  type="button"
                  onClick={handleClearAllSelection}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono border border-[#E5E5E1] bg-white text-[#767670] hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-xs"
                  title="Clear all selected items"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear ({selectedItemIds.size})</span>
                </button>
              )}
            </div>

            {/* Merge Duplicates Quick Action */}
            <button
              type="button"
              onClick={() => setIsDuplicateMergeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-[#8C7355]/40 bg-white text-[#8C7355] hover:bg-[#8C7355] hover:text-white transition-all cursor-pointer shadow-xs"
              title="Detect and merge duplicate items across your inventory and wishlist"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Merge Duplicates</span>
            </button>

            {/* Display Settings Toggle */}
            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(true)}
              id="shopping-display-settings-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-[#D5D5D0] bg-white text-[#4A4A45] hover:border-[#8C7355] hover:text-[#1A1A1A] transition-all cursor-pointer shadow-xs"
              title="Customize display settings and toggled elements"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Display Settings</span>
            </button>

            {/* View Mode Toggle: Grid vs Database Table (Icon-Only) */}
            <div className="inline-flex rounded-xs border border-[#D5D5D0] bg-white shadow-2xs overflow-hidden text-xs font-mono">
              <button
                type="button"
                onClick={() => handleUpdateDisplaySettings({ ...displaySettings, viewMode: 'grid' })}
                className={`p-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                  displaySettings.viewMode === 'grid'
                    ? 'bg-[#1A1A1A] text-white font-bold'
                    : 'text-[#5A5A55] hover:bg-[#F8F7F4]'
                }`}
                title="Grid Cards View"
                aria-label="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleUpdateDisplaySettings({ ...displaySettings, viewMode: 'database' })}
                className={`p-1.5 border-l border-[#D5D5D0] flex items-center justify-center transition-colors cursor-pointer ${
                  displaySettings.viewMode === 'database'
                    ? 'bg-[#8C7355] text-white font-bold'
                    : 'text-[#5A5A55] hover:bg-[#F8F7F4]'
                }`}
                title="Database Table Spreadsheet View"
                aria-label="Database Table Spreadsheet View"
              >
                <Table className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Auto-Import Link (Supports URL, Vinted HTML/PDF, Photo, Text) */}
            <button
              onClick={() => {
                setAutoImportTab('url');
                setIsAutoImportOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium border border-[#8C7355] text-[#8C7355] hover:bg-[#8C7355] hover:text-white transition-all cursor-pointer shadow-xs"
              title="Automatically extract product from link or Vinted data to wishlist"
            >
              <Link2 className="w-3.5 h-3.5" />
              Auto-Import Link
            </button>

            <button
              onClick={onOpenAddShoppingItem}
              id="shopping-add-btn"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to Wishlist
            </button>
          </div>
        </div>

        {/* Quick URL Auto-Add Inline Bar */}
        {displaySettings.showQuickAddBar && (
          <div className="mt-3 pt-3 border-t border-[#E5E5E1] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="url"
                placeholder="Paste prospective product link (e.g. Mulberry, Arket, Barbour, Zara, COS)..."
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickUrl.trim()) {
                    setIsAutoImportOpen(true);
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F8F7F4] border border-[#E5E5E1] text-xs text-[#1A1A1A] placeholder:text-[#A5A59E] focus:bg-white focus:outline-none focus:border-[#8C7355]"
              />
              <Link2 className="w-3.5 h-3.5 text-[#8C7355] absolute left-2.5 top-2" />
            </div>
            <button
              onClick={() => setIsAutoImportOpen(true)}
              className="px-3 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#E5E5E1] text-xs font-mono text-[#4A4A45] hover:text-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3 text-[#8C7355]" />
              Extract &amp; Add
            </button>
          </div>
        )}
      </div>

      {/* Aggregated Financial & Purchase Pipeline Insights */}
      {displaySettings.showStatsBanner !== false && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Monthly Purchases Spend */}
          <div className="bg-white border border-[#E5E5E1] p-3.5 space-y-2 shadow-xs hover:border-[#8C7355]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
                <Wallet className="w-3 h-3 text-[#8C7355]" />
                Monthly Purchases Spend
              </span>
              <button
                onClick={() => {
                  setTempBudgetInput(monthlyBudget.toString());
                  setIsEditingBudget(!isEditingBudget);
                }}
                className="text-[10px] text-[#8C7355] hover:underline font-mono font-semibold cursor-pointer"
              >
                {isEditingBudget ? 'Cancel' : 'Edit Budget (£)'}
              </button>
            </div>

            {isEditingBudget ? (
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1 text-xs text-[#8C7355] font-mono font-bold">£</span>
                  <input
                    type="number"
                    value={tempBudgetInput}
                    onChange={(e) => setTempBudgetInput(e.target.value)}
                    className="w-full pl-5 pr-2 py-0.5 bg-[#F8F7F4] border border-[#8C7355] text-xs text-[#1A1A1A] font-mono font-bold focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSaveBudget}
                  className="px-2.5 py-0.5 text-xs font-medium bg-[#8C7355] text-white hover:bg-[#735D43] cursor-pointer shadow-xs"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
                {formatGbp(spentThisMonth)}
              </div>
            )}

            {/* Budget Bar */}
            <div className="space-y-1 pt-1 border-t border-[#E5E5E1]">
              <div className="w-full h-1.5 bg-[#F0EFEA] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    spentThisMonth > monthlyBudget ? 'bg-rose-600' : 'bg-[#8C7355]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((spentThisMonth / Math.max(monthlyBudget, 1)) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#767670] font-mono">
                <span>Budget: {formatGbp(monthlyBudget)}</span>
                <span
                  className={`font-semibold ${
                    stats.budgetRemainingGbp < 0 ? 'text-rose-700' : 'text-emerald-800'
                  }`}
                >
                  {stats.budgetRemainingGbp < 0
                    ? `Over by ${formatGbp(Math.abs(stats.budgetRemainingGbp))}`
                    : `${formatGbp(stats.budgetRemainingGbp)} left`}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Purchase Pipeline */}
          <div className="bg-white border border-[#E5E5E1] p-3.5 space-y-2 shadow-xs hover:border-[#8C7355]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#8C7355]" />
                Active Pipeline Value
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-amber-50 text-[#8C7355] border border-amber-200">
                {activePipelineItems.length} pieces
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-serif font-bold text-[#8C7355]">
              {formatGbp(activePipelineValue)}
            </div>

            <div className="space-y-0.5 pt-1 border-t border-[#E5E5E1] text-[10px] text-[#767670] font-mono">
              <div className="flex items-center justify-between">
                <span>Basket: {formatGbp(inBasketValue)} ({inBasketItems.length})</span>
                <span>To Buy: {formatGbp(toBuyValue)} ({toBuyItems.length})</span>
              </div>
              <div className="text-[9px] text-[#A5A59E]">
                ~{formatGbp(activePipelineValue / Math.max(activePipelineItems.length, 1))}/piece committed average
              </div>
            </div>
          </div>

          {/* Card 3: Total Planned Wishlist Valuation */}
          <div className="bg-white border border-[#E5E5E1] p-3.5 space-y-2 shadow-xs hover:border-[#8C7355]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
                <PoundSterling className="w-3 h-3 text-[#8C7355]" />
                Total Wishlist Value
              </span>
              <span className="text-[9px] font-mono text-[#767670] bg-[#F2F1ED] px-1.5 py-0.5 border border-[#E5E5E1]">
                {shoppingList.length} items
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {formatGbp(totalWishlistValuation)}
            </div>

            <div className="space-y-0.5 pt-1 border-t border-[#E5E5E1] text-[10px] text-[#767670] font-mono">
              <div className="flex items-center justify-between">
                <span>Research: {formatGbp(researchingValue)}</span>
                <span>Purchased: {formatGbp(purchasedValue)}</span>
              </div>
              <div className="text-[9px] text-[#A5A59E]">
                {shoppingList.reduce((acc, s) => acc + (s.matchingWardrobeItemIds?.length || 0), 0)} outfit connections verified
              </div>
            </div>
          </div>

          {/* Card 4: Essential Investments & Category Focus */}
          <div className="bg-white border border-[#E5E5E1] p-3.5 space-y-2 shadow-xs hover:border-[#8C7355]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
                <PieChart className="w-3 h-3 text-[#8C7355]" />
                Essential Priority Focus
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200">
                {essentialItems.length} essentials
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {formatGbp(essentialValue)}
            </div>

            <div className="space-y-0.5 pt-1 border-t border-[#E5E5E1] text-[10px] text-[#767670] font-mono">
              <div className="flex items-center justify-between">
                <span>Top Cat: <strong className="text-[#1A1A1A]">{topSpendingCategory.name}</strong></span>
                <span className="text-[#8C7355] font-bold">{formatGbp(topSpendingCategory.value)}</span>
              </div>
              <div className="text-[9px] text-[#A5A59E]">
                {Math.round((essentialValue / Math.max(totalWishlistValuation, 1)) * 100)}% of total planned acquisition value
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Pipeline Stage Breakdown Ribbon */}
      {displaySettings.showStatusFilter !== false && (
        <div className="bg-[#F8F7F4] border border-[#E5E5E1] p-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#767670]">
            <span className="font-semibold text-[#1A1A1A]">Pipeline &amp; Status Filter:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* All */}
            <button
              onClick={() => setSelectedStatus('All')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'All'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
              }`}
            >
              <span>All</span>
              <span className="opacity-75">({shoppingList.length})</span>
              <span className="font-bold ml-0.5">{formatGbp(totalWishlistValuation)}</span>
            </button>

            {/* In Basket */}
            <button
              onClick={() => setSelectedStatus('In Basket')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'In Basket'
                  ? 'bg-[#8C7355] text-white border-[#8C7355] shadow-xs'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
              }`}
            >
              <span>In Basket</span>
              <span className="opacity-75">({inBasketItems.length})</span>
              <span className="font-bold ml-0.5">{formatGbp(inBasketValue)}</span>
            </button>

            {/* To Buy */}
            <button
              onClick={() => setSelectedStatus('To Buy')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'To Buy'
                  ? 'bg-[#8C7355] text-white border-[#8C7355] shadow-xs'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
              }`}
            >
              <span>To Buy</span>
              <span className="opacity-75">({toBuyItems.length})</span>
              <span className="font-bold ml-0.5">{formatGbp(toBuyValue)}</span>
            </button>

            {/* Researching */}
            <button
              onClick={() => setSelectedStatus('Researching')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'Researching'
                  ? 'bg-[#8C7355] text-white border-[#8C7355] shadow-xs'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
              }`}
            >
              <span>Researching</span>
              <span className="opacity-75">({researchingItems.length})</span>
              <span className="font-bold ml-0.5">{formatGbp(researchingValue)}</span>
            </button>

            {/* Purchased */}
            <button
              onClick={() => setSelectedStatus('Purchased')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'Purchased'
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs font-bold'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-emerald-700 hover:text-emerald-800'
              }`}
            >
              <CheckCircle className="w-3 h-3 text-emerald-300" />
              <span>Purchased</span>
              <span className="opacity-75">({purchasedItems.length})</span>
              <span className="font-bold ml-0.5">{formatGbp(purchasedValue)}</span>
            </button>

            {/* Sold */}
            <button
              onClick={() => setSelectedStatus('Sold')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'Sold'
                  ? 'bg-teal-800 text-white border-teal-800 shadow-xs font-bold'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-teal-700 hover:text-teal-800'
              }`}
            >
              <Tag className="w-3 h-3 text-teal-300" />
              <span>Sold</span>
              <span className="opacity-75">({soldItems.length})</span>
              <span className="font-bold ml-0.5">{formatGbp(soldValue)}</span>
            </button>

            {/* Cancelled */}
            <button
              onClick={() => setSelectedStatus('Cancelled')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'Cancelled'
                  ? 'bg-rose-800 text-white border-rose-800 shadow-xs font-bold'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-rose-700 hover:text-rose-800'
              }`}
            >
              <Ban className="w-3 h-3 text-rose-300" />
              <span>Cancelled</span>
              <span className="opacity-75">({cancelledItems.length})</span>
            </button>

            {/* Passed */}
            <button
              onClick={() => setSelectedStatus('Passed')}
              className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedStatus === 'Passed'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs font-bold'
                  : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-slate-600'
              }`}
            >
              <span>Passed</span>
              <span className="opacity-75">({passedItems.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Category Manager & Filter Bar */}
      {displaySettings.showCategoryFilter && (
        <div className="bg-white border border-[#E5E5E1] p-3 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-[#8C7355]" />
              <span className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                Inventory &amp; Wishlist Categories
              </span>
            <span className="text-[10px] font-mono text-[#767670]">
              ({categories.length} active)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isAddingCategory ? (
              <button
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-[#8C7355] bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Category
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewCategory();
                    if (e.key === 'Escape') setIsAddingCategory(false);
                  }}
                  autoFocus
                  className="px-2 py-1 text-xs bg-white border border-[#8C7355] text-[#1A1A1A] font-mono focus:outline-none w-36"
                />
                <button
                  onClick={handleAddNewCategory}
                  className="p-1 bg-[#8C7355] text-white hover:bg-[#786248] cursor-pointer"
                  title="Save category"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsAddingCategory(false)}
                  className="p-1 text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (window.confirm('Reset categories to standard wardrobe defaults?')) {
                  resetCategories();
                }
              }}
              className="text-[10px] font-mono text-[#A5A59E] hover:text-[#5A5A55] hover:underline cursor-pointer"
              title="Reset to default 8 categories"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Dynamic Category Filter & Edit Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {/* All Categories Pill */}
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap font-mono ${
              selectedCategory === 'All'
                ? 'bg-[#8C7355] text-white border-[#8C7355] font-semibold shadow-xs'
                : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
            }`}
          >
            All Items ({shoppingList.length})
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = shoppingList.filter((i) => i.category === cat).length;
            const isEditing = editingCategoryName === cat;

            if (isEditing) {
              return (
                <div
                  key={cat}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#8C7355] shadow-xs"
                >
                  <input
                    type="text"
                    value={editingCategoryValue}
                    onChange={(e) => setEditingCategoryValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCategoryRename(cat);
                      if (e.key === 'Escape') setEditingCategoryName(null);
                    }}
                    onBlur={() => handleSaveCategoryRename(cat)}
                    autoFocus
                    className="text-xs font-mono text-[#1A1A1A] bg-transparent focus:outline-none w-24"
                  />
                  <button
                    onClick={() => handleSaveCategoryRename(cat)}
                    className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingCategoryName(null)}
                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={cat}
                className={`group inline-flex items-center gap-1 px-2.5 py-1 text-xs border transition-all whitespace-nowrap font-mono ${
                  isSelected
                    ? 'bg-[#8C7355] text-white border-[#8C7355] font-semibold shadow-xs'
                    : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                }`}
              >
                <span
                  onClick={() => setSelectedCategory(cat)}
                  className="cursor-pointer hover:underline"
                  title={`Filter by ${cat}`}
                >
                  {cat} ({count})
                </span>

                {/* Inline Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategoryName(cat);
                    setEditingCategoryValue(cat);
                  }}
                  className={`p-0.5 opacity-60 hover:opacity-100 cursor-pointer ${
                    isSelected ? 'text-white hover:text-amber-200' : 'text-[#767670] hover:text-[#1A1A1A]'
                  }`}
                  title={`Rename category "${cat}"`}
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>

                {/* Inline Delete (x) Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategoryPrompt(cat);
                  }}
                  className={`p-0.5 opacity-60 hover:opacity-100 cursor-pointer ${
                    isSelected ? 'text-white hover:text-rose-200' : 'text-[#767670] hover:text-rose-600'
                  }`}
                  title={`Delete category "${cat}" (✕)`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Filter Tabs & Quick (x) Selectors */}
      <div className="bg-white border border-[#E5E5E1] p-3 space-y-2.5 shadow-xs">
        {/* Search Facility */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#F8F7F4] border border-[#E5E5E1] px-3 py-1.5 focus-within:border-[#8C7355] focus-within:bg-white transition-all shadow-2xs">
            <Search className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
            <input
              type="text"
              placeholder="Search purchases by item name, brand, category, tags, retailer, reason, notes, seller, order status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[#1A1A1A] placeholder:text-[#A5A59E] focus:outline-none"
            />
            {searchQuery ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#8C7355]/10 text-[#8C7355] border border-[#8C7355]/20 font-semibold">
                  {filteredItems.length} match{filteredItems.length === 1 ? '' : 'es'}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#767670] hover:text-rose-600 cursor-pointer p-0.5"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Status Filter Pills with (x) */}
        {displaySettings.showStatusFilter && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] text-[#767670] font-mono font-semibold mr-1 shrink-0">
              Status:
            </span>
            {STATUSES.map((status) => {
              const isSelected = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold shadow-xs'
                      : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                  }`}
                >
                  <span>{status}</span>
                  {isSelected && status !== 'All' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus('All');
                      }}
                      className="hover:text-rose-300 ml-0.5 p-0.5"
                      title="Clear status filter (✕)"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Secondary Priority & Brand Filters */}
        {displaySettings.showSecondaryFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E5E1]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Brand Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#767670] font-mono text-[11px]">Brand:</span>
                <div className="relative">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-1 pr-6 focus:outline-none focus:border-[#8C7355] appearance-none max-w-[160px] truncate font-medium"
                  >
                    <option value="All">All Brands ({shoppingList.length})</option>
                    {uniqueBrands.map(({ brand, count }) => (
                      <option key={brand} value={brand}>
                        {brand} ({count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#767670] absolute right-1.5 top-2 pointer-events-none" />
                </div>
                {selectedBrand !== 'All' && (
                  <button
                    onClick={() => setSelectedBrand('All')}
                    className="text-[#767670] hover:text-rose-600 p-0.5 cursor-pointer"
                    title="Clear brand filter (✕)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#767670] font-mono text-[11px]">Priority:</span>
                <div className="relative">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as any)}
                    className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-1 pr-6 focus:outline-none focus:border-[#8C7355] appearance-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#767670] absolute right-1.5 top-2 pointer-events-none" />
                </div>
                {selectedPriority !== 'All' && (
                  <button
                    onClick={() => setSelectedPriority('All')}
                    className="text-[#767670] hover:text-rose-600 p-0.5 cursor-pointer"
                    title="Clear priority (✕)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {(selectedStatus !== 'All' ||
              selectedBrand !== 'All' ||
              selectedPriority !== 'All' ||
              selectedCategory !== 'All' ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStatus('All');
                  setSelectedBrand('All');
                  setSelectedPriority('All');
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="text-[11px] font-mono text-[#8C7355] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Clear Filters (✕)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedItemIds.size > 0 && (
        <div className="bg-[#1A1A1A] text-white p-3 border border-[#333] shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`w-4 h-4 border flex items-center justify-center cursor-pointer transition-colors ${
                  areAllFilteredSelected
                    ? 'bg-[#8C7355] border-[#8C7355] text-white'
                    : areSomeFilteredSelected
                    ? 'bg-[#8C7355]/30 border-[#8C7355] text-[#8C7355]'
                    : 'border-[#666] bg-[#2A2A2A] hover:border-[#8C7355]'
                }`}
                title={areAllFilteredSelected ? 'Deselect all visible items' : 'Select all visible items'}
                aria-label={areAllFilteredSelected ? 'Deselect all visible items' : 'Select all visible items'}
              >
                {areAllFilteredSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
                {!areAllFilteredSelected && areSomeFilteredSelected && (
                  <span className="w-2 h-0.5 bg-[#8C7355] block" />
                )}
              </button>
              <span className="font-mono text-xs font-semibold">
                {selectedItemIds.size} of {shoppingList.length} items selected
                {filteredItems.length !== shoppingList.length && (
                  <span className="text-[#A5A59E] font-normal"> ({filteredItems.length} matching filter)</span>
                )}
              </span>
            </div>
            <span className="text-xs text-[#A5A59E] font-mono hidden sm:inline">
              (Estimated Total: {formatGbp(selectedTotalEstimated)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selectedItemIds);
                moveMultipleShoppingItems(ids, 'selling');
                setSelectedItemIds(new Set());
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#007782] hover:bg-[#005E67] text-white shadow-xs cursor-pointer transition-colors"
              title="Move selected items to Resale / Sales"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>To Sales / Resale ({selectedItemIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selectedItemIds);
                moveMultipleShoppingItems(ids, 'wardrobe');
                setSelectedItemIds(new Set());
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs cursor-pointer transition-colors"
              title="Move selected items to Wardrobe Inventory"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>To Wardrobe ({selectedItemIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#3A3A38] hover:bg-[#4A4A48] text-[#E5E5E1] border border-[#555] shadow-xs cursor-pointer transition-colors"
              title="Bulk edit category, priority, status, retailer, tags, and prices for selected wishlist items"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedItemIds.size})</span>
            </button>
            <button
              type="button"
              onClick={handleClearAllSelection}
              className="px-3 py-1 text-xs font-mono text-[#D5D5D0] hover:text-white border border-[#444] hover:border-[#666] bg-[#2A2A2A] cursor-pointer transition-colors"
            >
              Deselect
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-mono font-medium bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer transition-colors"
              title="Delete all selected items immediately"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedItemIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Wishlist Items (Database Table View OR Card Grid View) */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E5E5E1] space-y-3">
          <ShoppingBag className="w-6 h-6 text-[#8C7355] mx-auto" />
          <h3 className="text-sm font-serif font-semibold text-[#1A1A1A]">
            No wishlist items found
          </h3>
          <p className="text-xs text-[#767670] max-w-sm mx-auto">
            Add items you are researching or auto-import them from a retailer link to plan your acquisition pipeline.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsAutoImportOpen(true)}
              className="px-3.5 py-1.5 text-xs bg-[#8C7355] hover:bg-[#735D43] text-white cursor-pointer flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Auto-Import from Link
            </button>
            <button
              onClick={onOpenAddShoppingItem}
              className="px-3.5 py-1.5 text-xs bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#1A1A1A] border border-[#E5E5E1] cursor-pointer"
            >
              Add Manually
            </button>
          </div>
        </div>
      ) : displaySettings.viewMode === 'database' ? (
        /* DATABASE SPREADSHEET TABLE VIEW */
        <ShoppingDatabaseTable
          items={filteredItems}
          selectedItemIds={selectedItemIds}
          onToggleSelectItem={(id, e) => handleToggleSelectItem(id, e)}
          onSelectAll={handleToggleSelectAll}
          areAllSelected={filteredItems.length > 0 && filteredItems.every((i) => selectedItemIds.has(i.id))}
          areSomeSelected={filteredItems.some((i) => selectedItemIds.has(i.id))}
          displaySettings={displaySettings}
          onEditItem={(item) => onEditShoppingItem(item)}
          onPurchaseItem={(item) => {
            setPurchasingItem(item);
            setActualPriceInput(item.estimatedPrice.toString());
          }}
        />
      ) : (
        /* GRID CARD VIEW */
        <div
          className={`grid ${
            displaySettings.density === 'dense'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2'
              : displaySettings.density === 'compact'
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          }`}
        >
          {filteredItems.map((item) => {
            const isSelected = selectedItemIds.has(item.id);

            const isEditingBrand = editingFieldId === `${item.id}_brand`;
            const isEditingName = editingFieldId === `${item.id}_name`;
            const isEditingPrice = editingFieldId === `${item.id}_estimatedPrice`;
            const isEditingReason = editingFieldId === `${item.id}_reasonOrGap`;

            const isVintedItem =
              Boolean(item.seller) ||
              Boolean(item.orderStatus) ||
              Boolean(item.transactionType) ||
              item.retailerName === 'Vinted' ||
              (item.tags || []).some((t) => t.toLowerCase().includes('vinted'));

            return (
              <div
                key={item.id}
                className={`bg-white border transition-all shadow-xs flex flex-col justify-between group ${
                  isSelected ? 'border-[#8C7355] ring-1 ring-[#8C7355]' : 'border-[#E5E5E1] hover:border-[#8C7355]'
                }`}
              >
                {/* Visual Header: Photo containment (toggled by displaySettings.showImage) */}
                {displaySettings.showImage !== false && (
                  <div className="relative aspect-[3/4] bg-[#F8F7F4] overflow-hidden border-b border-[#E5E5E1] flex items-center justify-center p-2">
                    <GarmentImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="w-full h-full max-h-full max-w-full object-contain group-hover:scale-103 transition-transform duration-300"
                      containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4]"
                    />

                    {/* Top Left: Checkbox & Badges */}
                    <div
                      className="absolute top-2 left-2 flex flex-col gap-1 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectItem(item.id, e)}
                          className={`w-6 h-6 border shadow-xs flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#8C7355] border-[#8C7355] text-white ring-2 ring-[#8C7355]/30'
                              : 'bg-white/95 border-[#B5B5AF] text-transparent hover:border-[#8C7355] hover:bg-white'
                          }`}
                          title={isSelected ? 'Deselect item' : 'Select item for bulk actions'}
                          aria-label={isSelected ? 'Deselect item' : 'Select item'}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-none border border-transparent" />
                          )}
                        </button>

                        {/* Priority selector inline */}
                        {displaySettings.showPriority !== false && (
                          <select
                            value={item.priority}
                            onChange={(e) =>
                              updateShoppingItem(item.id, {
                                priority: e.target.value as ShoppingPriority,
                              })
                            }
                            className="text-[10px] font-mono px-2 py-0.5 bg-white/95 text-[#1A1A1A] border border-[#D5D5D0] shadow-xs focus:outline-none"
                          >
                            <option value="Essential / Must-Have">Essential</option>
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium</option>
                            <option value="Low / Wishlist">Low Wishlist</option>
                          </select>
                        )}

                        {/* Status Selector inline */}
                        {displaySettings.showStatus !== false && (
                          <select
                            value={item.status}
                            onChange={(e) =>
                              updateShoppingItem(item.id, {
                                status: e.target.value as ShoppingStatus,
                              })
                            }
                            className="text-[10px] font-mono px-2 py-0.5 bg-white/95 text-[#767670] border border-[#D5D5D0] shadow-xs focus:outline-none"
                          >
                            <option value="To Buy">To Buy</option>
                            <option value="In Basket">In Basket</option>
                            <option value="Researching">Researching</option>
                            <option value="Purchased">Purchased</option>
                            <option value="Sold">Sold</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Passed">Passed</option>
                          </select>
                        )}
                      </div>

                      {/* Category Selector inline */}
                      {displaySettings.showCategory !== false && (
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateShoppingItem(item.id, {
                              category: e.target.value,
                            })
                          }
                          className="text-[10px] font-mono px-1.5 py-0.5 bg-white/95 text-[#4A4A45] border border-[#D5D5D0] shadow-xs focus:outline-none self-start"
                          title="Change category inline"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Top Right: Delete (x) Button */}
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={(e) => handleDeleteSingleShoppingItem(item.id, e)}
                        className="p-1.5 bg-white/95 text-[#767670] hover:text-rose-600 border border-[#D5D5D0] shadow-xs cursor-pointer"
                        title="Delete from wishlist (✕)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Right: Price Tag */}
                    {displaySettings.showEstimatedPrice !== false && (
                      <div className="absolute bottom-2 right-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/95 text-[#1A1A1A] border border-[#D5D5D0] shadow-xs">
                          {formatGbp(item.estimatedPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Body Details with Inline Editors */}
                <div className={`p-3.5 space-y-2.5 flex-1 flex flex-col justify-between ${displaySettings.density === 'compact' ? 'p-2.5 space-y-2' : ''}`}>
                  <div className="space-y-1.5">
                    {/* Brand & Price Header */}
                    <div className="flex items-center justify-between gap-2">
                      {displaySettings.showBrand !== false && (
                        isEditingBrand ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveInline(item.id, 'brand')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInline(item.id, 'brand');
                                if (e.key === 'Escape') setEditingFieldId(null);
                              }}
                              autoFocus
                              className="text-xs font-mono font-bold text-[#8C7355] border border-[#8C7355] px-1 py-0.5 bg-white"
                            />
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              setEditingFieldId(`${item.id}_brand`);
                              setEditingValue(item.brand);
                            }}
                            className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-bold hover:underline cursor-pointer flex items-center gap-1"
                            title="Click to edit brand"
                          >
                            {item.brand}
                            <PencilIcon />
                          </span>
                        )
                      )}

                      {/* Estimated Price Editor */}
                      {displaySettings.showEstimatedPrice !== false && (
                        isEditingPrice ? (
                          <div className="flex items-center gap-0.5">
                            <span className="text-xs font-mono text-[#8C7355]">£</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveInline(item.id, 'estimatedPrice')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInline(item.id, 'estimatedPrice');
                                if (e.key === 'Escape') setEditingFieldId(null);
                              }}
                              autoFocus
                              className="w-16 text-xs font-mono font-bold text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white"
                            />
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              setEditingFieldId(`${item.id}_estimatedPrice`);
                              setEditingValue(item.estimatedPrice.toString());
                            }}
                            className="text-xs font-mono font-bold text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center gap-1"
                            title="Click to edit estimated price"
                          >
                            {formatGbp(item.estimatedPrice)}
                            <PencilIcon />
                          </span>
                        )
                      )}
                    </div>

                    {/* Name Inline */}
                    {isEditingName ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveInline(item.id, 'name')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(item.id, 'name');
                            if (e.key === 'Escape') setEditingFieldId(null);
                          }}
                          autoFocus
                          className="w-full text-xs font-serif font-bold text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white"
                        />
                      </div>
                    ) : (
                      <h3
                        onClick={() => {
                          setEditingFieldId(`${item.id}_name`);
                          setEditingValue(item.name);
                        }}
                        className="text-xs font-serif font-bold text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center justify-between"
                        title="Click to edit name"
                      >
                        <span className="truncate">{item.name}</span>
                        <PencilIcon />
                      </h3>
                    )}

                    {/* Reason / Notes */}
                    {isEditingReason ? (
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'reasonOrGap')}
                        autoFocus
                        rows={2}
                        className="w-full text-[11px] text-[#4A4A45] border border-[#8C7355] p-1 bg-white"
                      />
                    ) : (
                      item.reasonOrGap ? (
                        <p
                          onClick={() => {
                            setEditingFieldId(`${item.id}_reasonOrGap`);
                            setEditingValue(item.reasonOrGap);
                          }}
                          className="text-[11px] text-[#767670] line-clamp-2 leading-relaxed hover:text-[#1A1A1A] cursor-pointer"
                          title="Click to edit note"
                        >
                          {item.reasonOrGap}
                        </p>
                      ) : null
                    )}
                  </div>

                  {/* RESTORED GREEN VINTED BANNER: Always rendered prominently when item has Vinted data */}
                  {displaySettings.showVintedDetails !== false && isVintedItem && (
                    <div className="p-2.5 bg-[#007782]/10 border border-[#007782]/30 text-[10px] font-mono space-y-1.5 rounded-xs shadow-2xs">
                      <div className="flex items-center justify-between text-[#007782] font-semibold">
                        <span className="flex items-center gap-1.5 font-bold tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-[#007782]"></span>
                          Vinted {item.transactionType || 'Order'}
                        </span>
                        {item.orderStatus ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#007782] text-white rounded-xs uppercase tracking-wider">
                            {item.orderStatus}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 bg-[#E0F3F3] text-[#00606A] border border-[#BCE4E6] rounded-xs">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[#2D4F4F] text-[10px]">
                        {item.seller ? (
                          <span>
                            Seller: <strong className="text-[#007782]">@{item.seller.replace(/^@/, '')}</strong>
                          </span>
                        ) : (
                          <span className="text-[#688888]">{item.retailerName || 'Vinted listing'}</span>
                        )}
                        {(item.orderValue || item.actualPricePaid || item.estimatedPrice) ? (
                          <span>
                            Total: <strong className="text-[#1A1A1A]">{formatGbp(item.orderValue || item.actualPricePaid || item.estimatedPrice)}</strong>
                          </span>
                        ) : null}
                      </div>
                      {(item.orderDate || item.lastUpdatedDate || item.size) && (
                        <div className="text-[9px] text-[#557A7A] flex items-center justify-between pt-1 border-t border-[#007782]/15">
                          <span>{item.orderDate ? `Ordered: ${item.orderDate}` : item.lastUpdatedDate ? `Updated: ${item.lastUpdatedDate}` : ''}</span>
                          {item.size && <span className="font-semibold text-[#007782]">Size: {item.size}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags with Quick (x) Deletion & Inline Addition */}
                  {displaySettings.showTags !== false && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#E5E5E1]">
                      {(item.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#4A4A45]"
                        >
                          #{tag}
                          <button
                            onClick={() => handleDeleteTag(item.id, tag)}
                            className="text-[#A5A59E] hover:text-rose-600 ml-0.5 cursor-pointer"
                            title={`Delete tag #${tag}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}

                      {newTagInputItemId === item.id ? (
                        <input
                          type="text"
                          placeholder="tag..."
                          value={newTagText}
                          onChange={(e) => setNewTagText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag(item.id);
                            if (e.key === 'Escape') setNewTagInputItemId(null);
                          }}
                          onBlur={() => handleAddTag(item.id)}
                          autoFocus
                          className="w-16 text-[10px] font-mono border border-[#8C7355] px-1 py-0.5 bg-white"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setNewTagInputItemId(item.id);
                            setNewTagText('');
                          }}
                          className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] px-1 py-0.5 border border-dashed border-[#D5D5D0]"
                        >
                          + tag
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {displaySettings.showActions !== false && (
                    <div className="pt-2.5 border-t border-[#E5E5E1] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveShoppingItemToSales(item.id)}
                          className="p-1.5 text-[#007782] hover:text-white border border-[#007782]/30 hover:bg-[#007782] transition-colors cursor-pointer"
                          title="List item for Resale / Sales"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => moveShoppingItemToWardrobe(item.id)}
                          className="p-1.5 text-[#8C7355] hover:text-white border border-[#8C7355]/30 hover:bg-[#8C7355] transition-colors cursor-pointer"
                          title="Move directly to Inventory"
                        >
                          <FolderUp className="w-3.5 h-3.5" />
                        </button>

                        {displaySettings.showUrl !== false && item.targetStoreUrl && (
                          <a
                            href={item.targetStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                            title="Open Retailer Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={() => onEditShoppingItem(item)}
                          className="p-1.5 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Edit Details Modal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setPurchasingItem(item);
                          setActualPriceInput(item.estimatedPrice.toString());
                        }}
                        id={`purchase-btn-${item.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Purchased!
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PURCHASE CONVERSION MODAL */}
      {purchasingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E5E1] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                    Convert to Active Wardrobe Garment
                  </h3>
                  <p className="text-xs text-[#767670]">
                    {purchasingItem.brand} {purchasingItem.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPurchasingItem(null)}
                className="text-[#767670] hover:text-[#1A1A1A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-[#1A1A1A]">
                Actual Price Paid (£ GBP):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono font-bold text-[#8C7355]">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={actualPriceInput}
                  onChange={(e) => setActualPriceInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-[#8C7355] text-sm font-mono font-bold text-[#1A1A1A] focus:outline-none"
                  placeholder="e.g. 195"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-[#767670]">
                Estimated was {formatGbp(purchasingItem.estimatedPrice)}. This will add the piece directly
                to your active wardrobe and log the purchase in the transaction audit trail.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E1]">
              <button
                onClick={() => setPurchasingItem(null)}
                className="px-4 py-2 text-xs font-medium border border-[#D5D5D0] text-[#5A5A55] hover:bg-[#F2F1ED] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="px-5 py-2 text-xs font-medium uppercase tracking-wider bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs cursor-pointer"
              >
                Confirm &amp; Add to Wardrobe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Import from Link & Vinted Modal */}
      <AutoImportModal
        isOpen={isAutoImportOpen}
        onClose={() => {
          setIsAutoImportOpen(false);
          setQuickUrl('');
        }}
        initialUrl={quickUrl}
        initialTab={autoImportTab}
        defaultDestination="shopping"
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        targetType="shopping"
        selectedIds={Array.from(selectedItemIds)}
        onComplete={() => setSelectedItemIds(new Set())}
      />

      {/* Display Settings Modal */}
      <ShoppingDisplaySettingsModal
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
        settings={displaySettings}
        onChange={handleUpdateDisplaySettings}
        onResetColumnWidths={() => {
          localStorage.removeItem('shopping_table_widths_v2');
          window.location.reload();
        }}
      />

      {/* Duplicate Merging Modal for entire site / collections */}
      <DuplicateMergeModal
        isOpen={isDuplicateMergeOpen}
        onClose={() => setIsDuplicateMergeOpen(false)}
        defaultTab="cross"
      />
    </div>
  );
};

const PencilIcon = () => (
  <span className="inline-block text-[#A5A59E] hover:text-[#8C7355] text-[9px] opacity-70 ml-0.5">
    ✎
  </span>
);
