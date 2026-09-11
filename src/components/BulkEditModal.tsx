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
  ChevronDown,
  ChevronUp,
  Percent,
  Shirt,
  ShoppingBag,
  Eye,
  Info,
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
import { GarmentImage } from './GarmentImage';
import { canonicalizeTag } from '../utils/tagUtils';

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

  // Active Tab for Organized Editing
  const [activeTab, setActiveTab] = useState<'attributes' | 'tags' | 'pricing' | 'status'>('attributes');
  const [showItemPreview, setShowItemPreview] = useState(false);

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

  // 1. Resolve full items matching selectedIds
  const selectedItemsData = useMemo(() => {
    const idSet = new Set(selectedIds);
    if (targetType === 'wardrobe') return items.filter((it) => idSet.has(it.id));
    if (targetType === 'shopping') return shoppingList.filter((it) => idSet.has(it.id));
    if (targetType === 'sales' || targetType === 'selling') return saleItems.filter((it) => idSet.has(it.id));
    return [];
  }, [selectedIds, targetType, items, shoppingList, saleItems]);

  const totalBatchPrice = useMemo(() => {
    return selectedItemsData.reduce((sum, it: any) => {
      const p = it.purchasePrice ?? it.estimatedPrice ?? it.listingPrice ?? 0;
      return sum + p;
    }, 0);
  }, [selectedItemsData]);

  // 2. Dynamic category aggregation
  const allGarmentCategories = useMemo(() => {
    const catMap = new Map<string, number>();

    const baseline = [
      'Outerwear',
      'Knitwear',
      'Tops',
      'Bottoms',
      'Trousers',
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

    (categories || []).forEach((c) => {
      if (c && c.trim()) {
        const clean = c.trim();
        if (!catMap.has(clean)) catMap.set(clean, 0);
      }
    });

    items.forEach((i) => {
      if (i.category && i.category.trim()) {
        const clean = i.category.trim();
        catMap.set(clean, (catMap.get(clean) || 0) + 1);
      }
    });

    shoppingList.forEach((s) => {
      if (s.category && s.category.trim()) {
        const clean = s.category.trim();
        catMap.set(clean, (catMap.get(clean) || 0) + 1);
      }
    });

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

  // 3. Tag pills on selected items
  const tagsOnSelectedItems = useMemo(() => {
    const tagCounts = new Map<string, number>();
    selectedItemsData.forEach((it: any) => {
      (it.tags || []).forEach((t: string) => {
        const clean = typeof t === 'string' ? t.trim() : '';
        if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [selectedItemsData]);

  // 4. All available tags across the entire wardrobe collection
  const allAvailableTags = useMemo(() => {
    const tagCounts = new Map<string, number>();

    const record = (raw: string) => {
      const clean = canonicalizeTag(raw);
      if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
    };

    items.forEach((it) => (it.tags || []).forEach(record));
    shoppingList.forEach((it) => (it.tags || []).forEach(record));
    saleItems.forEach((it) => (it.tags || []).forEach(record));

    [
      'Casual',
      'Formal',
      'Work',
      'Vintage',
      'Minimalist',
      'Summer',
      'Winter',
      'Essential',
      'Pre-Owned',
      'Vinted',
      'Bought',
      'Sold',
      'Investment',
      'Tailored',
      'Weekend',
    ].forEach(record);

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 36)
      .map(([tag, count]) => ({ tag, count }));
  }, [items, shoppingList, saleItems]);

  const parsedTagsToAdd = useMemo(
    () =>
      tagsToAddInput
        .split(',')
        .map((t) => canonicalizeTag(t.trim().toLowerCase()))
        .filter(Boolean),
    [tagsToAddInput]
  );

  const parsedTagsToRemove = useMemo(
    () =>
      tagsToRemoveInput
        .split(',')
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean),
    [tagsToRemoveInput]
  );

  const handleToggleAddTag = (tag: string) => {
    const canonical = canonicalizeTag(tag);
    const current = tagsToAddInput
      .split(',')
      .map((t) => canonicalizeTag(t.trim()))
      .filter(Boolean);

    if (current.some((t) => t.toLowerCase() === canonical.toLowerCase())) {
      setTagsToAddInput(
        current.filter((t) => t.toLowerCase() !== canonical.toLowerCase()).join(', ')
      );
    } else {
      setTagsToAddInput([...current, canonical].join(', '));
    }
  };

  const handleToggleRemoveTag = (tag: string) => {
    const lower = tag.trim().toLowerCase().replace(/^#/, '');
    const current = tagsToRemoveInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (current.some((t) => t.toLowerCase() === lower)) {
      setTagsToRemoveInput(
        current.filter((t) => t.toLowerCase() !== lower).join(', ')
      );
    } else {
      setTagsToRemoveInput([...current, tag].join(', '));
    }
  };

  const toggleSeason = (season: Season) => {
    setTargetSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  if (!isOpen) return null;

  const count = selectedIds.length;

  // Staged changes summary list
  const stagedSummary = [];
  if (targetCategory === '__NEW__' && customNewCategory.trim()) {
    stagedSummary.push(`Category: "${customNewCategory.trim()}"`);
  } else if (targetCategory !== '__NO_CHANGE__') {
    stagedSummary.push(`Category: "${targetCategory}"`);
  }
  if (targetCondition !== '__NO_CHANGE__') stagedSummary.push(`Condition: "${targetCondition}"`);
  if (targetSeasons.length > 0) stagedSummary.push(`Seasons: [${targetSeasons.join(', ')}]`);
  if (targetLocation.trim()) stagedSummary.push(`Location: "${targetLocation.trim()}"`);
  if (targetFavorite !== '__NO_CHANGE__') stagedSummary.push(`Favorite: ${targetFavorite === 'yes' ? 'Yes' : 'No'}`);
  if (targetArchived !== '__NO_CHANGE__') stagedSummary.push(`Archive: ${targetArchived === 'yes' ? 'Yes' : 'No'}`);
  if (parsedTagsToAdd.length > 0) stagedSummary.push(`+Tags: ${parsedTagsToAdd.map((t) => `#${t}`).join(', ')}`);
  if (parsedTagsToRemove.length > 0) stagedSummary.push(`-Tags: ${parsedTagsToRemove.map((t) => `#${t}`).join(', ')}`);
  if (priceAdjType !== 'none' && priceAdjValue) {
    if (priceAdjType === 'set_fixed') stagedSummary.push(`Price: £${priceAdjValue}`);
    else if (priceAdjType === 'percent_discount') stagedSummary.push(`Discount: -${priceAdjValue}%`);
    else if (priceAdjType === 'percent_increase') stagedSummary.push(`Markup: +${priceAdjValue}%`);
    else if (priceAdjType === 'add_fixed') stagedSummary.push(`Price: +£${priceAdjValue}`);
  }
  if (targetPriority !== '__NO_CHANGE__') stagedSummary.push(`Priority: ${targetPriority}`);
  if (targetShoppingStatus !== '__NO_CHANGE__') stagedSummary.push(`Status: ${targetShoppingStatus}`);
  if (targetRetailer.trim()) stagedSummary.push(`Retailer: "${targetRetailer.trim()}"`);
  if (targetPlatform !== '__NO_CHANGE__') stagedSummary.push(`Platform: ${targetPlatform}`);
  if (targetSellingStatus !== '__NO_CHANGE__') stagedSummary.push(`Resale Status: ${targetSellingStatus}`);
  if (targetShippingStatus !== '__NO_CHANGE__') stagedSummary.push(`Shipping: ${targetShippingStatus}`);

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
        .map((t) => canonicalizeTag(t.trim()))
        .filter((t) => t.length > 0);

    const tagsToAdd = parseTags(tagsToAddInput);
    const tagsToRemove = new Set(
      tagsToRemoveInput
        .split(',')
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean)
    );

    const priceValNum = parseFloat(priceAdjValue);

    if (targetType === 'wardrobe') {
      batchUpdateItems(
        selectedIds,
        (item) => {
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
            const current = (item.tags || []).filter(
              (t) => !tagsToRemove.has(t.toLowerCase().replace(/^#/, ''))
            );
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
        },
        `Bulk updated ${count} wardrobe items`
      );
    } else if (targetType === 'shopping') {
      batchUpdateShoppingItems(
        selectedIds,
        (item) => {
          const patch: Partial<ShoppingItem> = {};
          if (effectiveCategory) patch.category = effectiveCategory;
          if (targetPriority !== '__NO_CHANGE__') patch.priority = targetPriority as ShoppingPriority;
          if (targetShoppingStatus !== '__NO_CHANGE__') patch.status = targetShoppingStatus as ShoppingStatus;
          if (targetRetailer.trim()) patch.retailerName = targetRetailer.trim();
          if (targetSeasons.length > 0) patch.season = targetSeasons[0] as Season;

          if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
            const current = (item.tags || []).filter(
              (t) => !tagsToRemove.has(t.toLowerCase().replace(/^#/, ''))
            );
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
        },
        `Bulk updated ${count} shopping items`
      );
    } else if (targetType === 'sales' || targetType === 'selling') {
      batchUpdateSaleItems(
        selectedIds,
        (item) => {
          const patch: Partial<SaleItem> = {};
          if (effectiveCategory) patch.category = effectiveCategory;
          if (targetPlatform !== '__NO_CHANGE__') patch.platform = targetPlatform as SellingPlatform;
          if (targetSellingStatus !== '__NO_CHANGE__') patch.status = targetSellingStatus as SellingStatus;
          if (targetShippingStatus !== '__NO_CHANGE__') patch.shippingStatus = targetShippingStatus as ShippingStatus;
          if (targetCourier !== '__NO_CHANGE__') patch.courier = targetCourier as any;
          if (targetCondition !== '__NO_CHANGE__') patch.condition = targetCondition as Condition;

          if (tagsToAdd.length > 0 || tagsToRemove.size > 0) {
            const current = (item.tags || []).filter(
              (t) => !tagsToRemove.has(t.toLowerCase().replace(/^#/, ''))
            );
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
        },
        `Bulk updated ${count} sales items`
      );
    } else if (targetType === 'lookbook') {
      batchUpdateOutfits(
        selectedIds,
        (item) => {
          const patch: Partial<LookbookOutfit> = {};
          if (targetOccasion !== '__NO_CHANGE__') patch.occasion = targetOccasion as any;
          return patch;
        },
        `Bulk updated ${count} outfits`
      );
    }

    if (onComplete) onComplete();
    onClose();
  };

  const targetTitle =
    targetType === 'wardrobe'
      ? 'Wardrobe Garments'
      : targetType === 'shopping'
      ? 'Wishlist Items'
      : targetType === 'lookbook'
      ? 'Outfits'
      : 'Resale Listings';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FAF9F7] border border-[#D5D5D0] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5E5E1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#8C7355]/10 border border-[#8C7355]/20 flex items-center justify-center text-[#8C7355]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-[#1A1A1A] tracking-tight">
                  Bulk Edit {targetTitle}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-[#8C7355]/10 border border-[#8C7355]/25 text-[#8C7355] font-bold">
                  {count} Selected
                </span>
              </div>
              <p className="text-xs font-mono text-[#767670] mt-0.5">
                Apply consistent taxonomy, attributes, valuation, and statuses across your batch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inspect Selected Items Bar / Collapsible Carousel */}
        <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] px-6 py-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowItemPreview(!showItemPreview)}
              className="inline-flex items-center gap-2 text-xs font-mono text-[#4A4A45] hover:text-[#1A1A1A] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#8C7355]" />
              <span className="font-semibold">
                {showItemPreview ? 'Hide Selected Garments Strip' : `Inspect ${count} Selected Items`}
              </span>
              <span className="text-[#767670]">
                (Total: £{totalBatchPrice.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
              </span>
              {showItemPreview ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#767670]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#767670]" />
              )}
            </button>

            {stagedSummary.length > 0 && (
              <span className="text-[11px] font-mono text-[#8C7355] font-medium hidden sm:inline truncate max-w-xs">
                {stagedSummary.length} change(s) staged
              </span>
            )}
          </div>

          {/* Expandable thumbnails strip */}
          {showItemPreview && (
            <div className="mt-2.5 pt-2.5 border-t border-[#E5E5E1] flex gap-2 overflow-x-auto pb-2">
              {selectedItemsData.map((item: any) => (
                <div
                  key={item.id}
                  className="shrink-0 w-28 bg-white border border-[#E5E5E1] p-1.5 shadow-2xs text-left flex flex-col justify-between"
                >
                  <div className="aspect-square bg-[#F2F1ED] overflow-hidden mb-1 relative border border-[#F0EFEA]">
                    <GarmentImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-bold text-[#1A1A1A] truncate">
                      {item.brand || 'Atelier'}
                    </p>
                    <p className="text-[10px] font-serif text-[#767670] truncate leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[9px] font-mono text-[#8C7355] mt-0.5">
                      £{(item.purchasePrice ?? item.estimatedPrice ?? item.listingPrice ?? 0).toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabbed Navigation */}
        <div className="flex border-b border-[#E5E5E1] bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('attributes')}
            className={`py-2.5 px-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attributes'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Attributes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`py-2.5 px-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tags'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tags & Labels</span>
            {(parsedTagsToAdd.length > 0 || parsedTagsToRemove.length > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8C7355]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`py-2.5 px-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pricing'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <PoundSterling className="w-3.5 h-3.5" />
            <span>Pricing</span>
            {priceAdjType !== 'none' && priceAdjValue && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8C7355]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-2.5 px-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Status & Flags</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleApply} className="overflow-y-auto p-6 space-y-6 flex-1 max-h-[58vh]">
          {/* TAB 1: ATTRIBUTES */}
          {activeTab === 'attributes' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="bulk-category-select"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold"
                  >
                    Garment Category
                  </label>
                  <span className="text-[11px] font-mono text-[#A5A59E]">
                    {allGarmentCategories.length} available
                  </span>
                </div>
                <select
                  id="bulk-category-select"
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
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
                <div className="bg-[#8C7355]/5 border border-[#8C7355]/30 p-3">
                  <label
                    htmlFor="bulk-custom-category-input"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#8C7355] font-bold mb-1"
                  >
                    New Category Name
                  </label>
                  <input
                    id="bulk-custom-category-input"
                    type="text"
                    value={customNewCategory}
                    onChange={(e) => setCustomNewCategory(e.target.value)}
                    placeholder="e.g. Knitwear, Tailoring, Overcoats"
                    className="w-full bg-white border border-[#D5D5D0] p-2 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Condition (Wardrobe & Resale) */}
              {(targetType === 'wardrobe' || targetType === 'sales' || targetType === 'selling') && (
                <div>
                  <label
                    htmlFor="bulk-condition-select"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                  >
                    Garment Condition
                  </label>
                  <select
                    id="bulk-condition-select"
                    value={targetCondition}
                    onChange={(e) => setTargetCondition(e.target.value)}
                    className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
                  >
                    <option value="__NO_CHANGE__">— No Change (Keep Existing Condition) —</option>
                    {CONDITIONS_LIST.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Season Multi-Select Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold">
                    Target Seasons
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-[#A5A59E]">Mode:</span>
                    <button
                      type="button"
                      onClick={() => setSeasonMode('replace')}
                      className={`px-1.5 py-0.5 border cursor-pointer ${
                        seasonMode === 'replace'
                          ? 'bg-[#8C7355] text-white border-[#8C7355]'
                          : 'bg-white text-[#767670] border-[#D5D5D0]'
                      }`}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeasonMode('add')}
                      className={`px-1.5 py-0.5 border cursor-pointer ${
                        seasonMode === 'add'
                          ? 'bg-[#8C7355] text-white border-[#8C7355]'
                          : 'bg-white text-[#767670] border-[#D5D5D0]'
                      }`}
                    >
                      Append
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SEASONS_LIST.map((season) => {
                    const isSelected = targetSeasons.includes(season);
                    return (
                      <button
                        key={season}
                        type="button"
                        onClick={() => toggleSeason(season)}
                        className={`px-3 py-1.5 text-xs font-mono border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#8C7355] border-[#8C7355] text-white font-medium shadow-xs'
                            : 'bg-white border-[#D5D5D0] text-[#4A4A45] hover:border-[#8C7355]'
                        }`}
                      >
                        {season}
                      </button>
                    );
                  })}
                  {targetSeasons.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetSeasons([])}
                      className="px-2 py-1.5 text-[10px] font-mono text-[#767670] hover:text-[#1A1A1A] underline cursor-pointer"
                    >
                      Clear seasons
                    </button>
                  )}
                </div>
              </div>

              {/* Storage Location (Wardrobe only) */}
              {targetType === 'wardrobe' && (
                <div>
                  <label
                    htmlFor="bulk-storage-location"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                  >
                    Storage Location / Humidor Placement
                  </label>
                  <input
                    id="bulk-storage-location"
                    type="text"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    placeholder="e.g. Master Wardrobe Rail 2, Cedar Chest A, Archive Box"
                    className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              )}

              {/* Retailer Name (Shopping only) */}
              {targetType === 'shopping' && (
                <div>
                  <label
                    htmlFor="bulk-retailer-name"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                  >
                    Retailer / Store Name
                  </label>
                  <input
                    id="bulk-retailer-name"
                    type="text"
                    value={targetRetailer}
                    onChange={(e) => setTargetRetailer(e.target.value)}
                    placeholder="e.g. Mr Porter, SSENSE, Vinted, End Clothing"
                    className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              )}

              {/* Resale Platform (Selling only) */}
              {(targetType === 'sales' || targetType === 'selling') && (
                <div>
                  <label
                    htmlFor="bulk-platform-select"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                  >
                    Resale Platform
                  </label>
                  <select
                    id="bulk-platform-select"
                    value={targetPlatform}
                    onChange={(e) => setTargetPlatform(e.target.value)}
                    className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
                  >
                    <option value="__NO_CHANGE__">— No Change —</option>
                    {SELLING_PLATFORMS.map((plat) => (
                      <option key={plat} value={plat}>
                        {plat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TAGS & TAXONOMY */}
          {activeTab === 'tags' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#8C7355]" />
                    <span className="text-xs font-mono uppercase tracking-wider text-[#1A1A1A] font-bold">
                      Tag Taxonomy Batch Management
                    </span>
                  </div>
                  {(tagsToAddInput || tagsToRemoveInput) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTagsToAddInput('');
                        setTagsToRemoveInput('');
                      }}
                      className="text-[10px] font-mono text-[#767670] hover:text-rose-700 underline cursor-pointer"
                    >
                      Clear Tag Changes
                    </button>
                  )}
                </div>

                {/* Tags on selected items */}
                {tagsOnSelectedItems.length > 0 && (
                  <div>
                    <span className="block text-[11px] font-mono text-[#767670] mb-2">
                      Active tags across selected items (click tag to stage for removal):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tagsOnSelectedItems.map((item) => {
                        const isStagedForRemoval = parsedTagsToRemove.includes(
                          item.tag.toLowerCase().replace(/^#/, '')
                        );
                        return (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => handleToggleRemoveTag(item.tag)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border transition-all cursor-pointer ${
                              isStagedForRemoval
                                ? 'bg-rose-50 text-rose-800 border-rose-300 line-through font-semibold'
                                : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-rose-400 hover:bg-rose-50/50'
                            }`}
                            title={
                              isStagedForRemoval
                                ? 'Staged for removal. Click to cancel.'
                                : `Click to remove #${item.tag} from selected items`
                            }
                          >
                            <Minus className="w-3 h-3 text-rose-600" />
                            <span>#{item.tag}</span>
                            <span className="text-[10px] text-[#A5A59E]">({item.count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Add Tag Pills */}
                <div>
                  <span className="block text-[11px] font-mono text-[#767670] mb-2">
                    Quick-add tags (click to append standardized tag to selected items):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#FAF9F7] border border-[#E5E5E1]">
                    {allAvailableTags.map((item) => {
                      const isStagedToAdd = parsedTagsToAdd.includes(
                        item.tag.toLowerCase().replace(/^#/, '')
                      );
                      return (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleToggleAddTag(item.tag)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border transition-all cursor-pointer ${
                            isStagedToAdd
                              ? 'bg-[#8C7355] text-white border-[#8C7355] font-semibold shadow-xs'
                              : 'bg-white text-[#4A4A45] border-[#D5D5D0] hover:border-[#8C7355] hover:bg-[#8C7355]/5'
                          }`}
                          title={
                            isStagedToAdd
                              ? 'Staged to add. Click to remove.'
                              : `Add #${item.tag} to selection`
                          }
                        >
                          <Plus className={`w-3 h-3 ${isStagedToAdd ? 'text-white' : 'text-[#8C7355]'}`} />
                          <span>#{item.tag}</span>
                          {item.count > 0 && (
                            <span
                              className={`text-[10px] ${
                                isStagedToAdd ? 'text-[#FAF9F7]/80' : 'text-[#A5A59E]'
                              }`}
                            >
                              ({item.count})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual Tag Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E5E5E1]">
                  <div>
                    <label
                      htmlFor="bulk-tags-add"
                      className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold mb-1"
                    >
                      + Tags To Append (comma separated)
                    </label>
                    <input
                      id="bulk-tags-add"
                      type="text"
                      value={tagsToAddInput}
                      onChange={(e) => setTagsToAddInput(e.target.value)}
                      placeholder="e.g. Summer, Travel, Vintage, Sold"
                      className="w-full bg-white border border-[#D5D5D0] p-2 text-xs font-mono text-[#1A1A1A] focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bulk-tags-remove"
                      className="block text-[10px] font-mono uppercase tracking-wider text-rose-800 font-bold mb-1"
                    >
                      - Tags To Remove (comma separated)
                    </label>
                    <input
                      id="bulk-tags-remove"
                      type="text"
                      value={tagsToRemoveInput}
                      onChange={(e) => setTagsToRemoveInput(e.target.value)}
                      placeholder="e.g. old-tag, draft, pending"
                      className="w-full bg-white border border-[#D5D5D0] p-2 text-xs font-mono text-[#1A1A1A] focus:border-rose-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & VALUATION */}
          {activeTab === 'pricing' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <PoundSterling className="w-4 h-4 text-[#8C7355]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#1A1A1A] font-bold">
                    Batch Pricing & Valuation Adjustments
                  </span>
                </div>

                <p className="text-xs font-mono text-[#767670]">
                  Apply markdown promotions, flat price resets, percentage increases, or fixed additions across all {count} items in £ GBP.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="bulk-price-adj-type"
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                    >
                      Adjustment Formula
                    </label>
                    <select
                      id="bulk-price-adj-type"
                      value={priceAdjType}
                      onChange={(e) => setPriceAdjType(e.target.value as any)}
                      className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
                    >
                      <option value="none">No Price Adjustment</option>
                      <option value="percent_discount">Apply % Discount (Markdown)</option>
                      <option value="percent_increase">Apply % Markup / Increase</option>
                      <option value="set_fixed">Set Fixed Price for All</option>
                      <option value="add_fixed">Add Fixed Amount (+£)</option>
                    </select>
                  </div>

                  {priceAdjType !== 'none' && (
                    <div>
                      <label
                        htmlFor="bulk-price-val"
                        className="block text-[10px] font-mono uppercase tracking-widest text-[#8C7355] font-bold mb-1.5"
                      >
                        {priceAdjType === 'percent_discount'
                          ? 'Discount Percentage (%)'
                          : priceAdjType === 'percent_increase'
                          ? 'Markup Percentage (%)'
                          : priceAdjType === 'set_fixed'
                          ? 'New Fixed Price (£)'
                          : 'Amount to Add (£)'}
                      </label>
                      <div className="relative">
                        <input
                          id="bulk-price-val"
                          type="number"
                          step="any"
                          min="0"
                          value={priceAdjValue}
                          onChange={(e) => setPriceAdjValue(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                          required
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-mono text-[#767670]">
                          {priceAdjType.includes('percent') ? '%' : '£'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Sample Calculator Preview */}
                {priceAdjType !== 'none' && priceAdjValue && (
                  <div className="bg-[#8C7355]/10 border border-[#8C7355]/25 p-3 text-xs font-mono text-[#1A1A1A] space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-[#8C7355] block">
                      Preview Adjustment:
                    </span>
                    <p>
                      A garment currently priced at <span className="font-bold">£100.00</span> will adjust to{' '}
                      <span className="font-bold text-[#8C7355]">
                        £
                        {(() => {
                          const v = parseFloat(priceAdjValue) || 0;
                          if (priceAdjType === 'set_fixed') return v.toFixed(2);
                          if (priceAdjType === 'percent_discount') return Math.max(0, 100 * (1 - v / 100)).toFixed(2);
                          if (priceAdjType === 'percent_increase') return (100 * (1 + v / 100)).toFixed(2);
                          if (priceAdjType === 'add_fixed') return Math.max(0, 100 + v).toFixed(2);
                          return '100.00';
                        })()}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: STATUS & FLAGS */}
          {activeTab === 'status' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Wardrobe Favorite & Archived Flags */}
              {targetType === 'wardrobe' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#E5E5E1] p-3.5 space-y-2">
                    <label
                      htmlFor="bulk-favorite-select"
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold"
                    >
                      Favorite Flag
                    </label>
                    <select
                      id="bulk-favorite-select"
                      value={targetFavorite}
                      onChange={(e) => setTargetFavorite(e.target.value)}
                      className="w-full bg-white border border-[#D5D5D0] p-2 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
                    >
                      <option value="__NO_CHANGE__">— No Change —</option>
                      <option value="yes">Mark as Favorite (Star)</option>
                      <option value="no">Remove from Favorites</option>
                    </select>
                  </div>

                  <div className="bg-white border border-[#E5E5E1] p-3.5 space-y-2">
                    <label
                      htmlFor="bulk-archive-select"
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold"
                    >
                      Archive Status
                    </label>
                    <select
                      id="bulk-archive-select"
                      value={targetArchived}
                      onChange={(e) => setTargetArchived(e.target.value)}
                      className="w-full bg-white border border-[#D5D5D0] p-2 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
                    >
                      <option value="__NO_CHANGE__">— No Change —</option>
                      <option value="yes">Move to Archive</option>
                      <option value="no">Active Wardrobe (Unarchive)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Shopping Status & Priority */}
              {targetType === 'shopping' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="bulk-shopping-status"
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                    >
                      Wishlist Pipeline Status
                    </label>
                    <select
                      id="bulk-shopping-status"
                      value={targetShoppingStatus}
                      onChange={(e) => setTargetShoppingStatus(e.target.value)}
                      className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
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
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                    >
                      Priority Level
                    </label>
                    <select
                      id="bulk-shopping-priority"
                      value={targetPriority}
                      onChange={(e) => setTargetPriority(e.target.value)}
                      className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
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

              {/* Resale Status & Shipping Status */}
              {(targetType === 'sales' || targetType === 'selling') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="bulk-selling-status"
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                    >
                      Resale Listing Status
                    </label>
                    <select
                      id="bulk-selling-status"
                      value={targetSellingStatus}
                      onChange={(e) => setTargetSellingStatus(e.target.value)}
                      className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
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
                      className="block text-[10px] font-mono uppercase tracking-widest text-[#767670] font-bold mb-1.5"
                    >
                      Shipping Stage
                    </label>
                    <select
                      id="bulk-shipping-status"
                      value={targetShippingStatus}
                      onChange={(e) => setTargetShippingStatus(e.target.value)}
                      className="w-full bg-white border border-[#D5D5D0] p-2.5 text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none cursor-pointer"
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
            </div>
          )}

          {/* Staged Changes Footnote */}
          {stagedSummary.length > 0 ? (
            <div className="p-3 bg-white border border-[#8C7355]/30 text-xs font-mono">
              <span className="font-bold text-[#8C7355] uppercase tracking-wider block mb-1">
                Staged Modifications for {count} Items:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[#1A1A1A]">
                {stagedSummary.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-2.5 bg-white border border-[#E5E5E1] text-[11px] font-mono text-[#767670] flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
              <span>Select attributes above to stage changes. Untouched fields will preserve existing values.</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E1] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#D5D5D0] text-xs font-mono text-[#4A4A45] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={stagedSummary.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider transition shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes to {count} Items</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
