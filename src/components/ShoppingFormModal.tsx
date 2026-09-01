import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Link2, Sparkles, Loader2, Check, Upload, Image as ImageIcon, ClipboardPaste } from 'lucide-react';
import { ShoppingItem, ShoppingPriority, ShoppingStatus, Category, Season } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';

interface ShoppingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: ShoppingItem | null;
}

export const ShoppingFormModal: React.FC<ShoppingFormModalProps> = ({
  isOpen,
  onClose,
  initialItem,
}) => {
  const { addShoppingItem, updateShoppingItem, items = [], categories = [] } = useWardrobe();
  const safeCategories = Array.isArray(categories) && categories.length > 0 ? categories : ['Tops', 'Knitwear', 'Trousers', 'Outerwear', 'Footwear', 'Accessories', 'Suits & Tailoring'];
  const safeItems = Array.isArray(items) ? items : [];

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>(safeCategories[0] || 'Outerwear');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [priority, setPriority] = useState<ShoppingPriority>('High');
  const [status, setStatus] = useState<ShoppingStatus>('Researching');
  const [targetStoreUrl, setTargetStoreUrl] = useState('');
  const [retailerName, setRetailerName] = useState('');
  const [season, setSeason] = useState<Season>('Autumn');
  const [reasonOrGap, setReasonOrGap] = useState('');
  const [estimatedWearsPerYear, setEstimatedWearsPerYear] = useState<string>('30');
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);

  // Link extraction state
  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setBrand(initialItem.brand || '');
      setCategory(initialItem.category || safeCategories[0] || 'Outerwear');
      setEstimatedPrice(
        initialItem.estimatedPrice !== undefined && initialItem.estimatedPrice !== null
          ? initialItem.estimatedPrice.toString()
          : ''
      );
      setPriority(initialItem.priority || 'High');
      setStatus(initialItem.status || 'Researching');
      setTargetStoreUrl(initialItem.targetStoreUrl || '');
      setRetailerName(initialItem.retailerName || '');
      setSeason(
        Array.isArray(initialItem.season)
          ? initialItem.season[0] || 'Autumn'
          : (initialItem.season as Season) || 'Autumn'
      );
      setReasonOrGap(initialItem.reasonOrGap || '');
      setEstimatedWearsPerYear((initialItem.estimatedWearsPerYear || 30).toString());
      setMatchingItemIds(Array.isArray(initialItem.matchingWardrobeItemIds) ? initialItem.matchingWardrobeItemIds : []);
      setImageUrl(initialItem.imageUrl || '');
      setTagsInput(
        Array.isArray(initialItem.tags)
          ? initialItem.tags.join(', ')
          : typeof initialItem.tags === 'string'
          ? initialItem.tags
          : ''
      );
    } else {
      setName('');
      setBrand('');
      setCategory(safeCategories[0] || 'Outerwear');
      setEstimatedPrice('');
      setPriority('High');
      setStatus('Researching');
      setTargetStoreUrl('');
      setRetailerName('');
      setSeason('Autumn');
      setReasonOrGap('');
      setEstimatedWearsPerYear('30');
      setMatchingItemIds([]);
      setImageUrl('');
      setTagsInput('');
    }
    setImportUrl('');
    setExtractError(null);
    setExtractSuccess(false);
  }, [initialItem, isOpen, safeCategories]);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File([blob], 'clipboard-photo.png', { type: imgType });
            handleFileUpload(file);
            return;
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://'))) {
          setImageUrl(text.trim());
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard paste error:', err);
    }
  };

  const handleExtractFromImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImageUrl(base64);

      try {
        const res = await fetch('/api/gemini/extract-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
          }),
        });
        const data = await res.json();
        if (data.success && (data.item || (data.items && data.items[0]))) {
          const item = data.item || data.items[0];
          if (item.name) setName(item.name);
          if (item.brand) setBrand(item.brand);
          if (item.category && categories.includes(item.category)) setCategory(item.category);
          if (item.purchasePrice) setEstimatedPrice(item.purchasePrice.toString());
          if (item.notes) setReasonOrGap(item.notes);
          if (item.retailerName) setRetailerName(item.retailerName);
          if (item.tags && Array.isArray(item.tags)) setTagsInput(item.tags.join(', '));
          setExtractSuccess(true);
        }
      } catch (err: any) {
        console.error('Image extract error:', err);
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtractFromUrl = async () => {
    if (!importUrl.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    try {
      const res = await fetch('/api/gemini/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract product details from this link.');
      }

      const item = data.item;
      if (item.name) setName(item.name);
      if (item.brand) setBrand(item.brand);
      if (item.category) setCategory(item.category);
      if (item.purchasePrice) setEstimatedPrice(item.purchasePrice.toString());
      if (item.imageUrl) setImageUrl(item.imageUrl);
      if (item.targetStoreUrl) setTargetStoreUrl(item.targetStoreUrl);
      if (item.retailerName) setRetailerName(item.retailerName);
      if (item.notes) setReasonOrGap(item.notes);
      if (item.tags && Array.isArray(item.tags)) setTagsInput(item.tags.join(', '));

      setExtractSuccess(true);
    } catch (err: any) {
      setExtractError(err?.message || 'Error extracting details.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) return;

    const priceNum = parseFloat(estimatedPrice) || 0;
    const wearsNum = parseInt(estimatedWearsPerYear) || 30;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    if (initialItem) {
      updateShoppingItem(initialItem.id, {
        name,
        brand,
        category,
        estimatedPrice: priceNum,
        priority,
        status,
        targetStoreUrl: targetStoreUrl || undefined,
        retailerName: retailerName || undefined,
        season,
        reasonOrGap,
        estimatedWearsPerYear: wearsNum,
        matchingWardrobeItemIds: matchingItemIds,
        imageUrl: imageUrl.trim(),
        tags,
      });
    } else {
      addShoppingItem({
        name,
        brand,
        category,
        estimatedPrice: priceNum,
        priority,
        status,
        targetStoreUrl: targetStoreUrl || undefined,
        retailerName: retailerName || undefined,
        season,
        reasonOrGap: reasonOrGap || 'Capsule wardrobe staple research.',
        estimatedWearsPerYear: wearsNum,
        matchingWardrobeItemIds: matchingItemIds,
        imageUrl: imageUrl.trim(),
        tags,
      });
    }

    onClose();
  };

  const toggleMatchingItem = (id: string) => {
    if (matchingItemIds.includes(id)) {
      setMatchingItemIds(matchingItemIds.filter((item) => item !== id));
    } else {
      setMatchingItemIds([...matchingItemIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-[#E5E5E1] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 bg-[#F8F7F4] border-b border-[#E5E5E1] flex items-center justify-between">
          <div>
            <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
              {initialItem ? 'Edit Shopping Wishlist Item' : 'Add Item to Wishlist'}
            </h2>
            <p className="text-xs text-[#767670]">
              Evaluate prospective acquisitions, plan budget allocation, and fill wardrobe gaps.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-Extract from URL Bar */}
        {!initialItem && (
          <div className="p-3.5 bg-[#F2F1ED] border-b border-[#E5E5E1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8C7355] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Fill from Product Link
              </span>
              {extractSuccess && (
                <span className="text-[11px] font-mono text-emerald-800 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Product Details Extracted!
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  placeholder="Paste URL (e.g. Mulberry, Barbour, Zara, COS, Arket)..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExtractFromUrl();
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                />
                <Link2 className="w-3.5 h-3.5 text-[#8C7355] absolute left-2.5 top-2" />
              </div>
              <button
                type="button"
                onClick={handleExtractFromUrl}
                disabled={isExtracting || !importUrl.trim()}
                className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  'Auto-Fill'
                )}
              </button>
            </div>
            {extractError && (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-rose-700 font-mono">{extractError}</p>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files?.[0]) handleExtractFromImageFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 border border-dashed border-[#8C7355]/40 bg-amber-50/40 hover:bg-amber-50 text-center cursor-pointer"
                >
                  <span className="text-[10px] font-mono text-[#8C7355] font-semibold">
                    Or drop product screenshot here to extract with Vision AI
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amberley Satchel"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] font-serif focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Brand / Designer *
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Mulberry"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] font-mono font-semibold focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
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
                Estimated Price (£ GBP) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-[#8C7355] font-mono font-bold">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="650"
                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs font-mono font-bold text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ShoppingPriority)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Essential / Must-Have">Essential / Must-Have</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low / Wishlist">Low / Wishlist</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Wishlist Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShoppingStatus)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Researching">Researching</option>
                <option value="To Buy">To Buy</option>
                <option value="In Basket">In Basket</option>
                <option value="Purchased">Purchased</option>
                <option value="Sold">Sold</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Passed">Passed</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Target Store URL
              </label>
              <input
                type="url"
                value={targetStoreUrl}
                onChange={(e) => setTargetStoreUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
              Wardrobe Gap / Rationale
            </label>
            <textarea
              rows={2}
              value={reasonOrGap}
              onChange={(e) => setReasonOrGap(e.target.value)}
              placeholder="e.g. Fills the gap for a durable British leather day bag that complements tailored outerwear."
              className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          {/* Planned Wear Frequency Box */}
          <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] flex items-center justify-between">
            <span className="text-[#1A1A1A] font-mono text-xs font-semibold">
              Projected Wears / Year:
            </span>
            <input
              type="number"
              value={estimatedWearsPerYear}
              onChange={(e) => setEstimatedWearsPerYear(e.target.value)}
              className="w-20 px-2 py-1 bg-white border border-[#D5D5D0] text-center text-[#1A1A1A] text-xs font-mono font-bold"
            />
          </div>

          {/* Photo & Tags */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">
              Item Photo
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result) setImageUrl(ev.target.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Photo Box: Supports Drag and Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsPhotoDragging(true);
                }}
                onDragLeave={() => setIsPhotoDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsPhotoDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`w-full sm:w-32 h-32 border flex items-center justify-center p-1.5 relative overflow-hidden shrink-0 transition-all ${
                  isPhotoDragging
                    ? 'border-[#8C7355] ring-2 ring-[#8C7355] bg-amber-50'
                    : 'bg-[#F8F7F4] border-[#E5E5E1]'
                }`}
              >
                {imageUrl ? (
                  <GarmentImage
                    src={imageUrl}
                    alt={name || 'Wishlist item preview'}
                    category={category}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4]"
                    showPlaceholderLabel={true}
                  />
                ) : (
                  <div className="text-center text-[#A5A59E] p-2">
                    <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] font-mono block">No Photo</span>
                    <span className="text-[9px] font-mono text-[#8C7355] block mt-0.5">Drop image here</span>
                  </div>
                )}
                {isPhotoDragging && (
                  <div className="absolute inset-0 bg-[#8C7355]/85 text-white flex flex-col items-center justify-center text-center p-1">
                    <Upload className="w-5 h-5 mb-1 animate-bounce" />
                    <span className="text-[9px] font-mono font-bold">Drop to Upload</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-mono"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePasteImage}
                    className="px-2.5 py-1 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Paste photo from clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-xs font-mono text-[#4A4A45] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Upload Image</span>
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2 py-1 text-xs text-[#767670] hover:text-rose-600 font-mono cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#767670] block uppercase font-semibold">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. leather, wishlist, heritage"
                    className="w-full px-2.5 py-1 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Existing Items Pairing Selection */}
          {safeItems.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">
                Connect with Existing Wardrobe Pieces:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {safeItems.slice(0, 8).map((wItem) => {
                  const isSelected = (matchingItemIds || []).includes(wItem.id);
                  return (
                    <div
                      key={wItem.id}
                      onClick={() => toggleMatchingItem(wItem.id)}
                      className={`flex items-center gap-1.5 p-1 pr-2 border cursor-pointer shrink-0 transition-all ${
                        isSelected
                          ? 'bg-amber-50 border-[#8C7355] text-[#1A1A1A]'
                          : 'bg-[#F8F7F4] border-[#E5E5E1] text-[#767670]'
                      }`}
                    >
                      <GarmentImage
                        src={wItem.imageUrl}
                        alt={wItem.name}
                        category={wItem.category}
                        className="w-6 h-6 object-cover"
                        containerClassName="w-6 h-6 shrink-0 bg-[#EAE8E3]"
                        showPlaceholderLabel={false}
                      />
                      <span className="text-[10px] font-semibold truncate max-w-[80px]">
                        {wItem.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-[#D5D5D0] text-[#5A5A55] hover:bg-[#F2F1ED] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs transition-all cursor-pointer"
            >
              {initialItem ? 'Save Wishlist Changes' : 'Add to Wishlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
