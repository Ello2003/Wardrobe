import React, { useState, useEffect } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { EbayAuth, DEFAULT_EBAY_AUTH, Category } from '../types';
import { GarmentImage } from './GarmentImage';
import {
  testEbayConnection,
  fetchEbayOrders,
  fetchEbayActiveListings,
  scrapeEbaySellerAccount,
  parseEbayReportFile,
  EbayOrder,
  EbayActiveListing,
  inferEbayBrand,
  inferEbayCategory,
  inferEbaySize,
} from '../services/ebayService';
import {
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  FileText,
  Upload,
  Link2,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square,
  Tag,
  Shirt,
  PoundSterling,
  Layers,
  ArrowRight,
  Globe,
  Sliders,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export interface EbayStagedItem {
  id: string;
  orderId?: string;
  title: string;
  name: string;
  price: number;
  currency: string;
  brand: string;
  category: Category;
  size?: string;
  condition?: string;
  status?: string;
  imageUrl?: string;
  itemUrl?: string;
  seller?: string;
  buyer?: string;
  date?: string;
  type: 'purchased' | 'sold' | 'active';
  destination: 'wardrobe' | 'shopping' | 'selling';
  selected: boolean;
  isDuplicate?: boolean;
}

interface EbayImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDestination?: 'wardrobe' | 'shopping' | 'selling';
}

type TabType = 'sync' | 'store' | 'url' | 'file';

export const EbayImportModal: React.FC<EbayImportModalProps> = ({
  isOpen,
  onClose,
  defaultDestination = 'wardrobe',
}) => {
  const {
    items,
    shoppingList,
    saleItems,
    settings,
    updateSettings,
    syncEbayAccountOrders,
    importEbayExtractedListings,
    categories,
    formatCurrency,
  } = useWardrobe();

  const [activeTab, setActiveTab] = useState<TabType>('sync');

  // Auth config state
  const [authConfig, setAuthConfig] = useState<EbayAuth>(() => {
    return settings.ebayAuth || DEFAULT_EBAY_AUTH;
  });

  const [connectionStatus, setConnectionStatus] = useState<{
    testing: boolean;
    tested: boolean;
    success: boolean;
    message: string;
  }>({
    testing: false,
    tested: false,
    success: false,
    message: '',
  });

  // Extraction loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Staged items for preview & import
  const [stagedItems, setStagedItems] = useState<EbayStagedItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'purchased' | 'sold' | 'active'>('all');

  // Single URL state
  const [singleUrlInput, setSingleUrlInput] = useState('');

  // Seller store username input
  const [sellerInput, setSellerInput] = useState(authConfig.username || '');

  // File upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (settings.ebayAuth) {
      setAuthConfig(settings.ebayAuth);
      if (settings.ebayAuth.username && !sellerInput) {
        setSellerInput(settings.ebayAuth.username);
      }
    }
  }, [settings.ebayAuth]);

  if (!isOpen) return null;

  // Duplicate checker against active wardrobe, wishlist, and sales
  const checkIfDuplicate = (title: string, orderId?: string): boolean => {
    const cleanT = title.trim().toLowerCase();
    const id = (orderId || '').trim();

    if (id) {
      const matchWardrobeId = items.some((i) => i.orderNumber === id || i.vintedUrl?.includes(id));
      const matchShoppingId = shoppingList.some((s) => s.orderNumber === id);
      const matchSalesId = saleItems.some((s) => s.orderNumber === id || s.externalId === id);
      if (matchWardrobeId || matchShoppingId || matchSalesId) return true;
    }

    if (cleanT.length > 5) {
      const matchWardrobe = items.some((i) => i.name.toLowerCase() === cleanT);
      const matchShopping = shoppingList.some((s) => s.name.toLowerCase() === cleanT);
      const matchSales = saleItems.some((s) => s.name.toLowerCase() === cleanT);
      return matchWardrobe || matchShopping || matchSales;
    }
    return false;
  };

  // Test eBay connectivity
  const handleTestConnection = async () => {
    setConnectionStatus({
      testing: true,
      tested: false,
      success: false,
      message: 'Connecting to eBay service...',
    });
    setErrorMessage(null);

    const res = await testEbayConnection(authConfig);
    setConnectionStatus({
      testing: false,
      tested: true,
      success: res.success,
      message: res.message,
    });

    if (res.success) {
      // Save credentials in settings
      updateSettings({
        ebayAuth: {
          ...authConfig,
          isConnected: true,
          lastSyncTime: new Date().toISOString(),
        },
      });
    }
  };

  // Direct pull orders & active listings
  const handleDirectSync = async (scope: 'all' | 'purchased' | 'sold' | 'active') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    setProgressMsg(`Querying eBay account (${authConfig.domain || 'co.uk'})...`);

    try {
      const result = await fetchEbayOrders(authConfig, {
        type: scope,
        page: 1,
        limit: 50,
      });

      if (result.errors && result.errors.length > 0 && result.orders.length === 0 && result.activeListings.length === 0) {
        setErrorMessage(result.errors.join(' | '));
        setIsLoading(false);
        return;
      }

      const newStaged: EbayStagedItem[] = [];

      // Add orders
      for (const ord of result.orders) {
        const isPurchased = ord.type === 'purchased' || (!ord.buyer && ord.type !== 'sold');
        const isDup = checkIfDuplicate(ord.title, ord.orderId);
        newStaged.push({
          id: `ebay-order-${ord.orderId || Math.random().toString(36).slice(2, 9)}`,
          orderId: ord.orderId,
          title: ord.title,
          name: ord.title,
          price: typeof ord.price === 'number' ? ord.price : parseFloat(String(ord.price || 0)) || 0,
          currency: ord.currency || 'GBP',
          brand: ord.brand || inferEbayBrand(ord.title),
          category: (categories.includes(ord.category as Category) ? ord.category : inferEbayCategory(ord.title)) as Category,
          size: ord.size || inferEbaySize(ord.title),
          condition: ord.condition || 'Pre-owned',
          status: ord.status || 'Completed',
          imageUrl: ord.image,
          itemUrl: ord.itemUrl,
          seller: ord.seller,
          buyer: ord.buyer,
          date: ord.date,
          type: isPurchased ? 'purchased' : 'sold',
          destination: isPurchased ? (defaultDestination === 'shopping' ? 'shopping' : 'wardrobe') : 'selling',
          selected: !isDup,
          isDuplicate: isDup,
        });
      }

      // Add active listings
      for (const act of result.activeListings) {
        const isDup = checkIfDuplicate(act.title, act.id);
        newStaged.push({
          id: `ebay-active-${act.id || Math.random().toString(36).slice(2, 9)}`,
          orderId: act.id,
          title: act.title,
          name: act.title,
          price: act.price,
          currency: act.currency || 'GBP',
          brand: act.brand || inferEbayBrand(act.title),
          category: (categories.includes(act.category as Category) ? act.category : inferEbayCategory(act.title)) as Category,
          size: act.size || inferEbaySize(act.title),
          condition: act.condition || 'Good',
          status: act.status || 'Listed',
          imageUrl: act.imageUrl,
          itemUrl: act.url,
          seller: act.seller,
          date: new Date().toISOString().slice(0, 10),
          type: 'active',
          destination: 'selling',
          selected: !isDup,
          isDuplicate: isDup,
        });
      }

      if (newStaged.length === 0) {
        setErrorMessage('No orders or listings returned from eBay. If you do not have an API token, try scraping your public seller store or uploading an order report HTML/CSV.');
      } else {
        setStagedItems(newStaged);
        setSuccessNotice(`Retrieved ${newStaged.length} records from eBay.`);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to sync with eBay.');
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  };

  // Scrape seller store listings
  const handleScrapeSeller = async () => {
    const handle = sellerInput.trim();
    if (!handle) {
      setErrorMessage('Please enter an eBay seller username or store URL.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    const result = await scrapeEbaySellerAccount(handle, authConfig.domain || 'co.uk', (msg) => {
      setProgressMsg(msg);
    });

    if (!result.success || result.listings.length === 0) {
      setErrorMessage(result.errors.join(' | ') || 'No active listings found for this seller.');
      setIsLoading(false);
      return;
    }

    const newStaged: EbayStagedItem[] = result.listings.map((item) => {
      const isDup = checkIfDuplicate(item.title, item.id);
      return {
        id: `ebay-seller-${item.id}`,
        orderId: item.id,
        title: item.title,
        name: item.title,
        price: item.price,
        currency: item.currency || 'GBP',
        brand: item.brand || inferEbayBrand(item.title),
        category: (categories.includes(item.category as Category) ? item.category : inferEbayCategory(item.title)) as Category,
        size: item.size || inferEbaySize(item.title),
        condition: item.condition || 'Good',
        status: 'Listed',
        imageUrl: item.imageUrl,
        itemUrl: item.url,
        seller: item.seller,
        date: new Date().toISOString().slice(0, 10),
        type: 'active',
        destination: 'selling',
        selected: !isDup,
        isDuplicate: isDup,
      };
    });

    setStagedItems(newStaged);
    setSuccessNotice(`Found ${newStaged.length} active listings for @${result.user?.username || handle}.`);
    setIsLoading(false);
    setProgressMsg('');
  };

  // Single URL Scrape
  const handleSingleUrlExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = singleUrlInput.trim();
    if (!url) return;

    setIsLoading(true);
    setErrorMessage(null);
    setProgressMsg('Extracting eBay listing...');

    try {
      const itemIdMatch = url.match(/\/itm\/(?:[^\/]+\/)?([0-9]{9,15})/i) || url.match(/item=([0-9]{9,15})/i);
      const itemId = itemIdMatch ? itemIdMatch[1] : '';

      // Direct scrape request through backend
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data = await res.json();
        const title = data.title || data.name || `eBay Item #${itemId || 'Direct'}`;
        const price = typeof data.price === 'number' ? data.price : parseFloat(String(data.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const brand = data.brand || inferEbayBrand(title);
        const category = (categories.includes(data.category) ? data.category : inferEbayCategory(title)) as Category;
        const isDup = checkIfDuplicate(title, itemId);

        const newItem: EbayStagedItem = {
          id: `ebay-single-${itemId || Date.now()}`,
          orderId: itemId,
          title,
          name: title,
          price,
          currency: 'GBP',
          brand,
          category,
          size: data.size || inferEbaySize(title),
          condition: data.condition || 'Pre-owned',
          status: 'Active',
          imageUrl: data.imageUrl || (Array.isArray(data.images) ? data.images[0] : undefined),
          itemUrl: url,
          seller: data.seller || 'eBay Seller',
          date: new Date().toISOString().slice(0, 10),
          type: defaultDestination === 'selling' ? 'active' : 'purchased',
          destination: defaultDestination,
          selected: true,
          isDuplicate: isDup,
        };

        setStagedItems((prev) => [newItem, ...prev]);
        setSuccessNotice(`Successfully extracted: ${title}`);
        setSingleUrlInput('');
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err?.error || 'Failed to extract eBay product information.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error extracting URL.');
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  };

  // File Upload (HTML or CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsLoading(true);
    setErrorMessage(null);
    setProgressMsg(`Parsing ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setErrorMessage('File content is empty.');
        setIsLoading(false);
        return;
      }

      const { items: parsed, errors } = parseEbayReportFile(content, file.name);

      if (parsed.length === 0) {
        setErrorMessage(
          errors.length > 0
            ? errors.join(' | ')
            : 'Could not detect any eBay item rows in this file. Ensure it is an eBay Order History HTML page or Selling Manager CSV report.'
        );
        setIsLoading(false);
        return;
      }

      const newStaged: EbayStagedItem[] = parsed.map((p, idx) => {
        const isDup = checkIfDuplicate(p.title || p.name, p.orderId);
        const isPurchased = p.transactionType !== 'Sale';
        return {
          id: `ebay-file-${p.orderId || idx}-${Date.now()}`,
          orderId: p.orderId,
          title: p.title || p.name,
          name: p.name || p.title,
          price: p.price || p.purchasePrice || 0,
          currency: 'GBP',
          brand: p.brand || inferEbayBrand(p.title || p.name),
          category: (categories.includes(p.category) ? p.category : inferEbayCategory(p.title || p.name)) as Category,
          size: p.size || inferEbaySize(p.title || p.name),
          condition: p.condition || 'Pre-owned',
          status: isPurchased ? 'Completed' : 'Sold',
          imageUrl: p.imageUrl,
          itemUrl: p.targetStoreUrl,
          seller: p.seller,
          buyer: p.buyer,
          date: p.orderDate || new Date().toISOString().slice(0, 10),
          type: isPurchased ? 'purchased' : 'sold',
          destination: isPurchased ? (defaultDestination === 'shopping' ? 'shopping' : 'wardrobe') : 'selling',
          selected: !isDup,
          isDuplicate: isDup,
        };
      });

      setStagedItems(newStaged);
      setSuccessNotice(`Parsed ${newStaged.length} records from ${file.name}.`);
      setIsLoading(false);
      setProgressMsg('');
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setStagedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setStagedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Change destination for staged item
  const handleChangeDestination = (id: string, dest: 'wardrobe' | 'shopping' | 'selling') => {
    setStagedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, destination: dest } : item))
    );
  };

  // Final Execution: Commit Staged Items into WardrobeContext
  const handleExecuteImport = () => {
    const selected = stagedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      setErrorMessage('No items selected for import.');
      return;
    }

    // Split items by order vs active listings
    const ordersToSync: EbayOrder[] = selected.map((item) => ({
      orderId: item.orderId || item.id,
      title: item.name || item.title,
      price: item.price,
      currency: item.currency,
      status: item.status || 'Completed',
      date: item.date,
      image: item.imageUrl,
      type: item.type === 'active' ? 'active' : item.type === 'sold' ? 'sold' : 'purchased',
      seller: item.seller,
      buyer: item.buyer,
      brand: item.brand,
      category: item.category,
      size: item.size,
      condition: item.condition,
      itemUrl: item.itemUrl,
    }));

    // If active listings for resale:
    const activeListingsToImport: EbayActiveListing[] = selected
      .filter((i) => i.destination === 'selling' && i.type === 'active')
      .map((item) => ({
        id: item.orderId || item.id,
        title: item.name || item.title,
        price: item.price,
        currency: item.currency,
        brand: item.brand,
        category: item.category,
        size: item.size,
        condition: item.condition,
        url: item.itemUrl || `https://www.ebay.${authConfig.domain || 'co.uk'}`,
        imageUrl: item.imageUrl,
        status: 'Listed',
        seller: item.seller,
        tags: ['ebay', 'resale', 'active-listing'],
      }));

    if (activeListingsToImport.length > 0 && selected.every((i) => i.destination === 'selling')) {
      importEbayExtractedListings(activeListingsToImport, 'selling');
    } else {
      syncEbayAccountOrders(ordersToSync, {
        routePurchasedTo: defaultDestination === 'shopping' ? 'shopping' : 'wardrobe',
        routeSoldTo: 'selling',
        skipDuplicates: true,
      });
    }

    onClose();
  };

  const visibleStagedItems = stagedItems.filter((i) => {
    if (filterType === 'all') return true;
    return i.type === filterType;
  });

  const selectedCount = stagedItems.filter((i) => i.selected).length;
  const totalValuation = stagedItems
    .filter((i) => i.selected)
    .reduce((acc, i) => acc + (i.price || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E5E5E1] max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 rounded-lg animate-fadeIn flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0064D2]/10 border border-[#0064D2]/30 flex items-center justify-center text-[#0064D2] font-black text-lg">
              e<span className="text-[#E53238]">b</span>
              <span className="text-[#F5AF02]">a</span>
              <span className="text-[#86B817]">y</span>
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                eBay Order History &amp; Listings Importer
              </h2>
              <p className="text-xs text-[#767670]">
                Directly connect to eBay, pull purchased garments, sold history, and active resale listings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] rounded-xs cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-[#E5E5E1] pb-2 text-xs font-mono shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-[#EAE8E3]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#86B817]" />
            <span>Direct Account Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all cursor-pointer ${
              activeTab === 'store'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-[#EAE8E3]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#0064D2]" />
            <span>Seller Store Scraper</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-[#EAE8E3]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-[#E53238]" />
            <span>Product Link (URL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-[#EAE8E3]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#F5AF02]" />
            <span>Report HTML / CSV</span>
          </button>
        </div>

        {/* Notices & Banners */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-start gap-2 rounded-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center justify-between rounded-xs shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: Direct Account Sync */}
        {activeTab === 'sync' && (
          <div className="space-y-4 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                  eBay Domain / Site
                </label>
                <select
                  value={authConfig.domain || 'co.uk'}
                  onChange={(e) => setAuthConfig({ ...authConfig, domain: e.target.value })}
                  className="w-full text-xs font-mono bg-[#F8F7F4] border border-[#CCCCCC] p-2 focus:bg-white focus:border-[#0064D2] focus:outline-none"
                >
                  <option value="co.uk">ebay.co.uk (United Kingdom)</option>
                  <option value="com">ebay.com (United States)</option>
                  <option value="de">ebay.de (Germany)</option>
                  <option value="fr">ebay.fr (France)</option>
                  <option value="it">ebay.it (Italy)</option>
                  <option value="es">ebay.es (Spain)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                  Username / Store Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. vintage_curator"
                  value={authConfig.username || ''}
                  onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
                  className="w-full text-xs font-mono bg-[#F8F7F4] border border-[#CCCCCC] p-2 focus:bg-white focus:border-[#0064D2] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                  User Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="OAuth user token or API key"
                  value={authConfig.userToken || ''}
                  onChange={(e) => setAuthConfig({ ...authConfig, userToken: e.target.value })}
                  className="w-full text-xs font-mono bg-[#F8F7F4] border border-[#CCCCCC] p-2 focus:bg-white focus:border-[#0064D2] focus:outline-none"
                />
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="flex items-center justify-between p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={connectionStatus.testing || (!authConfig.username && !authConfig.userToken)}
                  className="px-3 py-1.5 bg-white border border-[#D5D5D0] hover:border-[#0064D2] text-xs font-mono font-semibold text-[#1A1A1A] disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus.testing ? 'animate-spin text-[#0064D2]' : ''}`} />
                  <span>{connectionStatus.testing ? 'Testing...' : 'Test Connection'}</span>
                </button>

                {connectionStatus.tested && (
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-xs flex items-center gap-1 ${
                      connectionStatus.success
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {connectionStatus.success ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span>{connectionStatus.message}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectSync('all')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#0064D2] hover:bg-[#0051a8] text-white text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Pull Orders &amp; Listings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Seller Store Scraper */}
        {activeTab === 'store' && (
          <div className="p-4 bg-[#F8F7F4] border border-[#E5E5E1] space-y-3 shrink-0">
            <h3 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#0064D2]" />
              Extract Active Listings from Public eBay Seller / Store
            </h3>
            <p className="text-xs text-[#767670]">
              Scrape all current clothing and accessory listings listed by any eBay seller handle or store URL.
              Items are mapped with photographs, asking price, category, and listing URLs.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="eBay username or store URL (e.g. vintage_archive or ebay.co.uk/usr/mycloset)..."
                  value={sellerInput}
                  onChange={(e) => setSellerInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] text-xs font-mono text-[#1A1A1A] focus:border-[#0064D2] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleScrapeSeller}
                disabled={isLoading || !sellerInput.trim()}
                className="px-4 py-2 bg-[#0064D2] hover:bg-[#0051a8] text-white text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract Store Listings</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Single Item URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleSingleUrlExtract} className="p-4 bg-[#F8F7F4] border border-[#E5E5E1] space-y-3 shrink-0">
            <h3 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#E53238]" />
              Single eBay Item Web Scraper
            </h3>
            <p className="text-xs text-[#767670]">
              Paste any eBay listing URL to immediately extract the high-resolution photo, garment title, brand,
              asking price, and sizing specs.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 relative">
                <input
                  type="url"
                  placeholder="https://www.ebay.co.uk/itm/123456789..."
                  value={singleUrlInput}
                  onChange={(e) => setSingleUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] text-xs text-[#1A1A1A] focus:border-[#0064D2] focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !singleUrlInput.trim()}
                className="px-4 py-2 bg-[#E53238] hover:bg-[#cc2b30] text-white text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract Item</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: File Upload */}
        {activeTab === 'file' && (
          <div className="p-4 bg-[#F8F7F4] border border-[#E5E5E1] space-y-3 shrink-0">
            <h3 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#F5AF02]" />
              Upload eBay Purchase History (HTML) or Selling Report (CSV)
            </h3>
            <p className="text-xs text-[#767670]">
              Download your saved eBay purchase history webpage (Save Page As HTML) or your Seller Hub orders CSV export
              and drop it here.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <label className="px-4 py-2 bg-white border border-[#CCCCCC] hover:border-[#1A1A1A] text-xs font-mono font-semibold text-[#1A1A1A] cursor-pointer flex items-center gap-1.5 shadow-xs">
                <Upload className="w-3.5 h-3.5 text-[#8C7355]" />
                <span>Choose HTML or CSV File</span>
                <input
                  type="file"
                  accept=".html,.htm,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedFileName && (
                <span className="text-xs font-mono text-[#767670]">
                  Loaded: <strong>{uploadedFileName}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {isLoading && (
          <div className="p-4 bg-[#F8F7F4] border border-[#E5E5E1] flex items-center justify-center gap-3 text-xs font-mono text-[#1A1A1A]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0064D2]" />
            <span>{progressMsg || 'Processing eBay request...'}</span>
          </div>
        )}

        {/* STAGED ITEMS REVIEW & EDIT TABLE */}
        {stagedItems.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 pt-2">
            {/* Control Bar: Selection & Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#E5E5E1] shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-xs font-mono text-[#0064D2] hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-[#CCCCCC]">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-xs font-mono text-[#767670] hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>

                <span className="text-xs font-mono text-[#767670]">
                  (<strong>{selectedCount}</strong> of {stagedItems.length} selected • Total Valuation:{' '}
                  <strong className="text-[#1A1A1A]">{formatCurrency(totalValuation)}</strong>)
                </span>
              </div>

              {/* Scope filter pills */}
              <div className="flex items-center gap-1 bg-[#F8F7F4] p-1 border border-[#E5E5E1] text-[11px] font-mono">
                {(['all', 'purchased', 'sold', 'active'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`px-2 py-0.5 capitalize cursor-pointer transition-colors ${
                      filterType === t
                        ? 'bg-white text-[#1A1A1A] font-bold shadow-2xs'
                        : 'text-[#767670] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {t === 'all' ? 'All Records' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[#F0EFEB]">
              {visibleStagedItems.map((item) => (
                <div
                  key={item.id}
                  className={`pt-2 pb-2 flex items-center justify-between gap-3 text-xs transition-colors ${
                    item.selected ? 'bg-white' : 'opacity-60 bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item.id)}
                      className="text-[#8C7355] cursor-pointer shrink-0"
                    >
                      {item.selected ? (
                        <CheckSquare className="w-4 h-4 text-[#0064D2]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#A5A5A0]" />
                      )}
                    </button>

                    {/* Image Thumbnail */}
                    <div className="w-12 h-14 bg-[#F8F7F4] border border-[#E5E5E1] overflow-hidden shrink-0 flex items-center justify-center">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-bold text-[#1A1A1A] truncate max-w-md">
                          {item.name}
                        </span>
                        {item.isDuplicate && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200">
                            Potential Duplicate
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-xs uppercase tracking-wider font-bold ${
                            item.type === 'purchased'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.type === 'sold'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#767670] font-mono flex-wrap">
                        <span className="text-[#8C7355] font-semibold">{item.brand}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                        {item.size && (
                          <>
                            <span>•</span>
                            <span>Size: {item.size}</span>
                          </>
                        )}
                        {item.seller && (
                          <>
                            <span>•</span>
                            <span>Seller: @{item.seller}</span>
                          </>
                        )}
                        {item.date && (
                          <>
                            <span>•</span>
                            <span>{item.date}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Target Destination Selector */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-[#1A1A1A]">
                        {formatCurrency(item.price)}
                      </div>
                      {item.itemUrl && (
                        <a
                          href={item.itemUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-[#0064D2] hover:underline flex items-center justify-end gap-0.5"
                        >
                          <span>eBay Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Destination Pill */}
                    <div className="flex items-center border border-[#E5E5E1] bg-[#F8F7F4] p-0.5 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => handleChangeDestination(item.id, 'wardrobe')}
                        className={`px-1.5 py-0.5 cursor-pointer ${
                          item.destination === 'wardrobe' ? 'bg-white font-bold text-[#1A1A1A] shadow-2xs' : 'text-[#767670]'
                        }`}
                        title="Route to Wardrobe Inventory"
                      >
                        Wardrobe
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeDestination(item.id, 'shopping')}
                        className={`px-1.5 py-0.5 cursor-pointer ${
                          item.destination === 'shopping' ? 'bg-white font-bold text-[#1A1A1A] shadow-2xs' : 'text-[#767670]'
                        }`}
                        title="Route to Purchases / Wishlist"
                      >
                        Wishlist
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeDestination(item.id, 'selling')}
                        className={`px-1.5 py-0.5 cursor-pointer ${
                          item.destination === 'selling' ? 'bg-white font-bold text-[#1A1A1A] shadow-2xs' : 'text-[#767670]'
                        }`}
                        title="Route to Resale Studio"
                      >
                        Resale
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E1] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {stagedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setStagedItems([])}
                className="px-3 py-2 text-xs font-mono text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Staged</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={selectedCount === 0}
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-[#1A1A1A] hover:bg-[#333333] text-white disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-2 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Import {selectedCount} Selected Items</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
