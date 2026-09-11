import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Layers,
  FileUp,
  History,
  Link2,
  Camera,
  Receipt,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  Download,
  Shirt,
  ShoppingBag,
  PoundSterling,
  ExternalLink,
  ShieldCheck,
  Database,
  Search,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { VersionHistoryView } from './VersionHistoryView';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { AutoImportModal } from './AutoImportModal';
import { EbayImportModal } from './EbayImportModal';
import {
  buildDuplicateItemRefs,
  computeDuplicateClusters,
  getStoredIgnoredClusters,
} from './duplicateMerge/duplicateEngine';
import { getDefaultPresetConfig } from './duplicateMerge/duplicateUtils';

interface ToolsViewProps {
  onOpenCreateSnapshot: () => void;
  defaultSubTab?: 'duplicates' | 'import' | 'audit';
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  onOpenCreateSnapshot,
  defaultSubTab = 'duplicates',
}) => {
  const {
    items,
    shoppingList,
    saleItems,
    snapshots,
    changeLogs,
    currentVersion,
    formatCurrency,
  } = useWardrobe();

  const [activeSubTab, setActiveSubTab] = useState<'duplicates' | 'import' | 'audit'>(
    defaultSubTab
  );

  // Duplicate Merge Modal State
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);
  const [duplicateScope, setDuplicateScope] = useState<
    'all' | 'wardrobe' | 'shopping' | 'selling'
  >('all');

  // Auto Import Modal State
  const [isAutoImportOpen, setIsAutoImportOpen] = useState(false);
  const [isEbayImportOpen, setIsEbayImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<'url' | 'photo' | 'text' | 'vinted'>('url');
  const [importDestination, setImportDestination] = useState<
    'wardrobe' | 'shopping' | 'selling'
  >('wardrobe');
  const [directUrlInput, setDirectUrlInput] = useState('');

  // Compute live duplicate clusters across inventory, wishlist, and sales
  const duplicateClusters = useMemo(() => {
    try {
      const refs = buildDuplicateItemRefs(items, shoppingList, saleItems, 'all');
      const cfg = getDefaultPresetConfig('standard');
      const allClusters = computeDuplicateClusters(refs, cfg, 'standard', {});
      const ignored = getStoredIgnoredClusters();
      return allClusters.filter((c) => !ignored.has(c.id));
    } catch (e) {
      console.error('Error computing duplicate clusters', e);
      return [];
    }
  }, [items, shoppingList, saleItems]);

  const handleOpenDuplicateMerge = (
    scope: 'all' | 'wardrobe' | 'shopping' | 'selling' = 'all'
  ) => {
    setDuplicateScope(scope);
    setIsDuplicateMergeOpen(true);
  };

  const handleOpenImport = (
    tab: 'url' | 'photo' | 'text' | 'vinted' = 'url',
    destination: 'wardrobe' | 'shopping' | 'selling' = importDestination,
    prefilledUrl?: string
  ) => {
    setImportTab(tab);
    setImportDestination(destination);
    if (prefilledUrl) {
      setDirectUrlInput(prefilledUrl);
    }
    setIsAutoImportOpen(true);
  };

  const handleDirectUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrlInput.trim()) return;
    handleOpenImport('url', importDestination, directUrlInput.trim());
  };

  return (
    <div className="space-y-6">
      {/* Tools Top Header Banner */}
      <div className="bg-white border border-[#E5E5E1] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-amber-300 shadow-xs">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
                    Studio Tools &amp; Utilities
                  </h1>
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] text-[#5A5A55] uppercase font-semibold tracking-wider">
                    Maintenance Suite
                  </span>
                </div>
                <p className="text-xs text-[#767670] mt-0.5 font-sans">
                  Centralized control center for deduplication, multi-source imports, database snapshots, and audit history.
                </p>
              </div>
            </div>
          </div>

          {/* Quick System Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="px-2.5 py-1 bg-[#F8F7F4] border border-[#E5E5E1] text-[#5A5A55] flex items-center gap-1.5">
              <Database className="w-3 h-3 text-[#8C7355]" />
              <span>{items.length + shoppingList.length + saleItems.length} Total Items</span>
            </div>
            <div
              className={`px-2.5 py-1 border flex items-center gap-1.5 ${
                duplicateClusters.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {duplicateClusters.length > 0 ? (
                <AlertTriangle className="w-3 h-3 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              )}
              <span>
                {duplicateClusters.length > 0
                  ? `${duplicateClusters.length} Duplicates Detected`
                  : 'Clean / No Duplicates'}
              </span>
            </div>
            <div className="px-2.5 py-1 bg-[#F8F7F4] border border-[#E5E5E1] text-[#5A5A55] flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-[#8C7355]" />
              <span>v{currentVersion || '1.0'}</span>
            </div>
          </div>
        </div>

        {/* Top Tools Section Switcher Bar */}
        <div className="mt-5 pt-4 border-t border-[#E5E5E1] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#F8F7F4] p-1 border border-[#E5E5E1]">
            <button
              type="button"
              onClick={() => setActiveSubTab('duplicates')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'duplicates'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Merge Duplicates</span>
              {duplicateClusters.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-amber-500 text-white rounded-full font-bold">
                  {duplicateClusters.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('import')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'import'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Import Toolbox</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Audit &amp; Versions</span>
              <span className="text-[10px] text-[#A0A09A]">
                ({snapshots.length})
              </span>
            </button>
          </div>

          {/* Contextual Quick Actions for current tab */}
          {activeSubTab === 'duplicates' && (
            <button
              type="button"
              onClick={() => handleOpenDuplicateMerge('all')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Scan &amp; Merge Duplicates</span>
            </button>
          )}

          {activeSubTab === 'import' && (
            <button
              type="button"
              onClick={() => handleOpenImport('url', importDestination)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Launch Import Studio</span>
            </button>
          )}

          {activeSubTab === 'audit' && (
            <button
              type="button"
              onClick={onOpenCreateSnapshot}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Create System Snapshot</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== SECTION 1: MERGE DUPLICATES ===================== */}
      {activeSubTab === 'duplicates' && (
        <div className="space-y-6">
          {/* Deduplication Overview Hero Card */}
          <div className="bg-white border border-[#E5E5E1] p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 bg-[#F2F1ED] text-[#8C7355] font-semibold">
                  <Layers className="w-3 h-3" />
                  Deduplication Engine
                </div>
                <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">
                  Cross-Collection Duplicate Detection &amp; Resolution
                </h2>
                <p className="text-xs text-[#767670] leading-relaxed">
                  Scan your active wardrobe inventory, shopping wishlist, and resale listings.
                  The engine normalizes brand aliases (e.g. <em>Finamore 1925 Napoli → Finamore</em>),
                  cleans noisy size/color modifiers from titles, and merges wear histories, tags,
                  and pricing data with complete zero-data-loss integrity.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('all')}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  <Layers className="w-4 h-4" />
                  <span>Launch Merge Studio</span>
                </button>
                <div className="text-[11px] text-[#767670] font-mono text-center">
                  Live Status:{' '}
                  <strong className={duplicateClusters.length > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    {duplicateClusters.length > 0
                      ? `${duplicateClusters.length} clusters pending review`
                      : 'All records clear'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Scope Launch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#E5E5E1]">
              <div className="p-3.5 bg-[#F8F7F4] border border-[#E5E5E1] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#767670] flex items-center gap-1">
                    <Shirt className="w-3.5 h-3.5 text-[#8C7355]" /> Wardrobe
                  </span>
                  <strong className="text-[#1A1A1A]">{items.length} items</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('wardrobe')}
                  className="w-full mt-1 px-2.5 py-1.5 text-[11px] font-mono bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#1A1A1A] transition-colors cursor-pointer text-left flex items-center justify-between"
                >
                  <span>Scan Wardrobe Only</span>
                  <ArrowRight className="w-3 h-3 text-[#8C7355]" />
                </button>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] border border-[#E5E5E1] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#767670] flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#8C7355]" /> Wishlist
                  </span>
                  <strong className="text-[#1A1A1A]">{shoppingList.length} items</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('shopping')}
                  className="w-full mt-1 px-2.5 py-1.5 text-[11px] font-mono bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#1A1A1A] transition-colors cursor-pointer text-left flex items-center justify-between"
                >
                  <span>Scan Wishlist Only</span>
                  <ArrowRight className="w-3 h-3 text-[#8C7355]" />
                </button>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] border border-[#E5E5E1] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#767670] flex items-center gap-1">
                    <PoundSterling className="w-3.5 h-3.5 text-[#8C7355]" /> Resale
                  </span>
                  <strong className="text-[#1A1A1A]">{saleItems.length} items</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('selling')}
                  className="w-full mt-1 px-2.5 py-1.5 text-[11px] font-mono bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#1A1A1A] transition-colors cursor-pointer text-left flex items-center justify-between"
                >
                  <span>Scan Resale Only</span>
                  <ArrowRight className="w-3 h-3 text-[#8C7355]" />
                </button>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] border border-[#E5E5E1] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#767670] flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#8C7355]" /> Entire Studio
                  </span>
                  <strong className="text-[#1A1A1A]">
                    {items.length + shoppingList.length + saleItems.length} items
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('all')}
                  className="w-full mt-1 px-2.5 py-1.5 text-[11px] font-mono bg-[#8C7355] hover:bg-[#735D43] text-white transition-colors cursor-pointer text-left flex items-center justify-between"
                >
                  <span>Full Cross-Scan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Pending Clusters or Clean State */}
          {duplicateClusters.length > 0 ? (
            <div className="bg-white border border-[#E5E5E1] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                    Detected Duplicate Clusters ({duplicateClusters.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('all')}
                  className="text-xs font-mono text-[#8C7355] hover:underline font-medium cursor-pointer"
                >
                  Open in Merge Studio →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {duplicateClusters.slice(0, 6).map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-3.5 bg-[#F8F7F4] border border-[#E5E5E1] flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="uppercase tracking-wider text-[#8C7355] font-bold">
                          {cluster.brand || 'Unbranded'}
                        </span>
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200">
                          {cluster.items.length} items
                        </span>
                      </div>
                      <h4 className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1">
                        {cluster.title}
                      </h4>
                      <p className="text-[11px] text-[#767670] line-clamp-1 font-mono capitalize">
                        {cluster.category} • Match: {cluster.matchType.replace('_', ' ')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDuplicateMerge('all')}
                      className="w-full py-1 text-center bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] transition-colors cursor-pointer"
                    >
                      Resolve Cluster
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E5E1] p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                No Duplicates Detected
              </h3>
              <p className="text-xs text-[#767670] max-w-md mx-auto">
                Your wardrobe catalog, shopping wishlist, and sales listings have zero conflicting entries.
                You can trigger a manual scan anytime if you import new items.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenDuplicateMerge('all')}
                  className="px-4 py-2 bg-[#F2F1ED] hover:bg-[#E5E3DC] text-xs font-mono text-[#1A1A1A] border border-[#E5E5E1] cursor-pointer"
                >
                  Run Deep Verification Scan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== SECTION 2: IMPORT TOOLBOX ===================== */}
      {activeSubTab === 'import' && (
        <div className="space-y-6">
          {/* Destination Selector Header Card */}
          <div className="bg-white border border-[#E5E5E1] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Multi-Source Import Toolbox
                </h2>
                <p className="text-xs text-[#767670]">
                  Select where you want new items ingested, then choose your preferred intake method.
                </p>
              </div>

              {/* Destination Selector Radio/Pill */}
              <div className="flex items-center gap-1 bg-[#F8F7F4] p-1 border border-[#E5E5E1]">
                <span className="text-[10px] font-mono text-[#767670] px-2">Target:</span>
                <button
                  type="button"
                  onClick={() => setImportDestination('wardrobe')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono cursor-pointer transition-all ${
                    importDestination === 'wardrobe'
                      ? 'bg-white text-[#1A1A1A] font-bold shadow-xs'
                      : 'text-[#767670] hover:text-[#1A1A1A]'
                  }`}
                >
                  <Shirt className="w-3 h-3 text-[#8C7355]" />
                  <span>Wardrobe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportDestination('shopping')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono cursor-pointer transition-all ${
                    importDestination === 'shopping'
                      ? 'bg-white text-[#1A1A1A] font-bold shadow-xs'
                      : 'text-[#767670] hover:text-[#1A1A1A]'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3 text-[#8C7355]" />
                  <span>Wishlist</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportDestination('selling')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono cursor-pointer transition-all ${
                    importDestination === 'selling'
                      ? 'bg-white text-[#1A1A1A] font-bold shadow-xs'
                      : 'text-[#767670] hover:text-[#1A1A1A]'
                  }`}
                >
                  <PoundSterling className="w-3 h-3 text-[#8C7355]" />
                  <span>Resale</span>
                </button>
              </div>
            </div>

            {/* Quick URL Inline Extractor Bar */}
            <form onSubmit={handleDirectUrlSubmit} className="pt-3 border-t border-[#E5E5E1]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 relative">
                  <Link2 className="w-4 h-4 text-[#8C7355] absolute left-3 top-2.5" />
                  <input
                    type="url"
                    placeholder="Paste product link (e.g. Barbour, Zara, COS, Arket, Net-A-Porter, Vinted, eBay)..."
                    value={directUrlInput}
                    onChange={(e) => setDirectUrlInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F7F4] border border-[#E5E5E1] text-xs text-[#1A1A1A] placeholder:text-[#A5A59E] focus:bg-white focus:outline-none focus:border-[#8C7355]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!directUrlInput.trim()}
                  className="px-4 py-2 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extract &amp; Import</span>
                </button>
              </div>
            </form>
          </div>

          {/* 4 Specialized Import Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Channel 1: Web Scraper */}
            <div className="bg-white border border-[#E5E5E1] p-5 flex flex-col justify-between space-y-4 hover:border-[#8C7355] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-[#F2F1ED] flex items-center justify-center text-[#8C7355]">
                  <Link2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  Retailer Web Scraper
                </h3>
                <p className="text-xs text-[#767670] leading-relaxed font-sans">
                  Import pieces directly via product URLs. Automatically extracts high-resolution imagery,
                  brand name, retail price in GBP, fabric composition, colorway, and sizing.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-[#767670]">
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Zara</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Barbour</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Arket</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Net-A-Porter</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Vinted</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">eBay</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenImport('url', importDestination)}
                className="w-full py-2 bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] text-xs font-mono font-medium text-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Open URL Scraper</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8C7355]" />
              </button>
            </div>

            {/* Channel 2: Photo & Visual Recognition */}
            <div className="bg-white border border-[#E5E5E1] p-5 flex flex-col justify-between space-y-4 hover:border-[#8C7355] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-[#F2F1ED] flex items-center justify-center text-[#8C7355]">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  Garment Photos &amp; Labels
                </h3>
                <p className="text-xs text-[#767670] leading-relaxed font-sans">
                  Upload flat-lay photos, wardrobe snapshots, or close-ups of care labels.
                  AI analyzes garment contours to classify category, primary palette, pattern, and style.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-[#767670]">
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">JPEG/PNG</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Care Tag OCR</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Color Palette</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenImport('photo', importDestination)}
                className="w-full py-2 bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] text-xs font-mono font-medium text-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Upload Photos</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8C7355]" />
              </button>
            </div>

            {/* Channel 3: Vinted Order & Resale Parser */}
            <div className="bg-white border border-[#E5E5E1] p-5 flex flex-col justify-between space-y-4 hover:border-[#8C7355] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-[#F2F1ED] flex items-center justify-center text-[#8C7355]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  Vinted Orders, Closet Scraper &amp; Resale
                </h3>
                <p className="text-xs text-[#767670] leading-relaxed font-sans">
                  Scrape any public Vinted closet/account listings, sync live purchase/sale orders, or parse receipts.
                  Automatically categorizes and applies standardized lifecycle tags: Bought, Sold, Listed, and Cancelled.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-[#767670]">
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Account Scraper</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Live Orders</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Bought / Sold / Listed Tags</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenImport('vinted', importDestination)}
                className="w-full py-2 bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] text-xs font-mono font-medium text-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Import Vinted Data</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8C7355]" />
              </button>
            </div>

            {/* Channel 4: Bulk Text & CSV Line Items */}
            <div className="bg-white border border-[#E5E5E1] p-5 flex flex-col justify-between space-y-4 hover:border-[#8C7355] transition-colors">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-[#F2F1ED] flex items-center justify-center text-[#8C7355]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  Bulk Text / CSV Import
                </h3>
                <p className="text-xs text-[#767670] leading-relaxed font-sans">
                  Batch import multiple garments by pasting plain text lines or CSV data.
                  Example: <em>Barbour Bedale Wax Jacket, Olive, Size 38, £280, Outerwear</em>.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-[#767670]">
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Plain Text</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">CSV Format</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Multi-line</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenImport('text', importDestination)}
                className="w-full py-2 bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#E5E5E1] text-xs font-mono font-medium text-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Paste Text Lines</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8C7355]" />
              </button>
            </div>

            {/* Channel 5: eBay Direct Sync & Listings */}
            <div className="bg-white border border-[#E5E5E1] p-5 flex flex-col justify-between space-y-4 hover:border-[#0064D2] transition-colors md:col-span-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-[#0064D2]/10 border border-[#0064D2]/30 flex items-center justify-center text-[#0064D2] font-black text-sm">
                    e<span className="text-[#E53238]">b</span>
                    <span className="text-[#F5AF02]">a</span>
                    <span className="text-[#86B817]">y</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-[#0064D2]/10 text-[#0064D2] font-bold">
                    Direct API &amp; Seller Sync
                  </span>
                </div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  eBay Order History, Purchases &amp; Active Resale Listings
                </h3>
                <p className="text-xs text-[#767670] leading-relaxed font-sans">
                  Directly connect to your eBay account or public seller store. Pull your order history (both purchased garments and sold pieces) or active resale listings with high-resolution imagery, pricing in GBP, brands, and automated deduplication against your active inventory.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-[#767670]">
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Order History</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Active Listings</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Purchases &amp; Sales</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">Seller Store Scraper</span>
                  <span className="px-1.5 py-0.5 bg-[#F8F7F4] border border-[#E5E5E1]">HTML / CSV Reports</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-mono text-[#767670]">
                  Routes purchases to <strong>Wardrobe / Wishlist</strong> and active listings to <strong>Resale Studio</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => setIsEbayImportOpen(true)}
                  className="w-full sm:w-auto px-5 py-2 bg-[#0064D2] hover:bg-[#0051a8] text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch eBay Importer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SECTION 3: AUDIT & VERSIONS ===================== */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <VersionHistoryView onOpenCreateSnapshot={onOpenCreateSnapshot} />
        </div>
      )}

      {/* Embedded Duplicate Merge Modal */}
      {isDuplicateMergeOpen && (
        <DuplicateMergeModal
          isOpen={isDuplicateMergeOpen}
          onClose={() => setIsDuplicateMergeOpen(false)}
          initialScope={duplicateScope}
        />
      )}

      {/* Embedded Auto Import Modal */}
      {isAutoImportOpen && (
        <AutoImportModal
          isOpen={isAutoImportOpen}
          onClose={() => {
            setIsAutoImportOpen(false);
            setDirectUrlInput('');
          }}
          initialTab={importTab}
          defaultDestination={importDestination}
          initialUrl={directUrlInput}
        />
      )}

      {/* Embedded eBay Direct Importer Modal */}
      {isEbayImportOpen && (
        <EbayImportModal
          isOpen={isEbayImportOpen}
          onClose={() => setIsEbayImportOpen(false)}
          defaultDestination={importDestination}
        />
      )}
    </div>
  );
};
