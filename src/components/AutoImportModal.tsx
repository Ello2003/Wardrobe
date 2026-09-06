import React, { useState, useRef, useEffect } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { Category, Season, Condition, SellingStatus, ShoppingStatus, normalizeCategoryName } from '../types';
import { GarmentImage } from './GarmentImage';
import {
  fetchAllVintedOrders,
  extractVintedItemFromUrl,
  extractVintedItemsFromUrls,
  inferCategoryFromTitle,
  testWorkerConnection,
  scrapeVintedAccountListings,
  VintedOrder,
  VintedExtractedItem,
  VintedAccountListing,
} from '../services/vintedWorkerService';
import {
  determineLifecycleTags,
  getLifecycleTagColor,
  isCancelledStatus,
  LIFECYCLE_TAGS,
} from '../utils/tagUtils';
import {
  Link2,
  Sparkles,
  Loader2,
  Check,
  X,
  Upload,
  FileText,
  Camera,
  Plus,
  AlertCircle,
  AlertTriangle,
  PoundSterling,
  ClipboardPaste,
  ShoppingBag,
  Layers,
  Trash2,
  CheckSquare,
  Square,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  RefreshCcw,
  Image as ImageIcon,
  Files,
  FileCode,
  FolderUp,
  Tag,
  Globe,
  Server,
  KeyRound,
  Sliders,
  Play,
  CheckCircle2,
  User,
} from 'lucide-react';

export interface ExtractedGarmentItem {
  id?: string;
  name: string;
  brand: string;
  category: Category;
  purchasePrice: number;
  color?: string;
  material?: string;
  size?: string;
  season?: string[];
  condition?: string;
  careNotes?: string;
  notes?: string;
  tags?: string[];
  imageUrl?: string;
  allCandidateImages?: string[];
  targetStoreUrl?: string;
  retailerName?: string;
  orderStatus?: string;
  orderDate?: string;
  lastUpdatedDate?: string;
  seller?: string;
  buyer?: string;
  orderValue?: number;
  walletAmount?: number;
  transactionType?: 'Purchase' | 'Sale';
  sourceFile?: string;
  selectedForImport?: boolean;
  destination?: 'wardrobe' | 'shopping' | 'selling';
}

export interface VintedStagedFile {
  id: string;
  name: string;
  size: number;
  type: 'html' | 'pdf' | 'text';
  content?: string;
  base64?: string;
  mimeType: string;
  isLoaded: boolean;
  itemCount?: number;
}

interface AutoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDestination?: 'wardrobe' | 'shopping' | 'selling';
  initialUrl?: string;
  initialTab?: 'url' | 'photo' | 'text' | 'vinted';
  onSuccessDirectToForm?: (extractedData: any, target: 'wardrobe' | 'shopping' | 'selling') => void;
}

type ImportTab = 'url' | 'photo' | 'text' | 'vinted';

export const AutoImportModal: React.FC<AutoImportModalProps> = ({
  isOpen,
  onClose,
  defaultDestination = 'wardrobe',
  initialUrl = '',
  initialTab = 'url',
  onSuccessDirectToForm,
}) => {
  const {
    addItem,
    addShoppingItem,
    addSaleItem,
    batchAddItems,
    batchAddShoppingItems,
    batchAddSaleItems,
    categories,
    settings,
    updateSettings,
    syncVintedAccountOrders,
    importVintedExtractedListings,
  } = useWardrobe();
  const [activeTab, setActiveTab] = useState<ImportTab>(initialTab || 'url');

  // URL Tab state
  const [urlInput, setUrlInput] = useState('');

  // Photo Tab state
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [isTabDragging, setIsTabDragging] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vinted Data Tab state (Scrape Account + Cloudflare Worker + Batch URLs + HTML/PDF)
  const [vintedSubTab, setVintedSubTab] = useState<'scrape' | 'sync' | 'urls' | 'files'>('scrape');
  const [vintedAccountInput, setVintedAccountInput] = useState('');
  const [vintedAccountDomain, setVintedAccountDomain] = useState(settings.vintedWorkerAuth?.domain || 'co.uk');
  const [vintedAccountFilter, setVintedAccountFilter] = useState<'all' | 'listed' | 'sold'>('all');
  const [vintedAccountHtml, setVintedAccountHtml] = useState('');
  const [showAccountHtmlPaste, setShowAccountHtmlPaste] = useState(false);
  const [vintedAccountProgress, setVintedAccountProgress] = useState<string | null>(null);
  const [scrapedUserData, setScrapedUserData] = useState<{ username?: string; id?: string; photo?: string; itemsCount?: number } | null>(null);
  const [previewTagFilter, setPreviewTagFilter] = useState<'all' | 'Bought' | 'Sold' | 'Listed' | 'Cancelled'>('all');

  const [vintedSyncType, setVintedSyncType] = useState<'all' | 'purchased' | 'sold' | 'active'>('all');
  const [vintedSyncProgress, setVintedSyncProgress] = useState<string | null>(null);
  const [vintedBatchUrls, setVintedBatchUrls] = useState<string>('');
  const [vintedBatchProgress, setVintedBatchProgress] = useState<string | null>(null);
  const [showQuickWorkerConfig, setShowQuickWorkerConfig] = useState(false);
  const [quickWorkerUrl, setQuickWorkerUrl] = useState(settings.vintedWorkerAuth?.workerEndpoint || '');
  const [quickDomain, setQuickDomain] = useState(settings.vintedWorkerAuth?.domain || 'co.uk');
  const [quickAccessToken, setQuickAccessToken] = useState(settings.vintedWorkerAuth?.accessToken || '');
  const [quickCsrfToken, setQuickCsrfToken] = useState(settings.vintedWorkerAuth?.csrfToken || '');
  const [quickCookie, setQuickCookie] = useState(settings.vintedWorkerAuth?.cookie || '');
  const [quickSaveMessage, setQuickSaveMessage] = useState<string | null>(null);
  const [quickTestingWorker, setQuickTestingWorker] = useState(false);
  const [quickTestResult, setQuickTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [vintedFiles, setVintedFiles] = useState<VintedStagedFile[]>([]);
  const [isVintedDragging, setIsVintedDragging] = useState(false);
  const [vintedShoppingStatus, setVintedShoppingStatus] = useState<'Purchased' | 'To Buy'>('Purchased');
  const [vintedSellingStatus, setVintedSellingStatus] = useState<SellingStatus>('Listed');
  const [vintedRawInput, setVintedRawInput] = useState('');
  const vintedFileInputRef = useRef<HTMLInputElement>(null);

  // Card photo drop state
  const [draggingCardIdx, setDraggingCardIdx] = useState<number | null>(null);
  const cardFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Text Tab state
  const [textInput, setTextInput] = useState('');

  // Common extraction state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedGarmentItem[]>([]);
  const [basketSummary, setBasketSummary] = useState<{
    isBasket: boolean;
    basketTotalGbp: number;
    retailerName?: string;
  } | null>(null);

  const [globalDestination, setGlobalDestination] = useState<'wardrobe' | 'shopping' | 'selling'>(defaultDestination);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Reset and auto-trigger on initialUrl when opening
  useEffect(() => {
    if (isOpen) {
      setGlobalDestination(defaultDestination);
      setError(null);
      setSaveSuccessMessage(null);
      setIsSavingBatch(false);
      setActiveTab(initialTab || (initialUrl ? 'url' : 'url'));

      if (initialUrl && initialUrl.trim()) {
        setUrlInput(initialUrl.trim());
        setActiveTab('url');
        handleExtractFromUrl(initialUrl.trim());
      }
    } else {
      setExtractedItems([]);
      setBasketSummary(null);
      setUploadedImageBase64(null);
      setUrlInput('');
      setPhotoUrlInput('');
      setTextInput('');
      setVintedFiles([]);
      setVintedRawInput('');
    }
  }, [isOpen, initialUrl, initialTab, defaultDestination]);

  // Global paste handler when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste if active element is a text input / textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && (target as HTMLInputElement).type !== 'file';

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              processImageFile(file);
              return;
            }
          }
        }
      }

      // If user pasted image URL while not focused on input
      if (!isInput) {
        const text = e.clipboardData?.getData('text');
        if (text && (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://'))) {
          if (text.startsWith('data:image/')) {
            e.preventDefault();
            setUploadedImageBase64(text);
            setActiveTab('photo');
            setError(null);
            handleExtractFromImage(text);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP, AVIF).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImageBase64(base64);
      setActiveTab('photo');
      setError(null);
      handleExtractFromImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Paste image directly from system clipboard into Photo Tab
  const handlePasteFromClipboard = async () => {
    try {
      setError(null);
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'clipboard-screenshot.png', { type: imageType });
            processImageFile(file);
            return;
          }
        }
      }

      // Fallback: read text
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const trimmed = text.trim();
          if (trimmed.startsWith('data:image/')) {
            setUploadedImageBase64(trimmed);
            setActiveTab('photo');
            setError(null);
            handleExtractFromImage(trimmed);
            return;
          } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            // Direct image URL or link
            setUrlInput(trimmed);
            setActiveTab('url');
            handleExtractFromUrl(trimmed);
            return;
          }
        }
      }

      setError('No image found in clipboard. Copy an image or screenshot first, then click Paste or press Ctrl+V / ⌘V.');
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setError('Clipboard access was blocked. You can press Ctrl+V / ⌘V directly to paste an image, or click Browse to select a file.');
    }
  };

  // Replace photo on a specific extracted garment card
  const handleReplaceCardPhoto = (idx: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setExtractedItems((prev) => {
        const next = [...prev];
        if (next[idx]) {
          const currentCandidates = next[idx].allCandidateImages || [];
          next[idx] = {
            ...next[idx],
            imageUrl: base64,
            allCandidateImages: [base64, ...currentCandidates.filter((c) => c !== base64)],
          };
        }
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Paste image directly onto a specific garment card
  const handlePasteCardPhoto = async (idx: number) => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'card-photo.png', { type: imageType });
            handleReplaceCardPhoto(idx, file);
            return;
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://'))) {
          const base64 = text.trim();
          setExtractedItems((prev) => {
            const next = [...prev];
            if (next[idx]) {
              const currentCandidates = next[idx].allCandidateImages || [];
              next[idx] = {
                ...next[idx],
                imageUrl: base64,
                allCandidateImages: [base64, ...currentCandidates.filter((c) => c !== base64)],
              };
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.warn('Card paste error:', err);
    }
  };

  // Re-run Vision AI on a specific card image if the previous parse was inaccurate
  const handleReanalyzeCard = async (idx: number) => {
    const item = extractedItems[idx];
    if (!item || !item.imageUrl) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/extract-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: item.imageUrl,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await res.json();
      if (data.success && (data.item || (data.items && data.items[0]))) {
        const parsed = data.item || data.items[0];
        setExtractedItems((prev) => {
          const next = [...prev];
          if (next[idx]) {
            const validCategory = categories.includes(parsed.category as Category)
              ? (parsed.category as Category)
              : next[idx].category;

            next[idx] = {
              ...next[idx],
              name: parsed.name || next[idx].name,
              brand: parsed.brand || next[idx].brand,
              category: validCategory,
              purchasePrice: Number(parsed.purchasePrice) || next[idx].purchasePrice,
              color: parsed.color || next[idx].color,
              material: parsed.material || next[idx].material,
              season: Array.isArray(parsed.season) && parsed.season.length > 0 ? parsed.season : next[idx].season,
              condition: parsed.condition || next[idx].condition,
              notes: parsed.notes || next[idx].notes,
              tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : next[idx].tags,
            };
          }
          return next;
        });
      }
    } catch (err: any) {
      console.error('Re-analyze error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to detect if an item is a Sale / Resale vs Purchase / Wardrobe
  const isSaleItem = (raw: any): boolean => {
    if (raw.transactionType === 'Sale') return true;
    if (Array.isArray(raw.tags)) {
      const hasSaleTag = raw.tags.some((t: string) => {
        const lower = String(t).toLowerCase().trim();
        return (
          lower === 'sale' ||
          lower === 'sales' ||
          lower === 'resale' ||
          lower === 'selling' ||
          lower === 'sold' ||
          lower === 'listed' ||
          lower === 'vinted-sale' ||
          lower === 'active-listing'
        );
      });
      if (hasSaleTag) return true;
    }
    if (typeof raw.notes === 'string') {
      const n = raw.notes.toLowerCase();
      if (n.includes('vinted sale') || n.includes('listed for sale') || n.includes('sold to buyer') || n.includes('sale to @')) {
        return true;
      }
    }
    if (typeof raw.sourceFile === 'string') {
      const s = raw.sourceFile.toLowerCase();
      if (s.includes('sale') || s.includes('selling') || s.includes('listed')) {
        return true;
      }
    }
    if (typeof raw.orderStatus === 'string') {
      const st = raw.orderStatus.toLowerCase();
      if (st.includes('sold') || st.includes('listed') || st.includes('reserved')) {
        return true;
      }
    }
    return false;
  };

  // Helper to normalize items from API response
  const normalizeExtractedItems = (
    rawItems: any[],
    isBasket: boolean,
    totalGbp: number,
    retailer?: string
  ) => {
    const list: ExtractedGarmentItem[] = (rawItems || []).map((raw, idx) => {
      const validCategory = categories.includes(raw.category as Category)
        ? (raw.category as Category)
        : categories[0] || 'Outerwear';

      const isSale = isSaleItem(raw);
      const tags = Array.isArray(raw.tags) && raw.tags.length > 0
        ? [...raw.tags]
        : ['imported', validCategory.toLowerCase()];
      
      if (isSale && !tags.some((t: string) => t.toLowerCase() === 'sale')) {
        tags.push('sale');
      }

      const itemDestination = raw.destination || (isSale ? 'selling' : globalDestination);

      return {
        id: `extracted-${Date.now()}-${idx}`,
        name: raw.name || `Garment #${idx + 1}`,
        brand: raw.brand || 'Designer Brand',
        category: validCategory,
        purchasePrice: Number(raw.purchasePrice) || 80,
        color: raw.color || 'Neutral',
        material: raw.material || 'Premium Fabric',
        size: raw.size || '',
        season: Array.isArray(raw.season) && raw.season.length > 0 ? raw.season : ['Autumn', 'Winter'],
        condition: raw.condition || 'Pristine / New',
        careNotes: raw.careNotes || '',
        notes: raw.notes || '',
        tags,
        imageUrl: (raw.imageUrl && !raw.imageUrl.includes('unsplash.com')) ? raw.imageUrl.trim() : '',
        allCandidateImages: Array.isArray(raw.allCandidateImages)
          ? raw.allCandidateImages.filter((img: string) => img && !img.includes('unsplash.com'))
          : (raw.imageUrl && !raw.imageUrl.includes('unsplash.com') ? [raw.imageUrl] : []),
        targetStoreUrl: raw.targetStoreUrl || (activeTab === 'url' ? urlInput : undefined),
        retailerName: raw.retailerName || retailer || 'Online Store',
        orderStatus: raw.orderStatus || undefined,
        orderDate: raw.orderDate || undefined,
        lastUpdatedDate: raw.lastUpdatedDate || undefined,
        seller: raw.seller || undefined,
        buyer: raw.buyer || undefined,
        orderValue: Number(raw.orderValue) || undefined,
        walletAmount: Number(raw.walletAmount) || undefined,
        transactionType: raw.transactionType || (isSale ? 'Sale' : undefined),
        sourceFile: raw.sourceFile || undefined,
        selectedForImport: true,
        destination: itemDestination,
      };
    });

    setExtractedItems(list);
    setBasketSummary({
      isBasket: isBasket || list.length > 1,
      basketTotalGbp: Number(totalGbp) || list.reduce((sum, it) => sum + it.purchasePrice, 0),
      retailerName: retailer,
    });
  };

  // Extraction Method 1: URL / Web Link (Single, Basket, or Multiple links)
  const handleExtractFromUrl = async (targetUrl?: string) => {
    const urlToUse = (targetUrl || urlInput).trim();
    if (!urlToUse) {
      setError('Please paste a valid web product or shopping basket URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedItems([]);
    setBasketSummary(null);
    setSaveSuccessMessage(null);

    try {
      // If this is a Vinted link and user has a configured Cloudflare Worker, extract directly via Worker first
      if (urlToUse.toLowerCase().includes('vinted.') && settings.vintedWorkerAuth?.workerEndpoint) {
        try {
          const vintedItem = await extractVintedItemFromUrl(
            settings.vintedWorkerAuth.workerEndpoint,
            urlToUse
          );
          if (vintedItem) {
            const p =
              typeof vintedItem.price === 'number'
                ? vintedItem.price
                : parseFloat(String(vintedItem.price || '0').replace(/[^0-9.]/g, '')) || 0;
            const cat = normalizeCategoryName(inferCategoryFromTitle(vintedItem.title), categories);
            const isSale = globalDestination === 'selling';

            normalizeExtractedItems(
              [
                {
                  name: vintedItem.title || 'Vinted Listing',
                  brand: vintedItem.brand || 'Vinted',
                  category: cat,
                  purchasePrice: p,
                  color: vintedItem.colour || 'Various',
                  condition: vintedItem.condition || 'Good',
                  season: ['All-Season'],
                  imageUrl: vintedItem.image || '',
                  targetStoreUrl: vintedItem.url,
                  retailerName: 'Vinted',
                  seller: vintedItem.seller,
                  notes: [vintedItem.description, vintedItem.seller ? `Seller: @${vintedItem.seller}` : '']
                    .filter(Boolean)
                    .join(' · '),
                  destination: globalDestination,
                  tags: ['vinted', 'active-listing', isSale ? 'sale' : 'imported'],
                  transactionType: isSale ? 'Sale' : undefined,
                },
              ],
              false,
              p,
              'Vinted'
            );
            return;
          }
        } catch (vintedErr) {
          console.warn('Vinted Worker direct link parse failed, falling back to Gemini URL extractor:', vintedErr);
        }
      }

      const res = await fetch('/api/gemini/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToUse }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract product details from this link.');
      }

      const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : data.item ? [data.item] : [];
      if (items.length === 0) {
        throw new Error('No garment items could be parsed from this page.');
      }

      normalizeExtractedItems(
        items,
        data.isBasket || items.length > 1,
        data.basketTotalGbp || data.totalEstimatedGbp || 0,
        data.retailerName
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error communicating with extraction service.');
    } finally {
      setIsLoading(false);
    }
  };

  // Extraction Method 2: Photo / Screenshot Vision AI (Detects single piece or multi-item carts)
  const handleExtractFromImage = async (base64Img: string, mimeType?: string) => {
    setIsLoading(true);
    setError(null);
    setExtractedItems([]);
    setBasketSummary(null);
    setSaveSuccessMessage(null);

    try {
      const res = await fetch('/api/gemini/extract-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: mimeType || 'image/jpeg',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze photo with Vision AI.');
      }

      const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : data.item ? [data.item] : [];
      normalizeExtractedItems(
        items,
        data.isBasket || items.length > 1,
        data.basketTotalGbp || data.totalEstimatedGbp || 0,
        data.retailerName
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to analyze photo with Vision AI.');
      // Create fallback item so user can still save their uploaded photo
      normalizeExtractedItems(
        [
          {
            name: 'Wardrobe Piece',
            brand: 'Designer Brand',
            category: categories[0] || 'Tops',
            purchasePrice: 100,
            color: 'Neutral',
            season: ['Autumn', 'Winter'],
            imageUrl: base64Img,
            allCandidateImages: [base64Img],
            tags: ['photo-upload'],
          },
        ],
        false,
        100,
        'Photo Upload'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Extraction Method 3: Text / Description / Invoice / Basket text
  const handleExtractFromText = async () => {
    if (!textInput.trim()) {
      setError('Please paste product details, shopping basket list, or receipt text.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedItems([]);
    setBasketSummary(null);
    setSaveSuccessMessage(null);

    try {
      const res = await fetch('/api/gemini/extract-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract garment details from text.');
      }

      const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : data.item ? [data.item] : [];
      normalizeExtractedItems(
        items,
        data.isBasket || items.length > 1,
        data.basketTotalGbp || data.totalEstimatedGbp || 0,
        data.retailerName
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to parse text.');
    } finally {
      setIsLoading(false);
    }
  };

  // Vinted File Staging & Reading
  const processVintedFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newStagedFiles: VintedStagedFile[] = [];

    for (const file of fileArray) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isHtml =
        file.type === 'text/html' ||
        file.name.toLowerCase().endsWith('.html') ||
        file.name.toLowerCase().endsWith('.htm');
      const isTxt =
        file.type.startsWith('text/') ||
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.csv');

      if (!isPdf && !isHtml && !isTxt) {
        setError(`File "${file.name}" is not a recognized Vinted file (please upload .html, .htm, or .pdf).`);
        continue;
      }

      const fileId = `vf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const staged: VintedStagedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : isHtml ? 'html' : 'text',
        mimeType: file.type || (isPdf ? 'application/pdf' : 'text/html'),
        isLoaded: false,
      };
      newStagedFiles.push(staged);

      const reader = new FileReader();
      if (isPdf) {
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setVintedFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, base64, isLoaded: true } : f))
          );
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setVintedFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, content, isLoaded: true } : f))
          );
        };
        reader.readAsText(file);
      }
    }

    setVintedFiles((prev) => [...prev, ...newStagedFiles]);
    setError(null);
  };

  const handleRemoveVintedFile = (fileId: string) => {
    setVintedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Vinted Extraction Handler
  const handleExtractFromVinted = async () => {
    const readyFiles = vintedFiles.filter((f) => f.isLoaded && (f.content || f.base64));
    if (readyFiles.length === 0 && !vintedRawInput.trim()) {
      setError('Please upload at least one Vinted data file (HTML or PDF) or paste HTML content.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedItems([]);
    setBasketSummary(null);
    setSaveSuccessMessage(null);

    try {
      const payloadFiles = readyFiles.map((f) => ({
        name: f.name,
        type: f.type,
        content: f.content,
        base64: f.base64,
        mimeType: f.mimeType,
      }));

      if (vintedRawInput.trim()) {
        payloadFiles.push({
          name: 'pasted_vinted_data.html',
          type: 'html',
          content: vintedRawInput.trim(),
          base64: '',
          mimeType: 'text/html',
        });
      }

      const res = await fetch('/api/gemini/extract-from-vinted-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract items from Vinted data files.');
      }

      const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : data.item ? [data.item] : [];
      if (items.length === 0) {
        throw new Error('No garment listings could be identified in the uploaded Vinted data.');
      }

      normalizeExtractedItems(
        items,
        true,
        data.basketTotalGbp || data.totalEstimatedGbp || 0,
        'Vinted'
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to parse Vinted data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Save & Test Worker configuration
  const handleQuickSaveWorkerConfig = () => {
    if (!quickWorkerUrl.trim()) {
      setError('Please provide a Cloudflare Worker URL.');
      return;
    }
    updateSettings({
      vintedWorkerAuth: {
        workerEndpoint: quickWorkerUrl.trim(),
        domain: quickDomain.trim() || 'co.uk',
        accessToken: quickAccessToken.trim(),
        csrfToken: quickCsrfToken.trim(),
        cookie: quickCookie.trim(),
        refreshToken: settings.vintedWorkerAuth?.refreshToken || '',
        autoRouteOrders: settings.vintedWorkerAuth?.autoRouteOrders ?? true,
        defaultImportDestination: settings.vintedWorkerAuth?.defaultImportDestination || 'wardrobe',
      },
    });
    setQuickSaveMessage('Worker credentials saved successfully!');
    setTimeout(() => setQuickSaveMessage(null), 3000);
  };

  const handleQuickTestWorker = async () => {
    const endpoint = quickWorkerUrl.trim() || settings.vintedWorkerAuth?.workerEndpoint;
    if (!endpoint) {
      setQuickTestResult({ success: false, message: 'Please enter a Cloudflare Worker URL to test.' });
      return;
    }
    setQuickTestingWorker(true);
    setQuickTestResult(null);
    try {
      const res = await testWorkerConnection(endpoint);
      setQuickTestResult(res);
    } catch (e: any) {
      setQuickTestResult({ success: false, message: e?.message || 'Connection test failed.' });
    } finally {
      setQuickTestingWorker(false);
    }
  };

  // Scrape Vinted Account Closet Listings (Public or Authenticated)
  const handleScrapeAccountListings = async (targetInput?: string) => {
    const input = (targetInput !== undefined ? targetInput : vintedAccountInput).trim();
    const rawHtml = vintedAccountHtml.trim();

    if (!input && !rawHtml) {
      setError('Please enter a Vinted account URL (e.g. https://www.vinted.co.uk/member/123456-username), username (@username), or paste the account page HTML.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveSuccessMessage(null);
    setVintedAccountProgress('Scraping listings from Vinted account...');

    try {
      const workerAuth = settings.vintedWorkerAuth;
      const result = await scrapeVintedAccountListings({
        accountUrlOrUsername: input,
        domain: vintedAccountDomain || workerAuth?.domain || 'co.uk',
        workerEndpoint: workerAuth?.workerEndpoint,
        rawHtml: rawHtml || undefined,
        statusFilter: vintedAccountFilter,
        accessToken: workerAuth?.accessToken,
        cookie: workerAuth?.cookie,
        onProgress: (msg) => setVintedAccountProgress(msg),
      });

      if (result.user) {
        setScrapedUserData(result.user);
      }

      if (!result.listings || result.listings.length === 0) {
        throw new Error(
          `No listings could be found for ${result.user?.username || input}. Vinted may be displaying a verification challenge in your region, or this closet currently has 0 items matching the filter. You can also view the profile in your browser, copy page source, and paste into the HTML field below.`
        );
      }

      // Convert VintedAccountListing to ExtractedGarmentItem
      const rawExtracted: any[] = result.listings.map((l, idx) => {
        const isSold = l.status === 'Sold';
        const isCancelled = l.status === 'Cancelled';
        const p = typeof l.price === 'number' ? l.price : parseFloat(String(l.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const cat = normalizeCategoryName(l.category || inferCategoryFromTitle(l.title), categories);

        // Account listings are items being sold / listed by this user, so default to 'selling'
        const dest = globalDestination === 'wardrobe' || globalDestination === 'shopping' ? globalDestination : 'selling';

        const lifecycleTags = determineLifecycleTags({
          destination: dest,
          sellingStatus: isSold ? 'Sold' : (isCancelled ? 'Draft' : 'Listed'),
          isVinted: true,
          existingTags: l.tags || [],
          sourceType: 'account-scrape',
        });

        return {
          name: l.title || `Vinted Listing #${l.id || idx + 1}`,
          brand: l.brand || 'Vinted',
          category: cat,
          size: l.size || '',
          color: l.color || 'Various',
          purchasePrice: p,
          season: ['All-Season'],
          condition: l.condition || 'Good',
          imageUrl: l.imageUrl || '',
          allCandidateImages: l.allImages && l.allImages.length > 0 ? l.allImages : (l.imageUrl ? [l.imageUrl] : []),
          targetStoreUrl: l.url,
          retailerName: 'Vinted',
          orderStatus: isSold ? 'Sold' : (isCancelled ? 'Cancelled' : 'Listed'),
          orderDate: new Date().toISOString().split('T')[0],
          transactionType: 'Sale',
          sourceFile: `Vinted Closet @${result.user?.username || input.replace(/https?:\/\/[^/]+\/(member\/)?/, '')}`,
          destination: dest,
          tags: lifecycleTags,
          notes: l.description ? `${l.description} · Vinted listing from @${result.user?.username || 'user'}` : `Vinted listing from @${result.user?.username || 'user'}`,
          seller: result.user?.username,
        };
      });

      normalizeExtractedItems(
        rawExtracted,
        true,
        rawExtracted.reduce((acc, it) => acc + (it.purchasePrice || 0), 0),
        'Vinted'
      );
    } catch (err: any) {
      console.error('Vinted account scrape error:', err);
      setError(err?.message || 'Failed to scrape Vinted account listings. Check URL or paste page HTML.');
    } finally {
      setIsLoading(false);
      setVintedAccountProgress(null);
    }
  };

  // Live Cloudflare Worker: Sync Vinted Account Orders
  const handleSyncVintedOrders = async (mode: 'preview' | 'direct' = 'preview') => {
    const workerAuth = settings.vintedWorkerAuth;
    if (!workerAuth?.workerEndpoint) {
      setShowQuickWorkerConfig(true);
      setError('Please configure your Cloudflare Worker URL before syncing orders.');
      return;
    }

    if (!workerAuth.accessToken && !workerAuth.cookie) {
      setShowQuickWorkerConfig(true);
      setError('Please provide either your Vinted Access Token or Session Cookie.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveSuccessMessage(null);
    setVintedSyncProgress('Connecting to Cloudflare Worker...');

    try {
      const typesToSync: Array<'purchased' | 'sold' | 'active'> =
        vintedSyncType === 'all'
          ? ['purchased', 'sold', 'active']
          : [vintedSyncType];

      const res = await fetchAllVintedOrders(
        workerAuth,
        typesToSync,
        (msg) => setVintedSyncProgress(msg),
        (newToken) => {
          updateSettings({
            vintedWorkerAuth: {
              ...workerAuth,
              accessToken: newToken,
            },
          });
        }
      );

      if (res.errors.length > 0 && res.orders.length === 0) {
        throw new Error(res.errors.join(' | '));
      }

      if (res.orders.length === 0) {
        setError('No orders or active listings found in your Vinted account for the chosen sync filter.');
        setIsLoading(false);
        setVintedSyncProgress(null);
        return;
      }

      if (mode === 'direct') {
        // Direct commit into database with rollback checkpoint & audit log
        const targetDest = workerAuth.defaultImportDestination === 'shopping' ? 'shopping' : 'wardrobe';
        const syncRes = syncVintedAccountOrders(res.orders, {
          routePurchasedTo: targetDest,
          skipDuplicates: workerAuth.autoRouteOrders ?? true,
        });

        const activeCount = res.orders.filter((o) => o.type === 'active' || o.status === 'Listed').length;

        setSaveSuccessMessage(
          `Successfully synced Vinted account: added ${syncRes.addedPurchased} purchases (£${syncRes.totalPurchasedVal.toFixed(2)}), ${syncRes.addedSold} sold items (£${syncRes.totalSoldVal.toFixed(2)})${activeCount > 0 ? `, and ${activeCount} active closet listings` : ''}${syncRes.skippedDuplicates > 0 ? ` (${syncRes.skippedDuplicates} duplicates skipped)` : ''}. Rollback checkpoint created.`
        );
        setIsLoading(false);
        setVintedSyncProgress(null);
        return;
      }

      // Preview mode: populate preview cards so user can inspect and edit before importing
      const rawExtracted: any[] = res.orders.map((o) => {
        const p = typeof o.price === 'number' ? o.price : parseFloat(String(o.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const cat = normalizeCategoryName(inferCategoryFromTitle(o.title), categories);
        const isSold = o.type === 'sold';
        const defaultDest = isSold
          ? 'selling'
          : (workerAuth.defaultImportDestination || globalDestination);

        return {
          name: o.title || `Vinted Order #${o.orderId}`,
          brand: 'Vinted',
          category: cat,
          purchasePrice: p,
          color: 'Various',
          season: ['All-Season'],
          condition: 'Good',
          imageUrl: o.image || '',
          targetStoreUrl: o.orderId ? `https://www.vinted.${workerAuth.domain || 'co.uk'}/items/${o.orderId}` : '',
          retailerName: 'Vinted',
          orderStatus: o.transactionStatus || (isSold ? 'Sold' : 'Delivered'),
          orderDate: o.date ? String(o.date).slice(0, 10) : undefined,
          transactionType: isSold ? 'Sale' : 'Purchase',
          sourceFile: `Vinted Live ${isSold ? 'Sale' : 'Order'} #${o.orderId}`,
          destination: defaultDest,
          tags: determineLifecycleTags({
            destination: defaultDest,
            transactionType: isSold ? 'Sale' : 'Purchase',
            orderStatus: o.transactionStatus,
            sellingStatus: isSold ? (isCancelledStatus(o.transactionStatus || '') ? 'Draft' : 'Sold') : undefined,
            shoppingStatus: !isSold ? (isCancelledStatus(o.transactionStatus || '') ? 'Cancelled' : 'Purchased') : undefined,
            isVinted: true,
            existingTags: ['account-sync'],
          }),
          notes: o.transactionStatus ? `Vinted ${o.type} · ${o.transactionStatus}` : `Vinted ${o.type} order`,
        };
      });

      normalizeExtractedItems(
        rawExtracted,
        true,
        rawExtracted.reduce((acc, it) => acc + (it.purchasePrice || 0), 0),
        'Vinted'
      );
    } catch (err: any) {
      console.error('Vinted orders sync error:', err);
      setError(err?.message || 'Failed to sync orders from Vinted via Cloudflare Worker.');
    } finally {
      setIsLoading(false);
      setVintedSyncProgress(null);
    }
  };

  // Batch Extract Vinted URLs via Cloudflare Worker
  const handleBatchExtractVintedUrls = async () => {
    const urls = vintedBatchUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http') && u.includes('vinted'));

    if (urls.length === 0) {
      setError('Please paste at least one valid Vinted listing URL (e.g. https://www.vinted.co.uk/items/12345...).');
      return;
    }

    const workerUrl = settings.vintedWorkerAuth?.workerEndpoint;
    if (!workerUrl) {
      setShowQuickWorkerConfig(true);
      setError('Please configure your Cloudflare Worker URL before extracting public Vinted listings.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedItems([]);
    setBasketSummary(null);
    setSaveSuccessMessage(null);
    setVintedBatchProgress(`Extracting ${urls.length} item(s) via Cloudflare Worker...`);

    try {
      const res = await extractVintedItemsFromUrls(workerUrl, urls, (curr, tot, u) => {
        setVintedBatchProgress(`Extracting item ${curr} of ${tot}...`);
      });

      if (res.errors.length > 0 && res.items.length === 0) {
        throw new Error(res.errors.join(' | '));
      }

      if (res.items.length === 0) {
        setError('No items could be extracted from the provided Vinted URLs.');
        setIsLoading(false);
        setVintedBatchProgress(null);
        return;
      }

      const rawItems = res.items.map((it) => {
        const p = typeof it.price === 'number' ? it.price : parseFloat(String(it.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const cat = normalizeCategoryName(inferCategoryFromTitle(it.title), categories);
        const isSale = globalDestination === 'selling';
        return {
          name: it.title || 'Vinted Listing',
          brand: it.brand || 'Vinted',
          category: cat,
          purchasePrice: p,
          color: it.colour || 'Various',
          condition: it.condition || 'Good',
          season: ['All-Season'],
          imageUrl: it.image || '',
          targetStoreUrl: it.url,
          retailerName: 'Vinted',
          seller: it.seller,
          notes: [it.description, it.seller ? `Seller: @${it.seller}` : ''].filter(Boolean).join(' · '),
          destination: globalDestination,
          tags: ['vinted', 'active-listing', isSale ? 'sale' : 'imported'],
          transactionType: isSale ? 'Sale' : undefined,
        };
      });

      normalizeExtractedItems(
        rawItems,
        rawItems.length > 1,
        rawItems.reduce((acc, it) => acc + (it.purchasePrice || 0), 0),
        'Vinted'
      );
    } catch (err: any) {
      console.error('Vinted batch extraction error:', err);
      setError(err?.message || 'Failed to extract Vinted listings.');
    } finally {
      setIsLoading(false);
      setVintedBatchProgress(null);
    }
  };

  // Field edit handlers
  const handleUpdateItemField = (index: number, field: keyof ExtractedGarmentItem, value: any) => {
    setExtractedItems((prev) => {
      const next = [...prev];
      if (next[index]) {
        let updatedItem = { ...next[index], [field]: value };
        // If user adds sale-related tags, automatically switch destination to 'selling'
        if (field === 'tags' && Array.isArray(value)) {
          const hasSale = value.some((t: string) =>
            ['sale', 'sales', 'resale', 'selling', 'sold', 'vinted-sale'].includes(String(t).toLowerCase())
          );
          if (hasSale && updatedItem.destination !== 'selling') {
            updatedItem.destination = 'selling';
          }
        }
        next[index] = updatedItem;
      }
      return next;
    });
  };

  // Re-scan all items to auto-route sales to selling and purchases to wardrobe/wishlist
  const handleAutoRouteDestinations = () => {
    setExtractedItems((prev) =>
      prev.map((it) => {
        const isSale = isSaleItem(it);
        const nextTags = isSale && !it.tags.some((t) => t.toLowerCase() === 'sale') ? [...it.tags, 'sale'] : it.tags;
        return {
          ...it,
          destination: isSale ? 'selling' : globalDestination === 'selling' ? 'wardrobe' : globalDestination,
          tags: nextTags,
          transactionType: isSale ? 'Sale' : it.transactionType || 'Purchase',
        };
      })
    );
  };

  const handleToggleLifecycleTag = (index: number, tag: 'Bought' | 'Sold' | 'Listed' | 'Cancelled') => {
    setExtractedItems((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      const item = { ...next[index] };
      const currentTags = Array.isArray(item.tags) ? [...item.tags] : [];
      const hasTag = currentTags.includes(tag);

      // Mutually exclusive lifecycle tags
      const withoutLifecycle = currentTags.filter((t) => !LIFECYCLE_TAGS.includes(t as any));
      const updatedTags = hasTag ? withoutLifecycle : [...withoutLifecycle, tag];

      if (!hasTag) {
        if (tag === 'Sold') {
          item.destination = 'selling';
          item.orderStatus = 'Sold';
          item.transactionType = 'Sale';
        } else if (tag === 'Listed') {
          item.destination = 'selling';
          item.orderStatus = 'Listed';
          item.transactionType = 'Sale';
        } else if (tag === 'Bought') {
          item.destination = 'wardrobe';
          item.orderStatus = 'Order completed!';
          item.transactionType = 'Purchase';
        } else if (tag === 'Cancelled') {
          item.orderStatus = 'Cancelled';
        }
      }

      item.tags = updatedTags;
      next[index] = item;
      return next;
    });
  };

  const handleToggleSelectItem = (index: number) => {
    setExtractedItems((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], selectedForImport: !next[index].selectedForImport };
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allSelected = extractedItems.every((it) => it.selectedForImport);
    setExtractedItems((prev) => prev.map((it) => ({ ...it, selectedForImport: !allSelected })));
  };

  const handleSetAllDestination = (dest: 'wardrobe' | 'shopping' | 'selling') => {
    setGlobalDestination(dest);
    setExtractedItems((prev) => prev.map((it) => ({ ...it, destination: dest })));
  };

  const handleRemoveItemFromList = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Batch Save Handler: creates separate listings for each extracted garment
  const handleSaveSelectedItems = async () => {
    const selectedItems = extractedItems.filter((it) => it.selectedForImport);
    if (selectedItems.length === 0) {
      setError('Please select at least one garment to import.');
      return;
    }

    setIsSavingBatch(true);

    const wardrobeItemsToAdd: Array<Omit<import('../types').WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount'>> = [];
    const shoppingItemsToAdd: Array<Omit<import('../types').ShoppingItem, 'id' | 'addedDate'>> = [];
    const saleItemsToAdd: Array<Omit<import('../types').SaleItem, 'id' | 'createdAt' | 'updatedAt'>> = [];

    for (const item of selectedItems) {
      const targetDest = item.destination || globalDestination;
      const isVinted = activeTab === 'vinted' || item.retailerName === 'Vinted' || (item.tags && item.tags.includes('vinted'));

      if (targetDest === 'wardrobe') {
        wardrobeItemsToAdd.push({
          name: item.name || 'Imported Piece',
          brand: item.brand || 'Designer Brand',
          category: item.category || categories[0] || 'Outerwear',
          subcategory: item.tags?.[0] || 'Capsule Piece',
          color: item.color || 'Neutral',
          material: item.material || undefined,
          size: item.size || undefined,
          season: (item.season as Season[]) || ['Autumn', 'Winter'],
          purchaseDate: item.orderDate || new Date().toISOString().split('T')[0],
          purchasePrice: Number(item.purchasePrice) || 0,
          currentValuation: Number(item.purchasePrice) || 0,
          condition: (item.condition as Condition) || 'Vintage / Well-Loved',
          tags: determineLifecycleTags({
            destination: 'wardrobe',
            orderStatus: item.orderStatus,
            transactionType: item.transactionType,
            isVinted,
            existingTags: item.tags,
            sourceType: activeTab === 'vinted' ? (vintedSubTab === 'scrape' ? 'account-scrape' : 'file') : 'general',
          }),
          imageUrl: item.imageUrl || '',
          isFavorite: false,
          isArchived: false,
          notes: `Imported piece.${item.material ? ` Material: ${item.material}.` : ''}${item.retailerName ? ` Retailer: ${item.retailerName}.` : ''} ${item.notes || ''}`.trim(),
          seller: item.seller || undefined,
          buyer: item.buyer || undefined,
          orderStatus: item.orderStatus || (isVinted ? 'Order completed!' : undefined),
          orderDate: item.orderDate || undefined,
          lastUpdatedDate: item.lastUpdatedDate || undefined,
          orderValue: Number(item.orderValue) || Number(item.purchasePrice) || undefined,
          walletAmount: Number(item.walletAmount) || undefined,
          transactionType: item.transactionType || (isVinted ? 'Purchase' : undefined),
        });
      } else if (targetDest === 'selling') {
        const isSoldItem =
          vintedSellingStatus === 'Sold' ||
          (item.orderStatus && item.orderStatus.toLowerCase().includes('sold')) ||
          (item.transactionType === 'Sale' && item.orderStatus && !item.orderStatus.toLowerCase().includes('list'));
        const effectiveStatus: SellingStatus =
          vintedSellingStatus === 'Draft'
            ? 'Draft'
            : isSoldItem
            ? 'Sold'
            : (vintedSellingStatus || 'Listed');

        const candidateImages = Array.isArray(item.allCandidateImages) && item.allCandidateImages.length > 0
          ? item.allCandidateImages
          : (item.imageUrl ? [item.imageUrl] : []);

        saleItemsToAdd.push({
          name: item.name || 'Resale Garment',
          brand: item.brand || 'Designer Brand',
          category: item.category || categories[0] || 'Outerwear',
          size: item.size || undefined,
          color: item.color || 'Neutral',
          condition: (item.condition as Condition) || 'Excellent',
          originalPricePaid: Number(item.purchasePrice) || 0,
          listingPrice: Number(item.purchasePrice) || 0,
          soldPrice: effectiveStatus === 'Sold' ? (Number(item.purchasePrice) || undefined) : undefined,
          soldDate: effectiveStatus === 'Sold' ? (item.orderDate || new Date().toISOString().split('T')[0]) : undefined,
          platform: 'Vinted',
          status: effectiveStatus,
          imageUrl: item.imageUrl || (candidateImages[0] || ''),
          additionalImages: candidateImages.length > 1 ? candidateImages.slice(1) : undefined,
          description: item.notes || `Authentic pre-owned ${item.brand} ${item.name}.`,
          tags: determineLifecycleTags({
            destination: 'selling',
            sellingStatus: effectiveStatus,
            orderStatus: item.orderStatus,
            transactionType: item.transactionType || 'Sale',
            isVinted,
            existingTags: item.tags,
            sourceType: activeTab === 'vinted' ? (vintedSubTab === 'scrape' ? 'account-scrape' : 'file') : 'general',
          }),
          listedDate: item.orderDate || new Date().toISOString().split('T')[0],
          buyerUsername: item.buyer && item.buyer !== 'user' && item.buyer !== 'No data' ? item.buyer : undefined,
          notes: item.sourceFile ? `Imported from Vinted (${item.sourceFile}).` : 'Imported from Vinted listing.',
        });
      } else {
        const cleanStatus = (item.orderStatus || '').toLowerCase();
        let itemStatus: ShoppingStatus = 'To Buy';
        if (
          cleanStatus.includes('completed') ||
          cleanStatus.includes('complete') ||
          cleanStatus.includes('delivered') ||
          cleanStatus.includes('received') ||
          cleanStatus.includes('paid') ||
          cleanStatus.includes('order completed')
        ) {
          itemStatus = 'Purchased';
        } else if (
          cleanStatus.includes('cancel') ||
          cleanStatus.includes('refund') ||
          cleanStatus.includes('returned') ||
          cleanStatus.includes('return')
        ) {
          itemStatus = 'Cancelled';
        } else if (cleanStatus.includes('sold')) {
          itemStatus = 'Sold';
        } else if (
          cleanStatus.includes('pass') ||
          cleanStatus.includes('declin') ||
          cleanStatus.includes('reject')
        ) {
          itemStatus = 'Passed';
        } else if (cleanStatus.includes('research')) {
          itemStatus = 'Researching';
        } else if (isVinted) {
          itemStatus = vintedShoppingStatus || 'Purchased';
        }

        const isPurchased = itemStatus === 'Purchased';

        shoppingItemsToAdd.push({
          name: item.name || 'Wishlist Item',
          brand: item.brand || 'Brand',
          category: item.category || categories[0] || 'Outerwear',
          estimatedPrice: Number(item.purchasePrice) || 0,
          actualPricePaid: isPurchased ? (Number(item.orderValue) || Number(item.purchasePrice) || 0) : undefined,
          priority: 'High',
          status: itemStatus,
          season: (item.season?.[0] as Season) || 'Autumn',
          matchingWardrobeItemIds: [],
          targetStoreUrl: item.targetStoreUrl || (activeTab === 'url' ? urlInput : 'https://www.vinted.co.uk'),
          imageUrl: item.imageUrl || '',
          retailerName: item.retailerName || (isVinted ? 'Vinted' : 'Online Retailer'),
          reasonOrGap: item.notes || (isVinted ? `Imported from Vinted data (${item.sourceFile || 'Vinted export'})` : `Identified garment from ${item.brand}`),
          tags: determineLifecycleTags({
            destination: 'shopping',
            shoppingStatus: itemStatus,
            orderStatus: item.orderStatus,
            transactionType: item.transactionType,
            isVinted,
            existingTags: item.tags,
            sourceType: activeTab === 'vinted' ? (vintedSubTab === 'scrape' ? 'account-scrape' : 'file') : 'general',
          }),
          purchasedDate: isPurchased ? (item.orderDate || new Date().toISOString().split('T')[0]) : undefined,
          seller: item.seller || undefined,
          buyer: item.buyer || undefined,
          orderStatus: item.orderStatus || (isVinted ? 'Order completed!' : undefined),
          orderDate: item.orderDate || undefined,
          lastUpdatedDate: item.lastUpdatedDate || undefined,
          orderValue: Number(item.orderValue) || Number(item.purchasePrice) || undefined,
          walletAmount: Number(item.walletAmount) || undefined,
          transactionType: item.transactionType || (isVinted ? 'Purchase' : undefined),
        });
      }
    }

    if (wardrobeItemsToAdd.length > 0) {
      batchAddItems(wardrobeItemsToAdd, `Imported ${wardrobeItemsToAdd.length} Garments`);
    }
    if (shoppingItemsToAdd.length > 0) {
      batchAddShoppingItems(shoppingItemsToAdd, `Imported ${shoppingItemsToAdd.length} Wishlist Items`);
    }
    if (saleItemsToAdd.length > 0) {
      batchAddSaleItems(saleItemsToAdd, `Imported ${saleItemsToAdd.length} Resale Items`);
    }

    const messages = [];
    if (wardrobeItemsToAdd.length > 0) messages.push(`${wardrobeItemsToAdd.length} to Wardrobe`);
    if (shoppingItemsToAdd.length > 0) messages.push(`${shoppingItemsToAdd.length} to Shopping`);
    if (saleItemsToAdd.length > 0) messages.push(`${saleItemsToAdd.length} to Resale`);

    setSaveSuccessMessage(`Successfully imported ${selectedItems.length} garment${selectedItems.length > 1 ? 's' : ''} (${messages.join(', ')})! You can undo this anytime.`);

    setTimeout(() => {
      setIsSavingBatch(false);
      onClose();
    }, 1200);
  };

  const handlePasteClipboardUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http') || text.includes('http'))) {
        setUrlInput(text);
        handleExtractFromUrl(text);
      }
    } catch {
      // ignore clipboard permission error
    }
  };

  const selectedCount = extractedItems.filter((it) => it.selectedForImport).length;
  const selectedTotalPrice = extractedItems
    .filter((it) => it.selectedForImport)
    .reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Hidden File Input for General Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processImageFile(e.target.files[0]);
          }
        }}
      />

      <div className="bg-white border border-[#E5E5E1] shadow-2xl rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#F8F7F4] border-b border-[#E5E5E1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#8C7355] text-white flex items-center justify-center shadow-xs rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-serif font-semibold text-[#1A1A1A]">
                  Import Toolkit
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 bg-[#F2F1ED] border border-[#D5D5D0] text-[#5A5A55] rounded">
                  Paste &amp; Drop Precision Enabled
                </span>
              </div>
              <p className="text-[11px] text-[#767670]">
                Extract individual items or shopping carts via Link, Photo/Screenshot, or Order Text.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Import Mode Tabs */}
        <div className="flex border-b border-[#E5E5E1] bg-[#F2F1ED] text-xs font-mono shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-r border-[#E5E5E1] transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white font-bold text-[#1A1A1A] border-b-2 border-b-[#8C7355]'
                : 'text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-[#8C7355]" />
            <span>1. Store / Basket URL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('photo');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-r border-[#E5E5E1] transition-colors cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-white font-bold text-[#1A1A1A] border-b-2 border-b-[#8C7355]'
                : 'text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#8C7355]" />
            <span>2. Cart Screenshot / Photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-r border-[#E5E5E1] transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white font-bold text-[#1A1A1A] border-b-2 border-b-[#8C7355]'
                : 'text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#8C7355]" />
            <span>3. Order Text</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('vinted');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'vinted'
                ? 'bg-white font-bold text-[#007782] border-b-2 border-b-[#007782]'
                : 'text-[#767670] hover:text-[#007782] hover:bg-[#EAE8E3]'
            }`}
          >
            <FolderUp className="w-3.5 h-3.5 text-[#007782]" />
            <span className="font-semibold">4. Vinted Sync &amp; Worker</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: URL / BASKET URL IMPORT */}
          {activeTab === 'url' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                  Paste Product or Shopping Basket Link(s)
                </label>
                <span className="text-[10px] text-[#767670] font-mono">
                  Supports Barbour, Zara, COS, Arket, Net-A-Porter, Reiss, etc.
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="Paste product link or shopping basket URL (e.g. https://www.barbour.com/...)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleExtractFromUrl();
                    }}
                    className="w-full pl-8 pr-7 py-2 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                  />
                  <Link2 className="w-3.5 h-3.5 text-[#8C7355] absolute left-2.5 top-2.5" />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-2 top-2 text-[#A5A59E] hover:text-[#1A1A1A]"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePasteClipboardUrl}
                  className="px-2.5 py-2 bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#4A4A45] border border-[#D5D5D0] text-xs font-mono flex items-center gap-1 cursor-pointer shrink-0"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Paste</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExtractFromUrl()}
                  disabled={isLoading || !urlInput.trim()}
                  className="px-4 py-2 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Items
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CART SCREENSHOT & PHOTO (VISION AI) */}
          {activeTab === 'photo' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                    Upload or Paste Photo / Cart Screenshot
                  </label>
                  <span className="text-[10px] text-[#767670] font-mono">
                    Vision AI extracts items, £ GBP prices, brand names, and colors
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs rounded-xs"
                    title="Paste copied screenshot or image from clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste from Clipboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-[#4A4A45] text-xs font-mono flex items-center gap-1.5 cursor-pointer rounded-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Browse File</span>
                  </button>
                </div>
              </div>

              {/* Targeted Photo Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTabDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTabDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTabDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processImageFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed p-6 text-center transition-all ${
                  isTabDragging
                    ? 'border-[#8C7355] bg-amber-50/70 ring-2 ring-[#8C7355]/30'
                    : 'border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#F2F1ED] hover:border-[#8C7355]'
                }`}
              >
                {uploadedImageBase64 ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-40 w-56 bg-white border border-[#E5E5E1] p-1.5 flex items-center justify-center shadow-xs">
                      <img
                        src={uploadedImageBase64}
                        alt="Uploaded preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExtractFromImage(uploadedImageBase64)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Re-Analyze with Vision AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="px-3 py-1.5 bg-white border border-[#D5D5D0] hover:bg-[#F2F1ED] text-xs font-mono text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-[#8C7355]" />
                        <span>Paste New</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-[#D5D5D0] hover:bg-[#F2F1ED] text-xs font-mono text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#8C7355]" />
                        <span>Choose File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadedImageBase64(null)}
                        className="px-2.5 py-1.5 text-xs text-[#767670] hover:text-rose-600 font-mono cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="space-y-2.5 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-white border border-[#E5E5E1] flex items-center justify-center mx-auto text-[#8C7355] shadow-xs rounded-lg">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#1A1A1A] block">
                        Drop shopping basket screenshot or clothing photo here
                      </span>
                      <span className="text-[11px] text-[#767670] block font-mono mt-0.5">
                        Or click to browse from device • Press <kbd className="px-1.5 py-0.5 bg-white border border-[#D5D5D0] text-[#1A1A1A] font-semibold text-[10px] rounded">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-white border border-[#D5D5D0] text-[#1A1A1A] font-semibold text-[10px] rounded">⌘V</kbd> to paste
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Image Web URL Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="url"
                  placeholder="Or paste direct image URL (https://...)"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && photoUrlInput.trim()) {
                      setUploadedImageBase64(photoUrlInput.trim());
                      handleExtractFromImage(photoUrlInput.trim());
                    }
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355] font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (photoUrlInput.trim()) {
                      setUploadedImageBase64(photoUrlInput.trim());
                      handleExtractFromImage(photoUrlInput.trim());
                    }
                  }}
                  disabled={!photoUrlInput.trim() || isLoading}
                  className="px-3 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] disabled:opacity-50 text-[#4A4A45] border border-[#D5D5D0] text-xs font-mono cursor-pointer shrink-0"
                >
                  Load &amp; Analyze
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TEXT / INVOICE / BASKET LIST */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                Paste Shopping Cart Summary, Order Email, or Item Descriptions
              </label>
              <textarea
                rows={4}
                placeholder="Paste order confirmation email or shopping bag text, e.g.:
1. Barbour Classic Beaufort Wax Jacket in Sage Olive, £299
2. Arket Heavy-Weight Relaxed T-Shirt in Navy, £35
3. Grenson Brady Leather Hiking Boots in Black, £325..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355] font-sans"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExtractFromText}
                  disabled={isLoading || !textInput.trim()}
                  className="px-4 py-2 bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing Basket...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Separate Items
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: VINTED SYNC & WORKER INTEGRATION */}
          {activeTab === 'vinted' && (
            <div className="space-y-4">
              {/* Hidden File Input for Vinted files */}
              <input
                ref={vintedFileInputRef}
                type="file"
                accept=".html,.htm,.pdf,.txt,.json"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processVintedFiles(e.target.files);
                  }
                }}
              />

              {/* Sub-tab Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E1] pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVintedSubTab('scrape')}
                    className={`px-3 py-1.5 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      vintedSubTab === 'scrape'
                        ? 'bg-[#007782] text-white shadow-xs'
                        : 'bg-[#F8F7F4] text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#ECEBE8]'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Scrape Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVintedSubTab('sync')}
                    className={`px-3 py-1.5 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      vintedSubTab === 'sync'
                        ? 'bg-[#007782] text-white shadow-xs'
                        : 'bg-[#F8F7F4] text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#ECEBE8]'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Live Account Sync</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVintedSubTab('urls')}
                    className={`px-3 py-1.5 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      vintedSubTab === 'urls'
                        ? 'bg-[#007782] text-white shadow-xs'
                        : 'bg-[#F8F7F4] text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#ECEBE8]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Batch Vinted URLs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVintedSubTab('files')}
                    className={`px-3 py-1.5 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      vintedSubTab === 'files'
                        ? 'bg-[#007782] text-white shadow-xs'
                        : 'bg-[#F8F7F4] text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#ECEBE8]'
                    }`}
                  >
                    <Files className="w-3.5 h-3.5" />
                    <span>HTML &amp; PDF Files</span>
                  </button>
                </div>

                {/* Worker status pill and quick toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#5A5A55]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        settings.vintedWorkerAuth?.workerEndpoint ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {settings.vintedWorkerAuth?.workerEndpoint ? 'Worker Configured' : 'Worker Setup Required'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickWorkerConfig((prev) => !prev)}
                    className="px-2 py-1 border border-[#D5D5D0] bg-white hover:bg-[#F8F7F4] text-[10px] font-mono text-[#1A1A1A] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3 h-3 text-[#007782]" />
                    <span>{showQuickWorkerConfig ? 'Hide Config' : 'Worker Config'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Worker Configuration Drawer */}
              {showQuickWorkerConfig && (
                <div className="p-4 bg-[#F0F8F8] border border-[#BCE4E6] space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-[#004A52] flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#007782]" />
                        Cloudflare Worker &amp; Vinted Credentials
                      </h4>
                      <p className="text-[11px] text-[#00606A] font-sans mt-0.5">
                        Connects to your custom Cloudflare Worker to bypass CORS and Cloudflare bot challenges when syncing orders or scraping listings.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickWorkerConfig(false)}
                      className="p-1 text-[#00606A] hover:text-[#004A52] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-semibold text-[#004A52] uppercase">
                        Worker Endpoint URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://vinted-proxy.your-subdomain.workers.dev"
                        value={quickWorkerUrl}
                        onChange={(e) => setQuickWorkerUrl(e.target.value)}
                        className="w-full p-2 bg-white border border-[#BCE4E6] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#004A52] uppercase">
                        Vinted Domain
                      </label>
                      <input
                        type="text"
                        placeholder="co.uk, fr, de, com"
                        value={quickDomain}
                        onChange={(e) => setQuickDomain(e.target.value)}
                        className="w-full p-2 bg-white border border-[#BCE4E6] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#004A52] uppercase">
                        Access Token (Bearer)
                      </label>
                      <input
                        type="password"
                        placeholder="Optional if using cookie"
                        value={quickAccessToken}
                        onChange={(e) => setQuickAccessToken(e.target.value)}
                        className="w-full p-2 bg-white border border-[#BCE4E6] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#004A52] uppercase">
                        CSRF Token
                      </label>
                      <input
                        type="password"
                        placeholder="X-CSRF-Token"
                        value={quickCsrfToken}
                        onChange={(e) => setQuickCsrfToken(e.target.value)}
                        className="w-full p-2 bg-white border border-[#BCE4E6] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#004A52] uppercase">
                        Vinted Session Cookie (_vinted_fr_session)
                      </label>
                      <input
                        type="password"
                        placeholder="_vinted_fr_session=..."
                        value={quickCookie}
                        onChange={(e) => setQuickCookie(e.target.value)}
                        className="w-full p-2 bg-white border border-[#BCE4E6] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                      />
                    </div>
                  </div>

                  {quickTestResult && (
                    <div
                      className={`p-2.5 text-xs font-mono border ${
                        quickTestResult.success
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-rose-50 border-rose-300 text-rose-900'
                      }`}
                    >
                      {quickTestResult.message}
                    </div>
                  )}

                  {quickSaveMessage && (
                    <div className="p-2 text-xs font-mono bg-emerald-50 border border-emerald-300 text-emerald-800">
                      {quickSaveMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleQuickTestWorker}
                      disabled={quickTestingWorker || !quickWorkerUrl.trim()}
                      className="px-3 py-1.5 bg-white border border-[#007782] text-[#007782] hover:bg-teal-50 text-xs font-mono font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {quickTestingWorker ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Testing Worker...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Test Worker Ping
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickSaveWorkerConfig}
                      className="px-4 py-1.5 bg-[#007782] hover:bg-[#005E67] text-white text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Credentials
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB 0: SCRAPE VINTED ACCOUNT LISTINGS */}
              {vintedSubTab === 'scrape' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#F0F8F8] border border-[#BCE4E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 bg-[#007782] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-serif font-bold text-[#004A52]">
                          Scrape Vinted Account Listings
                        </h3>
                        <p className="text-[11px] text-[#00606A] font-sans mt-0.5 leading-relaxed">
                          Extract all items from any Vinted closet or profile URL. Items are tagged automatically with lifecycle tags (<strong>Bought</strong>, <strong>Sold</strong>, <strong>Listed</strong>, <strong>Cancelled</strong>) and ready for your Wardrobe, Resale Hub, or Shopping Wishlist.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scraped User Profile Pill (if any) */}
                  {scrapedUserData && (
                    <div className="p-3 bg-white border border-[#007782]/30 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        {scrapedUserData.photo ? (
                          <img
                            src={scrapedUserData.photo}
                            alt={scrapedUserData.username || 'User'}
                            className="w-10 h-10 rounded-full object-cover border border-[#E5E5E1]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#007782]/10 text-[#007782] flex items-center justify-center font-bold font-mono">
                            {(scrapedUserData.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1.5">
                            <span>@{scrapedUserData.username || 'vinted-user'}</span>
                            {scrapedUserData.id && (
                              <span className="text-[10px] text-[#767670] font-normal">ID: {scrapedUserData.id}</span>
                            )}
                          </div>
                          {scrapedUserData.itemsCount !== undefined && (
                            <div className="text-[11px] text-[#5A5A55]">
                              {scrapedUserData.itemsCount} active closet items
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-teal-50 text-[#007782] border border-[#BCE4E6] uppercase tracking-wider">
                        Active Profile
                      </span>
                    </div>
                  )}

                  {/* Connected Session Shortcut Banner (Bypasses Cloudflare) */}
                  {Boolean(
                    settings.vintedWorkerAuth?.accessToken ||
                    settings.vintedWorkerAuth?.cookie ||
                    settings.vintedWorkerAuth?.workerEndpoint
                  ) && (
                    <div className="p-3 bg-teal-50 border border-[#007782]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                      <div className="flex items-start sm:items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#007782] shrink-0 mt-0.5 sm:mt-0" />
                        <div>
                          <span className="font-semibold text-[#004A52]">Connected Vinted Session Ready: </span>
                          <span className="text-[#00606A]">
                            Scrape your active closet listings directly via your authenticated session to 100% bypass Cloudflare challenges.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVintedSubTab('sync');
                          setVintedSyncType('active');
                        }}
                        className="px-3 py-1.5 text-xs font-mono font-semibold bg-[#007782] text-white hover:bg-[#005E67] shrink-0 cursor-pointer transition-colors shadow-xs"
                      >
                        Scrape Active via Session →
                      </button>
                    </div>
                  )}

                  {/* Input Form */}
                  <div className="p-3.5 bg-[#FAF9F7] border border-[#E5E5E1] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                        Vinted Account / Member URL or Username
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#767670] font-mono">Domain:</span>
                        <select
                          value={vintedAccountDomain}
                          onChange={(e) => setVintedAccountDomain(e.target.value)}
                          className="text-xs font-mono bg-white border border-[#D5D5D0] px-2 py-1 text-[#1A1A1A] focus:border-[#007782] focus:outline-none"
                        >
                          <option value="co.uk">vinted.co.uk (UK £)</option>
                          <option value="fr">vinted.fr (France €)</option>
                          <option value="de">vinted.de (Germany €)</option>
                          <option value="it">vinted.it (Italy €)</option>
                          <option value="es">vinted.es (Spain €)</option>
                          <option value="com">vinted.com (US $)</option>
                          <option value="nl">vinted.nl (Netherlands €)</option>
                          <option value="be">vinted.be (Belgium €)</option>
                          <option value="pl">vinted.pl (Poland zł)</option>
                        </select>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={vintedAccountInput}
                        onChange={(e) => setVintedAccountInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isLoading) {
                            e.preventDefault();
                            handleScrapeAccountListings();
                          }
                        }}
                        placeholder="e.g. https://www.vinted.co.uk/member/12345678-username or @username"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D5D5D0] text-[#1A1A1A] placeholder-[#9A9A90] focus:border-[#007782] focus:outline-none pr-24"
                      />
                      {vintedAccountInput && (
                        <button
                          type="button"
                          onClick={() => setVintedAccountInput('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#767670] hover:text-[#1A1A1A]"
                          title="Clear input"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#767670]">
                      <span>Formats accepted: Full profile URL, member ID, or @username</span>
                      <button
                        type="button"
                        onClick={() => setShowAccountHtmlPaste(!showAccountHtmlPaste)}
                        className="text-[#007782] hover:underline font-mono cursor-pointer flex items-center gap-1"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>{showAccountHtmlPaste ? 'Hide HTML paste' : 'Paste Page HTML (Bypass Cloudflare)'}</span>
                      </button>
                    </div>

                    {showAccountHtmlPaste && (
                      <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#5A5A55]">
                          <span>Account Page HTML Source (Direct or Saved Page)</span>
                          <span className="text-[10px] text-[#767670]">Paste right-click &gt; View Page Source</span>
                        </div>
                        <textarea
                          rows={4}
                          value={vintedAccountHtml}
                          onChange={(e) => setVintedAccountHtml(e.target.value)}
                          placeholder="<!DOCTYPE html><html>... Paste Vinted member profile HTML here to parse without cloudflare blocks ..."
                          className="w-full p-2 text-xs font-mono bg-white border border-[#D5D5D0] text-[#1A1A1A] focus:border-[#007782] focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Status Filter Selection */}
                    <div className="pt-2 border-t border-[#E5E5E1] space-y-1.5">
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                        Item Filter
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setVintedAccountFilter('all')}
                          className={`p-2 border text-center cursor-pointer transition-colors ${
                            vintedAccountFilter === 'all'
                              ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                              : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                          }`}
                        >
                          <div className="text-xs font-mono">All Listings</div>
                          <div className="text-[10px] text-[#767670]">Active + Sold</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVintedAccountFilter('listed')}
                          className={`p-2 border text-center cursor-pointer transition-colors ${
                            vintedAccountFilter === 'listed'
                              ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                              : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                          }`}
                        >
                          <div className="text-xs font-mono">Listed Only</div>
                          <div className="text-[10px] text-[#767670]">Tag: Listed</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVintedAccountFilter('sold')}
                          className={`p-2 border text-center cursor-pointer transition-colors ${
                            vintedAccountFilter === 'sold'
                              ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                              : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                          }`}
                        >
                          <div className="text-xs font-mono">Sold Only</div>
                          <div className="text-[10px] text-[#767670]">Tag: Sold</div>
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs font-mono text-[#767670]">
                        {vintedAccountProgress ? (
                          <span className="text-[#007782] flex items-center gap-1.5 font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {vintedAccountProgress}
                          </span>
                        ) : (
                          <span>Items will be automatically tagged: Bought, Sold, Listed, Cancelled</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleScrapeAccountListings()}
                        disabled={isLoading || (!vintedAccountInput.trim() && !vintedAccountHtml.trim())}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#007782] hover:bg-[#005E67] text-white text-xs font-mono font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Scraping Account...</span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            <span>Scrape Account Listings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 1: LIVE ACCOUNT SYNC */}
              {vintedSubTab === 'sync' && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#F0F8F8] border border-[#BCE4E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 bg-[#007782] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-serif font-bold text-[#004A52]">
                          Live Vinted Account Sync (Cloudflare Worker)
                        </h3>
                        <p className="text-[11px] text-[#00606A] font-sans mt-0.5 leading-relaxed">
                          Fetches your active purchases and completed sales directly from Vinted. Automatically skips duplicate transactions, creates a rollback checkpoint in Version History, and auto-routes purchases into your Wardrobe and sales into your Resale Hub.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sync Filter Selection */}
                  <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1] space-y-2">
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                      Select Transactions to Sync
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setVintedSyncType('all')}
                        className={`p-2.5 border text-left cursor-pointer transition-colors ${
                          vintedSyncType === 'all'
                            ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                            : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                        }`}
                      >
                        <div className="text-xs font-mono">All Activity</div>
                        <div className="text-[10px] text-[#767670] mt-0.5">Purchases, Sold &amp; Active items</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVintedSyncType('purchased')}
                        className={`p-2.5 border text-left cursor-pointer transition-colors ${
                          vintedSyncType === 'purchased'
                            ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                            : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                        }`}
                      >
                        <div className="text-xs font-mono">Purchased Only</div>
                        <div className="text-[10px] text-[#767670] mt-0.5">Import into Wardrobe or Wishlist</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVintedSyncType('sold')}
                        className={`p-2.5 border text-left cursor-pointer transition-colors ${
                          vintedSyncType === 'sold'
                            ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                            : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                        }`}
                      >
                        <div className="text-xs font-mono">Sold Listings Only</div>
                        <div className="text-[10px] text-[#767670] mt-0.5">Import into Resale Hub as Sold</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVintedSyncType('active')}
                        className={`p-2.5 border text-left cursor-pointer transition-colors ${
                          vintedSyncType === 'active'
                            ? 'bg-[#007782]/10 border-[#007782] text-[#007782] font-semibold'
                            : 'bg-white border-[#D5D5D0] text-[#1A1A1A] hover:border-[#007782]/50'
                        }`}
                      >
                        <div className="text-xs font-mono flex items-center justify-between">
                          <span>Active Listings</span>
                          <span className="text-[9px] px-1 py-0.2 bg-teal-100 text-[#007782] font-bold">Session</span>
                        </div>
                        <div className="text-[10px] text-[#767670] mt-0.5">Scrapes live closet (Bypasses Cloudflare)</div>
                      </button>
                    </div>
                  </div>

                  {/* Sync Progress Banner */}
                  {vintedSyncProgress && (
                    <div className="p-3 bg-teal-50 border border-teal-300 text-teal-900 text-xs font-mono flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#007782]" />
                      <span>{vintedSyncProgress}</span>
                    </div>
                  )}

                  {/* Actions: Preview vs Direct Sync */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-[#767670] font-sans">
                      💡 Choose <strong>Preview Orders</strong> to inspect and edit items before importing, or <strong>Direct 1-Click Sync</strong> to immediately sync into your database.
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleSyncVintedOrders('preview')}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white border border-[#007782] text-[#007782] hover:bg-teal-50 disabled:opacity-50 text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Preview Orders
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncVintedOrders('direct')}
                        disabled={isLoading}
                        className="px-4 py-2 bg-[#007782] hover:bg-[#005E67] disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Direct 1-Click Sync
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: BATCH VINTED URLS */}
              {vintedSubTab === 'urls' && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#F0F8F8] border border-[#BCE4E6] flex items-start gap-2.5">
                    <div className="w-8 h-8 bg-[#007782] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-serif font-bold text-[#004A52]">
                        Batch Extract Public Vinted Listing URLs
                      </h3>
                      <p className="text-[11px] text-[#00606A] font-sans mt-0.5 leading-relaxed">
                        Paste links to any Vinted items (one per line). Your Cloudflare Worker will scrape each listing cleanly without triggering bot protections or CORS errors, extracting images, brand names, £ prices, categories, and descriptions.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider flex items-center justify-between">
                      <span>Vinted URLs (one per line)</span>
                      <span className="text-[10px] text-[#767670] lowercase">e.g. https://www.vinted.co.uk/items/543210-vintage-jacket</span>
                    </label>
                    <textarea
                      rows={5}
                      placeholder="https://www.vinted.co.uk/items/512345678-cos-wool-coat&#10;https://www.vinted.co.uk/items/512345679-acne-studios-scarf"
                      value={vintedBatchUrls}
                      onChange={(e) => setVintedBatchUrls(e.target.value)}
                      className="w-full p-3 bg-white border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#007782] leading-relaxed"
                    />
                  </div>

                  {/* Destination Selector for Batch URLs */}
                  <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] font-mono font-semibold uppercase text-[#5A5A55]">
                      Destination:
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="batchDest"
                          checked={globalDestination === 'wardrobe'}
                          onChange={() => setGlobalDestination('wardrobe')}
                          className="text-[#007782] focus:ring-[#007782]"
                        />
                        <span>Wardrobe (Owned)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="batchDest"
                          checked={globalDestination === 'shopping'}
                          onChange={() => setGlobalDestination('shopping')}
                          className="text-[#007782] focus:ring-[#007782]"
                        />
                        <span>Shopping (Wishlist)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="batchDest"
                          checked={globalDestination === 'selling'}
                          onChange={() => setGlobalDestination('selling')}
                          className="text-[#007782] focus:ring-[#007782]"
                        />
                        <span>Resale (Selling)</span>
                      </label>
                    </div>
                  </div>

                  {vintedBatchProgress && (
                    <div className="p-3 bg-teal-50 border border-teal-300 text-teal-900 text-xs font-mono flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#007782]" />
                      <span>{vintedBatchProgress}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleBatchExtractVintedUrls}
                      disabled={isLoading || !vintedBatchUrls.trim()}
                      className="px-5 py-2.5 bg-[#007782] hover:bg-[#005E67] disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Extracting Listings via Worker...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Extract Garments from URLs
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: HTML EXPORTS & PDF INVOICES */}
              {vintedSubTab === 'files' && (
                <div className="space-y-4">
                  {/* Informative Header Banner */}
                  <div className="p-3 bg-[#F0F8F8] border border-[#BCE4E6] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 bg-[#007782] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FolderUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-serif font-bold text-[#004A52]">
                          Import Vinted Active Listings, HTML Exports &amp; Invoices (PDF)
                        </h3>
                        <p className="text-[11px] text-[#00606A] font-sans mt-0.5">
                          Upload your active Vinted listing pages saved as HTML, downloaded export files (<code className="bg-white/80 px-1 py-0.5 border border-[#BCE4E6] text-[10px] font-mono">items.html</code>, <code className="bg-white/80 px-1 py-0.5 border border-[#BCE4E6] text-[10px] font-mono">sales.html</code>, <code className="bg-white/80 px-1 py-0.5 border border-[#BCE4E6] text-[10px] font-mono">purchases.html</code>), or PDF transaction invoices.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => vintedFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#007782] hover:bg-[#005E67] text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Browse Files
                      </button>
                    </div>
                  </div>

                  {/* Dedicated Drag & Drop Zone for Vinted HTML / PDFs */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsVintedDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsVintedDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsVintedDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processVintedFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => vintedFileInputRef.current?.click()}
                    className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                      isVintedDragging
                        ? 'border-[#007782] bg-teal-50/80 scale-[0.99]'
                        : 'border-[#007782]/40 bg-[#FAF9F7] hover:bg-teal-50/30 hover:border-[#007782]'
                    }`}
                  >
                    <div className="w-10 h-10 bg-white border border-[#BCE4E6] text-[#007782] flex items-center justify-center mx-auto mb-2 shadow-xs">
                      <Files className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-mono font-semibold text-[#004A52] mb-1">
                      Drag &amp; Drop Vinted HTML or PDF Files Here
                    </div>
                    <p className="text-[11px] text-[#767670] max-w-md mx-auto">
                      Supports multiple files simultaneously. Automatically extracts product titles, designer brands, £ GBP purchase prices, garment categories, order dates, and condition.
                    </p>
                  </div>

                  {/* Staged Files List */}
                  {vintedFiles.length > 0 && (
                    <div className="space-y-2 bg-[#F8F7F4] border border-[#E5E5E1] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                          Staged Vinted Files ({vintedFiles.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setVintedFiles([])}
                          className="text-[10px] font-mono text-rose-700 hover:text-rose-900 cursor-pointer"
                        >
                          Remove All
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {vintedFiles.map((vf) => (
                          <div
                            key={vf.id}
                            className="bg-white border border-[#D5D5D0] p-2 flex items-center justify-between text-xs font-mono shadow-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {vf.type === 'pdf' ? (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold uppercase shrink-0">
                                  PDF
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[9px] font-bold uppercase shrink-0">
                                  HTML
                                </span>
                              )}
                              <span className="truncate text-[#1A1A1A] font-medium" title={vf.name}>
                                {vf.name}
                              </span>
                              <span className="text-[10px] text-[#767670] shrink-0">
                                ({(vf.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {vf.isLoaded ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveVintedFile(vf.id);
                                }}
                                className="p-1 text-[#767670] hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Import Options & Destination Controls */}
                  <div className="bg-[#FAF9F7] border border-[#E5E5E1] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                        Import Destination &amp; Status
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-[#1A1A1A] cursor-pointer">
                          <input
                            type="radio"
                            name="vintedDest"
                            checked={globalDestination === 'selling'}
                            onChange={() => setGlobalDestination('selling')}
                            className="text-[#007782] focus:ring-[#007782]"
                          />
                          <span className="font-medium text-[#007782]">Import into Sales &amp; Resale (Listings)</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-xs text-[#1A1A1A] cursor-pointer">
                          <input
                            type="radio"
                            name="vintedDest"
                            checked={globalDestination === 'shopping'}
                            onChange={() => setGlobalDestination('shopping')}
                            className="text-[#007782] focus:ring-[#007782]"
                          />
                          <span>Import into Shopping Section</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-xs text-[#1A1A1A] cursor-pointer">
                          <input
                            type="radio"
                            name="vintedDest"
                            checked={globalDestination === 'wardrobe'}
                            onChange={() => setGlobalDestination('wardrobe')}
                            className="text-[#007782] focus:ring-[#007782]"
                          />
                          <span>Import into Wardrobe (Owned)</span>
                        </label>
                      </div>
                    </div>

                    {globalDestination === 'selling' && (
                      <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#E5E5E1] pt-2 sm:pt-0 sm:pl-3">
                        <div className="text-[10px] font-mono text-[#767670]">Initial Listing Status:</div>
                        <div className="inline-flex border border-[#D5D5D0] p-0.5 bg-white text-xs">
                          <button
                            type="button"
                            onClick={() => setVintedSellingStatus('Listed')}
                            className={`px-2 py-0.5 cursor-pointer transition-colors ${
                              vintedSellingStatus === 'Listed'
                                ? 'bg-[#007782] text-white font-semibold'
                                : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                            }`}
                          >
                            Active (Listed)
                          </button>
                          <button
                            type="button"
                            onClick={() => setVintedSellingStatus('Sold')}
                            className={`px-2 py-0.5 cursor-pointer transition-colors ${
                              vintedSellingStatus === 'Sold'
                                ? 'bg-[#007782] text-white font-semibold'
                                : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                            }`}
                          >
                            Sold
                          </button>
                          <button
                            type="button"
                            onClick={() => setVintedSellingStatus('Draft')}
                            className={`px-2 py-0.5 cursor-pointer transition-colors ${
                              vintedSellingStatus === 'Draft'
                                ? 'bg-[#007782] text-white font-semibold'
                                : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                            }`}
                          >
                            Draft
                          </button>
                        </div>
                      </div>
                    )}

                    {globalDestination === 'shopping' && (
                      <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#E5E5E1] pt-2 sm:pt-0 sm:pl-3">
                        <div className="text-[10px] font-mono text-[#767670]">Initial Item Status:</div>
                        <div className="inline-flex border border-[#D5D5D0] p-0.5 bg-white text-xs">
                          <button
                            type="button"
                            onClick={() => setVintedShoppingStatus('Purchased')}
                            className={`px-2 py-0.5 cursor-pointer transition-colors ${
                              vintedShoppingStatus === 'Purchased'
                                ? 'bg-[#007782] text-white font-semibold'
                                : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                            }`}
                          >
                            Purchased (£ Paid)
                          </button>
                          <button
                            type="button"
                            onClick={() => setVintedShoppingStatus('To Buy')}
                            className={`px-2 py-0.5 cursor-pointer transition-colors ${
                              vintedShoppingStatus === 'To Buy'
                                ? 'bg-[#007782] text-white font-semibold'
                                : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                            }`}
                          >
                            To Buy (Wishlist)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional Paste Fallback */}
                  <details className="text-xs font-mono text-[#5A5A55]">
                    <summary className="cursor-pointer hover:text-[#1A1A1A] select-none py-1">
                      ▸ Or paste raw Vinted HTML / table code directly
                    </summary>
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={3}
                        placeholder="Paste raw Vinted HTML source code or table snippet here..."
                        value={vintedRawInput}
                        onChange={(e) => setVintedRawInput(e.target.value)}
                        className="w-full p-2 bg-white border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                      />
                    </div>
                  </details>

                  {/* Extract Trigger Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleExtractFromVinted}
                      disabled={isLoading || (vintedFiles.length === 0 && !vintedRawInput.trim())}
                      className="px-5 py-2.5 bg-[#007782] hover:bg-[#005E67] disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Parsing Vinted Data &amp; Receipts...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Extract Vinted Garments ({vintedFiles.length} file{vintedFiles.length !== 1 ? 's' : ''})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading Animation State */}
          {isLoading && (
            <div className="p-8 border border-[#E5E5E1] bg-[#F8F7F4] text-center space-y-2.5 animate-in fade-in">
              <Loader2 className="w-7 h-7 text-[#8C7355] animate-spin mx-auto" />
              <div className="font-serif text-sm font-semibold text-[#1A1A1A]">
                Analyzing &amp; Splitting Items into Separate Listings...
              </div>
              <p className="text-xs text-[#767670] max-w-md mx-auto font-sans">
                Scanning brand names, individual garment categories, £ GBP prices, color palettes, and retrieving high-resolution garment imagery.
              </p>
            </div>
          )}

          {/* ERROR NOTICE & DRAG-AND-DROP RECOVERY ZONE */}
          {error && !isLoading && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Some online retailers protect or block automated web scrapers. You can immediately drag &amp; drop a screenshot or product image below to extract with Vision AI instead.
                  </p>
                  {Boolean(
                    settings.vintedWorkerAuth?.accessToken ||
                    settings.vintedWorkerAuth?.cookie ||
                    settings.vintedWorkerAuth?.workerEndpoint
                  ) && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#004A52] font-mono">
                        ⚡ Connected Vinted session available
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setActiveTab('vinted');
                          setVintedSubTab('sync');
                          setVintedSyncType('active');
                        }}
                        className="px-2.5 py-1 bg-[#007782] text-white hover:bg-[#005E67] text-[11px] font-mono font-semibold transition cursor-pointer shadow-2xs"
                      >
                        Scrape Active Listings via Session (Bypasses Cloudflare) →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicated Drag & Drop Fallback Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTabDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTabDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTabDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processImageFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  isTabDragging
                    ? 'border-[#8C7355] bg-amber-50/70'
                    : 'border-[#8C7355]/40 bg-[#F8F7F4] hover:bg-amber-50/30 hover:border-[#8C7355]'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-[#8C7355] font-semibold text-xs mb-1">
                  <Camera className="w-4 h-4" />
                  <span>Drop Screenshot or Garment Image to Recover via Vision AI</span>
                </div>
                <p className="text-[11px] text-[#767670] font-mono">
                  Drag &amp; drop here, or click to choose an image from your computer (PNG, JPG, WebP)
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {saveSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* EXTRACTED ITEMS & SHOPPING BASKET REVIEW */}
          {extractedItems.length > 0 && !isLoading && (
            <div className="space-y-4 animate-in fade-in">
              {/* Basket Summary Control Bar */}
              <div className="bg-[#F8F7F4] border border-[#E5E5E1] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#1A1A1A]">
                        {extractedItems.length > 1
                          ? `Shopping Basket (${extractedItems.length} Items Found)`
                          : `Garment Extracted (1 Item)`}
                      </span>
                      {basketSummary?.retailerName && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-[#E5E5E1] text-[#5A5A55]">
                          {basketSummary.retailerName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#767670] font-mono">
                      Selected: {selectedCount} of {extractedItems.length} items • Subtotal:{' '}
                      <strong className="text-[#1A1A1A]">£{selectedTotalPrice.toFixed(2)} GBP</strong>
                    </p>
                  </div>
                </div>

                {/* Bulk Destination Selector & Smart Auto-Route */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoRouteDestinations}
                    className="px-2.5 py-1 text-xs font-mono font-medium text-[#007782] bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Automatically scan tags and order details to route Sales to Resale and Purchases to Wardrobe"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#007782]" />
                    <span>Auto-Route by Type / Sale Tag</span>
                  </button>

                  <span className="text-[11px] font-mono text-[#5A5A55] ml-1">Set All To:</span>
                  <div className="inline-flex border border-[#D5D5D0] p-0.5 bg-white shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleSetAllDestination('selling')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        globalDestination === 'selling'
                          ? 'bg-[#007782] text-white font-semibold'
                          : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      Sales &amp; Resale
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllDestination('wardrobe')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        globalDestination === 'wardrobe'
                          ? 'bg-[#8C7355] text-white font-semibold'
                          : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      Wardrobe (Owned)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllDestination('shopping')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        globalDestination === 'shopping'
                          ? 'bg-[#8C7355] text-white font-semibold'
                          : 'text-[#5A5A55] hover:text-[#1A1A1A]'
                      }`}
                    >
                      <ShoppingBag className="w-3 h-3" />
                      Shopping Wishlist
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-2 py-1 text-[11px] font-mono text-[#5A5A55] hover:text-[#1A1A1A] border border-[#D5D5D0] bg-white hover:bg-[#F2F1ED] cursor-pointer"
                  >
                    {extractedItems.every((it) => it.selectedForImport) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Smart Routing Insight Bar */}
              {extractedItems.some((it) => it.destination === 'selling' || isSaleItem(it)) && (
                <div className="px-3.5 py-2 bg-teal-50/80 border border-teal-200/90 text-[11px] font-mono text-[#00606B] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#007782] shrink-0" />
                    <span>
                      <strong>Smart Sale Detection:</strong> {extractedItems.filter((it) => it.destination === 'selling').length} item(s) tagged or detected as Sales (routed to Resale) • {extractedItems.filter((it) => it.destination === 'wardrobe').length} to Wardrobe • {extractedItems.filter((it) => it.destination === 'shopping').length} to Wishlist
                    </span>
                  </div>
                  <span className="text-[10px] text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
                    Auto-categorized by Vinted metadata
                  </span>
                </div>
              )}

              {/* Notice for Per-Item Drag & Drop */}
              <div className="px-3 py-2 bg-amber-50/60 border border-amber-200/80 text-[11px] font-mono text-[#8C7355] flex items-center justify-between">
                <span>Tip: Drag &amp; drop an image onto any garment photo box below to replace its picture or re-extract details.</span>
              </div>

              {/* Lifecycle Tag Filter Bar */}
              <div className="bg-[#FAF9F7] border border-[#E5E5E1] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[#007782]" />
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5A5A55]">
                    Filter by Tag:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['all', 'Bought', 'Sold', 'Listed', 'Cancelled'] as const).map((filter) => {
                      const count =
                        filter === 'all'
                          ? extractedItems.length
                          : extractedItems.filter((it) => (it.tags || []).includes(filter)).length;
                      const isSelected = previewTagFilter === filter;
                      const tagColors = filter !== 'all' ? getLifecycleTagColor(filter) : null;

                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setPreviewTagFilter(filter)}
                          className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 rounded-xs ${
                            isSelected
                              ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                              : 'bg-white border border-[#D5D5D0] text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#F2F1ED]'
                          }`}
                        >
                          {filter !== 'all' && tagColors && (
                            <span className={`w-2 h-2 rounded-full ${tagColors.dot}`} />
                          )}
                          <span>{filter === 'all' ? 'All Items' : filter}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#767670]'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {previewTagFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setPreviewTagFilter('all')}
                    className="text-[10px] font-mono text-[#007782] hover:underline cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Items List - Each item as a separate listing candidate */}
              <div className="space-y-3">
                {extractedItems
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ item }) => previewTagFilter === 'all' || (item.tags || []).includes(previewTagFilter))
                  .map(({ item, idx }) => {
                  const isCardDragging = draggingCardIdx === idx;
                  return (
                    <div
                      key={item.id || idx}
                      className={`border transition-all p-3.5 ${
                        item.selectedForImport
                          ? 'border-[#8C7355] bg-white shadow-xs'
                          : 'border-[#E5E5E1] bg-[#FAFAF8] opacity-75'
                      }`}
                    >
                      {/* Hidden File Input for this specific item card */}
                      <input
                        ref={(el) => {
                          cardFileInputRefs.current[idx] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleReplaceCardPhoto(idx, e.target.files[0]);
                          }
                        }}
                      />

                      {/* Item Card Header */}
                      <div className="flex items-center justify-between border-b border-[#E5E5E1] pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectItem(idx)}
                            className="cursor-pointer text-[#8C7355] hover:text-[#735D43]"
                          >
                            {item.selectedForImport ? (
                              <CheckSquare className="w-4 h-4 text-[#8C7355]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#A5A59E]" />
                            )}
                          </button>
                          <span className="text-xs font-mono font-semibold text-[#1A1A1A]">
                            Item #{idx + 1}: {item.brand} {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Destination toggle for this item */}
                          <div className="inline-flex border border-[#E5E5E1] p-0.5 bg-[#F2F1ED] text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemField(idx, 'destination', 'wardrobe')}
                              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                                item.destination === 'wardrobe'
                                  ? 'bg-[#8C7355] text-white font-semibold shadow-xs'
                                  : 'text-[#767670] hover:text-[#1A1A1A]'
                              }`}
                            >
                              Wardrobe
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemField(idx, 'destination', 'shopping')}
                              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                                item.destination === 'shopping'
                                  ? 'bg-[#8C7355] text-white font-semibold shadow-xs'
                                  : 'text-[#767670] hover:text-[#1A1A1A]'
                              }`}
                            >
                              Wishlist
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemField(idx, 'destination', 'selling')}
                              className={`px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${
                                item.destination === 'selling'
                                  ? 'bg-[#007782] text-white font-semibold shadow-xs'
                                  : 'text-[#767670] hover:text-[#007782]'
                              }`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              Resale / Sales
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromList(idx)}
                            className="p-1 text-[#A5A59E] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Remove from extraction list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Body: Full uncropped photo + responsive fields */}
                      <div className="flex flex-col sm:flex-row gap-3.5">
                        {/* Photo Container with Card-Specific Drag & Drop */}
                        <div className="w-full sm:w-40 shrink-0 space-y-1.5">
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingCardIdx(idx);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingCardIdx(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingCardIdx(null);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleReplaceCardPhoto(idx, e.dataTransfer.files[0]);
                              }
                            }}
                            className={`h-36 sm:h-40 w-full bg-[#F8F7F4] border flex items-center justify-center p-2 relative overflow-hidden group transition-all ${
                              isCardDragging
                                ? 'border-[#8C7355] ring-2 ring-[#8C7355] bg-amber-50'
                                : 'border-[#E5E5E1]'
                            }`}
                          >
                            <GarmentImage
                              src={item.imageUrl}
                              alt={item.name}
                              category={item.category}
                              className="max-h-full max-w-full object-contain"
                              containerClassName="w-full h-full flex items-center justify-center bg-[#F8F7F4] relative"
                              showPlaceholderLabel={true}
                            />

                            {/* Drop Overlay or Hover Upload Button */}
                            {isCardDragging ? (
                              <div className="absolute inset-0 bg-[#8C7355]/85 flex flex-col items-center justify-center text-white text-center p-2 animate-in fade-in">
                                <Upload className="w-5 h-5 mb-1 animate-bounce" />
                                <span className="text-[10px] font-mono font-bold uppercase">Drop to Replace</span>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-white">
                                <button
                                  type="button"
                                  onClick={() => handlePasteCardPhoto(idx)}
                                  className="w-full px-2 py-1 bg-[#8C7355] text-white text-[10px] font-mono font-semibold flex items-center justify-center gap-1 shadow-sm hover:bg-[#735D43] cursor-pointer"
                                  title="Paste photo from clipboard"
                                >
                                  <ClipboardPaste className="w-3 h-3" />
                                  <span>Paste Image</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cardFileInputRefs.current[idx]?.click()}
                                  className="w-full px-2 py-1 bg-white text-[#1A1A1A] text-[10px] font-mono font-semibold flex items-center justify-center gap-1 shadow-sm hover:bg-[#F2F1ED] cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-[#8C7355]" />
                                  <span>Browse File</span>
                                </button>
                                <span className="text-[9px] font-mono text-white/80">or drag image directly here</span>
                              </div>
                            )}
                          </div>

                          {/* Alternate Candidate Photos if multiple available */}
                          {item.allCandidateImages && item.allCandidateImages.length > 1 && (
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                              {item.allCandidateImages.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Candidate ${i + 1}`}
                                  referrerPolicy="no-referrer"
                                  onClick={() => handleUpdateItemField(idx, 'imageUrl', img)}
                                  className={`w-7 h-7 object-contain bg-[#F8F7F4] border p-0.5 cursor-pointer transition-all ${
                                    item.imageUrl === img
                                      ? 'border-[#8C7355] ring-2 ring-[#8C7355]/30'
                                      : 'border-[#E5E5E1] opacity-70 hover:opacity-100'
                                  }`}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex gap-1">
                            <input
                              type="url"
                              placeholder="Image URL"
                              value={item.imageUrl || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'imageUrl', e.target.value)}
                              className="flex-1 text-[10px] px-1.5 py-1 bg-[#F8F7F4] border border-[#D5D5D0] text-[#5A5A55] focus:outline-none focus:border-[#8C7355]"
                              title="Image URL"
                            />
                            <button
                              type="button"
                              onClick={() => cardFileInputRefs.current[idx]?.click()}
                              className="px-1.5 py-1 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-[10px] text-[#4A4A45]"
                              title="Upload custom image file"
                            >
                              <Upload className="w-3 h-3 text-[#8C7355]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReanalyzeCard(idx)}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] text-[#8C7355]"
                              title="Re-extract fields from this image using Vision AI"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Fields Column */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Brand */}
                          <div>
                            <label className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                              Brand / Retailer
                            </label>
                            <input
                              type="text"
                              value={item.brand || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'brand', e.target.value)}
                              className="w-full px-2 py-1 border border-[#D5D5D0] bg-white text-xs font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                              placeholder="e.g. Barbour"
                            />
                          </div>

                          {/* Price */}
                          <div>
                            <label className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                              Price (£ GBP)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-xs text-[#8C7355] font-mono font-bold">£</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.purchasePrice || ''}
                                onChange={(e) => handleUpdateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                className="w-full pl-5 pr-2 py-1 border border-[#D5D5D0] bg-white text-xs font-mono font-bold text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                                placeholder="120"
                              />
                            </div>
                          </div>

                          {/* Garment Title */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                              Garment Title
                            </label>
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-[#D5D5D0] bg-white text-xs font-serif font-medium text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                              placeholder="e.g. Beaufort Waxed Jacket"
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                              Category
                            </label>
                            <select
                              value={item.category || categories[0] || 'Outerwear'}
                              onChange={(e) => handleUpdateItemField(idx, 'category', e.target.value as Category)}
                              className="w-full px-2 py-1 border border-[#D5D5D0] bg-white text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Color */}
                          <div>
                            <label className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                              Color / Tone
                            </label>
                            <input
                              type="text"
                              value={item.color || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'color', e.target.value)}
                              className="w-full px-2 py-1 border border-[#D5D5D0] bg-white text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                              placeholder="e.g. Sage Olive"
                            />
                          </div>

                          {/* Material / Notes */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                              Fabric Composition / Notes
                            </label>
                            <input
                              type="text"
                              value={item.material || item.notes || ''}
                              onChange={(e) => handleUpdateItemField(idx, 'material', e.target.value)}
                              className="w-full px-2 py-1 border border-[#D5D5D0] bg-white text-xs text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                              placeholder="e.g. 100% Waxed Cotton with corduroy trim"
                            />
                          </div>

                          {/* Vinted Provenance Details (if available or in Vinted mode) */}
                          {(item.seller || item.orderStatus || item.transactionType || item.orderDate || activeTab === 'vinted') && (
                            <div className="sm:col-span-2 bg-[#F0F8F8] border border-[#BCE4E6] p-2.5 space-y-2 rounded-xs">
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#007782] font-semibold uppercase tracking-wider">
                                <span>Vinted Export Provenance</span>
                                {item.transactionType && (
                                  <span className="px-1.5 py-0.2 bg-[#007782] text-white rounded-xs">
                                    {item.transactionType}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <label className="text-[9px] font-mono text-[#00606A] uppercase block">Seller</label>
                                  <input
                                    type="text"
                                    value={item.seller || ''}
                                    onChange={(e) => handleUpdateItemField(idx, 'seller', e.target.value)}
                                    placeholder="@username"
                                    className="w-full px-1.5 py-0.5 bg-white border border-[#BCE4E6] text-[11px] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] font-mono text-[#00606A] uppercase block">Order Status</label>
                                  <input
                                    type="text"
                                    value={item.orderStatus || 'Order completed!'}
                                    onChange={(e) => handleUpdateItemField(idx, 'orderStatus', e.target.value)}
                                    placeholder="Order completed!"
                                    className="w-full px-1.5 py-0.5 bg-white border border-[#BCE4E6] text-[11px] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] font-mono text-[#00606A] uppercase block">Order Date</label>
                                  <input
                                    type="text"
                                    value={item.orderDate || ''}
                                    onChange={(e) => handleUpdateItemField(idx, 'orderDate', e.target.value)}
                                    placeholder="YYYY-MM-DD"
                                    className="w-full px-1.5 py-0.5 bg-white border border-[#BCE4E6] text-[11px] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] font-mono text-[#00606A] uppercase block">Order Value</label>
                                  <div className="relative">
                                    <span className="absolute left-1.5 top-0.5 text-[10px] text-[#007782] font-mono font-bold">£</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.orderValue || item.purchasePrice || ''}
                                      onChange={(e) => handleUpdateItemField(idx, 'orderValue', parseFloat(e.target.value) || 0)}
                                      placeholder="35"
                                      className="w-full pl-4 pr-1 py-0.5 bg-white border border-[#BCE4E6] text-[11px] font-mono font-bold text-[#1A1A1A] focus:outline-none focus:border-[#007782]"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Lifecycle Tags Selector */}
                          <div className="sm:col-span-2 pt-2 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#5A5A55]">
                              <Tag className="w-3 h-3 text-[#767670]" />
                              <span className="font-semibold uppercase tracking-wider">Item Tag:</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {LIFECYCLE_TAGS.map((lt) => {
                                const isActive = (item.tags || []).includes(lt);
                                const colorStyles = getLifecycleTagColor(lt);
                                return (
                                  <button
                                    key={lt}
                                    type="button"
                                    onClick={() => handleToggleLifecycleTag(idx, lt)}
                                    className={`px-2.5 py-1 text-xs font-mono border rounded-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                      isActive
                                        ? `${colorStyles.badge} font-bold shadow-xs ring-1 ring-offset-1 ring-current`
                                        : 'bg-white border-[#D5D5D0] text-[#767670] hover:text-[#1A1A1A] hover:border-[#9A9A90]'
                                    }`}
                                    title={`Click to set tag to ${lt}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${colorStyles.dot}`} />
                                    <span>{lt}</span>
                                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer Actions */}
        {extractedItems.length > 0 && !isLoading && (
          <div className="px-5 py-3.5 bg-[#F8F7F4] border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-[#5A5A55] font-mono">
              <span>Ready to create: </span>
              <strong className="text-[#1A1A1A]">{selectedCount} separate listings</strong>
              <span> • Total: </span>
              <strong className="text-emerald-800 font-bold">£{selectedTotalPrice.toFixed(2)} GBP</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-[#D5D5D0] bg-white hover:bg-[#F2F1ED] text-xs font-medium uppercase tracking-wider text-[#5A5A55] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedItems}
                disabled={selectedCount === 0 || isSavingBatch}
                className={`px-4 py-1.5 disabled:opacity-50 text-white text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  globalDestination === 'selling'
                    ? 'bg-[#007782] hover:bg-[#006069]'
                    : 'bg-[#8C7355] hover:bg-[#735D43]'
                }`}
              >
                {isSavingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Listings...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {globalDestination === 'selling'
                      ? `Import ${selectedCount} Listing${selectedCount > 1 ? 's' : ''} to Resale`
                      : globalDestination === 'shopping'
                      ? `Add ${selectedCount} Item${selectedCount > 1 ? 's' : ''} to Wishlist`
                      : `Add ${selectedCount} Item${selectedCount > 1 ? 's' : ''} to Wardrobe`}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
