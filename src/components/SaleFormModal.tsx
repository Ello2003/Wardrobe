import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Tag,
  PoundSterling,
  Truck,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  SaleItem,
  Category,
  Condition,
  SellingPlatform,
  SellingStatus,
  ShippingStatus,
} from '../types';
import { useWardrobe } from '../context/WardrobeContext';

interface SaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleItemToEdit?: SaleItem | null;
}

export const SaleFormModal: React.FC<SaleFormModalProps> = ({
  isOpen,
  onClose,
  saleItemToEdit,
}) => {
  const { categories = [], addSaleItem, updateSaleItem } = useWardrobe();
  const safeCategories = Array.isArray(categories) && categories.length > 0 ? categories : ['Tops', 'Knitwear', 'Trousers', 'Outerwear', 'Footwear', 'Accessories', 'Suits & Tailoring'];

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>((safeCategories[0] as Category) || 'Tops');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState<Condition>('Excellent');
  const [originalPricePaid, setOriginalPricePaid] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [platform, setPlatform] = useState<SellingPlatform>('Vinted');
  const [status, setStatus] = useState<SellingStatus>('Listed');
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>('Not Required');
  const [platformListingUrl, setPlatformListingUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [listedDate, setListedDate] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [buyerUsername, setBuyerUsername] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState<'Evri' | 'Royal Mail' | 'DPD' | 'InPost' | 'Yodel' | 'Other'>('Evri');
  const [platformFees, setPlatformFees] = useState('0');
  const [shippingCostPaidBySeller, setShippingCostPaidBySeller] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (saleItemToEdit) {
      setName(saleItemToEdit.name || '');
      setBrand(saleItemToEdit.brand || '');
      setCategory(saleItemToEdit.category || (safeCategories[0] as Category) || 'Tops');
      setSize(saleItemToEdit.size || '');
      setColor(saleItemToEdit.color || '');
      setCondition(saleItemToEdit.condition || 'Excellent');
      setOriginalPricePaid(saleItemToEdit.originalPricePaid?.toString() || '0');
      setListingPrice(saleItemToEdit.listingPrice?.toString() || '');
      setSoldPrice(saleItemToEdit.soldPrice !== undefined && saleItemToEdit.soldPrice !== null ? saleItemToEdit.soldPrice.toString() : '');
      setPlatform(saleItemToEdit.platform || 'Vinted');
      setStatus(saleItemToEdit.status || 'Listed');
      setShippingStatus(saleItemToEdit.shippingStatus || 'Not Required');
      setPlatformListingUrl(saleItemToEdit.platformListingUrl || '');
      setImageUrl(saleItemToEdit.imageUrl || '');
      setDescription(saleItemToEdit.description || '');
      setTagsInput(
        Array.isArray(saleItemToEdit.tags)
          ? saleItemToEdit.tags.join(', ')
          : typeof saleItemToEdit.tags === 'string'
          ? saleItemToEdit.tags
          : ''
      );
      setListedDate(saleItemToEdit.listedDate || new Date().toISOString().split('T')[0]);
      setSoldDate(saleItemToEdit.soldDate || '');
      setBuyerUsername(saleItemToEdit.buyerUsername || '');
      setOrderNumber(saleItemToEdit.orderNumber || '');
      setTrackingNumber(saleItemToEdit.trackingNumber || '');
      setCourier(saleItemToEdit.courier || 'Evri');
      setPlatformFees(saleItemToEdit.platformFees !== undefined && saleItemToEdit.platformFees !== null ? saleItemToEdit.platformFees.toString() : '0');
      setShippingCostPaidBySeller(
        saleItemToEdit.shippingCostPaidBySeller !== undefined && saleItemToEdit.shippingCostPaidBySeller !== null
          ? saleItemToEdit.shippingCostPaidBySeller.toString()
          : '0'
      );
      setNotes(saleItemToEdit.notes || '');
    } else {
      // Default new form state
      setName('');
      setBrand('');
      setCategory((safeCategories[0] as Category) || 'Tops');
      setSize('');
      setColor('');
      setCondition('Excellent');
      setOriginalPricePaid('0');
      setListingPrice('');
      setSoldPrice('');
      setPlatform('Vinted');
      setStatus('Listed');
      setShippingStatus('Not Required');
      setPlatformListingUrl('');
      setImageUrl('');
      setDescription('');
      setTagsInput('');
      setListedDate(new Date().toISOString().split('T')[0]);
      setSoldDate('');
      setBuyerUsername('');
      setOrderNumber('');
      setTrackingNumber('');
      setCourier('Evri');
      setPlatformFees('0');
      setShippingCostPaidBySeller('0');
      setNotes('');
    }
  }, [saleItemToEdit, isOpen, safeCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      size: size.trim() || undefined,
      color: color.trim() || undefined,
      condition,
      originalPricePaid: parseFloat(originalPricePaid) || 0,
      listingPrice: parseFloat(listingPrice) || 0,
      soldPrice: soldPrice.trim() !== '' ? parseFloat(soldPrice) : undefined,
      platform,
      status,
      shippingStatus,
      platformListingUrl: platformListingUrl.trim() || undefined,
      imageUrl: imageUrl.trim(),
      description: description.trim() || undefined,
      tags,
      listedDate: listedDate || new Date().toISOString().split('T')[0],
      soldDate: soldDate.trim() || undefined,
      buyerUsername: buyerUsername.trim() || undefined,
      orderNumber: orderNumber.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      courier,
      platformFees: parseFloat(platformFees) || 0,
      shippingCostPaidBySeller: parseFloat(shippingCostPaidBySeller) || 0,
      notes: notes.trim() || undefined,
    };

    if (saleItemToEdit) {
      updateSaleItem(saleItemToEdit.id, payload);
    } else {
      addSaleItem(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#F8F7F4]">
          <div>
            <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
              {saleItemToEdit ? 'Edit Resale Listing' : 'Create Resale Listing'}
            </h2>
            <p className="text-[11px] text-[#767670]">
              {saleItemToEdit
                ? `Update listing details for ${saleItemToEdit.brand} ${saleItemToEdit.name}`
                : 'Add a garment or accessory listing for resale tracking and P&L calculation.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Row 1: Brand & Item Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Brand / Designer *
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Margaret Howell, Barbour, Sézane"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Heavy Cotton Drill Overshirt"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Category, Condition, Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                {category && !safeCategories.includes(category) && (
                  <option value={category}>{category}</option>
                )}
                {safeCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Pristine / New">Pristine / New (BNWT)</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Size / Color
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="Size (e.g. M, UK 10)"
                  className="w-full px-2 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Color (e.g. Olive)"
                  className="w-full px-2 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Financials - Original Paid vs Listing Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Original Cost Basis (£)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={originalPricePaid}
                  onChange={(e) => setOriginalPricePaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Asking Listing Price (£) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono font-bold text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Realized Sold Price (£)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#767670] font-mono text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="Fill if sold"
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-emerald-800 font-bold focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Platform & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Selling Platform *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as SellingPlatform)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Vinted">Vinted</option>
                <option value="eBay">eBay UK</option>
                <option value="Vestiaire Collective">Vestiaire Collective</option>
                <option value="Depop">Depop</option>
                <option value="Grailed">Grailed</option>
                <option value="Direct / Private">Direct / Private Sale</option>
                <option value="Other">Other Marketplace</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Listing Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SellingStatus)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Draft">Draft (Unpublished)</option>
                <option value="Listed">Listed (Active)</option>
                <option value="Reserved">Reserved (Pending Payment)</option>
                <option value="Sold">Sold (To Dispatch)</option>
                <option value="Shipped">Shipped (In Transit)</option>
                <option value="Completed">Completed (Funds Released)</option>
                <option value="Delisted">Delisted / Withdrawn</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Shipping Status
              </label>
              <select
                value={shippingStatus}
                onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Not Required">Not Required</option>
                <option value="To Pack">To Pack / Label Ready</option>
                <option value="Shipped">Shipped</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Row 5: Image & Listing URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Item Photo Image URL
              </label>
              <div className="relative">
                <ImageIcon className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#767670]" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Marketplace Listing URL
              </label>
              <div className="relative">
                <ExternalLink className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#767670]" />
                <input
                  type="url"
                  value={platformListingUrl}
                  onChange={(e) => setPlatformListingUrl(e.target.value)}
                  placeholder="https://www.vinted.co.uk/items/..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 6: Description */}
          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
              Marketplace Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, fabric details, sizing fit, and features..."
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none resize-none"
            />
          </div>

          {/* Row 7: Tags */}
          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Margaret Howell, Workwear, Japan, Drill Cotton"
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          {/* Row 8: Dispatch / Tracking Section (optional) */}
          <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5A5A55] block">
              Dispatch &amp; Courier Logistics (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={buyerUsername}
                onChange={(e) => setBuyerUsername(e.target.value)}
                placeholder="Buyer Handle (@...)"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Evri">Evri (Hermes)</option>
                <option value="Royal Mail">Royal Mail 48</option>
                <option value="DPD">DPD Local</option>
                <option value="InPost">InPost Locker</option>
                <option value="Yodel">Yodel</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Tracking #"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

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
              className="px-4 py-1.5 text-xs font-semibold bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-amber-300" />
              {saleItemToEdit ? 'Save Changes' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
