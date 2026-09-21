import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Link2,
  Sparkles,
  Loader2,
  Check,
  Upload,
  Image as ImageIcon,
  ClipboardPaste,
  AlertTriangle,
  Shirt,
  Tv,
  Cpu,
  Home,
  Wrench,
  Camera,
  Music,
  BookOpen,
  Box,
  Layers,
  Info,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import {
  WardrobeItem,
  Category,
  Season,
  Condition,
  ShippingStatus,
  isHomewareCategory,
  DEFAULT_CATEGORIES,
  DEFAULT_GARMENT_CATEGORIES,
  DEFAULT_HOMEWARE_CATEGORIES,
} from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';
import { isGarmentDuplicate } from './duplicateMerge/duplicateUtils';
import { safeApiFetch } from '../utils/apiHelper';
import { calculateRrpSavings, formatGbp } from '../utils/formatters';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: WardrobeItem | null;
}

const ALL_SEASONS: Season[] = ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'];

export type FormTab = 'clothing' | 'homeware';

interface QuickPreset {
  id: string;
  label: string;
  category: string;
  icon: React.ElementType;
  brandPlaceholder: string;
  namePlaceholder: string;
  materialPlaceholder: string;
}

const HOMEWARE_QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'audio_tech',
    label: 'Audio & Tech',
    category: 'Audio & Tech',
    icon: Tv,
    brandPlaceholder: 'e.g. Braun, Sony, Teenage Engineering, Apple',
    namePlaceholder: 'e.g. SK4 Record Player, WH-1000XM5 Headphones',
    materialPlaceholder: 'e.g. Anodized Aluminum, Walnut Wood, Matte Polymer',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    category: 'Electronics & Tech',
    icon: Cpu,
    brandPlaceholder: 'e.g. Logitech, Dyson, Philips Hue, Keychron',
    namePlaceholder: 'e.g. Q1 Pro Mechanical Keyboard, Purifier Cool',
    materialPlaceholder: 'e.g. CNC Aluminum, ABS Plastic, Brass Plate',
  },
  {
    id: 'cameras',
    label: 'Cameras & Optics',
    category: 'Cameras & Optics',
    icon: Camera,
    brandPlaceholder: 'e.g. Leica, Fujifilm, Sony, Hasselblad',
    namePlaceholder: 'e.g. M11 Rangefinder, X100V, 50mm f/1.4 Summilux',
    materialPlaceholder: 'e.g. Magnesium Alloy, Optical Glass, Brass',
  },
  {
    id: 'furniture',
    label: 'Furniture & Living',
    category: 'Furniture & Living',
    icon: Home,
    brandPlaceholder: 'e.g. Vitra, Herman Miller, Hay, Muuto, Artek',
    namePlaceholder: 'e.g. Eames DSW Side Chair, Noguchi Coffee Table',
    materialPlaceholder: 'e.g. Solid Oiled Oak, Molded Plywood, Wool Bouclé',
  },
  {
    id: 'hobbies',
    label: 'Hobbies & Gear',
    category: 'Hobbies & Instruments',
    icon: Music,
    brandPlaceholder: 'e.g. Fender, Gibson, Korg, Snow Peak, Rapha',
    namePlaceholder: 'e.g. 1962 Reissue Stratocaster, Titanium Camping Mug',
    materialPlaceholder: 'e.g. Alder Wood, Rosewood, Titanium, Nitrocellulose',
  },
  {
    id: 'tableware',
    label: 'Tableware & Kitchen',
    category: 'Tableware & Dining',
    icon: Box,
    brandPlaceholder: 'e.g. Alessi, Iittala, Le Creuset, Moccamaster',
    namePlaceholder: 'e.g. KBGV Select Filter Coffee Maker, Cast Iron Pot',
    materialPlaceholder: 'e.g. Enameled Cast Iron, Borosilicate Glass, Copper',
  },
  {
    id: 'tools',
    label: 'Tools & EDC',
    category: 'Tools & EDC',
    icon: Wrench,
    brandPlaceholder: 'e.g. Wera, Leatherman, James Brand, Bahco',
    namePlaceholder: 'e.g. Wave+ Multi-tool, Kraftform Kompakt Screwdriver',
    materialPlaceholder: 'e.g. 420HC Stainless Steel, Hardened Chrome Vanadium',
  },
];

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  initialItem,
}) => {
  const { items, addItem, updateItem, categories = [], addCategory } = useWardrobe();
  const safeCategories = Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Primary Single Source of Truth Tab State
  const [activeTab, setActiveTab] = useState<FormTab>('clothing');

  // Shared Core Specs
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>(safeCategories[0] || 'Tops');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [color, setColor] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [rrp, setRrp] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [condition, setCondition] = useState<Condition>('Excellent');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoConsolidate, setAutoConsolidate] = useState(false);

  // Clothing & Wearables Specific Criteria
  const [seasons, setSeasons] = useState<Season[]>(['Autumn', 'Winter']);
  const [size, setSize] = useState('');
  const [clothingMaterial, setClothingMaterial] = useState('');
  const [clothingStorageLocation, setClothingStorageLocation] = useState('');
  const [careNotes, setCareNotes] = useState('');

  // Homeware, Electronics & Hobbies Specific Criteria
  const [modelNumber, setModelNumber] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [weight, setWeight] = useState('');
  const [powerSpecs, setPowerSpecs] = useState('');
  const [connectivity, setConnectivity] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [includedAccessories, setIncludedAccessories] = useState('');
  const [homewareMaterial, setHomewareMaterial] = useState('');

  // Preserved Vinted & Marketplace Acquisition Metadata
  const [vintedUrl, setVintedUrl] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [seller, setSeller] = useState('');
  const [buyer, setBuyer] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderValue, setOrderValue] = useState<number | undefined>(undefined);
  const [walletAmount, setWalletAmount] = useState<number | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<'Purchase' | 'Sale' | undefined>(undefined);
  const [retailerName, setRetailerName] = useState('');
  const [targetStoreUrl, setTargetStoreUrl] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus | undefined>(undefined);

  // Quick Auto-Import inside modal
  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [scraperEngineUsed, setScraperEngineUsed] = useState<string | null>(null);
  const [originalListingColor, setOriginalListingColor] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect duplicate copies in inventory using Humidor-grade matcher
  const detectedDuplicates = useMemo(() => {
    if (!brand.trim() && !name.trim()) return [];
    const tempItem = {
      brand: brand.trim(),
      name: name.trim(),
      color: color.trim(),
      category,
      imageUrl,
    };
    return items.filter((it) => {
      if (initialItem && it.id === initialItem.id) return false;
      return isGarmentDuplicate(tempItem, it);
    });
  }, [items, brand, name, color, category, imageUrl, initialItem]);

  // Synchronize initial state when opening modal
  useEffect(() => {
    if (initialItem) {
      // Determine tab based on itemType, category, or hardware attributes
      const isHomewareType =
        initialItem.itemType === 'homeware_lifestyle' ||
        isHomewareCategory(initialItem.category) ||
        !!initialItem.modelNumber ||
        !!initialItem.dimensions ||
        !!initialItem.powerSpecs ||
        !!initialItem.connectivity ||
        !!initialItem.roomLocation;

      setActiveTab(isHomewareType ? 'homeware' : 'clothing');

      setName(initialItem.name || '');
      setBrand(initialItem.brand || '');
      setCategory(initialItem.category || (isHomewareType ? 'Audio & Tech' : 'Tops'));
      setColor(initialItem.color || '');
      setPurchasePrice(
        initialItem.purchasePrice !== undefined && initialItem.purchasePrice !== null
          ? initialItem.purchasePrice.toString()
          : ''
      );
      setRrp(
        initialItem.rrp !== undefined && initialItem.rrp !== null
          ? initialItem.rrp.toString()
          : ''
      );
      setPurchaseDate(initialItem.purchaseDate || '');
      setCondition(initialItem.condition || 'Excellent');
      setNotes(initialItem.notes || '');
      setTagsInput(
        Array.isArray(initialItem.tags)
          ? initialItem.tags.join(', ')
          : typeof initialItem.tags === 'string'
          ? initialItem.tags
          : ''
      );
      setImageUrl(initialItem.imageUrl || '');

      // Clothing fields
      setSeasons(
        Array.isArray(initialItem.season)
          ? initialItem.season
          : initialItem.season
          ? [initialItem.season as any]
          : ['Autumn', 'Winter']
      );
      setSize(initialItem.size || '');
      setClothingMaterial(initialItem.material || '');
      setClothingStorageLocation(initialItem.storageLocation || 'Main Wardrobe');
      setCareNotes(initialItem.careNotes || '');

      // Homeware & Electronics fields
      setModelNumber(initialItem.modelNumber || '');
      setDimensions(initialItem.dimensions || '');
      setWeight(initialItem.weight || '');
      setPowerSpecs(initialItem.powerSpecs || '');
      setConnectivity(initialItem.connectivity || '');
      setRoomLocation(initialItem.roomLocation || initialItem.storageLocation || 'Living Room');
      setWarrantyInfo(initialItem.warrantyInfo || '');
      setIncludedAccessories(initialItem.includedAccessories || '');
      setHomewareMaterial(initialItem.material || '');

      // Vinted & Marketplace Acquisition Metadata
      const initialIsVinted = Boolean(
        initialItem.vintedUrl ||
        initialItem.orderNumber ||
        initialItem.seller ||
        initialItem.buyer ||
        initialItem.orderStatus ||
        initialItem.transactionType ||
        initialItem.orderValue !== undefined ||
        initialItem.walletAmount !== undefined ||
        initialItem.retailerName === 'Vinted' ||
        (initialItem.targetStoreUrl && initialItem.targetStoreUrl.toLowerCase().includes('vinted')) ||
        (initialItem.tags || []).some((t) => t.toLowerCase().includes('vinted'))
      );

      setVintedUrl(initialItem.vintedUrl || (initialItem.targetStoreUrl?.toLowerCase().includes('vinted') ? initialItem.targetStoreUrl : ''));
      setOrderNumber(initialItem.orderNumber || '');
      setSeller(initialItem.seller || '');
      setBuyer(initialItem.buyer || '');
      setOrderStatus(initialItem.orderStatus || '');
      setOrderDate(initialItem.orderDate || '');
      setOrderValue(initialItem.orderValue);
      setWalletAmount(initialItem.walletAmount);
      setTransactionType(initialItem.transactionType || (initialIsVinted ? 'Purchase' : undefined));
      setRetailerName(initialItem.retailerName || (initialIsVinted ? 'Vinted' : ''));
      setTargetStoreUrl(initialItem.targetStoreUrl || '');
      setTrackingNumber(initialItem.trackingNumber || '');
      setCarrier(initialItem.carrier || '');
      setShippingStatus(initialItem.shippingStatus);
    } else {
      setActiveTab('clothing');
      setName('');
      setBrand('');
      setCategory(safeCategories[0] || 'Tops');
      setColor('');
      setPurchasePrice('');
      setRrp('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setCondition('Excellent');
      setNotes('');
      setTagsInput('');
      setImageUrl('');

      // Clothing defaults
      setSeasons(['Autumn', 'Winter']);
      setSize('');
      setClothingMaterial('');
      setClothingStorageLocation('Main Wardrobe');
      setCareNotes('');

      // Homeware & Electronics defaults
      setModelNumber('');
      setDimensions('');
      setWeight('');
      setPowerSpecs('');
      setConnectivity('');
      setRoomLocation('Living Room');
      setWarrantyInfo('');
      setIncludedAccessories('');
      setHomewareMaterial('');

      // Vinted resets
      setVintedUrl('');
      setOrderNumber('');
      setSeller('');
      setBuyer('');
      setOrderStatus('');
      setOrderDate('');
      setOrderValue(undefined);
      setWalletAmount(undefined);
      setTransactionType(undefined);
      setRetailerName('');
      setTargetStoreUrl('');
      setTrackingNumber('');
      setCarrier('');
      setShippingStatus(undefined);
    }
    setImportUrl('');
    setExtractError(null);
    setExtractSuccess(false);
  }, [initialItem, isOpen, safeCategories]);

  // Provenance flag: whether this item originated from or has Vinted marketplace metadata
  const hasVintedProvenance = Boolean(
    vintedUrl ||
    orderNumber ||
    seller ||
    buyer ||
    orderStatus ||
    transactionType ||
    orderValue !== undefined ||
    walletAmount !== undefined ||
    retailerName === 'Vinted' ||
    (targetStoreUrl && targetStoreUrl.toLowerCase().includes('vinted')) ||
    (initialItem?.tags || []).some((t) => t.toLowerCase().includes('vinted')) ||
    tagsInput.toLowerCase().includes('vinted')
  );

  if (!isOpen) return null;

  // Handle Tab Switch with smart category adjustment if desired
  const handleTabSwitch = (newTab: FormTab) => {
    setActiveTab(newTab);
    if (newTab === 'homeware' && !isHomewareCategory(category)) {
      setCategory('Audio & Tech');
    } else if (newTab === 'clothing' && isHomewareCategory(category)) {
      setCategory(DEFAULT_GARMENT_CATEGORIES[0] || 'Tops');
    }
  };

  const handleApplyPreset = (preset: QuickPreset) => {
    setCategory(preset.category);
    if (!brand.trim()) {
      setBrand('');
    }
  };

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
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
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
        const res = await safeApiFetch('/api/gemini/extract-from-image', {
          method: 'POST',
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
          }),
        });
        if (res.success && res.data && (res.data.item || (res.data.items && res.data.items[0]))) {
          const item = res.data.item || res.data.items[0];
          if (item.name) setName(item.name);
          if (item.brand) setBrand(item.brand);
          if (item.category && categories.includes(item.category)) setCategory(item.category);
          // Prioritize original listing color over defaults
          if (item.color) setColor(item.color);
          if (item.material) {
            setClothingMaterial(item.material);
            setHomewareMaterial(item.material);
          }
          // Rule: Always preserve the price paid when autofilling details for an item
          if (item.purchasePrice) {
            setPurchasePrice((prev) => (prev && parseFloat(prev) > 0 ? prev : item.purchasePrice.toString()));
          }
          // Rule: Default to rrp price when importing
          if (item.rrp) {
            setRrp(item.rrp.toString());
          } else if (item.purchasePrice) {
            setRrp((prev) => (prev && parseFloat(prev) > 0 ? prev : item.purchasePrice.toString()));
          }
          // Rule: Preserve notes and never overwrite these notes
          if (item.notes) {
            setNotes((prev) => {
              if (!prev || !prev.trim()) return item.notes;
              if (prev.includes(item.notes)) return prev;
              return `${prev.trim()}\n\n[Imported Notes]: ${item.notes}`;
            });
          }
          if (item.season && Array.isArray(item.season)) setSeasons(item.season);
          if (item.tags && Array.isArray(item.tags)) {
            setTagsInput((prev) => {
              const existing = prev ? prev.split(',').map((t) => t.trim()).filter(Boolean) : [];
              const incoming = item.tags.map((t: string) => t.trim()).filter(Boolean);
              if (hasVintedProvenance) {
                if (!existing.some((t) => t.toLowerCase() === 'vinted') && !incoming.some((t) => t.toLowerCase() === 'vinted')) {
                  existing.unshift('vinted');
                }
              }
              const merged = Array.from(new Set([...existing, ...incoming]));
              return merged.join(', ');
            });
          }
          setExtractSuccess(true);
        } else if (res.error) {
          setExtractError(res.error);
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

    const isVintedLink = importUrl.toLowerCase().includes('vinted');
    if (isVintedLink) {
      setVintedUrl(importUrl.trim());
      setRetailerName('Vinted');
      setTransactionType((prev) => prev || 'Purchase');
      const idMatch = importUrl.match(/\/items\/(\d+)/) || importUrl.match(/[?&]id=(\d+)/);
      if (idMatch && idMatch[1]) {
        setOrderNumber((prev) => prev || idMatch[1]);
      }
    }

    try {
      const res = await safeApiFetch('/api/gemini/extract-from-url', {
        method: 'POST',
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      if (!res.success || !res.data?.item) {
        throw new Error(res.error || 'Failed to extract product details from this link.');
      }

      const item = res.data.item;
      if (item.name) setName(item.name);
      if (item.brand) setBrand(item.brand);
      if (item.category) setCategory(item.category);
      // Prioritize original listing color over defaults
      if (item.color) setColor(item.color);
      if (item.originalListingColor) setOriginalListingColor(item.originalListingColor);
      else if (item.color) setOriginalListingColor(item.color);
      if (item.engineUsed) setScraperEngineUsed(item.engineUsed);
      if (item.material) {
        setClothingMaterial(item.material);
        setHomewareMaterial(item.material);
      }
      // Rule: Always preserve the price paid when autofilling details for an item
      if (item.purchasePrice) {
        setPurchasePrice((prev) => (prev && parseFloat(prev) > 0 ? prev : item.purchasePrice.toString()));
      }
      // Rule: Default to rrp price when importing
      if (item.rrp) {
        setRrp(item.rrp.toString());
      } else if (item.purchasePrice) {
        setRrp((prev) => (prev && parseFloat(prev) > 0 ? prev : item.purchasePrice.toString()));
      }
      if (item.imageUrl) setImageUrl(item.imageUrl);
      if (item.careNotes) setCareNotes(item.careNotes);
      // Rule: Preserve notes and never overwrite these notes
      if (item.notes) {
        setNotes((prev) => {
          if (!prev || !prev.trim()) return item.notes;
          if (prev.includes(item.notes)) return prev;
          return `${prev.trim()}\n\n[Imported Notes]: ${item.notes}`;
        });
      }
      if (item.season && Array.isArray(item.season)) {
        setSeasons(item.season);
      }
      if (item.tags && Array.isArray(item.tags)) {
        setTagsInput((prev) => {
          const existing = prev ? prev.split(',').map((t) => t.trim()).filter(Boolean) : [];
          const incoming = item.tags.map((t: string) => t.trim()).filter(Boolean);
          if (hasVintedProvenance || isVintedLink) {
            if (!existing.some((t) => t.toLowerCase() === 'vinted') && !incoming.some((t) => t.toLowerCase() === 'vinted')) {
              existing.unshift('vinted');
            }
          }
          const merged = Array.from(new Set([...existing, ...incoming]));
          return merged.join(', ');
        });
      } else if (hasVintedProvenance || isVintedLink) {
        setTagsInput((prev) => {
          const existing = prev ? prev.split(',').map((t) => t.trim()).filter(Boolean) : [];
          if (!existing.some((t) => t.toLowerCase() === 'vinted')) {
            existing.unshift('vinted');
          }
          return existing.join(', ');
        });
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
    if (isSubmitting) return;
    if (!name.trim() || !brand.trim()) return;

    setIsSubmitting(true);
    const priceNum = parseFloat(purchasePrice) || 0;
    const rrpNum = rrp.trim() ? parseFloat(rrp) || undefined : undefined;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    // Guaranteed: strictly keep 'vinted' tag if the item has Vinted provenance
    if (hasVintedProvenance && !tags.some((t) => t.toLowerCase() === 'vinted')) {
      tags.unshift('vinted');
    }

    const finalImageUrl = imageUrl.trim();

    try {
      if (activeTab === 'clothing') {
        // Clothing & Wearables Payload
        const payload = {
          name: name.trim(),
          brand: brand.trim(),
          category,
          color: color.trim(),
          season: seasons,
          purchasePrice: priceNum,
          rrp: rrpNum,
          purchaseDate,
          condition,
          material: clothingMaterial.trim(),
          size: size.trim(),
          storageLocation: clothingStorageLocation.trim() || 'Main Wardrobe',
          careNotes: careNotes.trim(),
          notes: notes.trim(),
          tags,
          imageUrl: finalImageUrl,
          itemType: 'clothing',
          originalListingColor: originalListingColor.trim() || initialItem?.originalListingColor,
          engineUsed: scraperEngineUsed || initialItem?.engineUsed,
          // Preserved marketplace & Vinted acquisition details
          retailerName: retailerName.trim() || initialItem?.retailerName || (hasVintedProvenance ? 'Vinted' : undefined),
          orderNumber: orderNumber.trim() || initialItem?.orderNumber || undefined,
          vintedUrl: vintedUrl.trim() || initialItem?.vintedUrl || (initialItem?.targetStoreUrl?.toLowerCase().includes('vinted') ? initialItem.targetStoreUrl : undefined),
          seller: seller.trim() || initialItem?.seller || undefined,
          buyer: buyer.trim() || initialItem?.buyer || undefined,
          orderDate: orderDate.trim() || initialItem?.orderDate || undefined,
          orderStatus: orderStatus.trim() || initialItem?.orderStatus || (hasVintedProvenance ? 'Completed' : undefined),
          transactionType: transactionType || initialItem?.transactionType || (hasVintedProvenance ? 'Purchase' : undefined),
          orderValue: orderValue !== undefined ? orderValue : initialItem?.orderValue,
          walletAmount: walletAmount !== undefined ? walletAmount : initialItem?.walletAmount,
          trackingNumber: trackingNumber.trim() || initialItem?.trackingNumber || undefined,
          carrier: carrier.trim() || initialItem?.carrier || undefined,
          shippingStatus: shippingStatus || initialItem?.shippingStatus || undefined,
          targetStoreUrl: targetStoreUrl.trim() || initialItem?.targetStoreUrl || vintedUrl.trim() || initialItem?.vintedUrl || undefined,
          lastUpdatedDate: initialItem?.lastUpdatedDate,
        };

        if (initialItem) {
          updateItem(initialItem.id, payload, autoConsolidate);
        } else {
          addItem(
            {
              ...payload,
              subcategory: tags[0] || 'Capsule Piece',
              currentValuation: priceNum,
              isFavorite: false,
              isArchived: false,
            },
            autoConsolidate
          );
        }
      } else {
        // Homeware, Electronics & Hobbies Payload
        const payload = {
          name: name.trim(),
          brand: brand.trim(),
          category,
          color: color.trim(),
          season: seasons.length > 0 ? seasons : (['All-Season'] as Season[]),
          purchasePrice: priceNum,
          rrp: rrpNum,
          purchaseDate,
          condition,
          material: homewareMaterial.trim(),
          size: dimensions.trim() || size.trim(),
          storageLocation: roomLocation.trim() || clothingStorageLocation.trim() || 'Living Room',
          careNotes: warrantyInfo.trim() || careNotes.trim(),
          notes: notes.trim(),
          tags,
          imageUrl: finalImageUrl,
          itemType: 'homeware_lifestyle',
          modelNumber: modelNumber.trim() || undefined,
          dimensions: dimensions.trim() || undefined,
          weight: weight.trim() || undefined,
          powerSpecs: powerSpecs.trim() || undefined,
          connectivity: connectivity.trim() || undefined,
          roomLocation: roomLocation.trim() || undefined,
          warrantyInfo: warrantyInfo.trim() || undefined,
          includedAccessories: includedAccessories.trim() || undefined,
          originalListingColor: originalListingColor.trim() || initialItem?.originalListingColor,
          engineUsed: scraperEngineUsed || initialItem?.engineUsed,
          // Preserved marketplace & Vinted acquisition details
          retailerName: retailerName.trim() || initialItem?.retailerName || (hasVintedProvenance ? 'Vinted' : undefined),
          orderNumber: orderNumber.trim() || initialItem?.orderNumber || undefined,
          vintedUrl: vintedUrl.trim() || initialItem?.vintedUrl || (initialItem?.targetStoreUrl?.toLowerCase().includes('vinted') ? initialItem.targetStoreUrl : undefined),
          seller: seller.trim() || initialItem?.seller || undefined,
          buyer: buyer.trim() || initialItem?.buyer || undefined,
          orderDate: orderDate.trim() || initialItem?.orderDate || undefined,
          orderStatus: orderStatus.trim() || initialItem?.orderStatus || (hasVintedProvenance ? 'Completed' : undefined),
          transactionType: transactionType || initialItem?.transactionType || (hasVintedProvenance ? 'Purchase' : undefined),
          orderValue: orderValue !== undefined ? orderValue : initialItem?.orderValue,
          walletAmount: walletAmount !== undefined ? walletAmount : initialItem?.walletAmount,
          trackingNumber: trackingNumber.trim() || initialItem?.trackingNumber || undefined,
          carrier: carrier.trim() || initialItem?.carrier || undefined,
          shippingStatus: shippingStatus || initialItem?.shippingStatus || undefined,
          targetStoreUrl: targetStoreUrl.trim() || initialItem?.targetStoreUrl || vintedUrl.trim() || initialItem?.vintedUrl || undefined,
          lastUpdatedDate: initialItem?.lastUpdatedDate,
        };

        if (initialItem) {
          updateItem(initialItem.id, payload, autoConsolidate);
        } else {
          addItem(
            {
              ...payload,
              subcategory: tags[0] || 'Lifestyle Asset',
              currentValuation: priceNum,
              isFavorite: false,
              isArchived: false,
            },
            autoConsolidate
          );
        }
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-[#E5E5E1] shadow-2xl rounded-none w-full max-w-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#F8F7F4] border-b border-[#E5E5E1] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-semibold text-[#1A1A1A]">
                {initialItem ? `Edit Item: ${name || 'Inventory Piece'}` : 'Add Inventory Piece'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#EAE8E3] text-[#5A5A55] border border-[#D5D5D0]">
                Single Source of Truth
              </span>
            </div>
            <p className="text-xs text-[#767670] font-sans">
              Universal inventory studio editor for fashion wearables, homeware, audio/tech, and hobby gear.
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

        {/* 2-TAB SWITCHER */}
        <div className="bg-[#FAF9F6] border-b border-[#E5E5E1] px-5 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabSwitch('clothing')}
              className={`flex-1 py-2.5 px-4 text-left border-b-2 transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === 'clothing'
                  ? 'border-[#8C7355] bg-white text-[#1A1A1A] shadow-xs font-semibold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED]'
              }`}
            >
              <div
                className={`p-1.5 rounded-sm ${
                  activeTab === 'clothing' ? 'bg-[#8C7355] text-white' : 'bg-[#E5E5E1] text-[#767670]'
                }`}
              >
                <Shirt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-serif font-bold tracking-tight">Clothing &amp; Wearables</div>
                <div className="text-[10px] font-mono text-[#767670] font-normal">
                  Garments, tailoring, footwear &amp; capsule sizing
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('homeware')}
              className={`flex-1 py-2.5 px-4 text-left border-b-2 transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === 'homeware'
                  ? 'border-[#8C7355] bg-white text-[#1A1A1A] shadow-xs font-semibold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED]'
              }`}
            >
              <div
                className={`p-1.5 rounded-sm ${
                  activeTab === 'homeware' ? 'bg-[#8C7355] text-white' : 'bg-[#E5E5E1] text-[#767670]'
                }`}
              >
                <Tv className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-serif font-bold tracking-tight">Homeware, Electronics &amp; Hobbies</div>
                <div className="text-[10px] font-mono text-[#767670] font-normal">
                  Tech, audio, furniture, optics, gear &amp; instruments
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Link Autofill Banner */}
        <div className="bg-[#F2F1ED] px-5 py-2.5 border-b border-[#E5E5E1]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                placeholder={
                  activeTab === 'clothing'
                    ? 'Autofill specs from garment link (Barbour, Arket, COS, Matches...)'
                    : 'Autofill specs from product link (Sony, Braun, Apple, Leica, Vitra...)'
                }
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
                  Or drop a screenshot here to autofill with Vision AI
                </span>
              </div>
            </div>
          )}
          {extractSuccess && (
            <div className="text-[11px] text-emerald-700 mt-1.5 font-mono flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" /> Auto-populated specs and details!
              </span>
              {scraperEngineUsed && (
                <span className="text-[10px] uppercase font-semibold text-[#8C7355] bg-white px-2 py-0.5 border border-[#8C7355]/30 flex items-center gap-1">
                  {scraperEngineUsed === 'firecrawl' ? '🔥 Scraped via Firecrawl' : '⚡ Scraped via Unified Engine'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Green/Blue Vinted Details Preservation Banner */}
        {hasVintedProvenance && (
          <div className="px-5 py-2.5 bg-[#007782]/10 border-b border-[#007782]/30 text-xs font-mono animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[#007782] mb-1.5">
              <div className="flex items-center gap-2 font-bold tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-[#007782] shrink-0"></span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007782]" />
                  Vinted Acquisition Details (Preserved)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {orderStatus && (
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-[#007782] text-white rounded-xs uppercase tracking-wider">
                    {orderStatus}
                  </span>
                )}
                {orderNumber && (
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-[#007782]/20 text-[#007782] border border-[#007782]/40 rounded-xs">
                    Order #{orderNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#2D4F4F]">
              <div>
                <span className="text-[#688888] block text-[9px] uppercase tracking-wider">Seller</span>
                <span className="font-semibold text-[#007782]">
                  {seller ? `@${seller.replace(/^@/, '')}` : 'Vinted Seller'}
                </span>
              </div>
              <div>
                <span className="text-[#688888] block text-[9px] uppercase tracking-wider">Provenance</span>
                <span className="font-semibold">{retailerName || 'Vinted'}</span>
              </div>
              <div>
                <span className="text-[#688888] block text-[9px] uppercase tracking-wider">Order Total</span>
                <span className="font-semibold text-[#1A1A1A]">
                  {orderValue ? formatGbp(orderValue) : purchasePrice ? formatGbp(parseFloat(purchasePrice) || 0) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#688888] block text-[9px] uppercase tracking-wider">Listing Link</span>
                {vintedUrl ? (
                  <a
                    href={vintedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#007782] hover:underline flex items-center gap-1 font-semibold truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">Open Vinted</span>
                  </a>
                ) : (
                  <span className="text-[#888888]">Link archived</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Duplicate Detection Alert & Consolidation Notice */}
          {detectedDuplicates.length > 0 && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-sm text-[#1A1A1A]">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-900">
                      {detectedDuplicates.length} duplicate {detectedDuplicates.length === 1 ? 'copy' : 'copies'} detected in your inventory
                    </p>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                      Humidor Auto-Merge
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Similar piece(s) exist in your inventory. By default, distinct items are preserved. You can opt in below if you want to consolidate them into 1 master item.
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-medium text-xs text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoConsolidate}
                      onChange={(e) => setAutoConsolidate(e.target.checked)}
                      className="accent-[#8C7355] w-3.5 h-3.5 rounded"
                    />
                    <span>Consolidate all duplicate copies into this master item on save</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SHARED: Photo Preview & Upload (Universal for both modes) */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">
              {activeTab === 'clothing' ? 'Garment Photography' : 'Item Photography / Hardware Image'}
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
                    alt={name || 'Item preview'}
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
                  Supports high-resolution photography, local image files, and direct links without distortion.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: CLOTHING & WEARABLES FIELDS                        */}
          {/* ========================================================= */}
          {activeTab === 'clothing' && (
            <div className="space-y-4 pt-1 border-t border-[#E5E5E1]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-semibold flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5" /> Clothing &amp; Wearable Criteria
                </span>
                <span className="text-[10px] font-mono text-[#767670]">Garment &amp; Capsule Specs</span>
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
                    placeholder="e.g. Barbour, Toast, Arket, Margaret Howell"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-[#5A5A55] font-semibold">
                      Garment Category *
                    </label>
                    {!isAddingCategory ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer"
                      >
                        + New Category
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="text-[10px] font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {isAddingCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const clean = newCategoryName.trim();
                            if (clean) {
                              addCategory(clean);
                              setCategory(clean);
                              setNewCategoryName('');
                              setIsAddingCategory(false);
                            }
                          }
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#8C7355] text-xs text-[#1A1A1A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = newCategoryName.trim();
                          if (clean) {
                            addCategory(clean);
                            setCategory(clean);
                            setNewCategoryName('');
                            setIsAddingCategory(false);
                          }
                        }}
                        disabled={!newCategoryName.trim()}
                        className="px-2.5 py-1.5 bg-[#8C7355] text-white text-xs font-mono disabled:opacity-50 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      {category && !safeCategories.includes(category) && (
                        <option value={category}>{category}</option>
                      )}
                      <optgroup label="Apparel & Garments">
                        {safeCategories
                          .filter((cat) => !isHomewareCategory(cat))
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Homeware & Lifestyle">
                        {safeCategories
                          .filter((cat) => isHomewareCategory(cat))
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  )}
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

              {/* Material & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Material / Fabric Composition
                  </label>
                  <input
                    type="text"
                    value={clothingMaterial}
                    onChange={(e) => setClothingMaterial(e.target.value)}
                    placeholder="e.g. 100% Waxed Cotton, 100% Cashmere, 14oz Denim"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Size / Fit Sizing
                  </label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. M, 38R, 32W/32L, UK 9, Oversized"
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

              {/* Storage & Care */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={clothingStorageLocation}
                    onChange={(e) => setClothingStorageLocation(e.target.value)}
                    placeholder="e.g. Main Wardrobe, Hallway Rail, Cedar Chest"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Care &amp; Cleaning Directives
                  </label>
                  <input
                    type="text"
                    value={careNotes}
                    onChange={(e) => setCareNotes(e.target.value)}
                    placeholder="e.g. Sponge clean only, re-wax annually, dry clean"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              </div>

              {/* Styling Notes */}
              <div>
                <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                  Styling Notes / Outfitting Formula
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Layer over chunky knitwear, pairs with selvedge denim"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: HOMEWARE, ELECTRONICS & HOBBIES FIELDS             */}
          {/* ========================================================= */}
          {activeTab === 'homeware' && (
            <div className="space-y-4 pt-1 border-t border-[#E5E5E1]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-semibold flex items-center gap-1">
                  <Tv className="w-3.5 h-3.5" /> Homeware, Tech &amp; Hobby Specifications
                </span>
                <span className="text-[10px] font-mono text-[#767670]">Hardware, Furniture &amp; Gear</span>
              </div>

              {/* Quick Preset Selector Chips */}
              <div>
                <label className="text-[11px] font-mono text-[#5A5A55] block mb-1.5 font-semibold">
                  Quick Category Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HOMEWARE_QUICK_PRESETS.map((preset) => {
                    const IconComp = preset.icon;
                    const isSelected = category === preset.category;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`px-2.5 py-1 text-xs border rounded-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#8C7355] text-white border-[#8C7355] font-medium shadow-2xs'
                            : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:border-[#8C7355] hover:text-[#1A1A1A]'
                        }`}
                      >
                        <IconComp className="w-3 h-3" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand & Item Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Maker / Brand / Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Braun, Sony, Leica, Vitra, Teenage Engineering"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Item Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SK4 Record Player, A7 IV Mirrorless, Eames Chair"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Model Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-[#5A5A55] font-semibold">
                      Category *
                    </label>
                    {!isAddingCategory ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] hover:underline cursor-pointer"
                      >
                        + New Category
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="text-[10px] font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {isAddingCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const clean = newCategoryName.trim();
                            if (clean) {
                              addCategory(clean);
                              setCategory(clean);
                              setNewCategoryName('');
                              setIsAddingCategory(false);
                            }
                          }
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#8C7355] text-xs text-[#1A1A1A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = newCategoryName.trim();
                          if (clean) {
                            addCategory(clean);
                            setCategory(clean);
                            setNewCategoryName('');
                            setIsAddingCategory(false);
                          }
                        }}
                        disabled={!newCategoryName.trim()}
                        className="px-2.5 py-1.5 bg-[#8C7355] text-white text-xs font-mono disabled:opacity-50 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      {category && !safeCategories.includes(category) && (
                        <option value={category}>{category}</option>
                      )}
                      <optgroup label="Homeware, Tech &amp; Hobbies">
                        {safeCategories
                          .filter((cat) => isHomewareCategory(cat))
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Apparel &amp; Other Categories">
                        {safeCategories
                          .filter((cat) => !isHomewareCategory(cat))
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Model No. / Serial / Edition
                  </label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    placeholder="e.g. WH-1000XM5, S/N: 9482103, 1st Edition"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Room Location & Color / Finish */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Room / Placement in Home
                  </label>
                  <input
                    type="text"
                    value={roomLocation}
                    onChange={(e) => setRoomLocation(e.target.value)}
                    placeholder="e.g. Home Studio Desk, Living Room Credenza, Audio Rack"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Color / Finish
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Matte Black, Brushed Aluminum, Oiled Walnut"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dimensions & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Dimensions (W × D × H)
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 450 × 320 × 90 mm or 120 × 60 × 74 cm"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 2.4 kg, 350g, 15 lbs"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Power Specs & Connectivity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Power &amp; Battery Specs
                  </label>
                  <input
                    type="text"
                    value={powerSpecs}
                    onChange={(e) => setPowerSpecs(e.target.value)}
                    placeholder="e.g. USB-C 100W PD, 240V UK Mains, Li-Ion 40h, Passive"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Connectivity &amp; Ports
                  </label>
                  <input
                    type="text"
                    value={connectivity}
                    onChange={(e) => setConnectivity(e.target.value)}
                    placeholder="e.g. Bluetooth 5.3, Wi-Fi 6, 3.5mm Aux, USB-C, Optical"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              </div>

              {/* Materials & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Materials &amp; Build Construction
                  </label>
                  <input
                    type="text"
                    value={homewareMaterial}
                    onChange={(e) => setHomewareMaterial(e.target.value)}
                    placeholder="e.g. Anodized Aluminum, Solid Walnut, Borosilicate Glass"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                    Warranty &amp; Service History
                  </label>
                  <input
                    type="text"
                    value={warrantyInfo}
                    onChange={(e) => setWarrantyInfo(e.target.value)}
                    placeholder="e.g. 2-Year Warranty until Nov 2027, Serviced May 2025"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                  />
                </div>
              </div>

              {/* Included Accessories & Box */}
              <div>
                <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                  Included Accessories &amp; Packaging
                </label>
                <input
                  type="text"
                  value={includedAccessories}
                  onChange={(e) => setIncludedAccessories(e.target.value)}
                  placeholder="e.g. Original retail box, power adapter, manual, travel case, extra cables"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>

              {/* Usage & Project Notes */}
              <div>
                <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                  Usage, Audio/Tech Configuration &amp; Project Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Connected to DAC via optical cable; firmware v2.1 installed"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SHARED PRICING, VALUATION & METADATA SECTION              */}
          {/* ========================================================= */}
          <div className="pt-2 border-t border-[#E5E5E1] space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-semibold block">
              Financial Valuation &amp; Acquisition Record
            </span>

            {/* Price, RRP & Purchase Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  RRP Retail Price (£ GBP)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-[#8C7355] font-mono font-bold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={rrp}
                    onChange={(e) => setRrp(e.target.value)}
                    placeholder="380"
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
                  Condition State
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

            {/* Live RRP Savings Indicator if applicable */}
            {(() => {
              const p = parseFloat(purchasePrice);
              const r = parseFloat(rrp);
              if (!isNaN(p) && !isNaN(r) && r > p) {
                const savings = calculateRrpSavings(p, r);
                return (
                  <div className="flex items-center justify-between text-xs bg-[#EBF3ED] text-[#245934] border border-[#BBDBC2] px-3 py-1.5">
                    <span className="font-mono font-medium">
                      Saving vs RRP: <strong>{savings.formattedSavings}</strong> ({savings.formattedDiscount})
                    </span>
                    <span className="text-[11px] text-[#2E7D32]/80 uppercase tracking-wider font-mono">Retail discount recorded</span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Tags */}
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={
                  activeTab === 'clothing'
                    ? 'e.g. heritage, outerwear, weatherproof, tailoring'
                    : 'e.g. vintage-audio, studio, hi-fi, EDC, photography'
                }
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-[#767670] font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-[#8C7355]"></span>
              <span>
                Saving as: <strong>{activeTab === 'clothing' ? 'Clothing & Wearables' : 'Homeware & Tech'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium border border-[#D5D5D0] text-[#5A5A55] hover:bg-[#F2F1ED] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{initialItem ? 'Save Updates' : 'Add to Inventory'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
