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
  DollarSign,
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
} from 'lucide-react';
import {
  SaleItem,
  SellingPlatform,
  SellingStatus,
  ShippingStatus,
  Category,
} from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { MarkSoldModal } from './MarkSoldModal';
import { SellFromWardrobeModal } from './SellFromWardrobeModal';
import { SaleFormModal } from './SaleFormModal';
import { AiListingGeneratorModal } from './AiListingGeneratorModal';
import { AutoImportModal } from './AutoImportModal';
import { GarmentImage } from './GarmentImage';
import { BulkEditModal } from './BulkEditModal';
import { SellingDatabaseTable } from './SellingDatabaseTable';
import {
  SellingDisplaySettingsModal,
  SellingDisplaySettings,
  DEFAULT_SELLING_DISPLAY_SETTINGS,
} from './SellingDisplaySettingsModal';

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

  // Filters & View State
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(displaySettings.viewMode || 'grid');

  // Sync viewMode changes to displaySettings
  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    handleUpdateDisplaySettings({ ...displaySettings, viewMode: mode });
  };

  // Unique Brands with counts
  const uniqueBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    saleItems.forEach((it) => {
      const b = it.brand?.trim() || 'Unbranded';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, count]) => ({ brand, count }));
  }, [saleItems]);

  // Multi-selection state
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isAutoImportOpen, setIsAutoImportOpen] = useState(false);
  const [isSellFromWardrobeOpen, setIsSellFromWardrobeOpen] = useState(false);
  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [saleItemToEdit, setSaleItemToEdit] = useState<SaleItem | null>(null);
  const [markSoldItem, setMarkSoldItem] = useState<SaleItem | null>(null);
  const [aiGeneratorItem, setAiGeneratorItem] = useState<SaleItem | null>(null);

  // Copied tracking feedback
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

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

  // Format currency helper
  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Filtered & Sorted Sale Items
  const filteredSales = useMemo(() => {
    const matched = saleItems.filter((item) => {
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

    // Execute sorting
    return matched.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'price_desc') return (b.listingPrice || 0) - (a.listingPrice || 0);
      if (sortBy === 'price_asc') return (a.listingPrice || 0) - (b.listingPrice || 0);
      return 0;
    });
  }, [saleItems, selectedStatusTab, selectedPlatform, selectedBrand, selectedCategory, searchQuery, sortBy]);

  const toggleSelectSale = (id: string) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedSaleIds.size} listings?`)) {
      deleteMultipleSaleItems(Array.from(selectedSaleIds));
      setSelectedSaleIds(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search listings..."
            className="pl-9 pr-4 py-2 w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSellFromWardrobeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition"
          >

      {/* Grid Filtering Tabs */}
      {/* 2. Added missing option tags for status */}
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium text-zinc-600">
          Status:
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Listings</option>
          <option value="sold">Sold</option>
        </select>
      </div>


      {/* Grid Filtering Tabs */}
      {/* 2. Added missing option tags for status */}
      <select
        value={selectedStatusTab}
        onChange={(e) => setSelectedStatusTab(e.target.value)}
        className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active / Listed</option>
        <option value="sold">Sold / Shipped</option>
        <option value="drafts">Drafts</option>
      </select>

      {/* 3. Added missing option tags and mapping template structure */}
      <select
        value={selectedBrand}
        onChange={(e) => setSelectedBrand(e.target.value)}
        className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400"
      >
        <option value="">All Brands</option>
        {uniqueBrands.map((ub) => (
          <option key={ub.brand} value={ub.brand}>
            {ub.brand} ({ub.count})
          </option>
        ))}
      </select>

      {/* 4. Added missing option tags for platforms */}
      <select
        value={selectedPlatform}
        onChange={(e) => setSelectedPlatform(e.target.value)}
        className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400"
      >
        <option value="">All Platforms</option>
        <option value="vinted">Vinted</option>
        <option value="depop">Depop</option>
        <option value="ebay">eBay</option>
      </select>

      {/* 5. Added missing option tags for sorting */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400"
      >
        <option value="recent">Recently Listed</option>
        <option value="price-high">Highest Price</option>
        <option value="price-low">Lowest Price</option>
      </select>

      {/* Bulk actions status overlay */}
      {/* 6. Wrapped static text strings inside valid HTML elements */}
      {selectedSaleIds.size > 0 && (
        <div className="flex items-center gap-2 bg-zinc-800 text-white p-2 rounded-lg">
          <span>{selectedSaleIds.size} listings selected</span>
          <button 
            onClick={() => {/* add delete handler function here */}}
            className="text-red-400 hover:text-red-500"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedSaleIds(new Set())}
            className="p-1.5 text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Content Renderer Layout */}
      {/* 7. Wrapped raw strings into elements and corrected layout template string concatenation */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredSales.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-3 flex flex-col group relative transition hover:shadow-md ${
                selectedSaleIds.has(item.id) ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200'
              }`}
            >
              <button
                onClick={() => toggleSelectSale(item.id)}
                className="absolute top-2 left-2 z-10 p-1 rounded-md bg-white/90 shadow-sm border border-zinc-200"
              >
                <CheckSquare 
                  className={`w-3.5 h-3.5 ${
                    selectedSaleIds.has(item.id) ? 'text-zinc-900' : 'text-zinc-300'
                  }`} 
                />
              </button>
              
              <div>{item.platform}</div>
              <div>{item.brand || 'Unbranded'}</div>
              <div>{item.name}</div>
              
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                item.status === 'Listed' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-zinc-100 text-zinc-600'
              }`}>
                {item.status}
              </span>
              <div>{formatGbp(item.listingPrice || 0)}</div>
            </div>
          ))}
        </div>
      ) : (
        <SellingDatabaseTable
          items={filteredSales}
          onEditItem={(item) => {
            setSaleItemToEdit(item);
            setIsSaleFormOpen(true);
          }}
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
            {/* Ensure any open modals or conditional blocks are completely closed before this wrapper */}
      <SaleFormModal
        isOpen={isSaleFormOpen}
        onClose={() => setIsSaleFormOpen(false)}
        initialItem={saleItemToEdit}
      />
    </>
  );
};
