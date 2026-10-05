import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Palette,
  Layers,
  Sparkles,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Plus,
  Save,
  Copy,
  Check,
  Move,
  ArrowUp,
  ArrowDown,
  Layout,
  Sliders,
  Eye,
  Shirt,
  Flame,
  Droplets,
  Wind,
  Download,
  ShieldCheck,
  CheckCircle2,
  Footprints,
  Compass,
} from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { WardrobeItem, FlatlayCanvasItem, Category, Season, LookbookOutfit } from '../../types';
import { GarmentImage } from '../GarmentImage';
import { formatGbp } from '../../utils/formatters';

interface FlatlayMoodboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToLookbook?: (outfit: Omit<LookbookOutfit, 'id'>) => void;
  initialItems?: WardrobeItem[];
}

export type LayerRole =
  | 'Base Layer'
  | 'Mid Layer'
  | 'Tailored Outerwear'
  | 'Bottoms / Trousers'
  | 'Footwear'
  | 'Accessories';

/**
 * Maps any garment from the user's category taxonomy (e.g. Shoes, Outerwear, Knitwear, Shirts, Trousers, etc.)
 * to its anatomical styling layer role in an editorial flatlay composition.
 */
export const getLayerRole = (item: Partial<WardrobeItem>): LayerRole => {
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subcategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const mat = (item.material || '').toLowerCase();

  // 1. Footwear & Shoes
  if (
    cat.includes('shoe') ||
    cat.includes('footwear') ||
    cat.includes('boot') ||
    cat.includes('sneaker') ||
    cat.includes('loafer') ||
    cat.includes('derby') ||
    cat.includes('oxford') ||
    sub.includes('shoe') ||
    sub.includes('boot') ||
    sub.includes('sneaker') ||
    sub.includes('loafer') ||
    name.includes('boot') ||
    name.includes('shoe') ||
    name.includes('loafer') ||
    name.includes('derby') ||
    name.includes('sneaker')
  ) {
    return 'Footwear';
  }

  // 2. Outerwear / Tailoring / Coats / Jackets
  if (
    cat.includes('outerwear') ||
    cat.includes('coat') ||
    cat.includes('jacket') ||
    cat.includes('blazer') ||
    cat.includes('tailoring') ||
    cat.includes('trench') ||
    cat.includes('parka') ||
    cat.includes('mac') ||
    sub.includes('coat') ||
    sub.includes('jacket') ||
    sub.includes('blazer') ||
    name.includes('jacket') ||
    name.includes('coat') ||
    name.includes('blazer') ||
    name.includes('trench') ||
    name.includes('topcoat') ||
    name.includes('overcoat')
  ) {
    return 'Tailored Outerwear';
  }

  // 3. Mid Layer / Knitwear / Cardigans / Vests / Overshirts
  if (
    cat.includes('knitwear') ||
    cat.includes('knit') ||
    cat.includes('sweater') ||
    cat.includes('jumper') ||
    cat.includes('cardigan') ||
    cat.includes('vest') ||
    sub.includes('sweater') ||
    sub.includes('cardigan') ||
    sub.includes('jumper') ||
    mat.includes('cashmere') ||
    mat.includes('merino') ||
    mat.includes('shetland') ||
    mat.includes('wool knit') ||
    name.includes('sweater') ||
    name.includes('cardigan') ||
    name.includes('jumper') ||
    name.includes('overshirt')
  ) {
    return 'Mid Layer';
  }

  // 4. Bottoms / Trousers / Jeans / Chinos
  if (
    cat.includes('trouser') ||
    cat.includes('bottom') ||
    cat.includes('pant') ||
    cat.includes('jean') ||
    cat.includes('denim') ||
    cat.includes('chino') ||
    cat.includes('short') ||
    sub.includes('trouser') ||
    sub.includes('jean') ||
    sub.includes('pant') ||
    name.includes('trouser') ||
    name.includes('jean') ||
    name.includes('pant') ||
    name.includes('chino')
  ) {
    return 'Bottoms / Trousers';
  }

  // 5. Accessories / Bags / Scarves / Hats / Belts / Watches / Shoe Care
  if (
    cat.includes('accessories') ||
    cat.includes('accessory') ||
    cat.includes('bag') ||
    cat.includes('scarf') ||
    cat.includes('belt') ||
    cat.includes('watch') ||
    cat.includes('hat') ||
    cat.includes('cap') ||
    cat.includes('beanie') ||
    cat.includes('shoe care') ||
    cat.includes('shoecare') ||
    cat.includes('tie') ||
    cat.includes('glasses') ||
    sub.includes('bag') ||
    sub.includes('scarf') ||
    sub.includes('belt') ||
    name.includes('bag') ||
    name.includes('scarf') ||
    name.includes('belt') ||
    name.includes('watch')
  ) {
    return 'Accessories';
  }

  // 6. Base Layer (Tops, Shirts, T-Shirts, Polo)
  return 'Base Layer';
};

export const FlatlayMoodboardModal: React.FC<FlatlayMoodboardModalProps> = ({
  isOpen,
  onClose,
  onSaveToLookbook,
  initialItems = [],
}) => {
  const { items, addOutfit, garmentCategories, categories } = useWardrobe();

  // Canvas background themes
  const [canvasTheme, setCanvasTheme] = useState<
    'parchment' | 'linen' | 'dark' | 'white' | 'stone'
  >('parchment');

  // Filter drawer for wardrobe pieces
  const [drawerCategory, setDrawerCategory] = useState<string>('All');
  const [drawerSearch, setDrawerSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Global silhouette cutout mode
  const [globalCutoutMode, setGlobalCutoutMode] = useState<boolean>(true);

  // Dynamic Category Taxonomy from User's Context
  const taxonomyCategories = useMemo<string[]>(() => {
    const list: string[] = [];
    const sourceList =
      Array.isArray(garmentCategories) && garmentCategories.length > 0
        ? garmentCategories
        : Array.isArray(categories) && categories.length > 0
        ? categories
        : ['Outerwear', 'Knitwear', 'Shirts', 'T-Shirts', 'Trousers', 'Jeans', 'Shoes', 'Bags', 'Accessories'];

    // 1. Add categories configured in taxonomy
    sourceList.forEach((c) => {
      const trimmed = c.trim();
      if (trimmed && !list.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    });

    // 2. Ensure any category actually assigned to user's active garments is also available (e.g. Shoes)
    items.forEach((it) => {
      const cat = (it.category || '').trim();
      if (cat && !list.some((existing) => existing.toLowerCase() === cat.toLowerCase())) {
        list.push(cat);
      }
    });

    return list;
  }, [garmentCategories, categories, items]);

  // Count items per category in user taxonomy
  const categoryCounts = useMemo<Record<string, number>>(() => {
    const active = items.filter((i) => !i.isArchived);
    const counts: Record<string, number> = {
      All: active.length,
    };

    taxonomyCategories.forEach((cat) => {
      const catLower = cat.toLowerCase();
      counts[cat] = active.filter((i) => {
        const itemCat = (i.category || '').toLowerCase();
        if (itemCat === catLower) return true;
        // Fuzzy synonym matching for user convenience
        if (
          (catLower === 'shoes' || catLower === 'footwear') &&
          (itemCat.includes('shoe') ||
            itemCat.includes('footwear') ||
            itemCat.includes('boot') ||
            itemCat.includes('loafer') ||
            itemCat.includes('sneaker'))
        ) {
          return true;
        }
        if (
          (catLower === 'outerwear' || catLower === 'coats' || catLower === 'jackets' || catLower === 'jacket') &&
          (itemCat.includes('outerwear') || itemCat.includes('coat') || itemCat.includes('jacket') || itemCat.includes('blazer'))
        ) {
          return true;
        }
        if (
          (catLower === 'trousers' || catLower === 'bottoms' || catLower === 'pants') &&
          (itemCat.includes('trouser') || itemCat.includes('bottom') || itemCat.includes('pant') || itemCat.includes('jean'))
        ) {
          return true;
        }
        if (
          (catLower === 'knitwear' || catLower === 'sweaters') &&
          (itemCat.includes('knit') || itemCat.includes('sweater') || itemCat.includes('jumper') || itemCat.includes('cardigan'))
        ) {
          return true;
        }
        if (
          (catLower === 'shirts' || catLower === 'tops') &&
          (itemCat.includes('shirt') || itemCat.includes('top') || itemCat.includes('polo') || itemCat.includes('tee'))
        ) {
          return true;
        }
        return false;
      }).length;
    });

    return counts;
  }, [items, taxonomyCategories]);

  // Canvas items state
  const [canvasItems, setCanvasItems] = useState<FlatlayCanvasItem[]>(() => {
    if (initialItems.length > 0) {
      return initialItems.slice(0, 6).map((it, idx) => ({
        id: `flatlay-${Date.now()}-${idx}`,
        wardrobeItemId: it.id,
        x: 25 + (idx % 3) * 22,
        y: 20 + Math.floor(idx / 3) * 35,
        scale: 1,
        rotation: (idx % 2 === 0 ? 3 : -3) * (idx + 1),
        zIndex: idx + 1,
        silhouetteCutout: true,
      }));
    }
    return [];
  });

  // Selected item on the canvas for active adjustments
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);

  // Outfit save dialog
  const [outfitTitle, setOutfitTitle] = useState('Editorial Sartorial Flatlay');
  const [outfitOccasion, setOutfitOccasion] = useState<
    | 'Weekend Casual'
    | 'Work & Office'
    | 'Evening & Dining'
    | 'Formal & Events'
    | 'Travel Capsule'
    | 'Date Night'
    | 'Seasonal Transition'
  >('Weekend Casual');
  const [outfitSeason, setOutfitSeason] = useState<Season>('Autumn');
  const [outfitNotes, setOutfitNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Canvas dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingCanvasItem, setIsDraggingCanvasItem] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filtered wardrobe list for the sidebar drawer using user's category taxonomy
  const availableItems = useMemo(() => {
    return items.filter((it) => {
      if (it.isArchived) return false;

      // Category filter matching user taxonomy
      if (drawerCategory !== 'All') {
        const itemCat = (it.category || '').trim().toLowerCase();
        const filterCat = drawerCategory.trim().toLowerCase();

        if (itemCat !== filterCat) {
          const isShoeMatch =
            (filterCat === 'shoes' || filterCat === 'footwear') &&
            (itemCat.includes('shoe') ||
              itemCat.includes('footwear') ||
              itemCat.includes('boot') ||
              itemCat.includes('loafer') ||
              itemCat.includes('sneaker'));
          const isOuterMatch =
            (filterCat === 'outerwear' || filterCat === 'coats' || filterCat === 'jackets' || filterCat === 'jacket') &&
            (itemCat.includes('outerwear') || itemCat.includes('coat') || itemCat.includes('jacket') || itemCat.includes('blazer'));
          const isBottomMatch =
            (filterCat === 'trousers' || filterCat === 'bottoms' || filterCat === 'pants') &&
            (itemCat.includes('trouser') || itemCat.includes('bottom') || itemCat.includes('pant') || itemCat.includes('jean'));
          const isKnitMatch =
            (filterCat === 'knitwear' || filterCat === 'sweaters') &&
            (itemCat.includes('knit') || itemCat.includes('sweater') || itemCat.includes('jumper') || itemCat.includes('cardigan'));
          const isTopMatch =
            (filterCat === 'shirts' || filterCat === 'tops') &&
            (itemCat.includes('shirt') || itemCat.includes('top') || itemCat.includes('polo') || itemCat.includes('tee'));

          if (!isShoeMatch && !isOuterMatch && !isBottomMatch && !isKnitMatch && !isTopMatch) {
            return false;
          }
        }
      }

      // Keyword Search
      if (drawerSearch.trim()) {
        const q = drawerSearch.toLowerCase();
        const matchesBrand = (it.brand || '').toLowerCase().includes(q);
        const matchesName = (it.name || '').toLowerCase().includes(q);
        const matchesColor = (it.color || '').toLowerCase().includes(q);
        const matchesCategory = (it.category || '').toLowerCase().includes(q);
        const matchesSubcategory = (it.subcategory || '').toLowerCase().includes(q);
        const matchesMaterial = (it.material || '').toLowerCase().includes(q);
        if (!matchesBrand && !matchesName && !matchesColor && !matchesCategory && !matchesSubcategory && !matchesMaterial) {
          return false;
        }
      }

      return true;
    });
  }, [items, drawerCategory, drawerSearch]);

  // Selected item object on canvas
  const selectedCanvasItem = useMemo(() => {
    return canvasItems.find((c) => c.id === selectedCanvasItemId) || null;
  }, [canvasItems, selectedCanvasItemId]);

  // Resolved WardrobeItems on the canvas
  const resolvedCanvasWardrobeItems = useMemo(() => {
    return canvasItems
      .map((c) => items.find((it) => it.id === c.wardrobeItemId))
      .filter(Boolean) as WardrobeItem[];
  }, [canvasItems, items]);

  // Valuation of placed pieces
  const totalFlatlayValuation = useMemo(() => {
    return resolvedCanvasWardrobeItems.reduce((acc, it) => acc + (it.purchasePrice || 0), 0);
  }, [resolvedCanvasWardrobeItems]);

  // Color harmony palette extracted from canvas pieces
  const livePalette = useMemo(() => {
    const swatches: string[] = [];
    resolvedCanvasWardrobeItems.forEach((it) => {
      if (it.colorHex && !swatches.includes(it.colorHex)) {
        swatches.push(it.colorHex);
      }
    });
    return swatches;
  }, [resolvedCanvasWardrobeItems]);

  // Taxonomy categories actively represented on the canvas
  const activeCanvasTaxonomyBreakdown = useMemo(() => {
    const breakdown: Record<string, WardrobeItem[]> = {};
    resolvedCanvasWardrobeItems.forEach((it) => {
      const cat = it.category || 'Garment';
      if (!breakdown[cat]) breakdown[cat] = [];
      breakdown[cat].push(it);
    });
    return breakdown;
  }, [resolvedCanvasWardrobeItems]);

  // Comprehensive Thermal Cohesion Engine incorporating user taxonomy
  const thermalCohesion = useMemo(() => {
    const pieces = resolvedCanvasWardrobeItems;
    if (pieces.length === 0) {
      return {
        score: 0,
        tempRange: 'No pieces on canvas',
        layeringTier: 'Empty Flatlay',
        breathability: 'N/A',
        formulaString: 'Empty Formula',
      };
    }

    const roles = pieces.map(getLayerRole);
    const hasBase = roles.includes('Base Layer');
    const hasMid = roles.includes('Mid Layer');
    const hasOuter = roles.includes('Tailored Outerwear');
    const hasBottom = roles.includes('Bottoms / Trousers');
    const hasFootwear = roles.includes('Footwear');

    // Natural fibers breathability
    const materials = pieces.map((p) => (p.material || '').toLowerCase()).join(' ');
    const naturalCount = ['wool', 'cashmere', 'cotton', 'linen', 'silk'].filter((f) =>
      materials.includes(f)
    ).length;
    const breathabilityRating = naturalCount >= 2 ? 'Optimal (Natural Fibers)' : 'Moderate';

    let score = 70;
    let tempRange = '15°C - 21°C (Room Temp)';
    let layeringTier = 'Single Layer';

    if (hasBase && hasMid && hasOuter) {
      score += 25;
      tempRange = '4°C - 11°C (Cold Weather / Winter Layering)';
      layeringTier = '3-Tier System (Base + Mid + Outerwear)';
    } else if (hasOuter && (hasBase || hasMid)) {
      score += 20;
      tempRange = '9°C - 16°C (Transitional Layering)';
      layeringTier = '2-Tier System (Outerwear Layering)';
    } else if (hasMid && hasBase) {
      score += 15;
      tempRange = '12°C - 18°C (Mild Layering)';
      layeringTier = 'Mid-Layer Insulation';
    } else if (materials.includes('linen')) {
      score += 22;
      tempRange = '20°C - 28°C (Warm Summer / Breathable)';
      layeringTier = 'Breathable Summer Weight';
    }

    if (hasBottom) score += 3;
    if (hasFootwear) score += 2;

    const basePiece = pieces.find((p) => getLayerRole(p) === 'Base Layer');
    const midPiece = pieces.find((p) => getLayerRole(p) === 'Mid Layer');
    const outerPiece = pieces.find((p) => getLayerRole(p) === 'Tailored Outerwear');
    const bottomPiece = pieces.find((p) => getLayerRole(p) === 'Bottoms / Trousers');
    const shoePiece = pieces.find((p) => getLayerRole(p) === 'Footwear');
    const accPiece = pieces.find((p) => getLayerRole(p) === 'Accessories');

    const formulaParts = [
      basePiece ? `[${basePiece.category || 'Base'}] ${basePiece.name}` : null,
      midPiece ? `[${midPiece.category || 'Mid'}] ${midPiece.name}` : null,
      outerPiece ? `[${outerPiece.category || 'Outerwear'}] ${outerPiece.name}` : null,
      bottomPiece ? `[${bottomPiece.category || 'Bottoms'}] ${bottomPiece.name}` : null,
      shoePiece ? `[${shoePiece.category || 'Shoes'}] ${shoePiece.name}` : null,
      accPiece ? `[${accPiece.category || 'Accessories'}] ${accPiece.name}` : null,
    ].filter(Boolean);

    return {
      score: Math.min(100, score),
      tempRange,
      layeringTier,
      breathability: breathabilityRating,
      formulaString: formulaParts.join(' → ') || 'Unstructured Collage',
    };
  }, [resolvedCanvasWardrobeItems]);

  // Add an item to the canvas
  const handleAddItemToCanvas = (wardrobeItem: WardrobeItem) => {
    const nextZ = Math.max(0, ...canvasItems.map((c) => c.zIndex)) + 1;
    const randomOffset = (Math.random() - 0.5) * 16;
    const randomRotation = (Math.random() - 0.5) * 14;

    const newItem: FlatlayCanvasItem = {
      id: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      wardrobeItemId: wardrobeItem.id,
      x: Math.min(80, Math.max(15, 45 + randomOffset)),
      y: Math.min(80, Math.max(15, 45 + randomOffset)),
      scale: 1,
      rotation: Math.round(randomRotation),
      zIndex: nextZ,
      silhouetteCutout: globalCutoutMode,
    };

    setCanvasItems((prev) => [...prev, newItem]);
    setSelectedCanvasItemId(newItem.id);
  };

  // Remove active item from canvas
  const handleRemoveCanvasItem = (canvasId: string) => {
    setCanvasItems((prev) => prev.filter((c) => c.id !== canvasId));
    if (selectedCanvasItemId === canvasId) {
      setSelectedCanvasItemId(null);
    }
  };

  // Clear entire canvas
  const handleClearCanvas = () => {
    setCanvasItems([]);
    setSelectedCanvasItemId(null);
  };

  // Update properties of the selected canvas piece
  const handleUpdateSelectedItem = (updates: Partial<FlatlayCanvasItem>) => {
    if (!selectedCanvasItemId) return;
    setCanvasItems((prev) =>
      prev.map((c) => (c.id === selectedCanvasItemId ? { ...c, ...updates } : c))
    );
  };

  // Z-Index manipulations
  const handleBringToFront = () => {
    if (!selectedCanvasItemId) return;
    const maxZ = Math.max(0, ...canvasItems.map((c) => c.zIndex)) + 1;
    handleUpdateSelectedItem({ zIndex: maxZ });
  };

  const handleSendToBack = () => {
    if (!selectedCanvasItemId) return;
    const minZ = Math.min(0, ...canvasItems.map((c) => c.zIndex)) - 1;
    handleUpdateSelectedItem({ zIndex: minZ });
  };

  // Dragging logic on the canvas
  const handlePointerDown = (e: React.PointerEvent, canvasItemId: string) => {
    e.stopPropagation();
    setSelectedCanvasItemId(canvasItemId);
    setIsDraggingCanvasItem(true);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentItem = canvasItems.find((c) => c.id === canvasItemId);
      if (currentItem) {
        const itemPixelX = (currentItem.x / 100) * rect.width;
        const itemPixelY = (currentItem.y / 100) * rect.height;
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        setDragOffset({ x: clickX - itemPixelX, y: clickY - itemPixelY });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCanvasItem || !selectedCanvasItemId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left - dragOffset.x;
    const currentY = e.clientY - rect.top - dragOffset.y;

    const percentX = Math.min(92, Math.max(8, (currentX / rect.width) * 100));
    const percentY = Math.min(92, Math.max(8, (currentY / rect.height) * 100));

    setCanvasItems((prev) =>
      prev.map((c) => (c.id === selectedCanvasItemId ? { ...c, x: percentX, y: percentY } : c))
    );
  };

  const handlePointerUp = () => {
    setIsDraggingCanvasItem(false);
  };

  /**
   * 1-Click "Snap to Editorial Layering Hierarchy"
   * Seamlessly incorporates user taxonomy (Outerwear, Knitwear, Shirts, Trousers, Shoes, Bags, Accessories):
   * Base Layer (Torso base, collar peaking, zIndex 10)
   * -> Mid Layer (Layered knitwear, zIndex 20)
   * -> Tailored Outerwear (Framed jacket/coat, zIndex 30)
   * -> Bottoms / Trousers (Aligned below, zIndex 15)
   * -> Footwear (Shoes / Boots angled pairs, zIndex 25)
   * -> Accessories (Flanking accents, zIndex 40)
   */
  const handleSnapToEditorialHierarchy = () => {
    if (canvasItems.length === 0) return;

    setCanvasItems((prev) => {
      let accIdx = 0;
      let midIdx = 0;
      let shoeIdx = 0;

      return prev.map((item) => {
        const it = items.find((w) => w.id === item.wardrobeItemId);
        if (!it) return item;
        const role = getLayerRole(it);

        if (role === 'Tailored Outerwear') {
          return {
            ...item,
            x: 48,
            y: 28,
            scale: 1.25,
            rotation: -1,
            zIndex: 30,
            silhouetteCutout: true,
          };
        }
        if (role === 'Mid Layer') {
          midIdx++;
          return {
            ...item,
            x: 49,
            y: 33 + midIdx * 4,
            scale: 1.05,
            rotation: 1,
            zIndex: 20 + midIdx,
            silhouetteCutout: true,
          };
        }
        if (role === 'Base Layer') {
          return {
            ...item,
            x: 49,
            y: 29,
            scale: 0.95,
            rotation: 0,
            zIndex: 10,
            silhouetteCutout: true,
          };
        }
        if (role === 'Bottoms / Trousers') {
          return {
            ...item,
            x: 49,
            y: 65,
            scale: 1.1,
            rotation: 0,
            zIndex: 15,
            silhouetteCutout: true,
          };
        }
        if (role === 'Footwear') {
          shoeIdx++;
          return {
            ...item,
            x: 74,
            y: 74 + (shoeIdx - 1) * 8,
            scale: 0.95,
            rotation: -8,
            zIndex: 25 + shoeIdx,
            silhouetteCutout: true,
          };
        }
        // Accessories (Bags, Scarves, Belts, Shoe Care)
        accIdx++;
        return {
          ...item,
          x: 22,
          y: 32 + accIdx * 18,
          scale: 0.85,
          rotation: accIdx % 2 === 0 ? 6 : -6,
          zIndex: 40 + accIdx,
          silhouetteCutout: true,
        };
      });
    });
  };

  // Toggle global silhouette mode
  const handleToggleGlobalCutouts = (enabled: boolean) => {
    setGlobalCutoutMode(enabled);
    setCanvasItems((prev) => prev.map((c) => ({ ...c, silhouetteCutout: enabled })));
  };

  // Save flatlay to Lookbook with Thermal Cohesion formula & user taxonomy
  const handleSaveFlatlayToLookbook = () => {
    if (canvasItems.length === 0) return;

    const uniqueItemIds = Array.from(new Set(canvasItems.map((c) => c.wardrobeItemId)));
    const outfitPayload: Omit<LookbookOutfit, 'id'> = {
      title: outfitTitle.trim() || 'Editorial Sartorial Flatlay',
      description:
        outfitNotes.trim() ||
        `Editorial Flatlay Formula: ${thermalCohesion.formulaString}. Layering System: ${thermalCohesion.layeringTier}.`,
      occasion: outfitOccasion,
      season: outfitSeason,
      itemIds: uniqueItemIds,
      tags: [
        'Flatlay Studio',
        'Editorial Spread',
        outfitOccasion,
        thermalCohesion.layeringTier,
        ...Object.keys(activeCanvasTaxonomyBreakdown),
      ],
      photographicMood: 'Studio Flatlay',
      thermalCohesionScore: thermalCohesion.score,
      thermalComfortRange: thermalCohesion.tempRange,
      layeringFormula: thermalCohesion.formulaString,
      flatlayData: { items: canvasItems, canvasTheme },
      colorPalette: livePalette,
      isFavorite: true,
      timesWorn: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveToLookbook) {
      onSaveToLookbook(outfitPayload);
    } else {
      addOutfit(outfitPayload);
    }

    setSaveSuccessMsg(`Saved "${outfitTitle}" into your Lookbook with Thermal Score: ${thermalCohesion.score}/100!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F5] border border-[#E5E5E1] w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3 bg-white border-b border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-[#FAF9F5] border border-[#D5D5D0] flex items-center justify-center text-[#8C7355]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                Interactive Flatlay &amp; Moodboard Studio
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#767670] font-mono mt-0.5">
                <span>{canvasItems.length} Pieces Staged</span>
                <span aria-hidden="true">·</span>
                <span>Valuation: {formatGbp(totalFlatlayValuation)}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#8C7355] font-semibold">
                  Thermal Cohesion: {thermalCohesion.score}/100 ({thermalCohesion.tempRange.split('(')[0].trim()})
                </span>
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2">
            {/* Background Theme Selector */}
            <div className="flex items-center gap-1 bg-[#FAF9F5] border border-[#E5E5E1] p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setCanvasTheme('parchment')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  canvasTheme === 'parchment' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Parchment
              </button>
              <button
                type="button"
                onClick={() => setCanvasTheme('linen')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  canvasTheme === 'linen' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Linen Grid
              </button>
              <button
                type="button"
                onClick={() => setCanvasTheme('stone')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  canvasTheme === 'stone' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Stone
              </button>
              <button
                type="button"
                onClick={() => setCanvasTheme('dark')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  canvasTheme === 'dark' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Atelier Dark
              </button>
              <button
                type="button"
                onClick={() => setCanvasTheme('white')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  canvasTheme === 'white' ? 'bg-[#1A1A1A] text-white font-bold' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Clean White
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveFlatlayToLookbook}
              disabled={canvasItems.length === 0}
              className="px-3.5 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Formula to Lookbook</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-xs hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-mono text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {saveSuccessMsg}
            </span>
          </div>
        )}

        {/* Main Workspace (Canvas + Tools + Drawer) */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Freeform Staging Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Canvas Toolbar */}
            <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
              {/* Presets & Layering Action */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSnapToEditorialHierarchy}
                  disabled={canvasItems.length === 0}
                  className="px-2.5 py-1 bg-[#8C7355] text-white hover:bg-[#735D43] border border-[#8C7355] transition-colors cursor-pointer font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Snap garments: Base Layer -> Mid Layer -> Tailored Outerwear -> Accessories -> Footwear (incorporating your category taxonomy)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Snap to Editorial Hierarchy (Base → Mid → Outer → Bottoms → Shoes)</span>
                </button>

                {/* Silhouette Cutout Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleGlobalCutouts(!globalCutoutMode)}
                  className={`px-2 py-1 border transition-colors cursor-pointer flex items-center gap-1 ${
                    globalCutoutMode
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                      : 'bg-white text-[#5A5A55] border-[#D5D5D0] hover:border-[#8C7355]'
                  }`}
                  title="Toggle clean cutout transparent silhouettes vs photo frame cards"
                >
                  <Sparkles className="w-3 h-3 text-[#8C7355]" />
                  <span>{globalCutoutMode ? 'Silhouette Cutout: ON' : 'Card Frame Mode'}</span>
                </button>
              </div>

              {/* Selected Piece Actions */}
              {selectedCanvasItem && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1 border border-[#D5D5D0] shadow-xs">
                  <span className="text-[#8C7355] font-bold">Selected:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedItem({ rotation: selectedCanvasItem.rotation - 10 })}
                    className="p-1 hover:bg-[#F2F1ED] cursor-pointer"
                    title="Rotate -10°"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedItem({ rotation: selectedCanvasItem.rotation + 10 })}
                    className="p-1 hover:bg-[#F2F1ED] cursor-pointer"
                    title="Rotate +10°"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedItem({ scale: Math.max(0.5, selectedCanvasItem.scale - 0.1) })}
                    className="p-1 hover:bg-[#F2F1ED] cursor-pointer"
                    title="Scale Down"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedItem({ scale: Math.min(2.0, selectedCanvasItem.scale + 0.1) })}
                    className="p-1 hover:bg-[#F2F1ED] cursor-pointer"
                    title="Scale Up"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleBringToFront}
                    className="p-1 hover:bg-[#F2F1ED] cursor-pointer text-[#8C7355]"
                    title="Bring to Front"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSendToBack}
                    className="p-1 hover:bg-[#F2F1ED] cursor-pointer text-[#8C7355]"
                    title="Send to Back"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedItem({ silhouetteCutout: !selectedCanvasItem.silhouetteCutout })}
                    className="px-1.5 py-0.5 bg-[#FAF9F5] border border-[#E5E5E1] text-[10px] cursor-pointer"
                  >
                    {selectedCanvasItem.silhouetteCutout ? 'Cutout' : 'Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCanvasItem(selectedCanvasItem.id)}
                    className="p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Remove from Flatlay"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Clear Canvas */}
              {canvasItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="text-[#767670] hover:text-rose-600 cursor-pointer"
                >
                  Clear Canvas
                </button>
              )}
            </div>

            {/* Canvas Area with pointer handlers */}
            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={() => setSelectedCanvasItemId(null)}
              className={`flex-1 relative overflow-hidden select-none transition-colors cursor-crosshair ${
                canvasTheme === 'parchment'
                  ? 'bg-[#FAF8F5]'
                  : canvasTheme === 'linen'
                  ? 'bg-[#F2EFE9] bg-[radial-gradient(#D5D0C5_1px,transparent_1px)] [background-size:16px_16px]'
                  : canvasTheme === 'stone'
                  ? 'bg-[#EAE8E3]'
                  : canvasTheme === 'dark'
                  ? 'bg-[#181817]'
                  : 'bg-white'
              }`}
            >
              {/* Empty Staging State */}
              {canvasItems.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full border border-dashed border-[#C5BFB5] flex items-center justify-center text-[#8C7355]">
                    <Move className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                    Editorial Flatlay Canvas
                  </h3>
                  <p className="text-xs font-mono text-[#767670] max-w-md">
                    Select pieces from your wardrobe taxonomy on the right (Shoes, Outerwear, Knitwear, Trousers, etc.). Freely drag, rotate, scale, and layer them. Use <strong>"Snap to Editorial Hierarchy"</strong> to automatically arrange them into magazine-grade flatlays.
                  </p>
                </div>
              )}

              {/* Render placed items */}
              {canvasItems.map((canvasItem) => {
                const wardrobeItem = items.find((it) => it.id === canvasItem.wardrobeItemId);
                if (!wardrobeItem) return null;

                const isSelected = selectedCanvasItemId === canvasItem.id;
                const role = getLayerRole(wardrobeItem);

                return (
                  <div
                    key={canvasItem.id}
                    onPointerDown={(e) => handlePointerDown(e, canvasItem.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCanvasItemId(canvasItem.id);
                    }}
                    style={{
                      left: `${canvasItem.x}%`,
                      top: `${canvasItem.y}%`,
                      transform: `translate(-50%, -50%) rotate(${canvasItem.rotation}deg) scale(${canvasItem.scale})`,
                      zIndex: canvasItem.zIndex,
                    }}
                    className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-[#8C7355] ring-offset-2 shadow-2xl'
                        : 'hover:ring-1 hover:ring-[#8C7355]/40 hover:shadow-lg'
                    }`}
                  >
                    {/* Item Container */}
                    <div
                      className={`w-40 sm:w-48 aspect-square relative flex items-center justify-center p-2 ${
                        canvasItem.silhouetteCutout
                          ? 'bg-transparent filter drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)]'
                          : 'bg-white/95 border border-[#E5E5E1] shadow-xs'
                      }`}
                    >
                      <GarmentImage
                        src={wardrobeItem.imageUrl}
                        alt={wardrobeItem.name}
                        category={wardrobeItem.category}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />

                      {/* Category Taxonomy & Layer Role Badge */}
                      <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-xs text-white px-1.5 py-0.5 rounded-xs text-[8px] font-mono tracking-wider flex items-center gap-1 pointer-events-none shadow-2xs">
                        <span className="text-[#E8DEC8] font-bold uppercase">{wardrobeItem.category || role}</span>
                        <span className="text-white/40">·</span>
                        <span className="text-white/80">{role}</span>
                      </div>

                      {/* Brand/Name Tag on Hover */}
                      <div className="absolute bottom-1 left-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded-xs text-[9px] font-mono truncate text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {wardrobeItem.brand} · {wardrobeItem.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Analysis Bar: User Taxonomy Roster, Thermal Cohesion & Color Palette */}
            <div className="bg-white border-t border-[#E5E5E1] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Taxonomy Roster on Canvas */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#8C7355] flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Active Categories:</span>
                  </span>
                  {Object.keys(activeCanvasTaxonomyBreakdown).length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {Object.entries(activeCanvasTaxonomyBreakdown).map(([catName, piecesList]) => (
                        <span
                          key={catName}
                          className="px-1.5 py-0.2 bg-[#FAF9F5] border border-[#E5E5E1] text-[10px] text-[#1A1A1A] font-semibold"
                          title={piecesList.map((p) => p.name).join(', ')}
                        >
                          {catName} ({piecesList.length})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#767670]">No pieces placed</span>
                  )}
                </div>

                <span className="text-[#E5E5E1]" aria-hidden="true">|</span>

                {/* Color Palette */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#767670]">Palette:</span>
                  {livePalette.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {livePalette.map((hex) => (
                        <div
                          key={hex}
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#A5A59E]">Empty</span>
                  )}
                </div>
              </div>

              {/* Thermal Cohesion Score Indicator */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                  <Flame className="w-3 h-3 text-emerald-600" />
                  <span>Thermal: <strong>{thermalCohesion.score}/100</strong></span>
                </span>
                <span className="text-[#767670]">
                  Window: <strong>{thermalCohesion.tempRange.split('(')[0].trim()}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Wardrobe Drawer Filtered by User Category Taxonomy */}
          {isDrawerOpen && (
            <div className="w-80 sm:w-96 bg-white border-l border-[#E5E5E1] flex flex-col justify-between shrink-0 overflow-hidden">
              {/* Drawer Top Header with Taxonomy Selector */}
              <div className="p-3.5 border-b border-[#E5E5E1] space-y-2 bg-[#FAF9F5]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
                    Wardrobe Taxonomy Drawer
                  </span>
                  <span className="text-[11px] font-mono text-[#767670]">
                    {availableItems.length} available
                  </span>
                </div>

                {/* Search */}
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Search brand, garment, category, shoes..."
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />

                {/* Dynamic Category Taxonomy Bar from User's Wardrobe */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-mono">
                  {/* All Category Button */}
                  <button
                    type="button"
                    onClick={() => setDrawerCategory('All')}
                    className={`px-2 py-0.5 border cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
                      drawerCategory === 'All'
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-2xs'
                        : 'bg-white text-[#5A5A55] border-[#E5E5E1] hover:border-[#8C7355]'
                    }`}
                  >
                    <span>All</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full ${
                        drawerCategory === 'All' ? 'bg-white/20 text-white' : 'bg-[#FAF9F5] text-[#767670]'
                      }`}
                    >
                      {categoryCounts['All'] || 0}
                    </span>
                  </button>

                  {/* User Taxonomy Categories (Shoes, Outerwear, Knitwear, Shirts, Trousers, etc.) */}
                  {taxonomyCategories.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    const isSelected = drawerCategory === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setDrawerCategory(cat)}
                        className={`px-2 py-0.5 border cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold shadow-2xs'
                            : 'bg-white text-[#5A5A55] border-[#E5E5E1] hover:border-[#8C7355]'
                        }`}
                      >
                        <span>{cat}</span>
                        {count > 0 && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded-full ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF9F5] text-[#767670]'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Garment Grid List */}
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2">
                {availableItems.length === 0 ? (
                  <div className="col-span-2 p-8 text-center bg-[#FAF9F5] border border-dashed border-[#D5D5D0] space-y-1.5">
                    <p className="text-xs font-mono text-[#767670]">
                      No items found in <strong>{drawerCategory}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerCategory('All');
                        setDrawerSearch('');
                      }}
                      className="text-xs font-mono text-[#8C7355] underline hover:text-[#735D43]"
                    >
                      Show All Categories
                    </button>
                  </div>
                ) : (
                  availableItems.map((item) => {
                    const isPlaced = canvasItems.some((c) => c.wardrobeItemId === item.id);
                    const role = getLayerRole(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAddItemToCanvas(item)}
                        className={`p-2 border transition-all cursor-pointer flex flex-col justify-between text-center relative group ${
                          isPlaced
                            ? 'bg-[#FAF9F5] border-[#8C7355]'
                            : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]'
                        }`}
                      >
                        <div className="aspect-square flex items-center justify-center p-1 bg-[#FAF9F5] mb-1.5 relative">
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            category={item.category}
                            className="max-h-full object-contain"
                          />
                          {/* Taxonomy & Layer Role Badge on Drawer Card */}
                          <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[7.5px] font-mono px-1 py-0.2 rounded-xs flex items-center gap-1 shadow-2xs">
                            <span className="text-[#E8DEC8] font-bold">{item.category || role}</span>
                            <span className="opacity-40">·</span>
                            <span>{role}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[#8C7355] font-bold uppercase truncate block">
                          {item.brand}
                        </span>
                        <h5 className="text-[11px] font-serif font-bold text-[#1A1A1A] line-clamp-1">
                          {item.name}
                        </h5>
                        <span className="text-[9px] font-mono text-[#767670] mt-0.5 block">
                          {item.category} · {formatGbp(item.purchasePrice || 0)}
                        </span>

                        {/* Add Pill Hover */}
                        <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-mono font-bold flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Place on Canvas
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Lookbook Formula Save Configuration Box */}
              <div className="p-4 bg-[#FAF9F5] border-t border-[#E5E5E1] space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1A1A1A] uppercase tracking-wider block">
                    Save to Lookbook Formula
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold">
                    Score: {thermalCohesion.score}/100
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-[#5A5A55] block mb-0.5">Formula Title</label>
                  <input
                    type="text"
                    value={outfitTitle}
                    onChange={(e) => setOutfitTitle(e.target.value)}
                    placeholder="e.g. Autumn City Stroll Flatlay"
                    className="w-full px-2 py-1 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#5A5A55] block mb-0.5">Occasion</label>
                    <select
                      value={outfitOccasion}
                      onChange={(e) => setOutfitOccasion(e.target.value as any)}
                      className="w-full px-2 py-1 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      <option value="Weekend Casual">Weekend Casual</option>
                      <option value="Work & Office">Work &amp; Office</option>
                      <option value="Evening & Dining">Evening &amp; Dining</option>
                      <option value="Formal & Events">Formal &amp; Events</option>
                      <option value="Travel Capsule">Travel Capsule</option>
                      <option value="Date Night">Date Night</option>
                      <option value="Seasonal Transition">Seasonal Transition</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#5A5A55] block mb-0.5">Season</label>
                    <select
                      value={outfitSeason}
                      onChange={(e) => setOutfitSeason(e.target.value as any)}
                      className="w-full px-2 py-1 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      <option value="Autumn">Autumn</option>
                      <option value="Winter">Winter</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                      <option value="All-Season">All-Season</option>
                    </select>
                  </div>
                </div>

                {/* Thermal Formula Summary Preview with User Taxonomy */}
                <div className="p-2 bg-white border border-[#E5E5E1] text-[10px] font-mono text-[#5A5A55] leading-relaxed">
                  <span className="font-bold text-[#8C7355] block">Taxonomy Layering Formula:</span>
                  <span className="line-clamp-2">{thermalCohesion.formulaString}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveFlatlayToLookbook}
                  disabled={canvasItems.length === 0}
                  className="w-full py-2 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 mt-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Flatlay as Lookbook Outfit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
