/**
 * Single Source of Truth for Status Definitions, Labels, Badge Styles,
 * Pipeline Stage Detection, and Lifecycle Tag Reconciliation across
 * Wardrobe, Shopping/Wishlist, and Selling/Resale modules.
 */

import { SellingStatus, ShippingStatus, ShoppingStatus } from '../types';
import { normalizeTags } from './tagUtils';

// ==========================================
// 1. SELLING / RESALE STATUSES & LABELS
// ==========================================

export const ALL_SELLING_STATUSES: readonly SellingStatus[] = [
  'Draft',
  'Listed',
  'Reserved',
  'Sold',
  'Shipped',
  'Completed',
  'Delisted',
  'Cancelled',
] as const;

export const SELLING_STATUS_LABELS: Record<SellingStatus, string> = {
  Draft: 'Draft (Unpublished)',
  Listed: 'Listed (Active)',
  Reserved: 'Reserved (Pending Payment)',
  Sold: 'Sold (To Dispatch)',
  Shipped: 'Shipped (In Transit)',
  Completed: 'Completed (Funds Released)',
  Delisted: 'Delisted / Withdrawn',
  Cancelled: 'Cancelled',
};

// ==========================================
// 2. SHIPPING STATUSES & LABELS
// ==========================================

export const ALL_SHIPPING_STATUSES: readonly ShippingStatus[] = [
  'Not Required',
  'To Pack',
  'Shipped',
  'In Transit',
  'Delivered',
] as const;

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  'Not Required': 'Not Required',
  'To Pack': 'To Pack / Label Ready',
  Shipped: 'Shipped',
  'In Transit': 'In Transit',
  Delivered: 'Delivered',
};

// ==========================================
// 3. SHOPPING / WISHLIST STATUSES & LABELS
// ==========================================

export const ALL_SHOPPING_STATUSES: readonly ShoppingStatus[] = [
  'To Buy',
  'In Basket',
  'Researching',
  'Purchased',
  'Sold',
  'Cancelled',
  'Passed',
] as const;

export const SHOPPING_STATUS_LABELS: Record<ShoppingStatus, string> = {
  'To Buy': 'To Buy',
  'In Basket': 'In Basket',
  Researching: 'Researching',
  Purchased: 'Purchased (In Wardrobe)',
  Sold: 'Sold',
  Cancelled: 'Cancelled',
  Passed: 'Passed / Archived',
};

// ==========================================
// 4. PIPELINE STAGES & CLASSIFICATION
// ==========================================

export type SalesPipelineStage =
  | 'All'
  | 'Draft'
  | 'Listed'
  | 'Reserved'
  | 'Awaiting Dispatch'
  | 'In Transit'
  | 'Completed'
  | 'Cancelled';

export const ALL_PIPELINE_STAGES: readonly SalesPipelineStage[] = [
  'Draft',
  'Listed',
  'Reserved',
  'Awaiting Dispatch',
  'In Transit',
  'Completed',
  'Cancelled',
] as const;

/**
 * Single source of truth for classifying a sale item into its active pipeline stage.
 */
export function getSaleItemPipelineStage(item: {
  status?: SellingStatus;
  shippingStatus?: ShippingStatus;
  tags?: string[];
  notes?: string;
}): SalesPipelineStage {
  const status = item.status;
  const shipping = item.shippingStatus;
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  const notes = (item.notes || '').toLowerCase();

  // 1. Cancelled check (highest priority exception)
  if (
    status === 'Cancelled' ||
    status === 'Delisted' ||
    tags.includes('cancelled') ||
    tags.includes('canceled') ||
    notes.includes('cancelled') ||
    notes.includes('order cancelled')
  ) {
    return 'Cancelled';
  }

  // 2. Completed check
  if (
    status === 'Completed' ||
    shipping === 'Delivered' ||
    tags.includes('completed') ||
    tags.includes('delivered')
  ) {
    return 'Completed';
  }

  // 3. In Transit check
  if (
    status === 'Shipped' ||
    shipping === 'In Transit' ||
    shipping === 'Shipped' ||
    tags.includes('in transit') ||
    tags.includes('shipped')
  ) {
    return 'In Transit';
  }

  // 4. Awaiting Dispatch check
  if (
    shipping === 'To Pack' ||
    tags.includes('awaiting dispatch') ||
    tags.includes('to pack') ||
    status === 'Sold'
  ) {
    return 'Awaiting Dispatch';
  }

  // 5. Reserved check
  if (status === 'Reserved' || tags.includes('reserved')) {
    return 'Reserved';
  }

  // 6. Listed check
  if (status === 'Listed' || tags.includes('listed')) {
    return 'Listed';
  }

  // 7. Draft / Default
  return 'Draft';
}

// ==========================================
// 5. BADGE COLOR & STYLING CLASSES (DRY)
// ==========================================

/**
 * Tailwind badge styling for resale item statuses
 */
export function getSellingStatusBadgeClass(status?: SellingStatus): string {
  switch (status) {
    case 'Listed':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Reserved':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Sold':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    case 'Shipped':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Completed':
      return 'bg-teal-100 text-teal-800 border-teal-300 font-bold';
    case 'Delisted':
    case 'Cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'Draft':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

/**
 * Tailwind styling for pipeline stage badges
 */
export function getPipelineStageBadgeClass(stage: SalesPipelineStage): string {
  switch (stage) {
    case 'Listed':
      return 'text-emerald-700 border-emerald-300 bg-emerald-50/60';
    case 'Completed':
      return 'text-teal-700 border-teal-300 bg-teal-50/60';
    case 'In Transit':
      return 'text-blue-700 border-blue-300 bg-blue-50/60';
    case 'Awaiting Dispatch':
      return 'text-amber-700 border-amber-300 bg-amber-50/60';
    case 'Reserved':
      return 'text-indigo-700 border-indigo-300 bg-indigo-50/60';
    case 'Cancelled':
      return 'text-rose-700 border-rose-300 bg-rose-50/60';
    case 'Draft':
    default:
      return 'text-[#767670] border-[#D5D5D0] bg-[#FAF9F6]';
  }
}

/**
 * Tailwind badge styling for shopping/wishlist statuses
 */
export function getShoppingStatusBadgeClass(status?: ShoppingStatus | string): string {
  switch (status) {
    case 'In Basket':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'To Buy':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'Researching':
      return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'Purchased':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    case 'Sold':
      return 'bg-teal-100 text-teal-900 border-teal-300';
    case 'Cancelled':
      return 'bg-rose-100 text-rose-900 border-rose-300';
    case 'Returned':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    case 'Delivered':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Ordered':
      return 'bg-sky-100 text-sky-900 border-sky-300';
    case 'Archived':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

// ==========================================
// 6. SINGLE SOURCE LIFECYCLE TAG RECONCILIATION
// ==========================================

/**
 * Harmonizes item tags whenever the selling status transitions.
 * Removes conflicting status tags and guarantees canonical tags are present.
 */
export function reconcileSaleItemTagsForStatus(
  currentTags: string[] = [],
  newStatus?: SellingStatus
): string[] {
  let tags = normalizeTags(currentTags || []);

  if (!newStatus) return tags;

  if (newStatus === 'Cancelled' || newStatus === 'Delisted') {
    tags = tags.filter((t) => t !== 'Listed' && t !== 'Sold');
    if (newStatus === 'Cancelled' && !tags.some((t) => t.toLowerCase() === 'cancelled')) {
      tags.push('Cancelled');
    }
  } else if (newStatus === 'Listed') {
    tags = tags.filter((t) => t.toLowerCase() !== 'cancelled');
    if (!tags.includes('Listed')) {
      tags.push('Listed');
    }
  } else if (newStatus === 'Sold' || newStatus === 'Completed') {
    tags = tags.filter((t) => t.toLowerCase() !== 'cancelled' && t !== 'Listed');
    if (newStatus === 'Sold' && !tags.includes('Sold')) {
      tags.push('Sold');
    }
  } else if (newStatus === 'Reserved') {
    tags = tags.filter((t) => t.toLowerCase() !== 'cancelled');
  }

  return normalizeTags(tags);
}
