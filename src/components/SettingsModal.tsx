import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Sliders,
  PoundSterling,
  Edit3,
  Layers,
  Tag,
  FolderDown,
  FolderUp,
  RotateCcw,
  Trash2,
  Check,
  Plus,
  AlertTriangle,
  Eye,
  EyeOff,
  LayoutGrid,
  Sparkles,
  ShieldAlert,
  Table as TableIcon,
  ShoppingBag,
  Maximize2,
  MoveHorizontal,
  Globe,
  Server,
  Lock,
  RefreshCw,
  KeyRound,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types';
import { safeConfirm } from '../utils/safeConfirm';
import { testWorkerConnection } from '../services/vintedWorkerService';
import { getApiBaseUrl, setApiBaseUrl, isStaticHosting } from '../utils/apiHelper';
import {
  InventoryDisplaySettings,
  DEFAULT_INVENTORY_DISPLAY_SETTINGS,
  DEFAULT_INVENTORY_TABLE_SETTINGS,
} from './InventoryDisplaySettingsModal';
import {
  ShoppingDisplaySettings,
  DEFAULT_SHOPPING_DISPLAY_SETTINGS,
  DEFAULT_SHOPPING_TABLE_SETTINGS,
} from './ShoppingDisplaySettingsModal';
import {
  SellingDisplaySettings,
  DEFAULT_SELLING_DISPLAY_SETTINGS,
  DEFAULT_SELLING_TABLE_SETTINGS,
} from './SellingDisplaySettingsModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    resetSettings,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    renameTagGlobally,
    deleteTagGlobally,
    renameBrandGlobally,
    items,
    shoppingList,
    saleItems,
    exportDataJSON,
    importDataJSON,
    resetToDefaultData,
    clearDatabase,
  } = useWardrobe();

  const [activeTab, setActiveTab] = useState<
    | 'general'
    | 'wardrobe_table'
    | 'wishlist_table'
    | 'resale_table'
    | 'inline'
    | 'categories'
    | 'tags'
    | 'vinted'
    | 'data'
  >('general');

  // Inventory Table Settings
  const [invSettings, setInvSettings] = useState<InventoryDisplaySettings>(() => {
    const saved = localStorage.getItem('inventory_display_settings');
    if (saved) {
      try {
        return { ...DEFAULT_INVENTORY_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_INVENTORY_DISPLAY_SETTINGS;
  });

  // Shopping Table Settings
  const [shopSettings, setShopSettings] = useState<ShoppingDisplaySettings>(() => {
    const saved = localStorage.getItem('shopping_display_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SHOPPING_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SHOPPING_DISPLAY_SETTINGS;
  });

  // Selling Table Settings
  const [sellSettings, setSellSettings] = useState<SellingDisplaySettings>(() => {
    const saved = localStorage.getItem('selling_display_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SELLING_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SELLING_DISPLAY_SETTINGS;
  });

  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // External Backend API Base URL (for GitHub Pages static hosting)
  const [apiEndpointUrl, setApiEndpointUrl] = useState<string>(() => getApiBaseUrl());
  const [apiSavedNotice, setApiSavedNotice] = useState<string | null>(null);

  // Vinted Cloudflare Worker Integration State
  const [vintedEndpoint, setVintedEndpoint] = useState(settings.vintedWorkerAuth?.workerEndpoint || '');
  const [vintedDomain, setVintedDomain] = useState(settings.vintedWorkerAuth?.domain || 'co.uk');
  const [vintedAccessToken, setVintedAccessToken] = useState(settings.vintedWorkerAuth?.accessToken || '');
  const [vintedCsrfToken, setVintedCsrfToken] = useState(settings.vintedWorkerAuth?.csrfToken || '');
  const [vintedCookie, setVintedCookie] = useState(settings.vintedWorkerAuth?.cookie || '');
  const [vintedRefreshToken, setVintedRefreshToken] = useState(settings.vintedWorkerAuth?.refreshToken || '');
  const [vintedPurchasedRoute, setVintedPurchasedRoute] = useState<'wardrobe' | 'shopping'>(
    settings.vintedWorkerAuth?.defaultImportDestination === 'shopping' ? 'shopping' : 'wardrobe'
  );
  const [vintedAutoRoute, setVintedAutoRoute] = useState(settings.vintedWorkerAuth?.autoRouteOrders ?? true);
  const [vintedShowTokens, setVintedShowTokens] = useState(false);
  const [vintedTesting, setVintedTesting] = useState(false);
  const [vintedTestResult, setVintedTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [vintedSaveSuccess, setVintedSaveSuccess] = useState(false);

  // Sync settings when opened
  useEffect(() => {
    if (isOpen) {
      if (settings.vintedWorkerAuth) {
        setVintedEndpoint(settings.vintedWorkerAuth.workerEndpoint || '');
        setVintedDomain(settings.vintedWorkerAuth.domain || 'co.uk');
        setVintedAccessToken(settings.vintedWorkerAuth.accessToken || '');
        setVintedCsrfToken(settings.vintedWorkerAuth.csrfToken || '');
        setVintedCookie(settings.vintedWorkerAuth.cookie || '');
        setVintedRefreshToken(settings.vintedWorkerAuth.refreshToken || '');
        setVintedPurchasedRoute(
          settings.vintedWorkerAuth.defaultImportDestination === 'shopping' ? 'shopping' : 'wardrobe'
        );
        setVintedAutoRoute(settings.vintedWorkerAuth.autoRouteOrders ?? true);
      }
      setVintedTestResult(null);
      setVintedSaveSuccess(false);
      try {
        const savedInv = localStorage.getItem('inventory_display_settings');
        if (savedInv) setInvSettings({ ...DEFAULT_INVENTORY_DISPLAY_SETTINGS, ...JSON.parse(savedInv) });

        const savedShop = localStorage.getItem('shopping_display_settings');
        if (savedShop) setShopSettings({ ...DEFAULT_SHOPPING_DISPLAY_SETTINGS, ...JSON.parse(savedShop) });

        const savedSell = localStorage.getItem('selling_display_settings');
        if (savedSell) setSellSettings({ ...DEFAULT_SELLING_DISPLAY_SETTINGS, ...JSON.parse(savedSell) });
      } catch (e) {
        console.error('Error reloading settings in modal', e);
      }
    }
  }, [isOpen]);

  const updateInventoryDisplay = (updated: InventoryDisplaySettings) => {
    setInvSettings(updated);
    localStorage.setItem('inventory_display_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('custom_display_settings_updated', { detail: { section: 'inventory' } }));
  };

  const updateShoppingDisplay = (updated: ShoppingDisplaySettings) => {
    setShopSettings(updated);
    localStorage.setItem('shopping_display_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('custom_display_settings_updated', { detail: { section: 'shopping' } }));
  };

  const updateSellingDisplay = (updated: SellingDisplaySettings) => {
    setSellSettings(updated);
    localStorage.setItem('selling_display_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('custom_display_settings_updated', { detail: { section: 'selling' } }));
  };

  // Category editing state
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');

  // Tag editing state
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  // Brand renaming state
  const [brandFrom, setBrandFrom] = useState('');
  const [brandTo, setBrandTo] = useState('');
  const [brandSuccessMsg, setBrandSuccessMsg] = useState<string | null>(null);

  // Import JSON feedback
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [importFileText, setImportFileText] = useState('');

  if (!isOpen) return null;

  // Extract all unique tags in the system
  const allUniqueTags = Array.from(
    new Set([
      ...(settings.customTags || []),
      ...items.flatMap((i) => i.tags || []),
      ...shoppingList.flatMap((s) => s.tags || []),
      ...saleItems.flatMap((s) => s.tags || []),
    ])
  ).sort();

  // Extract all unique brands
  const allUniqueBrands = Array.from(
    new Set([
      ...items.map((i) => i.brand),
      ...shoppingList.map((s) => s.brand),
      ...saleItems.map((s) => s.brand),
    ])
  ).filter(Boolean).sort();

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    addCategory(newCatInput.trim());
    setNewCatInput('');
  };

  const handleUpdateCategory = (oldName: string) => {
    if (!editingCatValue.trim() || editingCatValue.trim() === oldName) {
      setEditingCat(null);
      return;
    }
    updateCategory(oldName, editingCatValue.trim());
    setEditingCat(null);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!settings.customTags.includes(tag)) {
      updateSettings({ customTags: [...settings.customTags, tag] });
    }
    setNewTagInput('');
  };

  const handleUpdateTag = (oldTag: string) => {
    if (!editingTagValue.trim() || editingTagValue.trim() === oldTag) {
      setEditingTag(null);
      return;
    }
    renameTagGlobally(oldTag, editingTagValue.trim());
    setEditingTag(null);
  };

  const handleBrandRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFrom.trim() || !brandTo.trim()) return;
    renameBrandGlobally(brandFrom.trim(), brandTo.trim());
    setBrandSuccessMsg(`Successfully renamed "${brandFrom}" to "${brandTo}" across all collections.`);
    setBrandFrom('');
    setBrandTo('');
    setTimeout(() => setBrandSuccessMsg(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputEl = e.target;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importDataJSON(content);
        setImportStatus(res);
      }
      inputEl.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#1A1A1A] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E1] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#1A1A1A] text-white">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                Application Settings & Customization
              </h2>
              <p className="text-xs text-[#767670] font-mono">
                Customize inline editing, layout preferences, currencies, taxonomies, and backups.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#E5E3DC] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#E5E5E1] bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Display & Currency
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wardrobe_table')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'wardrobe_table'
                ? 'border-[#8C7355] text-[#8C7355] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Wardrobe DB View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wishlist_table')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'wishlist_table'
                ? 'border-[#3A3A38] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Wishlist DB View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resale_table')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'resale_table'
                ? 'border-[#007782] text-[#007782] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Resale DB View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inline')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'inline'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Inline & Draggable
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'tags'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Tags & Brands
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vinted')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'vinted'
                ? 'border-[#007782] text-[#007782] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#007782]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#007782]" />
            <span>Vinted Sync &amp; Worker</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Backup & Reset
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Display & Currency */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                  Currency Symbol & Formatting
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { code: 'GBP', sym: '£', label: '£ GBP (UK)' },
                    { code: 'USD', sym: '$', label: '$ USD (US)' },
                    { code: 'EUR', sym: '€', label: '€ EUR (EU)' },
                    { code: 'JPY', sym: '¥', label: '¥ JPY (Japan)' },
                    { code: 'AUD', sym: '$', label: '$ AUD (Australia)' },
                    { code: 'CAD', sym: '$', label: '$ CAD (Canada)' },
                  ].map((cur) => {
                    const isSelected = settings.currency === cur.code;
                    return (
                      <button
                        key={cur.code}
                        type="button"
                        onClick={() =>
                          updateSettings({ currency: cur.code as any, currencySymbol: cur.sym })
                        }
                        className={`p-2.5 text-center border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                            : 'bg-[#FAF9F5] text-[#1A1A1A] border-[#E5E5E1] hover:border-[#999]'
                        }`}
                      >
                        <div className="text-sm font-serif font-bold">{cur.sym}</div>
                        <div className="text-[10px] font-mono opacity-80">{cur.code}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image Fit and Aspect Ratio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Garment Photo Aspect Ratio
                  </label>
                  <select
                    value={settings.imageAspectRatio}
                    onChange={(e) => updateSettings({ imageAspectRatio: e.target.value as any })}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="1:1">1:1 Square (Clean editorial)</option>
                    <option value="4:5">4:5 Portrait (Fashion standard)</option>
                    <option value="3:4">3:4 Portrait (Full garment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Image Fit Mode
                  </label>
                  <select
                    value={settings.imageFit}
                    onChange={(e) => updateSettings({ imageFit: e.target.value as any })}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="contain">Contain (Show entire garment, no cropping)</option>
                    <option value="cover">Cover (Fill card space, edge-to-edge)</option>
                  </select>
                </div>
              </div>

              {/* Default View Modes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Wardrobe Default View
                  </label>
                  <select
                    value={settings.defaultWardrobeView}
                    onChange={(e) => updateSettings({ defaultWardrobeView: e.target.value as any })}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="grid">Visual Grid Cards</option>
                    <option value="table">Dense Spreadsheet Table</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Shopping Default View
                  </label>
                  <select
                    value={settings.defaultShoppingView}
                    onChange={(e) => updateSettings({ defaultShoppingView: e.target.value as any })}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="grid">Visual Grid Cards</option>
                    <option value="table">Dense Spreadsheet Table</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Sales Default View
                  </label>
                  <select
                    value={settings.defaultSellingView}
                    onChange={(e) => updateSettings({ defaultSellingView: e.target.value as any })}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="grid">Visual Grid Cards</option>
                    <option value="table">Dense Spreadsheet Table</option>
                  </select>
                </div>
              </div>

              {/* Budget Alert Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider">
                    Monthly Budget Alert Threshold ({settings.monthlyBudgetAlertThreshold}%)
                  </label>
                  <span className="text-xs font-mono text-[#767670]">
                    Triggers warning banner when spent exceeds {settings.monthlyBudgetAlertThreshold}% of budget
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={settings.monthlyBudgetAlertThreshold}
                  onChange={(e) =>
                    updateSettings({ monthlyBudgetAlertThreshold: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-[#1A1A1A] cursor-pointer"
                />
              </div>

              {/* External Backend / API Endpoint (for Static Hosting & GitHub Pages) */}
              <div className="pt-4 border-t border-[#E5E5E1] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-[#8C7355]" />
                      Backend API Endpoint (Static Hosting / GitHub Pages)
                    </h3>
                    <p className="text-xs text-[#767670] mt-0.5">
                      GitHub Pages deploys this app as a static frontend. If you run a backend service (e.g. Cloud Run, VPS, local server) for Gemini AI features or order syncing, configure the URL here.
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-xs border ${
                      isStaticHosting()
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isStaticHosting() ? 'Static Host (Pages)' : 'Local Dev Server'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={apiEndpointUrl}
                    onChange={(e) => {
                      setApiEndpointUrl(e.target.value);
                      setApiSavedNotice(null);
                    }}
                    placeholder="e.g. https://my-wardrobe-api.run.app (Leave empty for default relative path)"
                    className="flex-1 text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setApiBaseUrl(apiEndpointUrl.trim());
                      setApiSavedNotice('API base URL saved successfully.');
                      setTimeout(() => setApiSavedNotice(null), 3000);
                    }}
                    className="px-3 py-2 text-xs font-mono bg-[#1A1A1A] text-white hover:bg-[#333333] transition-colors cursor-pointer"
                  >
                    Save URL
                  </button>
                  {apiEndpointUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiEndpointUrl('');
                        setApiBaseUrl('');
                        setApiSavedNotice('API base URL reset to default relative.');
                        setTimeout(() => setApiSavedNotice(null), 3000);
                      }}
                      className="px-2 py-2 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                      title="Reset to default relative API calls"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {apiSavedNotice && (
                  <p className="text-[11px] font-mono text-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {apiSavedNotice}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB: Wardrobe Database Table View Settings */}
          {activeTab === 'wardrobe_table' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between bg-[#FAF9F5] p-4 border border-[#E5E5E1]">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <TableIcon className="w-4 h-4 text-[#8C7355]" />
                    Wardrobe Database View Configuration
                  </h3>
                  <p className="text-xs text-[#767670] mt-0.5">
                    Customize visible table columns, row density, font scale, text wrapping, and resizable column preferences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('inventory_table_widths_v2');
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('custom_display_settings_updated', { detail: { section: 'inventory' } }));
                    setResetMsg('Wardrobe column widths reset to defaults');
                    setTimeout(() => setResetMsg(null), 3000);
                  }}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-[#D5D5D0] hover:border-[#8C7355] text-[#1A1A1A] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#8C7355]" />
                  <span>Reset Column Widths</span>
                </button>
              </div>

              {resetMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {resetMsg}
                </div>
              )}

              {/* Table Style Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Row Density
                  </label>
                  <select
                    value={invSettings.tableSettings?.density || 'compact'}
                    onChange={(e) => {
                      const curTable = invSettings.tableSettings || DEFAULT_INVENTORY_TABLE_SETTINGS;
                      updateInventoryDisplay({
                        ...invSettings,
                        tableSettings: { ...curTable, density: e.target.value as any },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#8C7355] focus:outline-hidden"
                  >
                    <option value="comfortable">Comfortable (Spacious padding)</option>
                    <option value="compact">Compact (Standard)</option>
                    <option value="dense">Dense (High Information)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Font Scale
                  </label>
                  <select
                    value={invSettings.tableSettings?.fontSize || 'xs'}
                    onChange={(e) => {
                      const curTable = invSettings.tableSettings || DEFAULT_INVENTORY_TABLE_SETTINGS;
                      updateInventoryDisplay({
                        ...invSettings,
                        tableSettings: { ...curTable, fontSize: e.target.value as any },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#8C7355] focus:outline-hidden"
                  >
                    <option value="xs">Extra Small (11px / Compact)</option>
                    <option value="sm">Small (13px)</option>
                    <option value="base">Base (14px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Text Wrap
                  </label>
                  <select
                    value={invSettings.tableSettings?.textWrap ? 'wrap' : 'truncate'}
                    onChange={(e) => {
                      const curTable = invSettings.tableSettings || DEFAULT_INVENTORY_TABLE_SETTINGS;
                      updateInventoryDisplay({
                        ...invSettings,
                        tableSettings: { ...curTable, textWrap: e.target.value === 'wrap' },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#8C7355] focus:outline-hidden"
                  >
                    <option value="truncate">Truncate (Single line with ellipsis)</option>
                    <option value="wrap">Wrap (Multi-line full visibility)</option>
                  </select>
                </div>
              </div>

              {/* Zebra & Sticky Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 border border-[#E5E5E1] bg-white cursor-pointer hover:border-[#8C7355]">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#1A1A1A] block">Zebra Striping</span>
                    <span className="text-[11px] text-[#767670]">Alternate row background colors</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={invSettings.tableSettings?.zebraStriping ?? true}
                    onChange={(e) => {
                      const curTable = invSettings.tableSettings || DEFAULT_INVENTORY_TABLE_SETTINGS;
                      updateInventoryDisplay({
                        ...invSettings,
                        tableSettings: { ...curTable, zebraStriping: e.target.checked },
                      });
                    }}
                    className="accent-[#8C7355] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-[#E5E5E1] bg-white cursor-pointer hover:border-[#8C7355]">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#1A1A1A] block">Sticky Header Bar</span>
                    <span className="text-[11px] text-[#767670]">Keep column titles visible on scroll</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={invSettings.tableSettings?.stickyHeader ?? true}
                    onChange={(e) => {
                      const curTable = invSettings.tableSettings || DEFAULT_INVENTORY_TABLE_SETTINGS;
                      updateInventoryDisplay({
                        ...invSettings,
                        tableSettings: { ...curTable, stickyHeader: e.target.checked },
                      });
                    }}
                    className="accent-[#8C7355] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Column Visibility Grid */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2.5">
                  Wardrobe Table Column Visibility
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'showImage', label: 'Photo Thumbnail' },
                    { key: 'showName', label: 'Garment Name / Title' },
                    { key: 'showBrand', label: 'Brand / Designer' },
                    { key: 'showCategory', label: 'Category' },
                    { key: 'showPrice', label: 'Purchase Price (£)' },
                    { key: 'showWearCount', label: 'Worn Count / CPW' },
                    { key: 'showCondition', label: 'Condition' },
                    { key: 'showSeason', label: 'Season' },
                    { key: 'showColor', label: 'Color Tone' },
                    { key: 'showLocation', label: 'Storage Location' },
                    { key: 'showTags', label: 'Custom Tags' },
                    { key: 'showVintedDetails', label: 'Provenance / Vinted Link' },
                    { key: 'showActions', label: 'Quick Action Buttons' },
                  ].map((col) => {
                    const curTable = invSettings.tableSettings || DEFAULT_INVENTORY_TABLE_SETTINGS;
                    const isChecked = (curTable as any)[col.key] ?? true;
                    return (
                      <label
                        key={col.key}
                        className={`p-2.5 border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-white border-[#8C7355]' : 'bg-[#FAF9F5] border-[#E5E5E1] opacity-60'
                        }`}
                      >
                        <span className="text-xs font-mono text-[#1A1A1A]">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            updateInventoryDisplay({
                              ...invSettings,
                              tableSettings: { ...curTable, [col.key]: e.target.checked },
                            });
                          }}
                          className="accent-[#8C7355] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Wishlist Database Table View Settings */}
          {activeTab === 'wishlist_table' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between bg-[#FAF9F5] p-4 border border-[#E5E5E1]">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#3A3A38]" />
                    Wishlist & Shopping Database View Configuration
                  </h3>
                  <p className="text-xs text-[#767670] mt-0.5">
                    Customize visible table columns, pricing displays, retailer links, and resizable column widths.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('shopping_table_widths_v2');
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('custom_display_settings_updated', { detail: { section: 'shopping' } }));
                    setResetMsg('Wishlist column widths reset to defaults');
                    setTimeout(() => setResetMsg(null), 3000);
                  }}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-[#D5D5D0] hover:border-[#3A3A38] text-[#1A1A1A] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Column Widths</span>
                </button>
              </div>

              {resetMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {resetMsg}
                </div>
              )}

              {/* Table Style Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Row Density
                  </label>
                  <select
                    value={shopSettings.tableSettings?.density || 'compact'}
                    onChange={(e) => {
                      const curTable = shopSettings.tableSettings || DEFAULT_SHOPPING_TABLE_SETTINGS;
                      updateShoppingDisplay({
                        ...shopSettings,
                        tableSettings: { ...curTable, density: e.target.value as any },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="comfortable">Comfortable (Spacious padding)</option>
                    <option value="compact">Compact (Standard)</option>
                    <option value="dense">Dense (High Information)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Font Scale
                  </label>
                  <select
                    value={shopSettings.tableSettings?.fontSize || 'xs'}
                    onChange={(e) => {
                      const curTable = shopSettings.tableSettings || DEFAULT_SHOPPING_TABLE_SETTINGS;
                      updateShoppingDisplay({
                        ...shopSettings,
                        tableSettings: { ...curTable, fontSize: e.target.value as any },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="xs">Extra Small (11px / Compact)</option>
                    <option value="sm">Small (13px)</option>
                    <option value="base">Base (14px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Text Wrap
                  </label>
                  <select
                    value={shopSettings.tableSettings?.textWrap ? 'wrap' : 'truncate'}
                    onChange={(e) => {
                      const curTable = shopSettings.tableSettings || DEFAULT_SHOPPING_TABLE_SETTINGS;
                      updateShoppingDisplay({
                        ...shopSettings,
                        tableSettings: { ...curTable, textWrap: e.target.value === 'wrap' },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  >
                    <option value="truncate">Truncate (Single line with ellipsis)</option>
                    <option value="wrap">Wrap (Multi-line full visibility)</option>
                  </select>
                </div>
              </div>

              {/* Column Visibility Grid */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2.5">
                  Wishlist Table Column Visibility
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'showImage', label: 'Photo Thumbnail' },
                    { key: 'showName', label: 'Item Name / Title' },
                    { key: 'showBrand', label: 'Brand / Designer' },
                    { key: 'showCategory', label: 'Category' },
                    { key: 'showEstimatedPrice', label: 'Estimated Budget Price' },
                    { key: 'showActualPrice', label: 'Actual Price Paid' },
                    { key: 'showStatus', label: 'Acquisition Status' },
                    { key: 'showPriority', label: 'Priority / Urgency' },
                    { key: 'showPlannedUsage', label: 'Planned Usage / Wardrobe Gap' },
                    { key: 'showRetailer', label: 'Retailer / Store' },
                    { key: 'showSeason', label: 'Season' },
                    { key: 'showUrl', label: 'Store Link / URL' },
                    { key: 'showVintedDetails', label: 'Vinted Ref / Order #' },
                    { key: 'showMatchingItems', label: 'Wardrobe Pairings' },
                    { key: 'showCostPerWear', label: 'Estimated Cost Per Wear' },
                    { key: 'showTags', label: 'Custom Tags' },
                    { key: 'showDates', label: 'Added Date' },
                    { key: 'showActions', label: 'Quick Action Buttons' },
                  ].map((col) => {
                    const curTable = shopSettings.tableSettings || DEFAULT_SHOPPING_TABLE_SETTINGS;
                    const isChecked = (curTable as any)[col.key] ?? true;
                    return (
                      <label
                        key={col.key}
                        className={`p-2.5 border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-white border-[#3A3A38]' : 'bg-[#FAF9F5] border-[#E5E5E1] opacity-60'
                        }`}
                      >
                        <span className="text-xs font-mono text-[#1A1A1A]">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            updateShoppingDisplay({
                              ...shopSettings,
                              tableSettings: { ...curTable, [col.key]: e.target.checked },
                            });
                          }}
                          className="accent-[#3A3A38] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Resale Database Table View Settings */}
          {activeTab === 'resale_table' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between bg-[#FAF9F5] p-4 border border-[#E5E5E1]">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#007782]" />
                    Resale Studio Database View Configuration
                  </h3>
                  <p className="text-xs text-[#767670] mt-0.5">
                    Customize visible table columns, profit tracking, logistics/tracking numbers, and resizable column widths.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('selling_table_widths_v2');
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('custom_display_settings_updated', { detail: { section: 'selling' } }));
                    setResetMsg('Resale column widths reset to defaults');
                    setTimeout(() => setResetMsg(null), 3000);
                  }}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-[#D5D5D0] hover:border-[#007782] text-[#1A1A1A] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#007782]" />
                  <span>Reset Column Widths</span>
                </button>
              </div>

              {resetMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {resetMsg}
                </div>
              )}

              {/* Table Style Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Row Density
                  </label>
                  <select
                    value={sellSettings.tableSettings?.density || 'compact'}
                    onChange={(e) => {
                      const curTable = sellSettings.tableSettings || DEFAULT_SELLING_TABLE_SETTINGS;
                      updateSellingDisplay({
                        ...sellSettings,
                        tableSettings: { ...curTable, density: e.target.value as any },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#007782] focus:outline-hidden"
                  >
                    <option value="comfortable">Comfortable (Spacious padding)</option>
                    <option value="compact">Compact (Standard)</option>
                    <option value="dense">Dense (High Information)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Font Scale
                  </label>
                  <select
                    value={sellSettings.tableSettings?.fontSize || 'xs'}
                    onChange={(e) => {
                      const curTable = sellSettings.tableSettings || DEFAULT_SELLING_TABLE_SETTINGS;
                      updateSellingDisplay({
                        ...sellSettings,
                        tableSettings: { ...curTable, fontSize: e.target.value as any },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#007782] focus:outline-hidden"
                  >
                    <option value="xs">Extra Small (11px / Compact)</option>
                    <option value="sm">Small (13px)</option>
                    <option value="base">Base (14px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                    Text Wrap
                  </label>
                  <select
                    value={sellSettings.tableSettings?.textWrap ? 'wrap' : 'truncate'}
                    onChange={(e) => {
                      const curTable = sellSettings.tableSettings || DEFAULT_SELLING_TABLE_SETTINGS;
                      updateSellingDisplay({
                        ...sellSettings,
                        tableSettings: { ...curTable, textWrap: e.target.value === 'wrap' },
                      });
                    }}
                    className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 focus:border-[#007782] focus:outline-hidden"
                  >
                    <option value="truncate">Truncate (Single line with ellipsis)</option>
                    <option value="wrap">Wrap (Multi-line full visibility)</option>
                  </select>
                </div>
              </div>

              {/* Column Visibility Grid */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2.5">
                  Resale Table Column Visibility
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'showImage', label: 'Photo Thumbnail' },
                    { key: 'showItem', label: 'Garment Title & Brand' },
                    { key: 'showPlatform', label: 'Selling Platform' },
                    { key: 'showStatus', label: 'Listing Status' },
                    { key: 'showCategory', label: 'Category' },
                    { key: 'showOriginalPrice', label: 'Original Cost Paid' },
                    { key: 'showListingPrice', label: 'Asking / Listing Price' },
                    { key: 'showSoldPrice', label: 'Sold Price' },
                    { key: 'showNetProfit', label: 'Net Profit & ROI' },
                    { key: 'showBuyerTracking', label: 'Buyer & Tracking #' },
                    { key: 'showCourier', label: 'Shipping Courier' },
                    { key: 'showShippingStatus', label: 'Shipping Status' },
                    { key: 'showTags', label: 'Custom Tags' },
                    { key: 'showActions', label: 'Quick Action Buttons' },
                  ].map((col) => {
                    const curTable = sellSettings.tableSettings || DEFAULT_SELLING_TABLE_SETTINGS;
                    const isChecked = (curTable as any)[col.key] ?? true;
                    return (
                      <label
                        key={col.key}
                        className={`p-2.5 border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-white border-[#007782]' : 'bg-[#FAF9F5] border-[#E5E5E1] opacity-60'
                        }`}
                      >
                        <span className="text-xs font-mono text-[#1A1A1A]">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            updateSellingDisplay({
                              ...sellSettings,
                              tableSettings: { ...curTable, [col.key]: e.target.checked },
                            });
                          }}
                          className="accent-[#007782] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Inline Editing & Draggable Fields */}
          {activeTab === 'inline' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#FAF9F5] border border-[#E5E5E1] space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Universal Inline & Draggable Editing
                    </h4>
                    <p className="text-xs text-[#767670] mt-0.5">
                      Enable clicking on text, prices, categories, and notes across any table to edit and expand input width freely.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.inlineEditingEnabled}
                      onChange={(e) => updateSettings({ inlineEditingEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#E5E5E1] peer-focus:outline-hidden peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#CCCCCC] after:border after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A1A1A]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E5E1]">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                      Inline Edit Trigger Action
                    </label>
                    <select
                      value={settings.inlineEditTrigger}
                      onChange={(e) => updateSettings({ inlineEditTrigger: e.target.value as any })}
                      disabled={!settings.inlineEditingEnabled}
                      className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 disabled:opacity-50 focus:border-[#1A1A1A] focus:outline-hidden"
                    >
                      <option value="single-click">Single Click / Tap</option>
                      <option value="double-click">Double Click</option>
                      <option value="always-visible">Always Show Edit Badges</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                      Show Hover Pencil Icons
                    </label>
                    <select
                      value={settings.showInlinePencils ? 'yes' : 'no'}
                      onChange={(e) => updateSettings({ showInlinePencils: e.target.value === 'yes' })}
                      disabled={!settings.inlineEditingEnabled}
                      className="w-full text-xs font-mono bg-white border border-[#CCCCCC] p-2 disabled:opacity-50 focus:border-[#1A1A1A] focus:outline-hidden"
                    >
                      <option value="yes">Show hover edit indicator</option>
                      <option value="no">Clean / Subtle (No hover pencils)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Draggable and Resizable Fields Info */}
              <div className="p-4 bg-white border border-[#E5E5E1] space-y-3">
                <div className="flex items-center gap-2">
                  <MoveHorizontal className="w-4 h-4 text-[#8C7355]" />
                  <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Draggable & Resizable Table Text Fields
                  </h4>
                </div>
                <p className="text-xs text-[#767670]">
                  All table header columns and inline text boxes can be resized via dragging:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] space-y-1">
                    <span className="font-bold text-[#1A1A1A] block">1. Draggable Column Headers</span>
                    <span className="text-[#767670] block">
                      Drag the right border handle of any column header to expand or shrink that column. Double click the separator to auto-reset.
                    </span>
                  </div>
                  <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] space-y-1">
                    <span className="font-bold text-[#1A1A1A] block">2. Draggable Inline Text Inputs</span>
                    <span className="text-[#767670] block">
                      When editing garment names, notes, or justification reasons, drag the bottom-right handle of the input box to resize it horizontally and vertically.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Categories */}
          {activeTab === 'categories' && (
            <div className="space-y-5">
              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name (e.g. Tailoring, Knitwear, Loungewear)..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 text-xs font-mono border border-[#CCCCCC] p-2.5 focus:border-[#1A1A1A] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold bg-[#1A1A1A] hover:bg-[#333] text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </form>

              {/* Categories list */}
              <div className="border border-[#E5E5E1] divide-y divide-[#E5E5E1]">
                {categories.map((cat) => {
                  const itemCount = items.filter((i) => i.category === cat).length;
                  const isEditing = editingCat === cat;

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-3 bg-white hover:bg-[#FAF9F5] transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 mr-4">
                          <input
                            type="text"
                            value={editingCatValue}
                            onChange={(e) => setEditingCatValue(e.target.value)}
                            className="text-xs font-mono border border-[#1A1A1A] p-1 flex-1 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCategory(cat)}
                            className="p-1 bg-[#1A1A1A] text-white cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCat(null)}
                            className="p-1 text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-[#1A1A1A]">{cat}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-[#FAF9F5] border border-[#E5E5E1] text-[#767670]">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCat(cat);
                              setEditingCatValue(cat);
                            }}
                            className="px-2.5 py-1 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:border-[#999] cursor-pointer"
                          >
                            Rename
                          </button>
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteCategory(cat)}
                              className="p-1 text-rose-700 hover:text-rose-900 cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetCategories}
                  className="flex items-center gap-1 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Default Categories
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Tags & Brands */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              {/* Tags Manager */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Tag Taxonomy ({allUniqueTags.length} Unique Tags)
                  </h4>
                </div>

                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Create new global tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 text-xs font-mono border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-mono font-bold bg-[#1A1A1A] text-white cursor-pointer"
                  >
                    + Add Tag
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto p-2 border border-[#E5E5E1] bg-[#FAF9F5]">
                  {allUniqueTags.map((tag) => {
                    const isEditing = editingTag === tag;
                    return isEditing ? (
                      <div key={tag} className="flex items-center gap-1 bg-white border border-[#1A1A1A] p-1">
                        <input
                          type="text"
                          value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          className="text-xs font-mono w-24 p-0.5 focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateTag(tag)}
                          className="text-[#1A1A1A] cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTag(null)}
                          className="text-[#767670] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-white border border-[#CCCCCC] text-[#1A1A1A]"
                      >
                        <Tag className="w-3 h-3 text-[#767670]" />
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTag(tag);
                            setEditingTagValue(tag);
                          }}
                          className="ml-1 text-[#767670] hover:text-[#1A1A1A] text-[10px] cursor-pointer"
                          title="Rename globally"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTagGlobally(tag)}
                          className="text-rose-700 hover:text-rose-900 text-[11px] cursor-pointer ml-0.5"
                          title="Remove everywhere"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Brand Renaming & Deduplication */}
              <div className="space-y-3 pt-4 border-t border-[#E5E5E1]">
                <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                  Global Brand Renaming & Deduplication
                </h4>
                <p className="text-xs text-[#767670]">
                  Clean up typos or normalize brand names across all garments, wishlist items, and resale listings.
                </p>

                {brandSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span>{brandSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleBrandRenameSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#767670] mb-1">
                      Existing Brand Name
                    </label>
                    <input
                      type="text"
                      list="brands-datalist"
                      placeholder="e.g. Stussy"
                      value={brandFrom}
                      onChange={(e) => setBrandFrom(e.target.value)}
                      className="w-full text-xs font-mono border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                    />
                    <datalist id="brands-datalist">
                      {allUniqueBrands.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#767670] mb-1">
                      Rename / Merge Into
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stüssy"
                      value={brandTo}
                      onChange={(e) => setBrandTo(e.target.value)}
                      className="w-full text-xs font-mono border border-[#CCCCCC] p-2 focus:border-[#1A1A1A] focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!brandFrom.trim() || !brandTo.trim()}
                      className="px-4 py-2 text-xs font-mono font-bold bg-[#1A1A1A] disabled:opacity-40 text-white cursor-pointer"
                    >
                      Rename Brand Globally
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB: Vinted Cloudflare Worker Integration */}
          {activeTab === 'vinted' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="p-4 bg-[#F0F8F8] border border-[#BCE4E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#007782] text-white flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-serif font-bold text-[#004A52]">
                      Cloudflare Worker: Vinted Account Sync &amp; Active Listings
                    </h3>
                    <p className="text-[11px] text-[#00606A] font-sans mt-0.5 max-w-2xl leading-relaxed">
                      Connect your Cloudflare Worker URL and session tokens to enable automatic syncing of your complete Vinted order history (purchases and sales) as well as live public listing extraction into your closet or resale catalog.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <span
                    className={`px-2 py-1 text-[10px] font-mono font-bold uppercase ${
                      vintedEndpoint ? 'bg-[#E1F2F2] text-[#007782] border border-[#BCE4E6]' : 'bg-[#EFEFEF] text-[#777]'
                    }`}
                  >
                    {vintedEndpoint ? 'Configured' : 'Not Setup'}
                  </span>
                </div>
              </div>

              {/* Status Banner when test run */}
              {vintedTestResult && (
                <div
                  className={`p-3 text-xs font-mono flex items-start gap-2 border ${
                    vintedTestResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {vintedTestResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">
                      {vintedTestResult.success ? 'Worker Connection Verified: ' : 'Connection Warning: '}
                    </span>
                    {vintedTestResult.message}
                  </div>
                </div>
              )}

              {/* Save Success Banner */}
              {vintedSaveSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Vinted Cloudflare Worker settings saved successfully! All credentials updated.</span>
                </div>
              )}

              {/* Worker Setup Boxes */}
              <div className="p-4 bg-white border border-[#E5E5E1] space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#007782]" />
                    <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Worker Endpoint &amp; Region
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!vintedEndpoint.trim()) {
                        setVintedTestResult({ success: false, message: 'Enter your Cloudflare Worker URL first.' });
                        return;
                      }
                      setVintedTesting(true);
                      setVintedTestResult(null);
                      try {
                        const res = await testWorkerConnection(vintedEndpoint.trim());
                        setVintedTestResult(res);
                      } catch (e: any) {
                        setVintedTestResult({ success: false, message: e?.message || 'Worker test failed' });
                      } finally {
                        setVintedTesting(false);
                      }
                    }}
                    disabled={vintedTesting || !vintedEndpoint.trim()}
                    className="px-3 py-1.5 bg-[#F4F4F0] hover:bg-[#EAEAE6] text-[#1A1A1A] border border-[#CCCCCC] text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {vintedTesting ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        Test Connection
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Cloudflare Worker URL *
                    </label>
                    <input
                      type="url"
                      placeholder="https://vinted-api.your-account.workers.dev"
                      value={vintedEndpoint}
                      onChange={(e) => setVintedEndpoint(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F5] border border-[#CCCCCC] focus:border-[#007782] focus:bg-white focus:outline-hidden"
                    />
                    <p className="text-[10px] text-[#767670] mt-1 font-mono">
                      The base HTTPS URL of your deployed Cloudflare Worker handling Vinted API proxy calls.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Vinted Domain
                    </label>
                    <select
                      value={vintedDomain}
                      onChange={(e) => setVintedDomain(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CCCCCC] focus:border-[#007782] focus:outline-hidden"
                    >
                      <option value="co.uk">co.uk (United Kingdom)</option>
                      <option value="com">com (International / US)</option>
                      <option value="fr">fr (France)</option>
                      <option value="de">de (Germany)</option>
                      <option value="it">it (Italy)</option>
                      <option value="es">es (Spain)</option>
                      <option value="pl">pl (Poland)</option>
                      <option value="nl">nl (Netherlands)</option>
                      <option value="be">be (Belgium)</option>
                    </select>
                    <p className="text-[10px] text-[#767670] mt-1 font-mono">
                      Domain suffix used for URLs and orders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Authentication Credentials */}
              <div className="p-4 bg-white border border-[#E5E5E1] space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-2.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#007782]" />
                    <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Vinted Account Session Credentials
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVintedShowTokens(!vintedShowTokens)}
                    className="text-[11px] font-mono text-[#007782] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {vintedShowTokens ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{vintedShowTokens ? 'Hide Tokens' : 'Reveal Tokens'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Access Token (access_token)
                    </label>
                    <input
                      type={vintedShowTokens ? 'text' : 'password'}
                      placeholder="Bearer token or oauth token string"
                      value={vintedAccessToken}
                      onChange={(e) => setVintedAccessToken(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F5] border border-[#CCCCCC] focus:border-[#007782] focus:bg-white focus:outline-hidden"
                    />
                    <p className="text-[10px] text-[#767670] mt-1 font-mono">
                      Used in authorization headers for orders endpoints.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      CSRF Token (xcsrf_token)
                    </label>
                    <input
                      type={vintedShowTokens ? 'text' : 'password'}
                      placeholder="X-CSRF-Token or CSRF string"
                      value={vintedCsrfToken}
                      onChange={(e) => setVintedCsrfToken(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F5] border border-[#CCCCCC] focus:border-[#007782] focus:bg-white focus:outline-hidden"
                    />
                    <p className="text-[10px] text-[#767670] mt-1 font-mono">
                      Used in x-csrf-token verification on Vinted API calls.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Session Cookie (cookie)
                    </label>
                    <input
                      type={vintedShowTokens ? 'text' : 'password'}
                      placeholder="v_sess=...; _vinted_session=...; anon_id=..."
                      value={vintedCookie}
                      onChange={(e) => setVintedCookie(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F5] border border-[#CCCCCC] focus:border-[#007782] focus:bg-white focus:outline-hidden"
                    />
                    <p className="text-[10px] text-[#767670] mt-1 font-mono">
                      Browser session cookie passed to your Cloudflare Worker.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Refresh Token (Optional)
                    </label>
                    <input
                      type={vintedShowTokens ? 'text' : 'password'}
                      placeholder="Optional refresh token string"
                      value={vintedRefreshToken}
                      onChange={(e) => setVintedRefreshToken(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F5] border border-[#CCCCCC] focus:border-[#007782] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Destination & Routing Preferences */}
              <div className="p-4 bg-white border border-[#E5E5E1] space-y-4">
                <div className="flex items-center gap-2 border-b border-[#F0EFEB] pb-2.5">
                  <Sliders className="w-4 h-4 text-[#007782]" />
                  <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Sync Routing &amp; Destination Defaults
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Route Purchased Orders To:
                    </label>
                    <div className="space-y-1.5 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                        <input
                          type="radio"
                          name="purchasedRoute"
                          checked={vintedPurchasedRoute === 'wardrobe'}
                          onChange={() => setVintedPurchasedRoute('wardrobe')}
                          className="text-[#007782] focus:ring-0"
                        />
                        <span>Wardrobe Closet (Active Garment Inventory)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                        <input
                          type="radio"
                          name="purchasedRoute"
                          checked={vintedPurchasedRoute === 'shopping'}
                          onChange={() => setVintedPurchasedRoute('shopping')}
                          className="text-[#007782] focus:ring-0"
                        />
                        <span>Shopping List / Wishlist (Marked as Purchased)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Route Sold Listings To:
                    </label>
                    <p className="text-xs font-mono text-[#767670] mt-2">
                      Resale Manager Archive (Marked as &apos;Sold&apos; with completed transaction price)
                    </p>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-[#F0EFEB]">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={vintedAutoRoute}
                        onChange={(e) => setVintedAutoRoute(e.target.checked)}
                        className="rounded border-[#CCCCCC] text-[#007782] focus:ring-0"
                      />
                      <span>Auto-classify duplicate items and skip re-importing already synced orders</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-[11px] font-mono text-[#767670]">
                  Credentials are encrypted in your local browser sandbox and synced to the worker proxy.
                </p>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({
                        vintedWorkerAuth: {
                          workerEndpoint: vintedEndpoint.trim(),
                          domain: vintedDomain.trim() || 'co.uk',
                          accessToken: vintedAccessToken.trim(),
                          csrfToken: vintedCsrfToken.trim(),
                          cookie: vintedCookie.trim(),
                          refreshToken: vintedRefreshToken.trim(),
                          autoRouteOrders: vintedAutoRoute,
                          defaultImportDestination: vintedPurchasedRoute,
                        },
                      });
                      setVintedSaveSuccess(true);
                      setTimeout(() => setVintedSaveSuccess(false), 3500);
                    }}
                    className="px-5 py-2.5 bg-[#007782] hover:bg-[#005E67] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Vinted Credentials
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Backup & Reset */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Automated Periodic Rollbacks */}
              <div className="p-4 bg-[#FAF9F5] border border-[#E5E5E1] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Automated Periodic Rollbacks &amp; Checkpoints
                    </h4>
                    <p className="text-xs text-[#767670] mt-0.5">
                      Automatically capture silent background snapshots of your closet so you can rewind at any point.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSnapshotEnabled !== false}
                      onChange={(e) => updateSettings({ autoSnapshotEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#CCCCCC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A1A1A]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E5E1]">
                  <div>
                    <label className="block text-xs font-mono text-[#767670] mb-1">
                      Auto-Save Frequency (Minutes)
                    </label>
                    <select
                      value={settings.autoSnapshotIntervalMinutes || 10}
                      onChange={(e) =>
                        updateSettings({ autoSnapshotIntervalMinutes: Number(e.target.value) })
                      }
                      disabled={settings.autoSnapshotEnabled === false}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CCCCCC] disabled:opacity-50"
                    >
                      <option value={2}>Every 2 minutes (High frequency)</option>
                      <option value={5}>Every 5 minutes</option>
                      <option value={10}>Every 10 minutes (Recommended)</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every 60 minutes</option>
                    </select>
                    <p className="text-[10px] text-[#767670] mt-1">
                      Snapshots only trigger if changes have occurred since the last checkpoint.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#767670] mb-1">
                      Max Checkpoints to Keep
                    </label>
                    <select
                      value={settings.maxAutoSnapshots || 20}
                      onChange={(e) =>
                        updateSettings({ maxAutoSnapshots: Number(e.target.value) })
                      }
                      disabled={settings.autoSnapshotEnabled === false}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CCCCCC] disabled:opacity-50"
                    >
                      <option value={10}>Keep latest 10 auto-checkpoints</option>
                      <option value={20}>Keep latest 20 auto-checkpoints (Recommended)</option>
                      <option value={30}>Keep latest 30 auto-checkpoints</option>
                      <option value={50}>Keep latest 50 auto-checkpoints</option>
                    </select>
                    <p className="text-[10px] text-[#767670] mt-1">
                      Older checkpoints automatically rotate out to save browser storage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export JSON */}
              <div className="p-4 bg-[#FAF9F5] border border-[#E5E5E1] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Export Full Wardrobe Backup (JSON)
                  </h4>
                  <p className="text-xs text-[#767670] mt-0.5">
                    Download complete snapshot containing all {items.length} garments, {shoppingList.length} wishlist items, {saleItems.length} listings, lookbooks, and logs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportDataJSON}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold bg-[#1A1A1A] hover:bg-[#333] text-white cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
              </div>

              {/* Import JSON */}
              <div className="p-4 bg-[#FAF9F5] border border-[#E5E5E1] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Restore from JSON Backup File
                    </h4>
                    <p className="text-xs text-[#767670] mt-0.5">
                      Upload a previously exported backup file to restore your wardrobe.
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-medium bg-white hover:bg-[#E5E3DC] text-[#1A1A1A] border border-[#CCCCCC] cursor-pointer">
                  <FolderUp className="w-3.5 h-3.5" />
                  <span>Choose JSON Backup File</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>

                {importStatus && (
                  <div
                    className={`p-2.5 text-xs font-mono border ${
                      importStatus.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {importStatus.message}
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-rose-50 border border-rose-200 space-y-4">
                <div className="flex items-center gap-2 text-rose-900 font-serif font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-700" />
                  <span>Reset & Danger Operations</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        safeConfirm(
                          'Are you sure you want to reset all data back to the default Graeme capsule wardrobe?'
                        )
                      ) {
                        resetToDefaultData();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono bg-white text-rose-800 border border-rose-300 hover:bg-rose-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Default Demo Data
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        safeConfirm(
                          'WARNING: This will erase all wardrobe items, shopping lists, and sales. Are you sure?'
                        )
                      ) {
                        clearDatabase();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono bg-rose-700 hover:bg-rose-800 text-white cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Entire Database
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#E5E5E1] bg-[#FAF9F5]">
          <button
            type="button"
            onClick={resetSettings}
            className="text-xs font-mono text-[#767670] hover:text-[#1A1A1A] underline cursor-pointer"
          >
            Reset Settings to Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-mono font-bold bg-[#1A1A1A] hover:bg-[#333] text-white cursor-pointer"
          >
            Done & Save
          </button>
        </div>
      </div>
    </div>
  );
};
