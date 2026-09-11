import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  PoundSterling,
  ExternalLink,
  CheckCircle,
  Truck,
  Package,
  Sparkles,
  ShoppingBag,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  Layers,
  Shirt,
  Copy,
  Check,
  LayoutGrid,
  List,
  AlertCircle,
  Clock,
  FileUp,
  Sliders,
  SlidersHorizontal,
  FolderUp,
  Table as TableIcon,
  GitMerge,
  ArrowRightLeft,
  Link2,
  ChevronDown,
  ChevronUp,
  Ban,
} from 'lucide-react';
import {
  SaleItem,
  SellingPlatform,
  SellingStatus,
  ShippingStatus,
  Category,
} from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { safeConfirm } from '../utils/safeConfirm';
import { MarkSoldModal } from './MarkSoldModal';
import { SellFromWardrobeModal } from './SellFromWardrobeModal';
import { SaleFormModal } from './SaleFormModal';
import { AiListingGeneratorModal } from './AiListingGeneratorModal';
import { AutoImportModal } from './AutoImportModal';
import { GarmentImage } from './GarmentImage';
import { BulkEditModal } from './BulkEditModal';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { SellingDatabaseTable } from './SellingDatabaseTable';
import {
  SellingDisplaySettingsModal,
  SellingDisplaySettings,
  DEFAULT_SELLING_DISPLAY_SETTINGS,
} from './SellingDisplaySettingsModal';

export type SalesPipelineStage =
  | 'All'
  | 'Draft'
  | 'Listed'
  | 'Reserved'
  | 'Awaiting Dispatch'
  | 'In Transit'
  | 'Completed'
  | 'Cancelled';

export const getSaleItemPipelineStage = (item: SaleItem): SalesPipelineStage => {
  const status = item.status;
  const shipping = item.shippingStatus;
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  const notes = (item.notes || '').toLowerCase();

  // Cancelled check
  if (
    status === 'Delisted' ||
    tags.includes('cancelled') ||
    tags.includes('canceled') ||
    notes.includes('cancelled') ||
    notes.includes('order cancelled')
  ) {
    return 'Cancelled';
  }

  // Completed check
  if (
    status === 'Completed' ||
    shipping === 'Delivered' ||
    tags.includes('completed') ||
    tags.includes('delivered')
  ) {
    return 'Completed';
  }

  // In Transit check
  if (
    status === 'Shipped' ||
    shipping === 'In Transit' ||
    shipping === 'Shipped' ||
    tags.includes('in transit') ||
    tags.includes('shipped')
  ) {
    return 'In Transit';
  }

  // Awaiting Dispatch check
  if (
    shipping === 'To Pack' ||
    tags.includes('awaiting dispatch') ||
    tags.includes('to pack') ||
    status === 'Sold'
  ) {
    return 'Awaiting Dispatch';
  }

  // Reserved check
  if (status === 'Reserved' || tags.includes('reserved')) {
    return 'Reserved';
  }

  // Listed check
  if (status === 'Listed' || tags.includes('listed')) {
    return 'Listed';
  }

  // Draft check
  if (status === 'Draft' || tags.includes('draft')) {
    return 'Draft';
  }

  return 'Draft';
};

export const SellingView: React.FC = () => {
  const {
    saleItems,
    categories,
    searchQuery,
    setSearchQuery,
    stats,
    deleteSaleItem,
    deleteMultipleSaleItems,
    batchUpdateSaleItemsStatus,
    updateSaleItem,
    moveSaleItemToWardrobe,
    moveSaleItemToShopping,
    moveMultipleSaleItems,
    formatCurrency,
  } = useWardrobe();

  // Display Settings
  const [displaySettings, setDisplaySettings] = useState<SellingDisplaySettings>(() => {
    const saved = localStorage.getItem('selling_display_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SELLING_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse selling display settings', e);
      }
    }
    return DEFAULT_SELLING_DISPLAY_SETTINGS;
  });
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);

  const handleUpdateDisplaySettings = useCallback((newSettings: SellingDisplaySettings) => {
    setDisplaySettings(newSettings);
    localStorage.setItem('selling_display_settings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Live sync from SettingsModal
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('selling_display_settings');
        if (saved) {
          setDisplaySettings({ ...DEFAULT_SELLING_DISPLAY_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error('Failed to sync selling display settings', e);
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('custom_display_settings_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('custom_display_settings_updated', handleSync);
    };
  }, []);

  // Resale Pipeline Stage Filter State
  const [salesPipelineStage, setSalesPipelineStage] = useState<SalesPipelineStage>(() => {
    try {
      const saved = localStorage.getItem('sales_resale_pipeline_stage');
      if (
        saved &&
        [
          'All',
          'Draft',
          'Listed',
          'Reserved',
          'Awaiting Dispatch',
          'In Transit',
          'Completed',
          'Cancelled',
        ].includes(saved)
      ) {
        return saved as SalesPipelineStage;
      }
    } catch {}
    return 'All';
  });

  const handleSetSalesPipelineStage = (stage: SalesPipelineStage) => {
    setSalesPipelineStage(stage);
    try {
      localStorage.setItem('sales_resale_pipeline_stage', stage);
    } catch {}
  };

  // Pipeline Statistics & Valuations for the Workflow Bar
  const pipelineStats = useMemo(() => {
    const stats: Record<SalesPipelineStage, { count: number; valueGbp: number }> = {
      All: { count: saleItems.length, valueGbp: 0 },
      Draft: { count: 0, valueGbp: 0 },
      Listed: { count: 0, valueGbp: 0 },
      Reserved: { count: 0, valueGbp: 0 },
      'Awaiting Dispatch': { count: 0, valueGbp: 0 },
      'In Transit': { count: 0, valueGbp: 0 },
      Completed: { count: 0, valueGbp: 0 },
      Cancelled: { count: 0, valueGbp: 0 },
    };

    saleItems.forEach((item) => {
      const stage = getSaleItemPipelineStage(item);
      const val = item.soldPrice ?? item.listingPrice ?? item.originalPricePaid ?? 0;
      stats.All.valueGbp += val;
      if (stats[stage]) {
        stats[stage].count += 1;
        stats[stage].valueGbp += val;
      }
    });

    return stats;
  }, [saleItems]);

  // Filters & View State
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(
    (displaySettings.viewMode as string) === 'database' || displaySettings.viewMode === 'table' ? 'table' : 'grid'
  );

  // Sync viewMode changes to displaySettings
  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    handleUpdateDisplaySettings({ ...displaySettings, viewMode: mode });
  };

  // Keep viewMode synchronized when displaySettings changes
  useEffect(() => {
    if (displaySettings.viewMode) {
      const mode =
        (displaySettings.viewMode as string) === 'database' || displaySettings.viewMode === 'table'
          ? 'table'
          : 'grid';
      setViewMode(mode);
    }
  }, [displaySettings.viewMode]);

  // Unique Brands with counts (safely string-sorted, avoiding tuple crashes)
  const uniqueBrands = useMemo(() => {
    const counts = new Map<string, number>();
    saleItems.forEach((it) => {
      const b = (it.brand || '').trim() || 'Unbranded';
      counts.set(b, (counts.get(b) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => a.brand.localeCompare(b.brand, undefined, { sensitivity: 'base' }));
  }, [saleItems]);

  // Unique Tags with counts across sales listings
  const uniqueTags = useMemo(() => {
    const counts = new Map<string, number>();
    saleItems.forEach((it) => {
      (it.tags || []).forEach((t) => {
        const clean = t.trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [saleItems]);

  // Category counts across sales listings
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    saleItems.forEach((it) => {
      const cat = (it.category || '').trim();
      if (cat) {
        counts.set(cat.toLowerCase(), (counts.get(cat.toLowerCase()) || 0) + 1);
      }
    });
    return counts;
  }, [saleItems]);

  // Multi-selection state
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  // Filter Panel collapsible state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Tag editing state
  const [newTagInputItemId, setNewTagInputItemId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  const handleAddTag = (itemId: string) => {
    if (!newTagText.trim()) {
      setNewTagInputItemId(null);
      return;
    }
    const clean = newTagText.trim().replace(/^#/, '');
    const current = saleItems.find((s) => s.id === itemId);
    if (current && !(current.tags || []).includes(clean)) {
      updateSaleItem(itemId, { tags: [...(current.tags || []), clean] });
    }
    setNewTagText('');
    setNewTagInputItemId(null);
  };

  const handleDeleteTag = (itemId: string, tagToDelete: string) => {
    const current = saleItems.find((s) => s.id === itemId);
    if (current) {
      updateSaleItem(itemId, {
        tags: (current.tags || []).filter((t) => t !== tagToDelete),
      });
    }
  };

  // Modal states
  const [isAutoImportOpen, setIsAutoImportOpen] = useState(false);
  const [autoImportTab, setAutoImportTab] = useState<'url' | 'photo' | 'text' | 'vinted'>('url');
  const [isSellFromWardrobeOpen, setIsSellFromWardrobeOpen] = useState(false);
  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);
  const [saleItemToEdit, setSaleItemToEdit] = useState<SaleItem | null>(null);
  const [markSoldItem, setMarkSoldItem] = useState<SaleItem | null>(null);
  const [aiGeneratorItem, setAiGeneratorItem] = useState<SaleItem | null>(null);

  // Auto-prune dangling IDs when sale items are deleted or updated
  useEffect(() => {
    const validIds = new Set(saleItems.map((s) => s.id));
    setSelectedSaleIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [saleItems]);

  // Filtered & Sorted Sale Items
  const filteredSales = useMemo(() => {
    const matched = saleItems.filter((item) => {
      // Pipeline Stage filter
      if (salesPipelineStage !== 'All') {
        const stage = getSaleItemPipelineStage(item);
        if (stage !== salesPipelineStage) return false;
      }

      // Status tab filter
      if (selectedStatusTab === 'Active') {
        if (item.status !== 'Listed' && item.status !== 'Reserved') return false;
      } else if (selectedStatusTab === 'Sold') {
        if (
          item.status !== 'Sold' &&
          item.status !== 'Shipped' &&
          item.status !== 'Completed'
        )
          return false;
      } else if (selectedStatusTab === 'Draft') {
        if (item.status !== 'Draft') return false;
      }

      // Platform filter
      if (selectedPlatform !== 'All' && item.platform !== selectedPlatform)
        return false;

      // Brand filter
      if (selectedBrand !== 'All' && item.brand !== selectedBrand)
        return false;

      // Category filter
      if (
        selectedCategory !== 'All' &&
        (item.category || '').trim().toLowerCase() !== selectedCategory.trim().toLowerCase()
      ) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'All') {
        const hasTag = (item.tags || []).some(
          (t) => t.trim().toLowerCase() === selectedTag.trim().toLowerCase()
        );
        if (!hasTag) return false;
      }

      // Search query filter evaluation
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchBrand = item.brand?.toLowerCase().includes(q);
        const matchPlatform = item.platform?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        const matchBuyer = item.buyerUsername?.toLowerCase().includes(q);
        const matchTracking = item.trackingNumber?.toLowerCase().includes(q);
        const matchOrder = item.orderNumber?.toLowerCase().includes(q);
        const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        const matchNotes = item.notes?.toLowerCase().includes(q);
        const matchDescription = item.description?.toLowerCase().includes(q);
        const matchStatus = item.status?.toLowerCase().includes(q);
        const matchColor = item.color?.toLowerCase().includes(q);
        const matchSize = item.size?.toLowerCase().includes(q);

        return !!(
          matchName || matchBrand || matchPlatform || matchCategory || matchBuyer ||
          matchTracking || matchOrder || matchTags || matchNotes || matchDescription ||
          matchStatus || matchColor || matchSize
        );
      }
      return true;
    });

    // Execute sorting (safely using listingPrice, falling back gracefully)
    return matched.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      const priceA = a.listingPrice ?? a.soldPrice ?? a.originalPricePaid ?? 0;
      const priceB = b.listingPrice ?? b.soldPrice ?? b.originalPricePaid ?? 0;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'price_asc') return priceA - priceB;
      return 0;
    });
  }, [saleItems, salesPipelineStage, selectedStatusTab, selectedPlatform, selectedBrand, selectedCategory, selectedTag, searchQuery, sortBy]);

  // Check if any filters are active
  const hasActiveFilters =
    salesPipelineStage !== 'All' ||
    selectedStatusTab !== 'All' ||
    selectedBrand !== 'All' ||
    selectedPlatform !== 'All' ||
    selectedCategory !== 'All' ||
    selectedTag !== 'All' ||
    searchQuery.trim() !== '';

  const handleResetAllFilters = () => {
    handleSetSalesPipelineStage('All');
    setSelectedStatusTab('All');
    setSelectedBrand('All');
    setSelectedPlatform('All');
    setSelectedCategory('All');
    setSelectedTag('All');
    setSearchQuery('');
  };

  const toggleSelectSale = (id: string) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (safeConfirm(`Are you sure you want to delete ${selectedSaleIds.size} listings?`)) {
      deleteMultipleSaleItems(Array.from(selectedSaleIds));
      setSelectedSaleIds(new Set());
    }
  };

  const handleBulkMoveToWardrobe = () => {
    const ids = Array.from(selectedSaleIds);
    if (ids.length === 0) return;
    moveMultipleSaleItems(ids, 'wardrobe');
    setSelectedSaleIds(new Set());
  };

  const handleBulkMoveToShopping = () => {
    const ids = Array.from(selectedSaleIds);
    if (ids.length === 0) return;
    moveMultipleSaleItems(ids, 'shopping');
    setSelectedSaleIds(new Set());
  };

  const areAllSelected =
    filteredSales.length > 0 &&
    filteredSales.every((it) => selectedSaleIds.has(it.id));

  const areSomeSelected =
    filteredSales.some((it) => selectedSaleIds.has(it.id)) && !areAllSelected;

  const selectedTotalListingPrice = useMemo(() => {
    return saleItems
      .filter((i) => selectedSaleIds.has(i.id))
      .reduce((sum, i) => sum + (i.listingPrice || 0), 0);
  }, [saleItems, selectedSaleIds]);

  const handleToggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(filteredSales.map((it) => it.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions Toolbar */}
      <div className="bg-white border border-[#E5E5E1] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">Sales & Resale Studio</h1>
              <span className="font-mono text-xs px-2 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#5A5A55]">
                {saleItems.length} listings total
              </span>
            </div>
            <p className="text-xs text-[#767670] mt-0.5">
              Showing {filteredSales.length} matching pieces • Pipeline Valuation:{' '}
              <strong className="text-[#1A1A1A] font-mono">
                {formatCurrency(
                  filteredSales.reduce(
                    (s, i) => s + (i.listingPrice ?? i.soldPrice ?? i.originalPricePaid ?? 0),
                    0
                  )
                )}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Grid vs Database Table (Icon-Only) */}
            <div className="flex items-center border border-[#E5E5E1] p-0.5 bg-[#F8F7F4]">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                    : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
                title="Grid Cards View"
                aria-label="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('table')}
                className={`p-1.5 text-xs transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                    : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
                title="Database Table Spreadsheet View"
                aria-label="Database Table Spreadsheet View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Display Settings Toggle (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(true)}
              id="selling-display-settings-btn"
              className="p-1.5 border border-[#D5D5D0] bg-white text-[#4A4A45] hover:border-[#8C7355] hover:text-[#1A1A1A] transition-all cursor-pointer shadow-xs"
              title="Configure display settings and density"
              aria-label="Display Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355]" />
            </button>

            {/* Multi-Select / Deselect Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={filteredSales.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                  areAllSelected
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:text-[#1A1A1A] hover:bg-[#EAE8E3]'
                }`}
                title={
                  areAllSelected
                    ? 'Deselect all visible listings'
                    : 'Select all visible listings'
                }
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {areAllSelected
                    ? 'Deselect All'
                    : `Select All (${filteredSales.length})`}
                </span>
              </button>

              {selectedSaleIds.size > 0 && !areAllSelected && (
                <button
                  type="button"
                  onClick={() => setSelectedSaleIds(new Set())}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono border border-[#E5E5E1] bg-white text-[#767670] hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-xs"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear ({selectedSaleIds.size})</span>
                </button>
              )}
            </div>

            {/* Sell from Wardrobe */}
            <button
              onClick={() => setIsSellFromWardrobeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium border border-[#E5E5E1] bg-white text-[#4A4A45] hover:border-[#8C7355] hover:text-[#1A1A1A] transition-all cursor-pointer shadow-xs"
              title="List pieces directly from your existing wardrobe"
            >
              <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Sell from Wardrobe</span>
            </button>

            {/* Add Listing */}
            <button
              onClick={() => {
                setSaleItemToEdit(null);
                setIsSaleFormOpen(true);
              }}
              id="sales-add-btn"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Listing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Sales & Resale Pipeline Stage Bar */}
      <div className="bg-[#F8F7F4] border border-[#E5E5E1] p-3 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
            <span className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
              Resale Pipeline Workflow
            </span>
            <span className="text-[11px] font-mono text-[#767670]">
              ({saleItems.length} items total • {formatCurrency(pipelineStats.All.valueGbp)} inventory valuation)
            </span>
          </div>

          {salesPipelineStage !== 'All' && (
            <button
              type="button"
              onClick={() => handleSetSalesPipelineStage('All')}
              className="text-[11px] font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reset stage filter ({salesPipelineStage})
            </button>
          )}
        </div>

        {/* Workflow Stage Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {/* All */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('All')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'All'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All</span>
            <span className="opacity-75">({pipelineStats.All.count})</span>
          </button>

          {/* Draft */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('Draft')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'Draft'
                ? 'bg-[#4A4A45] text-white border-[#4A4A45] shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Draft</span>
            <span className="opacity-75">({pipelineStats.Draft.count})</span>
          </button>

          {/* Listed */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('Listed')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'Listed'
                ? 'bg-[#8C7355] text-white border-[#8C7355] shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
            }`}
          >
            <Tag className="w-3 h-3 text-amber-200" />
            <span>Listed</span>
            <span className="opacity-75">({pipelineStats.Listed.count})</span>
          </button>

          {/* Reserved */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('Reserved')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'Reserved'
                ? 'bg-indigo-800 text-white border-indigo-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-indigo-700 hover:text-indigo-800'
            }`}
          >
            <Package className="w-3 h-3 text-indigo-300" />
            <span>Reserved</span>
            <span className="opacity-75">({pipelineStats.Reserved.count})</span>
          </button>

          {/* Awaiting Dispatch */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('Awaiting Dispatch')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'Awaiting Dispatch'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-amber-700 hover:text-amber-800'
            }`}
          >
            <CheckSquare className="w-3 h-3 text-amber-300" />
            <span>Awaiting Dispatch</span>
            <span className="opacity-75">({pipelineStats['Awaiting Dispatch'].count})</span>
          </button>

          {/* In Transit */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('In Transit')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'In Transit'
                ? 'bg-blue-800 text-white border-blue-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-blue-700 hover:text-blue-800'
            }`}
          >
            <Truck className="w-3 h-3 text-blue-300" />
            <span>In Transit</span>
            <span className="opacity-75">({pipelineStats['In Transit'].count})</span>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('Completed')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'Completed'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-emerald-700 hover:text-emerald-800'
            }`}
          >
            <CheckCircle className="w-3 h-3 text-emerald-300" />
            <span>Completed</span>
            <span className="opacity-75">({pipelineStats.Completed.count})</span>
          </button>

          {/* Cancelled */}
          <button
            type="button"
            onClick={() => handleSetSalesPipelineStage('Cancelled')}
            className={`px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
              salesPipelineStage === 'Cancelled'
                ? 'bg-rose-800 text-white border-rose-800 shadow-xs font-bold'
                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-rose-700 hover:text-rose-800'
            }`}
          >
            <Ban className="w-3 h-3 text-rose-300" />
            <span>Cancelled</span>
            <span className="opacity-75">({pipelineStats.Cancelled.count})</span>
          </button>
        </div>
      </div>

      {/* Category Filter & Tag Chips Bar */}
      <div className="bg-white border border-[#E5E5E1] p-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-[#8C7355]" />
            <span className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
              Categories
            </span>
            <span className="text-[10px] font-mono text-[#767670]">
              ({categories.length} available)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear category ({selectedCategory})
              </button>
            )}
            {selectedTag !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedTag('All')}
                className="text-[10px] font-mono text-[#1A1A1A] hover:text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear tag (#{selectedTag})
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap font-mono ${
              selectedCategory === 'All'
                ? 'bg-[#8C7355] text-white border-[#8C7355] font-semibold shadow-xs'
                : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
            }`}
          >
            All Items ({saleItems.length})
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            const count = categoryCounts.get(cat.toLowerCase()) || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'All' : cat)}
                className={`px-2.5 py-1 text-xs border transition-all cursor-pointer whitespace-nowrap font-mono ${
                  isSelected
                    ? 'bg-[#8C7355] text-white border-[#8C7355] font-semibold shadow-xs'
                    : 'bg-[#F8F7F4] text-[#4A4A45] hover:bg-[#EAE8E3] border-[#E5E5E1]'
                }`}
              >
                {cat} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tags filter strip */}
        {uniqueTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E5E1]/70 text-xs">
            <span className="text-[10px] font-mono text-[#767670] uppercase tracking-wider shrink-0">
              Tags:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag('All')}
              className={`px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                selectedTag === 'All'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold'
                  : 'bg-[#F8F7F4] text-[#767670] hover:bg-[#EAE8E3] border-[#E5E5E1]'
              }`}
            >
              All Tags
            </button>
            {uniqueTags.map((ut) => {
              const isSelected = selectedTag.toLowerCase() === ut.tag.toLowerCase();
              return (
                <button
                  key={ut.tag}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? 'All' : ut.tag)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-semibold shadow-xs'
                      : 'bg-[#F2F1ED] text-[#4A4A45] hover:bg-[#E5E3DC] border-[#E5E5E1]'
                  }`}
                  title={`Filter by tag #${ut.tag}`}
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

      {/* Collapsible Search and Filters Bar */}
      <div className="bg-white border border-[#E5E5E1] p-3 space-y-2.5 shadow-xs">
        {/* Search Input Row & Filter Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <div className="flex items-center gap-2 bg-[#F8F7F4] border border-[#E5E5E1] px-3 py-1.5 focus-within:border-[#8C7355] focus-within:bg-white transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
              <input
                type="text"
                placeholder="Search listings by title, brand, platform, tracking, tags, buyer, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#1A1A1A] placeholder:text-[#A5A59E] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#767670] hover:text-rose-600 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono border border-[#E5E5E1] bg-[#F8F7F4] text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] transition-all cursor-pointer shrink-0"
            title="Toggle Filter Options"
          >
            <Filter className="w-3.5 h-3.5 text-[#8C7355]" />
            <span className="hidden sm:inline">Filters</span>
            {isFilterPanelOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Collapsible Dropdown Filter Selects & Bulk Action Pill */}
        {isFilterPanelOpen && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E5E5E1]">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedStatusTab}
                onChange={(e) => setSelectedStatusTab(e.target.value)}
                className="bg-white border border-[#E5E5E1] px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active / Listed</option>
                <option value="Sold">Sold / Shipped</option>
                <option value="Draft">Drafts</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-[#E5E5E1] px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => {
                  const count = categoryCounts.get(cat.toLowerCase()) || 0;
                  return (
                    <option key={cat} value={cat}>
                      {cat} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
              </select>

              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-white border border-[#E5E5E1] px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
              >
                <option value="All">All Tags</option>
                {uniqueTags.map((ut) => (
                  <option key={ut.tag} value={ut.tag}>
                    #{ut.tag} ({ut.count})
                  </option>
                ))}
              </select>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-white border border-[#E5E5E1] px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
              >
                <option value="All">All Brands</option>
                {uniqueBrands.map((ub) => (
                  <option key={ub.brand} value={ub.brand}>
                    {ub.brand} ({ub.count})
                  </option>
                ))}
              </select>

              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-white border border-[#E5E5E1] px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
              >
                <option value="All">All Platforms</option>
                <option value="Vinted">Vinted</option>
                <option value="Depop">Depop</option>
                <option value="eBay">eBay</option>
                <option value="Grailed">Grailed</option>
                <option value="Vestiaire Collective">Vestiaire Collective</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-[#E5E5E1] px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
              >
                <option value="newest">Recently Listed</option>
                <option value="price_desc">Highest Price</option>
                <option value="price_asc">Lowest Price</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E5E1] text-[11px] font-mono">
            <span className="text-[#767670] uppercase tracking-wider text-[10px]">Active Filters:</span>

            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] rounded-xs font-medium">
                Category: {selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Remove category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTag !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#1A1A1A] text-[#1A1A1A] rounded-xs font-medium">
                Tag: #{selectedTag}
                <button
                  type="button"
                  onClick={() => setSelectedTag('All')}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Remove tag filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {salesPipelineStage !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] font-semibold rounded-xs">
                Stage: {salesPipelineStage}
                <button
                  type="button"
                  onClick={() => handleSetSalesPipelineStage('All')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                  title="Remove stage filter"
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
                  onClick={() => setSelectedBrand('All')}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Remove brand filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPlatform !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] text-[#1A1A1A] rounded-xs">
                Platform: {selectedPlatform}
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('All')}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Remove platform filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatusTab !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] text-[#1A1A1A] rounded-xs">
                Status: {selectedStatusTab}
                <button
                  type="button"
                  onClick={() => setSelectedStatusTab('All')}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() !== '' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] text-[#1A1A1A] rounded-xs">
                Search: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Clear search query"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedSaleIds.size > 0 && (
        <div className="bg-[#1A1A1A] text-white p-3 border border-[#333] shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`w-4 h-4 border flex items-center justify-center cursor-pointer transition-colors ${
                  areAllSelected
                    ? 'bg-[#8C7355] border-[#8C7355] text-white'
                    : areSomeSelected
                    ? 'bg-[#8C7355]/30 border-[#8C7355] text-[#8C7355]'
                    : 'border-[#666] bg-[#2A2A2A] hover:border-[#8C7355]'
                }`}
                title={areAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
                aria-label={areAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
              >
                {areAllSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
                {!areAllSelected && areSomeSelected && (
                  <span className="w-2 h-0.5 bg-[#8C7355] block" />
                )}
              </button>
              <span className="font-mono text-xs font-semibold">
                {selectedSaleIds.size} of {saleItems.length} listings selected
                {filteredSales.length !== saleItems.length && (
                  <span className="text-[#A5A59E] font-normal"> ({filteredSales.length} matching filter)</span>
                )}
              </span>
            </div>
            <span className="text-xs text-[#A5A59E] font-mono hidden sm:inline">
              (Total Listed: {formatCurrency(selectedTotalListingPrice)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMoveToWardrobe}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs cursor-pointer transition-colors"
              title="Move selected items back to Wardrobe Inventory"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>To Wardrobe ({selectedSaleIds.size})</span>
            </button>
            <button
              type="button"
              onClick={handleBulkMoveToShopping}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#3A3A38] hover:bg-[#4A4A48] text-[#E5E5E1] border border-[#555] shadow-xs cursor-pointer transition-colors"
              title="Move selected items to Wishlist"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>To Wishlist ({selectedSaleIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs cursor-pointer transition-colors"
              title="Bulk edit category, platform, status, tags, and prices for selected listings"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedSaleIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedSaleIds(new Set())}
              className="px-3 py-1 text-xs font-mono text-[#D5D5D0] hover:text-white border border-[#444] hover:border-[#666] bg-[#2A2A2A] cursor-pointer transition-colors"
            >
              Deselect
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer transition-colors"
              title="Delete all selected listings immediately"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedSaleIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Content View: Grid or Database Table */}
      {viewMode === 'grid' ? (
        filteredSales.length === 0 ? (
          <div className="bg-white border border-[#E5E5E1] p-12 text-center text-[#767670]">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#A5A59E] mb-3" />
            <p className="font-serif font-bold text-[#1A1A1A]">No sale items match your criteria</p>
            <p className="text-xs text-[#767670] mt-1 font-mono">Try resetting filters or adding a new listing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSales.map((item) => {
              const isSelected = selectedSaleIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`group bg-white border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#8C7355] ring-2 ring-[#8C7355]/20 shadow-md'
                      : 'border-[#E5E5E1] shadow-2xs hover:shadow-xs hover:border-[#8C7355]'
                  }`}
                >
                  {/* Image Stage */}
                  <div className="relative aspect-4/5 overflow-hidden bg-[#F8F7F4] border-b border-[#E5E5E1]">
                    <GarmentImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />

                    {/* Top Left: Tick Box with unified Sales aesthetic */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectSale(item.id)}
                        className={`p-1.5 rounded-md backdrop-blur-xs shadow-xs border transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#8C7355] border-[#8C7355] text-white ring-2 ring-[#8C7355]/30'
                            : 'bg-white/95 border-zinc-200 text-zinc-300 hover:text-zinc-600 hover:border-zinc-400'
                        }`}
                        title={isSelected ? 'Deselect listing' : 'Select listing for bulk actions'}
                        aria-label={isSelected ? 'Deselect listing' : 'Select listing'}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Top Right: Platform Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-white/95 text-[#1A1A1A] border border-[#D5D5D0] shadow-xs font-semibold">
                        {item.platform}
                      </span>
                    </div>

                    {/* Bottom Right: Pipeline Stage Badge */}
                    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
                      {(() => {
                        const stage = getSaleItemPipelineStage(item);
                        return (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 bg-white/95 border shadow-xs font-semibold uppercase tracking-wider ${
                              stage === 'Listed'
                                ? 'text-emerald-700 border-emerald-300'
                                : stage === 'Completed'
                                ? 'text-teal-700 border-teal-300'
                                : stage === 'In Transit'
                                ? 'text-blue-700 border-blue-300'
                                : stage === 'Awaiting Dispatch'
                                ? 'text-amber-700 border-amber-300'
                                : stage === 'Reserved'
                                ? 'text-indigo-700 border-indigo-300'
                                : stage === 'Cancelled'
                                ? 'text-rose-700 border-rose-300'
                                : 'text-[#767670] border-[#D5D5D0]'
                            }`}
                          >
                            {stage}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Body Details matching Purchases fonts and layout */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      {/* Brand & Price Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-bold truncate">
                          {item.brand || 'Unbranded'}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#1A1A1A]">
                          {formatCurrency(
                            item.listingPrice ?? item.soldPrice ?? item.originalPricePaid ?? 0
                          )}
                        </span>
                      </div>

                      {/* Garment Title in Serif */}
                      <h3
                        className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1"
                        title={item.name}
                      >
                        {item.name}
                      </h3>

                      {/* Garment Sub-details (Category, Condition, Size, Color) */}
                      <p className="text-[11px] text-[#767670] font-sans line-clamp-1">
                        {item.category && (
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(item.category)}
                            className="font-medium text-[#4A4A45] hover:text-[#8C7355] hover:underline cursor-pointer"
                            title={`Filter by category "${item.category}"`}
                          >
                            {item.category}
                          </button>
                        )}
                        {item.condition && ` • ${item.condition}`}
                        {item.size && ` • Size ${item.size}`}
                        {item.color && ` • ${item.color}`}
                      </p>

                      {/* Description / Notes */}
                      {(item.description || item.notes) && (
                        <p className="text-[11px] text-[#767670] line-clamp-2 leading-relaxed font-sans">
                          {item.description || item.notes}
                        </p>
                      )}
                    </div>

                    {/* Unified Tag System with Quick (x) Deletion & Inline (+ tag) Add */}
                    <div className="space-y-1 pt-1.5 border-t border-[#E5E5E1]">
                      <div className="flex flex-wrap items-center gap-1">
                        {(item.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#4A4A45]"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedTag(tag)}
                              className="hover:text-[#8C7355] hover:underline cursor-pointer"
                              title={`Filter by tag #${tag}`}
                            >
                              #{tag}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTag(item.id, tag)}
                              className="text-[#A5A59E] hover:text-rose-600 ml-0.5 cursor-pointer"
                              title={`Delete tag #${tag}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}

                        {/* Add Tag Inline Input */}
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
                            className="w-16 text-[10px] font-mono border border-[#8C7355] px-1 py-0.5 bg-white focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
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

                    {/* Action Buttons Row */}
                    <div className="pt-2 border-t border-[#E5E5E1] flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAiGeneratorItem(item)}
                          className="p-1.5 text-[#767670] hover:text-[#8C7355] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Generate AI Listing Description"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSaleItemToWardrobe(item.id)}
                          className="p-1.5 text-[#767670] hover:text-[#8C7355] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Move back to Wardrobe"
                        >
                          <FolderUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSaleItemToShopping(item.id)}
                          className="p-1.5 text-[#767670] hover:text-[#8C7355] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Move to Wishlist"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                        {item.platformListingUrl && (
                          <a
                            href={item.platformListingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                            title="Open Platform Listing"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSaleItemToEdit(item);
                            setIsSaleFormOpen(true);
                          }}
                          className="p-1.5 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title="Edit Listing Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.status !== 'Sold' && item.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => setMarkSoldItem(item)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-mono font-medium transition cursor-pointer"
                            title="Mark this item as sold"
                          >
                            Mark Sold
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (safeConfirm(`Delete listing for "${item.name}"?`)) {
                              deleteSaleItem(item.id);
                            }
                          }}
                          className="p-1.5 text-[#767670] hover:text-rose-600 border border-[#E5E5E1] hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <SellingDatabaseTable
          items={filteredSales}
          selectedItemIds={selectedSaleIds}
          onToggleSelectItem={toggleSelectSale}
          onSelectAll={() => {
            if (selectedSaleIds.size === filteredSales.length) {
              setSelectedSaleIds(new Set());
            } else {
              setSelectedSaleIds(new Set(filteredSales.map((s) => s.id)));
            }
          }}
          areAllSelected={filteredSales.length > 0 && selectedSaleIds.size === filteredSales.length}
          areSomeSelected={selectedSaleIds.size > 0 && selectedSaleIds.size < filteredSales.length}
          displaySettings={displaySettings}
          onSelectCategory={(category) => {
            setSelectedCategory(category);
          }}
          onSelectTag={(tag) => {
            setSelectedTag(tag);
          }}
          onEditItem={(item) => {
            setSaleItemToEdit(item);
            setIsSaleFormOpen(true);
          }}
          onMarkSold={(item) => setMarkSoldItem(item)}
          onOpenAiGenerator={(item) => setAiGeneratorItem(item)}
        />
      )}

      {/* Overlay Modals */}
      <SellFromWardrobeModal
        isOpen={isSellFromWardrobeOpen}
        onClose={() => setIsSellFromWardrobeOpen(false)}
      />

      <SaleFormModal
        isOpen={isSaleFormOpen}
        onClose={() => {
          setIsSaleFormOpen(false);
          setSaleItemToEdit(null);
        }}
        saleItemToEdit={saleItemToEdit}
      />

      {markSoldItem && (
        <MarkSoldModal
          isOpen={!!markSoldItem}
          onClose={() => setMarkSoldItem(null)}
          saleItem={markSoldItem}
        />
      )}

      {isBulkEditOpen && (
        <BulkEditModal
          isOpen={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          selectedIds={Array.from(selectedSaleIds)}
          targetType="selling"
          onComplete={() => setSelectedSaleIds(new Set())}
        />
      )}

      <SellingDisplaySettingsModal
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
        settings={displaySettings}
        onChange={handleUpdateDisplaySettings}
        onResetColumnWidths={() => {
          localStorage.removeItem('selling_table_widths_v2');
          window.dispatchEvent(new Event('storage'));
        }}
      />

      {isAutoImportOpen && (
        <AutoImportModal
          isOpen={isAutoImportOpen}
          onClose={() => setIsAutoImportOpen(false)}
          initialTab={autoImportTab}
          defaultDestination="selling"
        />
      )}

      {isDuplicateMergeOpen && (
        <DuplicateMergeModal
          isOpen={isDuplicateMergeOpen}
          onClose={() => setIsDuplicateMergeOpen(false)}
          initialScope="selling"
        />
      )}

      {aiGeneratorItem && (
        <AiListingGeneratorModal
          isOpen={!!aiGeneratorItem}
          onClose={() => setAiGeneratorItem(null)}
          saleItem={aiGeneratorItem}
          onApplyToListing={(generated) => {
            if (aiGeneratorItem) {
              updateSaleItem(aiGeneratorItem.id, {
                description: generated.description,
                tags: Array.from(new Set([...(aiGeneratorItem.tags || []), ...generated.tags])),
                ...(generated.listingPrice ? { listingPrice: generated.listingPrice } : {}),
              });
            }
            setAiGeneratorItem(null);
          }}
        />
      )}
    </div>
  );
};
