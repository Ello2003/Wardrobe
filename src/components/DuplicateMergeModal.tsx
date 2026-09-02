import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Palette,
  EyeOff,
  Eye,
  Ban,
  Info,
  Undo2,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  ItemSource,
  MatchPreset,
  MatchParametersConfig,
  DuplicateCluster,
} from './duplicateMerge/duplicateMergeTypes';
import {
  getDefaultPresetConfig,
  cleanItemTitle,
  normalizeString,
} from './duplicateMerge/duplicateUtils';
import {
  getStoredIgnoredClusters,
  saveStoredIgnoredClusters,
  buildDuplicateItemRefs,
  computeDuplicateClusters,
} from './duplicateMerge/duplicateEngine';
import { MatchingConfigToolbar } from './duplicateMerge/MatchingConfigToolbar';
import { DuplicateClusterCard } from './duplicateMerge/DuplicateClusterCard';
import { CustomiseMergeDrawer } from './duplicateMerge/CustomiseMergeDrawer';

interface DuplicateMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: 'all' | 'wardrobe' | 'shopping' | 'selling';
  defaultTab?: string;
}

export const DuplicateMergeModal: React.FC<DuplicateMergeModalProps> = ({
  isOpen,
  onClose,
  initialScope = 'all',
  defaultTab,
}) => {
  const effectiveScope = (defaultTab as any) || initialScope || 'all';
  const {
    items,
    shoppingList,
    saleItems,
    mergeWardrobeItems,
    mergeShoppingItems,
    mergeSaleItems,
    mergeCrossCollectionItems,
    batchAutoMergeDuplicates,
    autoMergeAllDuplicates,
    undoLastAction,
    canUndo,
    formatCurrency,
  } = useWardrobe();

  // State
  const [scope, setScope] = useState<'all' | 'wardrobe' | 'shopping' | 'selling'>(
    ['all', 'wardrobe', 'shopping', 'selling'].includes(effectiveScope) ? effectiveScope : 'all'
  );
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active_only' | 'exclude_cancelled' | 'cancelled_passed' | 'purchased_sold'
  >('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const [matchPreset, setMatchPreset] = useState<MatchPreset>('standard');
  const [config, setConfig] = useState<MatchParametersConfig>(() =>
    getDefaultPresetConfig('standard')
  );
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // Tab filter: all | same_colour | variants | cross_collection | cancelled | ignored
  const [activeClusterTab, setActiveClusterTab] = useState<
    'all' | 'same_colour' | 'variants' | 'cross_collection' | 'cancelled' | 'ignored'
  >('all');

  // Primary selection map: clusterId -> { id, source }
  const [selectedPrimaryMap, setSelectedPrimaryMap] = useState<
    Record<string, { id: string; source: ItemSource }>
  >({});

  // Excluded item IDs per cluster (for removing single item from multi-item cluster)
  const [excludedItemIdsByCluster, setExcludedItemIdsByCluster] = useState<
    Record<string, string[]>
  >({});

  // Ignored / dismissed cluster keys set
  const [ignoredClusterKeys, setIgnoredClusterKeys] = useState<Set<string>>(() =>
    getStoredIgnoredClusters()
  );

  // Customise drawer cluster target
  const [customiseCluster, setCustomiseCluster] = useState<DuplicateCluster | null>(null);

  // Merge success notification banner
  const [lastMergedMessage, setLastMergedMessage] = useState<string | null>(null);

  // Synchronize config when preset changes
  useEffect(() => {
    if (matchPreset !== 'custom') {
      setConfig(getDefaultPresetConfig(matchPreset));
    }
  }, [matchPreset]);

  // Synchronize ignored clusters with local storage
  const handleIgnoreCluster = (clusterKey: string) => {
    setIgnoredClusterKeys((prev) => {
      const next = new Set<string>(prev);
      next.add(clusterKey);
      saveStoredIgnoredClusters(next);
      return next;
    });
  };

  const handleUnignoreCluster = (clusterKey: string) => {
    setIgnoredClusterKeys((prev) => {
      const next = new Set<string>(prev);
      next.delete(clusterKey);
      saveStoredIgnoredClusters(next);
      return next;
    });
  };

  const handleRestoreAllIgnored = () => {
    setIgnoredClusterKeys(new Set<string>());
    saveStoredIgnoredClusters(new Set<string>());
    setActiveClusterTab('all');
  };

  // Exclude single item from cluster
  const handleExcludeItem = (clusterId: string, itemId: string) => {
    setExcludedItemIdsByCluster((prev) => ({
      ...prev,
      [clusterId]: [...(prev[clusterId] || []), itemId],
    }));
  };

  // Build items refs
  const allRefs = useMemo(() => {
    return buildDuplicateItemRefs(items, shoppingList, saleItems, scope);
  }, [items, shoppingList, saleItems, scope]);

  // Compute all available tags across items
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allRefs.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [allRefs]);

  // Compute raw clusters
  const rawClusters = useMemo(() => {
    return computeDuplicateClusters(
      allRefs,
      config,
      matchPreset,
      selectedPrimaryMap,
      excludedItemIdsByCluster
    );
  }, [allRefs, config, matchPreset, selectedPrimaryMap, excludedItemIdsByCluster]);

  // Split into Active vs Ignored clusters
  const { activeClusters, ignoredClusters } = useMemo(() => {
    const active: DuplicateCluster[] = [];
    const ignored: DuplicateCluster[] = [];

    rawClusters.forEach((cl) => {
      if (ignoredClusterKeys.has(cl.key)) {
        ignored.push(cl);
      } else {
        active.push(cl);
      }
    });

    return { activeClusters: active, ignoredClusters: ignored };
  }, [rawClusters, ignoredClusterKeys]);

  // Filter clusters by search, status filter, tag filter, and active tab
  const filteredClusters = useMemo(() => {
    const sourceList = activeClusterTab === 'ignored' ? ignoredClusters : activeClusters;

    return sourceList.filter((cluster) => {
      // 1. Tab Filter
      if (activeClusterTab === 'same_colour') {
        if (cluster.colorStatus === 'variant') return false;
      } else if (activeClusterTab === 'variants') {
        if (cluster.colorStatus !== 'variant') return false;
      } else if (activeClusterTab === 'cross_collection') {
        const sources = new Set(cluster.items.map((i) => i.source));
        if (sources.size <= 1) return false;
      } else if (activeClusterTab === 'cancelled') {
        if (!cluster.hasCancelledItem) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'active_only') {
        if (cluster.items.every((i) => i.statusCategory === 'cancelled_passed' || i.statusCategory === 'archived')) {
          return false;
        }
      } else if (statusFilter === 'exclude_cancelled') {
        if (cluster.items.every((i) => i.statusCategory === 'cancelled_passed')) {
          return false;
        }
      } else if (statusFilter === 'cancelled_passed') {
        if (!cluster.hasCancelledItem) return false;
      } else if (statusFilter === 'purchased_sold') {
        if (!cluster.items.some((i) => i.statusCategory === 'completed_sold')) {
          return false;
        }
      }

      // 3. Tag Filter
      if (selectedTagFilter) {
        const hasTag = cluster.allTags.some(
          (t) => normalizeString(t) === normalizeString(selectedTagFilter)
        );
        if (!hasTag) return false;
      }

      // 4. Search Filter
      if (searchFilter.trim()) {
        const q = normalizeString(searchFilter);
        const matchTitle = normalizeString(cluster.title).includes(q);
        const matchBrand = normalizeString(cluster.brand).includes(q);
        const matchCategory = normalizeString(cluster.category).includes(q);
        const matchColors = cluster.uniqueColors.some((c) => normalizeString(c.name).includes(q));
        const matchTags = cluster.allTags.some((t) => normalizeString(t).includes(q));
        const matchStatuses = cluster.uniqueStatuses.some((st) => normalizeString(st).includes(q));

        if (!matchTitle && !matchBrand && !matchCategory && !matchColors && !matchTags && !matchStatuses) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeClusters,
    ignoredClusters,
    activeClusterTab,
    statusFilter,
    selectedTagFilter,
    searchFilter,
  ]);

  // Counts for tabs
  const sameColourCount = useMemo(
    () => activeClusters.filter((c) => c.colorStatus !== 'variant').length,
    [activeClusters]
  );
  const variantCount = useMemo(
    () => activeClusters.filter((c) => c.colorStatus === 'variant').length,
    [activeClusters]
  );
  const crossCollectionCount = useMemo(
    () => activeClusters.filter((c) => new Set(c.items.map((i) => i.source)).size > 1).length,
    [activeClusters]
  );
  const cancelledClustersCount = useMemo(
    () => activeClusters.filter((c) => c.hasCancelledItem).length,
    [activeClusters]
  );

  // Primary selection handler
  const handleSelectPrimary = (clusterId: string, id: string, source: ItemSource) => {
    setSelectedPrimaryMap((prev) => ({
      ...prev,
      [clusterId]: { id, source },
    }));
  };

  // Perform Merge Action
  const executeMerge = (cluster: DuplicateCluster, customMergedData?: any) => {
    const primaryItem =
      cluster.items.find(
        (it) => it.id === cluster.primaryId && it.source === cluster.primarySource
      ) ||
      cluster.items.find((it) => it.id === cluster.primaryId) ||
      cluster.items[0];

    let secondaries = cluster.items.filter((it) =>
      it.refKey ? it.refKey !== primaryItem.refKey : it !== primaryItem
    );

    if (secondaries.length === 0 && cluster.items.length > 1) {
      secondaries = cluster.items.filter((it) => it !== primaryItem);
      if (secondaries.length === 0) {
        secondaries = cluster.items.slice(1);
      }
    }

    const isCrossCollection = cluster.items.some((it) => it.source !== primaryItem.source);

    if (isCrossCollection) {
      mergeCrossCollectionItems(
        primaryItem.source,
        primaryItem.id,
        secondaries.map((s) => ({ collection: s.source, id: s.id })),
        customMergedData
      );
    } else {
      if (primaryItem.source === 'wardrobe') {
        mergeWardrobeItems(
          primaryItem.id,
          secondaries.map((s) => s.id),
          customMergedData
        );
      } else if (primaryItem.source === 'shopping') {
        mergeShoppingItems(
          primaryItem.id,
          secondaries.map((s) => s.id),
          customMergedData
        );
      } else if (primaryItem.source === 'selling') {
        mergeSaleItems(
          primaryItem.id,
          secondaries.map((s) => s.id),
          customMergedData
        );
      }
    }

    setLastMergedMessage(
      `Merged ${cluster.items.length} copies of "${primaryItem.brand} ${primaryItem.name}" into 1 master record.`
    );
  };

  // 1-Click Universal Auto-Merge All Duplicates (Humidor standard)
  const handleAutoMergeAll = () => {
    const res = autoMergeAllDuplicates(scope, false);
    setLastMergedMessage(res.message);
  };

  // Batch auto-merge all exact clusters
  const handleBatchAutoMerge = () => {
    const res = autoMergeAllDuplicates(scope, true);
    setLastMergedMessage(res.message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-[#FAF9F6] border border-[#E5E5E1] shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden rounded-xs">
        {/* Top Header */}
        <div className="bg-white border-b border-[#E5E5E1] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-[#8C7355] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Duplicate Item Consolidation &amp; Intelligence
                </h2>
                <span className="bg-[#8C7355]/10 text-[#8C7355] text-[11px] font-mono font-bold px-2 py-0.5 rounded-xs border border-[#8C7355]/30">
                  v2.0 Multi-Parameter &amp; Status Engine
                </span>
              </div>
              <p className="text-xs text-[#767670] mt-0.5">
                Detect, filter, distinguish status (Active vs Cancelled), and merge duplicated garments across Inventory, Purchases, and Sales.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {canUndo && (
              <button
                type="button"
                onClick={undoLastAction}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white hover:bg-[#F2F1ED] text-[#1A1A1A] border border-[#D5D5D0] rounded-xs shadow-2xs transition-colors cursor-pointer"
                title="Undo last merge operation"
              >
                <Undo2 className="w-3.5 h-3.5 text-[#8C7355]" />
                <span>Undo</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAutoMergeAll}
              disabled={activeClusters.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Automatically merge all duplicate instances across your inventory into single master records"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Auto-Merge All ({activeClusters.length})</span>
            </button>

            <button
              type="button"
              onClick={handleBatchAutoMerge}
              disabled={activeClusters.filter((c) => c.matchType === 'exact').length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-[#1A1A1A] hover:bg-black text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Automatically merge clusters where all parameters and colours are exact duplicates"
            >
              <Layers className="w-3.5 h-3.5 text-stone-300" />
              <span>Auto-Merge Exact</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-xs hover:bg-[#F2F1ED] transition-colors cursor-pointer"
              title="Close Duplicate Consolidation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Merge Notification Banner */}
        {lastMergedMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center justify-between text-xs font-mono text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{lastMergedMessage}</span>
            </div>
            <div className="flex items-center gap-3">
              {canUndo && (
                <button
                  type="button"
                  onClick={undoLastAction}
                  className="font-bold underline hover:text-emerald-950 cursor-pointer"
                >
                  Undo Action
                </button>
              )}
              <button
                type="button"
                onClick={() => setLastMergedMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Toolbar & Config Drawer */}
        <MatchingConfigToolbar
          scope={scope}
          setScope={setScope}
          matchPreset={matchPreset}
          setMatchPreset={setMatchPreset}
          config={config}
          setConfig={setConfig}
          isConfigExpanded={isConfigExpanded}
          setIsConfigExpanded={setIsConfigExpanded}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          selectedTagFilter={selectedTagFilter}
          setSelectedTagFilter={setSelectedTagFilter}
          allAvailableTags={allAvailableTags}
        />

        {/* Cluster Filter Tabs */}
        <div className="bg-white border-b border-[#E5E5E1] px-4 flex items-center justify-between shrink-0 text-xs font-mono overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveClusterTab('all')}
              className={`px-3 py-2.5 border-b-2 font-bold transition-all cursor-pointer ${
                activeClusterTab === 'all'
                  ? 'border-[#8C7355] text-[#8C7355]'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              All Active Clusters ({activeClusters.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveClusterTab('same_colour')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeClusterTab === 'same_colour'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Same Colour ({sameColourCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveClusterTab('variants')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeClusterTab === 'variants'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Palette className="w-3 h-3 text-amber-600" />
              <span>Colour Variants ({variantCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveClusterTab('cross_collection')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeClusterTab === 'cross_collection'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Layers className="w-3 h-3 text-blue-600" />
              <span>Cross-Collection ({crossCollectionCount})</span>
            </button>

            {cancelledClustersCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveClusterTab('cancelled')}
                className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeClusterTab === 'cancelled'
                    ? 'border-rose-600 text-rose-700 font-bold'
                    : 'border-transparent text-rose-600/80 hover:text-rose-700'
                }`}
              >
                <Ban className="w-3 h-3" />
                <span>With Cancelled / Passed ({cancelledClustersCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveClusterTab('ignored')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ml-2 ${
                activeClusterTab === 'ignored'
                  ? 'border-stone-800 text-stone-900 font-bold bg-stone-50'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <EyeOff className="w-3 h-3 text-stone-500" />
              <span>Ignored / Dismissed ({ignoredClusters.length})</span>
            </button>
          </div>

          {activeClusterTab === 'ignored' && ignoredClusters.length > 0 && (
            <button
              type="button"
              onClick={handleRestoreAllIgnored}
              className="flex items-center gap-1 text-xs font-mono text-[#8C7355] hover:text-[#735D43] font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore All Ignored</span>
            </button>
          )}
        </div>

        {/* Clusters List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {filteredClusters.length > 0 ? (
            filteredClusters.map((cluster) => (
              <DuplicateClusterCard
                key={cluster.id}
                cluster={cluster}
                viewMode={viewMode}
                isIgnored={activeClusterTab === 'ignored' || ignoredClusterKeys.has(cluster.key)}
                onSelectPrimary={handleSelectPrimary}
                onQuickMerge={(c) => executeMerge(c)}
                onCustomise={(c) => setCustomiseCluster(c)}
                onIgnoreCluster={handleIgnoreCluster}
                onUnignoreCluster={handleUnignoreCluster}
                onExcludeItem={handleExcludeItem}
                formatCurrency={formatCurrency}
              />
            ))
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white border border-[#E5E5E1] rounded-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#E5E5E1] flex items-center justify-center text-[#8C7355] mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                {activeClusterTab === 'ignored'
                  ? 'No Dismissed Clusters'
                  : 'No Duplicate Clusters Found for Current Criteria'}
              </h3>
              <p className="text-xs text-[#767670] font-mono max-w-md mt-1 mb-4">
                {activeClusterTab === 'ignored'
                  ? 'You have not ignored or closed any duplicate suggestions.'
                  : 'Try switching presets (e.g. "Fuzzy Title", "Model & Colourways", or "Tag & Style Clones") or clearing your search / status filter.'}
              </p>

              {activeClusterTab !== 'ignored' && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchPreset('fuzzy');
                      setStatusFilter('all');
                      setSelectedTagFilter(null);
                      setSearchFilter('');
                    }}
                    className="px-3 py-1.5 bg-[#8C7355] text-white text-xs font-mono font-bold rounded-xs cursor-pointer"
                  >
                    Try Fuzzy Strategy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchPreset('standard');
                      setStatusFilter('all');
                      setSelectedTagFilter(null);
                      setSearchFilter('');
                    }}
                    className="px-3 py-1.5 bg-white border border-[#D5D5D0] text-[#1A1A1A] text-xs font-mono rounded-xs cursor-pointer hover:bg-[#F2F1ED]"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="bg-white border-t border-[#E5E5E1] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono text-[#767670]">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-[#1A1A1A]">{filteredClusters.length}</strong> duplicate clusters
            </span>
            <span>•</span>
            <span>
              Total Scanned: <strong className="text-[#1A1A1A]">{allRefs.length}</strong> items across database
            </span>
            {ignoredClusters.length > 0 && (
              <>
                <span>•</span>
                <span className="text-stone-600">
                  {ignoredClusters.length} ignored / closed
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#767670]">
              Click <strong>"Customise Fields"</strong> on any cluster to surgically choose which colour, size, price, tags, and status to retain.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#1A1A1A] text-white hover:bg-black font-bold rounded-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Fine-Tune Parameters Drawer */}
      {customiseCluster && (
        <CustomiseMergeDrawer
          cluster={customiseCluster}
          onClose={() => setCustomiseCluster(null)}
          onConfirm={(mergedData) => {
            executeMerge(customiseCluster, mergedData);
            setCustomiseCluster(null);
          }}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};
