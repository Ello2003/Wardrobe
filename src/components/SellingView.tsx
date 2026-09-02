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
  GitMerge,
  ArrowRightLeft,
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
import { DuplicateMergeModal } from './DuplicateMergeModal';
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

  // Multi-selection state
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isAutoImportOpen, setIsAutoImportOpen] = useState(false);
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSetViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsDisplaySettingsOpen(true)}
            className="p-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
            title="Display Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDuplicateMergeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
            title="Scan and merge duplicate listings"
          >
            <GitMerge className="w-4 h-4 text-[#8C7355]" />
            Merge Duplicates
          </button>

          <button
            onClick={() => setIsAutoImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
            title="Import from URL or receipt"
          >
            <FileUp className="w-4 h-4 text-zinc-600" />
            Import
          </button>

          <button
            onClick={() => setIsSellFromWardrobeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition cursor-pointer"
          >
            <Shirt className="w-4 h-4 text-zinc-600" />
            Sell from Wardrobe
          </button>

          <button
            onClick={() => {
              setSaleItemToEdit(null);
              setIsSaleFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Listing
          </button>
        </div>
      </div>

      {/* Grid Filtering Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedStatusTab}
          onChange={(e) => setSelectedStatusTab(e.target.value)}
          className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400 cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active / Listed</option>
          <option value="Sold">Sold / Shipped</option>
          <option value="Draft">Drafts</option>
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400 cursor-pointer"
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
          className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400 cursor-pointer"
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
          className="bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-zinc-400 cursor-pointer"
        >
          <option value="newest">Recently Listed</option>
          <option value="price_desc">Highest Price</option>
          <option value="price_asc">Lowest Price</option>
        </select>

        {selectedSaleIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs flex-wrap">
            <span className="font-medium">{selectedSaleIds.size} selected</span>
            <span className="text-zinc-600">|</span>
            <button
              onClick={() => setIsBulkEditOpen(true)}
              className="text-zinc-200 hover:text-white font-medium cursor-pointer"
            >
              Bulk Edit
            </button>
            <span className="text-zinc-600">|</span>
            <button
              onClick={handleBulkMoveToWardrobe}
              className="text-zinc-200 hover:text-white font-medium cursor-pointer"
              title="Move selected items back to wardrobe"
            >
              To Wardrobe
            </button>
            <span className="text-zinc-600">|</span>
            <button
              onClick={handleBulkMoveToShopping}
              className="text-zinc-200 hover:text-white font-medium cursor-pointer"
              title="Move selected items to wishlist"
            >
              To Wishlist
            </button>
            <span className="text-zinc-600">|</span>
            <button
              onClick={handleBulkDelete}
              className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedSaleIds(new Set())}
              className="p-0.5 text-zinc-400 hover:text-white cursor-pointer ml-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content View: Grid or Database Table */}
      {viewMode === 'grid' ? (
        filteredSales.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-500">
            <ShoppingBag className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <p className="font-medium text-zinc-700">No sale items match your criteria</p>
            <p className="text-xs text-zinc-400 mt-1">Try resetting filters or adding a new listing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSales.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-3 flex flex-col group relative transition hover:shadow-md ${
                  selectedSaleIds.has(item.id)
                    ? 'border-zinc-900 ring-1 ring-zinc-900'
                    : 'border-zinc-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelectSale(item.id)}
                  className="absolute top-2 left-2 z-10 p-1 rounded-md bg-white/90 shadow-sm border border-zinc-200 cursor-pointer"
                >
                  <CheckSquare
                    className={`w-3.5 h-3.5 ${
                      selectedSaleIds.has(item.id) ? 'text-zinc-900' : 'text-zinc-300'
                    }`}
                  />
                </button>

                <div className="w-full aspect-square rounded-lg overflow-hidden bg-zinc-100 mb-3 relative">
                  <GarmentImage
                    src={item.imageUrl}
                    alt={item.name}
                    category={item.category}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-zinc-800 shadow-xs">
                    {item.platform}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                    {item.brand || 'Unbranded'}
                  </span>
                  <h3 className="font-medium text-sm text-zinc-900 truncate mb-1">{item.name}</h3>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-100">
                    <span className="text-sm font-semibold text-zinc-900">
                      {formatCurrency(item.listingPrice ?? item.soldPrice ?? item.originalPricePaid ?? 0)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        item.status === 'Listed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : item.status === 'Sold' || item.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => setAiGeneratorItem(item)}
                    className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition cursor-pointer"
                    title="Generate AI Listing Description"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSaleItemToWardrobe(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition cursor-pointer"
                    title="Move back to Wardrobe"
                  >
                    <FolderUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSaleItemToEdit(item);
                      setIsSaleFormOpen(true);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition cursor-pointer"
                    title="Edit Listing"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {item.status !== 'Sold' && item.status !== 'Completed' && (
                    <button
                      onClick={() => setMarkSoldItem(item)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium transition cursor-pointer"
                    >
                      Mark Sold
                    </button>
                  )}
                </div>
              </div>
            ))}
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
