import React, { useMemo, useState, useEffect, useRef } from 'react';
import { X, Calculator, Link2, Sparkles, Loader2, Check, Upload, Image as ImageIcon, ClipboardPaste, ShieldCheck, ExternalLink, Search, FileText } from 'lucide-react';
import { ShoppingItem, ShoppingPriority, ShoppingStatus, Category, Season, ShippingStatus } from '../types';
import { extractGarmentFromUrlFree } from '../utils/freeAutofillFallback';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';
import { calculateRrpSavings, formatGbp } from '../utils/formatters';
import { ProductImagePickerModal } from './ProductImagePickerModal';
import { PasteSpecsAutofillModal } from './PasteSpecsAutofillModal';
import { CategorySelect } from './common/CategorySelect';
import { getSafeCategories } from '../utils/categoryUtils';

interface ShoppingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShoppingItem?: ShoppingItem | null;
}

export const ShoppingFormModal: React.FC<ShoppingFormModalProps> = ({
  isOpen,
  onClose,
  initialShoppingItem,
}) => {
  const { addShoppingItem, updateShoppingItem, items = [], categories = [], addCategory } = useWardrobe();
  const safeCategories = useMemo(
    () => getSafeCategories(categories),
    [categories]
  );
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>(initialShoppingItem?.category || '');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [rrp, setRrp] = useState('');
  const [priority, setPriority] = useState<ShoppingPriority>('High');
  const [status, setStatus] = useState<ShoppingStatus>('Researching');
  const [targetStoreUrl, setTargetStoreUrl] = useState('');
  const [retailerName, setRetailerName] = useState('');
  const [season, setSeason] = useState<Season | ''>('');
  const [reasonOrGap, setReasonOrGap] = useState('');
  const [estimatedWearsPerYear, setEstimatedWearsPerYear] = useState('30');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [aiSuggestionsBanner, setAiSuggestionsBanner] = useState<string | null>(null);
  const [matchingItemIds, setMatchingItemIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);

  // Preserved Vinted & Marketplace Acquisition Metadata
  const [vintedUrl, setVintedUrl] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [seller, setSeller] = useState('');
  const [buyer, setBuyer] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderValue, setOrderValue] = useState<number | undefined>(undefined);
  const [walletAmount, setWalletAmount] = useState<number | undefined>(undefined);
  const [actualPricePaid, setActualPricePaid] = useState<number | undefined>(undefined);
  const [purchasedDate, setPurchasedDate] = useState('');
  const [transactionType, setTransactionType] = useState<'Purchase' | 'Sale' | undefined>(undefined);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus | undefined>(undefined);

  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [scraperEngineUsed, setScraperEngineUsed] = useState<string | null>(null);
  const [originalListingColor, setOriginalListingColor] = useState<string>('');
  const [candidateImagesList, setCandidateImagesList] = useState<string[]>([]);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isPasteSpecsOpen, setIsPasteSpecsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialShoppingItem) {
      const initialIsVinted = Boolean(
        initialShoppingItem.vintedUrl ||
        initialShoppingItem.orderNumber ||
        initialShoppingItem.seller ||
        initialShoppingItem.buyer ||
        initialShoppingItem.orderStatus ||
        initialShoppingItem.transactionType ||
        initialShoppingItem.orderValue !== undefined ||
        initialShoppingItem.walletAmount !== undefined ||
        initialShoppingItem.retailerName === 'Vinted' ||
        (initialShoppingItem.targetStoreUrl && initialShoppingItem.targetStoreUrl.toLowerCase().includes('vinted')) ||
        (initialShoppingItem.tags || []).some((t) => t.toLowerCase().includes('vinted'))
      );

      setName(initialShoppingItem.name || '');
      setBrand(initialShoppingItem.brand || '');
      setCategory(initialShoppingItem.category || '');
      setEstimatedPrice(initialShoppingItem.estimatedPrice != null ? String(initialShoppingItem.estimatedPrice) : '');
      setRrp(initialShoppingItem.rrp != null ? String(initialShoppingItem.rrp) : '');
      setPriority(initialShoppingItem.priority || 'High');
      setStatus(initialShoppingItem.status || (initialIsVinted ? 'Purchased' : 'Researching'));
      setTargetStoreUrl(initialShoppingItem.targetStoreUrl || '');
      setRetailerName(initialShoppingItem.retailerName || (initialIsVinted ? 'Vinted' : ''));
      setSeason(
        Array.isArray(initialShoppingItem.season)
          ? initialShoppingItem.season[0] || ''
          : initialShoppingItem.season || ''
      );
      setReasonOrGap(initialShoppingItem.reasonOrGap || '');
      setEstimatedWearsPerYear(String(initialShoppingItem.estimatedWearsPerYear || 30));
      setMatchingItemIds(Array.isArray(initialShoppingItem.matchingWardrobeItemIds) ? initialShoppingItem.matchingWardrobeItemIds : []);
      setImageUrl(initialShoppingItem.imageUrl || '');
      setCandidateImagesList(initialShoppingItem.imageUrl ? [initialShoppingItem.imageUrl] : []);
      setTagsInput(
        Array.isArray(initialShoppingItem.tags)
          ? initialShoppingItem.tags.join(', ')
          : typeof initialShoppingItem.tags === 'string'
            ? initialShoppingItem.tags
            : ''
      );
      setSize(initialShoppingItem.size || '');
      setMaterial(initialShoppingItem.material || '');
      setColor(initialShoppingItem.color || '');

      // Preserve Vinted metadata
      setVintedUrl(initialShoppingItem.vintedUrl || (initialShoppingItem.targetStoreUrl?.toLowerCase().includes('vinted') ? initialShoppingItem.targetStoreUrl : ''));
      setOrderNumber(initialShoppingItem.orderNumber || '');
      setSeller(initialShoppingItem.seller || '');
      setBuyer(initialShoppingItem.buyer || '');
      setOrderStatus(initialShoppingItem.orderStatus || '');
      setOrderDate(initialShoppingItem.orderDate || '');
      setOrderValue(initialShoppingItem.orderValue);
      setWalletAmount(initialShoppingItem.walletAmount);
      setActualPricePaid(initialShoppingItem.actualPricePaid);
      setPurchasedDate(initialShoppingItem.purchasedDate || '');
      setTransactionType(initialShoppingItem.transactionType || (initialIsVinted ? 'Purchase' : undefined));
      setTrackingNumber(initialShoppingItem.trackingNumber || '');
      setCarrier(initialShoppingItem.carrier || '');
      setShippingStatus(initialShoppingItem.shippingStatus);
    } else {
      setName('');
      setBrand('');
      setCategory('');
      setEstimatedPrice('');
      setRrp('');
      setPriority('High');
      setStatus('Researching');
      setTargetStoreUrl('');
      setRetailerName('');
      setSeason('');
      setReasonOrGap('');
      setEstimatedWearsPerYear('30');
      setMatchingItemIds([]);
      setImageUrl('');
      setTagsInput('');
      setSize('');
      setMaterial('');
      setColor('');
      setAiSuggestionsBanner(null);

      // Reset Vinted fields
      setVintedUrl('');
      setOrderNumber('');
      setSeller('');
      setBuyer('');
      setOrderStatus('');
      setOrderDate('');
      setOrderValue(undefined);
      setWalletAmount(undefined);
      setActualPricePaid(undefined);
      setPurchasedDate('');
      setTransactionType(undefined);
      setTrackingNumber('');
      setCarrier('');
      setShippingStatus(undefined);
    }
    setImportUrl('');
    setExtractError(null);
    setExtractSuccess(false);
  }, [initialShoppingItem, isOpen, safeCategories]);

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
    (initialShoppingItem?.tags || []).some((t) => t.toLowerCase().includes('vinted')) ||
    tagsInput.toLowerCase().includes('vinted')
  );

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setImageUrl(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
          const imageType = clipboardItem.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await clipboardItem.getType(imageType);
            handleFileUpload(new File([blob], 'clipboard-photo.png', { type: imageType }));
            return;
          }
        }
      }
      if (navigator.clipboard?.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text && (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://'))) {
          setImageUrl(text);
        }
      }
    } catch (error) {
      console.warn('Clipboard paste error:', error);
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
        const response = await fetch('/api/gemini/extract-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });
        const data = await response.json();
        if (data.success && (data.item || data.items?.[0])) {
          const item = data.item || data.items[0];
          if (item.name) setName(item.name);
          if (item.brand) setBrand(item.brand);
          if (item.category && categories.includes(item.category)) setCategory(item.category);
          if (item.purchasePrice) setEstimatedPrice(String(item.purchasePrice));
          if (item.rrp) setRrp(String(item.rrp));
          if (item.notes) setReasonOrGap(item.notes);
          if (item.retailerName) setRetailerName(item.retailerName);
          if (Array.isArray(item.tags)) setTagsInput(item.tags.join(', '));
          setExtractSuccess(true);
        }
      } catch (error) {
        console.error('Image extraction error:', error);
        setExtractError('Could not extract product details from the image.');
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtractFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    const isVintedLink = url.toLowerCase().includes('vinted');
    if (isVintedLink) {
      setVintedUrl(url);
      setRetailerName('Vinted');
      setTransactionType((prev) => prev || 'Purchase');
      const idMatch = url.match(/\/items\/(\d+)/) || url.match(/[?&]id=(\d+)/);
      if (idMatch && idMatch[1]) {
        setOrderNumber((prev) => prev || idMatch[1]);
      }
    }

    try {
      const response = await fetch('/api/gemini/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not extract product details from this link.');

      const item = data.item;
      if (item?.name) setName(item.name);
      if (item?.brand) setBrand(item.brand);
      if (item?.category) setCategory(item.category);
      if (item?.purchasePrice) setEstimatedPrice(String(item.purchasePrice));
      if (item?.rrp) setRrp(String(item.rrp));
      
      let finalImg = item?.imageUrl || '';
      let candidateImgs: string[] = Array.isArray(item?.allCandidateImages) && item.allCandidateImages.length > 0
        ? item.allCandidateImages
        : finalImg ? [finalImg] : [];

      if (!finalImg && (item?.brand || item?.name)) {
        try {
          const imgRes = await fetch('/api/scraper/lookup-product-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand: item.brand,
              name: item.name,
              color: item.color,
              category: item.category,
            }),
          });
          const imgData = await imgRes.json();
          if (imgData.success && imgData.images?.length > 0) {
            finalImg = imgData.images[0].imageUrl;
            candidateImgs = imgData.images.map((im: any) => im.imageUrl);
          }
        } catch {}
      }

      if (finalImg) setImageUrl(finalImg);
      setCandidateImagesList(candidateImgs);

      if (item?.targetStoreUrl) setTargetStoreUrl(item.targetStoreUrl);
      if (item?.retailerName) setRetailerName(item.retailerName);
      if (item?.notes) setReasonOrGap(item.notes);
      if (item?.color) setOriginalListingColor(item.originalListingColor || item.color);
      if (item?.engineUsed) setScraperEngineUsed(item.engineUsed);
      if (Array.isArray(item?.tags) && item.tags.length > 0) {
        setTagsInput((prev) => {
          const existing = prev ? prev.split(',').map((t) => t.trim()).filter(Boolean) : [];
          const incoming = item.tags.map((t: string) => t.trim()).filter(Boolean);
          const merged = Array.from(new Set([...existing, ...incoming]));
          return merged.join(', ');
        });
      }
      setExtractSuccess(true);
    } catch (error) {
      console.warn('Shopping autofill notice, using free deterministic fallback:', error);
      try {
        const freeItem = extractGarmentFromUrlFree(url);
        if (freeItem.name) setName(freeItem.name);
        if (freeItem.brand) setBrand(freeItem.brand);
        if (freeItem.category) setCategory(freeItem.category);
        if (freeItem.purchasePrice) setEstimatedPrice(String(freeItem.purchasePrice));
        if (freeItem.rrp) setRrp(String(freeItem.rrp));
        if (freeItem.retailerName) setRetailerName(freeItem.retailerName);
        if (freeItem.notes) setReasonOrGap(freeItem.notes);
        if (freeItem.color) setOriginalListingColor(freeItem.color);

        // Autonomous image lookup on fallback
        try {
          const imgRes = await fetch('/api/scraper/lookup-product-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand: freeItem.brand,
              name: freeItem.name,
              color: freeItem.color,
              category: freeItem.category,
            }),
          });
          const imgData = await imgRes.json();
          if (imgData.success && imgData.images?.length > 0) {
            setImageUrl(imgData.images[0].imageUrl);
            setCandidateImagesList(imgData.images.map((im: any) => im.imageUrl));
          }
        } catch {}

        setScraperEngineUsed('free-deterministic-fallback');
        setExtractSuccess(true);
      } catch {
        setExtractError(error instanceof Error ? error.message : 'Could not extract product details.');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyPastedSpecs = (item: any) => {
    if (item.name) setName(item.name);
    if (item.brand) setBrand(item.brand);
    if (item.category) setCategory(item.category);
    if (item.purchasePrice) setEstimatedPrice(String(item.purchasePrice));
    if (item.rrp) setRrp(String(item.rrp));
    if (item.notes) setReasonOrGap(item.notes);
    if (item.retailerName) setRetailerName(item.retailerName);
    if (item.color) {
      setColor(item.color);
      setOriginalListingColor(item.color);
    }
    if (item.material) setMaterial(item.material);
    if (item.size) setSize(item.size);
    if (item.imageUrl) setImageUrl(item.imageUrl);
    if (Array.isArray(item.allCandidateImages) && item.allCandidateImages.length > 0) {
      setCandidateImagesList(item.allCandidateImages);
    } else if (item.imageUrl) {
      setCandidateImagesList([item.imageUrl]);
    }
    setExtractSuccess(true);
    setScraperEngineUsed('pasted-specs-extractor');
  };

  const handleAiSuggestFields = async () => {
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);
    setAiSuggestionsBanner(null);

    const currentItem = {
      name: name.trim(),
      brand: brand.trim(),
      category: category || 'Clothing',
      color: color.trim(),
      material: material.trim(),
      size: size.trim(),
      purchasePrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
      rrp: rrp ? parseFloat(rrp) : undefined,
      season: season ? [season] : undefined,
      notes: reasonOrGap.trim(),
      tags: tagsInput.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean),
    };

    try {
      const res = await fetch('/api/gemini/scan-garment-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageUrl && imageUrl.startsWith('data:') ? imageUrl : undefined,
          imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : undefined,
          currentItem,
        }),
      });
      const data = await res.json();
      if (data.success && data.audit) {
        const audit = data.audit;
        const filledAttrs: string[] = [];

        if (audit.brand && (!brand || brand === 'Unbranded')) {
          setBrand(audit.brand);
          filledAttrs.push(`Brand: ${audit.brand}`);
        }
        if (audit.name && !name) {
          setName(audit.name);
          filledAttrs.push(`Name: ${audit.name}`);
        }
        if (audit.category && safeCategories.includes(audit.category)) {
          setCategory(audit.category);
          filledAttrs.push(`Category: ${audit.category}`);
        }
        if (audit.color && !color) {
          setColor(audit.color);
          setOriginalListingColor(audit.color);
          filledAttrs.push(`Color: ${audit.color}`);
        }
        if (audit.material) {
          setMaterial(audit.material);
          filledAttrs.push(`Material: ${audit.material}`);
        }
        if (audit.size) {
          setSize(audit.size);
          filledAttrs.push(`Size: ${audit.size}`);
        }
        if (audit.rrp && !rrp) {
          setRrp(audit.rrp.toString());
          filledAttrs.push(`RRP: £${audit.rrp}`);
        }
        if (audit.season && Array.isArray(audit.season) && !season) {
          setSeason(audit.season[0] as Season);
          filledAttrs.push(`Season: ${audit.season[0]}`);
        }
        if (audit.tags && Array.isArray(audit.tags)) {
          setTagsInput((prev) => {
            const existing = prev ? prev.split(',').map((t) => t.trim()).filter(Boolean) : [];
            const incoming = audit.tags.map((t: string) => t.trim()).filter(Boolean);
            return Array.from(new Set([...existing, ...incoming])).join(', ');
          });
          filledAttrs.push('Tags');
        }

        setExtractSuccess(true);
        setScraperEngineUsed(data.engine || 'picture-ai-and-fields-engine');
        setAiSuggestionsBanner(
          filledAttrs.length > 0
            ? `AI analyzed entered fields & picture: suggested ${filledAttrs.join(', ')}!`
            : 'AI analyzed product: specifications verified with high confidence!'
        );
      } else {
        throw new Error(data.error || 'Could not compute AI suggestions.');
      }
    } catch (err: any) {
      setExtractError(err?.message || 'AI suggestion failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !brand.trim()) return;

    const priceNum = Math.max(0, Number.parseFloat(estimatedPrice) || 0);
    const rrpNum = rrp.trim() ? Math.max(0, Number.parseFloat(rrp) || 0) : undefined;
    const wearsNum = Math.max(1, Number.parseInt(estimatedWearsPerYear, 10) || 30);
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    // Guaranteed: strictly keep 'vinted' tag if the item has Vinted provenance
    if (hasVintedProvenance && !tags.some((t) => t.toLowerCase() === 'vinted')) {
      tags.unshift('vinted');
    }

    const data = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      estimatedPrice: priceNum,
      rrp: rrpNum,
      priority,
      status,
      size: size.trim() || undefined,
      material: material.trim() || undefined,
      color: color.trim() || undefined,
      targetStoreUrl: targetStoreUrl.trim() || vintedUrl.trim() || initialShoppingItem?.targetStoreUrl || initialShoppingItem?.vintedUrl || undefined,
      retailerName: retailerName.trim() || initialShoppingItem?.retailerName || (hasVintedProvenance ? 'Vinted' : undefined),
      season: (season || 'All-Season') as Season,
      reasonOrGap: reasonOrGap.trim() || 'Capsule wardrobe staple research.',
      estimatedWearsPerYear: wearsNum,
      matchingWardrobeItemIds: matchingItemIds,
      imageUrl: imageUrl.trim(),
      tags,
      originalListingColor: originalListingColor || initialShoppingItem?.originalListingColor,
      engineUsed: scraperEngineUsed || initialShoppingItem?.engineUsed,
      // Preserved marketplace & Vinted acquisition metadata
      vintedUrl: vintedUrl.trim() || initialShoppingItem?.vintedUrl || (initialShoppingItem?.targetStoreUrl?.toLowerCase().includes('vinted') ? initialShoppingItem.targetStoreUrl : undefined),
      orderNumber: orderNumber.trim() || initialShoppingItem?.orderNumber || undefined,
      seller: seller.trim() || initialShoppingItem?.seller || undefined,
      buyer: buyer.trim() || initialShoppingItem?.buyer || undefined,
      orderStatus: orderStatus.trim() || initialShoppingItem?.orderStatus || (hasVintedProvenance ? 'Order completed!' : undefined),
      orderDate: orderDate.trim() || initialShoppingItem?.orderDate || undefined,
      orderValue: orderValue !== undefined ? orderValue : initialShoppingItem?.orderValue,
      walletAmount: walletAmount !== undefined ? walletAmount : initialShoppingItem?.walletAmount,
      actualPricePaid: actualPricePaid !== undefined ? actualPricePaid : initialShoppingItem?.actualPricePaid || (status === 'Purchased' ? priceNum : undefined),
      purchasedDate: purchasedDate || initialShoppingItem?.purchasedDate || (status === 'Purchased' ? (orderDate || new Date().toISOString().split('T')[0]) : undefined),
      transactionType: transactionType || initialShoppingItem?.transactionType || (hasVintedProvenance ? 'Purchase' : undefined),
      trackingNumber: trackingNumber.trim() || initialShoppingItem?.trackingNumber || undefined,
      carrier: carrier.trim() || initialShoppingItem?.carrier || undefined,
      shippingStatus: shippingStatus || initialShoppingItem?.shippingStatus || undefined,
      lastUpdatedDate: initialShoppingItem?.lastUpdatedDate,
    };

    if (initialShoppingItem) {
      updateShoppingItem(initialShoppingItem.id, data);
    } else {
      addShoppingItem(data);
    }
    onClose();
  };

  const toggleMatchingItem = (id: string) => {
    setMatchingItemIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-[#E5E5E1] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div className="p-4 bg-[#F8F7F4] border-b border-[#E5E5E1] flex items-center justify-between">
          <div>
            <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
              {initialShoppingItem ? 'Edit Shopping Item' : 'Add Shopping Item'}
            </h2>
            <p className="text-xs text-[#767670]">
              Evaluate prospective acquisitions, plan budget allocation, and fill wardrobe gaps.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close shopping item editor" className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Link Autofill Banner */}
        <div className="p-3.5 bg-[#F2F1ED] border-b border-[#E5E5E1] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-[#8C7355] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Auto-Fill from Product Link</span>
            {extractSuccess && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-emerald-800 flex items-center gap-1 font-semibold"><Check className="w-3.5 h-3.5" />Product Extracted</span>
                {scraperEngineUsed && (
                  <span className="text-[10px] text-[#8C7355] bg-white px-1.5 py-0.5 border border-[#8C7355]/30">
                    {scraperEngineUsed === 'firecrawl' ? '🔥 Firecrawl' : '⚡ Unified'}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="url" placeholder="Paste product URL..." value={importUrl} onChange={(event) => setImportUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleExtractFromUrl(); } }} className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]" />
              <Link2 className="w-3.5 h-3.5 text-[#8C7355] absolute left-2.5 top-2" />
            </div>
            <button type="button" onClick={handleExtractFromUrl} disabled={isExtracting || !importUrl.trim()} className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0">
              {isExtracting ? <><Loader2 className="w-3 h-3 animate-spin" />Extracting...</> : 'Auto-Fill'}
            </button>
            <button
              type="button"
              onClick={() => setIsPasteSpecsOpen(true)}
              className="px-2.5 py-1.5 bg-white hover:bg-[#EAE8E3] border border-[#D5D5D0] text-[#5A5A55] text-xs font-mono font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              title="Paste raw description, receipt, or specs"
            >
              <FileText className="w-3.5 h-3.5 text-[#8C7355]" />
              <span className="hidden sm:inline">Paste Specs</span>
            </button>
            <button
              type="button"
              onClick={handleAiSuggestFields}
              disabled={isExtracting}
              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333330] disabled:opacity-50 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Calculate & suggest missing fields using all entered inputs and picture AI"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8C7355]" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Suggest Fields</span>
                </>
              )}
            </button>
          </div>
          {aiSuggestionsBanner && (
            <div className="mt-2 p-2 bg-amber-50/90 border border-[#8C7355]/30 text-xs font-mono text-[#8C7355] flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
                {aiSuggestionsBanner}
              </span>
              <button
                type="button"
                onClick={() => setAiSuggestionsBanner(null)}
                className="text-[#8C7355] hover:text-[#1A1A1A] cursor-pointer ml-2"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {extractError && <div className="mt-1 space-y-1"><p className="text-[11px] text-rose-700 font-mono">{extractError}</p><div onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (event.dataTransfer.files?.[0]) handleExtractFromImageFile(event.dataTransfer.files[0]); }} onClick={() => fileInputRef.current?.click()} className="p-2 border border-dashed border-[#8C7355]/40 bg-amber-50/40 hover:bg-amber-50 text-center cursor-pointer"><span className="text-[10px] font-mono text-[#8C7355] font-semibold">Or drop product screenshot here to extract with Vision AI</span></div></div>}
        </div>

        {/* Green/Blue Vinted Details Preservation Banner */}
        {hasVintedProvenance && (
          <div className="px-4 py-2.5 bg-[#007782]/10 border-b border-[#007782]/30 text-xs font-mono animate-in fade-in duration-200">
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
                  {orderValue ? formatGbp(orderValue) : estimatedPrice ? formatGbp(parseFloat(estimatedPrice) || 0) : '—'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Item Title *</label><input type="text" required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Amberley Satchel" className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] font-serif focus:border-[#8C7355] focus:outline-none" /></div>
            <div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Brand / Designer *</label><input type="text" required value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. Mulberry" className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] font-mono font-semibold focus:border-[#8C7355] focus:outline-none" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-[#5A5A55] font-semibold">
                  Category *
                </label>
              </div>
              <CategorySelect
                value={category}
                onChange={(newCat) => setCategory(newCat)}
                categories={safeCategories}
                allowAddNew={true}
                allowEmpty={true}
                emptyOptionLabel="Select Category (Optional / Empty)"
                onAddNewCategory={(newCat) => {
                  addCategory(newCat);
                  setCategory(newCat);
                }}
              />
            </div>
            <div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Estimated Price (£ GBP) *</label><div className="relative"><span className="absolute left-2.5 top-1.5 text-xs text-[#8C7355] font-mono font-bold">£</span><input type="number" min="0" step="0.01" required value={estimatedPrice} onChange={(event) => setEstimatedPrice(event.target.value)} placeholder="650" className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs font-mono font-bold text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none" /></div></div>
            <div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">RRP Retail Price (£ GBP)</label><div className="relative"><span className="absolute left-2.5 top-1.5 text-xs text-[#8C7355] font-mono font-bold">£</span><input type="number" min="0" step="0.01" value={rrp} onChange={(event) => setRrp(event.target.value)} placeholder="850" className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs font-mono font-bold text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none" /></div></div>
            <div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Priority</label><select value={priority} onChange={(event) => setPriority(event.target.value as ShoppingPriority)} className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"><option value="Essential / Must-Have">Essential / Must-Have</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low / Wishlist">Low / Wishlist</option></select></div>
          </div>

          {/* Material, Size & Color Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Material / Fabric Composition
              </label>
              <input
                type="text"
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                placeholder="e.g. 100% Cashmere, Waxed Cotton"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Size / Sizing Dimensions
              </label>
              <input
                type="text"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                placeholder="e.g. M, 38R, 32/32, UK 9"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
                Color Tone
              </label>
              <input
                type="text"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="e.g. Navy Blue, Olive, Charcoal"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          {/* Live RRP Savings Indicator */}
          {(() => {
            const p = parseFloat(estimatedPrice);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Shopping Status</label><select value={status} onChange={(event) => setStatus(event.target.value as ShoppingStatus)} className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"><option value="Researching">Researching</option><option value="To Buy">To Buy</option><option value="In Basket">In Basket</option><option value="Purchased">Purchased</option><option value="Sold">Sold</option><option value="Cancelled">Cancelled</option><option value="Passed">Passed</option></select></div><div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Target Store URL</label><input type="url" value={targetStoreUrl} onChange={(event) => setTargetStoreUrl(event.target.value)} placeholder="https://..." className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none" /></div></div>

          <div><label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Wardrobe Gap / Rationale</label><textarea rows={2} value={reasonOrGap} onChange={(event) => setReasonOrGap(event.target.value)} placeholder="e.g. Fills the gap for a durable British leather day bag that complements tailored outerwear." className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none" /></div>

          <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] flex items-center justify-between"><span className="text-[#1A1A1A] font-mono text-xs font-semibold">Projected Wears / Year:</span><input type="number" min="1" value={estimatedWearsPerYear} onChange={(event) => setEstimatedWearsPerYear(event.target.value)} className="w-20 px-2 py-1 bg-white border border-[#D5D5D0] text-center text-[#1A1A1A] text-xs font-mono font-bold" /></div>

          <div className="space-y-2"><label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">Item Photo</label><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { if (event.target.files?.[0]) handleFileUpload(event.target.files[0]); }} /><div className="flex flex-col sm:flex-row gap-3"><div onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setIsPhotoDragging(true); }} onDragLeave={() => setIsPhotoDragging(false)} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setIsPhotoDragging(false); if (event.dataTransfer.files?.[0]) handleFileUpload(event.dataTransfer.files[0]); }} className={`w-full sm:w-32 h-32 border flex items-center justify-center p-1.5 relative overflow-hidden shrink-0 transition-all ${isPhotoDragging ? 'border-[#8C7355] ring-2 ring-[#8C7355] bg-amber-50' : 'bg-[#F8F7F4] border-[#E5E5E1]'}`}>{imageUrl ? <GarmentImage src={imageUrl} alt={name || 'Shopping item preview'} category={category} className="max-h-full max-w-full object-contain" containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4]" showPlaceholderLabel={true} /> : <div className="text-center text-[#A5A59E] p-2"><ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" /><span className="text-[10px] font-mono block">No Photo</span><span className="text-[9px] font-mono text-[#8C7355] block mt-0.5">Drop image here</span></div>}{isPhotoDragging && <div className="absolute inset-0 bg-[#8C7355]/85 text-white flex flex-col items-center justify-center text-center p-1"><Upload className="w-5 h-5 mb-1 animate-bounce" /><span className="text-[9px] font-mono font-bold">Drop to Upload</span></div>}</div><div className="flex-1 space-y-2"><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste image URL (https://...)" className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none font-mono" />                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handlePasteImage} className="px-2.5 py-1 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs" title="Paste photo from clipboard">
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste Image</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-xs font-mono text-[#4A4A45] flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#8C7355]" />
                      <span>Upload Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImagePickerOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-[#E5E3DC] border border-[#D5D5D0] text-xs font-mono text-[#4A4A45] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Search product photographs"
                    >
                      <Search className="w-3.5 h-3.5 text-[#8C7355]" />
                      <span>Find Photo</span>
                    </button>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={handleAiSuggestFields}
                        disabled={isExtracting}
                        className="px-2.5 py-1 bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#8C7355] text-xs font-mono font-semibold text-[#8C7355] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Run Picture AI analysis on this photo with current fields"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#8C7355]" />
                        <span>AI Scan Photo</span>
                      </button>
                    )}
                    {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="px-2 py-1 text-xs text-[#767670] hover:text-rose-600 font-mono cursor-pointer">Clear</button>}
                  </div>
                  {candidateImagesList.length > 1 && (
                    <div className="pt-2 border-t border-[#E5E5E1]/70">
                      <div className="text-[10px] font-mono text-[#5A5A55] mb-1 flex items-center justify-between">
                        <span className="font-semibold">Candidate photos ({candidateImagesList.length}):</span>
                        <span className="text-[9px] text-[#8C7355]">Click to select</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                        {candidateImagesList.map((cImg, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => setImageUrl(cImg)}
                            className={`w-12 h-12 shrink-0 border overflow-hidden rounded-xs transition-all relative ${
                              imageUrl === cImg
                                ? 'border-[#8C7355] ring-2 ring-[#8C7355]'
                                : 'border-[#D5D5D0] opacity-80 hover:opacity-100 hover:border-[#8C7355]'
                            }`}
                          >
                            <img src={cImg} alt={`Option ${cIdx + 1}`} className="w-full h-full object-cover" />
                            {imageUrl === cImg && (
                              <div className="absolute top-0.5 right-0.5 bg-[#8C7355] text-white p-0.5 rounded-full">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div><label className="text-[10px] font-mono text-[#767670] block uppercase font-semibold">Tags (comma separated)</label><input type="text" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="e.g. leather, shopping, heritage" className="w-full px-2.5 py-1 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none" /></div></div></div></div>

          {safeItems.length > 0 && <div className="space-y-1.5"><label className="text-[11px] font-mono text-[#5A5A55] block font-semibold">Connect with Existing Wardrobe Pieces:</label><div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">{safeItems.slice(0, 8).map((wardrobeItem) => { const isSelected = matchingItemIds.includes(wardrobeItem.id); return <button key={wardrobeItem.id} type="button" onClick={() => toggleMatchingItem(wardrobeItem.id)} aria-pressed={isSelected} className={`flex items-center gap-1.5 p-1 pr-2 border cursor-pointer shrink-0 transition-all ${isSelected ? 'bg-amber-50 border-[#8C7355] text-[#1A1A1A]' : 'bg-[#F8F7F4] border-[#E5E5E1] text-[#767670]'}`}><GarmentImage src={wardrobeItem.imageUrl} alt={wardrobeItem.name} category={wardrobeItem.category} className="w-6 h-6 object-cover" containerClassName="w-6 h-6 shrink-0 bg-[#EAE8E3]" showPlaceholderLabel={false} /><span className="text-[10px] font-semibold truncate max-w-[80px]">{wardrobeItem.name}</span></button>; })}</div></div>}

          <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium border border-[#D5D5D0] text-[#5A5A55] hover:bg-[#F2F1ED] cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs transition-all cursor-pointer">{initialShoppingItem ? 'Save Shopping Item' : 'Add Shopping Item'}</button></div>
        </form>
      </div>

      <ProductImagePickerModal
        isOpen={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onSelectImage={(newImg) => {
          setImageUrl(newImg);
          setCandidateImagesList((prev) => (prev.includes(newImg) ? prev : [newImg, ...prev]));
        }}
        brand={brand}
        name={name}
        color={originalListingColor}
        category={category}
        currentImageUrl={imageUrl}
      />

      <PasteSpecsAutofillModal
        isOpen={isPasteSpecsOpen}
        onClose={() => setIsPasteSpecsOpen(false)}
        onApply={handleApplyPastedSpecs}
      />
    </div>
  );
};
