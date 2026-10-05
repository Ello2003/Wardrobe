import React, { useState, useMemo, useEffect } from 'react';
import {
  ListPlus,
  X,
  Check,
  Sparkles,
  Shirt,
  ShoppingBag,
  PoundSterling,
  Trash2,
  Edit2,
  Palette,
  Layers,
  Search,
  Loader2,
  Plus,
  Copy,
  ClipboardPaste,
  Sliders,
  Filter,
  ArrowRight,
  RefreshCw,
  Tag,
  MapPin,
  CheckCircle2,
  HelpCircle,
  Wand2,
  AlertTriangle,
} from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { Category, Season, Condition, WardrobeItem } from '../../types';
import {
  parseBatchPastedText,
  parseSingleLineToGarments,
  ParsedBatchLineItem,
  SAMPLE_BATCH_INPUTS,
  formatGarmentToStandardLine,
} from '../../services/batchLineParserService';
import { getColorSwatchHex } from '../duplicateMerge/duplicateUtils';
import { ProductImagePickerModal } from '../ProductImagePickerModal';
import { findProductImageForGarment } from '../../services/productImageLookupService';
import { CategorySelect } from '../common/CategorySelect';
import {
  MissingCriteria,
  auditGarmentDetails,
  filterItemsByMissingCriteria,
  getMissingDetailsStats,
} from '../../utils/missingDetailsAudit';

export type BulkSuiteTab = 'text_parser' | 'colorways' | 'batch_edit';

export interface BulkSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
  defaultDestination?: 'wardrobe' | 'shopping' | 'selling';
  initialTab?: BulkSuiteTab;
  initialItemToVariant?: WardrobeItem | null;
  initialSelectedIds?: string[];
}

// Preset color chips for instant multi-colorway selection
const PRESET_COLORWAYS: Array<{ name: string; hex: string }> = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Heather Grey', hex: '#9E9E9E' },
  { name: 'Charcoal', hex: '#373737' },
  { name: 'Olive Green', hex: '#556B2F' },
  { name: 'Sage', hex: '#9CAF88' },
  { name: 'Ecru / Cream', hex: '#F5F2EB' },
  { name: 'Camel / Tan', hex: '#C19A6B' },
  { name: 'Dark Brown', hex: '#4A2C11' },
  { name: 'Sky Blue', hex: '#87CEEB' },
  { name: 'Forest Green', hex: '#224B2C' },
  { name: 'Burgundy / Wine', hex: '#6A1A24' },
  { name: 'Khaki', hex: '#BDB76B' },
  { name: 'Oatmeal', hex: '#D7C4A5' },
  { name: 'Dusty Pink', hex: '#D8A0A6' },
  { name: 'Cobalt', hex: '#0047AB' },
  { name: 'Terracotta', hex: '#CC4E33' },
];

// Predefined palette bundles
const PALETTE_PACKS = [
  {
    name: 'Essential Neutrals',
    colors: ['White', 'Black', 'Navy', 'Heather Grey'],
  },
  {
    name: 'Earthy & Heritage',
    colors: ['Olive Green', 'Camel / Tan', 'Ecru / Cream', 'Dark Brown'],
  },
  {
    name: 'Monochrome Palette',
    colors: ['White', 'Ecru / Cream', 'Charcoal', 'Black'],
  },
  {
    name: 'Seasonal Transition',
    colors: ['Sage', 'Sky Blue', 'Oatmeal', 'Navy'],
  },
];

export const BulkSuiteModal: React.FC<BulkSuiteModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
  defaultDestination = 'wardrobe',
  initialTab = 'text_parser',
  initialItemToVariant = null,
  initialSelectedIds = [],
}) => {
  const {
    items,
    batchAddItems,
    batchAddShoppingItems,
    batchAddSaleItems,
    batchUpdateItems,
    deleteMultipleItems,
    categories,
    formatCurrency,
  } = useWardrobe();

  const [activeTab, setActiveTab] = useState<BulkSuiteTab>(initialTab);
  const [targetDestination, setTargetDestination] = useState<'wardrobe' | 'shopping' | 'selling'>(
    defaultDestination
  );

  // Sync initial tab when reopened
  useEffect(() => {
    if (isOpen) {
      if (initialItemToVariant) {
        setActiveTab('colorways');
      } else if (initialSelectedIds && initialSelectedIds.length > 0) {
        setActiveTab('batch_edit');
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, initialItemToVariant, initialSelectedIds]);

  // --------------------------------------------------------------------------
  // TAB 1: TEXT PARSER STATE
  // --------------------------------------------------------------------------
  const [rawText, setRawText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [pickerItemIndex, setPickerItemIndex] = useState<number | null>(null);
  const [isScoutingAllPhotos, setIsScoutingAllPhotos] = useState(false);
  const [scoutProgress, setScoutProgress] = useState<{ current: number; total: number } | null>(null);
  const [isAiFormatting, setIsAiFormatting] = useState(false);
  const [aiFormatFeedback, setAiFormatFeedback] = useState<string | null>(null);

  // Real-time parsing from raw text
  const parsedItems = useMemo(() => {
    return parseBatchPastedText(rawText, defaultCategory ? (defaultCategory as Category) : undefined);
  }, [rawText, defaultCategory]);

  const [customItems, setCustomItems] = useState<ParsedBatchLineItem[]>([]);

  useEffect(() => {
    setCustomItems(parsedItems);
  }, [parsedItems]);

  const handleUpdateItemField = (index: number, field: keyof ParsedBatchLineItem, value: any) => {
    setCustomItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'color') {
        next[index].colorHex = getColorSwatchHex(value);
      }
      return next;
    });
  };

  const handleDeleteItem = (index: number) => {
    setCustomItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDuplicateItemWithColorPrompt = (index: number) => {
    const item = customItems[index];
    if (!item) return;
    const newColor = prompt(`Enter new color for "${item.brand} ${item.name}":`, 'Navy');
    if (!newColor) return;
    const newItem: ParsedBatchLineItem = {
      ...item,
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      color: newColor.trim(),
      colorHex: getColorSwatchHex(newColor.trim()),
      imageUrl: '',
      allCandidateImages: [],
      rawLine: `${item.brand} - ${item.name} - ${newColor.trim()} - ${item.material || 'Fabric'} - ${item.size || 'M'} - £${item.purchasePrice}`,
    };
    setCustomItems((prev) => [...prev.slice(0, index + 1), newItem, ...prev.slice(index + 1)]);
  };

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
          console.warn('Batch photo scout error:', it.name, e);
        }
      }
    }

    setIsScoutingAllPhotos(false);
    setScoutProgress(null);
  };

  const handleAiAutoFormat = async () => {
    if (!rawText.trim() || isAiFormatting) return;
    setIsAiFormatting(true);
    setAiFormatFeedback(null);

    try {
      const res = await fetch('/api/gemini/extract-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        const formattedLines = data.items.map((it: any) =>
          formatGarmentToStandardLine({
            brand: it.brand || 'Unbranded',
            name: it.name || 'Garment Piece',
            color: it.color || 'Neutral',
            material: it.material || 'Natural Fiber / Blend',
            size: it.size || 'M',
            purchasePrice: it.purchasePrice || 45,
          })
        );
        setRawText(formattedLines.join('\n'));
        setAiFormatFeedback(`AI standardized ${formattedLines.length} pieces into clean format!`);
      } else {
        setAiFormatFeedback('AI could not extract distinct items; using existing lines.');
      }
    } catch (err: any) {
      setAiFormatFeedback('AI service unavailable; keeping raw text.');
    } finally {
      setIsAiFormatting(false);
      setTimeout(() => setAiFormatFeedback(null), 5000);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText((prev) => (prev ? `${prev}\n${text}` : text));
      }
    } catch {
      // Ignored
    }
  };

  // --------------------------------------------------------------------------
  // TAB 2: COLORWAY MATRIX & MULTI-VARIANT GENERATOR STATE
  // --------------------------------------------------------------------------
  const [baseBrand, setBaseBrand] = useState(initialItemToVariant?.brand || '');
  const [baseName, setBaseName] = useState(initialItemToVariant?.name || '');
  const [baseCategory, setBaseCategory] = useState<string>(initialItemToVariant?.category || 'Tops');
  const [baseMaterial, setBaseMaterial] = useState(initialItemToVariant?.material || '100% Cotton');
  const [baseSize, setBaseSize] = useState(initialItemToVariant?.size || 'M');
  const [basePrice, setBasePrice] = useState(initialItemToVariant?.purchasePrice !== undefined && initialItemToVariant?.purchasePrice !== null ? String(initialItemToVariant.purchasePrice) : '0');
  const [baseRrp, setBaseRrp] = useState(initialItemToVariant?.rrp !== undefined && initialItemToVariant?.rrp !== null ? String(initialItemToVariant.rrp) : '0');
  const [baseLocation, setBaseLocation] = useState(initialItemToVariant?.storageLocation || 'Main Closet');
  const [baseSeasons, setBaseSeasons] = useState<Season[]>(initialItemToVariant?.season || ['Autumn', 'Winter', 'Spring']);

  // Selected colors for variants (default price and rrp are 0)
  const [selectedColors, setSelectedColors] = useState<Array<{ name: string; hex: string; size: string; price: number; location: string; imageUrl?: string }>>([
    { name: 'White', hex: '#FFFFFF', size: initialItemToVariant?.size || 'M', price: initialItemToVariant?.purchasePrice || 0, location: initialItemToVariant?.storageLocation || 'Main Closet' },
    { name: 'Black', hex: '#1A1A1A', size: initialItemToVariant?.size || 'M', price: initialItemToVariant?.purchasePrice || 0, location: initialItemToVariant?.storageLocation || 'Main Closet' },
    { name: 'Navy', hex: '#1B2A4A', size: initialItemToVariant?.size || 'M', price: initialItemToVariant?.purchasePrice || 0, location: initialItemToVariant?.storageLocation || 'Main Closet' },
  ]);

  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#8C7355');
  const [isScoutingVariantPhotos, setIsScoutingVariantPhotos] = useState(false);
  const [variantPhotoScoutIdx, setVariantPhotoScoutIdx] = useState<number | null>(null);

  // Synchronize base values when initialItemToVariant changes
  useEffect(() => {
    if (isOpen && initialItemToVariant) {
      setBaseBrand(initialItemToVariant.brand || '');
      setBaseName(initialItemToVariant.name || '');
      setBaseCategory(initialItemToVariant.category || 'Tops');
      setBaseMaterial(initialItemToVariant.material || '100% Cotton');
      setBaseSize(initialItemToVariant.size || 'M');
      setBasePrice(initialItemToVariant.purchasePrice !== undefined && initialItemToVariant.purchasePrice !== null ? String(initialItemToVariant.purchasePrice) : '0');
      setBaseRrp(initialItemToVariant.rrp !== undefined && initialItemToVariant.rrp !== null ? String(initialItemToVariant.rrp) : '0');
      setBaseLocation(initialItemToVariant.storageLocation || 'Main Closet');
      setBaseSeasons(
        initialItemToVariant.season && initialItemToVariant.season.length > 0
          ? initialItemToVariant.season
          : ['Autumn', 'Winter', 'Spring']
      );
      if (initialItemToVariant.color) {
        setSelectedColors((prev) => {
          if (!prev.some((c) => c.name.toLowerCase() === initialItemToVariant.color.toLowerCase())) {
            return [
              {
                name: initialItemToVariant.color,
                hex: initialItemToVariant.colorHex || getColorSwatchHex(initialItemToVariant.color),
                size: initialItemToVariant.size || 'M',
                price: initialItemToVariant.purchasePrice || 0,
                location: initialItemToVariant.storageLocation || 'Main Closet',
                imageUrl: initialItemToVariant.imageUrl || '',
              },
              ...prev,
            ];
          }
          return prev;
        });
      }
    }
  }, [isOpen, initialItemToVariant]);

  // Toggle or add color
  const handleTogglePresetColor = (color: { name: string; hex: string }) => {
    setSelectedColors((prev) => {
      const exists = prev.some((c) => c.name.toLowerCase() === color.name.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.name.toLowerCase() !== color.name.toLowerCase());
      } else {
        return [
          ...prev,
          {
            name: color.name,
            hex: color.hex,
            size: baseSize || 'M',
            price: parseFloat(basePrice) || 0,
            location: baseLocation || 'Main Closet',
          },
        ];
      }
    });
  };

  const handleApplyPalettePack = (packColors: string[]) => {
    setSelectedColors((prev) => {
      const next = [...prev];
      for (const colName of packColors) {
        if (!next.some((c) => c.name.toLowerCase() === colName.toLowerCase())) {
          const foundPreset = PRESET_COLORWAYS.find((p) => p.name.toLowerCase() === colName.toLowerCase());
          next.push({
            name: colName,
            hex: foundPreset?.hex || getColorSwatchHex(colName),
            size: baseSize || 'M',
            price: parseFloat(basePrice) || 0,
            location: baseLocation || 'Main Closet',
          });
        }
      }
      return next;
    });
  };

  const handleAddCustomColor = () => {
    if (!customColorName.trim()) return;
    const clean = customColorName.trim();
    if (!selectedColors.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      setSelectedColors((prev) => [
        ...prev,
        {
          name: clean,
          hex: customColorHex || getColorSwatchHex(clean),
          size: baseSize || 'M',
          price: parseFloat(basePrice) || 0,
          location: baseLocation || 'Main Closet',
        },
      ]);
    }
    setCustomColorName('');
  };

  const handleUpdateVariantColor = (idx: number, field: string, val: any) => {
    setSelectedColors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'name') {
        next[idx].hex = getColorSwatchHex(val);
      }
      return next;
    });
  };

  const handleDuplicateVariantRow = (idx: number) => {
    const item = selectedColors[idx];
    if (!item) return;
    setSelectedColors((prev) => [
      ...prev.slice(0, idx + 1),
      { ...item, name: `${item.name} (Copy)` },
      ...prev.slice(idx + 1),
    ]);
  };

  const handleDeleteVariantRow = (idx: number) => {
    setSelectedColors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleScoutVariantPhotos = async () => {
    if (selectedColors.length === 0 || isScoutingVariantPhotos) return;
    setIsScoutingVariantPhotos(true);

    for (let i = 0; i < selectedColors.length; i++) {
      const v = selectedColors[i];
      if (!v.imageUrl && baseBrand && baseName) {
        try {
          const res = await findProductImageForGarment(baseBrand, baseName, v.name, baseCategory);
          if (res.primaryImageUrl) {
            handleUpdateVariantColor(i, 'imageUrl', res.primaryImageUrl);
          }
        } catch (e) {
          console.warn('Scout error for variant:', v.name, e);
        }
      }
    }

    setIsScoutingVariantPhotos(false);
  };

  const handleCreateColorwayVariants = () => {
    if (selectedColors.length === 0 || !baseBrand.trim() || !baseName.trim()) return;

    const payload = selectedColors.map((v) => ({
      name: baseName.trim(),
      brand: baseBrand.trim(),
      category: (baseCategory || 'Tops') as Category,
      color: v.name.trim(),
      colorHex: v.hex || getColorSwatchHex(v.name),
      material: baseMaterial.trim(),
      size: v.size.trim(),
      purchasePrice: v.price || 0,
      rrp: parseFloat(baseRrp) || undefined,
      currentValuation: v.price || 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      condition: 'Pristine / New' as Condition,
      season: baseSeasons,
      imageUrl: v.imageUrl || '',
      tags: [baseBrand.toLowerCase(), baseCategory.toLowerCase(), v.name.toLowerCase()].filter(Boolean),
      isFavorite: false,
      isArchived: false,
      storageLocation: v.location.trim() || undefined,
      notes: `Colorway variant of ${baseBrand} ${baseName} in ${v.name}`,
      careNotes: '',
    }));

    if (targetDestination === 'wardrobe') {
      batchAddItems(payload, `Added ${payload.length} colorway variants of ${baseBrand} ${baseName}`);
    } else if (targetDestination === 'shopping') {
      const shopPayload = payload.map((p) => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        color: p.color,
        material: p.material,
        size: p.size,
        targetPrice: p.purchasePrice,
        estimatedPrice: p.purchasePrice,
        rrp: p.rrp,
        priority: 'Medium' as const,
        status: 'To Buy' as const,
        season: p.season[0] || 'All-Season',
        imageUrl: p.imageUrl,
        tags: p.tags,
        reasonOrGap: `Capsule staple variant in ${p.color}`,
        matchingWardrobeItemIds: [],
        notes: p.notes,
      }));
      batchAddShoppingItems(shopPayload, `Added ${shopPayload.length} wishlist variants`);
    } else {
      const sellPayload = payload.map((p) => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        color: p.color,
        size: p.size,
        listingPrice: p.purchasePrice,
        originalPurchasePrice: p.purchasePrice,
        originalPricePaid: p.purchasePrice,
        platform: 'Vinted' as const,
        status: 'Draft' as const,
        condition: p.condition,
        imageUrl: p.imageUrl,
        listedDate: new Date().toISOString().split('T')[0],
        tags: p.tags,
        notes: p.notes,
      }));
      batchAddSaleItems(sellPayload, `Added ${sellPayload.length} resale variants`);
    }

    // Reset dialogue ready for next entries
    setBaseBrand('');
    setBaseName('');
    setBaseCategory('Tops');
    setBaseMaterial('100% Cotton');
    setBaseSize('M');
    setBasePrice('0');
    setBaseRrp('0');
    setCustomColorName('');
    setSelectedColors([
      { name: 'White', hex: '#FFFFFF', size: 'M', price: 0, location: 'Main Closet' },
      { name: 'Black', hex: '#1A1A1A', size: 'M', price: 0, location: 'Main Closet' },
      { name: 'Navy', hex: '#1B2A4A', size: 'M', price: 0, location: 'Main Closet' },
    ]);

    onClose();
  };

  // --------------------------------------------------------------------------
  // TAB 3: BATCH VARIANT & MULTI-ITEM EDITOR STATE
  // --------------------------------------------------------------------------
  const [editorSearchQuery, setEditorSearchQuery] = useState('');
  const [loadedEditorItemIds, setLoadedEditorItemIds] = useState<string[]>(
    initialSelectedIds.length > 0 ? initialSelectedIds : []
  );

  // Missing details statistics & quick-load filters
  const missingStats = useMemo(() => getMissingDetailsStats(items), [items]);

  const handleLoadMissing = (criteria: MissingCriteria) => {
    const matched = filterItemsByMissingCriteria(items, criteria);
    setLoadedEditorItemIds(matched.map((i) => i.id));
  };

  useEffect(() => {
    if (isOpen && initialSelectedIds && initialSelectedIds.length > 0) {
      setLoadedEditorItemIds(initialSelectedIds);
    }
  }, [isOpen, initialSelectedIds]);

  // Auto-detect existing variant clusters in wardrobe (items sharing brand & name)
  const variantClusters = useMemo(() => {
    const groups: Record<string, WardrobeItem[]> = {};
    for (const it of items) {
      if (it.isArchived) continue;
      const key = `${it.brand.trim().toLowerCase()}__${it.name.trim().toLowerCase()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    }
    return Object.entries(groups)
      .filter(([_, list]) => list.length >= 2)
      .map(([_, list]) => ({
        brand: list[0].brand,
        name: list[0].name,
        count: list.length,
        colors: list.map((i) => i.color).filter(Boolean),
        ids: list.map((i) => i.id),
      }));
  }, [items]);

  // Items currently loaded in the matrix editor
  const [editorItemsState, setEditorItemsState] = useState<WardrobeItem[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Keep editor items in sync with loaded IDs
  useEffect(() => {
    if (loadedEditorItemIds.length > 0) {
      const matched = items.filter((i) => loadedEditorItemIds.includes(i.id));
      setEditorItemsState(matched);
    } else {
      setEditorItemsState([]);
    }
  }, [loadedEditorItemIds, items]);

  // Filtered wardrobe list for manual item loader
  const filteredWardrobeSelection = useMemo(() => {
    if (!editorSearchQuery.trim()) return [];
    const q = editorSearchQuery.toLowerCase();
    return items
      .filter(
        (it) =>
          !it.isArchived &&
          (it.brand.toLowerCase().includes(q) ||
            it.name.toLowerCase().includes(q) ||
            it.color.toLowerCase().includes(q) ||
            (it.material && it.material.toLowerCase().includes(q)))
      )
      .slice(0, 15);
  }, [items, editorSearchQuery]);

  const handleUpdateEditorCell = (id: string, field: keyof WardrobeItem, val: any) => {
    setEditorItemsState((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  // Bulk transform fields across all loaded items in editor
  const [batchMaterialInput, setBatchMaterialInput] = useState('');
  const [batchLocationInput, setBatchLocationInput] = useState('');
  const [batchSizeInput, setBatchSizeInput] = useState('');
  const [batchBrandInput, setBatchBrandInput] = useState('');
  const [batchPriceInput, setBatchPriceInput] = useState('');
  const [batchCategoryInput, setBatchCategoryInput] = useState('');

  const handleApplyBatchField = (
    field: 'material' | 'storageLocation' | 'size' | 'brand' | 'purchasePrice' | 'category',
    val: string
  ) => {
    if (!val.trim()) return;
    setEditorItemsState((prev) =>
      prev.map((it) => {
        if (field === 'purchasePrice') {
          const num = parseFloat(val) || 0;
          return { ...it, purchasePrice: num, currentValuation: num };
        }
        return {
          ...it,
          [field]: val.trim(),
        };
      })
    );
  };

  const handleSaveAllEditorChanges = () => {
    if (editorItemsState.length === 0) return;

    // Call batchUpdateItems for each modified item
    const updatesMap = new Map<string, Partial<WardrobeItem>>();
    for (const it of editorItemsState) {
      updatesMap.set(it.id, {
        brand: it.brand,
        name: it.name,
        color: it.color,
        colorHex: getColorSwatchHex(it.color),
        size: it.size,
        material: it.material,
        purchasePrice: it.purchasePrice,
        storageLocation: it.storageLocation,
        condition: it.condition,
        wearCount: it.wearCount,
      });
    }

    batchUpdateItems(
      editorItemsState.map((i) => i.id),
      (item) => updatesMap.get(item.id) || {},
      `Batch updated ${editorItemsState.length} wardrobe pieces in Variant Suite`
    );

    setSaveSuccessMsg(`Successfully saved updates across ${editorItemsState.length} items!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // --------------------------------------------------------------------------
  // CREATE EXECUTION FOR TAB 1 (TEXT PARSER)
  // --------------------------------------------------------------------------
  const handleCreateTextParsedItems = (openScannerAfterwards: boolean = false) => {
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
        rrp: item.rrp !== undefined ? item.rrp : (item.purchasePrice || 0),
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-[#FAF9F6] border border-[#E5E5E1] shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden rounded-xs">
        {/* Top Header with Suite Title & Tabs */}
        <div className="bg-white border-b border-[#E5E5E1] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-[#8C7355] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-[#1A1A1A]">
                  Bulk Inventory &amp; Multi-Variant Suite
                </h2>
                <span className="bg-[#8C7355]/10 text-[#8C7355] text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs border border-[#8C7355]/30">
                  Universal Multi-Item Studio
                </span>
              </div>
              <p className="text-xs text-[#767670] mt-0.5">
                Bulk add via text format, generate multiple colors of the same piece, and edit variants side-by-side.
              </p>
            </div>
          </div>

          {/* 3 Main Mode Switcher Tabs */}
          <div className="flex items-center bg-[#F2F1ED] p-1 rounded-xs border border-[#E5E5E1] gap-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('text_parser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-medium cursor-pointer transition-all ${
                activeTab === 'text_parser'
                  ? 'bg-white text-[#1A1A1A] font-bold shadow-xs'
                  : 'text-[#5A5A55] hover:text-[#1A1A1A]'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Multi-Line Text Parser</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('colorways')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-medium cursor-pointer transition-all ${
                activeTab === 'colorways'
                  ? 'bg-white text-[#1A1A1A] font-bold shadow-xs'
                  : 'text-[#5A5A55] hover:text-[#1A1A1A]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Colorway &amp; Variant Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch_edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-medium cursor-pointer transition-all ${
                activeTab === 'batch_edit'
                  ? 'bg-white text-[#1A1A1A] font-bold shadow-xs'
                  : 'text-[#5A5A55] hover:text-[#1A1A1A]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Batch Variant Editor ({editorItemsState.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-xs hover:bg-[#F2F1ED] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: RAPID MULTI-LINE TEXT PARSER (brand - item - colour - Material - size) */}
        {/* ========================================================================= */}
        {activeTab === 'text_parser' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Syntax Format Guide Banner */}
            <div className="bg-[#FAF0E6]/50 border-b border-[#E5DCD0] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-[#5C4830]">
                <span className="font-bold flex items-center gap-1 text-[#8C7355]">
                  <Sparkles className="w-3.5 h-3.5" /> Syntax Format:
                </span>
                <span className="px-2 py-0.5 bg-white border border-[#D5C7B5] rounded-xs font-bold text-[#1A1A1A]">
                  Brand - Item - Colour - Material - Size - £Price
                </span>
                <span className="text-[11px] text-[#7A6A55]">
                  (Supports hyphens, tabs, or pipes. Listing multiple colours like <em>"White, Black, Navy"</em> creates 3 pieces automatically!)
                </span>
              </div>

              {/* Sample Presets Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#767670]">Presets:</span>
                {SAMPLE_BATCH_INPUTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRawText(sample.text)}
                    className="px-2 py-0.5 bg-white border border-[#E5E5E1] text-[#8C7355] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] rounded-xs transition-colors cursor-pointer text-[11px]"
                  >
                    {sample.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Config bar for Target Destination & Default Category */}
            <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] px-5 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#767670]">Destination:</span>
                  <div className="inline-flex border border-[#D5D5D0] bg-white rounded-xs p-0.5">
                    <button
                      type="button"
                      onClick={() => setTargetDestination('wardrobe')}
                      className={`px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-all ${
                        targetDestination === 'wardrobe' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#4A4A45]'
                      }`}
                    >
                      <Shirt className="w-3 h-3" />
                      <span>Wardrobe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDestination('shopping')}
                      className={`px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-all ${
                        targetDestination === 'shopping' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#4A4A45]'
                      }`}
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Wishlist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDestination('selling')}
                      className={`px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-all ${
                        targetDestination === 'selling' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#4A4A45]'
                      }`}
                    >
                      <PoundSterling className="w-3 h-3" />
                      <span>Resale</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#767670]">Default Category:</span>
                  <div className="w-40">
                    <CategorySelect
                      value={defaultCategory}
                      onChange={(val) => setDefaultCategory(val as Category)}
                      categories={categories}
                      allowEmpty={true}
                      emptyOptionLabel="Auto-detect / Empty"
                      className="px-2 py-0.5 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* AI Auto-Standardize Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiAutoFormat}
                  disabled={isAiFormatting || !rawText.trim()}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#8C7355] border border-[#8C7355]/40 rounded-xs flex items-center gap-1 font-bold cursor-pointer transition-colors disabled:opacity-40"
                  title="Use AI to structure messy notes or shopping cart receipts into clean Brand - Item - Colour - Material - Size format"
                >
                  {isAiFormatting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-[#8C7355]" />
                      <span>Standardizing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 text-[#8C7355]" />
                      <span>AI Tidy &amp; Standardize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiFormatFeedback && (
              <div className="px-5 py-1.5 bg-emerald-50 border-b border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-1.5 animate-fadeIn shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>{aiFormatFeedback}</span>
              </div>
            )}

            {/* Split Screen: Left Text Editor | Right Live Parsed Preview Table */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E1] overflow-hidden">
              {/* Left Column: Multi-Line Input */}
              <div className="p-4 sm:p-5 flex flex-col h-full overflow-hidden bg-white">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E5E1] text-xs font-mono">
                  <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <span>Text Input Lines</span>
                    {customItems.length > 0 && (
                      <span className="bg-[#8C7355]/15 text-[#8C7355] px-1.5 py-0.2 rounded-2xs font-bold">
                        {customItems.length} parsed pieces
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="text-[#8C7355] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste Clipboard</span>
                    </button>
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => setRawText('')}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Format: Brand - Item - Colour - Material - Size - £Price

Examples:
Barbour - Bedale Waxed Jacket - Sage Olive - Waxed Cotton - 40R - £280
Uniqlo - Supima Cotton Crew Neck - White - 100% Cotton - M - £14.90
Uniqlo - Supima Cotton Crew Neck - Black - 100% Cotton - M - £14.90
Uniqlo - Supima Cotton Crew Neck - Navy, Heather Grey - 100% Cotton - L - £14.90
COS - Relaxed Wool Trousers - Charcoal - 100% Merino Wool - 32/32 - £115
Drake's - Lambswool Shawl Collar Cardigan - Dark Navy - 100% Lambswool - 40R - £395`}
                  className="flex-1 w-full p-3 font-mono text-xs bg-[#FAF9F6] border border-[#E5E5E1] rounded-xs text-[#1A1A1A] placeholder:text-[#A5A59E] resize-none focus:outline-none focus:bg-white focus:border-[#8C7355] leading-relaxed"
                />

                <div className="pt-2 text-[11px] font-mono text-[#767670] flex items-center justify-between">
                  <span>Enter 1 line per item or variant. Delimiters: hyphen (-), tab (\t), or pipe (|).</span>
                  <span>{rawText.split('\n').filter((l) => l.trim()).length} raw lines</span>
                </div>
              </div>

              {/* Right Column: Interactive Parsed Items Table */}
              <div className="p-4 sm:p-5 flex flex-col h-full overflow-hidden bg-[#FAF9F6]">
                <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#E5E5E1] text-xs font-mono gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Live Parsed Pieces ({customItems.length})
                    </span>
                    {customItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleScoutAllPhotos}
                        disabled={isScoutingAllPhotos}
                        className="px-2.5 py-1 bg-[#8C7355]/10 hover:bg-[#8C7355]/20 text-[#8C7355] border border-[#8C7355]/30 rounded-xs flex items-center gap-1 font-bold cursor-pointer transition-colors"
                        title="Automatically search Google Grounding, Brand Official Sites & Luxury Retailers for authentic photos"
                      >
                        {isScoutingAllPhotos ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-[#8C7355]" />
                            <span>Finding ({scoutProgress?.current}/{scoutProgress?.total})...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            <span>Find Photos for All</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="text-[#767670]">
                    Total Value: {formatCurrency(customItems.reduce((acc, it) => acc + (it.purchasePrice || 0), 0))}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {customItems.length > 0 ? (
                    customItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`p-3 bg-white border rounded-xs shadow-2xs space-y-2 text-xs font-mono transition-colors ${
                          item.isMultiVariant ? 'border-amber-300 bg-amber-50/20' : 'border-[#E5E5E1]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Photo Thumbnail */}
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
                                title="Find product photograph"
                              >
                                <Search className="w-3.5 h-3.5 mb-0.5" />
                                <span className="text-[8px] font-bold">Photo</span>
                              </button>
                            )}
                          </div>

                          {/* Editable Fields Grid */}
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 bg-[#F2F1ED] text-[#767670] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item.brand}
                                onChange={(e) => handleUpdateItemField(idx, 'brand', e.target.value)}
                                className="font-bold text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D5D5D0] focus:border-[#8C7355] focus:outline-none w-28 shrink-0"
                                placeholder="Brand"
                              />
                              <span>—</span>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItemField(idx, 'name', e.target.value)}
                                className="text-[#1A1A1A] font-semibold bg-transparent border-b border-dashed border-[#D5D5D0] focus:border-[#8C7355] focus:outline-none flex-1 min-w-[120px]"
                                placeholder="Model Name"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#767670]">
                              {/* Color with Swatch */}
                              <div className="flex items-center gap-1">
                                <span
                                  className="w-3 h-3 rounded-full border border-black/25 shrink-0"
                                  style={{ backgroundColor: getColorSwatchHex(item.color) }}
                                />
                                <input
                                  type="text"
                                  value={item.color}
                                  onChange={(e) => handleUpdateItemField(idx, 'color', e.target.value)}
                                  className="w-20 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] focus:outline-none font-medium"
                                  placeholder="Color"
                                />
                              </div>

                              {/* Material */}
                              <div className="flex items-center gap-1">
                                <span className="text-[#8C7355]">Fab:</span>
                                <input
                                  type="text"
                                  value={item.material || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'material', e.target.value)}
                                  className="w-28 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] focus:outline-none"
                                  placeholder="100% Cotton..."
                                />
                              </div>

                              {/* Size */}
                              <div className="flex items-center gap-1">
                                <span>Sz:</span>
                                <input
                                  type="text"
                                  value={item.size || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'size', e.target.value)}
                                  className="w-12 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] focus:outline-none font-bold"
                                  placeholder="Size"
                                />
                              </div>

                              {/* Category */}
                              <div className="flex items-center gap-1">
                                <span>Cat:</span>
                                <div className="w-24">
                                  <CategorySelect
                                    value={item.category || ''}
                                    onChange={(val) => handleUpdateItemField(idx, 'category', val)}
                                    categories={categories}
                                    allowEmpty={true}
                                    emptyOptionLabel="— Auto —"
                                    className="px-1 py-0.5 text-[10px] text-[#8C7355] font-semibold bg-transparent border-0 border-b border-[#E5E5E1] rounded-none focus:border-[#8C7355]"
                                  />
                                </div>
                              </div>

                              {/* Price */}
                              <div className="flex items-center gap-1">
                                <span>£</span>
                                <input
                                  type="number"
                                  value={item.purchasePrice || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] font-bold focus:outline-none"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Row Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateItemWithColorPrompt(idx)}
                              className="p-1 text-[#8C7355] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] rounded-xs cursor-pointer transition-colors"
                              title="Add another colourway of this piece"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              className="p-1 text-[#A5A59E] hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A5A59E]">
                      <ClipboardPaste className="w-8 h-8 mb-2 opacity-50 text-[#8C7355]" />
                      <p className="text-xs font-mono font-medium text-[#767670]">
                        No parsed items yet.
                      </p>
                      <p className="text-[11px] font-mono text-[#A5A59E] mt-1">
                        Paste lines on the left like <code>Barbour - Bedale - Sage Olive - Waxed Cotton - 40R - £280</code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar for Tab 1 */}
            <div className="bg-white border-t border-[#E5E5E1] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-[#767670]">
                  Ready to add <strong className="text-[#1A1A1A]">{customItems.length}</strong> pieces to {targetDestination}
                </span>
                {customItems.some((it) => it.imageUrl) && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-2xs border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{customItems.filter((it) => it.imageUrl).length} photos attached</span>
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
                    onClick={() => handleCreateTextParsedItems(true)}
                    disabled={customItems.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold bg-[#FAF9F6] border border-[#8C7355] text-[#8C7355] hover:bg-[#F2EFE9] rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Create &amp; Open Scanner ({customItems.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCreateTextParsedItems(false)}
                  disabled={customItems.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5 text-amber-200" />
                  <span>Create All ({customItems.length}) in {targetDestination === 'wardrobe' ? 'Closet' : targetDestination}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: COLORWAY MATRIX & MULTI-VARIANT GENERATOR (Same item in diff colors) */}
        {/* ========================================================================= */}
        {activeTab === 'colorways' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Intro Bar */}
            <div className="bg-[#FAF9F6] border-b border-[#E5E5E1] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#8C7355]" />
                  Multi-Colorway Variant Generator
                </span>
                <span className="text-[#767670]">
                  Configure your staple piece once, pick all the colours you own, and generate individual inventory records in one go.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#767670]">Destination:</span>
                <div className="inline-flex border border-[#D5D5D0] bg-white rounded-xs p-0.5">
                  <button
                    type="button"
                    onClick={() => setTargetDestination('wardrobe')}
                    className={`px-2 py-0.5 cursor-pointer ${targetDestination === 'wardrobe' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#4A4A45]'}`}
                  >
                    Wardrobe
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDestination('shopping')}
                    className={`px-2 py-0.5 cursor-pointer ${targetDestination === 'shopping' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#4A4A45]'}`}
                  >
                    Wishlist
                  </button>
                </div>
              </div>
            </div>

            {/* Body: Left Master Template & Palette | Right Generated Variants Matrix */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E1] overflow-hidden">
              {/* Left Column: Master Template & Color Palette Picker (5 cols) */}
              <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col h-full overflow-y-auto bg-white space-y-4 text-xs font-mono">
                {/* 1. Base Garment Template */}
                <div className="space-y-3 pb-4 border-b border-[#E5E5E1]">
                  <h4 className="font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>1. Base Garment Specifications</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Brand / Designer *</label>
                      <input
                        type="text"
                        value={baseBrand}
                        onChange={(e) => setBaseBrand(e.target.value)}
                        placeholder="e.g. Uniqlo, COS, Barbour"
                        className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Garment Model / Name *</label>
                      <input
                        type="text"
                        value={baseName}
                        onChange={(e) => setBaseName(e.target.value)}
                        placeholder="e.g. Supima Cotton Crew Neck"
                        className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Category</label>
                      <CategorySelect
                        value={baseCategory}
                        onChange={(val) => setBaseCategory(val)}
                        categories={categories}
                        className="px-2 py-1.5 text-xs bg-[#FAF9F6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Fabric / Material</label>
                      <input
                        type="text"
                        value={baseMaterial}
                        onChange={(e) => setBaseMaterial(e.target.value)}
                        placeholder="e.g. 100% Cotton, Merino Wool"
                        className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Default Size</label>
                      <input
                        type="text"
                        value={baseSize}
                        onChange={(e) => {
                          setBaseSize(e.target.value);
                          // Propagate to variants that still use previous base size
                          setSelectedColors((prev) =>
                            prev.map((c) => ({ ...c, size: e.target.value }))
                          );
                        }}
                        placeholder="M"
                        className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Price Paid (£)</label>
                      <input
                        type="number"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="25"
                        className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#767670] block mb-1">Storage Location</label>
                      <input
                        type="text"
                        value={baseLocation}
                        onChange={(e) => setBaseLocation(e.target.value)}
                        placeholder="Drawer 1"
                        className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Colorways Palette Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#8C7355]" />
                      <span>2. Select Colorways ({selectedColors.length} selected)</span>
                    </h4>
                    {selectedColors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedColors([])}
                        className="text-rose-600 hover:underline text-[10px]"
                      >
                        Clear colors
                      </button>
                    )}
                  </div>

                  {/* Preset Packs */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#767670]">Quick Palette Packs:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PALETTE_PACKS.map((pack) => (
                        <button
                          key={pack.name}
                          type="button"
                          onClick={() => handleApplyPalettePack(pack.colors)}
                          className="px-2 py-1 bg-[#F8F7F4] hover:bg-[#EAE8E3] border border-[#D5D5D0] rounded-xs text-[10px] transition-colors cursor-pointer"
                        >
                          + {pack.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preset Color Swatch Chips */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {PRESET_COLORWAYS.map((preset) => {
                      const isSelected = selectedColors.some(
                        (c) => c.name.toLowerCase() === preset.name.toLowerCase()
                      );
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleTogglePresetColor(preset)}
                          className={`p-1.5 rounded-xs border text-left flex items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#8C7355] bg-amber-50/60 shadow-2xs font-bold text-[#1A1A1A]'
                              : 'border-[#E5E5E1] bg-white hover:border-[#CCCCCC] text-[#5A5A55]'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0 shadow-2xs"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span className="truncate text-[11px]">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Color Input */}
                  <div className="pt-2 border-t border-[#E5E5E1] flex items-center gap-2">
                    <input
                      type="color"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      className="w-7 h-7 rounded-xs border border-[#CCCCCC] cursor-pointer p-0.5 bg-white"
                      title="Pick hex swatch"
                    />
                    <input
                      type="text"
                      value={customColorName}
                      onChange={(e) => setCustomColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomColor();
                        }
                      }}
                      placeholder="Add custom colorway name..."
                      className="flex-1 px-2.5 py-1.5 bg-[#FAF9F6] border border-[#D5D5D0] focus:border-[#8C7355] focus:bg-white focus:outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomColor}
                      disabled={!customColorName.trim()}
                      className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-40 text-white font-bold rounded-xs cursor-pointer text-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Generated Variants Matrix Table (7 cols) */}
              <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col h-full overflow-hidden bg-[#FAF9F6] text-xs font-mono">
                <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#E5E5E1] gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Generated Variant Pieces ({selectedColors.length})
                    </span>
                    {selectedColors.length > 0 && (
                      <button
                        type="button"
                        onClick={handleScoutVariantPhotos}
                        disabled={isScoutingVariantPhotos || !baseBrand || !baseName}
                        className="px-2.5 py-1 bg-[#8C7355]/10 hover:bg-[#8C7355]/20 text-[#8C7355] border border-[#8C7355]/30 rounded-xs flex items-center gap-1 font-bold cursor-pointer transition-colors disabled:opacity-40"
                        title="Automatically search Google and brand sites for authentic photos of each specific colorway"
                      >
                        {isScoutingVariantPhotos ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-[#8C7355]" />
                            <span>Scouting Photos...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            <span>Scout Photos per Colorway</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <span className="text-[#767670]">
                    Total Value: {formatCurrency(selectedColors.reduce((acc, c) => acc + (c.price || 0), 0))}
                  </span>
                </div>

                {/* Variants List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {selectedColors.length > 0 ? (
                    selectedColors.map((variant, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-[#E5E5E1] rounded-xs shadow-2xs space-y-2 hover:border-[#D5D5D0]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Variant Photo or Scout Trigger */}
                          <div className="shrink-0">
                            {variant.imageUrl ? (
                              <div className="relative group/thumb w-11 h-13 rounded-xs border border-[#8C7355]/50 overflow-hidden bg-stone-50 shadow-2xs">
                                <img src={variant.imageUrl} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setVariantPhotoScoutIdx(idx)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center text-white text-[8px] transition-opacity cursor-pointer"
                                  title="Change photo"
                                >
                                  <Edit2 className="w-3 h-3 mb-0.5" />
                                  <span>Change</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setVariantPhotoScoutIdx(idx)}
                                className="w-11 h-13 rounded-xs border border-dashed border-[#D5D5D0] hover:border-[#8C7355] bg-stone-50 hover:bg-[#FAF0E6] flex flex-col items-center justify-center text-[#767670] hover:text-[#8C7355] transition-colors cursor-pointer"
                                title="Scout photo for this specific color"
                              >
                                <Search className="w-3.5 h-3.5 mb-0.5" />
                                <span className="text-[8px] font-bold">Photo</span>
                              </button>
                            )}
                          </div>

                          {/* Editable Variant Row Details */}
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-black/30 shrink-0 shadow-2xs"
                                style={{ backgroundColor: variant.hex }}
                              />
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => handleUpdateVariantColor(idx, 'name', e.target.value)}
                                className="font-bold text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D5D5D0] focus:border-[#8C7355] focus:outline-none w-28 shrink-0"
                                placeholder="Colorway Name"
                              />
                              <span className="text-[#767670] text-[11px] truncate">
                                {baseBrand || 'Brand'} — {baseName || 'Item'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#767670]">
                              <div className="flex items-center gap-1">
                                <span>Size:</span>
                                <input
                                  type="text"
                                  value={variant.size}
                                  onChange={(e) => handleUpdateVariantColor(idx, 'size', e.target.value)}
                                  className="w-12 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] font-bold focus:outline-none"
                                  placeholder="M"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <span>Price (£):</span>
                                <input
                                  type="number"
                                  value={variant.price || ''}
                                  onChange={(e) => handleUpdateVariantColor(idx, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] font-bold focus:outline-none"
                                  placeholder="£0"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <span>Location:</span>
                                <input
                                  type="text"
                                  value={variant.location}
                                  onChange={(e) => handleUpdateVariantColor(idx, 'location', e.target.value)}
                                  className="w-24 bg-transparent border-b border-dashed border-[#D5D5D0] text-[#1A1A1A] focus:outline-none"
                                  placeholder="Drawer 1..."
                                />
                              </div>
                            </div>
                          </div>

                          {/* Row Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateVariantRow(idx)}
                              className="p-1 text-[#8C7355] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] rounded-xs cursor-pointer transition-colors"
                              title="Duplicate colorway (e.g. for different size)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariantRow(idx)}
                              className="p-1 text-[#A5A59E] hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer transition-colors"
                              title="Delete variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A5A59E]">
                      <Palette className="w-8 h-8 mb-2 opacity-50 text-[#8C7355]" />
                      <p className="text-xs font-mono font-medium text-[#767670]">
                        No colorways selected yet.
                      </p>
                      <p className="text-[11px] font-mono text-[#A5A59E] mt-1">
                        Select color chips on the left or click a preset bundle like "Essential Neutrals".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar for Tab 2 */}
            <div className="bg-white border-t border-[#E5E5E1] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-[#767670]">
                  Ready to create <strong className="text-[#1A1A1A]">{selectedColors.length}</strong> colorway records of{' '}
                  <strong className="text-[#8C7355]">{baseBrand || 'Item'} {baseName}</strong>
                </span>
                {selectedColors.some((c) => c.imageUrl) && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-2xs border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{selectedColors.filter((c) => c.imageUrl).length} colorway photos attached</span>
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

                <button
                  type="button"
                  onClick={handleCreateColorwayVariants}
                  disabled={selectedColors.length === 0 || !baseBrand.trim() || !baseName.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5 text-amber-200" />
                  <span>Create All ({selectedColors.length}) Colorway Variants in {targetDestination === 'wardrobe' ? 'Closet' : targetDestination}</span>
                </button>
              </div>
            </div>

            {/* Product Image Picker Modal for single variant */}
            {variantPhotoScoutIdx !== null && selectedColors[variantPhotoScoutIdx] && (
              <ProductImagePickerModal
                isOpen={variantPhotoScoutIdx !== null}
                onClose={() => setVariantPhotoScoutIdx(null)}
                onSelectImage={(url) => {
                  handleUpdateVariantColor(variantPhotoScoutIdx, 'imageUrl', url);
                  setVariantPhotoScoutIdx(null);
                }}
                brand={baseBrand}
                name={baseName}
                color={selectedColors[variantPhotoScoutIdx].name}
                category={baseCategory}
                currentImageUrl={selectedColors[variantPhotoScoutIdx].imageUrl}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BATCH VARIANT & MULTI-ITEM EDITOR (Edit existing multiple items) */}
        {/* ========================================================================= */}
        {activeTab === 'batch_edit' && (
          <div className="flex-1 flex flex-col overflow-hidden text-xs font-mono">
            {/* Header & Item Selector Bar */}
            <div className="bg-[#FAF9F6] border-b border-[#E5E5E1] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#8C7355]" />
                  Batch Multi-Item &amp; Variant Editor
                </span>
                <span className="text-[#767670]">
                  Edit multiple existing pieces side-by-side or apply bulk field transformations.
                </span>
              </div>

              {/* Search to add pieces to editor */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#767670] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={editorSearchQuery}
                  onChange={(e) => setEditorSearchQuery(e.target.value)}
                  placeholder="Search closet to add items..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#D5D5D0] rounded-xs text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                />
                {filteredWardrobeSelection.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D5D5D0] shadow-lg rounded-xs z-30 max-h-48 overflow-y-auto divide-y divide-[#E5E5E1]">
                    {filteredWardrobeSelection.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          if (!loadedEditorItemIds.includes(it.id)) {
                            setLoadedEditorItemIds((prev) => [...prev, it.id]);
                          }
                          setEditorSearchQuery('');
                        }}
                        className="w-full text-left p-2 hover:bg-amber-50/60 flex items-center justify-between gap-2 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: getColorSwatchHex(it.color) }}
                          />
                          <span className="font-bold text-[#1A1A1A]">{it.brand}</span>
                          <span className="truncate">{it.name}</span>
                          <span className="text-[#767670]">({it.color || 'No color'})</span>
                        </div>
                        <span className="text-[10px] text-[#8C7355] font-bold">+ Load</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Clusters Bar (detected items sharing brand/name) */}
            {variantClusters.length > 0 && (
              <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] px-5 py-2 flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-[11px] text-[#767670] font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#8C7355]" /> Detected Variant Groups:
                </span>
                {variantClusters.slice(0, 6).map((group, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setLoadedEditorItemIds((prev) => Array.from(new Set([...prev, ...group.ids])));
                    }}
                    className="px-2 py-0.5 bg-white border border-[#E5E5E1] hover:border-[#8C7355] rounded-xs text-[11px] text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span className="font-bold text-[#8C7355]">{group.brand} {group.name}</span>
                    <span className="text-[#767670]">({group.count} colorways)</span>
                  </button>
                ))}
              </div>
            )}

            {/* Missing Details Audit & Quick Load Filter Bar */}
            <div className="bg-[#FAF9F5] border-b border-[#E5E5E1] px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-bold text-[#8C7355] flex items-center gap-1 mr-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Missing Details Audit:
                </span>
                <button
                  type="button"
                  onClick={() => handleLoadMissing('missing_size')}
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xs flex items-center gap-1 cursor-pointer shadow-2xs font-medium"
                  title="Load all wardrobe pieces without a size"
                >
                  <span>Missing Size</span>
                  <span className="font-bold bg-amber-100 text-amber-900 px-1 rounded-2xs text-[10px]">
                    {missingStats.missingSize}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadMissing('missing_brand')}
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xs flex items-center gap-1 cursor-pointer shadow-2xs font-medium"
                  title="Load all wardrobe pieces without a brand"
                >
                  <span>Missing Brand</span>
                  <span className="font-bold bg-amber-100 text-amber-900 px-1 rounded-2xs text-[10px]">
                    {missingStats.missingBrand}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadMissing('missing_material')}
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xs flex items-center gap-1 cursor-pointer shadow-2xs font-medium"
                  title="Load all wardrobe pieces without fabric material details"
                >
                  <span>Missing Material</span>
                  <span className="font-bold bg-amber-100 text-amber-900 px-1 rounded-2xs text-[10px]">
                    {missingStats.missingMaterial}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadMissing('missing_price')}
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xs flex items-center gap-1 cursor-pointer shadow-2xs font-medium"
                  title="Load all wardrobe pieces with missing or £0 price"
                >
                  <span>Missing Price (£0)</span>
                  <span className="font-bold bg-amber-100 text-amber-900 px-1 rounded-2xs text-[10px]">
                    {missingStats.missingPrice}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadMissing('any_missing')}
                  className="px-2 py-0.5 bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs flex items-center gap-1 cursor-pointer shadow-2xs font-bold"
                  title="Load all wardrobe pieces that have any missing detail"
                >
                  <span>Any Missing Detail</span>
                  <span className="bg-white/20 text-white px-1 rounded-2xs text-[10px]">
                    {missingStats.anyMissing}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoadedEditorItemIds(items.filter((i) => !i.isArchived).map((i) => i.id))}
                  className="px-2 py-0.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-[#1A1A1A] rounded-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Load all active wardrobe pieces into matrix"
                >
                  <span>Load All ({items.filter((i) => !i.isArchived).length})</span>
                </button>
              </div>

              <span className="text-[#767670] text-[11px]">
                {editorItemsState.length} active in editor
              </span>
            </div>

            {/* Global Batch Update Bar ("Apply to all loaded items") */}
            {editorItemsState.length > 0 && (
              <div className="bg-amber-50/70 border-b border-[#E5DCD0] px-5 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-bold text-[#8C7355] uppercase tracking-wider text-[11px] flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3" /> Multi-Change ({editorItemsState.length}) Pieces:
                  </span>

                  {/* Batch Brand */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={batchBrandInput}
                      onChange={(e) => setBatchBrandInput(e.target.value)}
                      placeholder="Brand for all..."
                      className="px-2 py-0.5 bg-white border border-[#D5C7B5] rounded-xs text-[11px] w-28 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBatchField('brand', batchBrandInput);
                        setBatchBrandInput('');
                      }}
                      disabled={!batchBrandInput.trim()}
                      className="px-2 py-0.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-40 text-white rounded-xs text-[10px] font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Batch Size */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={batchSizeInput}
                      onChange={(e) => setBatchSizeInput(e.target.value)}
                      placeholder="Size for all..."
                      className="px-2 py-0.5 bg-white border border-[#D5C7B5] rounded-xs text-[11px] w-22 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBatchField('size', batchSizeInput);
                        setBatchSizeInput('');
                      }}
                      disabled={!batchSizeInput.trim()}
                      className="px-2 py-0.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-40 text-white rounded-xs text-[10px] font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Batch Material */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={batchMaterialInput}
                      onChange={(e) => setBatchMaterialInput(e.target.value)}
                      placeholder="Material for all..."
                      className="px-2 py-0.5 bg-white border border-[#D5C7B5] rounded-xs text-[11px] w-28 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBatchField('material', batchMaterialInput);
                        setBatchMaterialInput('');
                      }}
                      disabled={!batchMaterialInput.trim()}
                      className="px-2 py-0.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-40 text-white rounded-xs text-[10px] font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Batch Location */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={batchLocationInput}
                      onChange={(e) => setBatchLocationInput(e.target.value)}
                      placeholder="Location..."
                      className="px-2 py-0.5 bg-white border border-[#D5C7B5] rounded-xs text-[11px] w-24 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBatchField('storageLocation', batchLocationInput);
                        setBatchLocationInput('');
                      }}
                      disabled={!batchLocationInput.trim()}
                      className="px-2 py-0.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-40 text-white rounded-xs text-[10px] font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Batch Price */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={batchPriceInput}
                      onChange={(e) => setBatchPriceInput(e.target.value)}
                      placeholder="£Price..."
                      className="px-2 py-0.5 bg-white border border-[#D5C7B5] rounded-xs text-[11px] w-20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBatchField('purchasePrice', batchPriceInput);
                        setBatchPriceInput('');
                      }}
                      disabled={!batchPriceInput.trim()}
                      className="px-2 py-0.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-40 text-white rounded-xs text-[10px] font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoadedEditorItemIds([])}
                  className="text-rose-600 hover:underline text-[11px] cursor-pointer"
                >
                  Unload all items
                </button>
              </div>
            )}

            {saveSuccessMsg && (
              <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-1.5 animate-fadeIn shrink-0">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Matrix Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {editorItemsState.length > 0 ? (
                <div className="border border-[#E5E5E1] bg-white rounded-xs overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8F7F4] border-b border-[#E5E5E1] text-[#767670] uppercase font-bold text-[10px]">
                          <th className="p-2.5 w-12 text-center">Photo</th>
                          <th className="p-2.5 min-w-[130px]">Brand</th>
                          <th className="p-2.5 min-w-[160px]">Garment Title</th>
                          <th className="p-2.5 min-w-[120px]">Color Tone</th>
                          <th className="p-2.5 min-w-[80px]">Size</th>
                          <th className="p-2.5 min-w-[140px]">Material / Fabric</th>
                          <th className="p-2.5 min-w-[80px]">Price (£)</th>
                          <th className="p-2.5 min-w-[120px]">Location</th>
                          <th className="p-2.5 min-w-[90px]">Condition</th>
                          <th className="p-2.5 w-16 text-center">Wears</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5E1]">
                        {editorItemsState.map((item) => {
                          const audit = auditGarmentDetails(item);
                          return (
                            <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                              {/* Photo Thumbnail */}
                              <td className="p-2 text-center">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="" className="w-8 h-10 object-cover rounded-xs border border-[#E5E5E1] mx-auto" />
                                ) : (
                                  <div className="w-8 h-10 rounded-xs border border-dashed border-amber-300 bg-amber-50/60 flex items-center justify-center text-amber-800 text-[8px] mx-auto font-bold" title="Missing photo">
                                    No img
                                  </div>
                                )}
                              </td>

                              {/* Brand */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.brand}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'brand', e.target.value)}
                                  className={`w-full font-bold text-[#1A1A1A] bg-transparent border-b focus:border-[#8C7355] focus:outline-none ${
                                    audit.isMissingBrand
                                      ? 'border-dashed border-amber-400 bg-amber-50/60 text-amber-900 placeholder:text-amber-600'
                                      : 'border-transparent'
                                  }`}
                                  placeholder="Missing Brand"
                                />
                              </td>

                              {/* Name */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'name', e.target.value)}
                                  className="w-full font-semibold text-[#1A1A1A] bg-transparent border-b border-transparent focus:border-[#8C7355] focus:outline-none"
                                />
                              </td>

                              {/* Color with Swatch */}
                              <td className="p-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                                    style={{ backgroundColor: getColorSwatchHex(item.color) }}
                                  />
                                  <input
                                    type="text"
                                    value={item.color}
                                    onChange={(e) => handleUpdateEditorCell(item.id, 'color', e.target.value)}
                                    className={`w-full bg-transparent border-b focus:border-[#8C7355] focus:outline-none ${
                                      audit.isMissingColor
                                        ? 'border-dashed border-amber-400 bg-amber-50/60 text-amber-900 placeholder:text-amber-600'
                                        : 'border-transparent'
                                    }`}
                                    placeholder="Missing Color"
                                  />
                                </div>
                              </td>

                              {/* Size */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.size || ''}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'size', e.target.value)}
                                  className={`w-full font-bold text-[#1A1A1A] bg-transparent border-b focus:border-[#8C7355] focus:outline-none ${
                                    audit.isMissingSize
                                      ? 'border-dashed border-amber-400 bg-amber-50/80 text-amber-900 placeholder:text-amber-700'
                                      : 'border-transparent'
                                  }`}
                                  placeholder="Missing Size"
                                />
                              </td>

                              {/* Material */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.material || ''}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'material', e.target.value)}
                                  className={`w-full text-[#767670] bg-transparent border-b focus:border-[#8C7355] focus:outline-none ${
                                    audit.isMissingMaterial
                                      ? 'border-dashed border-amber-400 bg-amber-50/80 text-amber-900 placeholder:text-amber-700'
                                      : 'border-transparent'
                                  }`}
                                  placeholder="Missing Material"
                                />
                              </td>

                              {/* Price */}
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={item.purchasePrice !== undefined && item.purchasePrice !== null ? item.purchasePrice : ''}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                  className={`w-full font-bold text-[#1A1A1A] bg-transparent border-b focus:border-[#8C7355] focus:outline-none ${
                                    audit.isMissingPrice
                                      ? 'border-dashed border-amber-400 bg-amber-50/80 text-amber-900 placeholder:text-amber-700'
                                      : 'border-transparent'
                                  }`}
                                  placeholder="0"
                                />
                              </td>

                              {/* Storage Location */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.storageLocation || ''}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'storageLocation', e.target.value)}
                                  className="w-full bg-transparent border-b border-transparent focus:border-[#8C7355] focus:outline-none"
                                  placeholder="Closet..."
                                />
                              </td>

                              {/* Condition */}
                              <td className="p-2">
                                <select
                                  value={item.condition || 'Good'}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'condition', e.target.value)}
                                  className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#8C7355] text-[11px] focus:outline-none cursor-pointer"
                                >
                                  {['Pristine / New', 'Excellent', 'Good', 'Vintage / Well-Loved'].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Wear Count */}
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.wearCount || 0}
                                  onChange={(e) => handleUpdateEditorCell(item.id, 'wearCount', parseInt(e.target.value, 10) || 0)}
                                  className="w-10 text-center font-mono font-bold bg-transparent border-b border-transparent focus:border-[#8C7355] focus:outline-none"
                                />
                              </td>

                              {/* Remove from loaded set */}
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setLoadedEditorItemIds((prev) => prev.filter((id) => id !== item.id))}
                                  className="text-[#A5A59E] hover:text-rose-600 cursor-pointer"
                                  title="Unload from editor"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-[#D5D5D0] rounded-xs flex flex-col items-center justify-center text-center p-6 text-[#A5A59E]">
                  <Sliders className="w-8 h-8 mb-2 opacity-50 text-[#8C7355]" />
                  <p className="text-xs font-mono font-bold text-[#1A1A1A]">
                    No pieces loaded into the batch editor.
                  </p>
                  <p className="text-[11px] font-mono text-[#767670] mt-1 max-w-md">
                    Use the search bar above to load items, click one of the detected variant clusters (e.g. <em>"Uniqlo T-Shirts"</em>), or select items in your Wardrobe table first.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar for Tab 3 */}
            <div className="bg-white border-t border-[#E5E5E1] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
              <span className="text-[#767670]">
                {editorItemsState.length} pieces loaded in batch editor. Click any cell to edit.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-mono bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#1A1A1A] rounded-xs cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllEditorChanges}
                  disabled={editorItemsState.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5 text-amber-200" />
                  <span>Save All Changes ({editorItemsState.length} Pieces)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Product Image Picker Modal for Tab 1 single line items */}
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
