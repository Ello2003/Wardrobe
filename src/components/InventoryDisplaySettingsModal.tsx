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
  Shirt,
  Tag,
  DollarSign,
  Calendar,
  Sparkles,
  Columns3,
  Maximize2,
  ListFilter,
  Check,
} from 'lucide-react';

export interface InventoryTableColumnSettings {
  showImage: boolean;
  showName: boolean;
  showCategory: boolean;
  showBrand: boolean;
  showPrice: boolean;
  showWearCount: boolean;
  showCondition: boolean;
  showSeason: boolean;
  showColor: boolean;
  showLocation: boolean;
  showTags: boolean;
  showVintedDetails: boolean;
  showActions: boolean;
}

export interface InventoryTableDisplaySettings extends InventoryTableColumnSettings {
  density: 'comfortable' | 'compact' | 'dense';
  fontSize: 'xs' | 'sm' | 'base';
  stickyHeader: boolean;
  zebraStriping: boolean;
  textWrap: boolean;
}

export interface InventoryDisplaySettings {
  viewMode?: 'grid' | 'table';

  // Major section toggles
  showStatsBanner: boolean;
  showQuickUrlBar: boolean;
  showCategoryTabs: boolean;
  showFilterBar: boolean;

  // Card / Grid View Field toggles
  showImage: boolean;
  showBrand: boolean;
  showCategory: boolean;
  showPrice: boolean;
  showWearCount: boolean;
  showSeason: boolean;
  showCondition: boolean;
  showTags: boolean;
  showLocation: boolean;
  showVintedDetails: boolean;
  showQuickActions: boolean;

  // Card Density
  density: 'comfortable' | 'compact' | 'dense';

  // Separate Database Table View Settings
  tableSettings?: InventoryTableDisplaySettings;
}

export const DEFAULT_INVENTORY_TABLE_SETTINGS: InventoryTableDisplaySettings = {
  density: 'compact',
  fontSize: 'xs',
  stickyHeader: true,
  zebraStriping: true,
  textWrap: false,

  showImage: true,
  showName: true,
  showCategory: true,
  showBrand: true,
  showPrice: true,
  showWearCount: true,
  showCondition: true,
  showSeason: true,
  showColor: true,
  showLocation: true,
  showTags: true,
  showVintedDetails: true,
  showActions: true,
};

export const DEFAULT_INVENTORY_DISPLAY_SETTINGS: InventoryDisplaySettings = {
  viewMode: 'grid',
  showStatsBanner: true,
  showQuickUrlBar: true,
  showCategoryTabs: true,
  showFilterBar: true,

  showImage: true,
  showBrand: true,
  showCategory: true,
  showPrice: true,
  showWearCount: true,
  showSeason: true,
  showCondition: true,
  showTags: true,
  showLocation: true,
  showVintedDetails: true,
  showQuickActions: true,

  density: 'comfortable',
  tableSettings: DEFAULT_INVENTORY_TABLE_SETTINGS,
};

export const getInventoryTableSettings = (
  settings: InventoryDisplaySettings
): InventoryTableDisplaySettings => {
  return {
    ...DEFAULT_INVENTORY_TABLE_SETTINGS,
    ...(settings.tableSettings || {}),
  };
};

interface InventoryDisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: InventoryDisplaySettings;
  onChange: (updated: InventoryDisplaySettings) => void;
  onResetColumnWidths?: () => void;
}

export const InventoryDisplaySettingsModal: React.FC<InventoryDisplaySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  onResetColumnWidths,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'card' | 'table'>('general');

  if (!isOpen) return null;

  const currentTableSettings = getInventoryTableSettings(settings);

  const toggleKey = (key: keyof InventoryDisplaySettings) => {
    if (typeof settings[key] === 'boolean') {
      onChange({
        ...settings,
        [key]: !settings[key],
      });
    }
  };

  const toggleTableSetting = (key: keyof InventoryTableDisplaySettings) => {
    const updatedTable: InventoryTableDisplaySettings = {
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

  const applyPreset = (preset: 'all' | 'compact' | 'visual' | 'financial' | 'table_dense') => {
    if (preset === 'all') {
      onChange(DEFAULT_INVENTORY_DISPLAY_SETTINGS);
    } else if (preset === 'compact') {
      onChange({
        ...settings,
        showStatsBanner: false,
        showQuickUrlBar: false,
        showCategoryTabs: true,
        showFilterBar: true,
        showImage: true,
        showBrand: true,
        showCategory: true,
        showPrice: true,
        showWearCount: true,
        showSeason: false,
        showCondition: false,
        showTags: false,
        showLocation: false,
        showVintedDetails: false,
        showQuickActions: true,
        density: 'compact',
      });
    } else if (preset === 'visual') {
      onChange({
        ...settings,
        showStatsBanner: true,
        showQuickUrlBar: false,
        showCategoryTabs: true,
        showFilterBar: false,
        showImage: true,
        showBrand: true,
        showCategory: false,
        showPrice: false,
        showWearCount: true,
        showSeason: false,
        showCondition: false,
        showTags: false,
        showLocation: false,
        showVintedDetails: false,
        showQuickActions: true,
        density: 'comfortable',
      });
    } else if (preset === 'financial') {
      onChange({
        ...settings,
        showStatsBanner: true,
        showQuickUrlBar: true,
        showCategoryTabs: true,
        showFilterBar: true,
        showImage: true,
        showBrand: true,
        showCategory: true,
        showPrice: true,
        showWearCount: true,
        showSeason: false,
        showCondition: true,
        showTags: false,
        showLocation: true,
        showVintedDetails: true,
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
    key: keyof InventoryDisplaySettings;
    label: string;
    description: string;
  }[] = [
    {
      key: 'showStatsBanner',
      label: 'Summary Valuation & Wears Banner',
      description: 'Header metric bar displaying garment count, total valuation (£), and wear volume',
    },
    {
      key: 'showQuickUrlBar',
      label: 'Quick Link Auto-Import Bar',
      description: 'Single-line URL input bar for rapid e-commerce product extraction',
    },
    {
      key: 'showCategoryTabs',
      label: 'Category Filter Tabs',
      description: 'Horizontal pill tabs for quick category filtering (Outerwear, Knitwear, Shoes, etc.)',
    },
    {
      key: 'showFilterBar',
      label: 'Secondary Filters Toolbar',
      description: 'Dropdowns for Brand, Season, Condition, and Sort order',
    },
  ];

  const cardFieldToggles: {
    key: keyof InventoryDisplaySettings;
    label: string;
  }[] = [
    { key: 'showImage', label: 'Garment Thumbnail / Photo' },
    { key: 'showBrand', label: 'Brand Name' },
    { key: 'showCategory', label: 'Category & Subcategory' },
    { key: 'showPrice', label: 'Purchase Price (£)' },
    { key: 'showWearCount', label: 'Wear Count & CPW' },
    { key: 'showSeason', label: 'Season Badges' },
    { key: 'showCondition', label: 'Condition Grade' },
    { key: 'showTags', label: 'Custom Tags' },
    { key: 'showLocation', label: 'Storage Location' },
    { key: 'showVintedDetails', label: 'Vinted / Second-Hand Details' },
    { key: 'showQuickActions', label: 'Action Buttons (Wear, Edit, Sell, Delete)' },
  ];

  const tableColumnToggles: {
    key: keyof InventoryTableColumnSettings;
    label: string;
    description: string;
  }[] = [
    { key: 'showImage', label: 'Garment Thumbnail', description: 'Small preview image' },
    { key: 'showName', label: 'Garment Title / Name', description: 'Item name with inline edit' },
    { key: 'showCategory', label: 'Category & Subcategory', description: 'Category pill with inline selector' },
    { key: 'showBrand', label: 'Brand & Designer', description: 'Brand name with inline edit' },
    { key: 'showPrice', label: 'Purchase Price (£)', description: 'Price in GBP with inline edit' },
    { key: 'showWearCount', label: 'Wear Count & +1 Logger', description: 'Wear tracker with quick +1 button' },
    { key: 'showCondition', label: 'Condition Grade', description: 'Condition dropdown selector' },
    { key: 'showSeason', label: 'Target Season', description: 'Spring, Summer, Autumn, Winter tags' },
    { key: 'showColor', label: 'Garment Color', description: 'Color name & preview dot' },
    { key: 'showLocation', label: 'Storage Location', description: 'Wardrobe rack or bin location' },
    { key: 'showTags', label: 'Custom Tags', description: 'Hashtag badges with add/delete' },
    { key: 'showVintedDetails', label: 'Provenance / Vinted Details', description: 'Order ID or external URL' },
    { key: 'showActions', label: 'Row Action Buttons', description: 'Wear, Sell, Edit, Delete shortcuts' },
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
                Inventory Display &amp; Database Settings
              </h2>
              <p className="text-xs text-[#767670]">
                Configure grid cards, section bars, and database spreadsheet views independently
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
                  onClick={() => applyPreset('compact')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
                >
                  Compact Cards
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('visual')}
                  className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
                >
                  Visual Lookbook
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

            {/* Garment Card Field Toggles */}
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
            {/* Table Row Density */}
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

            {/* Table Styling & Feature Flags */}
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

            {/* Column Draggable Resizing Hint & Reset Button */}
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
                      const allOn: InventoryTableColumnSettings = {
                        showImage: true,
                        showName: true,
                        showCategory: true,
                        showBrand: true,
                        showPrice: true,
                        showWearCount: true,
                        showCondition: true,
                        showSeason: true,
                        showColor: true,
                        showLocation: true,
                        showTags: true,
                        showVintedDetails: true,
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
            onClick={() => onChange(DEFAULT_INVENTORY_DISPLAY_SETTINGS)}
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
