import React, { useState, useMemo } from 'react';
import {
  ListPlus,
  X,
  Check,
  Sparkles,
  Shirt,
  ShoppingBag,
  PoundSterling,
  AlertCircle,
  Trash2,
  Edit2,
  Palette,
  Layers,
  ArrowRight,
  ClipboardPaste,
  Image as ImageIcon,
  Search,
  Loader2,
  Globe,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { Category, Season, Condition, WardrobeItem } from '../types';
import {
  parseBatchPastedText,
  ParsedBatchLineItem,
  SAMPLE_BATCH_INPUTS,
} from '../services/batchLineParserService';
import { getColorSwatchHex } from './duplicateMerge/duplicateUtils';
import { ProductImagePickerModal } from './ProductImagePickerModal';
import { findProductImageForGarment } from '../services/productImageLookupService';
import { CategorySelect } from './common/CategorySelect';

interface BatchLinePasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
  defaultDestination?: 'wardrobe' | 'shopping' | 'selling';
}

export const BatchLinePasteModal: React.FC<BatchLinePasteModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
  defaultDestination = 'wardrobe',
}) => {
  const {
    batchAddItems,
    batchAddShoppingItems,
    batchAddSaleItems,
    categories,
    formatCurrency,
  } = useWardrobe();

  const [rawText, setRawText] = useState('');
  const [targetDestination, setTargetDestination] = useState<'wardrobe' | 'shopping' | 'selling'>(
    defaultDestination
  );
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [autoScoutPhotos, setAutoScoutPhotos] = useState(true);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [pickerItemIndex, setPickerItemIndex] = useState<number | null>(null);
  const [isScoutingAllPhotos, setIsScoutingAllPhotos] = useState(false);
  const [scoutProgress, setScoutProgress] = useState<{ current: number; total: number } | null>(null);

  // Parse lines in real time
  const parsedItems = useMemo(() => {
    return parseBatchPastedText(rawText, defaultCategory ? (defaultCategory as Category) : undefined);
  }, [rawText, defaultCategory]);

  const [customItems, setCustomItems] = useState<ParsedBatchLineItem[]>([]);

  // Keep custom items in sync with parsed items unless user is actively editing
  React.useEffect(() => {
    setCustomItems(parsedItems);
  }, [parsedItems]);

  const handleUpdateItemField = (index: number, field: keyof ParsedBatchLineItem, value: any) => {
    setCustomItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteItem = (index: number) => {
    setCustomItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Find photos for all parsed items in batch using Google Search, Brand Official Sites & Luxury Retailers
  const handleScoutAllPhotos = async () => {
    if (customItems.length === 0 || isScoutingAllPhotos) return;

    setIsScoutingAllPhotos(true);
    setScoutProgress({ current: 0, total: customItems.length });

    for (let i = 0; i < customItems.length; i++) {
      const it = customItems[i];
      setScoutProgress({ current: i + 1, total: customItems.length });

      if (!it.imageUrl && (it.brand || it.name)) {
        try {
          const res = await findProductImageForGarment(it.brand, it.name, it.color, it.category);
          if (res.primaryImageUrl) {
            handleUpdateItemField(i, 'imageUrl', res.primaryImageUrl);
            if (res.candidateImages && res.candidateImages.length > 0) {
              handleUpdateItemField(i, 'allCandidateImages', res.candidateImages);
            }
          }
        } catch (e) {
          console.warn('Batch photo scout error for item:', it.name, e);
        }
      }
    }

    setIsScoutingAllPhotos(false);
    setScoutProgress(null);
  };

  // Perform Batch Creation
  const handleCreateItems = (openScannerAfterwards: boolean = false) => {
    if (customItems.length === 0) return;

    if (targetDestination === 'wardrobe') {
      const wardrobePayload = customItems.map((item) => ({
        name: item.name,
        brand: item.brand,
        category: item.category,
        subcategory: item.subcategory,
        color: item.color,
        colorHex: item.colorHex || getColorSwatchHex(item.color),
        material: item.material,
        size: item.size || '',
        purchasePrice: item.purchasePrice || 0,
        rrp: item.rrp,
        currentValuation: item.purchasePrice || 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        condition: item.condition,
        season: item.season,
        imageUrl: item.imageUrl || '',
        tags: item.tags,
        isFavorite: false,
        isArchived: false,
        notes: `Batch created from line: "${item.rawLine}"`,
        careNotes: '',
      }));

      batchAddItems(wardrobePayload, `Batch created ${wardrobePayload.length} garments from pasted text`);
    } else if (targetDestination === 'shopping') {
      const shoppingPayload = customItems.map((item) => ({
        name: item.name,
        brand: item.brand,
        category: item.category,
        color: item.color,
        material: item.material,
        size: item.size,
        targetPrice: item.purchasePrice || 0,
        estimatedPrice: item.purchasePrice || 0,
        rrp: item.rrp || 0,
        priority: 'Medium' as const,
        status: 'To Buy' as const,
        season: item.season[0] || 'All-Season',
        imageUrl: item.imageUrl || '',
        tags: item.tags,
        reasonOrGap: 'Batch created line item',
        matchingWardrobeItemIds: [],
        notes: `Batch created from line: "${item.rawLine}"`,
      }));

      batchAddShoppingItems(shoppingPayload, `Batch created ${shoppingPayload.length} wishlist items`);
    } else if (targetDestination === 'selling') {
      const sellingPayload = customItems.map((item) => ({
        name: item.name,
        brand: item.brand,
        category: item.category,
        color: item.color,
        size: item.size,
        listingPrice: item.purchasePrice || 0,
        originalPurchasePrice: item.purchasePrice || 0,
        originalPricePaid: item.purchasePrice || 0,
        platform: 'Vinted' as const,
        status: 'Draft' as const,
        condition: item.condition,
        imageUrl: item.imageUrl || '',
        listedDate: new Date().toISOString().split('T')[0],
        tags: item.tags,
        notes: `Batch created from line: "${item.rawLine}"`,
      }));

      batchAddSaleItems(sellingPayload, `Batch created ${sellingPayload.length} resale listings`);
    }

    // Reset dialogue ready for next entries
    setRawText('');
    setCustomItems([]);
    setDefaultCategory('');

    onClose();

    if (openScannerAfterwards && onOpenScanner) {
      setTimeout(() => {
        onOpenScanner();
      }, 150);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText((prev) => (prev ? `${prev}\n${text}` : text));
      }
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-[#FAF9F6] border border-[#E5E5E1] shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden rounded-xs">
        {/* Top Header */}
        <div className="bg-white border-b border-[#E5E5E1] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-[#8C7355] text-white flex items-center justify-center shadow-xs">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Batch Paste &amp; Line-by-Line Inventory Creator
                </h2>
                <span className="bg-[#8C7355]/10 text-[#8C7355] text-[11px] font-mono font-bold px-2 py-0.5 rounded-xs border border-[#8C7355]/30">
                  Instant Multi-Item Parser
                </span>
              </div>
              <p className="text-xs text-[#767670] mt-0.5">
                Paste any multi-line notes, receipt text, or spreadsheet rows. Each line is automatically parsed into a structured piece.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-xs hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#767670]">Add to:</span>
              <div className="inline-flex border border-[#D5D5D0] bg-white rounded-xs p-0.5">
                <button
                  type="button"
                  onClick={() => setTargetDestination('wardrobe')}
                  className={`px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-all ${
                    targetDestination === 'wardrobe'
                      ? 'bg-[#1A1A1A] text-white font-bold shadow-2xs'
                      : 'text-[#4A4A45] hover:text-[#1A1A1A]'
                  }`}
                >
                  <Shirt className="w-3 h-3" />
                  <span>Wardrobe Closet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDestination('shopping')}
                  className={`px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-all ${
                    targetDestination === 'shopping'
                      ? 'bg-[#1A1A1A] text-white font-bold shadow-2xs'
                      : 'text-[#4A4A45] hover:text-[#1A1A1A]'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>Wishlist / To Buy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDestination('selling')}
                  className={`px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-all ${
                    targetDestination === 'selling'
                      ? 'bg-[#1A1A1A] text-white font-bold shadow-2xs'
                      : 'text-[#4A4A45] hover:text-[#1A1A1A]'
                  }`}
                >
                  <PoundSterling className="w-3 h-3" />
                  <span>Resale Pipeline</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 min-w-[200px]">
              <span className="text-[#767670] whitespace-nowrap">Default Category:</span>
              <div className="w-44">
                <CategorySelect
                  value={defaultCategory}
                  onChange={(val) => setDefaultCategory(val as Category)}
                  categories={categories}
                  allowEmpty={true}
                  emptyOptionLabel="Auto-detect / Empty"
                  className="px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#767670]">Sample Presets:</span>
            {SAMPLE_BATCH_INPUTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRawText(sample.text)}
                className="px-2 py-0.5 bg-white border border-[#E5E5E1] text-[#8C7355] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] rounded-xs transition-colors cursor-pointer"
              >
                {sample.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Main Split Layout: Left Text Input | Right Real-Time Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E1] overflow-hidden">
          {/* LEFT: Text Area */}
          <div className="p-4 sm:p-5 flex flex-col h-full overflow-hidden bg-white">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E5E1] text-xs font-mono">
              <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <span>Paste Text Here (1 item per line)</span>
                {customItems.length > 0 && (
                  <span className="bg-[#8C7355]/15 text-[#8C7355] px-1.5 py-0.2 rounded-2xs font-bold">
                    {customItems.length} items parsed
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[#8C7355] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste from Clipboard</span>
              </button>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Paste any multi-line notes, receipt text, or spreadsheet rows e.g.:

Barbour Beaufort Waxed Jacket Olive - £280
Acne Studios 1989 Loose Straight Jeans Light Blue W32 L32 - £290
Uniqlo Airism Oversized Crew Neck T-Shirt White L - £19.90
Common Projects Original Achilles Low White Leather EU 42 - £330
Drake's Lambswool Shawl Collar Cardigan Navy - £395
Sunspel Riviera Cotton Polo Shirt Navy M - £115`}
              className="flex-1 w-full p-3 font-mono text-xs bg-[#FAF9F6] border border-[#E5E5E1] rounded-xs text-[#1A1A1A] placeholder:text-[#A5A59E] resize-none focus:outline-none focus:bg-white focus:border-[#8C7355] leading-relaxed"
            />

            <div className="pt-2 text-[11px] font-mono text-[#767670] flex items-center justify-between">
              <span>Supports Brand, Name, Color, Size, and Currency (£, $, €).</span>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Real-Time Parsed Items Preview */}
          <div className="p-4 sm:p-5 flex flex-col h-full overflow-hidden bg-[#FAF9F6]">
            <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#E5E5E1] text-xs font-mono gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider">
                  Parsed Pieces Preview ({customItems.length})
                </span>
                {customItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleScoutAllPhotos}
                    disabled={isScoutingAllPhotos}
                    className="px-2.5 py-1 bg-[#8C7355]/10 hover:bg-[#8C7355]/20 text-[#8C7355] border border-[#8C7355]/30 rounded-xs flex items-center gap-1 font-bold cursor-pointer transition-colors"
                    title="Automatically search Google Grounding, Brand Stores & Luxury Retailers for authentic photographs for all parsed lines"
                  >
                    {isScoutingAllPhotos ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#8C7355]" />
                        <span>Finding ({scoutProgress?.current}/{scoutProgress?.total})...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3 h-3" />
                        <span>Find Photos (Google &amp; Brand Sites)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <span className="text-[#767670]">
                Est. Total: {formatCurrency(customItems.reduce((acc, it) => acc + (it.purchasePrice || 0), 0))}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {customItems.length > 0 ? (
                customItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-[#E5E5E1] rounded-xs shadow-2xs space-y-2 text-xs font-mono hover:border-[#D5D5D0]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Photo Thumbnail / Scout Trigger */}
                      <div className="shrink-0">
                        {item.imageUrl ? (
                          <div className="relative group/thumb w-12 h-14 rounded-xs border border-[#8C7355]/50 overflow-hidden bg-stone-50 shadow-2xs">
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPickerItemIndex(idx)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center text-white text-[8px] transition-opacity cursor-pointer"
                              title="Change photograph"
                            >
                              <Edit2 className="w-3 h-3 mb-0.5" />
                              <span>Change</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPickerItemIndex(idx)}
                            className="w-12 h-14 rounded-xs border border-dashed border-[#D5D5D0] hover:border-[#8C7355] bg-stone-50 hover:bg-[#FAF0E6] flex flex-col items-center justify-center text-[#767670] hover:text-[#8C7355] transition-colors cursor-pointer"
                            title="Find product photograph on Google or Brand Site"
                          >
                            <Search className="w-3.5 h-3.5 mb-0.5" />
                            <span className="text-[8px] font-bold">Find Photo</span>
                          </button>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-[#F2F1ED] text-[#767670] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.brand}
                            onChange={(e) => handleUpdateItemField(idx, 'brand', e.target.value)}
                            className="font-bold text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D5D5D0] focus:border-[#8C7355] focus:outline-none max-w-[130px]"
                            placeholder="Brand"
                          />
                          <span>—</span>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItemField(idx, 'name', e.target.value)}
                            className="text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D5D5D0] focus:border-[#8C7355] focus:outline-none flex-1"
                            placeholder="Model Name"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#767670]">
                          <div className="flex items-center gap-1 min-w-[120px]">
                            <span>Cat:</span>
                            <div className="w-28">
                              <CategorySelect
                                value={item.category || ''}
                                onChange={(val) => handleUpdateItemField(idx, 'category', val)}
                                categories={categories}
                                allowEmpty={true}
                                emptyOptionLabel="— Empty —"
                                className="px-1.5 py-0.5 text-[11px] text-[#8C7355] font-semibold bg-transparent border-0 border-b border-[#E5E5E1] rounded-none focus:border-[#8C7355]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: getColorSwatchHex(item.color) }}
                            />
                            <input
                              type="text"
                              value={item.color}
                              onChange={(e) => handleUpdateItemField(idx, 'color', e.target.value)}
                              className="w-16 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] focus:outline-none"
                              placeholder="Color"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span>Size:</span>
                            <input
                              type="text"
                              value={item.size || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'size', e.target.value)}
                              className="w-12 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] focus:outline-none"
                              placeholder="Size"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span>Price:</span>
                            <input
                              type="number"
                              value={item.purchasePrice || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                              className="w-14 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] font-bold focus:outline-none"
                              placeholder="£0"
                            />
                          </div>

                          {item.material && (
                            <span className="text-[#8C7355]">
                              Fabric: {item.material}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1 text-[#A5A59E] hover:text-rose-600 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A5A59E]">
                  <ClipboardPaste className="w-8 h-8 mb-2 opacity-50 text-[#8C7355]" />
                  <p className="text-xs font-mono">
                    No items detected yet. Paste text in the left box or pick a sample preset above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-white border-t border-[#E5E5E1] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[#767670]">
              Ready to generate <strong className="text-[#1A1A1A]">{customItems.length}</strong> new records
            </span>
            {customItems.some((it) => it.imageUrl) && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-2xs border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{customItems.filter((it) => it.imageUrl).length} photographs attached</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#1A1A1A] rounded-xs cursor-pointer"
            >
              Cancel
            </button>

            {onOpenScanner && (
              <button
                type="button"
                onClick={() => handleCreateItems(true)}
                disabled={customItems.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] hover:bg-[#F2EFE9] rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Create items and immediately open the side-by-side scanner to scout photos and verify specs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8C7355]" />
                <span>Create &amp; Review in Scanner ({customItems.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCreateItems(false)}
              disabled={customItems.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5 text-amber-200" />
              <span>Create All ({customItems.length}) in {targetDestination === 'wardrobe' ? 'Closet' : targetDestination}</span>
            </button>
          </div>
        </div>

        {/* Product Image Picker Modal for single line item */}
        {pickerItemIndex !== null && customItems[pickerItemIndex] && (
          <ProductImagePickerModal
            isOpen={pickerItemIndex !== null}
            onClose={() => setPickerItemIndex(null)}
            onSelectImage={(url) => {
              handleUpdateItemField(pickerItemIndex, 'imageUrl', url);
              setPickerItemIndex(null);
            }}
            brand={customItems[pickerItemIndex].brand}
            name={customItems[pickerItemIndex].name}
            color={customItems[pickerItemIndex].color}
            category={customItems[pickerItemIndex].category}
            currentImageUrl={customItems[pickerItemIndex].imageUrl}
          />
        )}
      </div>
    </div>
  );
};
