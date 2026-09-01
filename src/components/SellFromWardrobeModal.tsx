import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Tag,
  Search,
  Check,
  PoundSterling,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shirt,
} from 'lucide-react';
import { WardrobeItem, SellingPlatform, Condition } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';

interface SellFromWardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWardrobeItem?: WardrobeItem | null;
}

export const SellFromWardrobeModal: React.FC<SellFromWardrobeModalProps> = ({
  isOpen,
  onClose,
  initialWardrobeItem,
}) => {
  const { items, saleItems, listWardrobeItemForSale } = useWardrobe();

  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [listingPrice, setListingPrice] = useState('');
  const [platform, setPlatform] = useState<SellingPlatform>('Vinted');
  const [condition, setCondition] = useState<Condition>('Excellent');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Already listed item IDs
  const listedWardrobeIds = useMemo(() => {
    return new Set(
      saleItems
        .filter((s) => s.status !== 'Completed' && s.status !== 'Delisted')
        .map((s) => s.sourceWardrobeItemId)
        .filter(Boolean)
    );
  }, [saleItems]);

  // Set initial selected item when opened
  React.useEffect(() => {
    if (initialWardrobeItem) {
      handleSelectItem(initialWardrobeItem);
    } else if (items.length > 0 && !selectedItem) {
      const firstAvailable = items.find((i) => !i.isArchived && !listedWardrobeIds.has(i.id)) || items[0];
      handleSelectItem(firstAvailable);
    }
  }, [initialWardrobeItem, isOpen]);

  const handleSelectItem = (item: WardrobeItem) => {
    setSelectedItem(item);
    setCondition(item.condition);

    // Calculate smart recommended listing price
    const original = item.purchasePrice || 100;
    let multiplier = 0.6;
    if (item.condition === 'Pristine / New') multiplier = 0.75;
    else if (item.condition === 'Excellent') multiplier = 0.6;
    else if (item.condition === 'Good') multiplier = 0.45;
    else multiplier = 0.3;

    // Additional discount for high wear count
    if (item.wearCount > 30) multiplier *= 0.85;

    const recommended = Math.round(original * multiplier);
    setListingPrice(recommended.toString());

    // Generate starter description
    const desc = `Authentic ${item.brand} ${item.name} in ${item.color || 'classic tone'}. Size: ${
      item.size || 'Unspecified'
    }. Material: ${item.material || 'Premium fabric'}. Condition: ${
      item.condition
    }. Worn ${item.wearCount || 0} times. Carefully cared for and ready to ship.`;
    setDescription(desc);
    setNotes(`Listed from closet inventory on ${new Date().toLocaleDateString('en-GB')}.`);
  };

  const filteredWardrobe = useMemo(() => {
    return items.filter((item) => {
      if (item.isArchived) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, search, categoryFilter]);

  if (!isOpen) return null;

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const priceNum = parseFloat(listingPrice) || 0;
    if (priceNum <= 0) return;

    listWardrobeItemForSale(selectedItem, {
      listingPrice: priceNum,
      platform,
      condition,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: [...(selectedItem.tags || []), 'Wardrobe Resale', platform],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#F8F7F4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#8C7355] text-white flex items-center justify-center font-bold">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Sell Piece from Wardrobe
              </h2>
              <p className="text-[11px] text-[#767670]">
                Convert an existing closet garment into an active resale listing with smart pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content: 2-column layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E1]">
          {/* Left Column: Select Wardrobe Piece (5 cols) */}
          <div className="md:col-span-5 p-4 flex flex-col h-full bg-[#FAF9F6]">
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A5A55]">
                  1. Choose Wardrobe Item
                </span>
                <span className="text-[11px] font-mono text-[#767670]">
                  {filteredWardrobe.length} pieces
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#767670]" />
                <input
                  type="text"
                  placeholder="Filter garments by name or brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            {/* List of Garments */}
            <div className="flex-1 overflow-y-auto max-h-[380px] md:max-h-[460px] space-y-1.5 pr-1">
              {filteredWardrobe.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isAlreadyListed = listedWardrobeIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-white border-[#8C7355] shadow-xs ring-1 ring-[#8C7355]'
                        : 'bg-white/80 border-[#E5E5E1] hover:border-[#B5B5AF] hover:bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-[#E5E5E1]">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full object-contain p-0.5"
                        containerClassName="w-full h-full bg-[#F8F7F4] flex items-center justify-center"
                        showPlaceholderLabel={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#8C7355] font-semibold truncate">
                          {item.brand}
                        </span>
                        {isAlreadyListed && (
                          <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1 rounded">
                            Listed
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-medium text-[#1A1A1A] truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[#767670] mt-0.5">
                        <span>Paid: {formatGbp(item.purchasePrice)}</span>
                        <span>•</span>
                        <span>Worn: {item.wearCount}×</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Listing Details & Pricing (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between bg-white">
            {selectedItem ? (
              <form onSubmit={handleCreateListing} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1]">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A5A55]">
                      2. Configure Resale Listing
                    </span>
                    <h3 className="text-sm font-serif font-bold text-[#1A1A1A] mt-0.5">
                      {selectedItem.brand} — {selectedItem.name}
                    </h3>
                  </div>
                  <span className="text-xs font-mono bg-[#F8F7F4] border border-[#E5E5E1] px-2 py-1 rounded text-[#5A5A55]">
                    Original Cost: {formatGbp(selectedItem.purchasePrice)}
                  </span>
                </div>

                {/* Price & Platform */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                      Listing Price (£ GBP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                        £
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        required
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                        placeholder="e.g. 85"
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono font-bold text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-[#767670]">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>
                        Recommended: ~{formatGbp(Math.round(selectedItem.purchasePrice * 0.6))} (based on condition &amp; {selectedItem.wearCount} wears)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                      Target Selling Platform *
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as SellingPlatform)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      <option value="Vinted">Vinted (0% Seller Fees)</option>
                      <option value="eBay">eBay UK (High Reach)</option>
                      <option value="Vestiaire Collective">Vestiaire Collective (Luxury)</option>
                      <option value="Depop">Depop (Vintage &amp; Streetwear)</option>
                      <option value="Grailed">Grailed (Menswear &amp; Designer)</option>
                      <option value="Direct / Private">Direct / Private Sale</option>
                      <option value="Other">Other Marketplace</option>
                    </select>
                  </div>
                </div>

                {/* Condition & Size preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                      Condition
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      <option value="Pristine / New">Pristine / New (Unworn or BNWT)</option>
                      <option value="Excellent">Excellent (Minor or no wear)</option>
                      <option value="Good">Good (Light regular wear)</option>
                      <option value="Fair">Fair (Noticeable wear)</option>
                      <option value="Needs Repair">Needs Repair / Alteration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                      Size &amp; Fit
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedItem.size || 'One Size / Free Size'}
                      className="w-full px-2.5 py-1.5 bg-[#F8F7F4] border border-[#E5E5E1] rounded-md text-xs text-[#767670]"
                    />
                  </div>
                </div>

                {/* Listing Description */}
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Listing Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide item specs, condition disclosure, measurements, and selling points..."
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none resize-none"
                  />
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Seller Notes / Storage Location
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Stored in spare room wardrobe hanger #4, ready to ship"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
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
                    className="px-4 py-1.5 text-xs font-semibold bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    Publish Sale Listing
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 text-center text-xs text-[#767670]">
                Select a wardrobe item on the left to configure listing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
