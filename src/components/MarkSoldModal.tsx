import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  PoundSterling,
  Truck,
  User,
  Calculator,
  Archive,
  Tag,
  Sparkles,
} from 'lucide-react';
import { SaleItem, SellingPlatform } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';

interface MarkSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleItem: SaleItem | null;
}

export const MarkSoldModal: React.FC<MarkSoldModalProps> = ({
  isOpen,
  onClose,
  saleItem,
}) => {
  const { markItemAsSold } = useWardrobe();

  const [soldPrice, setSoldPrice] = useState<string>('');
  const [soldDate, setSoldDate] = useState<string>('');
  const [platformFees, setPlatformFees] = useState<string>('0');
  const [shippingCost, setShippingCost] = useState<string>('0');
  const [buyerUsername, setBuyerUsername] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [courier, setCourier] = useState<
    'Evri' | 'Royal Mail' | 'DPD' | 'InPost' | 'Yodel' | 'Other'
  >('Evri');
  const [archiveInWardrobe, setArchiveInWardrobe] = useState<boolean>(true);

  useEffect(() => {
    if (saleItem) {
      setSoldPrice(((saleItem.listingPrice ?? 0)).toString());
      setSoldDate(new Date().toISOString().split('T')[0]);
      setBuyerUsername(saleItem.buyerUsername || '');
      setOrderNumber(saleItem.orderNumber || '');
      setTrackingNumber(saleItem.trackingNumber || '');
      setCourier(saleItem.courier || 'Evri');

      // Auto-calculate typical default platform fees
      const price = saleItem.listingPrice || 0;
      if (saleItem.platform === 'Vinted') {
        setPlatformFees('0');
      } else if (saleItem.platform === 'eBay') {
        // approx 12.8% + 30p
        const fee = (price * 0.128 + 0.3).toFixed(2);
        setPlatformFees(fee);
      } else if (saleItem.platform === 'Vestiaire Collective') {
        const fee = (price * 0.12).toFixed(2);
        setPlatformFees(fee);
      } else if (saleItem.platform === 'Depop') {
        const fee = (price * 0.029 + 0.3).toFixed(2);
        setPlatformFees(fee);
      } else {
        setPlatformFees('0');
      }

      setShippingCost('0');
      setArchiveInWardrobe(!!saleItem.sourceWardrobeItemId);
    }
  }, [saleItem, isOpen]);

  if (!isOpen || !saleItem) return null;

  const parsedSoldPrice = parseFloat(soldPrice) || 0;
  const parsedFees = parseFloat(platformFees) || 0;
  const parsedShipping = parseFloat(shippingCost) || 0;
  const originalCost = saleItem.originalPricePaid || 0;

  // Realized Net Profit = Sold Price - Original Paid - Platform Fees - Shipping Paid
  const netProfit = parsedSoldPrice - originalCost - parsedFees - parsedShipping;
  const profitMargin =
    parsedSoldPrice > 0 ? (netProfit / parsedSoldPrice) * 100 : 0;

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const applyPlatformPreset = (platform: SellingPlatform) => {
    const price = parsedSoldPrice;
    if (platform === 'Vinted' || platform === 'Direct / Private') {
      setPlatformFees('0.00');
    } else if (platform === 'eBay') {
      setPlatformFees((price * 0.128 + 0.3).toFixed(2));
    } else if (platform === 'Vestiaire Collective') {
      setPlatformFees((price * 0.12).toFixed(2));
    } else if (platform === 'Depop') {
      setPlatformFees((price * 0.029 + 0.3).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedSoldPrice <= 0) return;

    markItemAsSold(saleItem.id, {
      soldPrice: parsedSoldPrice,
      soldDate: soldDate || new Date().toISOString().split('T')[0],
      platformFees: parsedFees,
      shippingCostPaidBySeller: parsedShipping,
      buyerUsername: buyerUsername.trim() || undefined,
      orderNumber: orderNumber.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      courier,
      archiveFromWardrobe: archiveInWardrobe,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#F8F7F4]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-[#E5E5E1] bg-white p-0.5">
              <GarmentImage
                src={saleItem.imageUrl}
                alt={saleItem.name}
                category={saleItem.category}
                className="w-full h-full object-contain"
                containerClassName="w-full h-full bg-white flex items-center justify-center"
                showPlaceholderLabel={false}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7355] bg-white px-1.5 py-0.5 border border-[#E5E5E1]">
                  {saleItem.platform}
                </span>
                <span className="text-[10px] font-mono text-[#767670]">
                  Listed: {formatGbp(saleItem.listingPrice)}
                </span>
              </div>
              <h2 className="text-sm font-serif font-bold text-[#1A1A1A] mt-0.5">
                Mark as Sold: {saleItem.brand} {saleItem.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Live P&L Summary Box */}
          <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5A5A55] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#8C7355]" />
                Live Net Realized Profit &amp; Loss
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  netProfit >= 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {netProfit >= 0 ? '+' : ''}
                {formatGbp(netProfit)} ({profitMargin.toFixed(1)}% margin)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-white p-2 border border-[#E5E5E1]">
                <span className="text-[10px] text-[#767670] block">Original Paid</span>
                <span className="font-bold text-[#1A1A1A]">{formatGbp(originalCost)}</span>
              </div>
              <div className="bg-white p-2 border border-[#E5E5E1]">
                <span className="text-[10px] text-[#767670] block">Sold Price</span>
                <span className="font-bold text-emerald-800">{formatGbp(parsedSoldPrice)}</span>
              </div>
              <div className="bg-white p-2 border border-[#E5E5E1]">
                <span className="text-[10px] text-[#767670] block">Fees &amp; Ship</span>
                <span className="font-bold text-rose-700">
                  -{formatGbp(parsedFees + parsedShipping)}
                </span>
              </div>
              <div
                className={`p-2 border ${
                  netProfit >= 0
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-rose-50/60 border-rose-300'
                }`}
              >
                <span className="text-[10px] text-[#767670] block">Net Realized</span>
                <span
                  className={`font-bold ${
                    netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {netProfit >= 0 ? '+' : ''}
                  {formatGbp(netProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Actual Sold Price (£ GBP) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="e.g. 145.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono font-bold text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Sold Date
              </label>
              <input
                type="date"
                value={soldDate}
                onChange={(e) => setSoldDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Platform Fees & Shipping Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-[#5A5A55] font-semibold">
                  Platform Selling Fees (£)
                </label>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => applyPlatformPreset('Vinted')}
                    className="text-[#8C7355] hover:underline"
                    title="0% Vinted"
                  >
                    Vinted (0%)
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => applyPlatformPreset('eBay')}
                    className="text-[#8C7355] hover:underline"
                    title="12.8% + 30p eBay"
                  >
                    eBay
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => applyPlatformPreset('Vestiaire Collective')}
                    className="text-[#8C7355] hover:underline"
                    title="12% Vestiaire"
                  >
                    Vestiaire
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={platformFees}
                  onChange={(e) => setPlatformFees(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Postage Paid by Seller (£)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Buyer & Order Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Buyer Username / Handle
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#767670]" />
                <input
                  type="text"
                  value={buyerUsername}
                  onChange={(e) => setBuyerUsername(e.target.value)}
                  placeholder="e.g. @fashionbuyer_uk"
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Order / Transaction Reference ID
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. VNT-9982310 or EBAY-102938"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Courier & Tracking Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Shipping Courier
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Evri">Evri (Hermes)</option>
                <option value="Royal Mail">Royal Mail 48 Tracked</option>
                <option value="DPD">DPD Local</option>
                <option value="InPost">InPost Locker</option>
                <option value="Yodel">Yodel Direct</option>
                <option value="Other">Other / Collection</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Tracking Number
              </label>
              <div className="relative">
                <Truck className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#767670]" />
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. EVRI-GB-9923184 or GB123456789"
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Wardrobe Auto-Archive Toggle */}
          {saleItem.sourceWardrobeItemId && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-start gap-2.5">
              <input
                type="checkbox"
                id="archiveWardrobeCheckbox"
                checked={archiveInWardrobe}
                onChange={(e) => setArchiveInWardrobe(e.target.checked)}
                className="mt-0.5 rounded text-[#8C7355] focus:ring-[#8C7355] cursor-pointer"
              />
              <label
                htmlFor="archiveWardrobeCheckbox"
                className="text-xs text-[#1A1A1A] cursor-pointer"
              >
                <span className="font-semibold block flex items-center gap-1 text-[#8C7355]">
                  <Archive className="w-3.5 h-3.5" />
                  Archive original garment in Wardrobe Inventory
                </span>
                <span className="text-[#767670] text-[11px]">
                  Automatically flags the linked closet piece as archived with sold notes, removing it from daily rotation while preserving valuation and wear history.
                </span>
              </label>
            </div>
          )}

          {/* Footer Actions */}
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
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Sale &amp; Log Revenue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
