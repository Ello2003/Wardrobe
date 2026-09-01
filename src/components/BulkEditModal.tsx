import React, { useState } from 'react';
import {
  X,
  Check,
  Tag,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  MapPin,
  Calendar,
  AlertCircle,
  Archive,
  Heart,
  Store,
  Truck,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  Category,
  Season,
  Condition,
  ShoppingPriority,
  ShoppingStatus,
  SellingPlatform,
  SellingStatus,
  ShippingStatus,
  WardrobeItem,
  ShoppingItem,
  SaleItem,
  LookbookOutfit,
} from '../types';

export type BulkEditTargetType = 'wardrobe' | 'shopping' | 'sales' | 'selling' | 'lookbook';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: BulkEditTargetType;
  selectedIds: string[];
  onComplete?: () => void;
}

const SEASONS_LIST: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter', 'All-Season'];
const CONDITIONS_LIST: Condition[] = [
  'Pristine / New',
  'Excellent',
  'Good',
  'Vintage / Well-Loved',
];
const SHOPPING_PRIORITIES: ShoppingPriority[] = [
  'Essential / Must-Have',
  'High',
  'Medium',
  'Low / Wishlist',
];
const SHOPPING_STATUSES: ShoppingStatus[] = [
  'Researching',
  'To Buy',
  'In Basket',
  'Purchased',
  'Sold',
  'Cancelled',
  'Passed',
];
const SELLING_PLATFORMS: SellingPlatform[] = [
  'Vinted',
  'eBay',
  'Vestiaire Collective',
  'Depop',
  'Grailed',
  'Direct / Private',
  'Other',
];
const SELLING_STATUSES: SellingStatus[] = [
  'Draft',
  'Listed',
  'Reserved',
  'Sold',
  'Shipped',
  'Completed',
  'Delisted',
];
const SHIPPING_STATUSES: ShippingStatus[] = [
  'Not Required',
  'To Pack',
  'Shipped',
  'In Transit',
  'Delivered',
];
const COURIERS = ['Evri', 'Royal Mail', 'DPD', 'InPost', 'Yodel', 'Other'] as const;

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  targetType,
  selectedIds,
  onComplete,
}) => {
  const {
    items,
    shoppingList,
    saleItems,
    outfits,
    categories,
    batchUpdateItems,
    batchUpdateShoppingItems,
    batchUpdateSaleItems,
    batchUpdateOutfits,
    settings,
    formatCurrency,
  } = useWardrobe();

  // Active Tab within modal
  const [activeSubTab, setActiveSubTab] = useState<'taxonomy' | 'attributes' | 'pricing' | 'tags'>('taxonomy');

  // Form Fields
  const [targetCategory, setTargetCategory] = useState<string>('__NO_CHANGE__');
  const [customNewCategory, setCustomNewCategory] = useState('');
  const [targetCondition, setTargetCondition] = useState<string>('__NO_CHANGE__');
  const [targetSeasons, setTargetSeasons] = useState<Season[]>([]);
  const [seasonMode, setSeasonMode] = useState<'replace' | 'add'>('replace');

  // Shopping specific
  const [targetPriority, setTargetPriority] = useState<string>('__NO_CHANGE__');
  const [targetShoppingStatus, setTargetShoppingStatus] = useState<string>('__NO_CHANGE__');
  const [targetRetailer, setTargetRetailer] = useState<string>('');

  // Resale specific
  const [targetPlatform, setTargetPlatform] = useState<string>('__NO_CHANGE__');
  const [targetSellingStatus, setTargetSellingStatus] = useState<string>('__NO_CHANGE__');
  const [targetShippingStatus, setTargetShippingStatus] = useState<string>('__NO_CHANGE__');
  const [targetCourier, setTargetCourier] = useState<string>('__NO_CHANGE__');

  // Lookbook specific
  const [targetOccasion, setTargetOccasion] = useState<string>('__NO_CHANGE__');

  // Wardrobe flags
  const [targetFavorite, setTargetFavorite] = useState<string>('__NO_CHANGE__');
  const [targetArchived, setTargetArchived] = useState<string>('__NO_CHANGE__');
  const [targetLocation, setTargetLocation] = useState<string>('');

  // Tags
  const [tagsToAddInput, setTagsToAddInput] = useState<string>('');
  const [tagsToRemoveInput, setTagsToRemoveInput] = useState<string>('');

  // Pricing Adjustments
  const [priceAdjType, setPriceAdjType] = useState<'none' | 'set_fixed' | 'percent_discount' | 'percent_increase' | 'add_fixed'>('none');
  const [priceAdjValue, setPriceAdjValue] = useState<string>('');

  if (!isOpen) return null;

  const count = selectedIds.length;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (count === 0) {
      onClose();
      return;
    }

    const effectiveCategory =
      targetCategory === '__NEW__'
        ? customNewCategory.trim()
        : targetCategory !== '__NO_CHANGE__'
        ? targetCategory
        : undefined;

    const parseTags = (str: string) =>
      str
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

    const tagsToAdd = parseTags(tagsToAddInput);
    const tagsToRemove = new Set(parseTags(tagsToRemoveInput));

    const priceValNum = parseFloat(priceAdjValue);

    if (targetType === 'wardrobe') {
      batchUpdateItems(selectedIds, (item) => {
        const patch: Partial<WardrobeItem> = {};
        if (effectiveCategory) patch.category = effectiveCategory;
        if (targetCondition !== '__NO_CHANGE__') patch.condition = targetCondition as Condition;
        if (targetSeasons.length > 0) {
          if (seasonMode === 'replace') {
            patch.season = targetSeasons;
          } else {
            patch.season = Array.from(new Set([...(item.season || []), ...targetSeasons]));
          }
        }
        if (targetFavorite !== '__NO_CHANGE__') patch.isFavorite = targetFavorite === 'yes';
        if (targetArchived !== '__NO_CHANGE__') patch.isArchived = targetArchived === 'yes';
        if (targetLocation.trim()) patch.storageLocation = targetLocation.trim();

        // Tags
        if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
          const current = (item.tags || []).filter((t) => !tagsToRemove.has(t));
          patch.tags = Array.from(new Set([...current, ...tagsToAdd]));
        }

        // Pricing
        if (priceAdjType !== 'none' && !isNaN(priceValNum) && priceValNum >= 0) {
          let curr = item.purchasePrice || 0;
          if (priceAdjType === 'set_fixed') curr = priceValNum;
          else if (priceAdjType === 'percent_discount') curr = Math.max(0, curr * (1 - priceValNum / 100));
          else if (priceAdjType === 'percent_increase') curr = curr * (1 + priceValNum / 100);
          else if (priceAdjType === 'add_fixed') curr = Math.max(0, curr + priceValNum);
          patch.purchasePrice = Math.round(curr * 100) / 100;
          patch.currentValuation = patch.purchasePrice;
        }

        return patch;
      }, `Bulk updated ${count} wardrobe items`);
    } else if (targetType === 'shopping') {
      batchUpdateShoppingItems(selectedIds, (item) => {
        const patch: Partial<ShoppingItem> = {};
        if (effectiveCategory) patch.category = effectiveCategory;
        if (targetPriority !== '__NO_CHANGE__') patch.priority = targetPriority as ShoppingPriority;
        if (targetShoppingStatus !== '__NO_CHANGE__') patch.status = targetShoppingStatus as ShoppingStatus;
        if (targetRetailer.trim()) patch.retailerName = targetRetailer.trim();
        if (targetSeasons.length > 0) patch.season = targetSeasons[0];

        if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
          const current = (item.tags || []).filter((t) => !tagsToRemove.has(t));
          patch.tags = Array.from(new Set([...current, ...tagsToAdd]));
        }

        if (priceAdjType !== 'none' && !isNaN(priceValNum) && priceValNum >= 0) {
          let curr = item.estimatedPrice || 0;
          if (priceAdjType === 'set_fixed') curr = priceValNum;
          else if (priceAdjType === 'percent_discount') curr = Math.max(0, curr * (1 - priceValNum / 100));
          else if (priceAdjType === 'percent_increase') curr = curr * (1 + priceValNum / 100);
          else if (priceAdjType === 'add_fixed') curr = Math.max(0, curr + priceValNum);
          patch.estimatedPrice = Math.round(curr * 100) / 100;
        }

        return patch;
      }, `Bulk updated ${count} shopping items`);
    } else if (targetType === 'sales' || targetType === 'selling') {
      batchUpdateSaleItems(selectedIds, (item) => {
        const patch: Partial<SaleItem> = {};
        if (effectiveCategory) patch.category = effectiveCategory;
        if (targetPlatform !== '__NO_CHANGE__') patch.platform = targetPlatform as SellingPlatform;
        if (targetSellingStatus !== '__NO_CHANGE__') patch.status = targetSellingStatus as SellingStatus;
        if (targetShippingStatus !== '__NO_CHANGE__') patch.shippingStatus = targetShippingStatus as ShippingStatus;
        if (targetCourier !== '__NO_CHANGE__') patch.courier = targetCourier as any;
        if (targetCondition !== '__NO_CHANGE__') patch.condition = targetCondition as Condition;

        if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
          const current = (item.tags || []).filter((t) => !tagsToRemove.has(t));
          patch.tags = Array.from(new Set([...current, ...tagsToAdd]));
        }

        if (priceAdjType !== 'none' && !isNaN(priceValNum) && priceValNum >= 0) {
          let curr = item.listingPrice || 0;
          if (priceAdjType === 'set_fixed') curr = priceValNum;
          else if (priceAdjType === 'percent_discount') curr = Math.max(0, curr * (1 - priceValNum / 100));
          else if (priceAdjType === 'percent_increase') curr = curr * (1 + priceValNum / 100);
          else if (priceAdjType === 'add_fixed') curr = Math.max(0, curr + priceValNum);
          patch.listingPrice = Math.round(curr * 100) / 100;
        }

        return patch;
      }, `Bulk updated ${count} sale listings`);
    } else if (targetType === 'lookbook') {
      batchUpdateOutfits(selectedIds, (outfit) => {
        const patch: Partial<LookbookOutfit> = {};
        if (targetOccasion !== '__NO_CHANGE__') patch.occasion = targetOccasion as any;
        if (targetSeasons.length > 0) patch.season = targetSeasons[0];
        if (targetFavorite !== '__NO_CHANGE__') patch.isFavorite = targetFavorite === 'yes';

        if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
          const current = (outfit.tags || []).filter((t) => !tagsToRemove.has(t));
          patch.tags = Array.from(new Set([...current, ...tagsToAdd]));
        }

        return patch;
      }, `Bulk updated ${count} outfits`);
    }

    if (onComplete) onComplete();
    onClose();
  };

  const toggleSeason = (s: Season) => {
    if (targetSeasons.includes(s)) {
      setTargetSeasons(targetSeasons.filter((item) => item !== s));
    } else {
      setTargetSeasons([...targetSeasons, s]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#1A1A1A] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E1] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#1A1A1A] text-white">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                Bulk Edit {count} {count === 1 ? 'Selected Item' : 'Selected Items'}
              </h2>
              <p className="text-xs text-[#767670] font-mono">
                Changes will be applied simultaneously across all selected {targetType} entries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#E5E3DC] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#E5E5E1] bg-white">
          <button
            type="button"
            onClick={() => setActiveSubTab('taxonomy')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'taxonomy'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Category & Classification
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('attributes')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'attributes'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Status & Details
          </button>
          {(targetType === 'wardrobe' || targetType === 'shopping' || targetType === 'sales' || targetType === 'selling') && (
            <button
              type="button"
              onClick={() => setActiveSubTab('pricing')}
              className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors ${
                activeSubTab === 'pricing'
                  ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              Price & Valuation
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveSubTab('tags')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'tags'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Tags & Labels
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: Taxonomy & Category */}
          {activeSubTab === 'taxonomy' && (
            <div className="space-y-4">
              {targetType !== 'lookbook' && (
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Change Category
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="__NO_CHANGE__">-- Keep Existing Categories (No Change) --</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        Set Category to: {c}
                      </option>
                    ))}
                    <option value="__NEW__">+ Create & Assign New Category...</option>
                  </select>

                  {targetCategory === '__NEW__' && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Type new category name..."
                        value={customNewCategory}
                        onChange={(e) => setCustomNewCategory(e.target.value)}
                        className="flex-1 text-xs font-mono border border-[#1A1A1A] p-2 focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Seasons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider">
                    Seasons Allocation
                  </label>
                  {targetType === 'wardrobe' && (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#767670]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="seasonMode"
                          checked={seasonMode === 'replace'}
                          onChange={() => setSeasonMode('replace')}
                        />
                        Replace
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="seasonMode"
                          checked={seasonMode === 'add'}
                          onChange={() => setSeasonMode('add')}
                        />
                        Append
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SEASONS_LIST.map((s) => {
                    const isSelected = targetSeasons.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSeason(s)}
                        className={`px-3 py-1.5 text-xs font-mono border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                            : 'bg-[#FAF9F5] text-[#1A1A1A] border-[#E5E5E1] hover:border-[#999]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {s}
                      </button>
                    );
                  })}
                  {targetSeasons.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetSeasons([])}
                      className="px-2.5 py-1 text-xs font-mono text-rose-700 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#767670] mt-1">
                  {targetSeasons.length === 0
                    ? 'Leave unselected to preserve current season tags.'
                    : `Will apply [${targetSeasons.join(', ')}] across selected pieces.`}
                </p>
              </div>

              {/* Condition (Wardrobe & Sales) */}
              {(targetType === 'wardrobe' || targetType === 'sales' || targetType === 'selling') && (
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Garment Condition
                  </label>
                  <select
                    value={targetCondition}
                    onChange={(e) => setTargetCondition(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="__NO_CHANGE__">-- Keep Existing Condition (No Change) --</option>
                    {CONDITIONS_LIST.map((cond) => (
                      <option key={cond} value={cond}>
                        Set Condition to: {cond}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lookbook Occasion */}
              {targetType === 'lookbook' && (
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Lookbook Occasion
                  </label>
                  <select
                    value={targetOccasion}
                    onChange={(e) => setTargetOccasion(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="__NO_CHANGE__">-- Keep Existing Occasion (No Change) --</option>
                    {[
                      'Work & Office',
                      'Weekend Casual',
                      'Evening & Dining',
                      'Formal & Events',
                      'Travel Capsule',
                      'Date Night',
                      'Seasonal Transition',
                    ].map((occ) => (
                      <option key={occ} value={occ}>
                        Set Occasion to: {occ}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Attributes & Status */}
          {activeSubTab === 'attributes' && (
            <div className="space-y-4">
              {targetType === 'wardrobe' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Favorite Status
                      </label>
                      <select
                        value={targetFavorite}
                        onChange={(e) => setTargetFavorite(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        <option value="yes">★ Mark as Favorite</option>
                        <option value="no">☆ Unfavorite</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Archive Status
                      </label>
                      <select
                        value={targetArchived}
                        onChange={(e) => setTargetArchived(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        <option value="yes">Archive from active closet</option>
                        <option value="no">Unarchive / Restore to active</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                      Storage / Wardrobe Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Master Wardrobe Rail 1, Under-bed Drawer, Storage Unit..."
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      className="w-full text-xs font-mono border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              {targetType === 'shopping' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Shopping Status
                      </label>
                      <select
                        value={targetShoppingStatus}
                        onChange={(e) => setTargetShoppingStatus(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        {SHOPPING_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Priority Level
                      </label>
                      <select
                        value={targetPriority}
                        onChange={(e) => setTargetPriority(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        {SHOPPING_PRIORITIES.map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                      Store / Retailer Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Arket, COS, SSENSE, Vinted, Toast..."
                      value={targetRetailer}
                      onChange={(e) => setTargetRetailer(e.target.value)}
                      className="w-full text-xs font-mono border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {(targetType === 'sales' || targetType === 'selling') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Selling Platform
                      </label>
                      <select
                        value={targetPlatform}
                        onChange={(e) => setTargetPlatform(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        {SELLING_PLATFORMS.map((pl) => (
                          <option key={pl} value={pl}>
                            {pl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Listing Status
                      </label>
                      <select
                        value={targetSellingStatus}
                        onChange={(e) => setTargetSellingStatus(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        {SELLING_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Shipping Status
                      </label>
                      <select
                        value={targetShippingStatus}
                        onChange={(e) => setTargetShippingStatus(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        {SHIPPING_STATUSES.map((sh) => (
                          <option key={sh} value={sh}>
                            {sh}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Designated Courier
                      </label>
                      <select
                        value={targetCourier}
                        onChange={(e) => setTargetCourier(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                      >
                        <option value="__NO_CHANGE__">No Change</option>
                        {COURIERS.map((cr) => (
                          <option key={cr} value={cr}>
                            {cr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {targetType === 'lookbook' && (
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Favorite Look
                  </label>
                  <select
                    value={targetFavorite}
                    onChange={(e) => setTargetFavorite(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="__NO_CHANGE__">No Change</option>
                    <option value="yes">★ Mark as Favorite Look</option>
                    <option value="no">☆ Unfavorite</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Pricing & Valuation */}
          {activeSubTab === 'pricing' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                  Price Adjustment Rule
                </label>
                <select
                  value={priceAdjType}
                  onChange={(e) => setPriceAdjType(e.target.value as any)}
                  className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                >
                  <option value="none">-- No Price Changes --</option>
                  <option value="set_fixed">Set all items to fixed price ({settings.currencySymbol})</option>
                  <option value="percent_discount">Apply % Discount (e.g. 15% off)</option>
                  <option value="percent_increase">Apply % Increase (e.g. 10% markup)</option>
                  <option value="add_fixed">Adjust by fixed amount (+/- {settings.currencySymbol})</option>
                </select>
              </div>

              {priceAdjType !== 'none' && (
                <div className="p-4 bg-[#FAF9F5] border border-[#E5E5E1] space-y-2">
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A]">
                    {priceAdjType === 'set_fixed' && `Fixed Price (${settings.currencySymbol})`}
                    {priceAdjType === 'percent_discount' && 'Discount Percentage (%)'}
                    {priceAdjType === 'percent_increase' && 'Price Increase Percentage (%)'}
                    {priceAdjType === 'add_fixed' && `Amount to Add/Subtract (${settings.currencySymbol})`}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 15"
                      value={priceAdjValue}
                      onChange={(e) => setPriceAdjValue(e.target.value)}
                      className="w-40 text-xs font-mono border border-[#1A1A1A] p-2 bg-white focus:outline-hidden"
                      autoFocus
                    />
                    <span className="text-xs font-mono text-[#767670]">
                      {priceAdjType.includes('percent') ? '%' : settings.currencySymbol}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#767670]">
                    Calculated valuations will be saved and reflected in budget and financial insights immediately.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Tags & Labels */}
          {activeSubTab === 'tags' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                  Add Tag(s) to Selected Items
                </label>
                <input
                  type="text"
                  placeholder="e.g. Capsule2026, Workwear, Merino, Trench (comma-separated)"
                  value={tagsToAddInput}
                  onChange={(e) => setTagsToAddInput(e.target.value)}
                  className="w-full text-xs font-mono border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                />
                <p className="text-[11px] font-mono text-[#767670] mt-1">
                  Tags will be appended to existing tags on each selected piece.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-rose-800 uppercase tracking-wider mb-1.5">
                  Remove Tag(s) from Selected Items
                </label>
                <input
                  type="text"
                  placeholder="e.g. Needs Tailoring, Summer Only (comma-separated)"
                  value={tagsToRemoveInput}
                  onChange={(e) => setTagsToRemoveInput(e.target.value)}
                  className="w-full text-xs font-mono border border-[#CCCCCC] p-2.5 focus:border-rose-700 focus:outline-hidden"
                />
              </div>

              {settings.customTags && settings.customTags.length > 0 && (
                <div>
                  <label className="block text-xs font-mono text-[#767670] uppercase tracking-wider mb-1">
                    Quick-Add Common Tags:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.customTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const existing = tagsToAddInput
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean);
                          if (!existing.includes(tag)) {
                            setTagsToAddInput([...existing, tag].join(', '));
                          }
                        }}
                        className="px-2 py-0.5 text-[11px] font-mono bg-[#FAF9F5] hover:bg-[#E5E3DC] text-[#1A1A1A] border border-[#E5E5E1] cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Summary Footer Bar */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] text-xs font-mono text-[#767670] flex items-center justify-between">
            <span>
              Targeting: <strong className="text-[#1A1A1A]">{count}</strong> items in{' '}
              <strong className="text-[#1A1A1A] capitalize">{targetType}</strong>
            </span>
            <span>Undo supported with 1-click restore</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E5E1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] border border-[#CCCCCC] hover:border-[#999] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-mono font-bold bg-[#1A1A1A] hover:bg-[#333] text-white shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Bulk Updates ({count})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
