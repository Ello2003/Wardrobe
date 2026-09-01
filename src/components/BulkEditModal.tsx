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
    batchUpdateItems,
    batchUpdateShoppingItems,
    batchUpdateSaleItems,
    batchUpdateOutfits,
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

        if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
          const current = (item.tags || []).filter((t) => !tagsToRemove.has(t));
          patch.tags = Array.from(new Set([...current, ...tagsToAdd]));
        }

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
        if (targetSeasons.length > 0) patch.season = targetSeasons;

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
        if (targetCourier !== '__NO_CHANGE__') patch.courier = targetCourier;

        if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
          const current = (item.tags || []).filter((t) => !tagsToRemove.has(t));
          patch.tags = Array.from(new Set([...current, ...tagsToAdd]));
        }

        if (priceAdjType !== 'none' && !isNaN(priceValNum) && priceValNum >= 0) {
          let curr = item.listedPrice || 0;
          if (priceAdjType === 'set_fixed') curr = priceValNum;
          else if (priceAdjType === 'percent_discount') curr = Math.max(0, curr * (1 - priceValNum / 100));
          else if (priceAdjType === 'percent_increase') curr = curr * (1 + priceValNum / 100);
          else if (priceAdjType === 'add_fixed') curr = Math.max(0, curr + priceValNum);
          patch.listedPrice = Math.round(curr * 100) / 100;
        }

        return patch;
      }, `Bulk updated ${count} sales items`);
    } else if (targetType === 'lookbook') {
      batchUpdateOutfits(selectedIds, (item) => {
        const patch: Partial<LookbookOutfit> = {};
        if (targetOccasion !== '__NO_CHANGE__') patch.occasion = targetOccasion;
        return patch;
      }, `Bulk updated ${count} outfits`);
    }

    if (onComplete) onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-zinc-700" />
            <h3 className="font-semibold text-zinc-900">Bulk Edit {count} Items ({targetType})</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Inner Configuration Layout Form */}
        <form onSubmit={handleApply} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="bulk-category-select" className="block text-sm font-medium text-zinc-700 mb-1">Update Category</label>
              <select
                id="bulk-category-select"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm bg-white shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              >
                <option value="__NO_CHANGE__">— No Change —</option>
                <option value="Tops">Tops</option>
                <option value="Bottoms">Bottoms</option>
                <option value="Dresses">Dresses</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Shoes">Shoes</option>
                <option value="__NEW__">+ Add Custom Category</option>
              </select>
            </div>

            {targetCategory === '__NEW__' && (
              <div>
                <label htmlFor="bulk-custom-category-input" className="block text-sm font-medium text-zinc-700 mb-1">Custom Category Name</label>
                <input
                  id="bulk-custom-category-input"
                  type="text"
                  value={customNewCategory}
                  onChange={(e) => setCustomNewCategory(e.target.value)}
                  placeholder="e.g. Knitwear"
                  className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  required
                />
              </div>
            )}

            {/* Target Status block for Resale Contexts */}
            {(targetType === 'sales' || targetType === 'selling') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bulk-selling-status" className="block text-sm font-medium text-zinc-700 mb-1">Listing Status</label>
                  <select
                    id="bulk-selling-status"
                    value={targetSellingStatus}
                    onChange={(e) => setTargetSellingStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SELLING_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bulk-shipping-status" className="block text-sm font-medium text-zinc-700 mb-1">Shipping Status</label>
                  <select
                    id="bulk-shipping-status"
                    value={targetShippingStatus}
                    onChange={(e) => setTargetShippingStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SHIPPING_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Pricing Adjustments Sub-Layout */}
            <div>
              <label htmlFor="bulk-price-adj-type" className="block text-sm font-medium text-zinc-700 mb-1">Adjust Pricing</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="bulk-price-adj-type"
                  value={priceAdjType}
                  onChange={(e) => setPriceAdjType(e.target.value as any)}
                  className="rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  <option value="none">No Adjustment</option>
                  <option value="set_fixed">Set Fixed Price</option>
                  <option value="percent_discount">Apply % Discount</option>
                  <option value="percent_increase">Apply % Increase</option>
                  <option value="add_fixed">Add Amount</option>
                </select>
                {priceAdjType !== 'none' && (
                  <input
                    type="number"
                    step="any"
                    value={priceAdjValue}
                    onChange={(e) => setPriceAdjValue(e.target.value)}
                    placeholder="Value..."
                    className="rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                    required
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition">
              <Check className="w-4 h-4" />
              Apply Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
