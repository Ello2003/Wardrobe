import React, { useState, useMemo } from 'react';
import { SaleItem, SellingStatus, SellingPlatform, ShippingStatus } from '../types';
import { useWardrobe } from '../context/WardrobeContext';
import { GarmentImage } from './GarmentImage';
import { ResizableHeaderCell } from './ResizableHeaderCell';
import {
  SellingDisplaySettings,
  SellingTableDisplaySettings,
  getSellingTableSettings,
} from './SellingDisplaySettingsModal';
import { useResizableColumns } from '../hooks/useResizableColumns';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Truck,
  Package,
  Edit2,
  Trash2,
  ExternalLink,
  Plus,
  X,
  Pencil,
  Check,
  FolderUp,
} from 'lucide-react';

interface SellingDatabaseTableProps {
  items: SaleItem[];
  selectedItemIds: Set<string>;
  onToggleSelectItem: (id: string, e?: React.SyntheticEvent) => void;
  onSelectAll: () => void;
  areAllSelected: boolean;
  areSomeSelected: boolean;
  displaySettings: SellingDisplaySettings;
  onEditItem: (item: SaleItem) => void;
  onMarkSold: (item: SaleItem) => void;
}

type SortField =
  | 'name'
  | 'brand'
  | 'category'
  | 'platform'
  | 'status'
  | 'listingPrice'
  | 'originalPricePaid'
  | 'soldPrice'
  | 'profit'
  | 'listedDate';

const DEFAULT_SELLING_COLUMN_WIDTHS: Record<string, number> = {
  select: 42,
  image: 60,
  item: 240,
  platform: 120,
  status: 130,
  category: 140,
  originalPrice: 100,
  listingPrice: 110,
  soldPrice: 110,
  netProfit: 120,
  buyerTracking: 200,
  courier: 120,
  shippingStatus: 130,
  tags: 180,
  actions: 140,
};

const PLATFORMS: SellingPlatform[] = [
  'Vinted',
  'Grailed',
  'eBay',
  'Depop',
  'Vestiaire Collective',
  'Direct / Private',
  'Other',
];

const SALE_STATUSES: SellingStatus[] = [
  'Draft',
  'Listed',
  'Reserved',
  'Sold',
  'Shipped',
  'Completed',
  'Delisted',
];

const SHIPPING_STATUSES: ShippingStatus[] = [
  'Not Required',
  'To Pack',
  'Shipped',
  'In Transit',
  'Delivered',
];

export const SellingDatabaseTable: React.FC<SellingDatabaseTableProps> = ({
  items,
  selectedItemIds,
  onToggleSelectItem,
  onSelectAll,
  areAllSelected,
  areSomeSelected,
  displaySettings,
  onEditItem,
  onMarkSold,
}) => {
  const {
    updateSaleItem,
    deleteSaleItem,
    moveSaleItemToWardrobe,
    moveSaleItemToShopping,
    formatCurrency,
  } = useWardrobe();

  const tableSettings: SellingTableDisplaySettings = getSellingTableSettings(displaySettings);

  const {
    columnWidths,
    isResizing,
    resizingColumn,
    startResize,
    resetColumnWidth,
    getWidth,
  } = useResizableColumns({
    storageKey: 'selling_table_widths_v2',
    defaultWidths: DEFAULT_SELLING_COLUMN_WIDTHS,
    minWidth: 45,
  });

  const [sortField, setSortField] = useState<SortField>('listedDate');
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

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'platform':
          comparison = (a.platform || '').localeCompare(b.platform || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'listingPrice':
          comparison = (a.listingPrice || 0) - (b.listingPrice || 0);
          break;
        case 'originalPricePaid':
          comparison = (a.originalPricePaid || 0) - (b.originalPricePaid || 0);
          break;
        case 'soldPrice':
          comparison = (a.soldPrice || 0) - (b.soldPrice || 0);
          break;
        case 'profit': {
          const profitA = (a.soldPrice || a.listingPrice || 0) - (a.originalPricePaid || 0);
          const profitB = (b.soldPrice || b.listingPrice || 0) - (b.originalPricePaid || 0);
          comparison = profitA - profitB;
          break;
        }
        case 'listedDate':
          comparison = (a.listedDate || '').localeCompare(b.listedDate || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

  const handleSaveInline = (id: string, field: keyof SaleItem) => {
    if (field === 'listingPrice' || field === 'soldPrice' || field === 'originalPricePaid') {
      const num = parseFloat(editingValue);
      if (!isNaN(num) && num >= 0) {
        updateSaleItem(id, { [field]: num });
      }
    } else if (
      field === 'name' ||
      field === 'brand' ||
      field === 'buyerUsername' ||
      field === 'trackingNumber' ||
      field === 'courier'
    ) {
      updateSaleItem(id, { [field]: editingValue.trim() });
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
      updateSaleItem(id, { tags: [...existing, cleanTag] });
    }
    setNewTagInputItemId(null);
    setNewTagText('');
  };

  const handleDeleteTag = (id: string, tagToDelete: string) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    updateSaleItem(id, {
      tags: (item.tags || []).filter((t) => t !== tagToDelete),
    });
  };

  const getStatusBadge = (status: SellingStatus) => {
    switch (status) {
      case 'Listed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Reserved':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Sold':
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Shipped':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Delisted':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
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

            {/* Image Thumbnail */}
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

            {/* Item Title & Brand */}
            {tableSettings.showItem && (
              <ResizableHeaderCell
                columnId="item"
                width={getWidth('item')}
                minWidth={140}
                isResizing={resizingColumn === 'item'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('item')}
                onClick={() => handleSort('name')}
              >
                <span>Item &amp; Brand</span>
                <SortIcon field="name" />
              </ResizableHeaderCell>
            )}

            {/* Platform */}
            {tableSettings.showPlatform && (
              <ResizableHeaderCell
                columnId="platform"
                width={getWidth('platform')}
                minWidth={100}
                isResizing={resizingColumn === 'platform'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('platform')}
                onClick={() => handleSort('platform')}
              >
                <span>Platform</span>
                <SortIcon field="platform" />
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

            {/* Category */}
            {tableSettings.showCategory && (
              <ResizableHeaderCell
                columnId="category"
                width={getWidth('category')}
                minWidth={100}
                isResizing={resizingColumn === 'category'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('category')}
                onClick={() => handleSort('category')}
              >
                <span>Category</span>
                <SortIcon field="category" />
              </ResizableHeaderCell>
            )}

            {/* Cost Basis (Original Price) */}
            {tableSettings.showOriginalPrice && (
              <ResizableHeaderCell
                columnId="originalPrice"
                width={getWidth('originalPrice')}
                minWidth={80}
                isResizing={resizingColumn === 'originalPrice'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('originalPrice')}
                onClick={() => handleSort('originalPricePaid')}
              >
                <span>Cost (£)</span>
                <SortIcon field="originalPricePaid" />
              </ResizableHeaderCell>
            )}

            {/* Listing Price */}
            {tableSettings.showListingPrice && (
              <ResizableHeaderCell
                columnId="listingPrice"
                width={getWidth('listingPrice')}
                minWidth={80}
                isResizing={resizingColumn === 'listingPrice'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('listingPrice')}
                onClick={() => handleSort('listingPrice')}
              >
                <span>Asking (£)</span>
                <SortIcon field="listingPrice" />
              </ResizableHeaderCell>
            )}

            {/* Sold Price */}
            {tableSettings.showSoldPrice && (
              <ResizableHeaderCell
                columnId="soldPrice"
                width={getWidth('soldPrice')}
                minWidth={80}
                isResizing={resizingColumn === 'soldPrice'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('soldPrice')}
                onClick={() => handleSort('soldPrice')}
              >
                <span>Sold (£)</span>
                <SortIcon field="soldPrice" />
              </ResizableHeaderCell>
            )}

            {/* Net Profit P&L */}
            {tableSettings.showNetProfit && (
              <ResizableHeaderCell
                columnId="netProfit"
                width={getWidth('netProfit')}
                minWidth={90}
                isResizing={resizingColumn === 'netProfit'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('netProfit')}
                onClick={() => handleSort('profit')}
              >
                <span>Net P&amp;L</span>
                <SortIcon field="profit" />
              </ResizableHeaderCell>
            )}

            {/* Buyer & Tracking Reference (Draggable width) */}
            {tableSettings.showBuyerTracking && (
              <ResizableHeaderCell
                columnId="buyerTracking"
                width={getWidth('buyerTracking')}
                minWidth={140}
                isResizing={resizingColumn === 'buyerTracking'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('buyerTracking')}
              >
                Buyer &amp; Tracking Ref
              </ResizableHeaderCell>
            )}

            {/* Courier */}
            {tableSettings.showCourier && (
              <ResizableHeaderCell
                columnId="courier"
                width={getWidth('courier')}
                minWidth={90}
                isResizing={resizingColumn === 'courier'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('courier')}
              >
                Courier
              </ResizableHeaderCell>
            )}

            {/* Shipping Status */}
            {tableSettings.showShippingStatus && (
              <ResizableHeaderCell
                columnId="shippingStatus"
                width={getWidth('shippingStatus')}
                minWidth={110}
                isResizing={resizingColumn === 'shippingStatus'}
                onResizeStart={startResize}
                onDoubleClickReset={() => resetColumnWidth('shippingStatus')}
              >
                Shipping
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
            const isEditingTitle = editingCellId === `${item.id}_title`;
            const isEditingBrand = editingCellId === `${item.id}_brand`;
            const isEditingListing = editingCellId === `${item.id}_listingPrice`;
            const isEditingSold = editingCellId === `${item.id}_soldPrice`;
            const isEditingCost = editingCellId === `${item.id}_originalPrice`;
            const isEditingBuyer = editingCellId === `${item.id}_buyerUsername`;
            const isEditingTracking = editingCellId === `${item.id}_trackingNumber`;
            const isEditingCourier = editingCellId === `${item.id}_courier`;
            const isSelected = selectedItemIds.has(item.id);

            const displayTitle = item.name;
            const realizedOrProjected = item.soldPrice !== undefined ? item.soldPrice : item.listingPrice || 0;
            const netProfit = realizedOrProjected - (item.originalPricePaid || 0);
            const isProfitable = netProfit >= 0;

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
                        alt={displayTitle}
                        category={item.category}
                        className="w-full h-full object-contain p-0.5"
                        containerClassName="w-full h-full bg-[#FAF9F6] flex items-center justify-center"
                        showPlaceholderLabel={false}
                      />
                    </div>
                  </td>
                )}

                {/* Item Title & Brand (Draggable width & Editable) */}
                {tableSettings.showItem && (
                  <td
                    style={{
                      width: `${getWidth('item')}px`,
                      maxWidth: `${getWidth('item')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingTitle ? (
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
                      <div className="space-y-0.5">
                        <div
                          onClick={() => {
                            setEditingCellId(`${item.id}_title`);
                            setEditingValue(displayTitle);
                          }}
                          className={`font-serif font-semibold text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center justify-between gap-1 group/field ${
                            tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                          }`}
                          title="Click to edit title inline"
                        >
                          <span className={tableSettings.textWrap ? '' : 'truncate'}>
                            {displayTitle}
                          </span>
                          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0 text-[#8C7355]" />
                        </div>
                        {item.brand && (
                          <div className="text-[10px] font-mono text-[#8C7355] font-semibold truncate">
                            {item.brand}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                )}

                {/* Platform */}
                {tableSettings.showPlatform && (
                  <td
                    style={{ width: `${getWidth('platform')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.platform}
                      onChange={(e) =>
                        updateSaleItem(item.id, {
                          platform: e.target.value as SellingPlatform,
                        })
                      }
                      className="w-full bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] px-1.5 py-0.5 focus:outline-none focus:border-[#8C7355] cursor-pointer rounded-xs truncate font-mono text-[10px] font-bold"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
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
                        updateSaleItem(item.id, {
                          status: e.target.value as SellingStatus,
                        })
                      }
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border cursor-pointer w-full truncate ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {SALE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                )}

                {/* Category */}
                {tableSettings.showCategory && (
                  <td
                    style={{ width: `${getWidth('category')}px` }}
                    className={`${densityPadding} text-[11px] text-[#5A5A55] truncate`}
                  >
                    <span className="px-1.5 py-0.5 bg-[#FAF9F6] border border-[#E5E5E1] rounded-xs">
                      {item.category}
                    </span>
                  </td>
                )}

                {/* Original Cost */}
                {tableSettings.showOriginalPrice && (
                  <td
                    style={{ width: `${getWidth('originalPrice')}px` }}
                    className={`${densityPadding}`}
                  >
                    {isEditingCost ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'originalPricePaid')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'originalPricePaid');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        className="w-full font-mono text-xs border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingCellId(`${item.id}_originalPrice`);
                          setEditingValue(item.originalPricePaid?.toString() || '0');
                        }}
                        className="font-mono text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                        title="Click to edit cost basis"
                      >
                        {formatCurrency(item.originalPricePaid || 0)}
                      </span>
                    )}
                  </td>
                )}

                {/* Listing Price */}
                {tableSettings.showListingPrice && (
                  <td
                    style={{ width: `${getWidth('listingPrice')}px` }}
                    className={`${densityPadding}`}
                  >
                    {isEditingListing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'listingPrice')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'listingPrice');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        className="w-full font-mono font-bold text-xs border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingCellId(`${item.id}_listingPrice`);
                          setEditingValue(item.listingPrice?.toString() || '0');
                        }}
                        className="font-mono font-bold text-xs text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer"
                        title="Click to edit listing price"
                      >
                        {formatCurrency(item.listingPrice)}
                      </span>
                    )}
                  </td>
                )}

                {/* Sold Price */}
                {tableSettings.showSoldPrice && (
                  <td
                    style={{ width: `${getWidth('soldPrice')}px` }}
                    className={`${densityPadding}`}
                  >
                    {isEditingSold ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'soldPrice')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'soldPrice');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        className="w-full font-mono font-bold text-xs border border-[#8C7355] px-1 py-0.5 bg-white text-emerald-800 rounded-xs"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingCellId(`${item.id}_soldPrice`);
                          setEditingValue(item.soldPrice?.toString() || '');
                        }}
                        className="font-mono font-bold text-xs text-emerald-700 hover:underline cursor-pointer"
                        title="Click to edit realized sold price"
                      >
                        {item.soldPrice !== undefined ? formatCurrency(item.soldPrice) : '—'}
                      </span>
                    )}
                  </td>
                )}

                {/* Net Profit P&L */}
                {tableSettings.showNetProfit && (
                  <td
                    style={{ width: `${getWidth('netProfit')}px` }}
                    className={`${densityPadding} font-mono font-bold text-xs`}
                  >
                    <span className={isProfitable ? 'text-emerald-700' : 'text-rose-600'}>
                      {isProfitable ? '+' : ''}
                      {formatCurrency(netProfit)}
                    </span>
                  </td>
                )}

                {/* Buyer & Tracking Ref (Draggable width & Editable) */}
                {tableSettings.showBuyerTracking && (
                  <td
                    style={{
                      width: `${getWidth('buyerTracking')}px`,
                      maxWidth: `${getWidth('buyerTracking')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingBuyer ? (
                      <input
                        type="text"
                        placeholder="Buyer @username"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'buyerUsername')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'buyerUsername');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[120px] max-w-[360px] resize-x text-xs font-mono border border-[#8C7355] px-1.5 py-0.5 bg-white rounded-xs"
                      />
                    ) : isEditingTracking ? (
                      <input
                        type="text"
                        placeholder="Tracking number"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'trackingNumber')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'trackingNumber');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        style={{ resize: 'horizontal' }}
                        className="w-full min-w-[120px] max-w-[360px] resize-x text-xs font-mono border border-[#8C7355] px-1.5 py-0.5 bg-white rounded-xs"
                      />
                    ) : (
                      <div className="space-y-0.5">
                        <div
                          onClick={() => {
                            setEditingCellId(`${item.id}_buyerUsername`);
                            setEditingValue(item.buyerUsername || '');
                          }}
                          className={`text-xs text-[#1A1A1A] hover:text-[#8C7355] cursor-pointer flex items-center justify-between gap-1 group/field ${
                            tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                          }`}
                          title="Click to edit buyer username"
                        >
                          <span className="truncate">
                            {item.buyerUsername ? `@${item.buyerUsername}` : <span className="text-[#A5A59E] italic">Add buyer...</span>}
                          </span>
                          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0" />
                        </div>
                        {item.trackingNumber && (
                          <div
                            onClick={() => {
                              setEditingCellId(`${item.id}_trackingNumber`);
                              setEditingValue(item.trackingNumber || '');
                            }}
                            className="text-[10px] font-mono text-[#767670] hover:text-[#8C7355] cursor-pointer flex items-center gap-1 truncate"
                            title="Click to edit tracking number"
                          >
                            <Truck className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{item.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                )}

                {/* Courier */}
                {tableSettings.showCourier && (
                  <td
                    style={{
                      width: `${getWidth('courier')}px`,
                      maxWidth: `${getWidth('courier')}px`,
                    }}
                    className={`${densityPadding}`}
                  >
                    {isEditingCourier ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSaveInline(item.id, 'courier')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(item.id, 'courier');
                          if (e.key === 'Escape') setEditingCellId(null);
                        }}
                        autoFocus
                        className="w-full text-xs font-mono border border-[#8C7355] px-1 py-0.5 bg-white rounded-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCellId(`${item.id}_courier`);
                          setEditingValue(item.courier || '');
                        }}
                        className={`text-xs font-mono text-[#5A5A55] hover:underline cursor-pointer flex items-center justify-between gap-1 group/field ${
                          tableSettings.textWrap ? 'whitespace-normal' : 'truncate'
                        }`}
                        title="Click to edit courier"
                      >
                        <span className="truncate">{item.courier || '—'}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/field:opacity-60 shrink-0" />
                      </div>
                    )}
                  </td>
                )}

                {/* Shipping Status */}
                {tableSettings.showShippingStatus && (
                  <td
                    style={{ width: `${getWidth('shippingStatus')}px` }}
                    className={`${densityPadding}`}
                  >
                    <select
                      value={item.shippingStatus || 'Pending Label'}
                      onChange={(e) =>
                        updateSaleItem(item.id, {
                          shippingStatus: e.target.value as ShippingStatus,
                        })
                      }
                      className="w-full bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] px-1.5 py-0.5 focus:outline-none focus:border-[#8C7355] cursor-pointer rounded-xs truncate text-[10px]"
                    >
                      {SHIPPING_STATUSES.map((ss) => (
                        <option key={ss} value={ss}>
                          {ss}
                        </option>
                      ))}
                    </select>
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

                {/* Actions */}
                {tableSettings.showActions && (
                  <td
                    style={{ width: `${getWidth('actions')}px` }}
                    className={`${densityPadding} text-right`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {item.status !== 'Sold' && item.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => onMarkSold(item)}
                          className="p-1 rounded text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Mark Item as Sold"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => moveSaleItemToWardrobe(item.id)}
                        className="p-1 rounded text-[#767670] hover:text-[#8C7355] hover:bg-[#F2F1ED] cursor-pointer"
                        title="Move Back to Wardrobe Inventory"
                      >
                        <FolderUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="p-1 rounded text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] cursor-pointer"
                        title="Edit Listing"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSaleItem(item.id)}
                        className="p-1 rounded text-[#767670] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Listing"
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
