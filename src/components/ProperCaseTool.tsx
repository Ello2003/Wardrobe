import React, { useState, useMemo } from 'react';
import {
  Type,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Shirt,
  ShoppingBag,
  Tag,
  Check,
  Search,
  Filter,
  Eye,
  Info,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  toProperCase,
  DEFAULT_PROPER_CASE_FIELDS,
  ProperCaseFieldSelection,
  previewItemProperCase,
  ItemProperCaseDiff,
  ProperCaseOptions,
} from '../utils/textUtils';

interface ProperCaseToolProps {
  onNotify?: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const ProperCaseTool: React.FC<ProperCaseToolProps> = ({ onNotify }) => {
  const {
    items,
    shoppingList,
    saleItems,
    batchUpdateItems,
    batchUpdateShoppingItems,
    batchUpdateSaleItems,
    createSnapshot,
  } = useWardrobe();

  // Scope: which collections to scan and transform
  const [scope, setScope] = useState<'all' | 'wardrobe' | 'shopping' | 'sale'>('all');

  // Fields to convert
  const [fields, setFields] = useState<ProperCaseFieldSelection>(DEFAULT_PROPER_CASE_FIELDS);

  // Formatting options
  const [preserveAcronyms, setPreserveAcronyms] = useState<boolean>(true);
  const [useBrandDictionary, setUseBrandDictionary] = useState<boolean>(true);
  const [keepMinorWordsLower, setKeepMinorWordsLower] = useState<boolean>(false);

  // Search filter for preview
  const [previewSearch, setPreviewSearch] = useState<string>('');

  // Selected item IDs to apply changes to (default all)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Execution state
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    appliedCount: number;
    timestamp: string;
  } | null>(null);

  const options: ProperCaseOptions = useMemo(
    () => ({
      preserveAcronyms,
      useBrandDictionary,
      keepMinorWordsLower,
    }),
    [preserveAcronyms, useBrandDictionary, keepMinorWordsLower]
  );

  // Compute all potential changes across selected scope
  const diffs: ItemProperCaseDiff[] = useMemo(() => {
    const list: ItemProperCaseDiff[] = [];

    if (scope === 'all' || scope === 'wardrobe') {
      items.forEach((item) => {
        const diff = previewItemProperCase(item, 'wardrobe', fields, options);
        if (diff) list.push(diff);
      });
    }

    if (scope === 'all' || scope === 'shopping') {
      shoppingList.forEach((item) => {
        const diff = previewItemProperCase(item, 'shopping', fields, options);
        if (diff) list.push(diff);
      });
    }

    if (scope === 'all' || scope === 'sale') {
      saleItems.forEach((item) => {
        const diff = previewItemProperCase(item, 'sale', fields, options);
        if (diff) list.push(diff);
      });
    }

    return list;
  }, [items, shoppingList, saleItems, scope, fields, options]);

  // Filtered diffs based on user search
  const filteredDiffs = useMemo(() => {
    if (!previewSearch.trim()) return diffs;
    const q = previewSearch.toLowerCase();
    return diffs.filter(
      (d) =>
        d.originalName.toLowerCase().includes(q) ||
        d.changes.some(
          (c) =>
            c.before.toLowerCase().includes(q) ||
            c.after.toLowerCase().includes(q) ||
            c.field.toLowerCase().includes(q)
        )
    );
  }, [diffs, previewSearch]);

  const activeChangeCount = useMemo(() => {
    return diffs.filter((d) => !excludedIds.has(d.id)).length;
  }, [diffs, excludedIds]);

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => setExcludedIds(new Set());
  const handleDeselectAll = () => setExcludedIds(new Set(diffs.map((d) => d.id)));

  // Convert and apply changes
  const handleApplyProperCase = async () => {
    if (activeChangeCount === 0) return;

    setIsApplying(true);
    try {
      // Create backup snapshot first
      createSnapshot('Pre-Proper Case Conversion Backup');

      const wardrobeUpdates: Array<{ id: string; updates: any }> = [];
      const shoppingUpdates: Array<{ id: string; updates: any }> = [];
      const saleUpdates: Array<{ id: string; updates: any }> = [];

      diffs.forEach((diff) => {
        if (excludedIds.has(diff.id)) return;

        const updateObj: Record<string, any> = {};
        diff.changes.forEach((c) => {
          if (c.field === 'tags') {
            updateObj.tags = c.after.split(',').map((t) => t.trim());
          } else {
            updateObj[c.field] = c.after;
          }
        });

        if (diff.itemType === 'wardrobe') {
          wardrobeUpdates.push({ id: diff.id, updates: updateObj });
        } else if (diff.itemType === 'shopping') {
          shoppingUpdates.push({ id: diff.id, updates: updateObj });
        } else if (diff.itemType === 'sale') {
          saleUpdates.push({ id: diff.id, updates: updateObj });
        }
      });

      // Apply wardrobe updates
      if (wardrobeUpdates.length > 0) {
        batchUpdateItems(
          wardrobeUpdates.map((u) => u.id),
          (item) => {
            const match = wardrobeUpdates.find((u) => u.id === item.id);
            return match ? match.updates : {};
          },
          `Bulk converted ${wardrobeUpdates.length} items to Proper Case`
        );
      }

      // Apply shopping updates
      if (shoppingUpdates.length > 0) {
        batchUpdateShoppingItems(
          shoppingUpdates.map((u) => u.id),
          (item) => {
            const match = shoppingUpdates.find((u) => u.id === item.id);
            return match ? match.updates : {};
          },
          `Bulk converted ${shoppingUpdates.length} wishlist items to Proper Case`
        );
      }

      // Apply sale updates
      if (saleUpdates.length > 0) {
        batchUpdateSaleItems(
          saleUpdates.map((u) => u.id),
          (item) => {
            const match = saleUpdates.find((u) => u.id === item.id);
            return match ? match.updates : {};
          },
          `Bulk converted ${saleUpdates.length} sale items to Proper Case`
        );
      }

      const totalApplied =
        wardrobeUpdates.length + shoppingUpdates.length + saleUpdates.length;

      setLastResult({
        appliedCount: totalApplied,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      setExcludedIds(new Set());

      if (onNotify) {
        onNotify('success', `Successfully converted ${totalApplied} items to Proper Case!`);
      }
    } catch (e) {
      console.error(e);
      if (onNotify) {
        onNotify('error', 'Failed to convert items to proper case.');
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Configuration Header Card */}
      <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355]/10 text-[#8C7355] flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                Proper Case &amp; Typography Normalizer
              </h2>
              <p className="text-xs text-[#767670]">
                Standardize item names, brands, fabrics, and colors across all collections into clean, consistent Proper Case.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#767670]">Scope:</span>
            <div className="flex bg-[#F8F7F4] p-1 border border-[#E5E5E1] rounded-lg text-xs">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'wardrobe', label: 'Wardrobe' },
                { id: 'shopping', label: 'Wishlist' },
                { id: 'sale', label: 'Resale' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id as any)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    scope === s.id
                      ? 'bg-[#1A1A1A] text-white font-semibold shadow-2xs'
                      : 'text-[#767670] hover:text-[#1A1A1A]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Column 1: Field Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider font-mono">
              Target Fields to Capitalize
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'name', label: 'Item Name / Title' },
                { key: 'brand', label: 'Brand / Maker' },
                { key: 'color', label: 'Primary Color' },
                { key: 'material', label: 'Fabric / Material' },
                { key: 'subCategory', label: 'Subcategory' },
                { key: 'tags', label: 'Tags' },
              ].map(({ key, label }) => {
                const isChecked = fields[key as keyof ProperCaseFieldSelection];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setFields((prev) => ({
                        ...prev,
                        [key]: !prev[key as keyof ProperCaseFieldSelection],
                      }))
                    }
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all text-xs ${
                      isChecked
                        ? 'bg-[#FAF9F5] border-[#8C7355] text-[#1A1A1A] font-semibold'
                        : 'bg-white border-[#E5E5E1] text-[#767670] hover:bg-[#F8F7F4]'
                    }`}
                  >
                    <span>{label}</span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isChecked
                          ? 'bg-[#8C7355] border-[#8C7355] text-white'
                          : 'border-[#CCC] bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Advanced Casing Options */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider font-mono">
              Sartorial Casing Rules
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#E5E5E1] bg-white hover:bg-[#FAF9F5] cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={useBrandDictionary}
                  onChange={(e) => setUseBrandDictionary(e.target.checked)}
                  className="mt-0.5 rounded text-[#8C7355] focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-[#1A1A1A]">
                    Brand Dictionary Preservations
                  </span>
                  <p className="text-[11px] text-[#767670]">
                    Preserves bespoke apostrophes and compound names like Drake's, Loro Piana, Crockett &amp; Jones, and J.Press.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#E5E5E1] bg-white hover:bg-[#FAF9F5] cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={preserveAcronyms}
                  onChange={(e) => setPreserveAcronyms(e.target.checked)}
                  className="mt-0.5 rounded text-[#8C7355] focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-[#1A1A1A]">
                    Preserve Sartorial Acronyms
                  </span>
                  <p className="text-[11px] text-[#767670]">
                    Keeps UK, USA, NYC, RRL, OCBD, MTO, and FW/SS capitalized.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#E5E5E1] bg-white hover:bg-[#FAF9F5] cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={keepMinorWordsLower}
                  onChange={(e) => setKeepMinorWordsLower(e.target.checked)}
                  className="mt-0.5 rounded text-[#8C7355] focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-[#1A1A1A]">
                    Title Case Prepositions
                  </span>
                  <p className="text-[11px] text-[#767670]">
                    Keep prepositions ("in", "of", "and", "with") lowercase unless leading (e.g. "Made in Italy").
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-3 border-t border-[#E5E5E1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {diffs.length > 0 ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <strong>{diffs.length}</strong> items have non-standard casing ({activeChangeCount} selected)
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                All items in current scope match proper case standards!
              </span>
            )}

            {lastResult && (
              <span className="text-[11px] text-[#767670] font-mono">
                Last run: converted {lastResult.appliedCount} items at {lastResult.timestamp}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleApplyProperCase}
            disabled={activeChangeCount === 0 || isApplying}
            className={`px-5 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
              activeChangeCount > 0 && !isApplying
                ? 'bg-[#1A1A1A] hover:bg-[#333] text-white cursor-pointer'
                : 'bg-[#E5E5E1] text-[#A0A09A] cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isApplying
                ? 'Applying Proper Case…'
                : `Convert ${activeChangeCount} Item${activeChangeCount === 1 ? '' : 's'} to Proper Case`}
            </span>
          </button>
        </div>
      </div>

      {/* Live Preview Table */}
      {diffs.length > 0 && (
        <div className="bg-white border border-[#E5E5E1] rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 bg-[#FAF9F5] border-b border-[#E5E5E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#8C7355]" />
              <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                Pending Proper Case Transformations Preview
              </h3>
              <span className="text-[10px] font-mono bg-white border border-[#E5E5E1] px-2 py-0.5 rounded text-[#767670]">
                {filteredDiffs.length} shown
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#767670]" />
                <input
                  type="text"
                  placeholder="Filter preview items…"
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-[#E5E5E1] rounded-md text-xs bg-white focus:outline-none focus:border-[#8C7355]"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-[11px] font-medium border border-[#E5E5E1] rounded hover:bg-[#F2F1ED] text-[#1A1A1A] cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2 py-1 text-[11px] font-medium border border-[#E5E5E1] rounded hover:bg-[#F2F1ED] text-[#767670] cursor-pointer"
                >
                  Deselect
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#E5E5E1] max-h-96 overflow-y-auto">
            {filteredDiffs.map((diff) => {
              const isExcluded = excludedIds.has(diff.id);

              return (
                <div
                  key={diff.id}
                  className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    isExcluded ? 'bg-[#FAFAFA] opacity-60' : 'hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggleExclude(diff.id)}
                      className="rounded text-[#8C7355] focus:ring-0 cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#1A1A1A]">
                          {diff.originalName}
                        </span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#E5E5E1] bg-[#FAF9F5] text-[#767670]">
                          {diff.itemType}
                        </span>
                      </div>

                      {/* Before / After Fields */}
                      <div className="mt-1.5 space-y-1">
                        {diff.changes.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-[11px] font-mono flex-wrap"
                          >
                            <span className="text-[#8C7355] font-semibold text-[10px] uppercase w-20 shrink-0">
                              {c.field}:
                            </span>
                            <span className="line-through text-rose-600 bg-rose-50 px-1 rounded">
                              {c.before}
                            </span>
                            <ArrowRight className="w-3 h-3 text-[#A0A09A] shrink-0" />
                            <span className="text-emerald-800 bg-emerald-50 px-1 rounded font-bold">
                              {c.after}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExclude(diff.id)}
                    className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] underline cursor-pointer shrink-0"
                  >
                    {isExcluded ? 'Include' : 'Skip'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
