import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Shirt,
  ShoppingBag,
  Tag,
  Layers,
  Sparkles,
  ArrowRight,
  PoundSterling,
  ExternalLink,
  CornerDownLeft,
} from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { WardrobeItem, ShoppingItem, SaleItem, LookbookOutfit } from '../../types';
import { formatGbp } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: WardrobeItem) => void;
  onEditShoppingItem?: (item: ShoppingItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  onEditShoppingItem,
}) => {
  const {
    items,
    shoppingList,
    saleItems,
    outfits,
    setActiveTab,
  } = useWardrobe();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global search filtering across Wardrobe, Shopping, Resale, and Outfits
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        wardrobe: items.slice(0, 4),
        shopping: shoppingList.slice(0, 3),
        sales: saleItems.slice(0, 3),
        outfits: outfits.slice(0, 2),
        totalCount: items.length + shoppingList.length + saleItems.length + outfits.length,
      };
    }

    const matchesQuery = (text?: string | null) => Boolean(text && text.toLowerCase().includes(q));

    const matchedWardrobe = items.filter(
      (item) =>
        matchesQuery(item.name) ||
        matchesQuery(item.brand) ||
        matchesQuery(item.category) ||
        matchesQuery(item.color) ||
        matchesQuery(item.material) ||
        (item.tags || []).some((t) => matchesQuery(t))
    );

    const matchedShopping = shoppingList.filter(
      (item) =>
        matchesQuery(item.name) ||
        matchesQuery(item.brand) ||
        matchesQuery(item.category) ||
        matchesQuery(item.retailerName) ||
        (item.tags || []).some((t) => matchesQuery(t))
    );

    const matchedSales = saleItems.filter(
      (item) =>
        matchesQuery(item.name) ||
        matchesQuery(item.brand) ||
        matchesQuery(item.category) ||
        matchesQuery(item.platform) ||
        matchesQuery(item.buyerUsername)
    );

    const matchedOutfits = outfits.filter(
      (outfit) =>
        matchesQuery(outfit.title) ||
        matchesQuery(outfit.occasion) ||
        matchesQuery(outfit.description) ||
        (outfit.tags || []).some((t) => matchesQuery(t))
    );

    return {
      wardrobe: matchedWardrobe,
      shopping: matchedShopping,
      sales: matchedSales,
      outfits: matchedOutfits,
      totalCount:
        matchedWardrobe.length +
        matchedShopping.length +
        matchedSales.length +
        matchedOutfits.length,
    };
  }, [query, items, shoppingList, saleItems, outfits]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Search"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#E5E5E1] shadow-2xl overflow-hidden mt-8 sm:mt-16 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E5E1] bg-[#FDFCFB]">
          <Search className="w-5 h-5 text-[#8C7355] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search garments, wishlist, sales listings, brands, materials or looks..."
            className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder-[#9A9A95] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#9A9A95] hover:text-[#1A1A1A] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono text-[#9A9A95] hidden sm:inline px-1.5 py-0.5 border border-[#E5E5E1] bg-white rounded-xs">
            ESC to close
          </span>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E5E1] p-3 space-y-4">
          {/* Wardrobe Hits */}
          {results.wardrobe.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#8C7355]">
                  <Shirt className="w-3.5 h-3.5" />
                  <span>Wardrobe Closet ({results.wardrobe.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('wardrobe');
                    onClose();
                  }}
                  className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] flex items-center gap-0.5"
                >
                  View Wardrobe <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.wardrobe.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onSelectItem) onSelectItem(item);
                      setActiveTab('wardrobe');
                      onClose();
                    }}
                    className="p-2.5 bg-[#FAF9F6] hover:bg-[#F2F1ED] border border-[#E5E5E1] flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 object-cover bg-white border border-[#E5E5E1] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[#EFECE6] border border-[#E5E5E1] flex items-center justify-center text-[#8C7355] shrink-0">
                        <Shirt className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-bold truncate">
                        {item.brand || 'Unbranded'}
                      </p>
                      <h4 className="text-xs font-serif font-bold text-[#1A1A1A] truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-mono text-[#767670]">
                        {formatGbp(item.purchasePrice)} • {item.wearCount} wears
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shopping Wishlist Hits */}
          {results.shopping.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#8C7355]">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Shopping Wishlist ({results.shopping.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('shopping');
                    onClose();
                  }}
                  className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] flex items-center gap-0.5"
                >
                  View Wishlist <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.shopping.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onEditShoppingItem) onEditShoppingItem(item);
                      setActiveTab('shopping');
                      onClose();
                    }}
                    className="p-2.5 bg-[#FAF9F6] hover:bg-[#F2F1ED] border border-[#E5E5E1] flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono uppercase text-[#8C7355] font-bold truncate">
                          {item.brand || item.retailerName || 'Wishlist'}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-stone-200 text-[#4A4A45]">
                          {item.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-serif font-bold text-[#1A1A1A] truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-mono text-[#767670]">
                        {formatGbp(item.estimatedPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Listing Hits */}
          {results.sales.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#007782]">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Selling / Resale ({results.sales.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('selling');
                    onClose();
                  }}
                  className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] flex items-center gap-0.5"
                >
                  View Resale <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.sales.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveTab('selling');
                      onClose();
                    }}
                    className="p-2.5 bg-[#FAF9F6] hover:bg-[#F2F1ED] border border-[#E5E5E1] flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono uppercase text-[#007782] font-bold truncate">
                          {item.platform} • {item.status}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#1A1A1A]">
                          {formatGbp(item.listingPrice)}
                        </span>
                      </div>
                      <h4 className="text-xs font-serif font-bold text-[#1A1A1A] truncate">
                        {item.name}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outfits Hits */}
          {results.outfits.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#8C7355]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Lookbook Outfits ({results.outfits.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('lookbook');
                    onClose();
                  }}
                  className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] flex items-center gap-0.5"
                >
                  View Lookbook <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.outfits.slice(0, 4).map((outfit) => (
                  <div
                    key={outfit.id}
                    onClick={() => {
                      setActiveTab('lookbook');
                      onClose();
                    }}
                    className="p-2.5 bg-[#FAF9F6] hover:bg-[#F2F1ED] border border-[#E5E5E1] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-serif font-bold text-[#1A1A1A] truncate">
                        {outfit.title}
                      </h4>
                      <p className="text-[10px] font-mono text-[#767670]">
                        {outfit.occasion} • {outfit.itemIds?.length || 0} pieces
                      </p>
                    </div>
                    {outfit.isEditorialIdea && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300">
                        Editorial
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {results.totalCount === 0 && (
            <div className="text-center py-10">
              <Search className="w-8 h-8 text-[#9A9A95] mx-auto mb-2" />
              <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">
                No items found for &ldquo;{query}&rdquo;
              </h4>
              <p className="text-xs text-[#767670] mt-1">
                Try searching for specific brands (e.g. Arket, Barbour, Zara), fabrics (e.g. wool, silk), or colors.
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#F8F7F4] border-t border-[#E5E5E1] flex items-center justify-between text-[11px] font-mono text-[#767670]">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-[#D5D5D0] rounded-xs font-bold text-[#1A1A1A]">Ctrl+K</kbd> anywhere to open</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-[#1A1A1A] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
