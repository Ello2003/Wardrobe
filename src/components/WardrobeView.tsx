import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Heart,
  Edit2,
  Info,
  Link2,
  X,
  Check,
  CheckSquare,
  Tag,
  Trash2,
  Sparkles,
  ChevronDown,
  RotateCcw,
  FolderUp,
  Sliders,
  SlidersHorizontal,
  DollarSign,
  ShoppingBag,
  Layers,
  Search,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { WardrobeItem, Category, Season, Condition } from '../types';
import { AutoImportModal } from './AutoImportModal';
import { GarmentImage } from './GarmentImage';
import { BulkEditModal } from './BulkEditModal';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { InventoryDatabaseTable } from './InventoryDatabaseTable';
import {
  InventoryDisplaySettings,
  DEFAULT_INVENTORY_DISPLAY_SETTINGS,
  InventoryDisplaySettingsModal,
} from './InventoryDisplaySettingsModal';

interface WardrobeViewProps {
  onOpenAddItem: () => void;
  onSelectItem: (item: WardrobeItem) => void;
  onEditItem: (item: WardrobeItem) => void;
}

const SEASONS: (Season | 'All')[] = ['All', 'Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'];

const CONDITIONS: Condition[] = ['Pristine / New', 'Excellent', 'Good', 'Vintage / Well-Loved'];

export const WardrobeView: React.FC<WardrobeViewProps> = ({
  onOpenAddItem,
  onSelectItem,
  onEditItem,
}) => {
  const {
    items,
    updateItem,
    deleteItem,
    deleteMultipleItems,
    logItemWear,
    toggleItemFavorite,
    searchQuery,
    setSearchQuery,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    moveWardrobeItemToSales,
    moveWardrobeItemToShopping,
    moveMultipleWardrobeItems,
  } = useWardrobe();

  // Load Inventory Display Settings from LocalStorage
  const [displaySettings, setDisplaySettings] = useState<InventoryDisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('inventory_display_settings');
      if (saved) {
        return { ...DEFAULT_INVENTORY_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load inventory display settings', e);
    }
    return DEFAULT_INVENTORY_DISPLAY_SETTINGS;
  });

  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);

  const handleUpdateDisplaySettings = (updated: InventoryDisplaySettings) => {
    setDisplaySettings(updated);
    try {
      localStorage.setItem('inventory_display_settings', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save inventory display settings', e);
    }
  };

  // Live sync from SettingsModal
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('inventory_display_settings');
        if (saved) {
          setDisplaySettings({ ...DEFAULT_INVENTORY_DISPLAY_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error('Failed to sync inventory display settings', e);
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('custom_display_settings_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('custom_display_settings_updated', handleSync);
    };
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [selectedBrand, setSelectedBrand] = useState<string | 'All'>('All');
  const [selectedSeason, setSelectedSeason] = useState<Season | 'All'>('All');
  const [selectedCondition, setSelectedCondition] = useState<Condition | 'All'>('All');
  const [sortBy, setSortBy] = useState<
    'wears_desc' | 'price_desc' | 'price_asc' | 'newest'
  >('wears_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);

  // Multi-item selection state for bulk deletion
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);

  // Category management state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Auto-Import Modal State
  const [isAutoImportOpen, setIsAutoImportOpen] = useState(false);
  const [autoImportTab, setAutoImportTab] = useState<'url' | 'photo' | 'text' | 'vinted'>('url');
  const [quickUrl, setQuickUrl] = useState('');

  // Inline Editing States
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null); // e.g. "item-123_name"
  const [editingValue, setEditingValue] = useState<string>('');
  const [addingTagItemId, setAddingTagItemId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState<string>('');
  const [newTagInputItemId, setNewTagInputItemId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  // Unique Brands with Counts
  const uniqueBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => {
      if (!it.isArchived) {
        const b = it.brand?.trim() || 'Unbranded';
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, count]) => ({ brand, count }));
  }, [items]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (item.isArchived) return false;
        if (favoritesOnly && !item.isFavorite) return false;
        if (
          selectedCategory !== 'All' &&
          (item.category || '').trim().toLowerCase() !== selectedCategory.trim().toLowerCase()
        ) {
          return false;
        }
        if (selectedBrand !== 'All' && item.brand !== selectedBrand) return false;
        if (selectedSeason !== 'All') {
          const itemSeasons = Array.isArray(item.season)
            ? item.season
            : item.season
            ? [item.season]
            : ['All-Season'];
          if (
            !itemSeasons.includes(selectedSeason as any) &&
            !itemSeasons.includes('All-Season')
          ) {
            return false;
          }
        }
        if (selectedCondition !== 'All' && item.condition !== selectedCondition) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName = item.name?.toLowerCase().includes(query);
          const matchBrand = item.brand?.toLowerCase().includes(query);
          const matchTags = item.tags?.some((t) => t.toLowerCase().includes(query));
          const matchCategory = item.category?.toLowerCase().includes(query);
          const matchSubcategory = item.subcategory?.toLowerCase().includes(query);
          const matchMaterial = item.material?.toLowerCase().includes(query);
          const matchColor = item.color?.toLowerCase().includes(query);
          const matchSize = item.size?.toLowerCase().includes(query);
          const matchCondition = item.condition?.toLowerCase().includes(query);
          const matchNotes = item.notes?.toLowerCase().includes(query);
          const matchCare = item.careNotes?.toLowerCase().includes(query);
          const matchSeller = item.seller?.toLowerCase().includes(query);
          const matchBuyer = item.buyer?.toLowerCase().includes(query);
          const matchOrderStatus = item.orderStatus?.toLowerCase().includes(query);
          const matchStorage = item.storageLocation?.toLowerCase().includes(query);
          if (
            !matchName &&
            !matchBrand &&
            !matchTags &&
            !matchCategory &&
            !matchSubcategory &&
            !matchMaterial &&
            !matchColor &&
            !matchSize &&
            !matchCondition &&
            !matchNotes &&
            !matchCare &&
            !matchSeller &&
            !matchBuyer &&
            !matchOrderStatus &&
            !matchStorage
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'wears_desc':
            return b.wearCount - a.wearCount;
          case 'price_desc':
            return b.purchasePrice - a.purchasePrice;
          case 'price_asc':
            return a.purchasePrice - b.purchasePrice;
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
  }, [items, selectedCategory, selectedBrand, selectedSeason, selectedCondition, favoritesOnly, searchQuery, sortBy]);

  const filteredTotalValue = filteredItems.reduce((acc, item) => acc + item.purchasePrice, 0);
  const filteredTotalWears = filteredItems.reduce((acc, item) => acc + item.wearCount, 0);

  const selectedTotalValuation = useMemo(() => {
    let sum = 0;
    for (const id of selectedItemIds) {
      const itm = items.find((i) => i.id === id);
      if (itm) sum += itm.purchasePrice || 0;
    }
    return sum;
  }, [selectedItemIds, items]);

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Inline editing commit handler
  const handleSaveInline = (itemId: string, field: keyof WardrobeItem) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    let parsedVal: any = editingValue.trim();
    if (field === 'purchasePrice') {
      parsedVal = parseFloat(editingValue) || item.purchasePrice;
    } else if (field === 'wearCount') {
      parsedVal = Math.max(0, parseInt(editingValue) || 0);
    }

    updateItem(itemId, { [field]: parsedVal });
    setEditingFieldId(null);
  };

  // Inline Tag Deletion
  const handleDeleteTag = (itemId: string, tagToDelete: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const updatedTags = item.tags.filter((t) => t !== tagToDelete);
    updateItem(itemId, { tags: updatedTags });
  };

  // Inline Tag Addition
  const handleAddTag = (itemId: string) => {
    if (!newTagText.trim()) {
      setNewTagInputItemId(null);
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const cleanTag = newTagText.trim().toLowerCase().replace(/^#/, '');
    const currentTags = Array.isArray(item.tags) ? item.tags : [];
    if (!currentTags.includes(cleanTag)) {
      updateItem(itemId, { tags: [...currentTags, cleanTag] });
    }
    setNewTagText('');
    setNewTagInputItemId(null);
  };

  // Quick Category Change or Reset
  const handleQuickCategoryChange = (itemId: string, newCategory: string) => {
    updateItem(itemId, { category: newCategory });
  };

  const handleQuickDeleteCategory = (itemId: string) => {
    const fallbackCategory = categories[0] || 'Tops';
    updateItem(itemId, { category: fallbackCategory });
  };

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

  // Bulk Multi-Select & Delete Actions
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
    deleteMultipleItems(ids);
    setSelectedItemIds(new Set());
  }, [selectedItemIds, deleteMultipleItems]);

  const handleDeleteSingleItem = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    deleteItem(id);
    setSelectedItemIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return prev;
    });
  }, [deleteItem]);

  return (
    <div className="space-y-4">
      {/* Header & Quick Actions */}
      <div className="bg-white border border-[#E5E5E1] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">Inventory Studio</h1>
              <span className="font-mono text-xs px-2 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#5A5A55]">
                {items.length} garments total
              </span>
            </div>
            {displaySettings.showStatsBanner && (
              <p className="text-xs text-[#767670] mt-0.5">
                Showing {filteredItems.length} matching pieces • Valuation:{' '}
                <strong className="text-[#1A1A1A] font-mono">{formatGbp(filteredTotalValue)}</strong> • Total
                Wears Logged:{' '}
                <strong className="text-[#1A1A1A] font-mono">{filteredTotalWears} wears</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle (Icon Only) */}
            <div className="flex items-center border border-[#E5E5E1] p-0.5 bg-[#F8F7F4]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
                title="Grid View (Visual Cards)"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 text-xs transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
                title="Table Database View"
                aria-label="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Display Settings Toggle */}
            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(true)}
              id="inventory-display-settings-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-[#D5D5D0] bg-white text-[#4A4A45] hover:border-[#8C7355] hover:text-[#1A1A1A] transition-all cursor-pointer shadow-xs"
              title="Configure inventory display sections and density"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Display Settings</span>
            </button>

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
                    ? 'Deselect all visible garments'
                    : 'Select all visible garments'
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

            {/* Auto-Import from Link Button (Includes URL, Vinted HTML/PDF, Photo, Text) */}
            <button
              onClick={() => {
                setAutoImportTab('url');
                setIsAutoImportOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium border border-[#8C7355] text-[#8C7355] hover:bg-[#8C7355] hover:text-white transition-all cursor-pointer shadow-xs"
              title="Automatically extract garment details from product link or Vinted data"
            >
              <Link2 className="w-3.5 h-3.5" />
              Auto-Import Link
            </button>

            {/* Add New Item Button */}
            <button
              onClick={onOpenAddItem}
              id="wardrobe-add-btn"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Garment
            </button>
          </div>
        </div>

        {/* Quick URL Auto-Add Inline Bar */}
        {displaySettings.showQuickUrlBar && (
          <div className="mt-3 pt-3 border-t border-[#E5E5E1] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="url"
                placeholder="Quick link import: Paste product URL (e.g. Barbour, Zara, Arket, Net-A-Porter) and press Enter..."
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
              Import from URL
            </button>
          </div>
        )}
      </div>

      {/* Category Manager & Filter Bar */}
      {displaySettings.showCategoryTabs && (
        <div className="bg-white border border-[#E5E5E1] p-3 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-[#8C7355]" />
              <span className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                Garment Categories
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

          {/* Dynamic Category Chips with Inline Rename & (x) Deletion */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {/* All Garments Pill */}
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap font-mono ${
                selectedCategory === 'All'
                  ? 'bg-[#8C7355] text-white border-[#8C7355] font-semibold shadow-xs'
                  : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
              }`}
            >
              All Pieces ({items.length})
            </button>

            {/* Dynamic Categories */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = items.filter((i) => i.category === cat).length;
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

      {/* Secondary Filters Bar */}
      {displaySettings.showFilterBar && (
        <div className="bg-white border border-[#E5E5E1] p-3 space-y-2.5 shadow-xs">
          {/* Search Facility */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-[#F8F7F4] border border-[#E5E5E1] px-3 py-1.5 focus-within:border-[#8C7355] focus-within:bg-white transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
              <input
                type="text"
                placeholder="Search inventory by name, brand, category, material, color, size, tags, notes, seller, order status..."
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

          <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <option value="All">All Brands ({items.filter((i) => !i.isArchived).length})</option>
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
                    className="text-[#767670] hover:text-rose-600 p-0.5"
                    title="Clear brand filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Season Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#767670] font-mono text-[11px]">Season:</span>
                <div className="relative">
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value as any)}
                    className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-1 pr-6 focus:outline-none focus:border-[#8C7355] appearance-none"
                  >
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#767670] absolute right-1.5 top-2 pointer-events-none" />
                </div>
                {selectedSeason !== 'All' && (
                  <button
                    onClick={() => setSelectedSeason('All')}
                    className="text-[#767670] hover:text-rose-600 p-0.5"
                    title="Clear season filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Condition Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#767670] font-mono text-[11px]">Condition:</span>
                <div className="relative">
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value as any)}
                    className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-1 pr-6 focus:outline-none focus:border-[#8C7355] appearance-none"
                  >
                    <option value="All">All Conditions</option>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#767670] absolute right-1.5 top-2 pointer-events-none" />
                </div>
                {selectedCondition !== 'All' && (
                  <button
                    onClick={() => setSelectedCondition('All')}
                    className="text-[#767670] hover:text-rose-600 p-0.5"
                    title="Clear condition filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs border transition-all cursor-pointer ${
                  favoritesOnly
                    ? 'bg-rose-50 text-rose-800 border-rose-200 font-semibold'
                    : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:text-[#1A1A1A]'
                }`}
              >
                <Heart className={`w-3 h-3 ${favoritesOnly ? 'fill-rose-600 text-rose-600' : ''}`} />
                <span>Favorites Only</span>
                {favoritesOnly && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavoritesOnly(false);
                    }}
                    className="hover:text-rose-900 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>

            {/* Sort Dropdown & Reset Filters */}
            <div className="flex items-center gap-2">
              {(selectedCategory !== 'All' ||
                selectedBrand !== 'All' ||
                selectedSeason !== 'All' ||
                selectedCondition !== 'All' ||
                favoritesOnly ||
                searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedBrand('All');
                    setSelectedSeason('All');
                    setSelectedCondition('All');
                    setFavoritesOnly(false);
                    setSearchQuery('');
                  }}
                  className="text-[11px] font-mono text-[#8C7355] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear All (✕)
                </button>
              )}

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-[#767670] font-mono">Sort:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-1 pr-6 focus:outline-none focus:border-[#8C7355] appearance-none font-medium"
                  >
                    <option value="wears_desc">Most Worn (Frequency)</option>
                    <option value="price_desc">Price: High to Low (£)</option>
                    <option value="price_asc">Price: Low to High (£)</option>
                    <option value="newest">Recently Added</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#767670] absolute right-1.5 top-2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {selectedItemIds.size} of {items.length} garments selected
                {filteredItems.length !== items.length && (
                  <span className="text-[#A5A59E] font-normal"> ({filteredItems.length} matching filter)</span>
                )}
              </span>
            </div>
            <span className="text-xs text-[#A5A59E] font-mono hidden sm:inline">
              (Valuation: {formatGbp(selectedTotalValuation)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selectedItemIds);
                moveMultipleWardrobeItems(ids, 'selling');
                setSelectedItemIds(new Set());
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#007782] hover:bg-[#005E67] text-white shadow-xs cursor-pointer transition-colors"
              title="List selected garments for resale/sales"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>List for Resale ({selectedItemIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selectedItemIds);
                moveMultipleWardrobeItems(ids, 'shopping');
                setSelectedItemIds(new Set());
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#3A3A38] hover:bg-[#4A4A48] text-[#E5E5E1] border border-[#555] shadow-xs cursor-pointer transition-colors"
              title="Move selected garments to shopping/wishlist"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>To Wishlist ({selectedItemIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs cursor-pointer transition-colors"
              title="Bulk edit category, tags, condition, seasons, and prices for selected garments"
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
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer transition-colors"
              title="Delete all selected items immediately"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedItemIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Wardrobe Items Display */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E5E5E1] space-y-3">
          <Info className="w-6 h-6 text-[#8C7355] mx-auto" />
          <h3 className="text-sm font-serif font-semibold text-[#1A1A1A]">
            No wardrobe items match your criteria
          </h3>
          <p className="text-xs text-[#767670] max-w-sm mx-auto">
            Try adjusting your search query, clearing category filters, or importing clothes from a link.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSeason('All');
                setSelectedCondition('All');
                setFavoritesOnly(false);
                setSearchQuery('');
              }}
              className="px-3 py-1.5 text-xs bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#1A1A1A] border border-[#E5E5E1] cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setIsAutoImportOpen(true)}
              className="px-3.5 py-1.5 text-xs bg-[#8C7355] hover:bg-[#735D43] text-white cursor-pointer flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Auto-Import from Link
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ======================== GRID VIEW (WITH INLINE EDITING) ======================== */
        <div
          className={`grid ${
            displaySettings.density === 'dense'
              ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2'
              : displaySettings.density === 'compact'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          }`}
        >
          {filteredItems.map((item) => {
            const isEditingBrand = editingFieldId === `${item.id}_brand`;
            const isEditingName = editingFieldId === `${item.id}_name`;
            const isEditingPrice = editingFieldId === `${item.id}_purchasePrice`;
            const isEditingWear = editingFieldId === `${item.id}_wearCount`;
            const isSelected = selectedItemIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white border transition-all flex flex-col justify-between group shadow-xs ${
                  isSelected
                    ? 'border-[#8C7355] ring-2 ring-[#8C7355]/40 bg-amber-50/10'
                    : 'border-[#E5E5E1] hover:border-[#8C7355]'
                }`}
              >
                {/* Image & Quick Badges */}
                {displaySettings.showImage && (
                  <div
                    className="aspect-[3/4] bg-[#F8F7F4] relative overflow-hidden flex items-center justify-center p-2 border-b border-[#E5E5E1] cursor-pointer"
                    onClick={() => onSelectItem(item)}
                  >
                    <GarmentImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="w-full h-full max-h-full max-w-full object-contain group-hover:scale-103 transition-transform duration-300"
                      containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4]"
                    />

                    {/* Top Left: Multi-Select Checkbox & Category Badge */}
                    <div
                      className="absolute top-2 left-2 flex items-center gap-1.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectItem(item.id, e)}
                        className={`w-6 h-6 border shadow-xs flex items-center justify-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#8C7355] border-[#8C7355] text-white ring-2 ring-[#8C7355]/30'
                            : 'bg-white/95 border-[#B5B5AF] text-transparent hover:border-[#8C7355] hover:bg-white'
                        }`}
                        title={isSelected ? 'Deselect garment' : 'Select garment for bulk actions'}
                        aria-label={isSelected ? 'Deselect garment' : 'Select garment'}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-none border border-transparent" />
                        )}
                      </button>

                      {displaySettings.showCategory && (
                        <div className="flex items-center gap-0.5">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleQuickCategoryChange(item.id, e.target.value)
                            }
                            className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-white/95 text-[#1A1A1A] border border-[#D5D5D0] shadow-xs focus:outline-none cursor-pointer max-w-[90px] truncate"
                            title="Change category inline"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickDeleteCategory(item.id);
                            }}
                            className="p-0.5 bg-white/95 text-[#767670] hover:text-rose-600 border border-[#D5D5D0] shadow-xs cursor-pointer"
                            title={`Reset category (✕)`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Top Right: Favorite & Quick Delete */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemFavorite(item.id);
                        }}
                        className="p-1.5 bg-white/95 text-[#767670] hover:text-rose-600 border border-[#D5D5D0] shadow-xs transition-colors cursor-pointer"
                        title="Toggle Favorite"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            item.isFavorite ? 'fill-rose-600 text-rose-600' : ''
                          }`}
                        />
                      </button>

                      <button
                        onClick={(e) => handleDeleteSingleItem(item.id, e)}
                        className="p-1.5 bg-white/95 text-[#767670] hover:text-rose-600 border border-[#D5D5D0] shadow-xs transition-colors cursor-pointer"
                        title="Delete garment (✕)"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Garment Details & Inline Editable Elements */}
                <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    {/* Brand & Price (Inline Editable) */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Brand Editor */}
                      {displaySettings.showBrand && (
                        <div>
                          {isEditingBrand ? (
                            <div className="flex items-center gap-1 flex-1">
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
                                className="w-full text-xs font-mono font-bold text-[#8C7355] border border-[#8C7355] px-1 py-0.5 bg-white"
                              />
                              <button
                                onClick={() => handleSaveInline(item.id, 'brand')}
                                className="text-emerald-700 hover:text-emerald-900"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingFieldId(`${item.id}_brand`);
                                setEditingValue(item.brand);
                              }}
                              className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-bold hover:underline cursor-pointer flex items-center gap-1"
                              title="Click to edit brand inline"
                            >
                              {item.brand}
                              <PencilIcon />
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price (£) Editor */}
                      {displaySettings.showPrice && (
                        <div>
                          {isEditingPrice ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono font-bold text-[#8C7355]">£</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => handleSaveInline(item.id, 'purchasePrice')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInline(item.id, 'purchasePrice');
                                  if (e.key === 'Escape') setEditingFieldId(null);
                                }}
                                autoFocus
                                className="w-16 text-xs font-mono font-bold text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white"
                              />
                              <button
                                onClick={() => handleSaveInline(item.id, 'purchasePrice')}
                                className="text-emerald-700 hover:text-emerald-900"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingFieldId(`${item.id}_purchasePrice`);
                                setEditingValue(item.purchasePrice.toString());
                              }}
                              className="text-xs font-mono font-bold text-[#1A1A1A] hover:text-[#8C7355] hover:underline cursor-pointer flex items-center gap-0.5"
                              title="Click to edit price inline (£)"
                            >
                              {formatGbp(item.purchasePrice)}
                              <PencilIcon />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Garment Title (Inline Editable) */}
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
                        <button
                          onClick={() => handleSaveInline(item.id, 'name')}
                          className="text-emerald-700 hover:text-emerald-900"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <h3
                        onClick={() => {
                          setEditingFieldId(`${item.id}_name`);
                          setEditingValue(item.name);
                        }}
                        className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1 hover:text-[#8C7355] cursor-pointer flex items-center justify-between"
                        title="Click to edit title inline"
                      >
                        <span className="truncate">{item.name}</span>
                        <PencilIcon />
                      </h3>
                    )}

                    {/* Color & Seasons */}
                    <p className="text-[11px] text-[#767670] line-clamp-1 font-sans">
                      {item.color}
                      {displaySettings.showSeason && item.season && ` • ${Array.isArray(item.season) ? item.season.join(', ') : item.season}`}
                      {displaySettings.showCondition && item.condition && ` • ${item.condition}`}
                    </p>

                    {/* Storage Location */}
                    {displaySettings.showLocation && item.storageLocation && (
                      <p className="text-[10px] font-mono text-[#8C7355] flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {item.storageLocation}
                      </p>
                    )}

                    {/* Vinted Link / Order Details */}
                    {displaySettings.showVintedDetails && (item.vintedUrl || item.orderNumber) && (
                      <div className="text-[10px] font-mono text-[#007782] flex items-center gap-1">
                        {item.vintedUrl ? (
                          <a
                            href={item.vintedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {item.orderNumber ? `Order #${item.orderNumber}` : 'Vinted Listing'}
                          </a>
                        ) : (
                          <span>Ref: #{item.orderNumber}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags with Quick (x) Deletion & Quick Inline Add */}
                  {displaySettings.showTags && (
                    <div className="space-y-1 pt-1 border-t border-[#E5E5E1]">
                      <div className="flex flex-wrap items-center gap-1">
                        {item.tags.map((tag) => (
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

                        {/* Add Tag Input */}
                        {newTagInputItemId === item.id ? (
                          <div className="inline-flex items-center gap-0.5">
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
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setNewTagInputItemId(item.id);
                              setNewTagText('');
                            }}
                            className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] px-1 py-0.5 border border-dashed border-[#D5D5D0] hover:border-[#8C7355] cursor-pointer"
                            title="Add tag"
                          >
                            + tag
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Bar: Wear Counter & Full Modal Trigger */}
                  <div className="pt-2 border-t border-[#E5E5E1] flex items-center justify-between gap-2">
                    {/* Inline Wear Counter Editor & Incrementor */}
                    {displaySettings.showWearCount ? (
                      <div className="flex items-center gap-1.5">
                        {isEditingWear ? (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveInline(item.id, 'wearCount')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInline(item.id, 'wearCount');
                                if (e.key === 'Escape') setEditingFieldId(null);
                              }}
                              autoFocus
                              className="w-12 text-xs font-mono font-bold text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white"
                            />
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              setEditingFieldId(`${item.id}_wearCount`);
                              setEditingValue(item.wearCount.toString());
                            }}
                            className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                            title="Click to manually edit wear count"
                          >
                            Worn: <strong className="text-[#1A1A1A]">{item.wearCount}x</strong>
                          </span>
                        )}

                        <button
                          onClick={() => logItemWear(item.id)}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#F2F1ED] hover:bg-[#8C7355] hover:text-white border border-[#E5E5E1] transition-colors cursor-pointer"
                          title="Log wear today (+1)"
                        >
                          +1
                        </button>
                      </div>
                    ) : <div />}

                    {displaySettings.showQuickActions !== false && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveWardrobeItemToSales(item.id);
                          }}
                          className="p-1 text-[#007782] hover:text-white border border-[#007782]/30 hover:bg-[#007782] transition-colors cursor-pointer"
                          title="List garment for Resale / Sales"
                        >
                          <Tag className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveWardrobeItemToShopping(item.id);
                          }}
                          className="p-1 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Move garment to Wishlist"
                        >
                          <ShoppingBag className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(item);
                          }}
                          className="p-1 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Open Full Edit Modal"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================== DATABASE TABLE VIEW (WITH RESIZABLE DRAGGABLE COLUMNS & SEPARATE SETTINGS) ======================== */
        <InventoryDatabaseTable
          items={filteredItems}
          selectedItemIds={selectedItemIds}
          onToggleSelectItem={handleToggleSelectItem}
          onSelectAll={handleToggleSelectAll}
          areAllSelected={areAllFilteredSelected}
          areSomeSelected={areSomeFilteredSelected}
          displaySettings={displaySettings}
          onSelectItem={onSelectItem}
          onEditItem={onEditItem}
          onSellItem={(item) => moveWardrobeItemToSales(item.id)}
        />
      )}

      {/* Auto Import from Link & Vinted Modal */}
      <AutoImportModal
        isOpen={isAutoImportOpen}
        onClose={() => {
          setIsAutoImportOpen(false);
          setQuickUrl('');
        }}
        initialUrl={quickUrl}
        initialTab={autoImportTab}
        defaultDestination="wardrobe"
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        targetType="wardrobe"
        selectedIds={Array.from(selectedItemIds)}
        onComplete={() => setSelectedItemIds(new Set())}
      />

      {/* Duplicate Merging Modal */}
      <DuplicateMergeModal
        isOpen={isDuplicateMergeOpen}
        onClose={() => setIsDuplicateMergeOpen(false)}
        defaultTab="wardrobe"
      />

      {/* Inventory Display Settings Modal */}
      <InventoryDisplaySettingsModal
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
        settings={displaySettings}
        onChange={handleUpdateDisplaySettings}
        onResetColumnWidths={() => {
          localStorage.removeItem('inventory_table_widths_v2');
          window.location.reload();
        }}
      />
    </div>
  );
};

// Subtle icon for editable indicators
const PencilIcon = () => (
  <span className="inline-block text-[#A5A59E] hover:text-[#8C7355] text-[9px] opacity-70 ml-0.5">
    ✎
  </span>
);
