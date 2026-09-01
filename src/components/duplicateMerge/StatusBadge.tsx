import React from 'react';
import { Ban, CheckCircle2, Clock, DollarSign, Archive, Tag, ShoppingBag, FolderUp } from 'lucide-react';
import { ItemSource, StatusCategory } from './duplicateMergeTypes';

interface StatusBadgeProps {
  status: string;
  statusCategory?: StatusCategory;
  source?: ItemSource;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  statusCategory = 'active',
  source,
  size = 'sm',
}) => {
  const isSmall = size === 'sm';
  const s = status.toLowerCase();

  // Cancelled or Passed
  if (statusCategory === 'cancelled_passed' || s.includes('cancel') || s.includes('passed')) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-xs ${
          isSmall ? 'text-[10px] px-1.5 py-0.2' : 'text-xs px-2 py-0.5'
        }`}
        title={`Status: ${status} (Cancelled/Passed)`}
      >
        <Ban className={isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>{status}</span>
      </span>
    );
  }

  // Archived
  if (statusCategory === 'archived' || s.includes('archive')) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium bg-stone-100 text-stone-600 border border-stone-300 rounded-xs ${
          isSmall ? 'text-[10px] px-1.5 py-0.2' : 'text-xs px-2 py-0.5'
        }`}
        title={`Status: ${status} (Archived from active rotation)`}
      >
        <Archive className={isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>{status}</span>
      </span>
    );
  }

  // Completed, Sold, Purchased
  if (statusCategory === 'completed_sold' || s.includes('sold') || s.includes('purchased') || s.includes('shipped')) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-xs ${
          isSmall ? 'text-[10px] px-1.5 py-0.2' : 'text-xs px-2 py-0.5'
        }`}
        title={`Status: ${status} (Completed / Acquired)`}
      >
        <CheckCircle2 className={isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>{status}</span>
      </span>
    );
  }

  // Active / Wishlist / Listed
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs ${
        isSmall ? 'text-[10px] px-1.5 py-0.2' : 'text-xs px-2 py-0.5'
      }`}
      title={`Status: ${status} (Active)`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
      <span>{status}</span>
    </span>
  );
};

export const SourceBadge: React.FC<{ source: ItemSource }> = ({ source }) => {
  if (source === 'wardrobe') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#8C7355]/10 text-[#8C7355] px-1.5 py-0.5 rounded-xs border border-[#8C7355]/30">
        <FolderUp className="w-2.5 h-2.5" /> Wardrobe
      </span>
    );
  }
  if (source === 'shopping') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#007782]/10 text-[#007782] px-1.5 py-0.5 rounded-xs border border-[#007782]/30">
        <ShoppingBag className="w-2.5 h-2.5" /> Wishlist
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded-xs border border-blue-200">
      <Tag className="w-2.5 h-2.5" /> Resale
    </span>
  );
};
