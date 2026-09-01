import React from 'react';
import {
  X,
  Plus,
  Heart,
  Trash2,
  Edit2,
  Layers,
  Tag,
  DollarSign,
} from 'lucide-react';
import { WardrobeItem } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';

interface ItemDetailModalProps {
  item: WardrobeItem | null;
  onClose: () => void;
  onEdit: (item: WardrobeItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onEdit }) => {
  const {
    logItemWear,
    toggleItemFavorite,
    deleteItem,
    outfits,
    listWardrobeItemForSale,
    setActiveTab,
  } = useWardrobe();

  if (!item) return null;

  const itemTags = Array.isArray(item.tags) ? item.tags : [];
  const itemSeasons = Array.isArray(item.season)
    ? item.season
    : item.season
    ? [item.season as any]
    : ['All-Season'];

  const matchedOutfits = (outfits || []).filter(
    (o) => Array.isArray(o?.itemIds) && o.itemIds.includes(item.id)
  );

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleDelete = () => {
    deleteItem(item.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-lg flex flex-col justify-between">
        {/* Header Photo Box: Full Containment ensures whole photo is shown */}
        <div className="relative h-72 sm:h-88 bg-[#F8F7F4] overflow-hidden rounded-t-xl border-b border-[#E5E5E1] flex items-center justify-center p-3">
          <GarmentImage
            src={item.imageUrl}
            alt={item.name}
            category={item.category}
            className="w-full h-full max-h-full max-w-full object-contain"
            containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4]"
          />

          {/* Close & Actions */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={() => toggleItemFavorite(item.id)}
              className="p-1.5 rounded-full bg-white/95 text-[#1A1A1A] hover:text-rose-600 backdrop-blur-xs border border-[#E5E5E1] shadow-xs cursor-pointer"
            >
              <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/95 text-[#1A1A1A] hover:text-black backdrop-blur-xs border border-[#E5E5E1] shadow-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Brand Bar */}
        <div className="px-4 pt-3 pb-2 border-b border-[#E5E5E1] flex items-end justify-between bg-white">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C7355] font-bold">
              {item.brand}
            </span>
            <h2 className="text-lg font-serif font-bold text-[#1A1A1A] leading-tight">{item.name}</h2>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] text-[#767670]">Price</span>
            <div className="text-base font-bold text-[#1A1A1A]">{formatGbp(item.purchasePrice)}</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E5E5E1] text-center">
              <span className="text-[9px] font-mono text-[#767670] uppercase font-semibold">Valuation</span>
              <div className="text-base font-serif font-bold text-[#1A1A1A]">{formatGbp(item.purchasePrice)}</div>
              <span className="text-[9px] text-[#767670]">Acquired value</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E5E5E1] text-center">
              <span className="text-[9px] font-mono text-[#767670] uppercase font-semibold">Times Worn</span>
              <div className="text-base font-serif font-bold text-[#1A1A1A]">{item.wearCount}x</div>
              <span className="text-[9px] text-[#767670]">
                {item.lastWornDate ? `Last: ${item.lastWornDate}` : 'Never logged'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E5E5E1] text-center">
              <span className="text-[9px] font-mono text-[#767670] uppercase font-semibold">Condition</span>
              <div className="text-xs font-serif font-bold text-[#1A1A1A] mt-0.5">{item.condition}</div>
              <span className="text-[9px] text-[#767670]">{item.category}</span>
            </div>
          </div>

          {/* Detailed Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#F8F7F4] p-3 rounded-lg border border-[#E5E5E1]">
            <div>
              <span className="text-[#767670] font-mono text-[10px]">Color:</span>
              <p className="text-[#1A1A1A] font-semibold">{item.color}</p>
            </div>

            <div>
              <span className="text-[#767670] font-mono text-[10px]">Season:</span>
              <p className="text-[#1A1A1A] font-semibold">{itemSeasons.join(', ')}</p>
            </div>

            <div>
              <span className="text-[#767670] font-mono text-[10px]">Size / Fit:</span>
              <p className="text-[#1A1A1A] font-semibold">{item.size || 'Standard Fit'}</p>
            </div>

            <div>
              <span className="text-[#767670] font-mono text-[10px]">Material:</span>
              <p className="text-[#1A1A1A] font-semibold">{item.material || 'Natural fabric'}</p>
            </div>

            <div>
              <span className="text-[#767670] font-mono text-[10px]">Storage Location:</span>
              <p className="text-[#1A1A1A] font-semibold">{item.storageLocation || 'Main Closet'}</p>
            </div>

            <div>
              <span className="text-[#767670] font-mono text-[10px]">Purchase Date:</span>
              <p className="text-[#1A1A1A] font-semibold">{item.purchaseDate || 'Unknown'}</p>
            </div>
          </div>

          {/* Vinted Acquisition Provenance */}
          {(item.seller || item.orderStatus || item.transactionType || item.orderValue || item.retailerName === 'Vinted' || itemTags.includes('vinted')) && (
            <div className="p-3 bg-[#F0F8F8] border border-[#BCE4E6] rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[#007782]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#007782]"></span>
                  Vinted Provenance & Order Log
                </span>
                {item.transactionType && (
                  <span className="px-2 py-0.5 bg-[#007782] text-white rounded-xs text-[10px]">
                    {item.transactionType}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-[#4A4A45]">
                {item.seller && (
                  <div>
                    <span className="text-[#00606A] text-[10px] block">Seller:</span>
                    <strong className="text-[#1A1A1A]">@{item.seller.replace(/^@/, '')}</strong>
                  </div>
                )}
                {item.orderStatus && (
                  <div>
                    <span className="text-[#00606A] text-[10px] block">Status:</span>
                    <strong className="text-[#1A1A1A]">{item.orderStatus}</strong>
                  </div>
                )}
                {item.orderValue !== undefined && (
                  <div>
                    <span className="text-[#00606A] text-[10px] block">Order Value:</span>
                    <strong className="text-[#1A1A1A]">{formatGbp(item.orderValue)}</strong>
                  </div>
                )}
                {item.walletAmount !== undefined && (
                  <div>
                    <span className="text-[#00606A] text-[10px] block">Wallet Amount:</span>
                    <strong className="text-[#1A1A1A]">{formatGbp(item.walletAmount)}</strong>
                  </div>
                )}
                {item.lastUpdatedDate && (
                  <div>
                    <span className="text-[#00606A] text-[10px] block">Last Updated:</span>
                    <strong className="text-[#1A1A1A]">{item.lastUpdatedDate}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Care Notes & Sartorial Notes */}
          {(item.careNotes || item.notes) && (
            <div className="space-y-1.5 p-3 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1] text-xs">
              {item.careNotes && (
                <div>
                  <span className="text-[#8C7355] font-mono font-semibold">Care Directives: </span>
                  <span className="text-[#5A5A55]">{item.careNotes}</span>
                </div>
              )}
              {item.notes && (
                <div>
                  <span className="text-[#767670] font-mono font-semibold">Notes: </span>
                  <span className="text-[#5A5A55]">{item.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Lookbook Formulations using this item */}
          {matchedOutfits.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[#767670] uppercase tracking-wider font-semibold">
                Featured in {matchedOutfits.length} Lookbook Formulations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {matchedOutfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F7F4] border border-[#E5E5E1] text-xs text-[#1A1A1A]"
                  >
                    <Layers className="w-3 h-3 text-[#8C7355]" />
                    <span className="font-semibold">{outfit.title}</span>
                    <span className="text-[10px] text-[#767670] font-mono">({outfit.occasion})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {itemTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {itemTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#F8F7F4] text-[#767670] border border-[#E5E5E1] font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#E5E5E1] flex items-center justify-between gap-3 bg-[#F8F7F4] rounded-b-xl">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onEdit(item);
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] rounded-md border border-[#E5E5E1] transition-colors cursor-pointer shadow-2xs"
              title="Open Full Edit Modal"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Full Edit Mode</span>
            </button>

            <button
              onClick={() => {
                listWardrobeItemForSale(item, {
                  listingPrice: item.purchasePrice,
                  platform: 'Vinted',
                  condition: item.condition,
                });
                setActiveTab('selling');
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-md border border-amber-300 transition-colors cursor-pointer shadow-2xs"
              title="List piece on Resale Studio"
            >
              <DollarSign className="w-3 h-3 text-amber-700" />
              List for Sale
            </button>

            <button
              onClick={handleDelete}
              className="p-1.5 text-[#767670] hover:text-rose-600 rounded-md hover:bg-white transition-colors cursor-pointer"
              title="Delete Item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => logItemWear(item.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Wear for Today (+1)
          </button>
        </div>
      </div>
    </div>
  );
};

