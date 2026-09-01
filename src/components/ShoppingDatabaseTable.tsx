import React, { useState, useMemo } from 'react';
import {
  ShoppingItem,
  ShoppingPriority,
  ShoppingStatus,
} from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';
import { ResizableHeaderCell } from './ResizableHeaderCell';
import {
  ShoppingDisplaySettings,
  ShoppingTableDisplaySettings,
  getShoppingTableSettings,
} from './ShoppingDisplaySettingsModal';
import { useResizableColumns } from '../hooks/useResizableColumns';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  FolderUp,
  Tag,
  Edit2,
  Trash2,
  ExternalLink,
  Plus,
  X,
  Sparkles,
  Pencil,
  Check,
} from 'lucide-react';

interface ShoppingDatabaseTableProps {
  items: ShoppingItem[];
  selectedItemIds: Set<string>;
  onToggleSelectItem: (id: string, e?: React.SyntheticEvent) => void;
  onSelectAll: () => void;
  areAllSelected: boolean;
  areSomeSelected: boolean;
  displaySettings: ShoppingDisplaySettings;
  onEditItem: (item: ShoppingItem) => void;
  onPurchaseItem: (item: ShoppingItem) => void;
}

type SortField =
  | 'name'
  | 'brand'
  | 'category'
  | 'estimatedPrice'
  | 'actualPricePaid'
  | 'priority'
  | 'status'
  | 'season'
  | 'addedDate';

const DEFAULT_SHOPPING_COLUMN_WIDTHS: Record<string, number> = {
  select: 42,
  image: 60,
  name: 240,
  brand: 140,
  category: 150,
  estimatedPrice: 110,
  actualPrice: 110,
  status: 130,
  priority: 140,
  plannedUsage: 220,
  tags: 180,
  retailer: 130,
  season: 110,
  url: 120,
  vinted: 130,
  matching: 110,
  cpw: 110,
  date: 110,
  actions: 140,
};

export const ShoppingDatabaseTable: React.FC<ShoppingDatabaseTableProps> = ({
  items,
  selectedItemIds,
  onToggleSelectItem,
  onSelectAll,
  areAllSelected,
  areSomeSelected,
  displaySettings,
  onEditItem,
  onPurchaseItem,
}) => {
  const {
    updateShoppingItem,
    deleteShoppingItem,
    moveShoppingItemToWardrobe,
    moveShoppingItemToSales,
    categories,
    formatCurrency,
  } = useWardrobe();

  const tableSettings: ShoppingTableDisplaySettings = getShoppingTableSettings(displaySettings);

  const {
    columnWidths,
    isResizing,
    resizingColumn,
    startResize,
    resetColumnWidth,
    getWidth,
  } = useResizableColumns({
    storageKey: 'shopping_table_widths_v2',
    defaultWidths: DEFAULT_SHOPPING_COLUMN_WIDTHS,
    minWidth: 45,
  });

  const [sortField, setSortField] = useState<SortField>('addedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newTagInputItemId, setNewTagInputItemId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const priorityOrder: Record<ShoppingPriority, number> = {
    'Essential / Must-Have': 4,
    High: 3,
    Medium: 2,
    'Low / Wishlist': 1,
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
        case 'estimatedPrice':
          comparison = (a.estimatedPrice || 0) - (b.estimatedPrice || 0);
          break;
        case 'actualPricePaid':
          comparison = (a.actualPricePaid || 0) - (b.actualPricePaid || 0);
          break;
        case 'priority':
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'season':
          comparison = (a.season || '').localeCompare(b.season || '');
          break;
        case 'addedDate':
          comparison = (a.addedDate || '').localeCompare(b.addedDate || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

  const handleStatusChange = (id: string, newStatus: ShoppingStatus) => {
    updateShoppingItem(id, { status: newStatus });
  };

  const handlePriorityChange = (id: string, newPriority: ShoppingPriority) => {
    updateShoppingItem(id, { priority: newPriority });
  };

  const handleSaveInline = (id: string, field: keyof ShoppingItem) => {
    if (field === 'estimatedPrice' || field === 'actualPricePaid') {
      const num = parseFloat(editingValue);
      if (!isNaN(num) && num >= 0) {
        updateShoppingItem(id, { [field]: num });
      }
    } else if (field === 'name' || field === 'brand' || field === 'reasonOrGap' || field === 'retailerName') {
      if (editingValue.trim()) {
        updateShoppingItem(id, { [field]: editingValue.trim() });
      }
    }
    setEditingCellId(null);
  };

  const handleAddTag = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!item || !newTagText.trim()) {
      setNewTagInputItemId(null);
      setNewTagText('');
      return;
    }
    const cleanTag = newTagText.trim().replace(/^#/, '').toLowerCase();
    const existing = item.tags || [];
    if (!existing.includes(cleanTag)) {
      updateShoppingItem(id, { tags: [...existing, cleanTag] });
    }
    setNewTagInputItemId(null);
    setNewTagText('');
  };

  const handleDeleteTag = (id: string, tagToDelete: string) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    updateShoppingItem(id, {
      tags: (item.tags || []).filter((t) => t !== tagToDelete),
    });
  };

  const getStatusBadgeClass = (status: ShoppingStatus) => {
    switch (status) {
      case 'In Basket':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'To Buy':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Researching':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Purchased':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Sold':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'Passed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityBadgeClass = (priority: ShoppingPriority) => {
    switch (priority) {
      case 'Essential / Must-Have':
        return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
      case 'High':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      case 'Medium':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Low / Wishlist':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
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
        {/* Table Header */}
        <thead
          className={`bg-[#F8F7F4] text-[#5A5A55] font-mono text-[10px] uppercase tracking-wider border-b border-[#E5E5E1] select-none ${
            tableSettings.stickyHeader ? 'sticky top-0 z-30 shadow-2xs' : ''
          }`}
        >
          <tr>
            {/* Multi-select check */}
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
                title={areAllSelected ? 'Deselect all' : 'Select all'}
                aria-label={areAllSelected ? 'Deselect all' : 'Select all'}
              >
                {areAllSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
                {!areAllSelected && areSomeSelected && (
                  <span className="w-2 h-0.5 bg-[#8C7355] block" />
                )}
              </button>
            </ResizableHeaderCell>

            {/* Thumbnail */}
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

            {/* Item Name */}
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
                <span>Item Name</span>
                <SortIcon field="name" />
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

            {/* Estimated Price */}
            {tableSettings.showEstimatedPrice && (
              <ResizableHeaderCell
                columnId="estimatedPrice"
                width={getWidth('estimatedPrice')}
                minWidth={90}
                isResizing={resizingColumn === 'estimatedPrice'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('estimatedPrice')}
                onClick={() => handleSort('estimatedPrice')}
              >
                <span>Est. Price</span>
                <SortIcon field="estimatedPrice" />
              </ResizableHeaderCell>
            )}

            {/* Actual Price */}
            {tableSettings.showActualPrice && (
              <ResizableHeaderCell
                columnId="actualPrice"
                width={getWidth('actualPrice')}
                minWidth={90}
                isResizing={resizingColumn === 'actualPrice'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('actualPrice')}
                onClick={() => handleSort('actualPricePaid')}
              >
                <span>Paid</span>
                <SortIcon field="actualPricePaid" />
              </ResizableHeaderCell>
            )}

            {/* Status */}
            {tableSettings.showStatus && (
              <ResizableHeaderCell
                columnId="status"
                width={getWidth('status')}
                minWidth={110}
                isResizing={resizingColumn === 'status'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('status')}
                onClick={() => handleSort('status')}
              >
                <span>Status</span>
                <SortIcon field="status" />
              </ResizableHeaderCell>
            )}

            {/* Priority */}
            {tableSettings.showPriority && (
              <ResizableHeaderCell
                columnId="priority"
                width={getWidth('priority')}
                minWidth={120}
                isResizing={resizingColumn === 'priority'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('priority')}
                onClick={() => handleSort('priority')}
              >
                <span>Priority</span>
                <SortIcon field="priority" />
              </ResizableHeaderCell>
            )}

            {/* Planned Usage */}
            {tableSettings.showPlannedUsage && (
              <ResizableHeaderCell
                columnId="plannedUsage"
                width={getWidth('plannedUsage')}
                minWidth={140}
                isResizing={resizingColumn === 'plannedUsage'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('plannedUsage')}
              >
                Planned Usage / Gap
              </ResizableHeaderCell>
            )}

            {/* Tags */}
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

            {/* Retailer */}
            {tableSettings.showRetailer && (
              <ResizableHeaderCell
                columnId="retailer"
                width={getWidth('retailer')}
                minWidth={100}
                isResizing={resizingColumn === 'retailer'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('retailer')}
              >
                Retailer
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
                onClick={() => handleSort('season')}
              >
                <span>Season</span>
                <SortIcon field="season" />
              </ResizableHeaderCell>
            )}

            {/* Store URL */}
            {tableSettings.showUrl && (
              <ResizableHeaderCell
                columnId="url"
                width={getWidth('url')}
                minWidth={80}
                isResizing={resizingColumn === 'url'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('url')}
              >
                Link
              </ResizableHeaderCell>
            )}

            {/* Vinted Details */}
            {tableSettings.showVintedDetails && (
              <ResizableHeaderCell
                columnId="vinted"
                width={getWidth('vinted')}
                minWidth={110}
                isResizing={resizingColumn === 'vinted'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('vinted')}
              >
                Vinted Ref
              </ResizableHeaderCell>
            )}

            {/* Matching Items */}
            {tableSettings.showMatchingItems && (
              <ResizableHeaderCell
                columnId="matching"
                width={getWidth('matching')}
                minWidth={90}
                isResizing={resizingColumn === 'matching'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('matching')}
              >
                Match
              </ResizableHeaderCell>
            )}

            {/* Cost Per Wear */}
            {tableSettings.showCostPerWear && (
              <ResizableHeaderCell
                columnId="cpw"
                width={getWidth('cpw')}
                minWidth={90}
                isResizing={resizingColumn === 'cpw'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('cpw')}
              >
                Est CPW
              </ResizableHeaderCell>
            )}

            {/* Date Added */}
            {tableSettings.showDates && (
              <ResizableHeaderCell
                columnId="date"
                width={getWidth('date')}
                minWidth={90}
                isResizing={resizingColumn === 'date'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('date')}
                onClick={() => handleSort('addedDate')}
              >
                <span>Added</span>
                <SortIcon field="addedDate" />
              </ResizableHeaderCell>
            )}

            {/* Actions */}
            {tableSettings.showActions && (
              <ResizableHeaderCell
                columnId="actions"
                width={getWidth('actions')}
                minWidth={110}
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
            const isEditingName = editingCellId === `${item.id}_name`;
            const isEditingBrand = editingCellId === `${item.id}_brand`;
            const isEditingEstPrice = editingCellId === `${item.id}_estimatedPrice`;
            const isEditingActPrice = editingCellId === `${item.id}_actualPricePaid`;
            const isEditingUsage = editingCellId === `${item.id}_reasonOrGap`;
            const isEditingRetailer = editingCellId === `${item.id}_retailerName`;
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
                    title={isSelected ? 'Deselect item' : 'Select item'}
                    aria-label={isSelected ? 'Deselect item' : 'Select item'}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
                  </button>
                </td>

                {/* Thumbnail Image */}
                {tableSettings.showImage && (
                  <td
                    style={{ width: `${getWidth('image')}px` }}
                    className={`${densityPadding} text-center`}
                  >
                    <div
                      onClick={() => onEditItem(item)}
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

                {/* Item Name (Editable & Draggable width) */}
                {tableSettings.showName && (
                  <td
                    style={{
                      width: `${getWidth('name')}px`,
                      maxWidth: `${getWidth('name')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingName ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'name')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'name');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[140px] max-w-[500px] resize-x font-serif font-bold text-[#1A1A1A] border border-[#8C7355] px-1.5 py-0.5 bg-white shadow-2xs rounded-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_name`);
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

                {/* Brand */}
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
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[120px] max-w-[360px] resize-x font-mono font-bold text-[#8C7355] border border-[#8C7355] px-1.5 py-0.5 bg-white shadow-2xs rounded-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_brand`);
                          setEditingValue(item.brand || '');
                        }}
                        className={`font-mono font-bold text-[#8C7355] hover:underline cursor-pointer flex items-center justify-between gap-1 group/field ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit brand inline"
                      >
                        <span className="truncate">{item.brand || '—'}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0" />
                      </div>
                    )}
                  </td>
                )}

                {/* Category */}
                {tableSettings.showCategory && (
                  <td
                    style={{ width: `${getWidth('category')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateShoppingItem(item.id, { category: e.target.value })
                      }
                      className="w-full bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] px-1.5 py-0.5 focus:outline-none focus:border-[#8C7355] cursor-pointer rounded-xs truncate font-mono text-[11px]"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Estimated Price */}
                {tableSettings.showEstimatedPrice && (
                  <td
                    style={{ width: `${getWidth('estimatedPrice')}px` }}
                    className={`${densityPadding}`}
                  >
                    {isEditingEstPrice ? (
                      <div className="flex items-center gap-0.5 w-full">
                        <span className="font-mono text-[#8C7355] font-bold">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveInline(item.id, 'estimatedPrice')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(item.id, 'estimatedPrice');
                            if (e.key === 'Escape') setEditingCellId(null);
                          }}
                          autoFocus
                          className="w-full font-mono font-bold text-[#1A1A1A] border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_estimatedPrice`);
                          setEditingValue(item.estimatedPrice?.toString() || '');
                        }}
                        className="font-mono font-bold text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center gap-1 group/field"
                        title="Click to edit estimated price"
                      >
                        <span>{formatCurrency(item.estimatedPrice)}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0 text-[#8C7355]" />
                      </div>
                    )}
                  </td>
                )}

                {/* Actual Price */}
                {tableSettings.showActualPrice && (
                  <td
                    style={{ width: `${getWidth('actualPrice')}px` }}
                    className={`${densityPadding}`}
                  >
                    {isEditingActPrice ? (
                      <div className="flex items-center gap-0.5 w-full">
                        <span className="font-mono text-emerald-700 font-bold">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveInline(item.id, 'actualPricePaid')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInline(item.id, 'actualPricePaid');
                            if (e.key === 'Escape') setEditingCellId(null);
                          }}
                          autoFocus
                          className="w-full font-mono font-bold text-emerald-700 border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_actualPrice`);
                          setEditingValue(item.actualPricePaid?.toString() || '');
                        }}
                        className="font-mono font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1 group/field"
                        title="Click to edit actual price paid"
                      >
                        <span>
                          {item.actualPricePaid !== undefined ? formatCurrency(item.actualPricePaid) : '—'}
                        </span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0 text-[#8C7355]" />
                      </div>
                    )}
                  </td>
                )}

                {/* Status */}
                {tableSettings.showStatus && (
                  <td
                    style={{ width: `${getWidth('status')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value as ShoppingStatus)
                      }
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border cursor-pointer w-full truncate ${getStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      <option value="To Buy">To Buy</option>
                      <option value="In Basket">In Basket</option>
                      <option value="Researching">Researching</option>
                      <option value="Purchased">Purchased</option>
                      <option value="Sold">Sold</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Passed">Passed</option>
                    </select>
                  </td>
                )}

                {/* Priority */}
                {tableSettings.showPriority && (
                  <td
                    style={{ width: `${getWidth('priority')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.priority}
                      onChange={(e) =>
                        handlePriorityChange(item.id, e.target.value as ShoppingPriority)
                      }
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border cursor-pointer w-full truncate ${getPriorityBadgeClass(
                        item.priority
                      )}`}
                    >
                      <option value="Essential / Must-Have">Essential</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low / Wishlist">Low</option>
                    </select>
                  </td>
                )}

                {/* Planned Usage / Gap Justification (Draggable & Expandable) */}
                {tableSettings.showPlannedUsage && (
                  <td
                    style={{
                      width: `${getWidth('plannedUsage')}px`,
                      maxWidth: `${getWidth('plannedUsage')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingUsage ? (
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'reasonOrGap')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveInline(item.id, 'reasonOrGap');
                          }
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        rows={2}
                        style={{ resize: 'both' }}
                        className="w-full min-w-[160px] max-w-[500px] min-h-[44px] text-xs border border-[#8C7355] p-1 bg-white rounded-xs shadow-2xs resize"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_reasonOrGap`);
                          setEditingValue(item.reasonOrGap || '');
                        }}
                        className={`text-xs text-[#5A5A55] hover:text-[#1A1A1A] cursor-pointer flex items-center justify-between gap-1 group/field ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit planned usage"
                      >
                        <span className={tableSettings.textWrap ? '' : 'truncate'}>
                          {item.reasonOrGap || <span className="text-[#A5A59E] italic">Add notes...</span>}
                        </span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0 text-[#8C7355]" />
                      </div>
                    )}
                  </td>
                )}

                {/* Tags */}
                {tableSettings.showTags && (
                  <td
                    style={{
                      width: `${getWidth('tags')}px`,
                      maxWidth: `${getWidth('tags')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      {(item.tags || []).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.5 bg-[#F2F1ED] border border-[#E5E5E1] rounded-xs"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(item.id, t)}
                            className="text-[#A5A59E] hover:text-rose-600 ml-0.5 cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}

                      {newTagInputItemId === item.id ? (
                        <input
                          type="text"
                          value={newTagText}
                          onChange={(e) => setNewTagText(e.target.value)}
                          onBlur={() => handleAddTag(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag(item.id);
                            if (e.key === 'Escape') setNewTagInputItemId(null);
                          }}
                          autoFocus
                          placeholder="tag..."
                          className="w-14 text-[10px] font-mono border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNewTagInputItemId(item.id);
                            setNewTagText('');
                          }}
                          className="text-[10px] font-mono text-[#8C7355] hover:text-[#1A1A1A] px-1 py-0.5 border border-dashed border-[#D5D5D0] hover:border-[#8C7355] cursor-pointer rounded-xs"
                        >
                          + tag
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {/* Retailer */}
                {tableSettings.showRetailer && (
                  <td
                    style={{
                      width: `${getWidth('retailer')}px`,
                      maxWidth: `${getWidth('retailer')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingRetailer ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'retailerName')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'retailerName');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[120px] max-w-[360px] resize-x text-xs font-mono border border-[#8C7355] px-1.5 py-0.5 bg-white rounded-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_retailerName`);
                          setEditingValue(item.retailerName || '');
                        }}
                        className={`text-xs font-mono text-[#5A5A55] hover:underline cursor-pointer flex items-center justify-between gap-1 group/field ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit retailer"
                      >
                        <span className="truncate">{item.retailerName || '—'}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0" />
                      </div>
                    )}
                  </td>
                )}

                {/* Season */}
                {tableSettings.showSeason && (
                  <td
                    style={{ width: `${getWidth('season')}px` }}
                    className={`${densityPadding} text-xs text-[#767670]`}
                  >
                    <span className={tableSettings.textWrap ? '' : 'truncate block'}>
                      {item.season || 'All-Season'}
                    </span>
                  </td>
                )}

                {/* Store URL */}
                {tableSettings.showUrl && (
                  <td
                    style={{ width: `${getWidth('url')}px` }}
                    className={`${densityPadding}`}
                  >
                    {item.storeUrl ? (
                      <a
                        href={item.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8C7355] hover:underline flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">Store Link</span>
                      </a>
                    ) : (
                      <span className="text-[#A5A59E]">—</span>
                    )}
                  </td>
                )}

                {/* Vinted Reference */}
                {tableSettings.showVintedDetails && (
                  <td
                    style={{
                      width: `${getWidth('vinted')}px`,
                      maxWidth: `${getWidth('vinted')}px`,
                    }}
                    className={`${densityPadding} text-xs font-mono text-[#007782]`}
                  >
                    {item.vintedUrl ? (
                      <a
                        href={item.vintedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {item.orderNumber ? `#${item.orderNumber}` : 'Vinted'}
                        </span>
                      </a>
                    ) : item.orderNumber ? (
                      <span className="truncate block">#{item.orderNumber}</span>
                    ) : (
                      <span className="text-[#A5A59E]">—</span>
                    )}
                  </td>
                )}

                {/* Matching Items */}
                {tableSettings.showMatchingItems && (
                  <td
                    style={{ width: `${getWidth('matching')}px` }}
                    className={`${densityPadding} text-xs font-mono text-center`}
                  >
                    <span className="px-1.5 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] rounded-xs font-semibold">
                      {item.matchingWardrobeItemIds?.length || 0}
                    </span>
                  </td>
                )}

                {/* CPW */}
                {tableSettings.showCostPerWear && (
                  <td
                    style={{ width: `${getWidth('cpw')}px` }}
                    className={`${densityPadding} text-xs font-mono`}
                  >
                    {item.projectedWears && item.estimatedPrice ? (
                      <span>{formatCurrency(item.estimatedPrice / item.projectedWears)}</span>
                    ) : (
                      <span className="text-[#A5A59E]">—</span>
                    )}
                  </td>
                )}

                {/* Added Date */}
                {tableSettings.showDates && (
                  <td
                    style={{ width: `${getWidth('date')}px` }}
                    className={`${densityPadding} text-xs font-mono text-[#767670]`}
                  >
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                  </td>
                )}

                {/* Actions */}
                {tableSettings.showActions && (
                  <td
                    style={{ width: `${getWidth('actions')}px` }}
                    className={`${densityPadding} text-right`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {item.status !== 'Purchased' && (
                        <button
                          type="button"
                          onClick={() => onPurchaseItem(item)}
                          className="p-1 rounded text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Mark Purchased & Transfer to Inventory"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => moveShoppingItemToWardrobe(item.id)}
                        className="p-1 rounded text-[#767670] hover:text-[#8C7355] hover:bg-[#F2F1ED] cursor-pointer"
                        title="Move to Wardrobe Inventory"
                      >
                        <FolderUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="p-1 rounded text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteShoppingItem(item.id)}
                        className="p-1 rounded text-[#767670] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
