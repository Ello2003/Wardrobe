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
  PoundSterling,
  ShoppingBag,
  Layers,
  Search,
  MapPin,
  ExternalLink,
  CheckCircle,
  Ban,
  Shirt,
  Pencil,
  Package,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { WardrobeItem, Category, Season, Condition, isHomewareCategory } from '../types';
import { safeConfirm } from '../utils/safeConfirm';
import { AutoImportModal } from './AutoImportModal';
import { GarmentImage } from './GarmentImage';
import { BulkEditModal } from './BulkEditModal';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { InventoryDatabaseTable, getColorHex } from './InventoryDatabaseTable';
import { BulkActionBar } from './common/BulkActionBar';
import { EmptyState } from './common/EmptyState';
import { InlineEditableTitle } from './common/InlineEditableTitle';
import { formatGbp } from '../utils/formatters';
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
    garmentCategories,
    homewareCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    addGarmentCategory,
    updateGarmentCategory,
    deleteGarmentCategory,
    resetGarmentCategories,
    addHomewareCategory,
    updateHomewareCategory,
    deleteHomewareCategory,
    resetHomewareCategories,
    moveWardrobeItemToSales,
    moveWardrobeItemToShopping,
    moveMultipleWardrobeItems,
    formatCurrency,
    customLabels,
    updateCustomLabel,
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

  const [pipelineTab, setPipelineTab] = useState<'All' | 'Closet' | 'Purchased' | 'Sold' | 'Cancelled'>(() => {
    try {
      const saved = localStorage.getItem('inventory_pipeline_tab');
      if (saved && ['All', 'Closet', 'Purchased', 'Sold', 'Cancelled'].includes(saved)) {
        return saved as any;
      }
    } catch (e) {}
    return 'All';
  });

  const handleSetPipelineTab = (tab: 'All' | 'Closet' | 'Purchased' | 'Sold' | 'Cancelled') => {
    setPipelineTab(tab);
    try {
      localStorage.setItem('inventory_pipeline_tab', tab);
    } catch (e) {}
  };

  const [selectedTag, setSelectedTag] = useState<string>(() => {
    try {
      return localStorage.getItem('inventory_selected_tag') || 'All';
    } catch (e) {}
    return 'All';
  });

  const handleSetSelectedTag = (tag: string) => {
    setSelectedTag(tag);
    try {
      localStorage.setItem('inventory_selected_tag', tag);
    } catch (e) {}
  };

  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>(() => {
    try {
      return localStorage.getItem('inventory_selected_category') || 'All';
    } catch (e) {}
    return 'All';
  });

  // Independent Garment & Homeware Filter States
  const [selectedGarmentCategory, setSelectedGarmentCategory] = useState<string | 'All'>(() => {
    try {
      return localStorage.getItem('inventory_selected_garment_category') || 'All';
    } catch (e) {}
    return 'All';
  });

  const [selectedGarmentTag, setSelectedGarmentTag] = useState<string | 'All'>(() => {
    try {
      return localStorage.getItem('inventory_selected_garment_tag') || 'All';
    } catch (e) {}
    return 'All';
  });

  const [selectedHomewareCategory, setSelectedHomewareCategory] = useState<string | 'All'>(() => {
    try {
      return localStorage.getItem('inventory_selected_homeware_category') || 'All';
    } catch (e) {}
    return 'All';
  });

  const [selectedHomewareTag, setSelectedHomewareTag] = useState<string | 'All'>(() => {
    try {
      return localStorage.getItem('inventory_selected_homeware_tag') || 'All';
    } catch (e) {}
    return 'All';
  });

  const [categoryFilterScope, setCategoryFilterScope] = useState<'all' | 'garments' | 'homeware'>(() => {
    try {
      return (localStorage.getItem('inventory_category_filter_scope') as any) || 'all';
    } catch (e) {}
    return 'all';
  });

  const handleSelectGarmentCategory = (cat: string | 'All' | '__ALL_GARMENTS__') => {
    if (cat === 'All' || (categoryFilterScope === 'garments' && selectedGarmentCategory === cat)) {
      setCategoryFilterScope('all');
      setSelectedGarmentCategory('All');
      try {
        localStorage.setItem('inventory_category_filter_scope', 'all');
        localStorage.setItem('inventory_selected_garment_category', 'All');
      } catch (e) {}
      return;
    }
    setCategoryFilterScope('garments');
    setSelectedGarmentCategory(cat);
    setSelectedHomewareCategory('All');
    setSelectedHomewareTag('All');
    setSelectedCategory('All');
    try {
      localStorage.setItem('inventory_category_filter_scope', 'garments');
      localStorage.setItem('inventory_selected_garment_category', cat);
      localStorage.setItem('inventory_selected_homeware_category', 'All');
      localStorage.setItem('inventory_selected_homeware_tag', 'All');
      localStorage.setItem('inventory_selected_category', 'All');
    } catch (e) {}
  };

  const handleSelectGarmentTag = (tag: string | 'All') => {
    if (tag === 'All' || (categoryFilterScope === 'garments' && selectedGarmentTag === tag)) {
      setSelectedGarmentTag('All');
      if (selectedGarmentCategory === 'All') {
        setCategoryFilterScope('all');
        try {
          localStorage.setItem('inventory_category_filter_scope', 'all');
        } catch (e) {}
      }
      try {
        localStorage.setItem('inventory_selected_garment_tag', 'All');
      } catch (e) {}
      return;
    }
    setCategoryFilterScope('garments');
    setSelectedGarmentTag(tag);
    setSelectedHomewareCategory('All');
    setSelectedHomewareTag('All');
    setSelectedTag('All');
    try {
      localStorage.setItem('inventory_category_filter_scope', 'garments');
      localStorage.setItem('inventory_selected_garment_tag', tag);
      localStorage.setItem('inventory_selected_homeware_category', 'All');
      localStorage.setItem('inventory_selected_homeware_tag', 'All');
      localStorage.setItem('inventory_selected_tag', 'All');
    } catch (e) {}
  };

  const handleSelectHomewareCategory = (cat: string | 'All' | '__ALL_HOMEWARE__') => {
    if (cat === 'All' || (categoryFilterScope === 'homeware' && selectedHomewareCategory === cat)) {
      setCategoryFilterScope('all');
      setSelectedHomewareCategory('All');
      try {
        localStorage.setItem('inventory_category_filter_scope', 'all');
        localStorage.setItem('inventory_selected_homeware_category', 'All');
      } catch (e) {}
      return;
    }
    setCategoryFilterScope('homeware');
    setSelectedHomewareCategory(cat);
    setSelectedGarmentCategory('All');
    setSelectedGarmentTag('All');
    setSelectedCategory('All');
    try {
      localStorage.setItem('inventory_category_filter_scope', 'homeware');
      localStorage.setItem('inventory_selected_homeware_category', cat);
      localStorage.setItem('inventory_selected_garment_category', 'All');
      localStorage.setItem('inventory_selected_garment_tag', 'All');
      localStorage.setItem('inventory_selected_category', 'All');
    } catch (e) {}
  };

  const handleSelectHomewareTag = (tag: string | 'All') => {
    if (tag === 'All' || (categoryFilterScope === 'homeware' && selectedHomewareTag === tag)) {
      setSelectedHomewareTag('All');
      if (selectedHomewareCategory === 'All') {
        setCategoryFilterScope('all');
        try {
          localStorage.setItem('inventory_category_filter_scope', 'all');
        } catch (e) {}
      }
      try {
        localStorage.setItem('inventory_selected_homeware_tag', 'All');
      } catch (e) {}
      return;
    }
    setCategoryFilterScope('homeware');
    setSelectedHomewareTag(tag);
    setSelectedGarmentCategory('All');
    setSelectedGarmentTag('All');
    setSelectedTag('All');
    try {
      localStorage.setItem('inventory_category_filter_scope', 'homeware');
      localStorage.setItem('inventory_selected_homeware_tag', tag);
      localStorage.setItem('inventory_selected_garment_category', 'All');
      localStorage.setItem('inventory_selected_garment_tag', 'All');
      localStorage.setItem('inventory_selected_tag', 'All');
    } catch (e) {}
  };

  const handleClearAllCategoryFilters = () => {
    setCategoryFilterScope('all');
    setSelectedGarmentCategory('All');
    setSelectedGarmentTag('All');
    setSelectedHomewareCategory('All');
    setSelectedHomewareTag('All');
    setSelectedCategory('All');
    setSelectedTag('All');
    try {
      localStorage.setItem('inventory_category_filter_scope', 'all');
      localStorage.setItem('inventory_selected_garment_category', 'All');
      localStorage.setItem('inventory_selected_garment_tag', 'All');
      localStorage.setItem('inventory_selected_homeware_category', 'All');
      localStorage.setItem('inventory_selected_homeware_tag', 'All');
      localStorage.setItem('inventory_selected_category', 'All');
      localStorage.setItem('inventory_selected_tag', 'All');
    } catch (e) {}
  };

  const handleSetSelectedCategory = (cat: string | 'All') => {
    if (cat === 'All') {
      handleClearAllCategoryFilters();
      return;
    }
    if (isHomewareCategory(cat)) {
      handleSelectHomewareCategory(cat);
    } else {
      handleSelectGarmentCategory(cat);
    }
  };

  const [selectedBrand, setSelectedBrand] = useState<string | 'All'>(() => {
    try {
      return localStorage.getItem('inventory_selected_brand') || 'All';
    } catch (e) {}
    return 'All';
  });

  const handleSetSelectedBrand = (brand: string | 'All') => {
    setSelectedBrand(brand);
    try {
      localStorage.setItem('inventory_selected_brand', brand);
    } catch (e) {}
  };

  const [selectedSeason, setSelectedSeason] = useState<Season | 'All'>(() => {
    try {
      return (localStorage.getItem('inventory_selected_season') as any) || 'All';
    } catch (e) {}
    return 'All';
  });

  const handleSetSelectedSeason = (s: Season | 'All') => {
    setSelectedSeason(s);
    try {
      localStorage.setItem('inventory_selected_season', s);
    } catch (e) {}
  };

  const [selectedCondition, setSelectedCondition] = useState<Condition | 'All'>(() => {
    try {
      return (localStorage.getItem('inventory_selected_condition') as any) || 'All';
    } catch (e) {}
    return 'All';
  });

  const handleSetSelectedCondition = (c: Condition | 'All') => {
    setSelectedCondition(c);
    try {
      localStorage.setItem('inventory_selected_condition', c);
    } catch (e) {}
  };

  const [sortBy, setSortBy] = useState<
    'wears_desc' | 'price_desc' | 'price_asc' | 'rrp_desc' | 'newest'
  >(() => {
    try {
      const saved = localStorage.getItem('inventory_sort_by');
      if (saved && ['wears_desc', 'price_desc', 'price_asc', 'rrp_desc', 'newest'].includes(saved)) {
        return saved as any;
      }
    } catch (e) {}
    return 'wears_desc';
  });

  const handleSetSortBy = (sort: 'wears_desc' | 'price_desc' | 'price_asc' | 'rrp_desc' | 'newest') => {
    setSortBy(sort);
    try {
      localStorage.setItem('inventory_sort_by', sort);
    } catch (e) {}
  };

  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(() => {
    try {
      return localStorage.getItem('inventory_favorites_only') === 'true';
    } catch (e) {}
    return false;
  });

  const handleSetFavoritesOnly = (fav: boolean) => {
    setFavoritesOnly(fav);
    try {
      localStorage.setItem('inventory_favorites_only', String(fav));
    } catch (e) {}
  };

  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('inventory_display_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.viewMode === 'table') return 'table';
      }
    } catch (e) {}
    return displaySettings.viewMode === 'table' ? 'table' : 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    handleUpdateDisplaySettings({ ...displaySettings, viewMode: mode });
  };

  useEffect(() => {
    if (displaySettings.viewMode) {
      setViewMode(displaySettings.viewMode === 'table' ? 'table' : 'grid');
    }
  }, [displaySettings.viewMode]);

  // Multi-item selection state for bulk deletion
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);

  // Category management state (Legacy fallback + Independent Garment & Homeware)
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Garment Category Management State
  const [isAddingGarmentCategory, setIsAddingGarmentCategory] = useState(false);
  const [newGarmentCategoryName, setNewGarmentCategoryName] = useState('');
  const [editingGarmentCategoryName, setEditingGarmentCategoryName] = useState<string | null>(null);
  const [editingGarmentCategoryValue, setEditingGarmentCategoryValue] = useState('');

  // Homeware Category Management State
  const [isAddingHomewareCategory, setIsAddingHomewareCategory] = useState(false);
  const [newHomewareCategoryName, setNewHomewareCategoryName] = useState('');
  const [editingHomewareCategoryName, setEditingHomewareCategoryName] = useState<string | null>(null);
  const [editingHomewareCategoryValue, setEditingHomewareCategoryValue] = useState('');

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

  // Unique Tags with counts across wardrobe items
  const uniqueTags = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => {
      if (!it.isArchived && Array.isArray(it.tags)) {
        it.tags.forEach((t) => {
          const clean = t.trim();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  // Unique Tags specifically for Garment pieces
  const uniqueGarmentTags = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => {
      if (!it.isArchived && !isHomewareCategory(it.category) && Array.isArray(it.tags)) {
        it.tags.forEach((t) => {
          const clean = t.trim();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  // Unique Tags specifically for Homeware pieces
  const uniqueHomewareTags = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => {
      if (!it.isArchived && isHomewareCategory(it.category) && Array.isArray(it.tags)) {
        it.tags.forEach((t) => {
          const clean = t.trim();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  // Pipeline Counts (All, Closet, Purchased, Sold, Cancelled)
  const garmentItemsCount = useMemo(
    () => items.filter((it) => !it.isArchived && !isHomewareCategory(it.category)).length,
    [items]
  );
  const homewareItemsCount = useMemo(
    () => items.filter((it) => !it.isArchived && isHomewareCategory(it.category)).length,
    [items]
  );

  const pipelineStats = useMemo(() => {
    let closet = 0;
    let purchased = 0;
    let sold = 0;
    let cancelled = 0;

    items.forEach((it) => {
      if (it.isArchived) return;
      const lowerTags = (it.tags || []).map((t) => t.toLowerCase());
      const lowerStatus = (it.orderStatus || '').toLowerCase();
      const lowerNotes = (it.notes || '').toLowerCase();

      const isSold =
        lowerTags.includes('sold') ||
        lowerStatus === 'sold' ||
        it.transactionType === 'Sale';

      const isCancelled =
        lowerStatus.includes('cancel') ||
        lowerStatus.includes('refund') ||
        lowerTags.includes('cancelled') ||
        lowerTags.includes('refunded') ||
        lowerNotes.includes('cancelled');

      const isPurchased =
        Boolean(it.orderNumber) ||
        it.transactionType === 'Purchase' ||
        lowerStatus.includes('purchase') ||
        lowerStatus.includes('delivered') ||
        lowerStatus.includes('completed') ||
        lowerTags.includes('bought') ||
        lowerTags.includes('purchased') ||
        lowerTags.includes('order-history') ||
        lowerTags.includes('pre-owned') ||
        lowerTags.includes('vinted');

      if (isSold) sold++;
      if (isCancelled) cancelled++;
      if (isPurchased) purchased++;
      if (!isSold && !isCancelled) closet++;
    });

    return {
      all: items.filter((i) => !i.isArchived).length,
      closet,
      purchased,
      sold,
      cancelled,
    };
  }, [items]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (item.isArchived) return false;
        if (favoritesOnly && !item.isFavorite) return false;

        // Pipeline Filter
        if (pipelineTab !== 'All') {
          const lowerTags = (item.tags || []).map((t) => t.toLowerCase());
          const lowerStatus = (item.orderStatus || '').toLowerCase();
          const lowerNotes = (item.notes || '').toLowerCase();

          const isSold =
            lowerTags.includes('sold') ||
            lowerStatus === 'sold' ||
            item.transactionType === 'Sale';

          const isCancelled =
            lowerStatus.includes('cancel') ||
            lowerStatus.includes('refund') ||
            lowerTags.includes('cancelled') ||
            lowerTags.includes('refunded') ||
            lowerNotes.includes('cancelled');

          const isPurchased =
            Boolean(item.orderNumber) ||
            item.transactionType === 'Purchase' ||
            lowerStatus.includes('purchase') ||
            lowerStatus.includes('delivered') ||
            lowerStatus.includes('completed') ||
            lowerTags.includes('bought') ||
            lowerTags.includes('purchased') ||
            lowerTags.includes('order-history') ||
            lowerTags.includes('pre-owned') ||
            lowerTags.includes('vinted');

          if (pipelineTab === 'Closet' && (isSold || isCancelled)) return false;
          if (pipelineTab === 'Purchased' && !isPurchased) return false;
          if (pipelineTab === 'Sold' && !isSold) return false;
          if (pipelineTab === 'Cancelled' && !isCancelled) return false;
        }

        // Independent Category & Tag Filtering System (Garments vs Homeware)
        if (categoryFilterScope === 'garments') {
          if (isHomewareCategory(item.category)) return false;
          if (
            selectedGarmentCategory !== 'All' &&
            selectedGarmentCategory !== '__ALL_GARMENTS__' &&
            (item.category || '').trim().toLowerCase() !== selectedGarmentCategory.trim().toLowerCase()
          ) {
            return false;
          }
          if (selectedGarmentTag !== 'All') {
            if (!item.tags || !item.tags.some((t) => t.toLowerCase() === selectedGarmentTag.toLowerCase())) {
              return false;
            }
          }
        } else if (categoryFilterScope === 'homeware') {
          if (!isHomewareCategory(item.category)) return false;
          if (
            selectedHomewareCategory !== 'All' &&
            selectedHomewareCategory !== '__ALL_HOMEWARE__' &&
            (item.category || '').trim().toLowerCase() !== selectedHomewareCategory.trim().toLowerCase()
          ) {
            return false;
          }
          if (selectedHomewareTag !== 'All') {
            if (!item.tags || !item.tags.some((t) => t.toLowerCase() === selectedHomewareTag.toLowerCase())) {
              return false;
            }
          }
        } else {
          // Both are 'All', all inventory pieces are allowed
          // Optional backward compatible legacy filter check
          if (selectedCategory === '__GARMENTS__') {
            if (isHomewareCategory(item.category)) return false;
          } else if (selectedCategory === '__HOMEWARE__') {
            if (!isHomewareCategory(item.category)) return false;
          } else if (
            selectedCategory !== 'All' &&
            (item.category || '').trim().toLowerCase() !== selectedCategory.trim().toLowerCase()
          ) {
            return false;
          }
          if (selectedTag !== 'All') {
            if (!item.tags || !item.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
              return false;
            }
          }
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
          case 'rrp_desc':
            return (b.rrp || 0) - (a.rrp || 0);
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
  }, [
    items,
    pipelineTab,
    categoryFilterScope,
    selectedGarmentCategory,
    selectedGarmentTag,
    selectedHomewareCategory,
    selectedHomewareTag,
    selectedTag,
    selectedCategory,
    selectedBrand,
    selectedSeason,
    selectedCondition,
    favoritesOnly,
    searchQuery,
    sortBy,
  ]);

  const filteredTotalValue = filteredItems.reduce((acc, item) => acc + item.purchasePrice, 0);
  const filteredTotalRrp = filteredItems.reduce((acc, item) => acc + (item.rrp || 0), 0);
  const filteredTotalWears = filteredItems.reduce((acc, item) => acc + item.wearCount, 0);

  const selectedTotalValuation = useMemo(() => {
    let sum = 0;
    for (const id of selectedItemIds) {
      const itm = items.find((i) => i.id === id);
      if (itm) sum += itm.purchasePrice || 0;
    }
    return sum;
  }, [selectedItemIds, items]);

  // Inline editing commit handler
  const handleSaveInline = (itemId: string, field: keyof WardrobeItem) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    let parsedVal: any = editingValue.trim();
    if (field === 'purchasePrice') {
      parsedVal = parseFloat(editingValue) || item.purchasePrice;
    } else if (field === 'rrp') {
      const p = parseFloat(editingValue);
      parsedVal = !isNaN(p) && p >= 0 ? p : undefined;
    } else if (field === 'wearCount') {
      parsedVal = Math.max(0, parseInt(editingValue) || 0);
    } else if (field === 'color') {
      const detectedHex = getColorHex(parsedVal);
      updateItem(itemId, {
        color: parsedVal,
        ...(detectedHex ? { colorHex: detectedHex } : {}),
      });
      setEditingFieldId(null);
      return;
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

  // Garment Category Actions
  const handleAddNewGarmentCategory = () => {
    if (!newGarmentCategoryName.trim()) {
      setIsAddingGarmentCategory(false);
      return;
    }
    addGarmentCategory(newGarmentCategoryName.trim());
    setNewGarmentCategoryName('');
    setIsAddingGarmentCategory(false);
  };

  const handleSaveGarmentCategoryRename = (oldName: string) => {
    if (!editingGarmentCategoryValue.trim() || editingGarmentCategoryValue.trim() === oldName) {
      setEditingGarmentCategoryName(null);
      return;
    }
    updateGarmentCategory(oldName, editingGarmentCategoryValue.trim());
    if (selectedGarmentCategory === oldName) {
      setSelectedGarmentCategory(editingGarmentCategoryValue.trim());
    }
    setEditingGarmentCategoryName(null);
  };

  const handleDeleteGarmentCategoryPrompt = (catToDelete: string) => {
    deleteGarmentCategory(catToDelete);
    if (selectedGarmentCategory === catToDelete) {
      setSelectedGarmentCategory('All');
    }
  };

  // Homeware Category Actions
  const handleAddNewHomewareCategory = () => {
    if (!newHomewareCategoryName.trim()) {
      setIsAddingHomewareCategory(false);
      return;
    }
    addHomewareCategory(newHomewareCategoryName.trim());
    setNewHomewareCategoryName('');
    setIsAddingHomewareCategory(false);
  };

  const handleSaveHomewareCategoryRename = (oldName: string) => {
    if (!editingHomewareCategoryValue.trim() || editingHomewareCategoryValue.trim() === oldName) {
      setEditingHomewareCategoryName(null);
      return;
    }
    updateHomewareCategory(oldName, editingHomewareCategoryValue.trim());
    if (selectedHomewareCategory === oldName) {
      setSelectedHomewareCategory(editingHomewareCategoryValue.trim());
    }
    setEditingHomewareCategoryName(null);
  };

  const handleDeleteHomewareCategoryPrompt = (catToDelete: string) => {
    deleteHomewareCategory(catToDelete);
    if (selectedHomewareCategory === catToDelete) {
      setSelectedHomewareCategory('All');
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
              <InlineEditableTitle
                value={customLabels.wardrobePageTitle || 'Inventory Studio'}
                onSave={(val) => updateCustomLabel('wardrobePageTitle', val)}
                as="h1"
                className="text-xl font-serif font-bold text-[#1A1A1A]"
                tooltip="Click or pencil to rename Inventory Studio inline"
              />
              <span className="font-mono text-xs px-2 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#5A5A55]">
                {items.length} garments total
              </span>
            </div>
            {displaySettings.showStatsBanner && (
              <p className="text-xs text-[#767670] mt-0.5 flex flex-wrap items-center gap-x-1.5">
                <span>Showing {filteredItems.length} matching pieces</span>
                <span>•</span>
                <span>
                  Valuation: <strong className="text-[#1A1A1A] font-mono">{formatGbp(filteredTotalValue)}</strong>
                </span>
                {filteredTotalRrp > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      Est. Retail RRP: <strong className="text-[#5A5A55] font-mono">{formatGbp(filteredTotalRrp)}</strong>
                    </span>
                    {filteredTotalRrp > filteredTotalValue && (
                      <span className="text-emerald-700 font-mono text-[11px] font-bold">
                        (Saved {formatGbp(filteredTotalRrp - filteredTotalValue)} / {Math.round(((filteredTotalRrp - filteredTotalValue) / filteredTotalRrp) * 100)}%)
                      </span>
                    )}
                  </>
                )}
                <span>•</span>
                <span>
                  Total Wears Logged: <strong className="text-[#1A1A1A] font-mono">{filteredTotalWears} wears</strong>
                </span>
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

            {/* Display Settings Toggle (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(true)}
              id="inventory-display-settings-btn"
              className="p-1.5 border border-[#D5D5D0] bg-white text-[#4A4A45] hover:border-[#8C7355] hover:text-[#1A1A1A] transition-all cursor-pointer shadow-xs"
              title="Configure inventory display sections and density"
              aria-label="Display Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355]" />
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

      {/* Interactive Pipeline Status Tabs */}
      <div className="bg-[#F8F7F4] border border-[#E5E5E1] p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#767670]">
          <span className="font-semibold text-[#1A1A1A] uppercase tracking-wider">Pipeline:</span>
          <span className="text-[10px] text-[#767670]">({items.length} items total)</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* All */}
          <button
            type="button"
            onClick={() => handleSetPipelineTab('All')}
            className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
              pipelineTab === 'All'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
            }`}
          >
            <span>All</span>
            <span className="opacity-75">({pipelineStats.all})</span>
          </button>

          {/* Closet */}
          <button
            type="button"
            onClick={() => handleSetPipelineTab('Closet')}
            className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
              pipelineTab === 'Closet'
                ? 'bg-[#8C7355] text-white border-[#8C7355] shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
            }`}
          >
            <Shirt className="w-3 h-3" />
            <span>In Closet</span>
            <span className="opacity-75">({pipelineStats.closet})</span>
          </button>

          {/* Purchased */}
          <button
            type="button"
            onClick={() => handleSetPipelineTab('Purchased')}
            className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
              pipelineTab === 'Purchased'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-emerald-700 hover:text-emerald-800'
            }`}
          >
            <CheckCircle className="w-3 h-3 text-emerald-300" />
            <span>Purchased</span>
            <span className="opacity-75">({pipelineStats.purchased})</span>
          </button>

          {/* Sold */}
          <button
            type="button"
            onClick={() => handleSetPipelineTab('Sold')}
            className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
              pipelineTab === 'Sold'
                ? 'bg-teal-800 text-white border-teal-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-teal-700 hover:text-teal-800'
            }`}
          >
            <Tag className="w-3 h-3 text-teal-300" />
            <span>Sold</span>
            <span className="opacity-75">({pipelineStats.sold})</span>
          </button>

          {/* Cancelled */}
          <button
            type="button"
            onClick={() => handleSetPipelineTab('Cancelled')}
            className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
              pipelineTab === 'Cancelled'
                ? 'bg-rose-800 text-white border-rose-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-rose-700 hover:text-rose-800'
            }`}
          >
            <Ban className="w-3 h-3 text-rose-300" />
            <span>Cancelled</span>
            <span className="opacity-75">({pipelineStats.cancelled})</span>
          </button>
        </div>
      </div>

      {/* Category Managers & Filter Bars (Garments & Homeware Duplicated Sections) */}
      {displaySettings.showCategoryTabs && (
        <div className="space-y-3">
          {/* Active Category Filter Global Banner (if filtered) */}
          {categoryFilterScope !== 'all' && (
            <div className="bg-[#FAF9F6] border border-[#8C7355]/30 px-3 py-1.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono text-[#5A5A55]">
                <span className="font-bold text-[#1A1A1A]">Active Filter:</span>
                {categoryFilterScope === 'garments' ? (
                  <span>
                    Apparel &amp; Garments &rarr; {selectedGarmentCategory === 'All' ? 'All Garments' : selectedGarmentCategory}
                    {selectedGarmentTag !== 'All' ? ` (#${selectedGarmentTag})` : ''}
                  </span>
                ) : (
                  <span>
                    Homeware &amp; Lifestyle &rarr; {selectedHomewareCategory === 'All' ? 'All Homeware' : selectedHomewareCategory}
                    {selectedHomewareTag !== 'All' ? ` (#${selectedHomewareTag})` : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearAllCategoryFilters}
                className="text-xs font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
              >
                <X className="w-3.5 h-3.5" />
                View All Pieces ({items.length})
              </button>
            </div>
          )}

          {/* 1. Garment Categories & Collections */}
          <div className={`bg-white border p-3 space-y-2.5 shadow-xs transition-colors ${
            categoryFilterScope === 'garments' ? 'border-[#8C7355]' : 'border-[#E5E5E1]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
                <InlineEditableTitle
                  value={customLabels.garmentCollectionsTitle || 'Garment Categories & Collections'}
                  onSave={(val) => updateCustomLabel('garmentCollectionsTitle', val)}
                  as="span"
                  className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider"
                  tooltip="Click or pencil to rename Garment Categories & Collections section"
                />
                <span className="text-[10px] font-mono text-[#767670]">
                  ({garmentCategories.length} active)
                </span>
                {categoryFilterScope === 'garments' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#8C7355]/10 text-[#8C7355] font-semibold">
                    ACTIVE FILTER
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {categoryFilterScope === 'garments' && (selectedGarmentCategory !== 'All' || selectedGarmentTag !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGarmentCategory('All');
                      setSelectedGarmentTag('All');
                      setCategoryFilterScope('all');
                    }}
                    className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear garment filter ({selectedGarmentCategory !== 'All' ? selectedGarmentCategory : `#${selectedGarmentTag}`})
                  </button>
                )}

                {!isAddingGarmentCategory ? (
                  <button
                    onClick={() => setIsAddingGarmentCategory(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-[#8C7355] bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Category
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="New garment category..."
                      value={newGarmentCategoryName}
                      onChange={(e) => setNewGarmentCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNewGarmentCategory();
                        if (e.key === 'Escape') setIsAddingGarmentCategory(false);
                      }}
                      autoFocus
                      className="px-2 py-1 text-xs bg-white border border-[#8C7355] text-[#1A1A1A] font-mono focus:outline-none w-40"
                    />
                    <button
                      onClick={handleAddNewGarmentCategory}
                      className="p-1 bg-[#8C7355] text-white hover:bg-[#786248] cursor-pointer"
                      title="Save garment category"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setIsAddingGarmentCategory(false)}
                      className="p-1 text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (safeConfirm('Reset garment categories to standard wardrobe defaults?')) {
                      resetGarmentCategories();
                    }
                  }}
                  className="text-[10px] font-mono text-[#A5A59E] hover:text-[#5A5A55] hover:underline cursor-pointer"
                  title="Reset to default 8 garment categories"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Garment Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => handleSelectGarmentCategory('All')}
                className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap font-mono ${
                  categoryFilterScope === 'garments' && selectedGarmentCategory === 'All'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold shadow-xs'
                    : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                }`}
              >
                All Garments ({garmentItemsCount})
              </button>

              {garmentCategories.map((cat) => {
                const isSelected = categoryFilterScope === 'garments' && selectedGarmentCategory === cat;
                const count = items.filter((i) => !i.isArchived && i.category === cat).length;
                const isEditing = editingGarmentCategoryName === cat;

                if (isEditing) {
                  return (
                    <div
                      key={cat}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#8C7355] shadow-xs"
                    >
                      <input
                        type="text"
                        value={editingGarmentCategoryValue}
                        onChange={(e) => setEditingGarmentCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveGarmentCategoryRename(cat);
                          if (e.key === 'Escape') setEditingGarmentCategoryName(null);
                        }}
                        onBlur={() => handleSaveGarmentCategoryRename(cat)}
                        autoFocus
                        className="text-xs font-mono text-[#1A1A1A] bg-transparent focus:outline-none w-24"
                      />
                      <button
                        onClick={() => handleSaveGarmentCategoryRename(cat)}
                        className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingGarmentCategoryName(null)}
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
                      onClick={() => handleSelectGarmentCategory(cat)}
                      className="cursor-pointer hover:underline"
                      title={`Filter by garment category ${cat}`}
                    >
                      {cat} ({count})
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGarmentCategoryName(cat);
                        setEditingGarmentCategoryValue(cat);
                      }}
                      className={`p-0.5 opacity-60 hover:opacity-100 cursor-pointer ${
                        isSelected ? 'text-white hover:text-amber-200' : 'text-[#767670] hover:text-[#1A1A1A]'
                      }`}
                      title={`Rename garment category "${cat}"`}
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGarmentCategoryPrompt(cat);
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

            {/* Garment Tags Filter Strip */}
            {uniqueGarmentTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E5E1]/70 text-xs">
                <span className="text-[10px] font-mono text-[#767670] uppercase tracking-wider shrink-0">
                  Garment Tags:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectGarmentTag('All')}
                  className={`px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilterScope === 'garments' && selectedGarmentTag === 'All'
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold'
                      : 'bg-[#F8F7F4] text-[#767670] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                  }`}
                >
                  All Tags
                </button>
                {uniqueGarmentTags.map((ut) => {
                  const isSelected = categoryFilterScope === 'garments' && selectedGarmentTag.toLowerCase() === ut.tag.toLowerCase();
                  return (
                    <button
                      key={ut.tag}
                      type="button"
                      onClick={() => handleSelectGarmentTag(isSelected ? 'All' : ut.tag)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold shadow-xs'
                          : 'bg-[#F2F1ED] text-[#4A4A45] hover:bg-[#E5E3DC] border-[#E5E5E1]'
                      }`}
                      title={`Filter garments by tag #${ut.tag}`}
                    >
                      #{ut.tag}
                      <span className={`text-[9px] ${isSelected ? 'text-zinc-300' : 'text-[#767670]'}`}>
                        ({ut.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Homeware Categories & Collections (Duplicated Separate Heading & Management Box) */}
          <div className={`bg-white border p-3 space-y-2.5 shadow-xs transition-colors ${
            categoryFilterScope === 'homeware' ? 'border-[#8C7355]' : 'border-[#E5E5E1]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-[#8C7355]" />
                <InlineEditableTitle
                  value={customLabels.homewareCollectionsTitle || 'Homeware Categories & Collections'}
                  onSave={(val) => updateCustomLabel('homewareCollectionsTitle', val)}
                  as="span"
                  className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider"
                  tooltip="Click or pencil to rename Homeware Categories & Collections section"
                />
                <span className="text-[10px] font-mono text-[#767670]">
                  ({homewareCategories.length} active)
                </span>
                {categoryFilterScope === 'homeware' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#8C7355]/10 text-[#8C7355] font-semibold">
                    ACTIVE FILTER
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {categoryFilterScope === 'homeware' && (selectedHomewareCategory !== 'All' || selectedHomewareTag !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHomewareCategory('All');
                      setSelectedHomewareTag('All');
                      setCategoryFilterScope('all');
                    }}
                    className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear homeware filter ({selectedHomewareCategory !== 'All' ? selectedHomewareCategory : `#${selectedHomewareTag}`})
                  </button>
                )}

                {!isAddingHomewareCategory ? (
                  <button
                    onClick={() => setIsAddingHomewareCategory(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-[#8C7355] bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Category
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="New homeware category..."
                      value={newHomewareCategoryName}
                      onChange={(e) => setNewHomewareCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNewHomewareCategory();
                        if (e.key === 'Escape') setIsAddingHomewareCategory(false);
                      }}
                      autoFocus
                      className="px-2 py-1 text-xs bg-white border border-[#8C7355] text-[#1A1A1A] font-mono focus:outline-none w-44"
                    />
                    <button
                      onClick={handleAddNewHomewareCategory}
                      className="p-1 bg-[#8C7355] text-white hover:bg-[#786248] cursor-pointer"
                      title="Save homeware category"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setIsAddingHomewareCategory(false)}
                      className="p-1 text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (safeConfirm('Reset homeware categories to standard defaults?')) {
                      resetHomewareCategories();
                    }
                  }}
                  className="text-[10px] font-mono text-[#A5A59E] hover:text-[#5A5A55] hover:underline cursor-pointer"
                  title="Reset to default 6 homeware categories"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Homeware Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => handleSelectHomewareCategory('All')}
                className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap font-mono ${
                  categoryFilterScope === 'homeware' && selectedHomewareCategory === 'All'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold shadow-xs'
                    : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                }`}
              >
                All Homeware ({homewareItemsCount})
              </button>

              {homewareCategories.map((cat) => {
                const isSelected = categoryFilterScope === 'homeware' && selectedHomewareCategory === cat;
                const count = items.filter((i) => !i.isArchived && i.category === cat).length;
                const isEditing = editingHomewareCategoryName === cat;

                if (isEditing) {
                  return (
                    <div
                      key={cat}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#8C7355] shadow-xs"
                    >
                      <input
                        type="text"
                        value={editingHomewareCategoryValue}
                        onChange={(e) => setEditingHomewareCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveHomewareCategoryRename(cat);
                          if (e.key === 'Escape') setEditingHomewareCategoryName(null);
                        }}
                        onBlur={() => handleSaveHomewareCategoryRename(cat)}
                        autoFocus
                        className="text-xs font-mono text-[#1A1A1A] bg-transparent focus:outline-none w-28"
                      />
                      <button
                        onClick={() => handleSaveHomewareCategoryRename(cat)}
                        className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingHomewareCategoryName(null)}
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
                      onClick={() => handleSelectHomewareCategory(cat)}
                      className="cursor-pointer hover:underline"
                      title={`Filter by homeware category ${cat}`}
                    >
                      {cat} ({count})
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingHomewareCategoryName(cat);
                        setEditingHomewareCategoryValue(cat);
                      }}
                      className={`p-0.5 opacity-60 hover:opacity-100 cursor-pointer ${
                        isSelected ? 'text-white hover:text-amber-200' : 'text-[#767670] hover:text-[#1A1A1A]'
                      }`}
                      title={`Rename homeware category "${cat}"`}
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHomewareCategoryPrompt(cat);
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

            {/* Homeware Tags Filter Strip */}
            {uniqueHomewareTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E5E1]/70 text-xs">
                <span className="text-[10px] font-mono text-[#767670] uppercase tracking-wider shrink-0">
                  Homeware Tags:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectHomewareTag('All')}
                  className={`px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilterScope === 'homeware' && selectedHomewareTag === 'All'
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold'
                      : 'bg-[#F8F7F4] text-[#767670] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                  }`}
                >
                  All Tags
                </button>
                {uniqueHomewareTags.map((ut) => {
                  const isSelected = categoryFilterScope === 'homeware' && selectedHomewareTag.toLowerCase() === ut.tag.toLowerCase();
                  return (
                    <button
                      key={ut.tag}
                      type="button"
                      onClick={() => handleSelectHomewareTag(isSelected ? 'All' : ut.tag)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold shadow-xs'
                          : 'bg-[#F2F1ED] text-[#4A4A45] hover:bg-[#E5E3DC] border-[#E5E5E1]'
                      }`}
                      title={`Filter homeware by tag #${ut.tag}`}
                    >
                      #{ut.tag}
                      <span className={`text-[9px] ${isSelected ? 'text-zinc-300' : 'text-[#767670]'}`}>
                        ({ut.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
                    onChange={(e) => handleSetSelectedBrand(e.target.value)}
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
                    onClick={() => handleSetSelectedBrand('All')}
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
                    onChange={(e) => handleSetSelectedSeason(e.target.value as any)}
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
                    onClick={() => handleSetSelectedSeason('All')}
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
                    onChange={(e) => handleSetSelectedCondition(e.target.value as any)}
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
                    onClick={() => handleSetSelectedCondition('All')}
                    className="text-[#767670] hover:text-rose-600 p-0.5"
                    title="Clear condition filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => handleSetFavoritesOnly(!favoritesOnly)}
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
                      handleSetFavoritesOnly(false);
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
              {(pipelineTab !== 'All' ||
                categoryFilterScope !== 'all' ||
                selectedGarmentCategory !== 'All' ||
                selectedGarmentTag !== 'All' ||
                selectedHomewareCategory !== 'All' ||
                selectedHomewareTag !== 'All' ||
                selectedTag !== 'All' ||
                selectedCategory !== 'All' ||
                selectedBrand !== 'All' ||
                selectedSeason !== 'All' ||
                selectedCondition !== 'All' ||
                favoritesOnly ||
                searchQuery) && (
                <button
                  onClick={() => {
                    handleSetPipelineTab('All');
                    handleClearAllCategoryFilters();
                    handleSetSelectedBrand('All');
                    handleSetSelectedSeason('All');
                    handleSetSelectedCondition('All');
                    handleSetFavoritesOnly(false);
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
                    onChange={(e) => handleSetSortBy(e.target.value as any)}
                    className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-1 pr-6 focus:outline-none focus:border-[#8C7355] appearance-none font-medium"
                  >
                    <option value="wears_desc">Most Worn (Frequency)</option>
                    <option value="price_desc">Price: High to Low (£)</option>
                    <option value="price_asc">Price: Low to High (£)</option>
                    <option value="rrp_desc">RRP: High to Low (£)</option>
                    <option value="newest">Recently Added</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#767670] absolute right-1.5 top-2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {(pipelineTab !== 'All' ||
            categoryFilterScope !== 'all' ||
            selectedGarmentCategory !== 'All' ||
            selectedGarmentTag !== 'All' ||
            selectedHomewareCategory !== 'All' ||
            selectedHomewareTag !== 'All' ||
            selectedTag !== 'All' ||
            selectedCategory !== 'All' ||
            selectedBrand !== 'All' ||
            selectedSeason !== 'All' ||
            selectedCondition !== 'All' ||
            favoritesOnly) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E5E1] text-[11px] font-mono">
              <span className="text-[#767670] uppercase tracking-wider text-[10px]">Active Filters:</span>

              {pipelineTab !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] rounded-xs font-medium">
                  Pipeline: {pipelineTab}
                  <button
                    type="button"
                    onClick={() => handleSetPipelineTab('All')}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove pipeline filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Garment Category Pill */}
              {categoryFilterScope === 'garments' && selectedGarmentCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] rounded-xs font-medium">
                  Garments: {selectedGarmentCategory}
                  <button
                    type="button"
                    onClick={() => handleSelectGarmentCategory(selectedGarmentCategory)}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove garment category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Garment Tag Pill */}
              {categoryFilterScope === 'garments' && selectedGarmentTag !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] text-white rounded-xs font-medium">
                  #{selectedGarmentTag}
                  <button
                    type="button"
                    onClick={() => handleSelectGarmentTag('All')}
                    className="hover:text-rose-300 cursor-pointer"
                    title="Remove garment tag filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Homeware Category Pill */}
              {categoryFilterScope === 'homeware' && selectedHomewareCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] rounded-xs font-medium">
                  Homeware: {selectedHomewareCategory}
                  <button
                    type="button"
                    onClick={() => handleSelectHomewareCategory(selectedHomewareCategory)}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove homeware category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Homeware Tag Pill */}
              {categoryFilterScope === 'homeware' && selectedHomewareTag !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] text-white rounded-xs font-medium">
                  #{selectedHomewareTag}
                  <button
                    type="button"
                    onClick={() => handleSelectHomewareTag('All')}
                    className="hover:text-rose-300 cursor-pointer"
                    title="Remove homeware tag filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedTag !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] text-white rounded-xs font-medium">
                  #{selectedTag}
                  <button
                    type="button"
                    onClick={() => handleSetSelectedTag('All')}
                    className="hover:text-rose-300 cursor-pointer"
                    title="Remove tag filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] rounded-xs font-medium">
                  Category: {selectedCategory === '__GARMENTS__' ? 'Apparel Only' : selectedCategory === '__HOMEWARE__' ? 'Homeware & Lifestyle' : selectedCategory}
                  <button
                    type="button"
                    onClick={() => handleSetSelectedCategory('All')}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedBrand !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] text-[#1A1A1A] rounded-xs">
                  Brand: {selectedBrand}
                  <button
                    type="button"
                    onClick={() => handleSetSelectedBrand('All')}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove brand filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedSeason !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] text-[#1A1A1A] rounded-xs">
                  Season: {selectedSeason}
                  <button
                    type="button"
                    onClick={() => handleSetSelectedSeason('All')}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove season filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedCondition !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] text-[#1A1A1A] rounded-xs">
                  Condition: {selectedCondition}
                  <button
                    type="button"
                    onClick={() => handleSetSelectedCondition('All')}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Remove condition filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {favoritesOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs font-medium">
                  Favorites Only
                  <button
                    type="button"
                    onClick={() => handleSetFavoritesOnly(false)}
                    className="hover:text-rose-950 cursor-pointer"
                    title="Remove favorites filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Selection Action Bar */}
      <BulkActionBar
        selectedCount={selectedItemIds.size}
        totalFilteredCount={filteredItems.length}
        totalItemCount={items.length}
        areAllSelected={areAllFilteredSelected}
        areSomeSelected={areSomeFilteredSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearAllSelection}
        selectedValuation={selectedTotalValuation}
        entityName="garments"
        onMoveToResale={() => {
          const ids = Array.from(selectedItemIds);
          moveMultipleWardrobeItems(ids, 'selling');
          setSelectedItemIds(new Set());
        }}
        onMoveToWishlist={() => {
          const ids = Array.from(selectedItemIds);
          moveMultipleWardrobeItems(ids, 'shopping');
          setSelectedItemIds(new Set());
        }}
        onBulkEdit={() => setIsBulkEditOpen(true)}
        onBulkDelete={handleDeleteSelected}
      />

      {/* Wardrobe Items Display */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Info}
          title="No wardrobe items match your criteria"
          description="Try adjusting your search query, clearing category filters, or importing clothes from a product link or photo."
          onResetFilters={() => {
            setSelectedCategory('All');
            setSelectedSeason('All');
            setSelectedCondition('All');
            setFavoritesOnly('All' as any);
            setSearchQuery('');
          }}
          actions={[
            {
              label: 'Add Garment',
              icon: Plus,
              primary: true,
              onClick: onOpenAddItem,
            },
          ]}
        />
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
            const isEditingRrp = editingFieldId === `${item.id}_rrp`;
            const isEditingWear = editingFieldId === `${item.id}_wearCount`;
            const isEditingColor = editingFieldId === `${item.id}_color`;
            const isEditingLocation = editingFieldId === `${item.id}_storageLocation`;
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
                        className={`p-1.5 rounded-md backdrop-blur-xs shadow-xs border transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#8C7355] border-[#8C7355] text-white ring-2 ring-[#8C7355]/30'
                            : 'bg-white/95 border-zinc-200 text-zinc-300 hover:text-zinc-600 hover:border-zinc-400'
                        }`}
                        title={isSelected ? 'Deselect garment' : 'Select garment for bulk actions'}
                        aria-label={isSelected ? 'Deselect garment' : 'Select garment'}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
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

                      {/* Price (£) & RRP (£) Editor */}
                      {(displaySettings.showPrice || displaySettings.showRrp) && (
                        <div className="flex flex-col items-end gap-0.5">
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
                                  title="Click to edit purchase price inline (£)"
                                >
                                  {formatGbp(item.purchasePrice)}
                                  <PencilIcon />
                                </span>
                              )}
                            </div>
                          )}

                          {displaySettings.showRrp && (
                            <div>
                              {isEditingRrp ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-[#767670]">RRP £</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={() => handleSaveInline(item.id, 'rrp')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInline(item.id, 'rrp');
                                      if (e.key === 'Escape') setEditingFieldId(null);
                                    }}
                                    autoFocus
                                    className="w-14 text-[10px] font-mono font-medium text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white"
                                  />
                                  <button
                                    onClick={() => handleSaveInline(item.id, 'rrp')}
                                    className="text-emerald-700 hover:text-emerald-900"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  onClick={() => {
                                    setEditingFieldId(`${item.id}_rrp`);
                                    setEditingValue(item.rrp !== undefined && item.rrp !== null ? item.rrp.toString() : '');
                                  }}
                                  className="text-[10px] font-mono text-[#767670] hover:text-[#8C7355] hover:underline cursor-pointer flex items-center gap-0.5"
                                  title="Click to edit RRP inline (£)"
                                >
                                  {item.rrp ? (
                                    <>
                                      <span>RRP {formatGbp(item.rrp)}</span>
                                      {item.purchasePrice > 0 && item.rrp > item.purchasePrice && (
                                        <span className="text-[9px] text-emerald-700 font-bold ml-0.5">
                                          (-{Math.round(((item.rrp - item.purchasePrice) / item.rrp) * 100)}%)
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[#A5A59E] italic">+ RRP</span>
                                  )}
                                  <PencilIcon />
                                </span>
                              )}
                            </div>
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

                    {/* Color, Season, Condition (Inline Editable) */}
                    <div className="text-[11px] text-[#767670] font-sans flex flex-wrap items-center gap-1.5 pt-0.5">
                      {/* Color */}
                      {isEditingColor ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveInline(item.id, 'color')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInline(item.id, 'color');
                              if (e.key === 'Escape') setEditingFieldId(null);
                            }}
                            autoFocus
                            placeholder="Color..."
                            className="w-20 text-[11px] border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInline(item.id, 'color')}
                            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingFieldId(`${item.id}_color`);
                            setEditingValue(item.color || '');
                          }}
                          className="hover:text-[#8C7355] hover:underline cursor-pointer inline-flex items-center gap-1 group/color shrink-0"
                          title="Click to edit colour inline"
                        >
                          <span
                            className="w-2 h-2 rounded-full border border-black/10 shrink-0 inline-block"
                            style={{
                              backgroundColor:
                                item.colorHex || getColorHex(item.color) || '#D5D5D0',
                            }}
                          />
                          <span>{item.color || <span className="text-[#A5A59E] italic">Add colour</span>}</span>
                          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/color:opacity-60 text-[#8C7355]" />
                        </span>
                      )}

                      {/* Season Dropdown */}
                      {displaySettings.showSeason && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[#B0B0A8]">•</span>
                          <select
                            value={Array.isArray(item.season) ? item.season[0] : (item.season || 'All-Season')}
                            onChange={(e) => {
                              const val = e.target.value as Season;
                              updateItem(item.id, { season: [val] });
                            }}
                            className="text-[10px] font-sans text-[#767670] hover:text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D5D5D0] hover:border-[#8C7355] focus:outline-none cursor-pointer py-0 px-0.5"
                            title="Change season inline"
                          >
                            {['All-Season', 'Spring', 'Summer', 'Autumn', 'Winter'].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </span>
                      )}

                      {/* Condition Dropdown */}
                      {displaySettings.showCondition && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[#B0B0A8]">•</span>
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              updateItem(item.id, { condition: e.target.value as Condition });
                            }}
                            className="text-[10px] font-sans text-[#767670] hover:text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D5D5D0] hover:border-[#8C7355] focus:outline-none cursor-pointer py-0 px-0.5"
                            title="Change condition inline"
                          >
                            {['Pristine / New', 'Excellent', 'Good', 'Vintage / Well-Loved'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </span>
                      )}
                    </div>

                    {/* Storage Location (Inline Editable) */}
                    {displaySettings.showLocation && (
                      <div className="pt-0.5">
                        {isEditingLocation ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-[#8C7355] shrink-0" />
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveInline(item.id, 'storageLocation')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInline(item.id, 'storageLocation');
                                if (e.key === 'Escape') setEditingFieldId(null);
                              }}
                              autoFocus
                              placeholder="Storage location..."
                              className="w-full text-[10px] font-mono border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInline(item.id, 'storageLocation')}
                              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            onClick={() => {
                              setEditingFieldId(`${item.id}_storageLocation`);
                              setEditingValue(item.storageLocation || '');
                            }}
                            className="text-[10px] font-mono text-[#8C7355] flex items-center gap-1 hover:underline cursor-pointer group/loc"
                            title="Click to edit storage location inline"
                          >
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {item.storageLocation || <span className="text-[#A5A59E] italic">Add location...</span>}
                            </span>
                            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/loc:opacity-60 shrink-0" />
                          </p>
                        )}
                      </div>
                    )}

                    {/* Vinted Order & Resale Info (Matching Purchases card view) */}
                    {(() => {
                      const isVinted =
                        Boolean(item.vintedUrl || item.orderNumber || item.seller) ||
                        item.retailerName === 'Vinted' ||
                        (item.tags || []).some((t) => t.toLowerCase().includes('vinted'));
                      if (displaySettings.showVintedDetails === false || !isVinted) return null;

                      return (
                        <div className="p-2.5 bg-[#007782]/10 border border-[#007782]/30 text-[10px] font-mono space-y-1.5 rounded-xs shadow-2xs mt-1.5">
                          <div className="flex items-center justify-between text-[#007782] font-semibold">
                            <span className="flex items-center gap-1.5 font-bold tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-[#007782]"></span>
                              Vinted {item.transactionType || 'Order'}
                            </span>
                            {item.orderStatus ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#007782] text-white rounded-xs uppercase tracking-wider">
                                {item.orderStatus}
                              </span>
                            ) : item.orderNumber ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#007782] text-white rounded-xs font-mono">
                                #{item.orderNumber}
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
                            {(item.orderValue || item.purchasePrice) ? (
                              <span>
                                Total: <strong className="text-[#1A1A1A]">{formatCurrency(item.orderValue || item.purchasePrice)}</strong>
                              </span>
                            ) : null}
                          </div>
                          {(item.orderDate || item.lastUpdatedDate || item.size) && (
                            <div className="text-[9px] text-[#557A7A] flex items-center justify-between pt-1 border-t border-[#007782]/15">
                              <span>{item.orderDate ? `Ordered: ${item.orderDate}` : item.lastUpdatedDate ? `Updated: ${item.lastUpdatedDate}` : ''}</span>
                              {item.size && <span className="font-semibold text-[#007782]">Size: {item.size}</span>}
                            </div>
                          )}
                          {(item.vintedUrl || item.orderNumber) && (
                            <div className="pt-1 border-t border-[#007782]/15 flex items-center justify-between text-[9px]">
                              {item.vintedUrl ? (
                                <a
                                  href={item.vintedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#007782] hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  {item.orderNumber ? `Order #${item.orderNumber}` : 'View Vinted Listing'}
                                </a>
                              ) : (
                                <span className="text-[#557A7A]">Order Ref: #{item.orderNumber}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
                        {displaySettings.showResaleOption !== false && (
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
                        )}
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
