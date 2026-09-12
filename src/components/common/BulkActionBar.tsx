import React from 'react';
import {
  Check,
  CheckSquare,
  X,
  Trash2,
  Tag,
  ShoppingBag,
  Sliders,
  Shirt,
} from 'lucide-react';
import { formatGbp } from '../../utils/formatters';

export interface BulkActionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  totalItemCount: number;
  areAllSelected: boolean;
  areSomeSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  selectedValuation?: number;
  entityName?: string; // e.g. "garments", "wishlist items", "sales listings"
  // Action triggers
  onBulkEdit?: () => void;
  onBulkDelete?: () => void;
  onMoveToResale?: () => void;
  onMoveToWishlist?: () => void;
  onMoveToCloset?: () => void;
  customActions?: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'vinted' | 'danger';
    title?: string;
  }>;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalFilteredCount,
  totalItemCount,
  areAllSelected,
  areSomeSelected,
  onToggleSelectAll,
  onClearSelection,
  selectedValuation,
  entityName = 'items',
  onBulkEdit,
  onBulkDelete,
  onMoveToResale,
  onMoveToWishlist,
  onMoveToCloset,
  customActions = [],
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions toolbar"
      className="bg-[#1A1A1A] text-white p-3 border border-[#333] shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className={`w-4 h-4 border flex items-center justify-center cursor-pointer transition-colors ${
              areAllSelected
                ? 'bg-[#8C7355] border-[#8C7355] text-white'
                : areSomeSelected
                ? 'bg-[#8C7355]/30 border-[#8C7355] text-[#8C7355]'
                : 'border-[#666] bg-[#2A2A2A] hover:border-[#8C7355]'
            }`}
            title={areAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
            aria-label={areAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
          >
            {areAllSelected && <Check className="w-3 h-3 stroke-[3] text-white" />}
            {!areAllSelected && areSomeSelected && (
              <span className="w-2 h-0.5 bg-[#8C7355] block" />
            )}
          </button>

          <span className="font-mono text-xs font-semibold">
            {selectedCount} of {totalItemCount} {entityName} selected
            {totalFilteredCount !== totalItemCount && (
              <span className="text-[#A5A59E] font-normal">
                {' '}
                ({totalFilteredCount} matching filter)
              </span>
            )}
          </span>
        </div>

        {selectedValuation !== undefined && (
          <span className="text-xs text-[#A5A59E] font-mono hidden sm:inline">
            (Valuation: {formatGbp(selectedValuation)})
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onMoveToResale && (
          <button
            type="button"
            onClick={onMoveToResale}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#007782] hover:bg-[#005E67] text-white shadow-xs cursor-pointer transition-colors"
            title="List selected items for resale/sales"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>List for Resale ({selectedCount})</span>
          </button>
        )}

        {onMoveToWishlist && (
          <button
            type="button"
            onClick={onMoveToWishlist}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#3A3A38] hover:bg-[#4A4A48] text-[#E5E5E1] border border-[#555] shadow-xs cursor-pointer transition-colors"
            title="Move selected items to shopping/wishlist"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>To Wishlist ({selectedCount})</span>
          </button>
        )}

        {onMoveToCloset && (
          <button
            type="button"
            onClick={onMoveToCloset}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs cursor-pointer transition-colors"
            title="Move selected items into Wardrobe"
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>To Closet ({selectedCount})</span>
          </button>
        )}

        {customActions.map((act, index) => {
          const Icon = act.icon;
          const bgClass =
            act.variant === 'primary'
              ? 'bg-[#8C7355] hover:bg-[#735D43] text-white'
              : act.variant === 'vinted'
              ? 'bg-[#007782] hover:bg-[#005E67] text-white'
              : act.variant === 'danger'
              ? 'bg-rose-700 hover:bg-rose-800 text-white'
              : 'bg-[#2A2A2A] hover:bg-[#383838] text-white border border-[#555]';

          return (
            <button
              key={index}
              type="button"
              onClick={act.onClick}
              title={act.title}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium shadow-xs cursor-pointer transition-colors ${bgClass}`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{act.label}</span>
            </button>
          );
        })}

        {onBulkEdit && (
          <button
            type="button"
            onClick={onBulkEdit}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white shadow-xs cursor-pointer transition-colors"
            title="Bulk edit category, tags, and properties"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Bulk Edit ({selectedCount})</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClearSelection}
          className="px-3 py-1 text-xs font-mono text-[#D5D5D0] hover:text-white border border-[#444] hover:border-[#666] bg-[#2A2A2A] cursor-pointer transition-colors"
          title="Deselect all items"
        >
          Deselect
        </button>

        {onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer transition-colors"
            title="Delete all selected items immediately"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};
