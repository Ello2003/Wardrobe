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
      .sort((a, b) => a.localeCompare(b))
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

    // Execute sorting completely
    return matched.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'price-high') return (b.listedPrice || 0) - (a.listedPrice || 0);
      if (sortBy === 'price-low') return (a.listedPrice || 0) - (b.listedPrice || 0);
      return 0;
    });
  }, [saleItems, selectedStatusTab, selectedPlatform, selectedBrand, selectedCategory, searchQuery, sortBy]);

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-zinc-100 bg-white rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSaleItemToEdit(null);
                setIsSaleFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium shadow transition"
            >
              <Plus className="w-4 h-4" />
              Sell from Wardrobe
            </button>
          </div>

          {/* Grid Filtering Tabs & Layout Options */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-zinc-600">
                Status:
              </label>
              <select
                id="status-filter"
                value={selectedStatusTab}
                onChange={(e) => setSelectedStatusTab(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Listings</option>
                <option value="Sold">Sold &gt; Completed</option>
                <option value="Draft">Drafts</option>
              </select>
            </div>

            <div className="flex items-center border border-zinc-200 rounded-lg p-0.5 bg-zinc-50">
              <button
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('table')}
                className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Context Handler */}
        {viewMode === 'table' ? (
          <SellingDatabaseTable 
            items={filteredSales} 
            selectedIds={selectedSaleIds} 
            setSelectedIds={setSelectedSaleIds} 
            onEdit={setSaleItemToEdit}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSales.map((item) => (
              <div key={item.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{item.brand || 'Unbranded'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Listed' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-zinc-900 text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-lg font-semibold text-zinc-900">{formatGbp(item.listedPrice || 0)}</p>
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                    <button
                      onClick={() => {
                        setSaleItemToEdit(item);
                        setIsSaleFormOpen(true);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <div className="col-span-full py-12 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-600">No items match your selected filters</p>
              </div>
            )}
          </div>
        )}

        {/* Modals & Control Footers */}
        <SaleFormModal
          isOpen={isSaleFormOpen}
          onClose={() => setIsSaleFormOpen(false)}
          initialItem={saleItemToEdit}
        />
        <MarkSoldModal isOpen={!!markSoldItem} onClose={() => setMarkSoldItem(null)} item={markSoldItem} />
        <SellFromWardrobeModal isOpen={isSellFromWardrobeOpen} onClose={() => setIsSellFromWardrobeOpen(false)} />
        <AiListingGeneratorModal isOpen={!!aiGeneratorItem} onClose={() => setAiGeneratorItem(null)} item={aiGeneratorItem} />
        <AutoImportModal isOpen={isAutoImportOpen} onClose={() => setIsAutoImportOpen(false)} />
        <BulkEditModal isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} selectedIds={selectedSaleIds} />
        <SellingDisplaySettingsModal isOpen={isDisplaySettingsOpen} onClose={() => setIsDisplaySettingsOpen(false)} settings={displaySettings} onSave={handleUpdateDisplaySettings} />
      </div>
    </>
  );
};
