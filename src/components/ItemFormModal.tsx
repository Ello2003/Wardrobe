import React, { useState, useEffect, useRef } from 'react';
import { X, Link2, Sparkles, Loader2, Check, Upload, Image as ImageIcon, ClipboardPaste } from 'lucide-react';
import { WardrobeItem, Category, Season, Condition } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: WardrobeItem | null;
}

const ALL_SEASONS: Season[] = ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'];

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  initialItem,
}) => {
  const { addItem, updateItem, categories = [] } = useWardrobe();
  const safeCategories = Array.isArray(categories) && categories.length > 0 ? categories : ['Tops', 'Knitwear', 'Trousers', 'Outerwear', 'Footwear', 'Accessories', 'Suits & Tailoring'];

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>(safeCategories[0] || 'Tops');
  const [color, setColor] = useState('');
  const [seasons, setSeasons] = useState<Season[]>(['Autumn', 'Winter']);
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [condition, setCondition] = useState<Condition>('Excellent');
  const [material, setMaterial] = useState('');
  const [size, setSize] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);

  // Quick Auto-Import inside modal
  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setBrand(initialItem.brand || '');
      setCategory(initialItem.category || safeCategories[0] || 'Tops');
      setColor(initialItem.color || '');
      setSeasons(
        Array.isArray(initialItem.season)
          ? initialItem.season
          : initialItem.season
          ? [initialItem.season as any]
          : ['Autumn', 'Winter']
      );
      setPurchasePrice(
        initialItem.purchasePrice !== undefined && initialItem.purchasePrice !== null
          ? initialItem.purchasePrice.toString()
          : ''
      );
      setPurchaseDate(initialItem.purchaseDate || '');
      setCondition(initialItem.condition || 'Excellent');
      setMaterial(initialItem.material || '');
      setSize(initialItem.size || '');
      setStorageLocation(initialItem.storageLocation || '');
      setCareNotes(initialItem.careNotes || '');
      setNotes(initialItem.notes || '');
      setTagsInput(
        Array.isArray(initialItem.tags)
          ? initialItem.tags.join(', ')
          : typeof initialItem.tags === 'string'
          ? initialItem.tags
          : ''
      );
      setImageUrl(initialItem.imageUrl || '');
    } else {
      setName('');
      setBrand('');
      setCategory(safeCategories[0] || 'Tops');
      setColor('');
      setSeasons(['Autumn', 'Winter']);
      setPurchasePrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setCondition('Excellent');
      setMaterial('');
      setSize('');
      setStorageLocation('Main Wardrobe');
      setCareNotes('');
      setNotes('');
      setTagsInput('');
      setImageUrl('');
    }
    setImportUrl('');
    setExtractError(null);
    setExtractSuccess(false);
  }, [initialItem, isOpen, safeCategories]);

  if (!isOpen) return null;

  const toggleSeason = (s: Season) => {
    const currentSeasons = Array.isArray(seasons) ? seasons : [];
    if (currentSeasons.includes(s)) {
      if (currentSeasons.length > 1) {
        setSeasons(currentSeasons.filter((item) => item !== s));
      }
    } else {
      setSeasons([...currentSeasons, s]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64 = e.target.result as string;
        setImageUrl(base64);
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
          if (item.color) setColor(item.color);
          if (item.material) setMaterial(item.material);
          if (item.purchasePrice) setPurchasePrice(item.purchasePrice.toString());
          if (item.notes) setNotes(item.notes);
          if (item.season && Array.isArray(item.season)) setSeasons(item.season);
          if (item.tags && Array.isArray(item.tags)) setTagsInput(item.tags.join(', '));
          setExtractSuccess(true);
        }
      } catch (err: any) {
        console.error('Image auto-extract error:', err);
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
      if (item.color) setColor(item.color);
      if (item.material) setMaterial(item.material);
      if (item.purchasePrice) setPurchasePrice(item.purchasePrice.toString());
      if (item.imageUrl) setImageUrl(item.imageUrl);
      if (item.careNotes) setCareNotes(item.careNotes);
      if (item.notes) setNotes(item.notes);
      if (item.season && Array.isArray(item.season)) {
        setSeasons(item.season);
      }
      if (item.tags && Array.isArray(item.tags)) {
        setTagsInput(item.tags.join(', '));
      }

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

    const priceNum = parseFloat(purchasePrice) || 0;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const finalImageUrl = imageUrl.trim();

    if (initialItem) {
      updateItem(initialItem.id, {
        name,
        brand,
        category,
        color,
        season: seasons,
        purchasePrice: priceNum,
        purchaseDate,
        condition,
        material,
        size,
        storageLocation,
        careNotes,
        notes,
        tags,
        imageUrl: finalImageUrl,
      });
    } else {
      addItem({
        name,
        brand,
        category,
        subcategory: tags[0] || 'Capsule Piece',
        color,
        season: seasons,
        purchasePrice: priceNum,
        currentValuation: priceNum,
        purchaseDate,
        condition,
        material,
        size,
        storageLocation,
        careNotes,
        notes,
        tags,
        imageUrl: finalImageUrl,
        isFavorite: false,
        isArchived: false,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-[#E5E5E1] shadow-2xl rounded-none w-full max-w-xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#F8F7F4] border-b border-[#E5E5E1] flex items-center justify-between">
          <div>
            <h2 className="text-base font-serif font-semibold text-[#1A1A1A]">
              {initialItem ? 'Edit Wardrobe Piece' : 'Add Wardrobe Piece'}
            </h2>
            <p className="text-xs text-[#767670] font-sans">
              Enter garment specifications, valuation in £ GBP, and wardrobe details.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Link Autofill Banner */}
        <div className="bg-[#F2F1ED] px-5 py-2.5 border-b border-[#E5E5E1]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                placeholder="Autofill specs from link (e.g. Barbour, Zara, COS, Arket...)"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExtractFromUrl();
                  }
                }}
                className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] placeholder-[#8C8C85] focus:outline-none focus:border-[#8C7355]"
              />
              <Link2 className="w-3.5 h-3.5 text-[#8C7355] absolute left-2.5 top-2.5" />
            </div>
            <button
              type="button"
              onClick={handleExtractFromUrl}
              disabled={isExtracting || !importUrl.trim()}
              className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Autofill</span>
                </>
              )}
            </button>
          </div>
          {extractError && (
            <div className="mt-1 space-y-1">
              <p className="text-[11px] text-rose-600 font-mono">{extractError}</p>
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
                  Or drop a garment screenshot here to autofill with Vision AI
                </span>
              </div>
            </div>
          )}
          {extractSuccess && (
            <p className="text-[11px] text-emerald-700 mt-1 font-mono flex items-center gap-1">
              <Check className="w-3 h-3" /> Auto-populated specs and pricing!
            </p>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Photo Preview & Upload */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">
              Garment Photo
            </label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
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
                className={`w-full sm:w-36 h-36 border flex items-center justify-center p-1.5 relative overflow-hidden shrink-0 transition-all ${
                  isPhotoDragging
                    ? 'border-[#8C7355] ring-2 ring-[#8C7355] bg-amber-50'
                    : 'bg-[#F8F7F4] border-[#E5E5E1]'
                }`}
              >
                {imageUrl ? (
                  <GarmentImage
                    src={imageUrl}
                    alt={name || 'Garment preview'}
                    category={category}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4]"
                    showPlaceholderLabel={true}
                  />
                ) : (
                  <div className="text-center text-[#A5A59E] p-2">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
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

              {/* Photo Controls */}
              <div className="flex-1 space-y-2 flex flex-col justify-center">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste direct Image URL (https://...)"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-mono"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePasteImage}
                    className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Paste photo from clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-xs font-mono text-[#4A4A45] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Upload File</span>
                  </button>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2 py-1.5 text-xs text-[#767670] hover:text-rose-600 font-mono cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#767670]">
                  Supports high-resolution fashion imagery, local files, and web links. Full photo will be visible with zero cropping.
                </p>
              </div>
            </div>
          </div>

          {/* Brand & Name */}
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
                placeholder="e.g. Barbour, Toast, Arket, COS"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Garment Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Classic Beaufort Waxed Jacket"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {safeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Color Tone
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Sage Olive, Charcoal, Ecru"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Price & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Purchase Price (£ GBP)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-[#8C7355] font-mono font-bold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="299"
                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="w-full px-2 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              >
                <option value="Pristine / New">Pristine / New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
            </div>
          </div>

          {/* Material & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Material / Composition
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. 100% Waxed Cotton, 100% Cashmere"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. M, 38R, 32W/32L, UK 9"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Season Selector */}
          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1.5 font-semibold">
              Wearable Seasons
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SEASONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSeason(s)}
                  className={`px-3 py-1 text-xs border transition-all cursor-pointer ${
                    (Array.isArray(seasons) ? seasons : []).includes(s)
                      ? 'bg-[#1A1A1A] text-white font-semibold border-[#1A1A1A]'
                      : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:text-[#1A1A1A]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Care & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Care &amp; Cleaning
              </label>
              <input
                type="text"
                value={careNotes}
                onChange={(e) => setCareNotes(e.target.value)}
                placeholder="e.g. Sponge clean only, re-wax annually"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. heritage, outerwear, weatherproof"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Storage & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Storage Location
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="e.g. Main Wardrobe, Hallway Rail, Cedar Chest"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Styling Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Layer over chunky knitwear"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

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
              {initialItem ? 'Save Updates' : 'Add to Wardrobe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
