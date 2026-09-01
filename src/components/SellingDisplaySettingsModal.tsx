import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  DollarSign,
  TrendingUp,
  Tag,
  Truck,
  CheckCircle,
  LayoutGrid,
  Table as TableIcon,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

export interface SellingTableColumnSettings {
  showImage: boolean;
  showItem: boolean;
  showPlatform: boolean;
  showStatus: boolean;
  showCategory: boolean;
  showOriginalPrice: boolean;
  showListingPrice: boolean;
  showSoldPrice: boolean;
  showNetProfit: boolean;
  showBuyerTracking: boolean;
  showCourier: boolean;
  showShippingStatus: boolean;
  showTags: boolean;
  showActions: boolean;
}

export interface SellingTableDisplaySettings extends SellingTableColumnSettings {
  density: 'comfortable' | 'compact' | 'dense';
  fontSize: 'xs' | 'sm' | 'base';
  stickyHeader: boolean;
  zebraStriping: boolean;
  textWrap: boolean;
}

export interface SellingDisplaySettings {
  viewMode?: 'grid' | 'table';

  // Major section toggles
  showStatsBanner: boolean;
  showStatusTabs: boolean;
  showFilterBar: boolean;

  // Card / Grid Field toggles
  showImage: boolean;
  showPlatformBadge: boolean;
  showBrand: boolean;
  showCategory: boolean;
  showListingPrice: boolean;
  showOriginalPrice: boolean;
  showProjectedProfit: boolean;
  showSoldPrice: boolean;
  showShippingStatus: boolean;
  showTags: boolean;
  showQuickActions: boolean;

  // Density & Sizing
  density: 'comfortable' | 'compact' | 'dense';

  // Separate Database Table View Settings
  tableSettings?: SellingTableDisplaySettings;
}

export const DEFAULT_SELLING_TABLE_SETTINGS: SellingTableDisplaySettings = {
  density: 'compact',
  fontSize: 'xs',
  stickyHeader: true,
  zebraStriping: true,
  textWrap: false,

  showImage: true,
  showItem: true,
  showPlatform: true,
  showStatus: true,
  showCategory: true,
  showOriginalPrice: true,
  showListingPrice: true,
  showSoldPrice: true,
  showNetProfit: true,
  showBuyerTracking: true,
  showCourier: true,
  showShippingStatus: true,
  showTags: true,
  showActions: true,
};

export const DEFAULT_SELLING_DISPLAY_SETTINGS: SellingDisplaySettings = {
  viewMode: 'grid',
  showStatsBanner: true,
  showStatusTabs: true,
  showFilterBar: true,

  showImage: true,
  showPlatformBadge: true,
  showBrand: true,
  showCategory: true,
  showListingPrice: true,
  showOriginalPrice: true,
  showProjectedProfit: true,
  showSoldPrice: true,
  showShippingStatus: true,
  showTags: true,
  showQuickActions: true,

  density: 'comfortable',
  tableSettings: DEFAULT_SELLING_TABLE_SETTINGS,
};

export const getSellingTableSettings = (
  settings: SellingDisplaySettings
): SellingTableDisplaySettings => {
  return {
    ...DEFAULT_SELLING_TABLE_SETTINGS,
    ...(settings.tableSettings || {}),
  };
};

interface SellingDisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SellingDisplaySettings;
  onChange: (updated: SellingDisplaySettings) => void;
  onResetColumnWidths?: () => void;
}

export const SellingDisplaySettingsModal: React.FC<SellingDisplaySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  onResetColumnWidths,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'card' | 'table'>('general');

  if (!isOpen) return null;

  const currentTableSettings = getSellingTableSettings(settings);

  const toggleKey = (key: keyof SellingDisplaySettings) => {
    if (typeof settings[key] === 'boolean') {
      onChange({
        ...settings,
        [key]: !settings[key],
      });
    }
  };

  const toggleTableSetting = (key: keyof SellingTableDisplaySettings) => {
    const updatedTable: SellingTableDisplaySettings = {
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

  const applyPreset = (preset: 'all' | 'compact' | 'financial' | 'operations' | 'table_dense') => {
    if (preset === 'all') {
      onChange(DEFAULT_SELLING_DISPLAY_SETTINGS);
    } else if (preset === 'compact') {
      onChange({
        ...settings,
        showStatsBanner: false,
        showStatusTabs: true,
        showFilterBar: true,
        showImage: true,
        showPlatformBadge: true,
        showBrand: true,
        showCategory: false,
        showListingPrice: true,
        showOriginalPrice: false,
        showProjectedProfit: true,
        showSoldPrice: true,
        showShippingStatus: false,
        showTags: false,
        showQuickActions: true,
        density: 'compact',
      });
    } else if (preset === 'financial') {
      onChange({
        ...settings,
        showStatsBanner: true,
        showStatusTabs: true,
        showFilterBar: true,
        showImage: false,
        showPlatformBadge: true,
        showBrand: true,
        showCategory: true,
        showListingPrice: true,
        showOriginalPrice: true,
        showProjectedProfit: true,
        showSoldPrice: true,
        showShippingStatus: false,
        showTags: false,
        showQuickActions: true,
        density: 'comfortable',
      });
    } else if (preset === 'operations') {
      onChange({
        ...settings,
        showStatsBanner: true,
        showStatusTabs: true,
        showFilterBar: true,
        showImage: true,
        showPlatformBadge: true,
        showBrand: true,
        showCategory: false,
        showListingPrice: true,
        showOriginalPrice: false,
        showProjectedProfit: false,
        showSoldPrice: true,
        showShippingStatus: true,
        showTags: true,
        showQuickActions: true,
        density: 'comfortable',
      });
    } else if (preset === 'table_dense') {
      onChange({
        ...settings,
        viewMode: 'table',
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
    key: keyof SellingDisplaySettings;
    label: string;
    description: string;
  }[] = [
    {
      key: 'showStatsBanner',
      label: 'Financial Performance Metrics Banner',
      description: 'KPI metrics for Gross Sales, Net Profit P&L, Inventory Valuation, and Active Listings',
    },
    {
      key: 'showStatusTabs',
      label: 'Listing & Sales Pipeline Tabs',
      description: 'Horizontal pill tabs for All, Listed, In Negotiations, Sold, and Archived',
    },
    {
      key: 'showFilterBar',
      label: 'Secondary Filters Toolbar',
      description: 'Dropdowns for Platform (Vinted, Grailed, eBay), Category, Brand, and Sort order',
    },
  ];

  const cardFieldToggles: {
    key: keyof SellingDisplaySettings;
    label: string;
  }[] = [
    { key: 'showImage', label: 'Item Image Thumbnail' },
    { key: 'showPlatformBadge', label: 'Marketplace Platform Badge' },
    { key: 'showBrand', label: 'Brand & Designer Name' },
    { key: 'showCategory', label: 'Category & Classification' },
    { key: 'showListingPrice', label: 'Listing / Asking Price (£)' },
    { key: 'showOriginalPrice', label: 'Original Cost Basis (£)' },
    { key: 'showProjectedProfit', label: 'Net Profit P&L (£ / %)' },
    { key: 'showSoldPrice', label: 'Final Realized Sold Price (£)' },
    { key: 'showShippingStatus', label: 'Fulfillment & Shipping Status' },
    { key: 'showTags', label: 'Custom Tags' },
    { key: 'showQuickActions', label: 'Quick Action Buttons (Sold, Edit, Delete)' },
  ];

  const tableColumnToggles: {
    key: keyof SellingTableColumnSettings;
    label: string;
    description: string;
  }[] = [
    { key: 'showImage', label: 'Item Thumbnail', description: 'Small photo preview' },
    { key: 'showItem', label: 'Item Title & Brand', description: 'Item name and designer brand' },
    { key: 'showPlatform', label: 'Sales Platform', description: 'Vinted, Grailed, eBay, Depop, etc.' },
    { key: 'showStatus', label: 'Listing Status', description: 'Listed, In Negotiations, Sold...' },
    { key: 'showCategory', label: 'Category', description: 'Category pill' },
    { key: 'showOriginalPrice', label: 'Cost Basis (£)', description: 'Purchase price / cost basis' },
    { key: 'showListingPrice', label: 'Listing Price (£)', description: 'Asking price with inline edit' },
    { key: 'showSoldPrice', label: 'Sold Price (£)', description: 'Realized price with inline edit' },
    { key: 'showNetProfit', label: 'Net Profit P&L', description: 'Calculated return on investment' },
    { key: 'showBuyerTracking', label: 'Buyer & Tracking Ref', description: 'Buyer username & tracking number' },
    { key: 'showCourier', label: 'Courier & Carrier', description: 'Evri, Royal Mail, DPD, Yodel...' },
    { key: 'showShippingStatus', label: 'Fulfillment Status', description: 'Pending, Dispatched, Delivered' },
    { key: 'showTags', label: 'Custom Tags', description: 'Hashtags with inline quick edit' },
    { key: 'showActions', label: 'Action Buttons', description: 'Mark sold, edit, and delete shortcuts' },
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
                Sales &amp; Resale Display Settings
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
                  onClick={() => applyPreset('operations')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
                >
                  Shipping &amp; Fulfillment
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
            {/* Card Density Selector */}
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
                      const allOn: SellingTableColumnSettings = {
                        showImage: true,
                        showItem: true,
                        showPlatform: true,
                        showStatus: true,
                        showCategory: true,
                        showOriginalPrice: true,
                        showListingPrice: true,
                        showSoldPrice: true,
                        showNetProfit: true,
                        showBuyerTracking: true,
                        showCourier: true,
                        showShippingStatus: true,
                        showTags: true,
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
            onClick={() => onChange(DEFAULT_SELLING_DISPLAY_SETTINGS)}
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
