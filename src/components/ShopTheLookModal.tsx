import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Check,
  ShoppingBag,
  Sparkles,
  Filter,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpRight,
  Store,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  ShopTheLookItem,
  WardrobeItem,
  LookbookOutfit,
  Category,
  Season,
} from '../types';
import {
  searchShopTheLook,
  POPULAR_RETAILERS,
  buildRetailerSearchUrl,
} from '../services/shopTheLookService';
import { formatGbp } from '../utils/formatters';
import { GarmentImage } from './GarmentImage';

interface ShopTheLookModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: WardrobeItem | null;
  outfit?: LookbookOutfit | null;
  targetPiece?: { name: string; category?: string; brand?: string } | null;
  initialQuery?: string;
}

export const ShopTheLookModal: React.FC<ShopTheLookModalProps> = ({
  isOpen,
  onClose,
  item,
  outfit,
  targetPiece,
  initialQuery,
}) => {
  const { addShoppingItem, items: wardrobeItems } = useWardrobe();

  // Active query and filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [budgetRange, setBudgetRange] = useState<'all' | 'budget' | 'mid' | 'luxury'>('all');
  const [selectedPieceFilter, setSelectedPieceFilter] = useState<string>('all');

  // Loading and results
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ShopTheLookItem[]>([]);
  const [engineUsed, setEngineUsed] = useState<string>('curated_retail_matcher');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Initialize query based on passed props
  useEffect(() => {
    if (!isOpen) return;

    let defaultQuery = '';
    let defaultCat = 'All';

    if (initialQuery) {
      defaultQuery = initialQuery;
    } else if (targetPiece) {
      defaultQuery = `${targetPiece.brand || ''} ${targetPiece.name}`.trim();
      defaultCat = targetPiece.category || 'All';
    } else if (item) {
      defaultQuery = `${item.brand} ${item.name}`.trim();
      defaultCat = item.category || 'All';
    } else if (outfit) {
      defaultQuery = outfit.title;
      defaultCat = 'All';
    }

    setSearchQuery(defaultQuery);
    setActiveCategory(defaultCat);
    setSelectedPieceFilter('all');
    performSearch(defaultQuery, defaultCat, 'all');
  }, [isOpen, item, outfit, targetPiece, initialQuery]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Perform search
  const performSearch = async (
    query: string,
    cat: string,
    budget: 'all' | 'budget' | 'mid' | 'luxury'
  ) => {
    setIsLoading(true);
    setStatusNotification(null);

    try {
      const response = await searchShopTheLook({
        item: item || undefined,
        outfit: outfit || undefined,
        targetPieceName: targetPiece?.name,
        targetPieceCategory: cat !== 'All' ? cat : undefined,
        customQuery: query.trim(),
        budgetRange: budget,
        limit: 9,
      });

      if (response && response.items) {
        setResults(response.items);
        setEngineUsed(response.engine);
      }
    } catch (err) {
      console.warn('Shop the look search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery, activeCategory, budgetRange);
  };

  // Add item to 'To Buy' shopping list
  const handleAddToWishlist = (shopItem: ShopTheLookItem) => {
    if (addedItemIds.has(shopItem.id)) return;

    try {
      addShoppingItem({
        name: shopItem.title,
        brand: shopItem.brand || '',
        category: (shopItem.category as Category) || '',
        estimatedPrice: shopItem.priceGbp || 100,
        status: 'To Buy',
        priority: 'High',
        season: (shopItem.season as Season) || 'All-Season',
        storeUrl: shopItem.productUrl,
        targetStoreUrl: shopItem.productUrl,
        retailerName: shopItem.retailer,
        imageUrl: shopItem.imageUrl || '',
        reasonOrGap: `Found via Shop the Look for "${item?.name || outfit?.title || searchQuery}": ${shopItem.similarityReason || 'Similar purchase alternative'}`,
        matchingWardrobeItemIds: wardrobeItems.slice(0, 3).map((w) => w.id),
        tags: ['Shop the Look', shopItem.retailer, shopItem.brand],
      });

      setAddedItemIds((prev) => new Set([...prev, shopItem.id]));
      showToast(`Added "${shopItem.title}" to your 'To Buy' list!`);
    } catch (err: any) {
      console.error('Failed to add to shopping list:', err);
    }
  };

  // Extract pieces if browsing an outfit
  const outfitPieces = outfit?.pieceBreakdown || [];

  // Filter results based on budget filter
  const filteredResults = results.filter((it) => {
    if (budgetRange === 'budget' && it.priceGbp > 100) return false;
    if (budgetRange === 'mid' && (it.priceGbp < 100 || it.priceGbp > 250)) return false;
    if (budgetRange === 'luxury' && it.priceGbp < 250) return false;
    return true;
  });

  const headerTitle = targetPiece
    ? targetPiece.name
    : item
    ? `${item.brand} ${item.name}`
    : outfit
    ? outfit.title
    : searchQuery || 'Shop the Look';

  const headerCategory = targetPiece?.category || item?.category || outfit?.occasion || 'Wardrobe';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F7] border border-[#D5D5D0] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#1A1A1A] rounded-xl">
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#333] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355]/20 border border-[#8C7355]/40 flex items-center justify-center text-[#8C7355] shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#8C7355] uppercase">
                  Shop the Look
                </span>
                <span className="text-[#666]">|</span>
                <span className="text-xs font-mono text-[#D5D5D0] truncate">
                  {headerTitle}
                </span>
              </div>
              <p className="text-[11px] text-[#A5A59E] truncate">
                Find similar garments available for purchase online across verified stockists
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-[#A5A59E] hover:text-white rounded-md hover:bg-white/10 cursor-pointer transition-colors"
              title="Close Shop the Look"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Context Banner */}
        <div className="bg-white border-b border-[#E5E5E1] p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {/* Thumbnail Preview */}
            <div className="w-11 h-11 rounded-lg border border-[#E5E5E1] bg-[#F8F7F4] overflow-hidden shrink-0 flex items-center justify-center">
              {item ? (
                <GarmentImage
                  src={item.imageUrl}
                  alt={item.name}
                  category={item.category}
                  className="w-full h-full object-contain p-1"
                  showPlaceholderLabel={false}
                />
              ) : outfit?.imageUrl ? (
                <img
                  src={outfit.imageUrl}
                  alt={outfit.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Sparkles className="w-5 h-5 text-[#8C7355]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#1A1A1A]">
                  {headerTitle}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF9F7] text-[#8C7355] border border-[#E5E5E1]">
                  {headerCategory}
                </span>
              </div>
              <p className="text-[11px] text-[#767670]">
                {item
                  ? `Comparing similar cuts, silhouettes, and fabrics to your closet piece`
                  : outfit
                  ? `Shop the lookbook formula or individual component pieces`
                  : `Online shopping search & recommendations`}
              </p>
            </div>
          </div>

          {/* Quick External Retailer Search Hub */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-mono text-[#767670] uppercase font-semibold mr-1 shrink-0">
              Direct Search:
            </span>
            <a
              href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery || headerTitle)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] transition-colors shrink-0"
              title="Search Google Shopping in new tab"
            >
              <span>Google Shopping</span>
              <ArrowUpRight className="w-3 h-3 text-[#8C7355]" />
            </a>
            <a
              href={buildRetailerSearchUrl('MR PORTER', item?.brand || '', searchQuery || headerTitle)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] transition-colors shrink-0"
              title="Search MR PORTER"
            >
              <span>MR PORTER</span>
              <ArrowUpRight className="w-3 h-3 text-[#8C7355]" />
            </a>
            <a
              href={buildRetailerSearchUrl('End Clothing', item?.brand || '', searchQuery || headerTitle)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] transition-colors shrink-0"
              title="Search End Clothing"
            >
              <span>End Clothing</span>
              <ArrowUpRight className="w-3 h-3 text-[#8C7355]" />
            </a>
            <a
              href={buildRetailerSearchUrl('eBay UK', item?.brand || '', searchQuery || headerTitle)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] transition-colors shrink-0"
              title="Search eBay UK"
            >
              <span>eBay UK</span>
              <ArrowUpRight className="w-3 h-3 text-[#8C7355]" />
            </a>
          </div>
        </div>

        {/* Outfit Pieces Chips (if browsing an outfit) */}
        {outfitPieces.length > 0 && (
          <div className="bg-[#F8F7F4] px-5 py-2 border-b border-[#E5E5E1] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-mono text-[#767670] uppercase font-bold shrink-0">
              Pieces in Look:
            </span>
            <button
              onClick={() => {
                setSelectedPieceFilter('all');
                setSearchQuery(outfit.title);
                performSearch(outfit.title, 'All', budgetRange);
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                selectedPieceFilter === 'all'
                  ? 'bg-[#8C7355] text-white font-bold'
                  : 'bg-white text-[#5A5A55] border border-[#E5E5E1] hover:bg-[#F3F2EE]'
              }`}
            >
              Entire Look
            </button>
            {outfitPieces.map((piece, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedPieceFilter(piece.name);
                  const q = `${piece.suggestedBrand || ''} ${piece.name}`.trim();
                  setSearchQuery(q);
                  setActiveCategory(piece.category);
                  performSearch(q, piece.category, budgetRange);
                }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedPieceFilter === piece.name
                    ? 'bg-[#8C7355] text-white font-bold'
                    : 'bg-white text-[#5A5A55] border border-[#E5E5E1] hover:bg-[#F3F2EE]'
                }`}
              >
                <span>{piece.name}</span>
                <span className="text-[9px] opacity-75">({piece.category})</span>
              </button>
            ))}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="p-4 bg-white border-b border-[#E5E5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#767670] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search piece, brand, silhouette or fabric (e.g. Arket wool overcoat)..."
                className="w-full pl-9 pr-4 py-2 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg text-xs text-[#1A1A1A] placeholder-[#8A8A85] focus:outline-hidden focus:ring-1 focus:ring-[#8C7355] focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Online</span>
                </>
              )}
            </button>
          </form>

          {/* Budget Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#FAF9F7] p-1 border border-[#E5E5E1] rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => {
                setBudgetRange('all');
                performSearch(searchQuery, activeCategory, 'all');
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                budgetRange === 'all'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              All Tiers
            </button>
            <button
              type="button"
              onClick={() => {
                setBudgetRange('budget');
                performSearch(searchQuery, activeCategory, 'budget');
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                budgetRange === 'budget'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
              title="Accessible high-street alternatives under £100"
            >
              &lt; £100
            </button>
            <button
              type="button"
              onClick={() => {
                setBudgetRange('mid');
                performSearch(searchQuery, activeCategory, 'mid');
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                budgetRange === 'mid'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
              title="Contemporary premium pieces £100 - £250"
            >
              £100 - £250
            </button>
            <button
              type="button"
              onClick={() => {
                setBudgetRange('luxury');
                performSearch(searchQuery, activeCategory, 'luxury');
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                budgetRange === 'luxury'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
              title="Designer & investment pieces £250+"
            >
              £250+
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusNotification && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-mono text-emerald-800 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {statusNotification}
            </span>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#8C7355] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-serif font-bold text-[#1A1A1A]">
                Scouting Retail Stockists Online...
              </p>
              <p className="text-xs text-[#767670] max-w-sm text-center">
                Comparing cuts, silhouettes, materials, and direct links from UK &amp; global retailers.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-[#767670] mx-auto opacity-50" />
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                No direct matches found in this budget tier
              </h3>
              <p className="text-xs text-[#767670] max-w-md mx-auto">
                Try broadening the budget tier or searching with a simpler garment keyword like "wool trench" or "oxford shirt".
              </p>
              <button
                onClick={() => {
                  setBudgetRange('all');
                  performSearch(searchQuery, 'All', 'all');
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-white border border-[#E5E5E1] rounded-md text-[#8C7355] hover:bg-[#F3F2EE] cursor-pointer"
              >
                Reset Budget Filter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#767670]">
                <span>
                  Found <strong>{filteredResults.length}</strong> purchase alternatives available online
                </span>
                <span className="font-mono text-[10px]">
                  Engine: {engineUsed === 'gemini_search_grounded' ? 'Gemini Live Search Grounded' : 'Curated Verified Stockists'}
                </span>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.map((shopItem) => {
                  const isAdded = addedItemIds.has(shopItem.id);

                  return (
                    <div
                      key={shopItem.id}
                      className="bg-white border border-[#E5E5E1] hover:border-[#8C7355] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      {/* Product Image */}
                      <div className="relative aspect-[4/3] bg-[#F8F7F4] overflow-hidden border-b border-[#E5E5E1]">
                        {shopItem.imageUrl ? (
                          <img
                            src={shopItem.imageUrl}
                            alt={shopItem.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#767670]">
                            <ShoppingBag className="w-8 h-8 opacity-40" />
                          </div>
                        )}

                        {/* Badges Overlay */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-white font-semibold backdrop-blur-xs">
                            {shopItem.retailer}
                          </span>
                        </div>

                        {/* Similarity Score Badge */}
                        {shopItem.similarityScore && (
                          <div className="absolute top-2.5 right-2.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold shadow-xs">
                              {shopItem.similarityScore}% Match
                            </span>
                          </div>
                        )}

                        {/* Price Tag Overlay */}
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/95 text-[#1A1A1A] border border-[#E5E5E1] shadow-xs">
                            {formatGbp(shopItem.priceGbp)}
                            {shopItem.originalPriceGbp && (
                              <span className="text-[10px] text-[#767670] line-through ml-1 font-normal">
                                {formatGbp(shopItem.originalPriceGbp)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Product Meta & Details */}
                      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#767670]">
                            <span className="font-semibold text-[#8C7355] truncate">
                              {shopItem.brand}
                            </span>
                            <span className="font-mono text-[10px]">{shopItem.category}</span>
                          </div>

                          <h4 className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1 group-hover:text-[#8C7355] transition-colors">
                            {shopItem.title}
                          </h4>

                          {shopItem.similarityReason && (
                            <p className="text-[11px] text-[#767670] line-clamp-2 leading-relaxed">
                              {shopItem.similarityReason}
                            </p>
                          )}

                          {/* Material & Color Specs */}
                          {(shopItem.material || shopItem.color) && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {shopItem.color && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F7] text-[#5A5A55] border border-[#E5E5E1]">
                                  {shopItem.color}
                                </span>
                              )}
                              {shopItem.material && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F7] text-[#5A5A55] border border-[#E5E5E1]">
                                  {shopItem.material}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions: Direct Retailer Link + Add to To-Buy List */}
                        <div className="pt-2 border-t border-[#E5E5E1] flex items-center gap-2">
                          <a
                            href={shopItem.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1.5 px-2.5 text-xs font-mono font-medium rounded-lg bg-[#FAF9F7] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title={`Open product page on ${shopItem.retailer}`}
                          >
                            <span>Visit Retailer</span>
                            <ExternalLink className="w-3 h-3 text-[#8C7355]" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleAddToWishlist(shopItem)}
                            disabled={isAdded}
                            className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                              isAdded
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-[#8C7355] hover:bg-[#786248] text-white'
                            }`}
                            title="Add directly to your wardrobe 'To Buy' wishlist"
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Added to 'To Buy'</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>+ Add to 'To Buy'</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#F8F7F4] border-t border-[#E5E5E1] flex flex-wrap items-center justify-between text-xs text-[#767670] shrink-0">
          <div className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-[#8C7355]" />
            <span>Curated from leading UK &amp; European menswear &amp; womenswear stockists.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E5E1] rounded-md hover:bg-[#F3F2EE] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
