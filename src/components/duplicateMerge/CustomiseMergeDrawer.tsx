import React, { useState } from 'react';
import {
  X,
  Sliders,
  Palette,
  Ruler,
  Scissors,
  DollarSign,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Tag,
  Activity,
} from 'lucide-react';
import { DuplicateCluster, CustomMergeDraft } from './duplicateMergeTypes';
import { getColorSwatchHex } from './duplicateUtils';
import { GarmentImage } from '../GarmentImage';

interface CustomiseMergeDrawerProps {
  cluster: DuplicateCluster;
  onClose: () => void;
  onConfirm: (mergedData: any) => void;
  formatCurrency: (amount: number) => string;
}

export const CustomiseMergeDrawer: React.FC<CustomiseMergeDrawerProps> = ({
  cluster,
  onClose,
  onConfirm,
  formatCurrency,
}) => {
  const primary = cluster.items.find((it) => it.id === cluster.primaryId) || cluster.items[0];
  const allNotes = cluster.items.map((i) => i.notes).filter(Boolean).join(' | ');

  const [draft, setDraft] = useState<CustomMergeDraft>({
    name: primary.name,
    brand: primary.brand,
    color: primary.color || cluster.uniqueColors[0]?.name || 'Unspecified',
    colorHex: primary.colorHex || cluster.uniqueColors[0]?.hex,
    size: primary.size || cluster.uniqueSizes[0] || '',
    material: primary.material || cluster.uniqueMaterials[0] || '',
    category: primary.category,
    subcategory: primary.subcategory || '',
    condition: primary.condition || 'Excellent',
    price: cluster.maxPrice,
    wearCount: cluster.totalWears,
    imageUrl: primary.imageUrl,
    tags: [...cluster.allTags],
    notes: allNotes || primary.notes || '',
    storageLocation: primary.storageLocation || '',
    status: primary.status || 'Active Closet',
  });

  const availableStatuses = Array.from(
    new Set([
      'Active Closet',
      'Wishlist (To Buy)',
      'Wishlist (Purchased)',
      'Wishlist (Cancelled)',
      'Wishlist (Passed)',
      'Resale (Listed)',
      'Resale (Sold)',
      'Archived',
      ...cluster.uniqueStatuses,
    ])
  );

  const toggleTag = (tag: string) => {
    setDraft((prev) => {
      const hasTag = prev.tags.includes(tag);
      return {
        ...prev,
        tags: hasTag ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
      };
    });
  };

  const handleApply = () => {
    const isArchived = draft.status.toLowerCase().includes('archive');
    onConfirm({
      name: draft.name,
      brand: draft.brand,
      color: draft.color,
      colorHex: draft.colorHex,
      size: draft.size,
      material: draft.material,
      category: draft.category,
      subcategory: draft.subcategory,
      condition: draft.condition,
      purchasePrice: draft.price,
      currentValuation: draft.price,
      wearCount: draft.wearCount,
      imageUrl: draft.imageUrl,
      tags: draft.tags,
      notes: draft.notes,
      storageLocation: draft.storageLocation,
      isArchived,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E5E5E1] shadow-2xl max-w-3xl w-full my-6 flex flex-col max-h-[90vh] overflow-hidden rounded-xs animate-fadeIn">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] bg-[#FAF9F6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#8C7355] text-white rounded-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                Fine-Tune Merged Parameters
              </h3>
              <p className="text-xs text-[#767670]">
                Select which exact colour, status, size, material, valuation, tags, and photo to preserve in the final master record.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
          {/* 1. Item Name / Model Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1A1A1A] block">1. Item Name / Model Title</label>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(cluster.items.map((i) => i.name))).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, name: n }))}
                  className={`px-3 py-1.5 border rounded-xs transition-all cursor-pointer text-left ${
                    draft.name === n
                      ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                      : 'bg-[#FAF9F6] text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] text-xs font-serif text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-[#8C7355] mt-1"
              placeholder="Or enter custom item name..."
            />
          </div>

          {/* 2. Target Status Assignment */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
            <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#8C7355]" />
              2. Target Master Status (Resolve Active vs Cancelled vs Wishlist)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableStatuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, status: st }))}
                  className={`px-2.5 py-1 border rounded-xs transition-all cursor-pointer ${
                    draft.status === st
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold'
                      : 'bg-[#FAF9F6] text-[#4A4A45] border-[#D5D5D0] hover:border-[#1A1A1A]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Colour Selection */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
            <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#8C7355]" />
              3. Master Colour / Hue
            </label>
            <div className="flex flex-wrap gap-2">
              {cluster.uniqueColors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, color: c.name, colorHex: c.hex }))
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-xs transition-all cursor-pointer ${
                    draft.color === c.name
                      ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                      : 'bg-[#FAF9F6] text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={draft.color}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((d) => ({ ...d, color: val, colorHex: getColorSwatchHex(val) }));
                }}
                className="flex-1 px-3 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-[#8C7355]"
                placeholder="Specify custom colour (e.g. Sage Green, Oatmeal, Navy Blue)..."
              />
              <div
                className="w-8 h-8 rounded-xs border border-[#D5D5D0] shrink-0"
                style={{ backgroundColor: draft.colorHex || getColorSwatchHex(draft.color) }}
                title="Live Colour Swatch Preview"
              />
            </div>
          </div>

          {/* 4. Size & Material Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E5E1]">
            {/* Size */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#8C7355]" />
                4. Master Size
              </label>
              <div className="flex flex-wrap gap-1.5">
                {cluster.uniqueSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, size: s }))}
                    className={`px-2.5 py-1 border rounded-xs text-xs font-mono transition-all cursor-pointer ${
                      draft.size === s
                        ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                        : 'bg-[#FAF9F6] text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={draft.size}
                onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))}
                className="w-full px-2.5 py-1 bg-[#FAF9F6] border border-[#D5D5D0] text-xs focus:bg-white focus:outline-none focus:border-[#8C7355]"
                placeholder="Enter size..."
              />
            </div>

            {/* Material */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#8C7355]" />
                5. Master Material
              </label>
              <div className="flex flex-wrap gap-1.5">
                {cluster.uniqueMaterials.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, material: m }))}
                    className={`px-2.5 py-1 border rounded-xs text-xs font-mono transition-all cursor-pointer truncate max-w-[200px] ${
                      draft.material === m
                        ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                        : 'bg-[#FAF9F6] text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={draft.material}
                onChange={(e) => setDraft((d) => ({ ...d, material: e.target.value }))}
                className="w-full px-2.5 py-1 bg-[#FAF9F6] border border-[#D5D5D0] text-xs focus:bg-white focus:outline-none focus:border-[#8C7355]"
                placeholder="Enter fabric composition (e.g. 100% Cashmere)..."
              />
            </div>
          </div>

          {/* 5. Valuation & Wear History */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E5E1]">
            {/* Price */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#8C7355]" />
                6. Valuation / Cost Basis
              </label>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, price: cluster.maxPrice }))}
                  className={`px-2.5 py-1 border rounded-xs transition-all cursor-pointer ${
                    draft.price === cluster.maxPrice
                      ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                      : 'bg-[#FAF9F6] border-[#D5D5D0]'
                  }`}
                >
                  Highest ({formatCurrency(cluster.maxPrice)})
                </button>
                {cluster.minPrice !== cluster.maxPrice && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, price: cluster.avgPrice }))}
                    className={`px-2.5 py-1 border rounded-xs transition-all cursor-pointer ${
                      draft.price === cluster.avgPrice
                        ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                        : 'bg-[#FAF9F6] border-[#D5D5D0]'
                    }`}
                  >
                    Average ({formatCurrency(cluster.avgPrice)})
                  </button>
                )}
              </div>
              <input
                type="number"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }))}
                className="w-full px-2.5 py-1 bg-[#FAF9F6] border border-[#D5D5D0] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#8C7355]"
              />
            </div>

            {/* Wear Count */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#8C7355]" />
                7. Consolidated Wear Count
              </label>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, wearCount: cluster.totalWears }))}
                  className={`px-2.5 py-1 border rounded-xs transition-all cursor-pointer ${
                    draft.wearCount === cluster.totalWears
                      ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                      : 'bg-[#FAF9F6] border-[#D5D5D0]'
                  }`}
                >
                  Sum All Wears ({cluster.totalWears})
                </button>
              </div>
              <input
                type="number"
                value={draft.wearCount}
                onChange={(e) => setDraft((d) => ({ ...d, wearCount: Number(e.target.value) || 0 }))}
                className="w-full px-2.5 py-1 bg-[#FAF9F6] border border-[#D5D5D0] text-xs font-bold focus:bg-white focus:outline-none focus:border-[#8C7355]"
              />
            </div>
          </div>

          {/* 6. Tags Consolidation */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
            <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#8C7355]" />
              8. Retained Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {cluster.allTags.map((t) => {
                const isSelected = draft.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`px-2 py-0.5 rounded-xs border text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                        : 'bg-[#FAF9F6] text-[#767670] border-[#D5D5D0] line-through opacity-60'
                    }`}
                  >
                    #{t} {isSelected && <Check className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Master Photo Selection */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
            <label className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#8C7355]" />
              9. Select Master Photo Thumbnail
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {cluster.items.map((it) => (
                <div
                  key={it.id}
                  onClick={() => setDraft((d) => ({ ...d, imageUrl: it.imageUrl }))}
                  className={`h-24 bg-white border rounded-xs overflow-hidden cursor-pointer relative transition-all ${
                    draft.imageUrl === it.imageUrl
                      ? 'ring-2 ring-[#8C7355] border-[#8C7355]'
                      : 'opacity-70 hover:opacity-100 border-[#D5D5D0]'
                  }`}
                >
                  <GarmentImage src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                  {draft.imageUrl === it.imageUrl && (
                    <div className="absolute top-1 right-1 bg-[#8C7355] text-white p-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 8. Notes */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
            <label className="font-bold text-[#1A1A1A] block">10. Consolidated Notes</label>
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className="w-full p-2 bg-[#FAF9F6] border border-[#D5D5D0] text-xs focus:bg-white focus:outline-none focus:border-[#8C7355]"
              placeholder="Notes, care instructions, origin..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E5E1] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono border border-[#D5D5D0] text-[#1A1A1A] hover:bg-white rounded-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm &amp; Apply Merged Parameters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
