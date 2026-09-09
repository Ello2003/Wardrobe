import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Tag,
  Layers,
  Sparkles,
  Sliders,
  PoundSterling,
  MapPin,
  Calendar,
  AlertCircle,
  Archive,
  Heart,
  Store,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  FolderTree,
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

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  targetType,
  selectedIds,
  onComplete,
}) => {
  const {
    categories,
    items,
    shoppingList,
    saleItems,
    batchUpdateItems,
    batchUpdateShoppingItems,
    batchUpdateSaleItems,
    batchUpdateOutfits,
  } = useWardrobe();

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

  // 1. Dynamic category aggregation: pull all existing categories across entire wardrobe, shopping, resale + defaults
  const allGarmentCategories = useMemo(() => {
    const catMap = new Map<string, number>();

    // Baseline categories
    const baseline = [
      'Outerwear',
      'Knitwear',
      'Tops',
      'Bottoms',
      'Dresses & Jumpsuits',
      'Shoes',
      'Bags',
      'Accessories',
      'Formalwear',
      'Activewear',
      'Footwear',
      'Jewellery',
      'Tailoring',
    ];
    baseline.forEach((c) => catMap.set(c, 0));

    // Custom categories configured in context
    (categories || []).forEach((c) => {
      if (c && c.trim()) {
        const clean = c.trim();
        if (!catMap.has(clean)) catMap.set(clean, 0);
      }
    });

    // Tally from all items in wardrobe
    items.forEach((i) => {
      if (i.category && i.category.trim()) {
        const clean = i.category.trim();
        catMap.set(clean, (catMap.get(clean) || 0) + 1);
      }
    });

    // Tally from shopping list
    shoppingList.forEach((s) => {
      if (s.category && s.category.trim()) {
        const clean = s.category.trim();
        catMap.set(clean, (catMap.get(clean) || 0) + 1);
      }
    });

    // Tally from sale items
    saleItems.forEach((sl) => {
      if (sl.category && sl.category.trim()) {
        const clean = sl.category.trim();
        catMap.set(clean, (catMap.get(clean) || 0) + 1);
      }
    });

    return Array.from(catMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [categories, items, shoppingList, saleItems]);

  // 2. Tag pills on selected items: see what tags are currently active on these items
  const tagsOnSelectedItems = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const tagCounts = new Map<string, number>();
    const source =
      targetType === 'wardrobe'
        ? items
        : targetType === 'shopping'
        ? shoppingList
        : saleItems;

    source
      .filter((it) => selectedSet.has(it.id))
      .forEach((it) => {
        (it.tags || []).forEach((t) => {
          const clean = t.trim();
          if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
        });
      });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [selectedIds, targetType, items, shoppingList, saleItems]);

  // 3. All available tags across the entire wardrobe collection for quick pill tagging
  const allAvailableTags = useMemo(() => {
    const tagCounts = new Map<string, number>();

    items.forEach((it) => {
      (it.tags || []).forEach((t) => {
        const clean = t.trim();
        if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    });

    shoppingList.forEach((it) => {
      (it.tags || []).forEach((t) => {
        const clean = t.trim();
        if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    });

    saleItems.forEach((it) => {
      (it.tags || []).forEach((t) => {
        const clean = t.trim();
        if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    });

    // Standard baseline tags if not present
    [
      'Casual',
      'Formal',
      'Work',
      'Vintage',
      'Minimalist',
      'Summer',
      'Winter',
      'Essential',
      'Pre-owned',
      'Second-hand',
      'Vinted',
      'Bought',
      'Sold',
      'Investment',
      'Tailored',
      'Weekend',
    ].forEach((defTag) => {
      if (!tagCounts.has(defTag)) tagCounts.set(defTag, 0);
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 32)
      .map(([tag, count]) => ({ tag, count }));
  }, [items, shoppingList, saleItems]);

  // Quick tag toggle helpers
  const handleToggleAddTag = (tag: string) => {
    const current = tagsToAddInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagsToAddInput(
        current.filter((t) => t.toLowerCase() !== tag.toLowerCase()).join(', ')
      );
    } else {
      setTagsToAddInput([...current, tag].join(', '));
    }
  };

  const handleToggleRemoveTag = (tag: string) => {
    const current = tagsToRemoveInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagsToRemoveInput(
        current.filter((t) => t.toLowerCase() !== tag.toLowerCase()).join(', ')
      );
    } else {
      setTagsToRemoveInput([...current, tag].join(', '));
    }
  };

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
        if (targetSeasons.length > 0) patch.season = targetSeasons[0] as Season;

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
      }, `Bulk updated ${count} sales items`);
    } else if (targetType === 'lookbook') {
      batchUpdateOutfits(selectedIds, (item) => {
        const patch: Partial<LookbookOutfit> = {};
        if (targetOccasion !== '__NO_CHANGE__') patch.occasion = targetOccasion as any;
        return patch;
      }, `Bulk updated ${count} outfits`);
    }

    if (onComplete) onComplete();
    onClose();
  };

  const parsedTagsToAdd = tagsToAddInput
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const parsedTagsToRemove = tagsToRemoveInput
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-zinc-700" />
            <h3 className="font-semibold text-zinc-900">
              Bulk Edit {count} Items ({targetType})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleApply} className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="space-y-5">
            {/* 1. Dynamic Garment Categories */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="bulk-category-select"
                  className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold"
                >
                  Garment Category
                </label>
                <span className="text-[11px] font-mono text-zinc-500">
                  {allGarmentCategories.length} categories available
                </span>
              </div>
              <select
                id="bulk-category-select"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm bg-white shadow-xs focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-sans cursor-pointer"
              >
                <option value="__NO_CHANGE__">— No Change (Keep Existing Categories) —</option>
                {allGarmentCategories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} {c.count > 0 ? `(${c.count} items)` : ''}
                  </option>
                ))}
                <option value="__NEW__">+ Add Custom Category</option>
              </select>
            </div>

            {targetCategory === '__NEW__' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <label
                  htmlFor="bulk-custom-category-input"
                  className="block text-xs font-mono uppercase tracking-wider text-amber-900 font-semibold mb-1"
                >
                  Custom Category Name
                </label>
                <input
                  id="bulk-custom-category-input"
                  type="text"
                  value={customNewCategory}
                  onChange={(e) => setCustomNewCategory(e.target.value)}
                  placeholder="e.g. Knitwear, Tailoring, Overcoats"
                  className="w-full rounded-lg border border-amber-300 p-2 text-sm bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            )}

            {/* 2. Tag Filter & Management Pills */}
            <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-zinc-700" />
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-800 font-bold">
                    Tag Filter & Batch Pills
                  </span>
                </div>
                {(tagsToAddInput || tagsToRemoveInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTagsToAddInput('');
                      setTagsToRemoveInput('');
                    }}
                    className="text-[10px] font-mono text-zinc-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    Clear Tag Changes
                  </button>
                )}
              </div>

              {/* Tags currently present on selected items */}
              {tagsOnSelectedItems.length > 0 && (
                <div>
                  <span className="block text-[11px] font-mono text-zinc-500 mb-1.5">
                    Tags on selected items (click tag to remove from selection):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tagsOnSelectedItems.map((item) => {
                      const isStagedForRemoval = parsedTagsToRemove.includes(
                        item.tag.toLowerCase()
                      );
                      return (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleToggleRemoveTag(item.tag)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-full border transition-all cursor-pointer ${
                            isStagedForRemoval
                              ? 'bg-rose-100 text-rose-800 border-rose-300 line-through font-semibold'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:border-rose-400 hover:bg-rose-50'
                          }`}
                          title={
                            isStagedForRemoval
                              ? 'Staged for removal. Click to cancel.'
                              : `Click to remove #${item.tag} from selected items`
                          }
                        >
                          <Minus className="w-3 h-3 text-rose-500" />
                          #{item.tag}
                          <span className="text-[10px] text-zinc-400">({item.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Add Tag Filter Pills */}
              <div>
                <span className="block text-[11px] font-mono text-zinc-500 mb-1.5">
                  Quick add tags (click to append to selected items):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-0.5">
                  {allAvailableTags.map((item) => {
                    const isStagedToAdd = parsedTagsToAdd.includes(item.tag.toLowerCase());
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleToggleAddTag(item.tag)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-full border transition-all cursor-pointer ${
                          isStagedToAdd
                            ? 'bg-zinc-900 text-white border-zinc-900 font-semibold shadow-xs'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100'
                        }`}
                        title={
                          isStagedToAdd
                            ? 'Staged to add. Click to remove.'
                            : `Add #${item.tag} to selection`
                        }
                      >
                        <Plus className={`w-3 h-3 ${isStagedToAdd ? 'text-white' : 'text-zinc-500'}`} />
                        #{item.tag}
                        {item.count > 0 && (
                          <span className={`text-[10px] ${isStagedToAdd ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            ({item.count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual Tag Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-zinc-200/80">
                <div>
                  <label
                    htmlFor="bulk-tags-add"
                    className="block text-[10px] font-mono uppercase text-emerald-800 font-semibold mb-1"
                  >
                    + Tags To Add (comma separated)
                  </label>
                  <input
                    id="bulk-tags-add"
                    type="text"
                    value={tagsToAddInput}
                    onChange={(e) => setTagsToAddInput(e.target.value)}
                    placeholder="e.g. summer, travel, vintage"
                    className="w-full rounded-lg border border-zinc-200 p-2 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bulk-tags-remove"
                    className="block text-[10px] font-mono uppercase text-rose-800 font-semibold mb-1"
                  >
                    - Tags To Remove (comma separated)
                  </label>
                  <input
                    id="bulk-tags-remove"
                    type="text"
                    value={tagsToRemoveInput}
                    onChange={(e) => setTagsToRemoveInput(e.target.value)}
                    placeholder="e.g. old-tag, draft"
                    className="w-full rounded-lg border border-zinc-200 p-2 text-xs bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Target Status block for Resale Contexts */}
            {(targetType === 'sales' || targetType === 'selling') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bulk-selling-status"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold mb-1"
                  >
                    Listing Status
                  </label>
                  <select
                    id="bulk-selling-status"
                    value={targetSellingStatus}
                    onChange={(e) => setTargetSellingStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SELLING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="bulk-shipping-status"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold mb-1"
                  >
                    Shipping Status
                  </label>
                  <select
                    id="bulk-shipping-status"
                    value={targetShippingStatus}
                    onChange={(e) => setTargetShippingStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SHIPPING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Shopping Target Status & Priority */}
            {targetType === 'shopping' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bulk-shopping-status"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold mb-1"
                  >
                    Wishlist Status
                  </label>
                  <select
                    id="bulk-shopping-status"
                    value={targetShoppingStatus}
                    onChange={(e) => setTargetShoppingStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SHOPPING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="bulk-shopping-priority"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id="bulk-shopping-priority"
                    value={targetPriority}
                    onChange={(e) => setTargetPriority(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SHOPPING_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Pricing Adjustments Sub-Layout */}
            <div>
              <label
                htmlFor="bulk-price-adj-type"
                className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold mb-1"
              >
                Adjust Pricing
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="bulk-price-adj-type"
                  value={priceAdjType}
                  onChange={(e) => setPriceAdjType(e.target.value as any)}
                  className="rounded-lg border border-zinc-200 p-2.5 text-sm focus:border-zinc-500 focus:outline-none cursor-pointer"
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Apply Changes to {count} Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
