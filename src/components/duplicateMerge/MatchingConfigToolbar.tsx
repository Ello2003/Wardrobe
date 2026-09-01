import React from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table,
  Filter,
  Check,
  Ban,
  Tag,
  Palette,
  Layers,
  Sparkles,
  Info,
  Archive,
} from 'lucide-react';
import {
  MatchPreset,
  MatchParametersConfig,
  ItemSource,
} from './duplicateMergeTypes';

interface MatchingConfigToolbarProps {
  scope: 'all' | 'wardrobe' | 'shopping' | 'selling';
  setScope: (s: 'all' | 'wardrobe' | 'shopping' | 'selling') => void;
  matchPreset: MatchPreset;
  setMatchPreset: (p: MatchPreset) => void;
  config: MatchParametersConfig;
  setConfig: React.Dispatch<React.SetStateAction<MatchParametersConfig>>;
  isConfigExpanded: boolean;
  setIsConfigExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  viewMode: 'cards' | 'matrix';
  setViewMode: (v: 'cards' | 'matrix') => void;
  searchFilter: string;
  setSearchFilter: (s: string) => void;
  statusFilter: 'all' | 'active_only' | 'exclude_cancelled' | 'cancelled_passed' | 'purchased_sold';
  setStatusFilter: (st: 'all' | 'active_only' | 'exclude_cancelled' | 'cancelled_passed' | 'purchased_sold') => void;
  selectedTagFilter: string | null;
  setSelectedTagFilter: (t: string | null) => void;
  allAvailableTags: string[];
}

export const MatchingConfigToolbar: React.FC<MatchingConfigToolbarProps> = ({
  scope,
  setScope,
  matchPreset,
  setMatchPreset,
  config,
  setConfig,
  isConfigExpanded,
  setIsConfigExpanded,
  viewMode,
  setViewMode,
  searchFilter,
  setSearchFilter,
  statusFilter,
  setStatusFilter,
  selectedTagFilter,
  setSelectedTagFilter,
  allAvailableTags,
}) => {
  const presets: Array<{ id: MatchPreset; label: string; desc: string }> = [
    { id: 'standard', label: 'Standard', desc: 'Brand + Title + Colour Family' },
    { id: 'brand_consolidator', label: 'Brand & Garment Consolidator', desc: 'Merge all instances of same brand (e.g. Finamore) into 1 tile' },
    { id: 'strict', label: 'Strict Specs', desc: 'Brand + Title + Exact Colour + Size + Material + Status' },
    { id: 'active_only', label: 'Active Items Only', desc: 'Auto-excludes Cancelled, Passed & Archived' },
    { id: 'tags_style', label: 'Tag & Style Clones', desc: 'Shared Tags + Category + Colour Family' },
    { id: 'style_model', label: 'Model & Colourways', desc: 'Same Model across all colours & sizes' },
    { id: 'location_storage', label: 'Storage & Location', desc: 'Same Storage Bin / Closet Location' },
    { id: 'cross_collection', label: 'Cross-Collection', desc: 'Detects duplicates between Closet, Wishlist & Resale' },
    { id: 'fuzzy', label: 'Fuzzy Title', desc: 'Smart keyword & token stripping' },
    { id: 'custom', label: 'Custom Rules', desc: 'Manual parameter switches' },
  ];

  const updateConfigField = <K extends keyof MatchParametersConfig>(
    key: K,
    val: MatchParametersConfig[K]
  ) => {
    setMatchPreset('custom');
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="bg-[#FAF9F6] border-b border-[#E5E5E1] p-3 sm:p-4 space-y-3 shrink-0">
      {/* Row 1: Search, Scope, Status Filter, View Mode Toggle, Granular Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search items by brand, title, colour, or tag..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D5D5D0] rounded-xs text-xs font-mono text-[#1A1A1A] placeholder-[#767670] focus:outline-none focus:border-[#8C7355]"
          />
          <Filter className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#767670]" />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-2 text-[#767670] hover:text-[#1A1A1A] text-xs font-mono"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-1 bg-white border border-[#D5D5D0] p-0.5 rounded-xs text-xs font-mono">
          {(['all', 'wardrobe', 'shopping', 'selling'] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScope(sc)}
              className={`px-2 py-1 rounded-xs transition-colors cursor-pointer capitalize ${
                scope === sc
                  ? 'bg-[#8C7355] text-white font-bold'
                  : 'text-[#5A5A55] hover:text-[#1A1A1A]'
              }`}
            >
              {sc === 'all' ? 'All Collections' : sc === 'wardrobe' ? 'Wardrobe' : sc === 'shopping' ? 'Wishlist' : 'Resale'}
            </button>
          ))}
        </div>

        {/* Status Discrimination Filter Dropdown */}
        <div className="flex items-center gap-1 bg-white border border-[#D5D5D0] px-2 py-1 rounded-xs text-xs font-mono">
          <Ban className="w-3.5 h-3.5 text-[#8C7355]" />
          <span className="text-[#767670]">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-transparent text-xs font-mono font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses (Include Everything)</option>
            <option value="active_only">Active Only (Hide Cancelled &amp; Archived)</option>
            <option value="exclude_cancelled">Exclude Cancelled &amp; Passed</option>
            <option value="cancelled_passed">Cancelled &amp; Passed Only</option>
            <option value="purchased_sold">Purchased &amp; Sold Only</option>
          </select>
        </div>

        {/* Right side: View Mode & Config Drawer Toggle */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center bg-white border border-[#D5D5D0] rounded-xs p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1 rounded-xs cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#8C7355] text-white' : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
              title="Side-by-side Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`p-1 rounded-xs cursor-pointer ${
                viewMode === 'matrix' ? 'bg-[#8C7355] text-white' : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
              title="Comparison Matrix Table"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigExpanded((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded-xs transition-colors cursor-pointer ${
              isConfigExpanded
                ? 'bg-[#8C7355] text-white border-[#8C7355]'
                : 'bg-white text-[#1A1A1A] border-[#D5D5D0] hover:bg-[#F2F1ED]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Criteria Engine</span>
            {isConfigExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Row 2: Matching Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
        <span className="text-[#767670] text-[11px] shrink-0 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#8C7355]" />
          Strategy Presets:
        </span>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setMatchPreset(p.id)}
            title={p.desc}
            className={`px-2.5 py-1 rounded-xs shrink-0 transition-all cursor-pointer border text-left ${
              matchPreset === p.id
                ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold shadow-2xs'
                : 'bg-white text-[#5A5A55] border-[#D5D5D0] hover:border-[#8C7355] hover:text-[#1A1A1A]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Row 3: Tag Quick Filter Chips (if any available tags) */}
      {allAvailableTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none pt-1 border-t border-[#E5E5E1]/60">
          <span className="text-[#767670] shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#8C7355]" />
            Tag Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTagFilter(null)}
            className={`px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer ${
              selectedTagFilter === null
                ? 'bg-[#1A1A1A] text-white font-bold'
                : 'bg-white text-[#5A5A55] border border-[#D5D5D0] hover:text-[#1A1A1A]'
            }`}
          >
            All Tags
          </button>
          {allAvailableTags.slice(0, 12).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
              className={`px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer flex items-center gap-1 border ${
                selectedTagFilter === tag
                  ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                  : 'bg-white text-[#5A5A55] border-[#D5D5D0] hover:border-[#8C7355]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Row 4: Expanded Granular Matching Parameters Engine */}
      {isConfigExpanded && (
        <div className="bg-white border border-[#D5D5D0] p-4 rounded-xs text-xs font-mono space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E5E5E1] pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#8C7355]" />
              <h5 className="font-bold text-[#1A1A1A]">Granular Matching Criteria &amp; Discrimination Engine</h5>
            </div>
            <span className="text-[11px] text-[#767670]">
              Toggle specific garment attributes to refine duplicate clustering precision
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Group 1: Core Garment Identity */}
            <div className="space-y-2 bg-[#FAF9F6] p-2.5 rounded-xs border border-[#E5E5E1]">
              <div className="font-bold text-[#8C7355] text-[11px] uppercase tracking-wider">
                Core Garment Identity
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchBrand}
                  onChange={(e) => updateConfigField('matchBrand', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Brand Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchTitle}
                  onChange={(e) => updateConfigField('matchTitle', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Item Name / Title</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchCategory}
                  onChange={(e) => updateConfigField('matchCategory', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Main Category</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchSubcategory}
                  onChange={(e) => updateConfigField('matchSubcategory', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Subcategory (e.g. Oxford vs Linen)</span>
              </label>
            </div>

            {/* Group 2: Colour & Aesthetics */}
            <div className="space-y-2 bg-[#FAF9F6] p-2.5 rounded-xs border border-[#E5E5E1]">
              <div className="font-bold text-[#8C7355] text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3" /> Colour &amp; Style
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-[#767670] block">Colour Matching Rule:</span>
                <select
                  value={config.matchColour}
                  onChange={(e) => updateConfigField('matchColour', e.target.value as any)}
                  className="w-full bg-white border border-[#D5D5D0] px-2 py-1 rounded-xs text-xs font-mono"
                >
                  <option value="strict">Strict (Exact Colour Name)</option>
                  <option value="family">Colour Family (e.g. Navy + Ink)</option>
                  <option value="ignore">Ignore Colour (Find Colourways)</option>
                </select>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-[#767670] block">Tag Overlap Strategy:</span>
                <select
                  value={config.matchTags}
                  onChange={(e) => updateConfigField('matchTags', e.target.value as any)}
                  className="w-full bg-white border border-[#D5D5D0] px-2 py-1 rounded-xs text-xs font-mono"
                >
                  <option value="ignore">Ignore Tags</option>
                  <option value="any_overlap">Shared Tag (Matches 1+ tags)</option>
                  <option value="exact">Exact Tag Match (Identical sets)</option>
                </select>
              </div>
            </div>

            {/* Group 3: Technical Specifications */}
            <div className="space-y-2 bg-[#FAF9F6] p-2.5 rounded-xs border border-[#E5E5E1]">
              <div className="font-bold text-[#8C7355] text-[11px] uppercase tracking-wider">
                Technical Specs
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchSize}
                  onChange={(e) => updateConfigField('matchSize', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Exact Size (e.g. 40R / M / 32)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchMaterial}
                  onChange={(e) => updateConfigField('matchMaterial', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Material (e.g. Cashmere / Silk)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchCondition}
                  onChange={(e) => updateConfigField('matchCondition', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Condition (Pristine, Vintage...)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchSeason}
                  onChange={(e) => updateConfigField('matchSeason', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Season Alignment</span>
              </label>
            </div>

            {/* Group 4: Status Discrimination & Origin */}
            <div className="space-y-2 bg-[#FAF9F6] p-2.5 rounded-xs border border-[#E5E5E1]">
              <div className="font-bold text-[#8C7355] text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Ban className="w-3 h-3" /> Status &amp; Filters
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-[#767670] block">Status Matching:</span>
                <select
                  value={config.matchStatus}
                  onChange={(e) => updateConfigField('matchStatus', e.target.value as any)}
                  className="w-full bg-white border border-[#D5D5D0] px-2 py-1 rounded-xs text-xs font-mono"
                >
                  <option value="ignore">Ignore Status (Compare all)</option>
                  <option value="lifecycle">Same Lifecycle (Active vs Historical)</option>
                  <option value="exact">Exact Status (e.g. Cancelled with Cancelled)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={config.excludeCancelled}
                  onChange={(e) => updateConfigField('excludeCancelled', e.target.checked)}
                  className="accent-rose-600"
                />
                <span className="text-rose-700 font-bold">Auto-Exclude Cancelled / Passed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.excludeArchived}
                  onChange={(e) => updateConfigField('excludeArchived', e.target.checked)}
                  className="accent-stone-600"
                />
                <span className="text-stone-700 font-bold">Auto-Exclude Archived</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchLocation}
                  onChange={(e) => updateConfigField('matchLocation', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Storage Bin / Location</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.matchSeller}
                  onChange={(e) => updateConfigField('matchSeller', e.target.checked)}
                  className="accent-[#8C7355]"
                />
                <span className="text-[#1A1A1A]">Retailer / Platform / Seller</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
