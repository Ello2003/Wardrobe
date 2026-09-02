import React from 'react';
import {
  Palette,
  Ruler,
  Scissors,
  Sliders,
  Layers,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  Ban,
  Archive,
  X,
} from 'lucide-react';
import { DuplicateCluster, DuplicateItemRef, ItemSource } from './duplicateMergeTypes';
import { getColorSwatchHex } from './duplicateUtils';
import { StatusBadge, SourceBadge } from './StatusBadge';
import { GarmentImage } from '../GarmentImage';

interface DuplicateClusterCardProps {
  cluster: DuplicateCluster;
  viewMode: 'cards' | 'matrix';
  isIgnored: boolean;
  onSelectPrimary: (clusterId: string, id: string, source: ItemSource) => void;
  onQuickMerge: (cluster: DuplicateCluster) => void;
  onCustomise: (cluster: DuplicateCluster) => void;
  onIgnoreCluster: (clusterKey: string) => void;
  onUnignoreCluster: (clusterKey: string) => void;
  onExcludeItem: (clusterId: string, itemId: string) => void;
  formatCurrency: (amount: number) => string;
}

export const DuplicateClusterCard: React.FC<DuplicateClusterCardProps> = ({
  cluster,
  viewMode,
  isIgnored,
  onSelectPrimary,
  onQuickMerge,
  onCustomise,
  onIgnoreCluster,
  onUnignoreCluster,
  onExcludeItem,
  formatCurrency,
}) => {
  const primaryItem =
    cluster.items.find(
      (it) => it.id === cluster.primaryId && it.source === cluster.primarySource
    ) ||
    cluster.items.find((it) => it.id === cluster.primaryId) ||
    cluster.items[0];

  return (
    <div
      className={`border p-4 shadow-xs rounded-sm transition-all ${
        isIgnored
          ? 'bg-stone-50 border-stone-300 opacity-80'
          : 'bg-white border-[#E5E5E1] hover:border-[#D5D5D0]'
      }`}
    >
      {/* Cluster Header with Multi-Parameter Insights */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 border-b border-[#E5E5E1] gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Match Strategy Badge */}
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs ${
                cluster.matchType === 'exact'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : cluster.matchType === 'color_match'
                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                  : cluster.matchType === 'variant'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : cluster.matchType === 'tag_match'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              {cluster.matchType === 'exact'
                ? 'Exact Match'
                : cluster.matchType === 'color_match'
                ? 'Colour Family Match'
                : cluster.matchType === 'variant'
                ? 'Colourway Variant'
                : cluster.matchType === 'tag_match'
                ? 'Shared Tag Clone'
                : 'Fuzzy Match'}
            </span>

            {/* Status Discrepancy Alert */}
            {cluster.hasStatusMismatch && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Mixed Statuses ({cluster.uniqueStatuses.join(' vs ')})
              </span>
            )}

            {/* Cancelled Item Warning */}
            {cluster.hasCancelledItem && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded-xs border border-rose-200">
                <Ban className="w-2.5 h-2.5" /> Includes Cancelled/Passed
              </span>
            )}

            {/* Archived Item Warning */}
            {cluster.hasArchivedItem && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded-xs border border-stone-300">
                <Archive className="w-2.5 h-2.5" /> Includes Archived
              </span>
            )}

            {/* Colour Indicator Badge */}
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-[#FAF9F6] border border-[#E5E5E1] px-2 py-0.5 rounded-xs">
              <Palette className="w-3 h-3 text-[#8C7355]" />
              <span className="text-[#767670]">Colours:</span>
              <div className="flex items-center gap-1.5">
                {cluster.uniqueColors.map((c) => (
                  <span key={c.name} className="flex items-center gap-1 font-bold text-[#1A1A1A]">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.hex }}
                      title={`${c.name} (${c.count})`}
                    />
                    <span>{c.name}</span>
                    {c.count > 1 && <span className="text-[9px] text-[#767670]">({c.count})</span>}
                  </span>
                ))}
              </div>

              {cluster.hasColorMismatch && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded-xs border border-amber-200 ml-1">
                  ⚠️ Multiple Colours
                </span>
              )}
            </div>

            {/* Sizes Pill */}
            {cluster.uniqueSizes.length > 0 && (
              <div className="inline-flex items-center gap-1 text-[11px] font-mono bg-[#FAF9F6] border border-[#E5E5E1] px-2 py-0.5 rounded-xs text-[#5A5A55]">
                <Ruler className="w-3 h-3 text-[#8C7355]" />
                <span>Sizes: {cluster.uniqueSizes.join(', ')}</span>
              </div>
            )}

            {/* Materials Pill */}
            {cluster.uniqueMaterials.length > 0 && (
              <div className="inline-flex items-center gap-1 text-[11px] font-mono bg-[#FAF9F6] border border-[#E5E5E1] px-2 py-0.5 rounded-xs text-[#5A5A55]">
                <Scissors className="w-3 h-3 text-[#8C7355]" />
                <span className="truncate max-w-[160px]">{cluster.uniqueMaterials.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-serif font-bold text-[#1A1A1A]">
              {cluster.brand} — {cluster.title}
            </h4>
            <span className="text-xs font-mono text-[#767670]">
              ({cluster.items.length} copies • {cluster.category})
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Ignore / Dismiss Cluster */}
          {isIgnored ? (
            <button
              type="button"
              onClick={() => onUnignoreCluster(cluster.key)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-stone-700 hover:text-[#1A1A1A] bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-sm transition-colors cursor-pointer"
              title="Restore this cluster to active duplicate list"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Cluster</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onIgnoreCluster(cluster.key)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-[#767670] hover:text-stone-900 bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] rounded-sm transition-colors cursor-pointer"
              title="Ignore / Dismiss this duplicate suggestion"
            >
              <EyeOff className="w-3.5 h-3.5 text-[#767670]" />
              <span>Ignore</span>
            </button>
          )}

          {!isIgnored && (
            <>
              <button
                type="button"
                onClick={() => onCustomise(cluster)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium border border-[#D5D5D0] bg-white text-[#1A1A1A] hover:bg-[#F2F1ED] rounded-sm transition-colors cursor-pointer shadow-2xs"
                title="Fine-tune which colour, status, size, price, photo, and notes to retain"
              >
                <Sliders className="w-3 h-3 text-[#8C7355]" />
                <span>Customise Fields</span>
              </button>

              <button
                type="button"
                onClick={() => onQuickMerge(cluster)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-sm shadow-xs transition-colors cursor-pointer"
                title="Merge all duplicate copies into the selected master record"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Quick Merge</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode 1: Side-by-Side Cards Grid */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
          {cluster.items.map((item, idx) => {
            const isPrimary = item.refKey
              ? item.refKey === primaryItem.refKey
              : item.id === primaryItem.id && item.source === primaryItem.source;
            const itemSwatch = item.colorHex || getColorSwatchHex(item.color || '');

            return (
              <div
                key={item.refKey || `${item.source}-${item.id}-${idx}`}
                onClick={() => onSelectPrimary(cluster.id, item.id, item.source)}
                className={`border p-3.5 rounded-sm relative flex flex-col justify-between cursor-pointer transition-all ${
                  isPrimary
                    ? 'bg-amber-50/40 border-[#8C7355] ring-1 ring-[#8C7355]'
                    : 'bg-[#FAF9F6] border-[#E5E5E1] hover:border-[#CCCCCC]'
                }`}
              >
                {/* Top Badge & Radio */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={item.source} />
                    <StatusBadge
                      status={item.status}
                      statusCategory={item.statusCategory}
                      source={item.source}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Exclude single item if multi-item */}
                    {cluster.items.length > 2 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExcludeItem(cluster.id, item.id);
                        }}
                        className="p-0.5 text-[#767670] hover:text-rose-600 rounded-xs hover:bg-rose-50 cursor-pointer"
                        title="Remove only this item from the cluster"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    <label
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="radio"
                        name={`primary-${cluster.id}`}
                        checked={isPrimary}
                        onChange={() => onSelectPrimary(cluster.id, item.id, item.source)}
                        className="accent-[#8C7355] cursor-pointer"
                      />
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isPrimary ? 'text-[#8C7355]' : 'text-[#767670]'
                        }`}
                      >
                        {isPrimary ? 'Master Record' : 'Secondary'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Item Photo & Core Details */}
                <div className="flex items-start gap-3 my-1">
                  <div className="w-16 h-18 bg-white border border-[#E5E5E1] rounded-xs overflow-hidden shrink-0 relative group">
                    <GarmentImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono font-bold text-[#8C7355] truncate">
                      {item.brand}
                    </div>
                    <div className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1">
                      {item.name}
                    </div>

                    <div className="text-xs font-mono text-[#1A1A1A] font-bold mt-1 flex items-center justify-between">
                      <span>{formatCurrency(item.price)}</span>
                      {item.condition && (
                        <span className="text-[10px] font-normal text-[#767670]">
                          {item.condition}
                        </span>
                      )}
                    </div>

                    {/* Colour Parameter Row */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono mt-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: itemSwatch }}
                      />
                      <span className="text-[#1A1A1A] font-semibold truncate">
                        {item.color || 'Colour Unspecified'}
                      </span>
                    </div>

                    {/* Size & Material Specs */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-[#767670] mt-1">
                      {item.size && <span>Size: <strong className="text-[#4A4A45]">{item.size}</strong></span>}
                      {item.material && <span className="truncate max-w-[140px]">• {item.material}</span>}
                      {item.wearCount !== undefined && <span>• {item.wearCount} wears</span>}
                    </div>
                  </div>
                </div>

                {/* Tags Preview */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#E5E5E1]/60">
                    {item.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono bg-white border border-[#E5E5E1] px-1 py-0.2 rounded-xs text-[#5A5A55]"
                      >
                        #{t}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-[9px] font-mono text-[#767670]">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Notes / Reason */}
                {item.notes && (
                  <div className="text-[10px] text-[#767670] italic truncate mt-1">
                    "{item.notes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode 2: Parameter Comparison Matrix Table */
        <div className="overflow-x-auto pt-3">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[#E5E5E1]">
            <thead>
              <tr className="bg-[#F8F7F4] border-b border-[#E5E5E1] text-[#767670] text-[10px] uppercase">
                <th className="p-2 border-r border-[#E5E5E1] w-28">Parameter</th>
                {cluster.items.map((item, idx) => {
                  const isPrimary = item.refKey
                    ? item.refKey === primaryItem.refKey
                    : item.id === primaryItem.id && item.source === primaryItem.source;
                  return (
                    <th
                      key={item.refKey || `${item.source}-${item.id}-${idx}`}
                      className={`p-2 border-r border-[#E5E5E1] min-w-[200px] ${
                        isPrimary ? 'bg-amber-50/80 text-[#8C7355] font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Copy #{idx + 1} ({item.source})</span>
                        <input
                          type="radio"
                          name={`matrix-primary-${cluster.id}`}
                          checked={isPrimary}
                          onChange={() => onSelectPrimary(cluster.id, item.id, item.source)}
                          className="accent-[#8C7355]"
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E1]">
              {/* Photo */}
              <tr>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">Photo</td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1]">
                    <div className="w-12 h-14 bg-white border border-[#E5E5E1] rounded-xs overflow-hidden">
                      <GarmentImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Status */}
              <tr className={cluster.hasStatusMismatch ? 'bg-amber-50/30' : ''}>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">
                  Status {cluster.hasStatusMismatch && <span className="text-amber-700">⚠️</span>}
                </td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1]">
                    <StatusBadge
                      status={item.status}
                      statusCategory={item.statusCategory}
                      source={item.source}
                    />
                  </td>
                ))}
              </tr>

              {/* Name */}
              <tr>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">Name / Title</td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1] font-serif font-bold text-[#1A1A1A]">
                    {item.name}
                  </td>
                ))}
              </tr>

              {/* Colour */}
              <tr className={cluster.hasColorMismatch ? 'bg-amber-50/40' : ''}>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">
                  Colour {cluster.hasColorMismatch && <span className="text-amber-700">⚠️</span>}
                </td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: item.colorHex || getColorSwatchHex(item.color || '') }}
                      />
                      <span>{item.color || 'Unspecified'}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Size */}
              <tr className={cluster.hasSizeMismatch ? 'bg-amber-50/40' : ''}>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">
                  Size {cluster.hasSizeMismatch && <span className="text-amber-700">⚠️</span>}
                </td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1]">
                    {item.size || '—'}
                  </td>
                ))}
              </tr>

              {/* Material */}
              <tr className={cluster.hasMaterialMismatch ? 'bg-amber-50/40' : ''}>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">
                  Material {cluster.hasMaterialMismatch && <span className="text-amber-700">⚠️</span>}
                </td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1]">
                    {item.material || '—'}
                  </td>
                ))}
              </tr>

              {/* Price */}
              <tr>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">Price / Valuation</td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1] font-bold">
                    {formatCurrency(item.price)}
                  </td>
                ))}
              </tr>

              {/* Wear Count */}
              <tr>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">Wear Count</td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1]">
                    {item.wearCount !== undefined ? `${item.wearCount} wears` : '—'}
                  </td>
                ))}
              </tr>

              {/* Notes */}
              <tr>
                <td className="p-2 bg-[#F8F7F4] font-bold text-[#5A5A55] border-r border-[#E5E5E1]">Notes / Reason</td>
                {cluster.items.map((item, idx) => (
                  <td key={item.refKey || `${item.source}-${item.id}-${idx}`} className="p-2 border-r border-[#E5E5E1] text-[11px] text-[#767670] italic">
                    {item.notes || '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
