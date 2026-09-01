import React, { useState, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';
import { LookbookOutfit, WardrobeItem, Season } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';

interface OutfitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOutfit?: LookbookOutfit | null;
}

export const OutfitFormModal: React.FC<OutfitFormModalProps> = ({
  isOpen,
  onClose,
  initialOutfit,
}) => {
  const { items, addOutfit, updateOutfit } = useWardrobe();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occasion, setOccasion] = useState<LookbookOutfit['occasion']>('Work & Office');
  const [season, setSeason] = useState<Season>('Autumn');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const occasions = [
    'Work & Office',
    'Weekend Casual',
    'Evening & Dining',
    'Formal & Events',
    'Travel Capsule',
    'Date Night',
    'Seasonal Transition',
  ];

  const seasons = ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'];

  useEffect(() => {
    if (initialOutfit) {
      setTitle(initialOutfit.title || '');
      setDescription(initialOutfit.description || '');
      setOccasion(initialOutfit.occasion || 'Weekend Casual');
      setSeason(initialOutfit.season || 'Autumn');
      setSelectedItemIds(Array.isArray(initialOutfit.itemIds) ? initialOutfit.itemIds : []);
      setTagsInput(Array.isArray(initialOutfit.tags) ? initialOutfit.tags.join(', ') : '');
      setImageUrl(initialOutfit.imageUrl || '');
    } else {
      setTitle('');
      setDescription('');
      setOccasion('Weekend Casual');
      setSeason('Autumn');
      setSelectedItemIds([]);
      setTagsInput('Casual, Autumn Formula');
      setImageUrl('');
    }
  }, [initialOutfit, isOpen]);

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];

  const toggleItemSelection = (id: string) => {
    if ((selectedItemIds || []).includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((item) => item !== id));
    } else {
      setSelectedItemIds([...(selectedItemIds || []), id]);
    }
  };

  const selectedItems = (selectedItemIds || [])
    .map((id) => safeItems.find((i) => i.id === id))
    .filter(Boolean) as WardrobeItem[];

  const totalCalculatedValuation = selectedItems.reduce(
    (acc, item) => acc + (Number(item?.purchasePrice) || 0),
    0
  );

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedItemIds.length === 0) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (initialOutfit) {
      updateOutfit(initialOutfit.id, {
        title,
        description,
        occasion,
        season,
        itemIds: selectedItemIds,
        tags,
        imageUrl: imageUrl || undefined,
      });
    } else {
      addOutfit({
        title,
        description,
        occasion,
        season,
        itemIds: selectedItemIds,
        tags,
        imageUrl: imageUrl || undefined,
        isFavorite: false,
      });
    }

    onClose();
  };

  const filteredWardrobeItems = items.filter((i) => {
    if (!itemSearch.trim()) return true;
    const q = itemSearch.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.brand.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
              {initialOutfit ? 'Edit Lookbook Outfit' : 'Style New Outfit Formula'}
            </h2>
            <p className="text-xs text-[#767670]">
              Select pieces from your wardrobe to assemble and save an outfit look.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F8F7F4] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Look Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Modern British Weekend Formula"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value as LookbookOutfit['occasion'])}
                  className="w-full px-2 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                >
                  {occasions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value as Season)}
                  className="w-full px-2 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
              Styling Notes / Formula Rationale
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Layer the heavy knit under the waxed jacket for effortless country casual balance."
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          {/* Selected Pieces Strip */}
          <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#1A1A1A] uppercase tracking-wider font-semibold">
                Selected Pieces in this Look ({selectedItems.length})
              </span>
              <span className="text-xs font-mono font-bold text-[#8C7355]">
                Total Look Value: {formatGbp(totalCalculatedValuation)}
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-xs text-[#767670] italic">
                Click on the items below to add them to this outfit formula.
              </p>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className="flex items-center gap-1.5 p-1 pr-2 rounded-md bg-white border border-[#8C7355] cursor-pointer hover:border-rose-500 flex-shrink-0 transition-all group shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded overflow-hidden bg-[#F8F7F4] border border-[#E5E5E1] shrink-0">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full object-contain p-0.5"
                        containerClassName="w-full h-full bg-[#F8F7F4] flex items-center justify-center"
                        showPlaceholderLabel={false}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-[#1A1A1A] truncate max-w-[100px]">
                        {item.name}
                      </div>
                      <div className="text-[9px] text-[#767670] font-mono">
                        {formatGbp(item.purchasePrice)}
                      </div>
                    </div>
                    <X className="w-3 h-3 text-[#767670] group-hover:text-rose-600 ml-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Closet Picker Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">
                Choose from Wardrobe Inventory:
              </label>
              <div className="relative w-44">
                <Search className="w-3 h-3 absolute left-2 top-2 text-[#767670]" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Filter pieces..."
                  className="w-full pl-6 pr-2 py-0.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-0.5">
              {filteredWardrobeItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`p-1.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-[#8C7355] text-[#1A1A1A] ring-1 ring-[#8C7355]/40 shadow-2xs'
                        : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]/40 text-[#5A5A55]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-[#F8F7F4] border border-[#E5E5E1] flex-shrink-0">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full object-contain p-0.5"
                        containerClassName="w-full h-full bg-[#F8F7F4] flex items-center justify-center"
                        showPlaceholderLabel={false}
                      />
                    </div>
                    <div className="truncate flex-1">
                      <div className="text-[11px] font-semibold text-[#1A1A1A] truncate">{item.name}</div>
                      <div className="text-[9px] text-[#767670] font-mono">
                        {item.brand} • {formatGbp(item.purchasePrice)}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#8C7355] flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedItemIds.length === 0}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {initialOutfit ? 'Save Outfit Changes' : 'Save Look to Lookbook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

