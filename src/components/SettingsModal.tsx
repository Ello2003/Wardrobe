import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Sliders,
  DollarSign,
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
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types';
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

  // Sync settings when opened
  useEffect(() => {
    if (isOpen) {
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
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importDataJSON(content);
        setImportStatus(res);
      }
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

          {/* TAB 5: Backup & Reset */}
          {activeTab === 'data' && (
            <div className="space-y-6">
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
                        window.confirm(
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
                        window.confirm(
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
