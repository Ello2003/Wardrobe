import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  LayoutGrid,
  Table as TableIcon,
  Layers,
  Sparkles,
  ShoppingBag,
  Tag,
  DollarSign,
  Calendar,
  Check,
} from 'lucide-react';

export interface ShoppingTableColumnSettings {
  showImage: boolean;
  showName: boolean;
  showBrand: boolean;
  showCategory: boolean;
  showEstimatedPrice: boolean;
  showActualPrice: boolean;
  showStatus: boolean;
  showPriority: boolean;
  showPlannedUsage: boolean;
  showTags: boolean;
  showRetailer: boolean;
  showSeason: boolean;
  showUrl: boolean;
  showVintedDetails: boolean;
  showMatchingItems: boolean;
  showCostPerWear: boolean;
  showDates: boolean;
  showActions: boolean;
}

export interface ShoppingTableDisplaySettings extends ShoppingTableColumnSettings {
  density: 'comfortable' | 'compact' | 'dense';
  fontSize: 'xs' | 'sm' | 'base';
  stickyHeader: boolean;
  zebraStriping: boolean;
  textWrap: boolean;
}

export interface ShoppingDisplaySettings {
  viewMode: 'grid' | 'database';
  density: 'comfortable' | 'compact' | 'dense';

  // Section Toggles
  showStatsBanner: boolean;
  showQuickAddBar: boolean;
  showCategoryFilter: boolean;
  showStatusFilter: boolean;
  showSecondaryFilters: boolean;

  // Card / Grid Field Toggles
  showImage: boolean;
  showBrand: boolean;
  showCategory: boolean;
  showEstimatedPrice: boolean;
  showActualPrice: boolean;
  showPriority: boolean;
  showStatus: boolean;
  showPlannedUsage: boolean;
  showTags: boolean;
  showSeason: boolean;
  showRetailer: boolean;
  showUrl: boolean;
  showVintedDetails: boolean;
  showMatchingItems: boolean;
  showCostPerWear: boolean;
  showDates: boolean;
  showActions: boolean;

  // Dedicated Database / Table View Settings
  tableSettings?: ShoppingTableDisplaySettings;
}

export const DEFAULT_SHOPPING_TABLE_SETTINGS: ShoppingTableDisplaySettings = {
  density: 'compact',
  fontSize: 'xs',
  stickyHeader: true,
  zebraStriping: true,
  textWrap: false,

  showImage: true,
  showName: true,
  showBrand: true,
  showCategory: true,
  showEstimatedPrice: true,
  showActualPrice: true,
  showStatus: true,
  showPriority: true,
  showPlannedUsage: true,
  showTags: true,
  showRetailer: true,
  showSeason: true,
  showUrl: true,
  showVintedDetails: true,
  showMatchingItems: true,
  showCostPerWear: true,
  showDates: true,
  showActions: true,
};

export const DEFAULT_SHOPPING_DISPLAY_SETTINGS: ShoppingDisplaySettings = {
  viewMode: 'grid',
  density: 'comfortable',

  showStatsBanner: true,
  showQuickAddBar: true,
  showCategoryFilter: true,
  showStatusFilter: true,
  showSecondaryFilters: true,

  showImage: true,
  showBrand: true,
  showCategory: true,
  showEstimatedPrice: true,
  showActualPrice: true,
  showPriority: true,
  showStatus: true,
  showPlannedUsage: true,
  showTags: true,
  showSeason: true,
  showRetailer: true,
  showUrl: true,
  showVintedDetails: true,
  showMatchingItems: true,
  showCostPerWear: true,
  showDates: true,
  showActions: true,

  tableSettings: DEFAULT_SHOPPING_TABLE_SETTINGS,
};

export const getShoppingTableSettings = (
  settings: ShoppingDisplaySettings
): ShoppingTableDisplaySettings => {
  return {
    ...DEFAULT_SHOPPING_TABLE_SETTINGS,
    ...(settings.tableSettings || {}),
  };
};

interface ShoppingDisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShoppingDisplaySettings;
  onChange: (updated: ShoppingDisplaySettings) => void;
  onResetColumnWidths?: () => void;
}

export const ShoppingDisplaySettingsModal: React.FC<ShoppingDisplaySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  onResetColumnWidths,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'card' | 'table'>('general');

  if (!isOpen) return null;

  const currentTableSettings = getShoppingTableSettings(settings);

  const toggleKey = (key: keyof ShoppingDisplaySettings) => {
    if (typeof settings[key] === 'boolean') {
      onChange({
        ...settings,
        [key]: !settings[key],
      });
    }
  };

  const toggleTableSetting = (key: keyof ShoppingTableDisplaySettings) => {
    const updatedTable: ShoppingTableDisplaySettings = {
      ...currentTableSettings,
      [key]: !currentTableSettings[key],
    };
    onChange({
      ...settings,
      tableSettings: updatedTable,
    });
  };

  const setTableDensity = (density: 'comfortable' | 'compact' | 'dense') => {
    onChange({
      ...settings,
      tableSettings: {
        ...currentTableSettings,
        density,
      },
    });
  };

  const setTableFontSize = (fontSize: 'xs' | 'sm' | 'base') => {
    onChange({
      ...settings,
      tableSettings: {
        ...currentTableSettings,
        fontSize,
      },
    });
  };

  const applyPreset = (preset: 'all' | 'compact' | 'financial' | 'minimal' | 'table_dense') => {
    if (preset === 'all') {
      onChange(DEFAULT_SHOPPING_DISPLAY_SETTINGS);
    } else if (preset === 'compact') {
      onChange({
        ...DEFAULT_SHOPPING_DISPLAY_SETTINGS,
        showStatsBanner: false,
        showQuickAddBar: false,
        showCategoryFilter: true,
        showStatusFilter: true,
        showSecondaryFilters: true,
        density: 'compact',
        showMatchingItems: false,
        showVintedDetails: false,
      });
    } else if (preset === 'financial') {
      onChange({
        ...DEFAULT_SHOPPING_DISPLAY_SETTINGS,
        viewMode: 'database',
        density: 'compact',
        showStatsBanner: true,
        showQuickAddBar: false,
        showCategoryFilter: true,
        showStatusFilter: true,
        showSecondaryFilters: true,
        showImage: false,
        showPlannedUsage: false,
        showMatchingItems: false,
        showTags: false,
        showVintedDetails: true,
      });
    } else if (preset === 'minimal') {
      onChange({
        ...DEFAULT_SHOPPING_DISPLAY_SETTINGS,
        viewMode: 'grid',
        density: 'compact',
        showStatsBanner: false,
        showQuickAddBar: false,
        showCategoryFilter: true,
        showStatusFilter: true,
        showSecondaryFilters: false,
        showImage: true,
        showBrand: true,
        showCategory: true,
        showEstimatedPrice: true,
        showActualPrice: false,
        showPriority: true,
        showStatus: true,
        showPlannedUsage: false,
        showTags: false,
        showSeason: false,
        showRetailer: false,
        showUrl: false,
        showVintedDetails: false,
        showMatchingItems: false,
        showCostPerWear: false,
        showDates: false,
        showActions: true,
      });
    } else if (preset === 'table_dense') {
      onChange({
        ...settings,
        viewMode: 'database',
        tableSettings: {
          ...currentTableSettings,
          density: 'dense',
          fontSize: 'xs',
          zebraStriping: true,
          textWrap: false,
          stickyHeader: true,
        },
      });
    }
  };

  const sectionToggles: {
    key: keyof ShoppingDisplaySettings;
    label: string;
    description: string;
  }[] = [
    {
      key: 'showStatsBanner',
      label: 'Financial & Budget Metrics Banner',
      description: '4 KPI tiles: Monthly Budget Spend, Active Pipeline Target, Wishlist Volume, Category breakdown',
    },
    {
      key: 'showQuickAddBar',
      label: 'Quick Product URL Auto-Import Bar',
      description: 'Inline input bar for pasting e-commerce product links',
    },
    {
      key: 'showCategoryFilter',
      label: 'Category Filter Tabs',
      description: 'Quick-filter pills for Outerwear, Knitwear, Footwear, etc.',
    },
    {
      key: 'showStatusFilter',
      label: 'Pipeline Status Filter Tabs',
      description: 'Filter between All, To Buy, In Basket, Researching, Purchased, and Sold',
    },
    {
      key: 'showSecondaryFilters',
      label: 'Secondary Filters Toolbar',
      description: 'Search input, Brand dropdown, Priority dropdown, and Sorting controls',
    },
  ];

  const cardFieldToggles: { key: keyof ShoppingDisplaySettings; label: string }[] = [
    { key: 'showImage', label: 'Garment Thumbnail / Photo' },
    { key: 'showBrand', label: 'Brand & Designer Name' },
    { key: 'showCategory', label: 'Category & Subcategory' },
    { key: 'showEstimatedPrice', label: 'Estimated / Target Price (£)' },
    { key: 'showActualPrice', label: 'Actual Price Paid (£)' },
    { key: 'showPriority', label: 'Priority Rating (Essential, High...)' },
    { key: 'showStatus', label: 'Pipeline Status Badge' },
    { key: 'showPlannedUsage', label: 'Planned Usage & Gap Justification' },
    { key: 'showTags', label: 'Custom Tags (#style, #work)' },
    { key: 'showSeason', label: 'Target Season' },
    { key: 'showRetailer', label: 'Retailer & Merchant' },
    { key: 'showUrl', label: 'Store Link / URL' },
    { key: 'showVintedDetails', label: 'Vinted Order & Resale Info' },
    { key: 'showMatchingItems', label: 'Matching Capsule Pieces' },
    { key: 'showCostPerWear', label: 'Projected Cost Per Wear (CPW)' },
    { key: 'showDates', label: 'Acquisition & Update Dates' },
    { key: 'showActions', label: 'Action Buttons (Buy, Edit, Delete)' },
  ];

  const tableColumnToggles: {
    key: keyof ShoppingTableColumnSettings;
    label: string;
    description: string;
  }[] = [
    { key: 'showImage', label: 'Image Thumbnail', description: 'Product preview photo' },
    { key: 'showName', label: 'Item Name', description: 'Title with inline editing' },
    { key: 'showBrand', label: 'Brand Name', description: 'Designer / Brand' },
    { key: 'showCategory', label: 'Category', description: 'Category pill' },
    { key: 'showEstimatedPrice', label: 'Target / Est. Price (£)', description: 'Estimated target price in GBP' },
    { key: 'showActualPrice', label: 'Actual Price Paid (£)', description: 'Final acquisition price' },
    { key: 'showStatus', label: 'Pipeline Status', description: 'To Buy, In Basket, Researching...' },
    { key: 'showPriority', label: 'Priority Rating', description: 'Essential, High, Medium, Low' },
    { key: 'showPlannedUsage', label: 'Planned Usage & Gap Notes', description: 'Wardrobe justification & notes' },
    { key: 'showTags', label: 'Custom Tags', description: 'Hashtag labels with quick edit' },
    { key: 'showRetailer', label: 'Retailer / Merchant', description: 'Store name or vendor' },
    { key: 'showSeason', label: 'Target Season', description: 'Target season badge' },
    { key: 'showUrl', label: 'Store Link / URL', description: 'Direct store web link' },
    { key: 'showVintedDetails', label: 'Provenance / Order ID', description: 'Second-hand reference number' },
    { key: 'showMatchingItems', label: 'Matching Items', description: 'Capsule pairings count' },
    { key: 'showCostPerWear', label: 'Projected CPW', description: 'Cost per wear estimate' },
    { key: 'showDates', label: 'Added Date', description: 'Date item was added' },
    { key: 'showActions', label: 'Action Buttons', description: 'Quick buy, edit, delete shortcuts' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E5E5E1] max-w-2xl w-full p-6 shadow-2xl space-y-5 rounded-lg animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#F8F7F4] text-[#8C7355]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                Purchases &amp; Wishlist Settings
              </h2>
              <p className="text-xs text-[#767670]">
                Configure sections, card fields, and database spreadsheet views independently
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#767670] hover:text-[#1A1A1A] rounded hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode & Configuration Tabs */}
        <div className="flex border-b border-[#E5E5E1] bg-[#F8F7F4] p-1 rounded-md gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-1.5 px-3 text-xs font-mono font-medium rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white text-[#1A1A1A] font-bold shadow-xs border border-[#E5E5E1]'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>General &amp; Sections</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-1.5 px-3 text-xs font-mono font-medium rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'card'
                ? 'bg-white text-[#1A1A1A] font-bold shadow-xs border border-[#E5E5E1]'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Card / Grid View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`flex-1 py-1.5 px-3 text-xs font-mono font-medium rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-white text-[#8C7355] font-bold shadow-xs border border-[#8C7355]/40'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Database / Table View</span>
          </button>
        </div>

        {/* Tab 1: General & Sections */}
        {activeTab === 'general' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 animate-fadeIn">
            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold">
                Quick Layout Presets:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
                >
                  Full Details
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('financial')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
                >
                  Financial Focus
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('compact')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
                >
                  Compact Cards
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('table_dense')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#8C7355] bg-[#FAF9F6] text-[#8C7355] font-bold hover:bg-[#EAE8E3] cursor-pointer"
                >
                  Dense Database
                </button>
              </div>
            </div>

            {/* Section Toggles */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold block">
                Header &amp; Toolbar Areas:
              </label>
              <div className="space-y-2">
                {sectionToggles.map((item) => {
                  const isEnabled = settings[item.key] as boolean;
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleKey(item.key)}
                      className={`flex items-center justify-between p-2.5 border rounded-md cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-[#FAF9F6] border-[#8C7355]/50'
                          : 'bg-[#FDFDFD] border-[#E5E5E1] opacity-70'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#1A1A1A]">
                          {item.label}
                        </div>
                        <p className="text-[11px] text-[#767670] leading-tight mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 ml-3 ${
                          isEnabled ? 'bg-[#8C7355]' : 'bg-[#D5D5D0]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Card / Grid View */}
        {activeTab === 'card' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 animate-fadeIn">
            {/* Card Density */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold">
                Card Density &amp; Sizing:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['comfortable', 'compact', 'dense'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChange({ ...settings, density: d })}
                    className={`py-1.5 text-xs font-mono capitalize border transition-all cursor-pointer ${
                      settings.density === d
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-xs'
                        : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:bg-[#EAE8E3]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Toggles */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold block">
                Visible Card Fields &amp; Badges:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cardFieldToggles.map((item) => {
                  const isEnabled = settings[item.key] as boolean;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleKey(item.key)}
                      className={`flex items-center justify-between p-2 text-xs border rounded-md transition-all text-left cursor-pointer ${
                        isEnabled
                          ? 'bg-white border-[#8C7355]/60 text-[#1A1A1A] font-medium shadow-2xs'
                          : 'bg-[#F8F7F4] border-[#E5E5E1] text-[#8A8A85]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isEnabled ? (
                        <Eye className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#A5A5A0] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Database / Table View */}
        {activeTab === 'table' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 animate-fadeIn">
            {/* Table Row Density & Font Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold">
                  Row Height / Density:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['comfortable', 'compact', 'dense'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTableDensity(d)}
                      className={`py-1 text-xs font-mono capitalize border transition-all cursor-pointer ${
                        currentTableSettings.density === d
                          ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold shadow-xs'
                          : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:bg-[#EAE8E3]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold">
                  Table Font Size:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['xs', 'sm', 'base'] as const).map((fs) => (
                    <button
                      key={fs}
                      type="button"
                      onClick={() => setTableFontSize(fs)}
                      className={`py-1 text-xs font-mono border transition-all cursor-pointer ${
                        currentTableSettings.fontSize === fs
                          ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold shadow-xs'
                          : 'bg-[#F8F7F4] text-[#5A5A55] border-[#E5E5E1] hover:bg-[#EAE8E3]'
                      }`}
                    >
                      {fs === 'xs' ? 'Small' : fs === 'sm' ? 'Standard' : 'Large'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Styling Flags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggleTableSetting('stickyHeader')}
                className={`flex items-center justify-between p-2 text-xs border rounded-md transition-all cursor-pointer ${
                  currentTableSettings.stickyHeader
                    ? 'bg-[#FAF9F6] border-[#8C7355]/60 text-[#1A1A1A] font-medium'
                    : 'bg-white border-[#E5E5E1] text-[#767670]'
                }`}
              >
                <span>Sticky Header</span>
                {currentTableSettings.stickyHeader ? (
                  <Check className="w-3.5 h-3.5 text-[#8C7355]" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-[#A5A5A0]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleTableSetting('zebraStriping')}
                className={`flex items-center justify-between p-2 text-xs border rounded-md transition-all cursor-pointer ${
                  currentTableSettings.zebraStriping
                    ? 'bg-[#FAF9F6] border-[#8C7355]/60 text-[#1A1A1A] font-medium'
                    : 'bg-white border-[#E5E5E1] text-[#767670]'
                }`}
              >
                <span>Zebra Striping</span>
                {currentTableSettings.zebraStriping ? (
                  <Check className="w-3.5 h-3.5 text-[#8C7355]" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-[#A5A5A0]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleTableSetting('textWrap')}
                className={`flex items-center justify-between p-2 text-xs border rounded-md transition-all cursor-pointer ${
                  currentTableSettings.textWrap
                    ? 'bg-[#FAF9F6] border-[#8C7355]/60 text-[#1A1A1A] font-medium'
                    : 'bg-white border-[#E5E5E1] text-[#767670]'
                }`}
              >
                <span>Wrap Text Cells</span>
                {currentTableSettings.textWrap ? (
                  <Check className="w-3.5 h-3.5 text-[#8C7355]" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-[#A5A5A0]" />
                )}
              </button>
            </div>

            {/* Draggable Widths Info & Reset Button */}
            <div className="bg-[#F8F7F4] border border-[#E5E5E1] p-2.5 rounded-md flex items-center justify-between gap-2">
              <div className="text-[11px] text-[#5A5A55]">
                <span className="font-semibold text-[#1A1A1A]">Draggable Column Widths:</span>{' '}
                Drag column borders in the table header to adjust size. Double-click to auto-reset.
              </div>
              {onResetColumnWidths && (
                <button
                  type="button"
                  onClick={onResetColumnWidths}
                  className="px-2 py-1 text-[10px] font-mono border border-[#D5D5D0] bg-white hover:bg-[#FAF9F6] text-[#8C7355] font-semibold shrink-0 cursor-pointer"
                  title="Reset all draggable column widths to default"
                >
                  Reset Widths
                </button>
              )}
            </div>

            {/* Database Column Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold block">
                  Database Table Columns:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allOn: ShoppingTableColumnSettings = {
                        showImage: true,
                        showName: true,
                        showBrand: true,
                        showCategory: true,
                        showEstimatedPrice: true,
                        showActualPrice: true,
                        showStatus: true,
                        showPriority: true,
                        showPlannedUsage: true,
                        showTags: true,
                        showRetailer: true,
                        showSeason: true,
                        showUrl: true,
                        showVintedDetails: true,
                        showMatchingItems: true,
                        showCostPerWear: true,
                        showDates: true,
                        showActions: true,
                      };
                      onChange({
                        ...settings,
                        tableSettings: { ...currentTableSettings, ...allOn },
                      });
                    }}
                    className="text-[10px] font-mono text-[#8C7355] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tableColumnToggles.map((item) => {
                  const isEnabled = currentTableSettings[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleTableSetting(item.key)}
                      className={`flex items-center justify-between p-2 text-xs border rounded-md transition-all text-left cursor-pointer ${
                        isEnabled
                          ? 'bg-white border-[#8C7355]/60 text-[#1A1A1A] font-medium shadow-2xs'
                          : 'bg-[#F8F7F4] border-[#E5E5E1] text-[#8A8A85]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-[10px] text-[#767670]">{item.description}</div>
                      </div>
                      {isEnabled ? (
                        <Eye className="w-3.5 h-3.5 text-[#8C7355] shrink-0 ml-2" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#A5A5A0] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E1]">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SHOPPING_DISPLAY_SETTINGS)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#8C7355] hover:text-[#1A1A1A] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#1A1A1A] hover:bg-[#333333] text-white shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
