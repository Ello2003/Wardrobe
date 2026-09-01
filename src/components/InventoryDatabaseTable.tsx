import React, { useState, useMemo } from 'react';
import {
  WardrobeItem,
  Category,
  Condition,
  Season,
} from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';
import { ResizableHeaderCell } from './ResizableHeaderCell';
import {
  InventoryDisplaySettings,
  InventoryTableDisplaySettings,
  getInventoryTableSettings,
} from './InventoryDisplaySettingsModal';
import { useResizableColumns } from '../hooks/useResizableColumns';
import {
  Check,
  X,
  Pencil,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MapPin,
  Flame,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';

interface InventoryDatabaseTableProps {
  items: WardrobeItem[];
  selectedItemIds: Set<string>;
  onToggleSelectItem: (id: string, e?: React.SyntheticEvent) => void;
  onSelectAll: () => void;
  areAllSelected: boolean;
  areSomeSelected: boolean;
  displaySettings: InventoryDisplaySettings;
  onSelectItem: (item: WardrobeItem) => void;
  onEditItem: (item: WardrobeItem) => void;
  onSellItem?: (item: WardrobeItem) => void;
}

type SortField =
  | 'name'
  | 'brand'
  | 'category'
  | 'purchasePrice'
  | 'wearCount'
  | 'condition'
  | 'purchaseDate';

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  select: 42,
  image: 60,
  name: 240,
  category: 160,
  brand: 140,
  price: 110,
  wearCount: 110,
  condition: 140,
  season: 130,
  color: 110,
  location: 130,
  tags: 200,
  vinted: 160,
  actions: 130,
};

const CONDITIONS: Condition[] = [
  'Pristine / New',
  'Excellent',
  'Good',
  'Vintage / Well-Loved',
];

export const InventoryDatabaseTable: React.FC<InventoryDatabaseTableProps> = ({
  items,
  selectedItemIds,
  onToggleSelectItem,
  onSelectAll,
  areAllSelected,
  areSomeSelected,
  displaySettings,
  onSelectItem,
  onEditItem,
  onSellItem,
}) => {
  const {
    updateItem,
    deleteItem,
    logItemWear,
    categories,
    formatCurrency,
  } = useWardrobe();

  const tableSettings: InventoryTableDisplaySettings = getInventoryTableSettings(displaySettings);

  const {
    columnWidths,
    isResizing,
    resizingColumn,
    startResize,
    resetColumnWidth,
    getWidth,
  } = useResizableColumns({
    storageKey: 'inventory_table_widths_v2',
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidth: 45,
  });

  const [sortField, setSortField] = useState<SortField>('purchaseDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Inline editing states
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Inline tag additions
  const [addingTagItemId, setAddingTagItemId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState('');

  const formatGbp = (amount?: number) => {
    if (amount === undefined || isNaN(amount)) return '£0.00';
    return `£${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'purchasePrice':
          comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0);
          break;
        case 'wearCount':
          comparison = (a.wearCount || 0) - (b.wearCount || 0);
          break;
        case 'condition':
          comparison = (a.condition || '').localeCompare(b.condition || '');
          break;
        case 'purchaseDate':
          comparison = (a.purchaseDate || '').localeCompare(b.purchaseDate || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

  const handleSaveInline = (itemId: string, field: keyof WardrobeItem) => {
    if (!editingFieldId) return;

    if (field === 'purchasePrice') {
      const parsed = parseFloat(editingValue);
      if (!isNaN(parsed) && parsed >= 0) {
        updateItem(itemId, { purchasePrice: parsed });
      }
    } else if (field === 'wearCount') {
      const parsed = parseInt(editingValue, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        updateItem(itemId, { wearCount: parsed });
      }
    } else if (field === 'name' || field === 'brand' || field === 'storageLocation') {
      if (editingValue.trim()) {
        updateItem(itemId, { [field]: editingValue.trim() });
      }
    }
    setEditingFieldId(null);
  };

  const handleQuickCategoryChange = (itemId: string, newCat: string) => {
    updateItem(itemId, { category: newCat });
  };

  const handleAddTag = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !newTagValue.trim()) {
      setAddingTagItemId(null);
      setNewTagValue('');
      return;
    }
    const clean = newTagValue.trim().toLowerCase().replace(/^#/, '');
    const currentTags = Array.isArray(item.tags) ? item.tags : [];
    if (!currentTags.includes(clean)) {
      updateItem(itemId, { tags: [...currentTags, clean] });
    }
    setAddingTagItemId(null);
    setNewTagValue('');
  };

  const handleDeleteTag = (itemId: string, tagToDelete: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const currentTags = Array.isArray(item.tags) ? item.tags : [];
    updateItem(itemId, { tags: currentTags.filter((t) => t !== tagToDelete) });
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[#A5A59E] opacity-60 ml-1 inline shrink-0" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#8C7355] font-bold ml-1 inline shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#8C7355] font-bold ml-1 inline shrink-0" />
    );
  };

  const densityPadding =
    tableSettings.density === 'dense'
      ? 'py-1.5 px-2.5'
      : tableSettings.density === 'compact'
      ? 'py-2 px-3'
      : 'py-3 px-3.5';

  const textSize =
    tableSettings.fontSize === 'xs'
      ? 'text-[11px]'
      : tableSettings.fontSize === 'base'
      ? 'text-sm'
      : 'text-xs';

  return (
    <div
      className={`bg-white border border-[#E5E5E1] shadow-xs overflow-x-auto rounded-sm relative ${
        isResizing ? 'select-none' : ''
      }`}
    >
      <table className={`w-full text-left border-collapse ${textSize} text-[#1A1A1A]`}>
        {/* Resizable Table Header */}
        <thead
          className={`bg-[#F8F7F4] text-[#5A5A55] font-mono text-[10px] uppercase tracking-wider border-b border-[#E5E5E1] select-none ${
            tableSettings.stickyHeader ? 'sticky top-0 z-30 shadow-2xs' : ''
          }`}
        >
          <tr>
            {/* Checkbox Column */}
            <ResizableHeaderCell
              columnId="select"
              width={getWidth('select')}
              minWidth={36}
              align="center"
              isResizing={resizingColumn === 'select'}
              onResizeStart={startResize}
              onDoubleClickReset={() => resetColumnWidth('select')}
              className="bg-[#F8F7F4]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAll();
                }}
                className={`w-4 h-4 border flex items-center justify-center cursor-pointer transition-colors mx-auto ${
                  areAllSelected
                    ? 'bg-[#8C7355] border-[#8C7355] text-white'
                    : areSomeSelected
                    ? 'bg-[#8C7355]/30 border-[#8C7355] text-[#8C7355]'
                    : 'border-[#B0B0A8] bg-white hover:border-[#8C7355]'
                }`}
                title={areAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
                aria-label={areAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
              >
                {areAllSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
                {!areAllSelected && areSomeSelected && (
                  <span className="w-2 h-0.5 bg-[#8C7355] block" />
                )}
              </button>
            </ResizableHeaderCell>

            {/* Garment Image */}
            {tableSettings.showImage && (
              <ResizableHeaderCell
                columnId="image"
                width={getWidth('image')}
                minWidth={45}
                align="center"
                isResizing={resizingColumn === 'image'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('image')}
              >
                Photo
              </ResizableHeaderCell>
            )}

            {/* Garment Title / Name */}
            {tableSettings.showName && (
              <ResizableHeaderCell
                columnId="name"
                width={getWidth('name')}
                minWidth={140}
                isResizing={resizingColumn === 'name'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('name')}
                onClick={() => handleSort('name')}
              >
                <span>Garment Title</span>
                <SortIcon field="name" />
              </ResizableHeaderCell>
            )}

            {/* Category */}
            {tableSettings.showCategory && (
              <ResizableHeaderCell
                columnId="category"
                width={getWidth('category')}
                minWidth={110}
                isResizing={resizingColumn === 'category'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('category')}
                onClick={() => handleSort('category')}
              >
                <span>Category</span>
                <SortIcon field="category" />
              </ResizableHeaderCell>
            )}

            {/* Brand */}
            {tableSettings.showBrand && (
              <ResizableHeaderCell
                columnId="brand"
                width={getWidth('brand')}
                minWidth={100}
                isResizing={resizingColumn === 'brand'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('brand')}
                onClick={() => handleSort('brand')}
              >
                <span>Brand</span>
                <SortIcon field="brand" />
              </ResizableHeaderCell>
            )}

            {/* Purchase Price (£) */}
            {tableSettings.showPrice && (
              <ResizableHeaderCell
                columnId="price"
                width={getWidth('price')}
                minWidth={80}
                isResizing={resizingColumn === 'price'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('price')}
                onClick={() => handleSort('purchasePrice')}
              >
                <span>Price (£)</span>
                <SortIcon field="purchasePrice" />
              </ResizableHeaderCell>
            )}

            {/* Wear Count */}
            {tableSettings.showWearCount && (
              <ResizableHeaderCell
                columnId="wearCount"
                width={getWidth('wearCount')}
                minWidth={80}
                isResizing={resizingColumn === 'wearCount'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('wearCount')}
                onClick={() => handleSort('wearCount')}
              >
                <span>Wears</span>
                <SortIcon field="wearCount" />
              </ResizableHeaderCell>
            )}

            {/* Condition */}
            {tableSettings.showCondition && (
              <ResizableHeaderCell
                columnId="condition"
                width={getWidth('condition')}
                minWidth={110}
                isResizing={resizingColumn === 'condition'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('condition')}
                onClick={() => handleSort('condition')}
              >
                <span>Condition</span>
                <SortIcon field="condition" />
              </ResizableHeaderCell>
            )}

            {/* Season */}
            {tableSettings.showSeason && (
              <ResizableHeaderCell
                columnId="season"
                width={getWidth('season')}
                minWidth={90}
                isResizing={resizingColumn === 'season'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('season')}
              >
                Season
              </ResizableHeaderCell>
            )}

            {/* Color */}
            {tableSettings.showColor && (
              <ResizableHeaderCell
                columnId="color"
                width={getWidth('color')}
                minWidth={80}
                isResizing={resizingColumn === 'color'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('color')}
              >
                Color
              </ResizableHeaderCell>
            )}

            {/* Storage Location */}
            {tableSettings.showLocation && (
              <ResizableHeaderCell
                columnId="location"
                width={getWidth('location')}
                minWidth={100}
                isResizing={resizingColumn === 'location'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('location')}
              >
                Location
              </ResizableHeaderCell>
            )}

            {/* Custom Tags */}
            {tableSettings.showTags && (
              <ResizableHeaderCell
                columnId="tags"
                width={getWidth('tags')}
                minWidth={130}
                isResizing={resizingColumn === 'tags'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('tags')}
              >
                Tags
              </ResizableHeaderCell>
            )}

            {/* Provenance / Vinted Details */}
            {tableSettings.showVintedDetails && (
              <ResizableHeaderCell
                columnId="vinted"
                width={getWidth('vinted')}
                minWidth={110}
                isResizing={resizingColumn === 'vinted'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('vinted')}
              >
                Provenance
              </ResizableHeaderCell>
            )}

            {/* Row Actions */}
            {tableSettings.showActions && (
              <ResizableHeaderCell
                columnId="actions"
                width={getWidth('actions')}
                minWidth={100}
                align="right"
                isResizing={resizingColumn === 'actions'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('actions')}
              >
                Actions
              </ResizableHeaderCell>
            )}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[#E5E5E1]">
          {sortedItems.map((item, idx) => {
            const isEditingBrand = editingFieldId === `${item.id}_brand`;
            const isEditingName = editingFieldId === `${item.id}_name`;
            const isEditingPrice = editingFieldId === `${item.id}_purchasePrice`;
            const isEditingWear = editingFieldId === `${item.id}_wearCount`;
            const isEditingLocation = editingFieldId === `${item.id}_storageLocation`;
            const isSelected = selectedItemIds.has(item.id);

            const rowBg = isSelected
              ? 'bg-amber-50/60'
              : tableSettings.zebraStriping && idx % 2 === 1
              ? 'bg-[#FAF9F6] hover:bg-[#F3F2EE]'
              : 'bg-white hover:bg-[#FAF9F6]';

            return (
              <tr key={item.id} className={`${rowBg} transition-colors group/row`}>
                {/* Multi-Select Checkbox */}
                <td
                  style={{ width: `${getWidth('select')}px` }}
                  className={`${densityPadding} text-center`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => onToggleSelectItem(item.id, e)}
                    className={`w-4 h-4 border flex items-center justify-center cursor-pointer transition-colors mx-auto ${
                      isSelected
                        ? 'bg-[#8C7355] border-[#8C7355] text-white'
                        : 'border-[#B0B0A8] bg-white hover:border-[#8C7355]'
                    }`}
                    title={isSelected ? 'Deselect garment' : 'Select garment'}
                    aria-label={isSelected ? 'Deselect garment' : 'Select garment'}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
                  </button>
                </td>

                {/* Garment Image Thumbnail */}
                {tableSettings.showImage && (
                  <td
                    style={{ width: `${getWidth('image')}px` }}
                    className={`${densityPadding} text-center`}
                  >
                    <div
                      onClick={() => onSelectItem(item)}
                      className="w-9 h-9 rounded overflow-hidden shrink-0 cursor-pointer border border-[#E5E5E1] bg-[#FAF9F6] mx-auto group-hover/row:border-[#8C7355]"
                    >
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full object-contain p-0.5"
                        containerClassName="w-full h-full bg-[#FAF9F6] flex items-center justify-center"
                        showPlaceholderLabel={false}
                      />
                    </div>
                  </td>
                )}

                {/* Garment Name / Title (Inline Editable & Draggable width) */}
                {tableSettings.showName && (
                  <td
                    style={{
                      width: `${getWidth('name')}px`,
                      maxWidth: `${getWidth('name')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingName ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveInline(item.id, 'name')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(item.id, 'name');
                            if (e.key === 'Escape') setEditingFieldId(null);
                          }}
                          autoFocus
                          style={{ resize: 'horizontal' }}
                          className="w-full min-w-[140px] max-w-[500px] resize-x font-serif font-bold text-[#1A1A1A] border border-[#8C7355] px-1.5 py-0.5 bg-white shadow-2xs rounded-xs"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingFieldId(`${item.id}_name`);
                          setEditingValue(item.name);
                        }}
                        className={`font-serif font-semibold text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center justify-between gap-1 group/field ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit name inline"
                      >
                        <span className={tableSettings.textWrap ? '' : 'truncate'}>
                          {item.name}
                        </span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0 text-[#8C7355]" />
                      </div>
                    )}
                  </td>
                )}

                {/* Category (Dropdown Switcher) */}
                {tableSettings.showCategory && (
                  <td
                    style={{ width: `${getWidth('category')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.category}
                      onChange={(e) => handleQuickCategoryChange(item.id, e.target.value)}
                      className="w-full bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] px-1.5 py-0.5 focus:outline-none focus:border-[#8C7355] cursor-pointer rounded-xs truncate font-mono text-[11px]"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Brand (Inline Editable) */}
                {tableSettings.showBrand && (
                  <td
                    style={{
                      width: `${getWidth('brand')}px`,
                      maxWidth: `${getWidth('brand')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingBrand ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'brand')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'brand');
                          if (e.key === 'Escape') setEditingFieldId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[120px] max-w-[360px] resize-x font-mono font-bold text-[#8C7355] border border-[#8C7355] px-1.5 py-0.5 bg-white shadow-2xs rounded-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingFieldId(`${item.id}_brand`);
                          setEditingValue(item.brand);
                        }}
                        className={`font-mono font-bold text-[#8C7355] hover:underline cursor-pointer flex items-center justify-between gap-1 group/field ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit brand inline"
                      >
                        <span className="truncate">{item.brand}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0" />
                      </div>
                    )}
                  </td>
                )}

                {/* Purchase Price (£) (Inline Editable) */}
                {tableSettings.showPrice && (
                  <td
                    style={{ width: `${getWidth('price')}px` }}
                    className={`${densityPadding}`}
                  >
                    {isEditingPrice ? (
                      <div className="flex items-center gap-0.5 w-full">
                        <span className="font-mono text-[#8C7355] font-bold">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveInline(item.id, 'purchasePrice')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(item.id, 'purchasePrice');
                            if (e.key === 'Escape') setEditingFieldId(null);
                          }}
                          autoFocus
                          className="w-full font-mono font-bold text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingFieldId(`${item.id}_purchasePrice`);
                          setEditingValue(item.purchasePrice.toString());
                        }}
                        className="font-mono font-bold text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center gap-1 group/field"
                        title="Click to edit price inline"
                      >
                        <span>{formatGbp(item.purchasePrice)}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0 text-[#8C7355]" />
                      </div>
                    )}
                  </td>
                )}

                {/* Wears & Quick Increment */}
                {tableSettings.showWearCount && (
                  <td
                    style={{ width: `${getWidth('wearCount')}px` }}
                    className={`${densityPadding} font-mono`}
                  >
                    <div className="flex items-center gap-1">
                      {isEditingWear ? (
                        <input
                          type="number"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveInline(item.id, 'wearCount')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(item.id, 'wearCount');
                            if (e.key === 'Escape') setEditingFieldId(null);
                          }}
                          autoFocus
                          className="w-12 font-mono border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingFieldId(`${item.id}_wearCount`);
                            setEditingValue(item.wearCount.toString());
                          }}
                          className="text-[#767670] hover:text-[#1A1A1A] cursor-pointer font-bold"
                          title="Click to edit wear count"
                        >
                          {item.wearCount}x
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => logItemWear(item.id)}
                        className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#F2F1ED] hover:bg-[#8C7355] hover:text-white border border-[#E5E5E1] cursor-pointer rounded-xs"
                        title="Log +1 wear today"
                      >
                        +1
                      </button>
                    </div>
                  </td>
                )}

                {/* Condition */}
                {tableSettings.showCondition && (
                  <td
                    style={{ width: `${getWidth('condition')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.condition}
                      onChange={(e) =>
                        updateItem(item.id, { condition: e.target.value as Condition })
                      }
                      className="w-full bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] px-1.5 py-0.5 focus:outline-none focus:border-[#8C7355] cursor-pointer rounded-xs truncate text-[11px]"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Season */}
                {tableSettings.showSeason && (
                  <td
                    style={{ width: `${getWidth('season')}px` }}
                    className={`${densityPadding} text-[11px] text-[#767670]`}
                  >
                    <span className={tableSettings.textWrap ? '' : 'truncate block'}>
                      {Array.isArray(item.season) ? item.season.join(', ') : (item.season || 'All-Season')}
                    </span>
                  </td>
                )}

                {/* Color */}
                {tableSettings.showColor && (
                  <td
                    style={{ width: `${getWidth('color')}px` }}
                    className={`${densityPadding} text-[11px] text-[#767670]`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {item.colorHex && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      )}
                      <span className="truncate">{item.color}</span>
                    </div>
                  </td>
                )}

                {/* Storage Location */}
                {tableSettings.showLocation && (
                  <td
                    style={{
                      width: `${getWidth('location')}px`,
                      maxWidth: `${getWidth('location')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingLocation ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'storageLocation')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'storageLocation');
                          if (e.key === 'Escape') setEditingFieldId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[120px] max-w-[360px] resize-x text-xs font-mono border border-[#8C7355] px-1.5 py-0.5 bg-white rounded-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingFieldId(`${item.id}_storageLocation`);
                          setEditingValue(item.storageLocation || '');
                        }}
                        className={`text-[11px] font-mono text-[#8C7355] hover:underline cursor-pointer flex items-center gap-1 ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit storage location"
                      >
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item.storageLocation || 'Unassigned'}</span>
                      </div>
                    )}
                  </td>
                )}

                {/* Tags with delete & quick add */}
                {tableSettings.showTags && (
                  <td
                    style={{
                      width: `${getWidth('tags')}px`,
                      maxWidth: `${getWidth('tags')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      {(Array.isArray(item.tags) ? item.tags : []).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] rounded-xs"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(item.id, t)}
                            className="text-[#A5A59E] hover:text-rose-600 ml-0.5 cursor-pointer"
                            title={`Delete tag #${t}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}

                      {addingTagItemId === item.id ? (
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          onBlur={() => handleAddTag(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag(item.id);
                            if (e.key === 'Escape') setAddingTagItemId(null);
                          }}
                          autoFocus
                          placeholder="tag..."
                          className="w-14 text-[10px] font-mono border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingTagItemId(item.id);
                            setNewTagValue('');
                          }}
                          className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] px-1 py-0.5 border border-dashed border-[#D5D5D0] hover:border-[#8C7355] cursor-pointer rounded-xs"
                          title="Add tag"
                        >
                          + tag
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {/* Provenance / Vinted Details */}
                {tableSettings.showVintedDetails && (
                  <td
                    style={{
                      width: `${getWidth('vinted')}px`,
                      maxWidth: `${getWidth('vinted')}px`,
                    }}
                    className={`${densityPadding} text-[11px] font-mono text-[#007782]`}
                  >
                    {item.vintedUrl ? (
                      <a
                        href={item.vintedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1 truncate"
                        title={item.vintedUrl}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {item.orderNumber ? `#${item.orderNumber}` : 'Vinted Link'}
                        </span>
                      </a>
                    ) : item.orderNumber ? (
                      <span className="truncate block">Ref: #{item.orderNumber}</span>
                    ) : (
                      <span className="text-[#A5A59E]">—</span>
                    )}
                  </td>
                )}

                {/* Actions */}
                {tableSettings.showActions && (
                  <td
                    style={{ width: `${getWidth('actions')}px` }}
                    className={`${densityPadding} text-right`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {onSellItem && (
                        <button
                          type="button"
                          onClick={() => onSellItem(item)}
                          className="p-1 rounded text-[#767670] hover:text-[#8C7355] hover:bg-[#F2F1ED] cursor-pointer"
                          title="List for Resale / Selling"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                        className="p-1 rounded text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] cursor-pointer"
                        title="Open Full Edit Modal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="p-1 rounded text-[#767670] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete garment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
