import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Check,
  ShoppingBag,
  Shirt,
  Calendar,
  Layers,
  Heart,
  Edit2,
  Trash2,
  Tag,
  Palette,
  Sparkles,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { LookbookOutfit, WardrobeItem, LookbookOutfitPiece } from '../types';
import { GarmentImage } from './GarmentImage';

interface EditorialLookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: LookbookOutfit | null;
  onEdit: (outfit: LookbookOutfit) => void;
  onSelectItem: (item: WardrobeItem) => void;
  onRecreateWithWardrobe?: (outfit: LookbookOutfit) => void;
}

export const EditorialLookbookModal: React.FC<EditorialLookbookModalProps> = ({
  isOpen,
  onClose,
  outfit,
  onEdit,
  onSelectItem,
  onRecreateWithWardrobe,
}) => {
  const {
    items,
    toggleOutfitFavorite,
    deleteOutfit,
    logOutfitWear,
    addShoppingItem,
  } = useWardrobe();

  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [addedWishlistGaps, setAddedWishlistGaps] = useState<Set<string>>(new Set());

  if (!isOpen || !outfit) return null;

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const outfitItems = (outfit.itemIds || [])
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as WardrobeItem[];

  const totalCalculatedValuation = outfitItems.reduce(
    (acc, i) => acc + (Number(i.purchasePrice) || 0),
    0
  );

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const handleAddPieceToWishlist = (piece: LookbookOutfitPiece) => {
    if (addedWishlistGaps.has(piece.name)) return;

    addShoppingItem({
      name: piece.name,
      brand: piece.suggestedBrand || 'Curated Heritage',
      category: piece.category,
      estimatedPrice: piece.estimatedPrice || 150,
      priority: 'High',
      status: 'Researching',
      season: outfit.season || 'Autumn',
      matchingWardrobeItemIds: items.slice(0, 3).map((i) => i.id),
      imageUrl: outfit.imageUrl || '',
      reasonOrGap: `Gap from Lookbook idea "${outfit.title}": ${piece.color || ''} piece.`,
      estimatedWearsPerYear: 30,
      tags: ['Lookbook Gap', outfit.aesthetic || 'Editorial Research'],
    });

    setAddedWishlistGaps((prev) => new Set([...prev, piece.name]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F7] border border-[#D5D5D0] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#1A1A1A]">
        {/* Top bar */}
        <div className="bg-[#1A1A1A] text-white px-5 py-3 flex items-center justify-between border-b border-[#333]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider text-[#8C7355] uppercase">
              {outfit.isEditorialIdea ? 'Editorial Research Formulation' : 'Wardrobe Lookbook Formula'}
            </span>
            <span className="text-[#666]">|</span>
            <span className="text-xs font-mono text-[#D5D5D0]">{outfit.occasion}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleOutfitFavorite(outfit.id)}
              className="p-1.5 text-[#D5D5D0] hover:text-rose-400 cursor-pointer transition-colors"
              title="Toggle favorite"
            >
              <Heart
                className={`w-4 h-4 ${
                  outfit.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#A5A59E] hover:text-white rounded cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: High-Res Editorial Photography (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="aspect-[3/4] bg-stone-100 border border-[#E5E5E1] shadow-xs relative overflow-hidden group">
              {outfit.imageUrl ? (
                <img
                  src={outfit.imageUrl}
                  alt={outfit.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid grid-cols-2 bg-[#F8F7F4] p-2 gap-2">
                  {outfitItems.map((item) => (
                    <div key={item.id} className="border border-[#E5E5E1] bg-white p-1 flex items-center justify-center">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full object-contain"
                        showPlaceholderLabel={false}
                      />
                    </div>
                  ))}
                </div>
              )}

              {outfit.photographicMood && (
                <span className="absolute bottom-2 left-2 text-[10px] font-mono px-2 py-0.5 bg-black/80 text-white backdrop-blur-xs">
                  {outfit.photographicMood}
                </span>
              )}
            </div>

            {/* Source & Attribution */}
            {outfit.inspirationSource && (
              <div className="p-3 bg-white border border-[#E5E5E1] flex items-center justify-between text-xs font-mono">
                <span className="text-[#767670]">Source:</span>
                <div className="flex items-center gap-1.5 font-medium text-[#8C7355]">
                  <span>{outfit.inspirationSource}</span>
                  {outfit.sourceUrl && (
                    <a
                      href={outfit.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#1A1A1A] transition-colors"
                      title="Open source article / photograph"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Color Story Palette */}
            {Array.isArray(outfit.colorPalette) && outfit.colorPalette.length > 0 && (
              <div className="p-3.5 bg-white border border-[#E5E5E1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-[#767670] uppercase">
                    Harmonious Palette:
                  </span>
                  {copiedHex && (
                    <span className="text-[10px] font-mono text-emerald-700 animate-fadeIn">
                      Copied {copiedHex}!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {outfit.colorPalette.map((hex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleCopyHex(hex)}
                      style={{ backgroundColor: hex }}
                      className="w-8 h-8 rounded-sm border border-black/20 shadow-xs flex items-center justify-center text-[9px] font-mono text-white transition-transform hover:scale-110 cursor-pointer"
                      title={`Click to copy ${hex}`}
                    >
                      {copiedHex === hex && <Check className="w-4 h-4 stroke-[3] text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Editorial Analysis & Pieces (7 cols) */}
          <div className="md:col-span-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {outfit.aesthetic && (
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 bg-[#8C7355]/10 text-[#8C7355] border border-[#8C7355]/30">
                    {outfit.aesthetic}
                  </span>
                )}
                <span className="text-xs font-mono px-2 py-0.5 bg-white text-[#1A1A1A] border border-[#E5E5E1]">
                  {outfit.occasion}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 bg-white text-[#1A1A1A] border border-[#E5E5E1]">
                  {outfit.season}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h2 className="text-xl font-serif font-bold text-[#1A1A1A] leading-tight">
                  {outfit.title}
                </h2>
                {outfit.description && (
                  <p className="text-xs text-[#767670] leading-relaxed">
                    {outfit.description}
                  </p>
                )}
              </div>

              {/* Tags */}
              {Array.isArray(outfit.tags) && outfit.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {outfit.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 bg-white border border-[#E5E5E1] text-[#767670]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Garments Breakdown (if editorial pieces exist) */}
              {Array.isArray(outfit.pieceBreakdown) && outfit.pieceBreakdown.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#E5E5E1]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-[#1A1A1A]">
                      Editorial Garment Formula
                    </span>
                    <span className="text-[11px] font-mono text-[#767670]">
                      {outfit.pieceBreakdown.length} Blueprint Pieces
                    </span>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {outfit.pieceBreakdown.map((piece, idx) => {
                      const matchedItem = piece.matchedWardrobeItemId
                        ? items.find((i) => i.id === piece.matchedWardrobeItemId)
                        : null;
                      const isAddedToWishlist = addedWishlistGaps.has(piece.name);

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-[#E5E5E1] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#1A1A1A] truncate">{piece.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FAF9F7] text-[#767670] border border-[#E5E5E1]">
                                {piece.category}
                              </span>
                              {piece.color && (
                                <span className="text-[10px] text-[#8C7355] font-mono">
                                  {piece.color}
                                </span>
                              )}
                            </div>
                            {piece.suggestedBrand && (
                              <p className="text-[11px] text-[#767670] truncate">
                                Suggested: {piece.suggestedBrand}
                              </p>
                            )}
                            {piece.stylingRole && (
                              <p className="text-[10px] text-[#8C7355] italic truncate">
                                {piece.stylingRole}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {matchedItem ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectItem(matchedItem);
                                  onClose();
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-medium hover:bg-emerald-100 cursor-pointer"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>In Closet: {matchedItem.name}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddPieceToWishlist(piece)}
                                disabled={isAddedToWishlist}
                                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                                  isAddedToWishlist
                                    ? 'bg-stone-100 text-[#767670] border-[#D5D5D0]'
                                    : 'bg-[#F8F7F4] hover:bg-[#8C7355] text-[#8C7355] hover:text-white border-[#8C7355]'
                                }`}
                              >
                                {isAddedToWishlist ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Added to Wishlist</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>Send Gap to Wishlist</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Linked Wardrobe Pieces (if wardrobe outfit) */}
              {outfitItems.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#E5E5E1]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-[#1A1A1A]">
                      Assembled Wardrobe Pieces ({outfitItems.length})
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#8C7355]">
                      Total Closet Valuation: {formatGbp(totalCalculatedValuation)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {outfitItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectItem(item);
                          onClose();
                        }}
                        className="p-2 bg-white border border-[#E5E5E1] hover:border-[#8C7355] cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <div className="w-9 h-9 flex-shrink-0 bg-[#FAF9F7] border border-[#E5E5E1] overflow-hidden">
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            category={item.category}
                            className="w-full h-full object-contain"
                            showPlaceholderLabel={false}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#1A1A1A] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#767670] font-mono">{formatGbp(item.purchasePrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs font-mono text-[#767670]">
                <span>
                  Worn: <strong className="text-[#1A1A1A]">{outfit.timesWorn} times</strong>
                </span>
                {outfit.lastWornDate && (
                  <span>
                    Last: <strong className="text-[#1A1A1A]">{outfit.lastWornDate}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    logOutfitWear(outfit.id);
                    onClose();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-medium bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#D5D5D0] cursor-pointer transition-colors shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#8C7355]" />
                  <span>Wear Today</span>
                </button>

                {onRecreateWithWardrobe && (
                  <button
                    type="button"
                    onClick={() => {
                      onRecreateWithWardrobe(outfit);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-medium bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#D5D5D0] cursor-pointer transition-colors shadow-xs"
                  >
                    <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Recreate with Wardrobe</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onEdit(outfit);
                    onClose();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white cursor-pointer transition-colors shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Formula</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
